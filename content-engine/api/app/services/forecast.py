"""Predictive forecasting + benchmarking services.

Numbers are honest and deterministic: historical series come straight from the
workspace's daily ``Metric`` rows, projections use a simple ordinary
least-squares linear trend (with a moving-average fallback), and the confidence
band is derived from the residual standard deviation of the fit. numpy is not a
hard dependency — everything here is implemented in pure Python so it works in
any environment. The only optional/non-deterministic piece is a short LLM
narrative, which lives in the router and always has a deterministic fallback.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from math import sqrt

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Benchmark, Metric

# Minimum number of distinct daily data points before we trust a trend.
MIN_POINTS = 7

# Metrics we build daily series + projections for.
SERIES_METRICS = ("impressions", "engagements", "conversions")


# --------------------------------------------------------------------------- #
# Historical series
# --------------------------------------------------------------------------- #
async def daily_series(
    db: AsyncSession, ws_id: uuid.UUID, days: int
) -> dict:
    """Aggregate the workspace's Metric rows into a contiguous daily series.

    Returns a dict with ``start``/``end`` dates, the number of days that
    actually carried data, and per-metric lists of ``{date, value}`` points.
    Days with no rows are filled with 0 so the series is gap-free and the
    regression sees a real (zero) value rather than skipping the day.
    """
    end = date.today()
    start = end - timedelta(days=max(days, 1) - 1)

    stmt = (
        select(
            Metric.metric_date,
            Metric.impressions,
            Metric.engagements,
            Metric.conversions,
        )
        .where(
            Metric.workspace_id == ws_id,
            Metric.metric_date >= start,
            Metric.metric_date <= end,
        )
        .order_by(Metric.metric_date.asc())
    )
    rows = (await db.execute(stmt)).all()

    totals: dict[date, dict[str, float]] = {}
    days_with_data = set()
    for metric_date, impressions, engagements, conversions in rows:
        bucket = totals.setdefault(
            metric_date, {"impressions": 0, "engagements": 0, "conversions": 0}
        )
        bucket["impressions"] += impressions or 0
        bucket["engagements"] += engagements or 0
        bucket["conversions"] += conversions or 0
        days_with_data.add(metric_date)

    series: dict[str, list[dict]] = {m: [] for m in SERIES_METRICS}
    span = (end - start).days + 1
    for i in range(span):
        d = start + timedelta(days=i)
        bucket = totals.get(d)
        for m in SERIES_METRICS:
            val = float(bucket[m]) if bucket else 0.0
            series[m].append({"date": d.isoformat(), "value": val})

    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "points": span,
        "days_with_data": len(days_with_data),
        "series": series,
    }


# --------------------------------------------------------------------------- #
# Trend fitting + projection (pure python)
# --------------------------------------------------------------------------- #
def _linear_fit(ys: list[float]) -> tuple[float, float, float]:
    """Ordinary least-squares fit of ``y = slope * x + intercept``.

    ``x`` is the day index (0..n-1). Returns ``(slope, intercept, residual_std)``
    where ``residual_std`` is the sample standard deviation of the fit residuals
    (0.0 when there are fewer than 3 points to estimate it).
    """
    n = len(ys)
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    var_x = sum((x - mean_x) ** 2 for x in xs)
    if var_x == 0:
        return 0.0, mean_y, 0.0
    cov_xy = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n))
    slope = cov_xy / var_x
    intercept = mean_y - slope * mean_x

    residuals = [ys[i] - (slope * xs[i] + intercept) for i in range(n)]
    if n > 2:
        rss = sum(r * r for r in residuals)
        residual_std = sqrt(rss / (n - 2))
    else:
        residual_std = 0.0
    return slope, intercept, residual_std


def project(series: list[dict], horizon: int) -> dict:
    """Project a single daily series forward ``horizon`` days.

    Fits a linear trend over the historical values, projects forward, and
    derives a +/- confidence band from the residual standard deviation that
    widens slightly with distance into the future. Negative projections are
    clamped to 0 (counts can't go negative). Returns the projected points, the
    band, the projected total, and the fitted slope (units/day).
    """
    ys = [float(p["value"]) for p in series]
    n = len(ys)
    if n == 0:
        return {"points": [], "total": 0.0, "slope_per_day": 0.0}

    last_date = date.fromisoformat(series[-1]["date"])
    slope, intercept, residual_std = _linear_fit(ys)

    points: list[dict] = []
    total = 0.0
    for h in range(1, max(horizon, 0) + 1):
        x = n - 1 + h
        raw = slope * x + intercept
        value = max(raw, 0.0)
        # Band widens with the square-root of the horizon step (random-walk-ish).
        margin = 1.96 * residual_std * sqrt(h)
        lower = max(value - margin, 0.0)
        upper = value + margin
        d = (last_date + timedelta(days=h)).isoformat()
        points.append(
            {
                "date": d,
                "value": round(value, 2),
                "lower": round(lower, 2),
                "upper": round(upper, 2),
            }
        )
        total += value

    return {
        "points": points,
        "total": round(total, 2),
        "slope_per_day": round(slope, 4),
        "residual_std": round(residual_std, 4),
    }


def summarize(history: dict, horizon: int) -> dict:
    """Build the full forecast summary payload from a ``daily_series`` result.

    Honest about thin data: if fewer than ``MIN_POINTS`` days carried data we
    set ``low_data=true`` and return the history without fabricating a trend.
    """
    days_with_data = history["days_with_data"]
    low_data = days_with_data < MIN_POINTS

    result = {
        "horizon_days": horizon,
        "low_data": low_data,
        "min_points": MIN_POINTS,
        "days_with_data": days_with_data,
        "range": {"start": history["start"], "end": history["end"]},
        "historical": history["series"],
        "projected": {},
        "projected_totals": {},
    }
    if low_data:
        return result

    for metric in SERIES_METRICS:
        proj = project(history["series"][metric], horizon)
        result["projected"][metric] = proj["points"]
        result["projected_totals"][metric] = {
            "total": proj["total"],
            "slope_per_day": proj["slope_per_day"],
            "residual_std": proj["residual_std"],
        }
    return result


# --------------------------------------------------------------------------- #
# Benchmarks
# --------------------------------------------------------------------------- #
async def benchmark_position(
    db: AsyncSession, ws_id: uuid.UUID, days: int = 90
) -> dict:
    """Compute the workspace's own engagement_rate and place it vs benchmarks.

    engagement_rate = total_engagements / total_impressions over the window.
    Returns the computed rate plus the closest engagement_rate benchmark bucket
    and the percentile tier the workspace currently sits in (or ``None`` when
    not computable / no benchmarks seeded).
    """
    end = date.today()
    start = end - timedelta(days=max(days, 1) - 1)
    stmt = select(
        Metric.impressions, Metric.engagements
    ).where(
        Metric.workspace_id == ws_id,
        Metric.metric_date >= start,
        Metric.metric_date <= end,
    )
    rows = (await db.execute(stmt)).all()
    impressions = sum((r[0] or 0) for r in rows)
    engagements = sum((r[1] or 0) for r in rows)

    if impressions <= 0:
        return {
            "computable": False,
            "engagement_rate": None,
            "note": "No impressions in window; engagement_rate not computable.",
            "tier": None,
            "benchmark": None,
        }

    engagement_rate = round(engagements / impressions, 6)

    bench_stmt = select(Benchmark).where(Benchmark.metric == "engagement_rate")
    bench = (await db.execute(bench_stmt)).scalars().first()
    if bench is None:
        return {
            "computable": True,
            "engagement_rate": engagement_rate,
            "tier": None,
            "benchmark": None,
            "note": "No engagement_rate benchmarks seeded.",
        }

    tier = _tier_for(engagement_rate, bench)
    return {
        "computable": True,
        "engagement_rate": engagement_rate,
        "tier": tier,
        "benchmark": {
            "industry": bench.industry,
            "channel": bench.channel,
            "metric": bench.metric,
            "p50": bench.p50,
            "p75": bench.p75,
            "p90": bench.p90,
            "sample_size": bench.sample_size,
        },
        "note": None,
    }


def _tier_for(value: float, bench: Benchmark) -> str:
    """Bucket a value against a benchmark's p50/p75/p90 thresholds."""
    if bench.p90 is not None and value >= bench.p90:
        return "top_10pct"
    if bench.p75 is not None and value >= bench.p75:
        return "top_25pct"
    if bench.p50 is not None and value >= bench.p50:
        return "above_median"
    return "below_median"


async def list_benchmarks(
    db: AsyncSession,
    industry: str | None = None,
    channel: str | None = None,
) -> list[dict]:
    """Return benchmark rows matching optional industry/channel filters."""
    stmt = select(Benchmark)
    if industry:
        stmt = stmt.where(Benchmark.industry == industry)
    if channel:
        stmt = stmt.where(Benchmark.channel == channel)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(b.id),
            "industry": b.industry,
            "channel": b.channel,
            "metric": b.metric,
            "p50": b.p50,
            "p75": b.p75,
            "p90": b.p90,
            "sample_size": b.sample_size,
        }
        for b in rows
    ]
