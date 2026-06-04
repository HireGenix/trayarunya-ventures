"""Automation engine: durable event processing + action execution.

Public surface:

- :func:`emit_event` — called by domain code to durably record a signal.
- :func:`run_automation_tick` — claim & process a batch of pending events.
- :func:`automation_loop` — the background poller (registered with the leader
  supervisor so it runs once per cluster).
- :func:`execute_workflow` — run one workflow against a payload (used by both the
  processor and the manual "test" endpoint).

Everything that touches the outside world (Slack, email, webhooks) is defensive:
a failing action is recorded on the run and never aborts the batch.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.models import (
    AutomationEvent,
    EventStatus,
    RunStatus,
    Task,
    TaskStatus,
    Workflow,
    WorkflowRun,
)

log = logging.getLogger("automation")

POLL_INTERVAL_SECONDS = 15
_BATCH = 25
_MAX_ATTEMPTS = 3
_WEBHOOK_TIMEOUT = 15.0


# --------------------------------------------------------------------------- #
# Catalog — the triggers and actions the builder UI exposes.
# --------------------------------------------------------------------------- #
TRIGGER_CATALOG: list[dict[str, Any]] = [
    {
        "type": "revenue.lead",
        "label": "New lead",
        "description": "A new lead enters the pipeline.",
        "fields": ["channel", "campaign", "value", "contact_ref", "stage"],
    },
    {
        "type": "revenue.mql",
        "label": "New MQL",
        "description": "A lead becomes marketing-qualified.",
        "fields": ["channel", "campaign", "value", "contact_ref", "stage"],
    },
    {
        "type": "revenue.sql",
        "label": "New SQL",
        "description": "A lead becomes sales-qualified.",
        "fields": ["channel", "campaign", "value", "contact_ref", "stage"],
    },
    {
        "type": "revenue.opportunity",
        "label": "New opportunity",
        "description": "An opportunity is created.",
        "fields": ["channel", "campaign", "value", "contact_ref", "stage"],
    },
    {
        "type": "revenue.closed_won",
        "label": "Deal won",
        "description": "A deal closes won.",
        "fields": ["channel", "campaign", "value", "contact_ref", "stage"],
    },
    {
        "type": "content.published",
        "label": "Content published",
        "description": "A post goes live on a channel.",
        "fields": ["platform", "title", "content_type"],
    },
    {
        "type": "content.approved",
        "label": "Content approved",
        "description": "A client approves content in the portal.",
        "fields": ["platform", "title", "reviewer"],
    },
    {
        "type": "content.changes_requested",
        "label": "Changes requested",
        "description": "A client requests changes in the portal.",
        "fields": ["platform", "title", "reviewer", "note"],
    },
    {
        "type": "publish.failed",
        "label": "Publish failed",
        "description": "A scheduled post failed to publish.",
        "fields": ["platform", "title", "error"],
    },
    {
        "type": "performance.drop",
        "label": "Performance drop",
        "description": "Engagement falls materially week over week.",
        "fields": ["drop_pct", "recent", "prior"],
    },
]

ACTION_CATALOG: list[dict[str, Any]] = [
    {
        "type": "notify",
        "label": "In-app alert",
        "description": "Raise an alert in the dashboard notification center.",
        "config": ["level", "title", "body", "link"],
    },
    {
        "type": "slack",
        "label": "Slack message",
        "description": "Post to your Slack incoming webhook.",
        "config": ["text"],
    },
    {
        "type": "email",
        "label": "Send email",
        "description": "Send a plain-text email via SMTP.",
        "config": ["to", "subject", "body"],
    },
    {
        "type": "task",
        "label": "Create task",
        "description": "Create a task for the team to action.",
        "config": ["title", "description", "priority", "due_in_days", "assignee"],
    },
    {
        "type": "webhook",
        "label": "Webhook / CRM",
        "description": "POST the event to any URL — CRM, Zapier, Make, custom.",
        "config": ["url", "method", "headers", "body"],
    },
]

_VALID_TRIGGERS = {t["type"] for t in TRIGGER_CATALOG}
_VALID_ACTIONS = {a["type"] for a in ACTION_CATALOG}


def valid_trigger(trigger_type: str) -> bool:
    return trigger_type in _VALID_TRIGGERS


def valid_action(action_type: str) -> bool:
    return action_type in _VALID_ACTIONS


# --------------------------------------------------------------------------- #
# Emission
# --------------------------------------------------------------------------- #
async def emit_event(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    event_type: str,
    payload: dict[str, Any] | None = None,
    *,
    source: str = "system",
) -> AutomationEvent | None:
    """Durably record a domain signal for workflow processing.

    Added to the *caller's* session (``flush`` only) so it commits atomically
    with the originating change. Never raises — automation must not break the
    business operation that triggered it.
    """
    try:
        event = AutomationEvent(
            workspace_id=workspace_id,
            event_type=event_type,
            payload=payload or {},
            status=EventStatus.pending,
            source=source,
        )
        db.add(event)
        await db.flush()
        return event
    except Exception:  # noqa: BLE001 — emission must never break the caller
        log.exception("emit_event failed (type=%s ws=%s)", event_type, workspace_id)
        return None


# --------------------------------------------------------------------------- #
# Conditions
# --------------------------------------------------------------------------- #
def _resolve(payload: dict[str, Any], field: str) -> Any:
    """Resolve a possibly dotted field path from the payload."""
    cur: Any = payload
    for part in str(field).split("."):
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


def _coerce_pair(left: Any, right: Any) -> tuple[Any, Any]:
    """Best-effort numeric coercion so "100" and 100 compare correctly."""
    if isinstance(left, (int, float)) and not isinstance(left, bool):
        try:
            return left, float(right)
        except (TypeError, ValueError):
            return left, right
    try:
        return float(left), float(right)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return left, right


def evaluate_conditions(conditions: list[dict[str, Any]], payload: dict[str, Any]) -> bool:
    """Return True when ALL conditions pass (logical AND). Empty list = pass."""
    if not conditions:
        return True
    for cond in conditions:
        field = cond.get("field")
        op = (cond.get("op") or "eq").lower()
        expected = cond.get("value")
        actual = _resolve(payload, field) if field else None

        try:
            if op == "eq":
                if str(actual) != str(expected):
                    return False
            elif op == "ne":
                if str(actual) == str(expected):
                    return False
            elif op in ("gt", "gte", "lt", "lte"):
                a, b = _coerce_pair(actual, expected)
                if a is None:
                    return False
                if op == "gt" and not (a > b):
                    return False
                if op == "gte" and not (a >= b):
                    return False
                if op == "lt" and not (a < b):
                    return False
                if op == "lte" and not (a <= b):
                    return False
            elif op == "contains":
                if str(expected).lower() not in str(actual or "").lower():
                    return False
            elif op == "in":
                options = expected if isinstance(expected, list) else str(expected).split(",")
                options = [str(o).strip().lower() for o in options]
                if str(actual).lower() not in options:
                    return False
            else:
                # Unknown operator → fail closed so misconfig can't fire blindly.
                return False
        except Exception:  # noqa: BLE001 — a bad condition never matches
            return False
    return True


# --------------------------------------------------------------------------- #
# Templating
# --------------------------------------------------------------------------- #
def render_template(template: Any, payload: dict[str, Any]) -> str:
    """Substitute ``{{ field }}`` tokens from the payload. Missing → empty."""
    if template is None:
        return ""
    text = str(template)
    if "{{" not in text:
        return text
    out = []
    i = 0
    while i < len(text):
        start = text.find("{{", i)
        if start == -1:
            out.append(text[i:])
            break
        out.append(text[i:start])
        end = text.find("}}", start)
        if end == -1:
            out.append(text[start:])
            break
        key = text[start + 2 : end].strip()
        val = _resolve(payload, key)
        out.append("" if val is None else str(val))
        i = end + 2
    return "".join(out)


# --------------------------------------------------------------------------- #
# Action executors — each returns (status, detail).
# --------------------------------------------------------------------------- #
async def _act_notify(
    db: AsyncSession, workspace_id: uuid.UUID, config: dict, payload: dict
) -> tuple[str, str]:
    from app.services.notifications import notify

    level = (config.get("level") or "info").strip()
    if level not in ("info", "success", "warning", "error"):
        level = "info"
    title = render_template(config.get("title") or "Automation alert", payload)[:300]
    body = render_template(config.get("body"), payload)[:2000] or None
    link = (config.get("link") or None)
    await notify(
        db, workspace_id,
        level=level, category="automation",
        title=title, body=body, link=link,
    )
    return "success", f"Notification raised: {title}"


async def _act_slack(config: dict, payload: dict) -> tuple[str, str]:
    from app.services.notify_channels import send_slack

    text = render_template(config.get("text") or "", payload).strip()
    if not text:
        return "skipped", "No Slack text configured"
    ok = await send_slack(text)
    return ("success", "Slack message sent") if ok else ("failed", "Slack not configured or send failed")


async def _act_email(config: dict, payload: dict) -> tuple[str, str]:
    from app.services.notify_channels import send_email

    to = render_template(config.get("to") or "", payload).strip()
    subject = render_template(config.get("subject") or "", payload).strip()
    body = render_template(config.get("body") or "", payload)
    if not to:
        return "skipped", "No recipient configured"
    ok = await send_email(to, subject or "Automation", body)
    return ("success", f"Email sent to {to}") if ok else ("failed", "Email not configured or send failed")


async def _act_task(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    config: dict,
    payload: dict,
    workflow_id: uuid.UUID | None,
) -> tuple[str, str]:
    title = render_template(config.get("title") or "Automation task", payload)[:300]
    description = render_template(config.get("description"), payload) or None
    priority = (config.get("priority") or "normal").strip()
    if priority not in ("low", "normal", "high"):
        priority = "normal"
    assignee = (config.get("assignee") or None)
    due_at = None
    due_in = config.get("due_in_days")
    if due_in not in (None, ""):
        try:
            due_at = datetime.now(timezone.utc) + timedelta(days=float(due_in))
        except (TypeError, ValueError):
            due_at = None
    task = Task(
        workspace_id=workspace_id,
        title=title,
        description=description,
        priority=priority,
        assignee=assignee,
        due_at=due_at,
        source="automation",
        workflow_id=workflow_id,
        status=TaskStatus.open,
        meta={"trigger_payload": payload},
    )
    db.add(task)
    await db.flush()
    return "success", f"Task created: {title}"


async def _act_webhook(config: dict, payload: dict) -> tuple[str, str]:
    url = render_template(config.get("url") or "", payload).strip()
    if not url or not url.lower().startswith(("http://", "https://")):
        return "skipped", "No valid webhook URL configured"
    method = (config.get("method") or "POST").upper()
    if method not in ("POST", "PUT", "PATCH", "GET"):
        method = "POST"
    headers = config.get("headers") if isinstance(config.get("headers"), dict) else {}
    body_tmpl = config.get("body")
    if body_tmpl:
        rendered = render_template(body_tmpl, payload)
        try:
            import json as _json

            json_body = _json.loads(rendered)
            content = None
        except Exception:  # noqa: BLE001 — not JSON, send raw
            json_body = None
            content = rendered
    else:
        json_body = payload
        content = None
    try:
        async with httpx.AsyncClient(timeout=_WEBHOOK_TIMEOUT) as client:
            res = await client.request(
                method, url, json=json_body, content=content, headers=headers or None
            )
        if res.status_code >= 400:
            return "failed", f"Webhook returned HTTP {res.status_code}"
        return "success", f"Webhook {method} {url} → {res.status_code}"
    except Exception as exc:  # noqa: BLE001
        return "failed", f"Webhook error: {str(exc)[:200]}"


async def _run_action(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    action: dict,
    payload: dict,
    workflow_id: uuid.UUID | None,
) -> dict[str, Any]:
    atype = (action.get("type") or "").strip()
    config = action.get("config") if isinstance(action.get("config"), dict) else {}
    try:
        if atype == "notify":
            st, detail = await _act_notify(db, workspace_id, config, payload)
        elif atype == "slack":
            st, detail = await _act_slack(config, payload)
        elif atype == "email":
            st, detail = await _act_email(config, payload)
        elif atype == "task":
            st, detail = await _act_task(db, workspace_id, config, payload, workflow_id)
        elif atype == "webhook":
            st, detail = await _act_webhook(config, payload)
        else:
            st, detail = "failed", f"Unknown action type: {atype}"
    except Exception as exc:  # noqa: BLE001 — one action must not abort the run
        log.exception("Action %s failed", atype)
        st, detail = "failed", f"Error: {str(exc)[:200]}"
    return {"type": atype or "unknown", "status": st, "detail": detail}


# --------------------------------------------------------------------------- #
# Workflow execution
# --------------------------------------------------------------------------- #
async def execute_workflow(
    db: AsyncSession,
    workflow: Workflow,
    payload: dict[str, Any],
    *,
    event_id: uuid.UUID | None = None,
    is_test: bool = False,
) -> WorkflowRun:
    """Run one workflow against ``payload`` and persist a :class:`WorkflowRun`.

    Conditions are evaluated first; if they don't pass the run is recorded as
    ``skipped`` with no side effects. Does not commit — the caller owns the txn.
    """
    started = datetime.now(timezone.utc)
    steps: list[dict[str, Any]] = []
    status = RunStatus.success
    error: str | None = None

    conditions = workflow.conditions or []
    if not evaluate_conditions(conditions, payload):
        status = RunStatus.skipped
        steps.append({"type": "conditions", "status": "skipped", "detail": "Conditions not met"})
    else:
        actions = workflow.actions or []
        if not actions:
            status = RunStatus.skipped
            steps.append({"type": "actions", "status": "skipped", "detail": "No actions configured"})
        for action in actions:
            result = await _run_action(db, workflow.workspace_id, action, payload, workflow.id)
            steps.append(result)
        outcomes = {s["status"] for s in steps}
        if outcomes and outcomes <= {"failed"}:
            status = RunStatus.failed
        elif "failed" in outcomes:
            status = RunStatus.partial
        else:
            status = RunStatus.success

    run = WorkflowRun(
        workflow_id=workflow.id,
        workspace_id=workflow.workspace_id,
        event_id=event_id,
        trigger_type=workflow.trigger_type,
        trigger_payload=payload,
        status=status,
        steps=steps,
        error=error,
        is_test=is_test,
        started_at=started,
        finished_at=datetime.now(timezone.utc),
    )
    db.add(run)
    if status != RunStatus.skipped:
        workflow.run_count = (workflow.run_count or 0) + 1
        workflow.last_run_at = datetime.now(timezone.utc)
    await db.flush()
    return run


# --------------------------------------------------------------------------- #
# Event processing
# --------------------------------------------------------------------------- #
async def _claim_events(limit: int = _BATCH) -> list[uuid.UUID]:
    """Atomically flip up to ``limit`` pending events to ``processing``."""
    async with AsyncSessionLocal() as db:
        ids = (
            await db.execute(
                select(AutomationEvent.id)
                .where(AutomationEvent.status == EventStatus.pending)
                .order_by(AutomationEvent.created_at.asc())
                .limit(limit)
            )
        ).scalars().all()
        claimed: list[uuid.UUID] = []
        for eid in ids:
            res = await db.execute(
                update(AutomationEvent)
                .where(
                    AutomationEvent.id == eid,
                    AutomationEvent.status == EventStatus.pending,
                )
                .values(status=EventStatus.processing, attempts=AutomationEvent.attempts + 1)
            )
            if res.rowcount:
                claimed.append(eid)
        await db.commit()
        return claimed


async def _process_one(event_id: uuid.UUID) -> int:
    """Process a single claimed event. Returns number of workflows run."""
    async with AsyncSessionLocal() as db:
        event = await db.get(AutomationEvent, event_id)
        if event is None or event.status != EventStatus.processing:
            return 0
        try:
            workflows = (
                await db.execute(
                    select(Workflow).where(
                        Workflow.workspace_id == event.workspace_id,
                        Workflow.trigger_type == event.event_type,
                        Workflow.is_active.is_(True),
                    )
                )
            ).scalars().all()

            for wf in workflows:
                await execute_workflow(db, wf, event.payload or {}, event_id=event.id)

            event.status = EventStatus.processed
            event.processed_at = datetime.now(timezone.utc)
            event.error = None
            await db.commit()
            return len(workflows)
        except Exception as exc:  # noqa: BLE001
            log.exception("Failed to process automation event %s", event_id)
            await db.rollback()
            # Reload to set failure state cleanly.
            ev = await db.get(AutomationEvent, event_id)
            if ev is not None:
                if (ev.attempts or 0) >= _MAX_ATTEMPTS:
                    ev.status = EventStatus.failed
                    ev.error = str(exc)[:1000]
                else:
                    ev.status = EventStatus.pending  # retry on a later tick
                    ev.error = str(exc)[:1000]
                await db.commit()
            return 0


async def run_automation_tick() -> int:
    """Claim and process one batch of pending events. Returns workflows run."""
    claimed = await _claim_events()
    total = 0
    for eid in claimed:
        try:
            total += await _process_one(eid)
        except Exception:  # noqa: BLE001 — a bad event must not stop the batch
            log.exception("Unhandled error processing event %s", eid)
    return total


async def automation_loop(stop: asyncio.Event | None = None) -> None:
    """Poll forever (until ``stop`` is set), processing pending events."""
    log.info("Automation loop started (poll every %ss)", POLL_INTERVAL_SECONDS)
    while not (stop and stop.is_set()):
        try:
            n = await run_automation_tick()
            if n:
                log.info("Automation executed %s workflow run(s)", n)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("Automation tick failed")
        try:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
