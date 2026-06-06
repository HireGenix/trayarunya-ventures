"""Predictive forecasting + benchmarks routes.

GET  /forecast/summary     — historical daily series + forward projection.
GET  /forecast/benchmarks  — cross-account benchmark rows + the workspace's
                             own position vs engagement_rate percentiles.
POST /forecast/narrative   — optional short LLM narrative over a summary, with a
                             deterministic fallback when the LLM is unavailable.

Numbers are always real/deterministic (see ``app.services.forecast``); only the
narrative prose is LLM-generated, and it degrades gracefully.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.services import forecast as svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forecast", tags=["forecast"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class SeriesPoint(BaseModel):
    date: str
    value: float


class ProjectedPoint(BaseModel):
    date: str
    value: float
    lower: float
    upper: float


class ProjectedTotal(BaseModel):
    total: float
    slope_per_day: float
    residual_std: float


class ForecastRange(BaseModel):
    start: str
    end: str


class ForecastSummary(BaseModel):
    horizon_days: int
    low_data: bool
    min_points: int
    days_with_data: int
    range: ForecastRange
    historical: dict[str, list[SeriesPoint]]
    projected: dict[str, list[ProjectedPoint]]
    projected_totals: dict[str, ProjectedTotal]


class AccuracyInfo(BaseModel):
    mape: float | None = None
    mae: float | None = None
    rmse: float | None = None
    holdout: int | None = None
    model: str | None = None
    insufficient_history: bool = True


class SeasonalityInfo(BaseModel):
    detected_period: int | None = None
    period_used: int | None = None
    mode: str | None = None
    seasonal: bool = False


class AdvancedForecastSummary(BaseModel):
    horizon_days: int
    low_data: bool
    min_points: int
    days_with_data: int
    range: ForecastRange
    historical: dict[str, list[SeriesPoint]]
    projected: dict[str, list[ProjectedPoint]]
    projected_totals: dict[str, ProjectedTotal]
    model_used: dict[str, str] = {}
    accuracy: dict[str, AccuracyInfo] = {}
    seasonality: dict[str, SeasonalityInfo] = {}


class ModelComparison(BaseModel):
    holt_winters: dict
    linear: dict
    recommendation: str


class DriverForecast(BaseModel):
    metric: str
    driver: str
    points: list[ProjectedPoint]
    total: float


class BenchmarkRow(BaseModel):
    id: str
    industry: str | None
    channel: str | None
    metric: str
    p50: float | None
    p75: float | None
    p90: float | None
    sample_size: int


class BenchmarkPosition(BaseModel):
    computable: bool
    engagement_rate: float | None
    tier: str | None
    benchmark: dict | None
    note: str | None


class BenchmarksResponse(BaseModel):
    items: list[BenchmarkRow]
    note: str | None
    position: BenchmarkPosition


class NarrativeRequest(BaseModel):
    summary: dict = Field(..., description="A /forecast/summary payload (or subset).")
    metric: str = Field("conversions", description="Which metric to narrate.")


class NarrativeResponse(BaseModel):
    narrative: str
    source: str  # "llm" | "fallback"


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@router.get("/summary", response_model=ForecastSummary)
async def get_summary(
    horizon_days: int = Query(30, ge=1, le=365),
    lookback_days: int = Query(90, ge=14, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ForecastSummary:
    history = await svc.daily_series(db, ctx.workspace.id, lookback_days)
    summary = svc.summarize(history, horizon_days)
    return ForecastSummary(**summary)


@router.get("/summary/advanced", response_model=AdvancedForecastSummary)
async def get_advanced_summary(
    horizon_days: int = Query(30, ge=1, le=365),
    lookback_days: int = Query(90, ge=14, le=365),
    model: str = Query("auto", pattern="^(auto|linear|holt_winters)$"),
    period: int | None = Query(None, ge=2, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AdvancedForecastSummary:
    """Advanced forecast with model selection, accuracy metrics, and seasonality."""
    history = await svc.daily_series(db, ctx.workspace.id, lookback_days)
    summary = svc.summarize_advanced(history, horizon_days, model=model, period=period)
    return AdvancedForecastSummary(**summary)


@router.get("/compare")
async def compare_models(
    lookback_days: int = Query(90, ge=14, le=365),
    horizon_days: int = Query(30, ge=1, le=365),
    metric: str = Query("conversions"),
    period: int | None = Query(None, ge=2, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ModelComparison:
    """Compare Linear vs Holt-Winters accuracy via backtesting."""
    history = await svc.daily_series(db, ctx.workspace.id, lookback_days)
    series = history["series"].get(metric, [])
    if not series:
        return ModelComparison(
            holt_winters={"insufficient_history": True},
            linear={"insufficient_history": True},
            recommendation="insufficient_data",
        )
    comparison = svc.compare_models(series, horizon_days, period)
    return ModelComparison(**comparison)


@router.get("/driver")
async def get_driver_forecast(
    horizon_days: int = Query(30, ge=1, le=365),
    lookback_days: int = Query(90, ge=14, le=365),
    target: str = Query("conversions"),
    driver: str = Query("impressions"),
    period: int | None = Query(None, ge=2, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DriverForecast | dict:
    """Driver-adjusted forecast — scale target by correlated driver series."""
    history = await svc.daily_series(db, ctx.workspace.id, lookback_days)
    result = svc.driver_adjusted_forecast(
        history, horizon_days,
        target_metric=target, driver_metric=driver, period=period,
    )
    if result is None:
        return {"metric": target, "driver": driver, "points": [], "total": 0.0,
                "note": "Not enough correlated data for driver adjustment."}
    return DriverForecast(**result)


@router.get("/benchmarks", response_model=BenchmarksResponse)
async def get_benchmarks(
    industry: str | None = Query(None),
    channel: str | None = Query(None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> BenchmarksResponse:
    items = await svc.list_benchmarks(db, industry=industry, channel=channel)
    position = await svc.benchmark_position(db, ctx.workspace.id)
    note = None if items else "No benchmarks seeded for the given filters."
    return BenchmarksResponse(
        items=[BenchmarkRow(**i) for i in items],
        note=note,
        position=BenchmarkPosition(**position),
    )


@router.post("/narrative", response_model=NarrativeResponse)
async def post_narrative(
    body: NarrativeRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> NarrativeResponse:
    fallback = _fallback_narrative(body.summary, body.metric)

    if body.summary.get("low_data"):
        return NarrativeResponse(narrative=fallback, source="fallback")

    try:
        from app.llm.adapters import complete_json

        system = (
            "You are a marketing analytics co-pilot. Given a numeric forecast "
            "summary, write 2-3 concise sentences: the trajectory, the projected "
            "milestone (value by date), and one concrete action to accelerate. "
            "Use only the numbers provided; never invent figures. "
            'Respond as JSON: {"narrative": "..."}.'
        )
        user = (
            f"Metric: {body.metric}\n"
            f"Summary JSON: {body.summary}"
        )
        out = await complete_json(
            [{"role": "user", "content": user}], system=system
        )
        text = (out or {}).get("narrative")
        if isinstance(text, str) and text.strip():
            return NarrativeResponse(narrative=text.strip(), source="llm")
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("forecast narrative LLM failed: %s", exc)

    return NarrativeResponse(narrative=fallback, source="fallback")


# --------------------------------------------------------------------------- #
# Deterministic fallback narrative
# --------------------------------------------------------------------------- #
def _fallback_narrative(summary: dict, metric: str) -> str:
    if summary.get("low_data"):
        need = summary.get("min_points", svc.MIN_POINTS)
        have = summary.get("days_with_data", 0)
        return (
            f"Not enough history yet to forecast {metric} reliably "
            f"({have} of {need} days with data). Keep publishing and "
            "connecting sources, then re-check in a week or two."
        )

    totals = (summary.get("projected_totals") or {}).get(metric) or {}
    points = (summary.get("projected") or {}).get(metric) or []
    horizon = summary.get("horizon_days", len(points))
    total = totals.get("total")
    slope = totals.get("slope_per_day", 0.0)

    if not points or total is None:
        return (
            f"No projection available for {metric} with the current data. "
            "Add more daily metrics to unlock a trajectory."
        )

    last = points[-1]
    direction = "growing" if slope > 0 else ("declining" if slope < 0 else "flat")
    action = (
        "double down on your best-performing channels to compound the gains"
        if slope > 0
        else (
            "refresh creative and reallocate spend to reverse the slide"
            if slope < 0
            else "test a new hook or channel to break the plateau"
        )
    )
    return (
        f"At the current {direction} trajectory, {metric} is projected to reach "
        f"about {last['value']:,.0f} on {last['date']}, totalling roughly "
        f"{total:,.0f} over the next {horizon} days "
        f"(~{slope:+.1f}/day). To accelerate, {action}."
    )
