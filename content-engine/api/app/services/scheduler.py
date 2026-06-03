"""Background scheduler: fires due, pending schedules.

A lightweight asyncio loop polls for schedules whose ``scheduled_at`` has passed
and whose status is still ``pending``. Each due schedule is *atomically claimed*
(``UPDATE ... WHERE status = 'pending'`` → ``publishing``) so that running the
loop in more than one process (API + worker) can never double-publish a post.
Claimed schedules are then published via the shared publish flow.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select, update

from app.db import AsyncSessionLocal
from app.models import ContentItem, Schedule, ScheduleStatus, SocialAccount

log = logging.getLogger("scheduler")

POLL_INTERVAL_SECONDS = 30
_BATCH = 20


async def _claim_due_ids() -> list:
    """Atomically flip up to ``_BATCH`` due pending schedules to ``publishing``
    and return their ids. The WHERE-on-status makes the claim race-safe."""
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        due = (
            await db.execute(
                select(Schedule.id)
                .where(
                    Schedule.status == ScheduleStatus.pending,
                    Schedule.scheduled_at <= now,
                )
                .order_by(Schedule.scheduled_at.asc())
                .limit(_BATCH)
            )
        ).scalars().all()
        claimed = []
        for sid in due:
            res = await db.execute(
                update(Schedule)
                .where(Schedule.id == sid, Schedule.status == ScheduleStatus.pending)
                .values(status=ScheduleStatus.publishing)
            )
            if res.rowcount:
                claimed.append(sid)
        await db.commit()
        return claimed


async def _publish_claimed(schedule_id) -> None:
    from app.services.publish_flow import execute_publish

    async with AsyncSessionLocal() as db:
        sched = await db.get(Schedule, schedule_id)
        if sched is None or sched.status != ScheduleStatus.publishing:
            return
        item = await db.get(ContentItem, sched.content_item_id)
        account = await db.get(SocialAccount, sched.social_account_id)
        if item is None or account is None:
            sched.status = ScheduleStatus.failed
            sched.error = "Content item or social account no longer exists"
            await db.commit()
            return
        await execute_publish(db, item, account, sched)
        await db.commit()


async def run_due_schedules() -> int:
    """Process all currently-due schedules. Returns how many were published/attempted."""
    claimed = await _claim_due_ids()
    for sid in claimed:
        try:
            await _publish_claimed(sid)
        except Exception:  # noqa: BLE001 — one bad post must not stop the batch
            log.exception("Failed to publish scheduled post %s", sid)
            async with AsyncSessionLocal() as db:
                sched = await db.get(Schedule, sid)
                if sched and sched.status == ScheduleStatus.publishing:
                    sched.status = ScheduleStatus.failed
                    sched.error = "Internal error while publishing"
                    await db.commit()
    return len(claimed)


async def scheduler_loop(stop: asyncio.Event | None = None) -> None:
    """Poll forever (until ``stop`` is set), firing due schedules each tick."""
    log.info("Scheduler loop started (poll every %ss)", POLL_INTERVAL_SECONDS)
    while not (stop and stop.is_set()):
        try:
            n = await run_due_schedules()
            if n:
                log.info("Scheduler published %s due post(s)", n)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("Scheduler tick failed")
        try:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
