"""CRO segmentation — where conversion rate really differs (Phase 4).

Breaks the real conversion funnel down by dimension (device, traffic source,
campaign) so the agent can spot that, say, mobile converts at a third of desktop.
Every number is computed from :class:`ConversionEvent` rows; segments below a
visitor floor are flagged ``low_data`` rather than dropped or faked.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversion import FUNNEL_STAGES, ConversionEvent

_CONVERT_EVENTS: frozenset[str] = frozenset(FUNNEL_STAGES[-1][2])
_VISIT_EVENTS: frozenset[str] = frozenset(FUNNEL_STAGES[0][2])
MIN_SEGMENT_VISITORS = 20

# Dimension -> ConversionEvent column.
_DIMENSIONS: dict[str, Any] = {
    "device": ConversionEvent.device,
    "source": ConversionEvent.utm_source,
    "campaign": ConversionEvent.campaign,
}


def _window_start(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


async def compute_segments(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    dimension: str = "device",
    days: int = 30,
) -> dict[str, Any]:
    """Conversion rate per segment value for one dimension.

    A visitor counts toward a segment if any of their events carry that value; a
    *converter* if they reached the convert stage. Returns segments sorted by
    visitors, plus the best/worst segments with enough data.
    """
    column = _DIMENSIONS.get(dimension)
    if column is None:
        dimension = "device"
        column = _DIMENSIONS["device"]

    start = _window_start(days)
    res = await db.execute(
        select(
            column,
            ConversionEvent.anon_id,
            ConversionEvent.event_type,
            ConversionEvent.value,
        ).where(
            ConversionEvent.workspace_id == workspace_id,
            ConversionEvent.occurred_at >= start,
        )
    )
    rows = res.all()

    # value -> {visitors:set, converters:set, revenue:float}
    agg: dict[str, dict[str, Any]] = {}
    for dim_value, anon_id, event_type, value in rows:
        if not anon_id:
            continue
        key = (str(dim_value).strip() if dim_value else "") or "unknown"
        bucket = agg.setdefault(
            key, {"visitors": set(), "converters": set(), "revenue": 0.0}
        )
        bucket["visitors"].add(anon_id)
        if event_type in _CONVERT_EVENTS:
            bucket["converters"].add(anon_id)
            bucket["revenue"] += float(value or 0.0)

    segments: list[dict[str, Any]] = []
    for key, bucket in agg.items():
        visitors = len(bucket["visitors"])
        converters = len(bucket["converters"])
        cvr = (converters / visitors * 100.0) if visitors > 0 else 0.0
        segments.append(
            {
                "segment": key,
                "visitors": visitors,
                "conversions": converters,
                "conversion_rate": round(cvr, 2),
                "revenue": round(bucket["revenue"], 2),
                "low_data": visitors < MIN_SEGMENT_VISITORS,
            }
        )

    segments.sort(key=lambda s: s["visitors"], reverse=True)
    qualified = [s for s in segments if not s["low_data"]]
    best = max(qualified, key=lambda s: s["conversion_rate"], default=None)
    worst = min(qualified, key=lambda s: s["conversion_rate"], default=None)

    insight = None
    if best and worst and best["segment"] != worst["segment"] and worst["conversion_rate"] > 0:
        gap = best["conversion_rate"] - worst["conversion_rate"]
        rel = gap / worst["conversion_rate"] * 100.0
        insight = (
            f"'{best['segment']}' converts at {best['conversion_rate']}% vs "
            f"'{worst['segment']}' at {worst['conversion_rate']}% — a {rel:.0f}% gap. "
            f"Personalize the experience for '{worst['segment']}' to close it."
        )

    return {
        "dimension": dimension,
        "dimensions": list(_DIMENSIONS.keys()),
        "days": days,
        "min_segment_visitors": MIN_SEGMENT_VISITORS,
        "segments": segments,
        "best_segment": best,
        "worst_segment": worst,
        "insight": insight,
    }
