"""Results loop: pull real engagement back from published posts into ``Metric``.

After a post goes out (LinkedIn / X), this service periodically reads its current
likes / comments / shares / impressions and upserts a daily ``Metric`` row keyed
by ``(workspace, source=platform, ref_id=schedule_id, metric_date=today)``. The
existing analytics summary aggregates ``Metric`` rows by source, so the dashboard
becomes a live, real performance feed instead of a manual-only pipeline.

Live numbers are used where the platform API is reachable; otherwise a
deterministic simulation keeps the charts populated (flagged ``simulated``).
"""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.models import Metric, Schedule, ScheduleStatus, SocialAccount
from app.services.publisher import fetch_post_stats

log = logging.getLogger("post_metrics")


def _platform_str(account: SocialAccount) -> str:
    return (
        account.platform.value
        if hasattr(account.platform, "value")
        else str(account.platform)
    )


async def _upsert_metric(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    source: str,
    ref_id: uuid.UUID,
    on: date,
    stats: dict,
) -> None:
    """Insert or update today's metric row for a published post."""
    likes = int(stats.get("likes", 0) or 0)
    comments = int(stats.get("comments", 0) or 0)
    shares = int(stats.get("shares", 0) or 0)
    impressions = int(stats.get("impressions", 0) or 0)
    clicks = int(stats.get("clicks", 0) or 0)
    engagements = likes + comments + shares

    existing = (
        await db.execute(
            select(Metric).where(
                Metric.workspace_id == workspace_id,
                Metric.source == source,
                Metric.ref_id == ref_id,
                Metric.metric_date == on,
            )
        )
    ).scalar_one_or_none()

    extra = {
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "kind": "post",
        "simulated": bool(stats.get("simulated", False)),
    }
    if existing is None:
        db.add(
            Metric(
                workspace_id=workspace_id,
                source=source,
                ref_id=ref_id,
                metric_date=on,
                impressions=impressions,
                clicks=clicks,
                engagements=engagements,
                conversions=0,
                spend=0.0,
                extra=extra,
            )
        )
    else:
        existing.impressions = impressions
        existing.clicks = clicks
        existing.engagements = engagements
        existing.extra = extra


async def refresh_post_metrics(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID | None = None,
    lookback_days: int = 30,
) -> int:
    """Refresh engagement for every published post in the lookback window.

    If ``workspace_id`` is given, only that workspace's posts are refreshed.
    Returns the number of posts refreshed. Caller owns the commit.
    """
    cutoff = datetime.now(timezone.utc).timestamp() - lookback_days * 86400
    today = date.today()

    q = select(Schedule).where(
        Schedule.status == ScheduleStatus.published,
        Schedule.external_post_id.is_not(None),
    )
    if workspace_id is not None:
        q = q.where(Schedule.workspace_id == workspace_id)
    schedules = (await db.execute(q)).scalars().all()

    refreshed = 0
    for sched in schedules:
        published_at = sched.updated_at or sched.scheduled_at
        if published_at is not None:
            ts = published_at.timestamp() if hasattr(published_at, "timestamp") else 0
            if ts and ts < cutoff:
                continue
            days_since = 0
            if hasattr(published_at, "timestamp"):
                days_since = max(
                    0, int((datetime.now(timezone.utc) - published_at).days)
                )
        else:
            days_since = 0

        account = await db.get(SocialAccount, sched.social_account_id)
        if account is None:
            continue
        try:
            stats = await fetch_post_stats(
                account, sched.external_post_id, days_since=days_since
            )
        except Exception:  # noqa: BLE001 — one bad post must not stop the sweep
            log.warning("Stats fetch failed for schedule %s", sched.id)
            continue
        await _upsert_metric(
            db,
            workspace_id=sched.workspace_id,
            source=_platform_str(account),
            ref_id=sched.id,
            on=today,
            stats=stats,
        )
        refreshed += 1
    return refreshed


async def run_refresh(
    workspace_id: uuid.UUID | None = None, lookback_days: int = 30
) -> int:
    """Open a session, refresh post metrics, commit. Used by the scheduler/API."""
    async with AsyncSessionLocal() as db:
        n = await refresh_post_metrics(
            db, workspace_id=workspace_id, lookback_days=lookback_days
        )
        await db.commit()
        return n
