"""Experiment evaluation logic for the Experiment Hub.

An experiment defines a hypothesis and a set of variants. Each variant may
reference a published ``ContentItem`` via ``content_item_id``. Real engagement
for that content is pulled from ``Metric`` rows (the same table the analytics
loop fills). Metric rows are keyed by ``(workspace_id, source, ref_id,
metric_date)`` where ``ref_id`` is a *schedule* id for published posts. We map
each variant's content item to its schedule ids, then aggregate the matching
metric rows.

The router stays thin — all the number-crunching (and the deliberate refusal to
fabricate numbers when no real data exists) lives here.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ContentItem, Metric, Schedule

# Metrics we know how to compute from raw Metric rows.
SUPPORTED_METRICS = {
    "engagement_rate",
    "ctr",
    "conversions",
    "impressions",
    "clicks",
    "engagements",
}


def _coerce_uuid(value: Any) -> uuid.UUID | None:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None


def _compute_success_value(totals: dict[str, float], success_metric: str) -> float:
    """Derive the chosen success metric from aggregated raw counters."""
    impressions = totals.get("impressions", 0.0)
    clicks = totals.get("clicks", 0.0)
    engagements = totals.get("engagements", 0.0)
    conversions = totals.get("conversions", 0.0)

    if success_metric == "engagement_rate":
        return (engagements / impressions * 100.0) if impressions else 0.0
    if success_metric == "ctr":
        return (clicks / impressions * 100.0) if impressions else 0.0
    if success_metric == "conversions":
        return conversions
    if success_metric == "impressions":
        return impressions
    if success_metric == "clicks":
        return clicks
    if success_metric == "engagements":
        return engagements
    # Unknown metric → fall back to engagement_rate.
    return (engagements / impressions * 100.0) if impressions else 0.0


async def _schedule_ref_ids(
    db: AsyncSession, workspace_id: uuid.UUID, content_item_id: uuid.UUID
) -> list[uuid.UUID]:
    """Return all schedule ids (metric ref_ids) for a content item."""
    res = await db.execute(
        select(Schedule.id).where(
            Schedule.workspace_id == workspace_id,
            Schedule.content_item_id == content_item_id,
        )
    )
    return [row[0] for row in res.all()]


async def compute_variant_metrics(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    variants: list[dict[str, Any]],
    success_metric: str,
) -> list[dict[str, Any]]:
    """Aggregate real engagement per variant from ``Metric`` rows.

    Returns one dict per variant with raw counters, the computed success value,
    and a ``has_data`` flag. Never fabricates numbers — variants with no metrics
    report zeros and ``has_data=False``.
    """
    metric = success_metric if success_metric in SUPPORTED_METRICS else "engagement_rate"
    out: list[dict[str, Any]] = []

    for variant in variants or []:
        if not isinstance(variant, dict):
            continue
        key = str(variant.get("key") or "").strip()
        if not key:
            continue
        label = str(variant.get("label") or key).strip()
        content_item_id = _coerce_uuid(variant.get("content_item_id"))

        totals = {
            "impressions": 0.0,
            "clicks": 0.0,
            "engagements": 0.0,
            "conversions": 0.0,
            "spend": 0.0,
        }
        row_count = 0

        if content_item_id is not None:
            # Candidate ref_ids: the schedules for this content item, plus the
            # content item id itself (some sources key metrics directly by it).
            ref_ids = await _schedule_ref_ids(db, workspace_id, content_item_id)
            ref_ids.append(content_item_id)
            res = await db.execute(
                select(Metric).where(
                    Metric.workspace_id == workspace_id,
                    Metric.ref_id.in_(ref_ids),
                )
            )
            rows = res.scalars().all()
            row_count = len(rows)
            for m in rows:
                totals["impressions"] += float(m.impressions or 0)
                totals["clicks"] += float(m.clicks or 0)
                totals["engagements"] += float(m.engagements or 0)
                totals["conversions"] += float(m.conversions or 0)
                totals["spend"] += float(m.spend or 0.0)

        value = _compute_success_value(totals, metric)
        out.append(
            {
                "key": key,
                "label": label,
                "content_item_id": str(content_item_id) if content_item_id else None,
                "metrics": {k: round(v, 4) for k, v in totals.items()},
                "metric_rows": row_count,
                "success_metric": metric,
                "value": round(value, 4),
                "has_data": row_count > 0 and totals["impressions"] > 0,
            }
        )

    return out


def pick_winner(
    variant_results: list[dict[str, Any]], success_metric: str
) -> dict[str, Any]:
    """Pick the winning variant (highest success value) and compute lift.

    Returns a result payload. If no variant has real data, returns an
    ``insufficient_data`` result without inventing numbers.
    """
    metric = success_metric if success_metric in SUPPORTED_METRICS else "engagement_rate"
    with_data = [v for v in variant_results if v.get("has_data")]

    if not with_data:
        return {
            "status": "insufficient_data",
            "success_metric": metric,
            "winner_key": None,
            "variants": variant_results,
            "message": (
                "No real engagement metrics found for the referenced content yet. "
                "Publish the variants and let analytics collect data, then evaluate "
                "again."
            ),
        }

    winner = max(with_data, key=lambda v: v.get("value", 0.0))
    winner_value = float(winner.get("value", 0.0))

    # Compute lift of the winner vs every other variant that has data.
    lifts: list[dict[str, Any]] = []
    for v in with_data:
        if v["key"] == winner["key"]:
            continue
        other_value = float(v.get("value", 0.0))
        if other_value > 0:
            lift_pct = (winner_value - other_value) / other_value * 100.0
        else:
            lift_pct = None
        lifts.append(
            {
                "key": v["key"],
                "label": v.get("label"),
                "value": round(other_value, 4),
                "lift_pct": round(lift_pct, 2) if lift_pct is not None else None,
            }
        )

    return {
        "status": "completed",
        "success_metric": metric,
        "winner_key": winner["key"],
        "winner_label": winner.get("label"),
        "winner_value": round(winner_value, 4),
        "variants": variant_results,
        "lift": lifts,
    }


def summarize_learning(
    *,
    experiment_name: str,
    hypothesis: str | None,
    result: dict[str, Any],
) -> dict[str, str]:
    """Build a concise, data-grounded learning + recommendation from a result.

    Deterministic (no LLM required). Returns ``{title, detail, recommendation}``.
    """
    metric = result.get("success_metric", "engagement_rate")
    winner_key = result.get("winner_key")
    winner_label = result.get("winner_label") or winner_key
    winner_value = result.get("winner_value")

    best_lift: float | None = None
    for entry in result.get("lift", []) or []:
        lp = entry.get("lift_pct")
        if lp is not None and (best_lift is None or lp > best_lift):
            best_lift = lp

    title = f"'{winner_label}' won on {metric}"
    detail_parts = [
        f"Experiment '{experiment_name}' completed.",
        f"Winner: {winner_label} ({metric} = {winner_value}).",
    ]
    if hypothesis:
        detail_parts.insert(1, f"Hypothesis: {hypothesis}")
    if best_lift is not None:
        detail_parts.append(f"Best lift over a rival variant: {best_lift:.1f}%.")
    detail = " ".join(detail_parts)

    recommendation = (
        f"Apply the '{winner_label}' approach to future content; it produced the "
        f"strongest {metric}."
    )
    if best_lift is not None and best_lift > 0:
        recommendation += f" It outperformed alternatives by up to {best_lift:.1f}%."

    return {"title": title, "detail": detail, "recommendation": recommendation}
