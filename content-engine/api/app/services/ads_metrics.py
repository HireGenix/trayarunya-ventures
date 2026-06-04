"""Ads metrics: sync connector data into the Metric table and aggregate KPIs.

`source` on each Metric row stores the ad platform (e.g. ``google_ads``) and
`ref_id` stores the campaign id, so a workspace's ad performance can be sliced
per platform and per campaign and still flows into the M6 learning loop.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdAccount, Campaign, Metric
from app.services.ads_connectors import get_connector

ADS_PLATFORMS = ("google_ads", "meta_ads", "linkedin_ads")
_METRIC_KEYS = ("impressions", "clicks", "engagements", "conversions", "spend")


def _empty_totals() -> dict[str, float]:
    return {k: 0.0 for k in _METRIC_KEYS}


def derive_kpis(t: dict[str, float]) -> dict[str, float]:
    """Compute rate/efficiency KPIs from raw totals."""
    impr = t.get("impressions", 0.0) or 0.0
    clicks = t.get("clicks", 0.0) or 0.0
    conv = t.get("conversions", 0.0) or 0.0
    spend = t.get("spend", 0.0) or 0.0
    return {
        "ctr": round((clicks / impr * 100) if impr else 0.0, 2),
        "cpc": round((spend / clicks) if clicks else 0.0, 2),
        "cpm": round((spend / impr * 1000) if impr else 0.0, 2),
        "conversion_rate": round((conv / clicks * 100) if clicks else 0.0, 2),
        "cpa": round((spend / conv) if conv else 0.0, 2),
    }


async def sync_campaign_metrics(
    db: AsyncSession, campaign: Campaign, platform: str, days: int = 30
) -> int:
    """Pull metrics from the platform connector and upsert daily rows."""
    connector = get_connector(platform)
    account = await db.get(AdAccount, campaign.ad_account_id)
    rows = await connector.fetch_metrics(campaign, account, days=days)

    since = date.today() - timedelta(days=days - 1)
    existing = (
        await db.execute(
            select(Metric).where(
                Metric.workspace_id == campaign.workspace_id,
                Metric.ref_id == campaign.id,
                Metric.metric_date >= since,
            )
        )
    ).scalars().all()
    by_date = {m.metric_date: m for m in existing}

    for r in rows:
        m = by_date.get(r.metric_date)
        if m is None:
            m = Metric(
                workspace_id=campaign.workspace_id,
                source=platform,
                ref_id=campaign.id,
                metric_date=r.metric_date,
            )
            db.add(m)
        m.source = platform
        m.impressions = r.impressions
        m.clicks = r.clicks
        m.engagements = r.engagements
        m.conversions = r.conversions
        m.spend = r.spend
        m.extra = {"campaign": campaign.name}

    campaign.metrics_synced_at = datetime.now(timezone.utc)
    await db.flush()
    return len(rows)


async def ensure_campaign_metrics(
    db: AsyncSession, campaign: Campaign, platform: str, days: int = 30
) -> None:
    """Sync metrics if they've never been synced or are stale (> 6h)."""
    synced = campaign.metrics_synced_at
    if synced is not None and synced.tzinfo is None:
        synced = synced.replace(tzinfo=timezone.utc)
    stale = synced is None or (datetime.now(timezone.utc) - synced) > timedelta(hours=6)
    if stale:
        await sync_campaign_metrics(db, campaign, platform, days=days)


async def platform_overview(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    platform: str,
    campaigns: list[Campaign],
    days: int = 30,
) -> dict[str, Any]:
    """Aggregate KPIs, a daily series and per-campaign rollups for one platform."""
    for c in campaigns:
        await ensure_campaign_metrics(db, c, platform, days=days)

    campaign_ids = [c.id for c in campaigns]
    totals = _empty_totals()
    series_map: dict[str, dict[str, float]] = defaultdict(_empty_totals)
    per_campaign: dict[uuid.UUID, dict[str, float]] = defaultdict(_empty_totals)

    if campaign_ids:
        since = date.today() - timedelta(days=days - 1)
        metrics = (
            await db.execute(
                select(Metric).where(
                    Metric.workspace_id == workspace_id,
                    Metric.ref_id.in_(campaign_ids),
                    Metric.metric_date >= since,
                )
            )
        ).scalars().all()
        for m in metrics:
            for k in _METRIC_KEYS:
                v = float(getattr(m, k))
                totals[k] += v
                series_map[m.metric_date.isoformat()][k] += v
                per_campaign[m.ref_id][k] += v

    series = [
        {"date": d, **{k: round(v[k], 2) for k in _METRIC_KEYS}}
        for d, v in sorted(series_map.items())
    ]

    campaigns_out = []
    for c in campaigns:
        ct = per_campaign.get(c.id, _empty_totals())
        campaigns_out.append(
            {
                "id": str(c.id),
                "name": c.name,
                "status": c.status.value if hasattr(c.status, "value") else c.status,
                "daily_budget": c.daily_budget,
                "totals": {k: round(ct[k], 2) for k in _METRIC_KEYS},
                "kpis": derive_kpis(ct),
            }
        )
    campaigns_out.sort(key=lambda x: x["totals"]["spend"], reverse=True)

    return {
        "platform": platform,
        "days": days,
        "totals": {k: round(totals[k], 2) for k in _METRIC_KEYS},
        "kpis": derive_kpis(totals),
        "series": series,
        "campaigns": campaigns_out,
        "campaign_count": len(campaigns),
        "active_count": sum(
            1
            for c in campaigns
            if (c.status.value if hasattr(c.status, "value") else c.status) == "active"
        ),
    }


async def campaign_metrics(
    db: AsyncSession, campaign: Campaign, platform: str, days: int = 30
) -> dict[str, Any]:
    await ensure_campaign_metrics(db, campaign, platform, days=days)
    since = date.today() - timedelta(days=days - 1)
    metrics = (
        await db.execute(
            select(Metric)
            .where(
                Metric.workspace_id == campaign.workspace_id,
                Metric.ref_id == campaign.id,
                Metric.metric_date >= since,
            )
            .order_by(Metric.metric_date.asc())
        )
    ).scalars().all()

    totals = _empty_totals()
    series = []
    for m in metrics:
        row = {"date": m.metric_date.isoformat()}
        for k in _METRIC_KEYS:
            v = float(getattr(m, k))
            totals[k] += v
            row[k] = round(v, 2)
        series.append(row)

    return {
        "campaign_id": str(campaign.id),
        "days": days,
        "totals": {k: round(totals[k], 2) for k in _METRIC_KEYS},
        "kpis": derive_kpis(totals),
        "series": series,
    }


async def delete_campaign_metrics(
    db: AsyncSession, workspace_id: uuid.UUID, campaign_id: uuid.UUID
) -> None:
    await db.execute(
        delete(Metric).where(
            Metric.workspace_id == workspace_id, Metric.ref_id == campaign_id
        )
    )
