"""Background email delivery engine.

Three async loop functions plus enrollment/send helpers power native email
delivery without any synchronous, request-blocking sends:

* :func:`email_dispatch_loop` — sweeps scheduled/sending campaigns, materialises
  idempotent per-recipient send logs, instruments tracking and dispatches in
  throttled batches. Supports A/B subject testing (test pool first, winner
  later).
* :func:`email_sequence_loop` — advances drip enrollments one step at a time as
  their ``next_run_at`` falls due.
* enrollment + send-now helpers used by the router.

Every item is processed defensively: one bad campaign / enrollment never breaks
the sweep, and the loops only exit when their ``stop`` event is set. All numbers
written here come from real rows (send logs, enrollments) — nothing is faked.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.config import settings
from app.models.email import (
    EmailCampaign,
    EmailEnrollment,
    EmailSendLog,
    EmailSequence,
    EmailSubscriber,
    EmailSuppression,
)
from app.services.email_tracking import (
    instrument_html,
    mint_token,
    tracking_base_url,
)
from app.services.email_compiler import (
    add_canspam_footer,
    apply_merge_tags,
    compile_blocks,
)
from app.services.email_segment_engine import evaluate_segment
from app.services.notify_channels import send_email

log = logging.getLogger("email_worker")

# Loop cadence.
DISPATCH_INTERVAL_SECONDS = 30
SEQUENCE_INTERVAL_SECONDS = 60
DISPATCH_INITIAL_DELAY_SECONDS = 30
SEQUENCE_INITIAL_DELAY_SECONDS = 45

# Throttling.
BATCH_SIZE = 50
BATCH_THROTTLE_SECONDS = 0.5

# A/B testing.
AB_MIN_SENDS_PER_VARIANT = 20


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _is_suppressed(db: AsyncSession, ws_id: uuid.UUID, email: str | None) -> bool:
    """Return True if ``email`` is on the workspace's do-not-send list."""
    email = (email or "").strip().lower()
    if not email:
        return False
    res = await db.execute(
        select(EmailSuppression.id).where(
            EmailSuppression.workspace_id == ws_id,
            EmailSuppression.email == email,
        )
    )
    return res.scalar_one_or_none() is not None


def _subscriber_dict(sub: EmailSubscriber) -> dict:
    """Merge-tag context for a subscriber."""
    return {
        "email": sub.email,
        "name": sub.name,
        "attributes": sub.attributes if isinstance(sub.attributes, dict) else {},
    }


def _campaign_block_list(body_blocks) -> list:
    """Normalise a campaign's ``body_blocks`` into a flat list of blocks."""
    if isinstance(body_blocks, list):
        return body_blocks
    if isinstance(body_blocks, dict):
        blocks = body_blocks.get("blocks")
        if isinstance(blocks, list):
            return blocks
    return []


def _render_email_html(
    *,
    body_blocks,
    body_html: str,
    sub: EmailSubscriber,
    token: str,
) -> str:
    """Build the final, send-ready HTML for one recipient.

    Compiles ``body_blocks`` when present (falling back to raw ``body_html``),
    resolves ``{{merge_tags}}``, instruments tracking, and appends a CAN-SPAM
    footer with a per-recipient unsubscribe link.
    """
    blocks = _campaign_block_list(body_blocks)
    brand = body_blocks.get("brand") if isinstance(body_blocks, dict) else None
    if blocks:
        base = compile_blocks(blocks, brand if isinstance(brand, dict) else None)
    else:
        base = body_html or ""

    subdict = _subscriber_dict(sub)
    base = apply_merge_tags(base, subdict)
    html = instrument_html(base, token)
    unsub_url = f"{tracking_base_url()}/email/t/unsubscribe/{token}"
    address = brand.get("address", "") if isinstance(brand, dict) else ""
    return add_canspam_footer(html, unsub_url, address)


