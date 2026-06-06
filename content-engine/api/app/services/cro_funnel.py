"""CRO funnel + scorecard computation.

All numbers are derived from real :class:`ConversionEvent` rows. We count
*unique visitors* (``anon_id``) per funnel stage using a monotonic model: a
visitor's furthest stage is the highest stage any of their events maps to, and a
stage's reach is everyone whose furthest stage is at least that stage. This makes
the funnel strictly non-increasing even when raw events arrive out of order or
partially (e.g. a purchase with no recorded page_view).

The scorecard rolls this up into a single source of truth: overall conversion
rate, the biggest leak (largest drop-off), an estimate of revenue left on the
table, a 0-100 CRO score, and ranked opportunities. ``low_data`` is honoured so
we never over-claim on thin samples.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversion import FUNNEL_STAGES, VALUE_EVENTS, ConversionEvent

# Below this many visitors, signals are flagged low-confidence.
MIN_VISITORS_FOR_SIGNAL = 100

# event_type -> stage index (highest stage the event satisfies).
_EVENT_TO_RANK: dict[str, int] = {}
for _idx, (_key, _label, _types) in enumerate(FUNNEL_STAGES):
    for _t in _types:
        _EVENT_TO_RANK[_t] = _idx


def _window_start(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=max(1, days))


async def _stage_counts(
    db: AsyncSession, workspace_id, start: datetime, end: datetime | None = None
) -> tuple[list[int], float, int]:
    """Return (cumulative stage visitor counts, avg order value, value_events).

    ``stage counts`` are monotonic non-increasing across the funnel.
    """
    stmt = select(ConversionEvent.anon_id, ConversionEvent.event_type).where(
        ConversionEvent.workspace_id == workspace_id,
        ConversionEvent.occurred_at >= start,
    )
    if end is not None:
        stmt = stmt.where(ConversionEvent.occurred_at < end)
    res = await db.execute(stmt)

    furthest: dict[str, int] = {}
    for anon_id, event_type in res.all():
        rank = _EVENT_TO_RANK.get(event_type)
        if rank is None:
            continue
        if anon_id not in furthest or rank > furthest[anon_id]:
            furthest[anon_id] = rank

    n_stages = len(FUNNEL_STAGES)
    reached = [0] * n_stages
    for rank in furthest.values():
        # Visitor counts toward their furthest stage and every prior stage.
        for i in range(rank + 1):
            reached[i] += 1

    # Average order value over value-bearing events in the window.
    vstmt = select(
        func.coalesce(func.avg(ConversionEvent.value), 0.0),
        func.count(),
    ).where(
        ConversionEvent.workspace_id == workspace_id,
        ConversionEvent.occurred_at >= start,
        ConversionEvent.event_type.in_(VALUE_EVENTS),
        ConversionEvent.value > 0,
    )
    if end is not None:
        vstmt = vstmt.where(ConversionEvent.occurred_at < end)
    avg_value, value_events = (await db.execute(vstmt)).one()
    return reached, float(avg_value or 0.0), int(value_events or 0)


def _build_stages(reached: list[int]) -> list[dict]:
    stages: list[dict] = []
    top = reached[0] if reached else 0
    for i, (key, label, _types) in enumerate(FUNNEL_STAGES):
        count = reached[i]
        prev = reached[i - 1] if i > 0 else count
        step_cvr = (count / prev * 100.0) if prev > 0 else 0.0
        drop = prev - count
        drop_pct = (drop / prev * 100.0) if prev > 0 else 0.0
        overall_pct = (count / top * 100.0) if top > 0 else 0.0
        stages.append(
            {
                "key": key,
                "label": label,
                "count": count,
                "step_cvr": round(step_cvr, 2),
                "drop": drop,
                "drop_pct": round(drop_pct, 2),
                "overall_pct": round(overall_pct, 2),
            }
        )
    return stages


def _biggest_leak(stages: list[dict]) -> dict | None:
    """Largest absolute visitor drop between consecutive stages."""
    leak: dict | None = None
    for i in range(1, len(stages)):
        s = stages[i]
        prev = stages[i - 1]
        if leak is None or s["drop"] > leak["drop"]:
            leak = {
                "from": prev["label"],
                "to": s["label"],
                "from_key": prev["key"],
                "to_key": s["key"],
                "drop": s["drop"],
                "drop_pct": s["drop_pct"],
                "retained_pct": round(100.0 - s["drop_pct"], 2),
            }
    return leak


async def compute_funnel(db: AsyncSession, workspace_id, days: int = 30) -> dict:
    start = _window_start(days)
    reached, avg_value, value_events = await _stage_counts(db, workspace_id, start)
    stages = _build_stages(reached)
    visitors = reached[0] if reached else 0
    converted = reached[-1] if reached else 0
    overall_cvr = (converted / visitors * 100.0) if visitors > 0 else 0.0
    return {
        "days": days,
        "low_data": visitors < MIN_VISITORS_FOR_SIGNAL,
        "min_visitors_for_signal": MIN_VISITORS_FOR_SIGNAL,
        "visitors": visitors,
        "converted": converted,
        "overall_cvr": round(overall_cvr, 2),
        "avg_order_value": round(avg_value, 2),
        "value_events": value_events,
        "stages": stages,
        "biggest_leak": _biggest_leak(stages),
    }


def _cro_score(overall_cvr: float, leak: dict | None, visitors: int) -> int:
    """Composite 0-100 CRO score.

    Blends absolute conversion strength (vs a 5% reference) with how balanced the
    funnel is (worst single drop-off). Thin data is pulled toward the middle so we
    neither over-praise nor over-alarm.
    """
    if visitors <= 0:
        return 0
    cvr_component = min(overall_cvr / 5.0, 1.0) * 60.0  # up to 60 pts
    worst_drop = leak["drop_pct"] if leak else 0.0
    balance_component = max(0.0, 1.0 - worst_drop / 100.0) * 40.0  # up to 40 pts
    score = cvr_component + balance_component
    if visitors < MIN_VISITORS_FOR_SIGNAL:
        score = 50.0 + (score - 50.0) * 0.5  # damp toward 50 on low data
    return int(round(max(0.0, min(100.0, score))))


def _opportunities(stages: list[dict], leak: dict | None, aov: float) -> list[dict]:
    ops: list[dict] = []
    if leak and leak["drop"] > 0:
        ops.append(
            {
                "priority": "high",
                "title": f"Plug the {leak['from']} → {leak['to']} leak",
                "detail": (
                    f"{leak['drop']} visitors ({leak['drop_pct']}%) drop here — your "
                    f"biggest single loss. Test the {leak['to'].lower()} step copy, CTA "
                    f"and friction."
                ),
            }
        )
    # Weakest step CVR (excluding the top stage which has no prior).
    weak = None
    for s in stages[1:]:
        if weak is None or s["step_cvr"] < weak["step_cvr"]:
            weak = s
    if weak and (not leak or weak["key"] != leak["to_key"]) and weak["step_cvr"] < 50:
        ops.append(
            {
                "priority": "medium",
                "title": f"Improve {weak['label']} step ({weak['step_cvr']}% pass-through)",
                "detail": f"Only {weak['step_cvr']}% advance to {weak['label']}. A/B test this stage.",
            }
        )
    if aov <= 0:
        ops.append(
            {
                "priority": "medium",
                "title": "Capture purchase value",
                "detail": "No revenue value on conversion events — send order value with "
                "purchase events to unlock ROI and revenue-left-on-table.",
            }
        )
    return ops[:3]


async def compute_scorecard(db: AsyncSession, workspace_id, days: int = 30) -> dict:
    funnel = await compute_funnel(db, workspace_id, days)
    stages = funnel["stages"]
    leak = funnel["biggest_leak"]
    visitors = funnel["visitors"]
    aov = funnel["avg_order_value"]
    overall_cvr = funnel["overall_cvr"]

    # Trend: this window vs the immediately preceding window of equal length.
    prev_start = _window_start(days * 2)
    cur_start = _window_start(days)
    prev_reached, _pv, _ve = await _stage_counts(db, workspace_id, prev_start, cur_start)
    prev_visitors = prev_reached[0] if prev_reached else 0
    prev_converted = prev_reached[-1] if prev_reached else 0
    prev_cvr = (prev_converted / prev_visitors * 100.0) if prev_visitors > 0 else 0.0
    cvr_delta = round(overall_cvr - prev_cvr, 2)

    # Revenue left on the table: recoverable visitors at the biggest leak, valued
    # at AOV and the end-to-end conversion rate, discounted to be conservative.
    revenue_left = 0.0
    if leak and aov > 0 and visitors > 0:
        recoverable = leak["drop"] * 0.30  # assume 30% of the drop is winnable
        end_cvr = overall_cvr / 100.0
        revenue_left = recoverable * end_cvr * aov

    score = _cro_score(overall_cvr, leak, visitors)
    return {
        "days": days,
        "low_data": funnel["low_data"],
        "cro_score": score,
        "overall_cvr": overall_cvr,
        "cvr_delta": cvr_delta,
        "prev_cvr": round(prev_cvr, 2),
        "visitors": visitors,
        "converted": funnel["converted"],
        "avg_order_value": aov,
        "revenue_left_on_table": round(revenue_left, 2),
        "currency": "USD",
        "biggest_leak": leak,
        "stages": stages,
        "opportunities": _opportunities(stages, leak, aov),
    }
