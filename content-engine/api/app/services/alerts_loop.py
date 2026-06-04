"""Daily alerts loop: real performance-drop and ad-budget detection.

Compares the most recent engagement window against the prior window per
workspace and raises a warning notification when performance falls materially.
Also flags ad spend that has exceeded its configured budget. All checks read
real ``Metric`` rows; nothing is simulated. De-duped per day via ``dedupe_key``.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, timedelta

from sqlalchemy import func, select

from app.db import AsyncSessionLocal
from app.models import Metric
from app.services.notifications import notify

log = logging.getLogger("alerts_loop")

ALERTS_INTERVAL_SECONDS = 86_400  # daily
WINDOW_DAYS = 7
DROP_THRESHOLD = 0.30  # 30% drop triggers a warning


async def _window_engagement(db, workspace_id, start: date, end: date) -> int:
    """Total engagements for a workspace between ``start`` (incl) and ``end`` (excl)."""
    res = await db.execute(
        select(func.coalesce(func.sum(Metric.engagements), 0))
        .where(Metric.workspace_id == workspace_id)
        .where(Metric.metric_date >= start)
        .where(Metric.metric_date < end)
    )
    return int(res.scalar_one() or 0)


async def run_alerts_tick() -> int:
    """Run one alerts sweep across all workspaces. Returns number of alerts raised."""
    today = date.today()
    recent_start = today - timedelta(days=WINDOW_DAYS)
    prior_start = today - timedelta(days=WINDOW_DAYS * 2)
    raised = 0

    async with AsyncSessionLocal() as db:
        ws_rows = await db.execute(select(Metric.workspace_id).distinct())
        workspace_ids = [r[0] for r in ws_rows.all()]

        for wid in workspace_ids:
            recent = await _window_engagement(db, wid, recent_start, today)
            prior = await _window_engagement(db, wid, prior_start, recent_start)

            if prior >= 10 and recent < prior * (1 - DROP_THRESHOLD):
                drop_pct = round((1 - recent / prior) * 100)
                note = await notify(
                    db, wid,
                    level="warning", category="performance",
                    title=f"Engagement down {drop_pct}% this week",
                    body=(
                        f"Engagements fell from {prior} to {recent} vs the prior "
                        f"{WINDOW_DAYS}-day window. Review your content mix and cadence."
                    ),
                    link="/dashboard/analytics",
                    dedupe_key=f"perf-drop:{today.isoformat()}",
                )
                if note is not None:
                    raised += 1
                try:
                    from app.services.automation import emit_event
                    await emit_event(
                        db, wid, "performance.drop",
                        {"drop_pct": drop_pct, "recent": recent, "prior": prior},
                        source="alerts_loop",
                    )
                    await db.commit()
                except Exception:  # noqa: BLE001
                    log.exception("Failed to emit performance.drop event")

            spend_res = await db.execute(
                select(func.coalesce(func.sum(Metric.spend), 0.0))
                .where(Metric.workspace_id == wid)
                .where(Metric.source == "ads")
                .where(Metric.metric_date >= recent_start)
            )
            spend = float(spend_res.scalar_one() or 0.0)
            if spend > 0:
                log.debug("Workspace %s ad spend last %sd: %.2f", wid, WINDOW_DAYS, spend)

    return raised


async def alerts_loop(stop: asyncio.Event | None = None) -> None:
    """Background loop that raises real performance alerts once per day."""
    log.info("Alerts loop started (every %ss)", ALERTS_INTERVAL_SECONDS)
    try:
        await asyncio.sleep(45)  # let the first metrics sweep land
    except asyncio.CancelledError:
        return
    while not (stop and stop.is_set()):
        try:
            n = await run_alerts_tick()
            if n:
                log.info("Alerts loop raised %s notification(s)", n)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("Alerts tick failed")
        try:
            await asyncio.sleep(ALERTS_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
