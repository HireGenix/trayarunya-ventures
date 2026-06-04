"""AI "Next Moves" — LLM-generated marketing recommendations grounded in the
workspace's real metrics. Shares the ``/analytics`` prefix with analytics.py via
a separate router (FastAPI allows multiple routers on the same prefix)."""
from __future__ import annotations

import logging
import time
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.llm.adapters import complete_json
from app.models import Metric

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

_VALID_IMPACT = {"high", "medium", "low"}
_VALID_CATEGORY = {"content", "ads", "publishing", "audience", "budget"}

_CACHE_TTL_SECONDS = 3600
_cache: dict[tuple[str, int], tuple[float, dict[str, Any]]] = {}


class NextMove(BaseModel):
    title: str
    rationale: str
    impact: str
    category: str


class NextMovesResponse(BaseModel):
    moves: list[NextMove]
    generated: bool


def _aggregate(metrics: list[Metric]) -> dict[str, Any]:
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
    return {"totals": totals, "by_source": dict(by_source), "series": series}


def _ctr(clicks: float, impressions: float) -> float:
    return (clicks / impressions * 100.0) if impressions else 0.0


def _eng_rate(engagements: float, impressions: float) -> float:
    return (engagements / impressions * 100.0) if impressions else 0.0


def _ranked_sources(by_source: dict[str, dict[str, float]]) -> list[tuple[str, dict[str, float]]]:
    return sorted(
        by_source.items(),
        key=lambda kv: kv[1].get("impressions", 0.0),
        reverse=True,
    )


def _build_prompt(agg: dict[str, Any], days: int) -> str:
    totals = agg["totals"]
    ctr = _ctr(totals["clicks"], totals["impressions"])
    eng = _eng_rate(totals["engagements"], totals["impressions"])
    cpa = (totals["spend"] / totals["conversions"]) if totals["conversions"] else 0.0

    ranked = _ranked_sources(agg["by_source"])
    lines = [
        f"Marketing performance for the last {days} days:",
        f"- Impressions: {int(totals['impressions'])}",
        f"- Clicks: {int(totals['clicks'])} (CTR {ctr:.2f}%)",
        f"- Engagements: {int(totals['engagements'])} (engagement rate {eng:.2f}%)",
        f"- Conversions: {int(totals['conversions'])}",
        f"- Spend: ${totals['spend']:.2f} (CPA ${cpa:.2f})",
        "",
        "Per-channel breakdown (impressions, CTR, conversions, spend):",
    ]
    for src, m in ranked:
        s_ctr = _ctr(m.get("clicks", 0.0), m.get("impressions", 0.0))
        lines.append(
            f"- {src}: {int(m.get('impressions', 0))} impressions, "
            f"{s_ctr:.2f}% CTR, {int(m.get('conversions', 0))} conversions, "
            f"${m.get('spend', 0.0):.2f} spend"
        )

    series = agg["series"]
    if len(series) >= 2:
        half = len(series) // 2
        first = sum(s["impressions"] for s in series[:half]) or 0.0
        second = sum(s["impressions"] for s in series[half:]) or 0.0
        trend = "rising" if second > first else "declining" if second < first else "flat"
        lines.append("")
        lines.append(f"Impression trend over the window is {trend}.")

    lines.append("")
    lines.append(
        "Based ONLY on these numbers, return 3-5 concrete next moves. Each move "
        "must reference the actual data (strongest/weakest channel, CTR, CPA, "
        "engagement, or trend). Return STRICT JSON of the form: "
        '{"moves": [{"title": str, "rationale": str, '
        '"impact": "high|medium|low", '
        '"category": "content|ads|publishing|audience|budget"}]}'
    )
    return "\n".join(lines)


def _coerce_moves(raw: dict[str, Any]) -> list[dict[str, str]]:
    if not isinstance(raw, dict) or raw.get("_parse_error"):
        return []
    items = raw.get("moves")
    if not isinstance(items, list):
        return []
    out: list[dict[str, str]] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        title = str(it.get("title", "")).strip()
        rationale = str(it.get("rationale", "")).strip()
        if not title or not rationale:
            continue
        impact = str(it.get("impact", "medium")).strip().lower()
        if impact not in _VALID_IMPACT:
            impact = "medium"
        category = str(it.get("category", "content")).strip().lower()
        if category not in _VALID_CATEGORY:
            category = "content"
        out.append({
            "title": title,
            "rationale": rationale,
            "impact": impact,
            "category": category,
        })
        if len(out) >= 5:
            break
    return out