# --------------------------------------------------------------------------- #
# Campaign dispatch
# --------------------------------------------------------------------------- #
async def email_dispatch_loop(stop: asyncio.Event) -> None:
    """Continuously dispatch due campaigns until ``stop`` is set."""
    log.info("Email dispatch loop started (every %ss)", DISPATCH_INTERVAL_SECONDS)
    try:
        await asyncio.sleep(DISPATCH_INITIAL_DELAY_SECONDS)
    except asyncio.CancelledError:
        return

    while not stop.is_set():
        try:
            await _dispatch_due_campaigns()
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001 — a sweep failure must not kill the loop
            log.exception("email dispatch sweep failed")
        try:
            await asyncio.sleep(DISPATCH_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break


async def _dispatch_due_campaigns() -> None:
    """One dispatch cycle: pick up due campaigns and process A/B winners."""
    async with AsyncSessionLocal() as db:
        now = _now()
        res = await db.execute(
            select(EmailCampaign).where(
                EmailCampaign.status.in_(("scheduled", "sending")),
                EmailCampaign.scheduled_at.is_not(None),
                EmailCampaign.scheduled_at <= now,
            )
        )
        campaigns = list(res.scalars().all())

        for campaign in campaigns:
            try:
                await _dispatch_campaign(db, campaign)
                await db.commit()
            except Exception:  # noqa: BLE001 — isolate per-campaign failures
                await db.rollback()
                log.exception("campaign dispatch failed (id=%s)", campaign.id)

        # Decide A/B winners and release the remainder where ready.
        try:
            await check_ab_winners(db)
            await db.commit()
        except Exception:  # noqa: BLE001
            await db.rollback()
            log.exception("A/B winner check failed")


def _ab_enabled(campaign: EmailCampaign) -> bool:
    ab = campaign.ab_test
    return isinstance(ab, dict) and bool(ab.get("enabled"))


async def _subscribers_for_campaign(
    db: AsyncSession, campaign: EmailCampaign
) -> list[EmailSubscriber]:
    # Dynamic audience: resolve recipients from a saved segment.
    if campaign.segment_id is not None:
        subs = await evaluate_segment(
            db, campaign.workspace_id, campaign.segment_id
        )
        return [s for s in subs if s.status == "subscribed"]
    if campaign.list_id is None:
        return []
    res = await db.execute(
        select(EmailSubscriber).where(
            EmailSubscriber.workspace_id == campaign.workspace_id,
            EmailSubscriber.list_id == campaign.list_id,
            EmailSubscriber.status == "subscribed",
        )
    )
    return list(res.scalars().all())


async def _existing_send_logs(
    db: AsyncSession, campaign: EmailCampaign
) -> dict[uuid.UUID, EmailSendLog]:
    """Map subscriber_id -> existing send log for this campaign (idempotency)."""
    res = await db.execute(
        select(EmailSendLog).where(
            EmailSendLog.workspace_id == campaign.workspace_id,
            EmailSendLog.campaign_id == campaign.id,
        )
    )
    out: dict[uuid.UUID, EmailSendLog] = {}
    for log_row in res.scalars().all():
        if log_row.subscriber_id is not None:
            out[log_row.subscriber_id] = log_row
    return out


def _ensure_stats(campaign: EmailCampaign) -> dict:
    stats = campaign.stats if isinstance(campaign.stats, dict) else {}
    stats.setdefault("sent", 0)
    stats.setdefault("opens", 0)
    stats.setdefault("clicks", 0)
    stats.setdefault("bounces", 0)
    campaign.stats = stats
    return stats


async def _dispatch_campaign(db: AsyncSession, campaign: EmailCampaign) -> None:
    """Materialise send logs and dispatch a single campaign."""
    campaign.status = "sending"
    await db.flush()

    if _ab_enabled(campaign):
        await _dispatch_ab_campaign(db, campaign)
        return

    subscribers = await _subscribers_for_campaign(db, campaign)
    existing = await _existing_send_logs(db, campaign)

    # Idempotent queueing — only the subscribers without an existing log.
    pending: list[tuple[EmailSendLog, EmailSubscriber]] = []
    for sub in subscribers:
        if sub.id in existing:
            continue
        send_log = EmailSendLog(
            workspace_id=campaign.workspace_id,
            campaign_id=campaign.id,
            subscriber_id=sub.id,
            email=sub.email,
            status="queued",
        )
        db.add(send_log)
        pending.append((send_log, sub))
    await db.flush()

    sent = await _send_batches(db, campaign, pending, subject=campaign.subject)

    stats = _ensure_stats(campaign)
    stats["sent"] = int(stats.get("sent", 0)) + sent

    campaign.status = "sent"
    campaign.sent_at = _now()
    await db.flush()


async def _send_batches(
    db: AsyncSession,
    campaign: EmailCampaign,
    pending: list[tuple[EmailSendLog, EmailSubscriber]],
    *,
    subject: str,
) -> int:
    """Send a list of (send_log, subscriber) pairs in throttled batches."""
    sent = 0
    body_html = campaign.body_html or ""
    for start in range(0, len(pending), BATCH_SIZE):
        batch = pending[start : start + BATCH_SIZE]
        for send_log, sub in batch:
            try:
                # Honour the global suppression list.
                if await _is_suppressed(db, campaign.workspace_id, sub.email):
                    send_log.status = "failed"
                    send_log.error = "suppressed"
                    continue
                token = mint_token(send_log.id)
                html = _render_email_html(
                    body_blocks=campaign.body_blocks,
                    body_html=body_html,
                    sub=sub,
                    token=token,
                )
                resolved_subject = apply_merge_tags(
                    subject or campaign.subject or "", _subscriber_dict(sub)
                )
                ok = await send_email(
                    sub.email,
                    resolved_subject,
                    body_html or "",
                    html=html,
                )
                send_log.provider = "acs" if settings.acs_email_configured else "smtp"
                if ok:
                    send_log.status = "sent"
                    send_log.sent_at = _now()
                    sent += 1
                else:
                    send_log.status = "failed"
                    send_log.error = "send_email returned False"
            except Exception as exc:  # noqa: BLE001 — isolate per-recipient failures
                send_log.status = "failed"
                send_log.error = str(exc)
                log.exception(
                    "send failed (campaign=%s subscriber=%s)", campaign.id, sub.id
                )
        await db.flush()
        if start + BATCH_SIZE < len(pending):
            await asyncio.sleep(BATCH_THROTTLE_SECONDS)
    return sent


# --------------------------------------------------------------------------- #
# A/B testing
# --------------------------------------------------------------------------- #
def _ab_variants(campaign: EmailCampaign) -> list[dict]:
    ab = campaign.ab_test if isinstance(campaign.ab_test, dict) else {}
    variants = ab.get("variants")
    out: list[dict] = []
    if isinstance(variants, list):
        for v in variants:
            if isinstance(v, dict) and v.get("key"):
                out.append(v)
    return out


async def _dispatch_ab_campaign(db: AsyncSession, campaign: EmailCampaign) -> None:
    """First A/B dispatch: send only the holdout test pool, split by variant.

    The remainder is held back until :func:`check_ab_winners` decides a winner.
    Status stays ``sending`` so the loop revisits the campaign.
    """
    variants = _ab_variants(campaign)
    if len(variants) < 2:
        # Not a valid A/B config — fall back to a normal send.
        campaign.ab_test = {**(campaign.ab_test or {}), "enabled": False}
        await _dispatch_campaign(db, campaign)
        return

    existing = await _existing_send_logs(db, campaign)
    if existing:
        # Test pool already dispatched on a prior cycle — nothing to do now.
        campaign.status = "sending"
        await db.flush()
        return

    subscribers = await _subscribers_for_campaign(db, campaign)
    if not subscribers:
        campaign.status = "sent"
        campaign.sent_at = _now()
        await db.flush()
        return

    ab = dict(campaign.ab_test or {})
    holdout_pct = ab.get("holdout_pct", 20) or 0
    try:
        holdout_pct = max(0, min(100, int(holdout_pct)))
    except (TypeError, ValueError):
        holdout_pct = 20

    pool_size = max(len(variants), (len(subscribers) * holdout_pct) // 100)
    pool_size = min(pool_size, len(subscribers))
    test_pool = subscribers[:pool_size]

    pending: list[tuple[EmailSendLog, EmailSubscriber, str]] = []
    for idx, sub in enumerate(test_pool):
        variant = variants[idx % len(variants)]
        send_log = EmailSendLog(
            workspace_id=campaign.workspace_id,
            campaign_id=campaign.id,
            subscriber_id=sub.id,
            email=sub.email,
            status="queued",
            variant_key=variant.get("key"),
        )
        db.add(send_log)
        pending.append((send_log, sub, variant.get("subject") or campaign.subject))
    await db.flush()

    sent = 0
    for start in range(0, len(pending), BATCH_SIZE):
        batch = pending[start : start + BATCH_SIZE]
        for send_log, sub, subject in batch:
            try:
                if await _is_suppressed(db, campaign.workspace_id, sub.email):
                    send_log.status = "failed"
                    send_log.error = "suppressed"
                    continue
                token = mint_token(send_log.id)
                html = _render_email_html(
                    body_blocks=campaign.body_blocks,
                    body_html=campaign.body_html or "",
                    sub=sub,
                    token=token,
                )
                resolved_subject = apply_merge_tags(
                    subject or "", _subscriber_dict(sub)
                )
                ok = await send_email(
                    sub.email, resolved_subject, campaign.body_html or "", html=html
                )
                send_log.provider = "acs" if settings.acs_email_configured else "smtp"
                if ok:
                    send_log.status = "sent"
                    send_log.sent_at = _now()
                    sent += 1
                else:
                    send_log.status = "failed"
                    send_log.error = "send_email returned False"
            except Exception as exc:  # noqa: BLE001
                send_log.status = "failed"
                send_log.error = str(exc)
                log.exception(
                    "A/B send failed (campaign=%s subscriber=%s)", campaign.id, sub.id
                )
        await db.flush()
        if start + BATCH_SIZE < len(pending):
            await asyncio.sleep(BATCH_THROTTLE_SECONDS)

    stats = _ensure_stats(campaign)
    stats["sent"] = int(stats.get("sent", 0)) + sent

    ab["decided_variant"] = ab.get("decided_variant")  # keep null until decided
    campaign.ab_test = ab
    campaign.status = "sending"
    await db.flush()


async def check_ab_winners(db: AsyncSession) -> None:
    """Decide A/B winners and dispatch the remainder using the winning subject."""
    res = await db.execute(
        select(EmailCampaign).where(EmailCampaign.status == "sending")
    )
    campaigns = list(res.scalars().all())

    for campaign in campaigns:
        if not _ab_enabled(campaign):
            continue
        ab = dict(campaign.ab_test or {})
        if ab.get("decided_variant"):
            continue
        variants = _ab_variants(campaign)
        if len(variants) < 2:
            continue

        try:
            await _decide_ab_winner(db, campaign, ab, variants)
        except Exception:  # noqa: BLE001 — one campaign must not break the rest
            log.exception("A/B winner decision failed (id=%s)", campaign.id)


async def _decide_ab_winner(
    db: AsyncSession,
    campaign: EmailCampaign,
    ab: dict,
    variants: list[dict],
) -> None:
    metric = (ab.get("winner_metric") or "opens").lower()
    success_states = ("clicked",) if metric == "clicks" else ("opened", "clicked")

    best_key: str | None = None
    best_rate = -1.0
    for variant in variants:
        key = variant.get("key")
        total = int(
            (
                await db.execute(
                    select(func.count(EmailSendLog.id)).where(
                        EmailSendLog.campaign_id == campaign.id,
                        EmailSendLog.variant_key == key,
                        EmailSendLog.status.in_(
                            ("sent", "opened", "clicked")
                        ),
                    )
                )
            ).scalar_one()
            or 0
        )
        if total < AB_MIN_SENDS_PER_VARIANT:
            # Not enough data yet for any variant — wait for the next cycle.
            return
        success = int(
            (
                await db.execute(
                    select(func.count(EmailSendLog.id)).where(
                        EmailSendLog.campaign_id == campaign.id,
                        EmailSendLog.variant_key == key,
                        EmailSendLog.status.in_(success_states),
                    )
                )
            ).scalar_one()
            or 0
        )
        rate = success / total if total else 0.0
        if rate > best_rate:
            best_rate = rate
            best_key = key

    if best_key is None:
        return

    winning_subject = next(
        (v.get("subject") for v in variants if v.get("key") == best_key),
        campaign.subject,
    )

    # Dispatch the remainder (subscribers not in the test pool).
    subscribers = await _subscribers_for_campaign(db, campaign)
    existing = await _existing_send_logs(db, campaign)

    pending: list[tuple[EmailSendLog, EmailSubscriber]] = []
    for sub in subscribers:
        if sub.id in existing:
            continue
        send_log = EmailSendLog(
            workspace_id=campaign.workspace_id,
            campaign_id=campaign.id,
            subscriber_id=sub.id,
            email=sub.email,
            status="queued",
            variant_key=best_key,
        )
        db.add(send_log)
        pending.append((send_log, sub))
    await db.flush()

    sent = await _send_batches(
        db, campaign, pending, subject=winning_subject or campaign.subject
    )

    stats = _ensure_stats(campaign)
    stats["sent"] = int(stats.get("sent", 0)) + sent

    ab["decided_variant"] = best_key
    campaign.ab_test = ab
    campaign.subject = winning_subject or campaign.subject
    campaign.status = "sent"
    campaign.sent_at = _now()
    await db.flush()


# --------------------------------------------------------------------------- #
# Sequence engine
# --------------------------------------------------------------------------- #
async def email_sequence_loop(stop: asyncio.Event) -> None:
    """Continuously advance due drip enrollments until ``stop`` is set."""
    log.info("Email sequence loop started (every %ss)", SEQUENCE_INTERVAL_SECONDS)
    try:
        await asyncio.sleep(SEQUENCE_INITIAL_DELAY_SECONDS)
    except asyncio.CancelledError:
        return

    while not stop.is_set():
        try:
            await _run_due_enrollments()
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("email sequence sweep failed")
        try:
            await asyncio.sleep(SEQUENCE_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break


async def _run_due_enrollments() -> None:
    async with AsyncSessionLocal() as db:
        now = _now()
        res = await db.execute(
            select(EmailEnrollment).where(
                EmailEnrollment.status == "enrolled",
                EmailEnrollment.next_run_at.is_not(None),
                EmailEnrollment.next_run_at <= now,
            )
        )
        enrollments = list(res.scalars().all())

        for enrollment in enrollments:
            try:
                await _run_enrollment_step(db, enrollment)
                await db.commit()
            except Exception:  # noqa: BLE001 — isolate per-enrollment failures
                await db.rollback()
                log.exception("enrollment step failed (id=%s)", enrollment.id)


async def _load_sequence(
    db: AsyncSession, enrollment: EmailEnrollment
) -> EmailSequence | None:
    res = await db.execute(
        select(EmailSequence).where(EmailSequence.id == enrollment.sequence_id)
    )
    return res.scalar_one_or_none()


def _step_delay_hours(step) -> int:
    if isinstance(step, dict):
        try:
            return max(int(step.get("delay_hours", 0) or 0), 0)
        except (TypeError, ValueError):
            return 0
    return 0


async def _evaluate_condition(
    db: AsyncSession, enrollment: EmailEnrollment, sub: EmailSubscriber, step: dict
) -> bool:
    """Evaluate a branching condition against real telemetry / subscriber data."""
    field = (step.get("field") or "").lower()
    value = step.get("value")

    if field == "has_tag":
        tags = sub.tags if isinstance(sub.tags, list) else []
        return value in tags

    if field in ("opened", "clicked"):
        column = (
            EmailSendLog.opened_at if field == "opened" else EmailSendLog.clicked_at
        )
        n = int(
            (
                await db.execute(
                    select(func.count(EmailSendLog.id)).where(
                        EmailSendLog.workspace_id == enrollment.workspace_id,
                        EmailSendLog.subscriber_id == sub.id,
                        EmailSendLog.sequence_id == enrollment.sequence_id,
                        column.is_not(None),
                    )
                )
            ).scalar_one()
            or 0
        )
        return n > 0

    return False


async def _send_sequence_email(
    db: AsyncSession, enrollment: EmailEnrollment, sub: EmailSubscriber, step: dict
) -> None:
    """Materialise a send log and deliver one sequence email to ``sub``."""
    subject = step.get("subject") or ""
    body_html = step.get("template") or ""

    send_log = EmailSendLog(
        workspace_id=enrollment.workspace_id,
        campaign_id=None,
        subscriber_id=enrollment.subscriber_id,
        email=sub.email,
        status="queued",
        sequence_id=enrollment.sequence_id,
    )
    db.add(send_log)
    await db.flush()

    try:
        token = mint_token(send_log.id)
        subdict = _subscriber_dict(sub)
        resolved_subject = apply_merge_tags(subject, subdict)
        html = _render_email_html(
            body_blocks=step.get("body_blocks"),
            body_html=body_html,
            sub=sub,
            token=token,
        )
        ok = await send_email(sub.email, resolved_subject, body_html, html=html)
        send_log.provider = "acs" if settings.acs_email_configured else "smtp"
        if ok:
            send_log.status = "sent"
            send_log.sent_at = _now()
        else:
            send_log.status = "failed"
            send_log.error = "send_email returned False"
    except Exception as exc:  # noqa: BLE001
        send_log.status = "failed"
        send_log.error = str(exc)
        log.exception("sequence send failed (enrollment=%s)", enrollment.id)


async def _run_enrollment_step(
    db: AsyncSession, enrollment: EmailEnrollment
) -> None:
    """Advance a drip enrollment, supporting branching journey steps.

    Step shapes (a step with no ``type`` is treated as ``send_email`` for
    back-compat with the original flat format)::

        {"type": "send_email", "subject": str, "template": str, "delay_hours": int}
        {"type": "wait", "delay_hours": int}
        {"type": "condition", "field": "opened"|"clicked"|"has_tag",
         "value": str, "yes_step": int, "no_step": int}
        {"type": "goal", "name": str}
    """
    sequence = await _load_sequence(db, enrollment)
    steps = sequence.steps if (sequence and isinstance(sequence.steps, list)) else []

    sub = await db.get(EmailSubscriber, enrollment.subscriber_id)
    if sub is None or sub.status != "subscribed":
        # Subscriber gone / opted out — cancel the enrollment.
        enrollment.status = "cancelled"
        enrollment.next_run_at = None
        await db.flush()
        return

    # Never deliver to a suppressed address.
    if await _is_suppressed(db, enrollment.workspace_id, sub.email):
        enrollment.status = "cancelled"
        enrollment.next_run_at = None
        await db.flush()
        return

    # Resolve control-flow steps (condition/goal/malformed) in a bounded loop so
    # a branch can immediately reach the next actionable step.
    max_hops = 50
    for _ in range(max_hops):
        if enrollment.current_step >= len(steps) or enrollment.current_step < 0:
            enrollment.status = "completed"
            enrollment.next_run_at = None
            await db.flush()
            return

        step = steps[enrollment.current_step]
        if not isinstance(step, dict):
            enrollment.current_step += 1
            continue

        stype = (step.get("type") or "send_email").lower()

        if stype == "goal":
            enrollment.status = "completed"
            enrollment.next_run_at = None
            await db.flush()
            return

        if stype == "condition":
            branch = await _evaluate_condition(db, enrollment, sub, step)
            target = step.get("yes_step") if branch else step.get("no_step")
            if isinstance(target, int) and target >= 0:
                enrollment.current_step = target
            else:
                enrollment.current_step += 1
            continue

        if stype == "wait":
            enrollment.current_step += 1
            if enrollment.current_step >= len(steps):
                enrollment.status = "completed"
                enrollment.next_run_at = None
            else:
                enrollment.next_run_at = _now() + timedelta(
                    hours=_step_delay_hours(step)
                )
            await db.flush()
            return

        # Default: send_email.
        await _send_sequence_email(db, enrollment, sub, step)
        enrollment.current_step += 1
        if enrollment.current_step >= len(steps):
            enrollment.status = "completed"
            enrollment.next_run_at = None
        else:
            enrollment.next_run_at = _now() + timedelta(
                hours=_step_delay_hours(steps[enrollment.current_step])
            )
        await db.flush()
        return

    # Safety valve: too many control-flow hops in one pass — retry shortly.
    enrollment.next_run_at = _now() + timedelta(hours=1)
    await db.flush()


# --------------------------------------------------------------------------- #
# Enrollment helpers (used by the router)
# --------------------------------------------------------------------------- #
async def enroll_subscribers(
    db: AsyncSession,
    ws_id: uuid.UUID,
    sequence_id: uuid.UUID,
    subscriber_ids: list[uuid.UUID],
) -> int:
    """Enroll subscribers into a sequence. Returns count enrolled."""
    res = await db.execute(
        select(EmailSequence).where(
            EmailSequence.workspace_id == ws_id,
            EmailSequence.id == sequence_id,
        )
    )
    sequence = res.scalar_one_or_none()
    if sequence is None:
        return 0

    steps = sequence.steps if isinstance(sequence.steps, list) else []
    first_delay_hours = 0
    if steps and isinstance(steps[0], dict):
        try:
            first_delay_hours = int(steps[0].get("delay_hours", 0) or 0)
        except (TypeError, ValueError):
            first_delay_hours = 0
    first_run_at = _now() + timedelta(hours=first_delay_hours)

    count = 0
    for sub_id in subscriber_ids:
        existing = await db.execute(
            select(EmailEnrollment.id).where(
                EmailEnrollment.workspace_id == ws_id,
                EmailEnrollment.sequence_id == sequence_id,
                EmailEnrollment.subscriber_id == sub_id,
                EmailEnrollment.status == "enrolled",
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue
        enrollment = EmailEnrollment(
            workspace_id=ws_id,
            sequence_id=sequence_id,
            subscriber_id=sub_id,
            current_step=0,
            status="enrolled",
            next_run_at=first_run_at,
        )
        db.add(enrollment)
        count += 1
    await db.flush()
    return count


async def enrollment_progress(
    db: AsyncSession,
    ws_id: uuid.UUID,
    sequence_id: uuid.UUID,
) -> dict:
    """Return enrollment counts for a sequence."""
    res = await db.execute(
        select(EmailEnrollment.status, func.count(EmailEnrollment.id))
        .where(
            EmailEnrollment.workspace_id == ws_id,
            EmailEnrollment.sequence_id == sequence_id,
        )
        .group_by(EmailEnrollment.status)
    )
    counts = {status: int(n) for status, n in res.all()}
    return {
        "total": sum(counts.values()),
        "enrolled": counts.get("enrolled", 0),
        "completed": counts.get("completed", 0),
        "cancelled": counts.get("cancelled", 0),
    }


# --------------------------------------------------------------------------- #
# Send-now helper
# --------------------------------------------------------------------------- #
async def schedule_send_now(
    db: AsyncSession,
    campaign: EmailCampaign,
) -> None:
    """Mark a campaign for immediate dispatch by the worker."""
    campaign.scheduled_at = _now()
    campaign.status = "scheduled"
    await db.flush()
