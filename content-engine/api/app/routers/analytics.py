"""Analytics + learning-loop routes (M6): metric ingestion and a workspace summary
that powers the dashboard charts. Metrics come from connectors (or the ingest
endpoint) and feed the learning loop."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import ContentItem, ContentStatus, Metric, Schedule, ScheduleStatus
from app.schemas import AnalyticsSummary, MetricOut


class MetricIngest(BaseModel):
    source: str = "manual"
    metric_date: date | None = None
    impressions: int = 0
    clicks: int = 0
    engagements: int = 0
    conversions: int = 0
    spend: float = 0.0


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