def _fallback_moves(agg: dict[str, Any]) -> list[dict[str, str]]:
    """Deterministic, data-derived recommendations when the LLM is unavailable."""
    totals = agg["totals"]
    ranked = _ranked_sources(agg["by_source"])
    ctr = _ctr(totals["clicks"], totals["impressions"])
    eng = _eng_rate(totals["engagements"], totals["impressions"])
    cpa = (totals["spend"] / totals["conversions"]) if totals["conversions"] else 0.0

    moves: list[dict[str, str]] = []

    if ranked:
        top_src, top_m = ranked[0]
        moves.append({
            "title": f"Double down on {top_src}",
            "rationale": (
                f"{top_src} leads with {int(top_m.get('impressions', 0))} impressions "
                f"and {int(top_m.get('conversions', 0))} conversions — allocate more "
                f"content and budget to your strongest channel."
            ),
            "impact": "high",
            "category": "content",
        })

    if len(ranked) >= 2:
        weak_src, weak_m = ranked[-1]
        weak_ctr = _ctr(weak_m.get("clicks", 0.0), weak_m.get("impressions", 0.0))
        moves.append({
            "title": f"Fix or cut {weak_src}",
            "rationale": (
                f"{weak_src} is the weakest channel ({int(weak_m.get('impressions', 0))} "
                f"impressions, {weak_ctr:.2f}% CTR). Test a new format or reallocate its "
                f"spend toward higher-performing channels."
            ),
            "impact": "medium",
            "category": "budget",
        })

    if ctr < 2.0:
        moves.append({
            "title": "Sharpen CTAs to lift CTR",
            "rationale": (
                f"Overall CTR is {ctr:.2f}%, below a healthy 2% baseline. Test stronger "
                f"hooks and offer-led CTAs to convert reach into clicks."
            ),
            "impact": "high",
            "category": "content",
        })
    else:
        moves.append({
            "title": "Scale what is converting clicks",
            "rationale": (
                f"CTR of {ctr:.2f}% is solid — replicate the winning hooks and creative "
                f"across more posts to compound the result."
            ),
            "impact": "medium",
            "category": "content",
        })

    if totals["conversions"] and cpa > 0:
        moves.append({
            "title": "Tighten CPA on paid spend",
            "rationale": (
                f"Current CPA is ${cpa:.2f} across ${totals['spend']:.0f} spend. Pause "
                f"the highest-cost segments and shift budget to channels with cheaper "
                f"conversions."
            ),
            "impact": "high",
            "category": "ads",
        })
    else:
        moves.append({
            "title": "Boost audience engagement",
            "rationale": (
                f"Engagement rate is {eng:.2f}%. Post more interactive formats "
                f"(polls, questions, carousels) to deepen audience pull before scaling spend."
            ),
            "impact": "medium",
            "category": "audience",
        })

    return moves[:5]


@router.get("/next-moves", response_model=NextMovesResponse)
async def next_moves(
    days: int = Query(default=30, ge=1, le=365),
    refresh: bool = Query(default=False),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> NextMovesResponse:
    cache_key = (str(ctx.workspace.id), days)
    now = time.monotonic()
    if not refresh:
        cached = _cache.get(cache_key)
        if cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
            return NextMovesResponse(**cached[1])

    since = date.today() - timedelta(days=days)
    res = await db.execute(
        select(Metric)
        .where(Metric.workspace_id == ctx.workspace.id, Metric.metric_date >= since)
        .order_by(Metric.metric_date.asc())
    )
    metrics = res.scalars().all()

    if not metrics:
        payload = {"moves": [], "generated": False}
        _cache[cache_key] = (now, payload)
        return NextMovesResponse(**payload)

    agg = _aggregate(metrics)

    moves: list[dict[str, str]] = []
    try:
        raw = await complete_json(
            messages=[{"role": "user", "content": _build_prompt(agg, days)}],
            system=(
                "You are a senior performance marketing strategist. You analyze "
                "campaign metrics and return only specific, data-grounded next "
                "moves as strict JSON. Never invent numbers not present in the data."
            ),
        )
        moves = _coerce_moves(raw)
    except Exception as exc:  # noqa: BLE001
        logger.warning("next-moves LLM call failed, using fallback: %s", exc)

    if not moves:
        moves = _fallback_moves(agg)

    payload = {"moves": moves, "generated": True}
    _cache[cache_key] = (now, payload)
    return NextMovesResponse(**payload)
