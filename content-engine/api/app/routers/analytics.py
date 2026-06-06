"""Analytics + learning-loop routes (M6): metric ingestion and a workspace summary
that powers the dashboard charts. Metrics come from connectors (or the ingest
endpoint) and feed the learning loop."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    ContentItem,
    ContentStatus,
    Metric,
    Schedule,
    ScheduleStatus,
    SocialAccount,
)
from app.schemas import AnalyticsSummary, MetricOut


class MetricIngest(BaseModel):
    source: str = "manual"
    metric_date: date | None = None
    impressions: int = 0
    clicks: int = 0
    engagements: int = 0
    conversions: int = 0
    spend: float = 0.0


class RefreshResult(BaseModel):
    refreshed: int


class PostStat(BaseModel):
    schedule_id: str
    content_item_id: str
    title: str | None
    platform: str
    external_post_id: str | None
    published_at: datetime | None
    impressions: int
    clicks: int
    engagements: int
    likes: int
    comments: int
    shares: int
    simulated: bool


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/metrics", response_model=MetricOut, status_code=status.HTTP_201_CREATED)
async def ingest_metric(
    data: MetricIngest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> MetricOut:
    metric = Metric(
        workspace_id=ctx.workspace.id,
        source=data.source,
        metric_date=data.metric_date or date.today(),
        impressions=data.impressions,
        clicks=data.clicks,
        engagements=data.engagements,
        conversions=data.conversions,
        spend=data.spend,
    )
    db.add(metric)
    await db.flush()
    await db.commit()
    await db.refresh(metric)
    return MetricOut.model_validate(metric)


@router.get("/summary", response_model=AnalyticsSummary)
async def summary(
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsSummary:
    since = date.today() - timedelta(days=days)
    res = await db.execute(
        select(Metric)
        .where(Metric.workspace_id == ctx.workspace.id, Metric.metric_date >= since)
        .order_by(Metric.metric_date.asc())
    )
    metrics = res.scalars().all()

    totals = {"impressions": 0.0, "clicks": 0.0, "engagements": 0.0,
              "conversions": 0.0, "spend": 0.0}
    by_source: dict[str, dict[str, float]] = defaultdict(
        lambda: {"impressions": 0.0, "clicks": 0.0, "engagements": 0.0,
                 "conversions": 0.0, "spend": 0.0}
    )
    series_map: dict[str, dict[str, float]] = defaultdict(
        lambda: {"impressions": 0.0, "clicks": 0.0, "engagements": 0.0,
                 "conversions": 0.0, "spend": 0.0}
    )
    for m in metrics:
        for k in totals:
            v = float(getattr(m, k))
            totals[k] += v
            by_source[m.source][k] += v
            series_map[m.metric_date.isoformat()][k] += v

    series = [{"date": d, **vals} for d, vals in sorted(series_map.items())]

    content_count = (
        await db.execute(
            select(func.count(ContentItem.id)).where(
                ContentItem.workspace_id == ctx.workspace.id
            )
        )
    ).scalar() or 0
    published_count = (
        await db.execute(
            select(func.count(ContentItem.id)).where(
                ContentItem.workspace_id == ctx.workspace.id,
                ContentItem.status == ContentStatus.published,
            )
        )
    ).scalar() or 0
    scheduled_count = (
        await db.execute(
            select(func.count(Schedule.id)).where(
                Schedule.workspace_id == ctx.workspace.id,
                Schedule.status == ScheduleStatus.pending,
            )
        )
    ).scalar() or 0

    return AnalyticsSummary(
        totals=totals,
        by_source=dict(by_source),
        series=series,
        content_count=content_count,
        published_count=published_count,
        scheduled_count=scheduled_count,
    )


@router.post("/refresh", response_model=RefreshResult)
async def refresh_metrics(
    lookback_days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> RefreshResult:
    """Pull live engagement back from this workspace's published posts now.

    Runs the results loop on demand (the scheduler also does this every 30 min)
    so the dashboard can show fresh numbers immediately after a manual click.
    """
    from app.services.post_metrics import refresh_post_metrics

    n = await refresh_post_metrics(
        db, workspace_id=ctx.workspace.id, lookback_days=lookback_days
    )
    await db.commit()
    return RefreshResult(refreshed=n)


# ---------------------------------------------------------------------------
# Enterprise analytics endpoints (GA4 / Amplitude class)
# ---------------------------------------------------------------------------


class CohortRetentionRequest(BaseModel):
    granularity: str = "week"
    periods: int = 8
    days: int = 180


@router.get("/enterprise/cohort-retention")
async def cohort_retention_endpoint(
    granularity: str = Query(default="week", pattern="^(week|month)$"),
    periods: int = Query(default=8, ge=2, le=24),
    days: int = Query(default=180, ge=7, le=730),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    from app.services.analytics_enterprise import cohort_retention
    return await cohort_retention(db, ctx.workspace.id, granularity=granularity,
                                  periods=periods, days=days)


@router.get("/enterprise/funnel")
async def funnel_analysis_endpoint(
    days: int = Query(default=30, ge=1, le=365),
    steps: str | None = Query(default=None, description="Comma-separated event types for custom funnel"),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    from app.services.analytics_enterprise import funnel_analysis
    step_list = [s.strip() for s in steps.split(",") if s.strip()] if steps else None
    return await funnel_analysis(db, ctx.workspace.id, days=days, steps=step_list)


@router.get("/enterprise/segmentation")
async def segmentation_endpoint(
    dimension: str = Query(default="channel"),
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    from app.services.analytics_enterprise import segmentation_breakdown
    return await segmentation_breakdown(db, ctx.workspace.id,
                                         dimension=dimension, days=days)


@router.get("/enterprise/kpis")
async def derived_kpis_endpoint(
    days: int = Query(default=90, ge=7, le=730),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    from app.services.analytics_enterprise import derived_kpis
    return await derived_kpis(db, ctx.workspace.id, days=days)


@router.get("/enterprise/anomaly")
async def trend_anomaly_endpoint(
    metric: str = Query(default="events"),
    days: int = Query(default=60, ge=7, le=365),
    window: int = Query(default=7, ge=3, le=30),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    from app.services.analytics_enterprise import trend_anomaly
    return await trend_anomaly(db, ctx.workspace.id, metric=metric,
                                days=days, window=window)


@router.get("/posts", response_model=list[PostStat])
async def post_stats(
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[PostStat]:
    """Per-post engagement for published posts, newest first.

    Reads the latest ``Metric`` row (source=platform, ref_id=schedule) for each
    published schedule so the publishing UI can show real results on each card.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    schedules = (
        await db.execute(
            select(Schedule)
            .where(
                Schedule.workspace_id == ctx.workspace.id,
                Schedule.status == ScheduleStatus.published,
                Schedule.external_post_id.is_not(None),
            )
            .order_by(Schedule.scheduled_at.desc())
        )
    ).scalars().all()

    # Map schedule_id -> latest metric row.
    metric_rows = (
        await db.execute(
            select(Metric).where(
                Metric.workspace_id == ctx.workspace.id,
                Metric.ref_id.is_not(None),
            )
        )
    ).scalars().all()
    latest_by_ref: dict = {}
    for m in metric_rows:
        prev = latest_by_ref.get(m.ref_id)
        if prev is None or m.metric_date >= prev.metric_date:
            latest_by_ref[m.ref_id] = m

    out: list[PostStat] = []
    for sched in schedules:
        published_at = sched.updated_at or sched.scheduled_at
        if published_at and published_at < since:
            continue
        account = await db.get(SocialAccount, sched.social_account_id)
        platform = "unknown"
        if account is not None:
            platform = (
                account.platform.value
                if hasattr(account.platform, "value")
                else str(account.platform)
            )
        item = await db.get(ContentItem, sched.content_item_id)
        m = latest_by_ref.get(sched.id)
        extra = (m.extra or {}) if m else {}
        out.append(
            PostStat(
                schedule_id=str(sched.id),
                content_item_id=str(sched.content_item_id),
                title=item.title if item else None,
                platform=platform,
                external_post_id=sched.external_post_id,
                published_at=published_at,
                impressions=int(m.impressions) if m else 0,
                clicks=int(m.clicks) if m else 0,
                engagements=int(m.engagements) if m else 0,
                likes=int(extra.get("likes", 0) or 0),
                comments=int(extra.get("comments", 0) or 0),
                shares=int(extra.get("shares", 0) or 0),
                simulated=bool(extra.get("simulated", False)),
            )
        )
    return out
