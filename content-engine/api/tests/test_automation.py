"""Automation engine tests.

Pure tests (condition evaluation, templating, action dispatch with mocked
channels, workflow execution) always run. A DB-backed end-to-end test exercises
the full emit -> claim -> process -> run pipeline and is skipped automatically
when no test database is reachable (see ``conftest.requires_db``).
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace

import pytest

from app.services import automation as auto
from tests.conftest import requires_db


# --------------------------------------------------------------------------- #
# Condition evaluation
# --------------------------------------------------------------------------- #
def test_conditions_empty_passes():
    assert auto.evaluate_conditions([], {"a": 1}) is True


def test_conditions_eq_and_ne():
    payload = {"channel": "linkedin"}
    assert auto.evaluate_conditions([{"field": "channel", "op": "eq", "value": "linkedin"}], payload)
    assert not auto.evaluate_conditions([{"field": "channel", "op": "eq", "value": "ads"}], payload)
    assert auto.evaluate_conditions([{"field": "channel", "op": "ne", "value": "ads"}], payload)


def test_conditions_numeric_ops_coerce_strings():
    payload = {"value": 1500}
    assert auto.evaluate_conditions([{"field": "value", "op": "gt", "value": "1000"}], payload)
    assert auto.evaluate_conditions([{"field": "value", "op": "gte", "value": 1500}], payload)
    assert not auto.evaluate_conditions([{"field": "value", "op": "lt", "value": 1000}], payload)


def test_conditions_contains_and_in():
    payload = {"title": "Q3 LinkedIn Launch", "stage": "sql"}
    assert auto.evaluate_conditions([{"field": "title", "op": "contains", "value": "linkedin"}], payload)
    assert auto.evaluate_conditions([{"field": "stage", "op": "in", "value": ["mql", "sql"]}], payload)
    assert auto.evaluate_conditions([{"field": "stage", "op": "in", "value": "mql,sql"}], payload)
    assert not auto.evaluate_conditions([{"field": "stage", "op": "in", "value": ["lead"]}], payload)


def test_conditions_dotpath():
    payload = {"deal": {"owner": {"name": "Asha"}}}
    assert auto.evaluate_conditions([{"field": "deal.owner.name", "op": "eq", "value": "Asha"}], payload)
    assert not auto.evaluate_conditions([{"field": "deal.owner.email", "op": "eq", "value": "x"}], payload)


def test_conditions_all_must_pass():
    payload = {"channel": "linkedin", "value": 500}
    conds = [
        {"field": "channel", "op": "eq", "value": "linkedin"},
        {"field": "value", "op": "gte", "value": 1000},
    ]
    assert not auto.evaluate_conditions(conds, payload)


def test_conditions_unknown_op_fails_closed():
    assert not auto.evaluate_conditions([{"field": "a", "op": "regex", "value": ".*"}], {"a": "x"})


# --------------------------------------------------------------------------- #
# Templating
# --------------------------------------------------------------------------- #
def test_render_template_substitutes_and_handles_missing():
    payload = {"channel": "LinkedIn", "value": 1200}
    assert auto.render_template("New {{channel}} lead worth ${{value}}", payload) == "New LinkedIn lead worth $1200"
    assert auto.render_template("Hi {{missing}}!", payload) == "Hi !"
    assert auto.render_template("no tokens", payload) == "no tokens"
    assert auto.render_template(None, payload) == ""


def test_render_template_dotpath():
    payload = {"deal": {"name": "BigCo"}}
    assert auto.render_template("Deal: {{deal.name}}", payload) == "Deal: BigCo"


# --------------------------------------------------------------------------- #
# Catalog validation
# --------------------------------------------------------------------------- #
def test_catalog_validators():
    assert auto.valid_trigger("revenue.closed_won")
    assert not auto.valid_trigger("revenue.bogus")
    assert auto.valid_action("webhook")
    assert not auto.valid_action("teleport")


# --------------------------------------------------------------------------- #
# Action dispatch with mocked channels (no DB)
# --------------------------------------------------------------------------- #
@pytest.mark.asyncio
async def test_action_slack_skips_when_empty():
    st, _ = await auto._act_slack({"text": ""}, {})
    assert st == "skipped"


@pytest.mark.asyncio
async def test_action_slack_renders_and_sends(monkeypatch):
    sent = {}

    async def fake_send(text):
        sent["text"] = text
        return True

    monkeypatch.setattr("app.services.notify_channels.send_slack", fake_send)
    st, _ = await auto._act_slack({"text": "Won {{value}}"}, {"value": 999})
    assert st == "success"
    assert sent["text"] == "Won 999"


@pytest.mark.asyncio
async def test_action_email_skips_without_recipient():
    st, _ = await auto._act_email({"to": "", "subject": "s", "body": "b"}, {})
    assert st == "skipped"


@pytest.mark.asyncio
async def test_action_webhook_skips_invalid_url():
    st, _ = await auto._act_webhook({"url": "not-a-url"}, {})
    assert st == "skipped"


@pytest.mark.asyncio
async def test_run_action_unknown_type_fails():
    res = await auto._run_action(None, uuid.uuid4(), {"type": "nope"}, {}, None)
    assert res["status"] == "failed"


# --------------------------------------------------------------------------- #
# DB-backed end-to-end: emit -> claim -> process -> run
# --------------------------------------------------------------------------- #
@requires_db
@pytest.mark.asyncio
async def test_automation_end_to_end(monkeypatch):
    from app.db import AsyncSessionLocal, engine
    from app.models import (
        AutomationEvent,
        EventStatus,
        Organization,
        RunStatus,
        Task,
        Workflow,
        WorkflowRun,
        Workspace,
    )
    from app.models.base import Base
    from app.models.tenant import OrgType

    await engine.dispose()
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["automation_events"],
                    Base.metadata.tables["automation_workflows"],
                    Base.metadata.tables["automation_runs"],
                    Base.metadata.tables["automation_tasks"],
                ],
            )
        )

    slack_calls: list[str] = []

    async def fake_send_slack(text):
        slack_calls.append(text)
        return True

    monkeypatch.setattr("app.services.notify_channels.send_slack", fake_send_slack)

    sfx = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as db:
        org = Organization(name=f"Auto {sfx}", slug=f"auto-{sfx}", org_type=OrgType.agency)
        db.add(org)
        await db.flush()
        ws = Workspace(organization_id=org.id, name="WS", slug=f"ws-{sfx}")
        ws_other = Workspace(organization_id=org.id, name="Other", slug=f"oth-{sfx}")
        db.add_all([ws, ws_other])
        await db.flush()

        # Active workflow: on closed_won >= 1000 -> slack + task
        wf = Workflow(
            workspace_id=ws.id,
            name="Big win alert",
            trigger_type="revenue.closed_won",
            conditions=[{"field": "value", "op": "gte", "value": 1000}],
            actions=[
                {"type": "slack", "config": {"text": "Won {{value}} from {{channel}}"}},
                {"type": "task", "config": {"title": "Thank {{contact_ref}}", "priority": "high"}},
            ],
            is_active=True,
        )
        # Workflow in a DIFFERENT workspace must never fire on our event.
        wf_other = Workflow(
            workspace_id=ws_other.id,
            name="Other ws",
            trigger_type="revenue.closed_won",
            conditions=[],
            actions=[{"type": "slack", "config": {"text": "should not fire"}}],
            is_active=True,
        )
        db.add_all([wf, wf_other])
        await db.flush()

        # Emit a qualifying event in our workspace.
        await auto.emit_event(
            db, ws.id, "revenue.closed_won",
            {"value": 2500, "channel": "linkedin", "contact_ref": "BigCo"},
            source="test",
        )
        # Emit a non-qualifying event (value below threshold) -> run skipped.
        await auto.emit_event(
            db, ws.id, "revenue.closed_won",
            {"value": 100, "channel": "ads", "contact_ref": "SmallCo"},
            source="test",
        )
        await db.commit()
        ws_id = ws.id

    # Process the queue.
    ran = await auto.run_automation_tick()
    assert ran >= 1

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        events = (
            await db.execute(
                select(AutomationEvent).where(AutomationEvent.workspace_id == ws_id)
            )
        ).scalars().all()
        assert events and all(e.status == EventStatus.processed for e in events)

        runs = (
            await db.execute(
                select(WorkflowRun).where(WorkflowRun.workspace_id == ws_id)
            )
        ).scalars().all()
        statuses = sorted(
            (r.status.value if hasattr(r.status, "value") else r.status) for r in runs
        )
        # One success (value 2500) + one skipped (value 100).
        assert "success" in statuses
        assert "skipped" in statuses

        tasks = (
            await db.execute(select(Task).where(Task.workspace_id == ws_id))
        ).scalars().all()
        assert any(t.title == "Thank BigCo" and t.priority == "high" for t in tasks)

    # Slack fired exactly once (only the qualifying event, only our workspace).
    assert slack_calls == ["Won 2500 from linkedin"]
