"""Creative Intelligence routes.

Surface what *real* published content is winning on and turn it into action.
The router stays thin: all joins, attribute extraction and aggregation live in
``app.services.creative_intel``. Endpoints are workspace-scoped and only ever
report numbers derived from real ``Metric`` rows (honouring ``low_data``).
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.services.creative_intel import (
    aggregate,
    build_recommendations,
    load_post_performance,
)

router = APIRouter(prefix="/creative-intel", tags=["creative-intel"])


class CreativeSummary(BaseModel):
    low_data: bool
    post_count: int
    min_posts_for_signal: int
    generated_at: str | None = None
    overall: dict[str, Any]
    top_posts: list[dict[str, Any]]
    breakdowns: dict[str, Any]
    winning_patterns: list[dict[str, Any]]
    fatigue_signals: list[dict[str, Any]]


class Recommendation(BaseModel):
    action: str
    attribute: str
    value: Any | None = None
    rationale: str
    confidence: str
    lift_pct: float | None = None
    change_pct: float | None = None
    avg_engagement_rate: float | None = None
    sample_size: int | None = None


class RecommendationsResponse(BaseModel):
    low_data: bool
    post_count: int
    recommendations: list[Recommendation]


def _serialize_post(r: dict) -> dict:
    pub = r.get("published_at")
    return {
        "schedule_id": r["schedule_id"],
        "content_item_id": r["content_item_id"],
        "title": r["title"],
        "platform": r["platform"],
        "external_post_id": r["external_post_id"],
        "published_at": pub.isoformat() if hasattr(pub, "isoformat") else None,
        "impressions": r["impressions"],
        "clicks": r["clicks"],
        "engagements": r["engagements"],
        "engagement_rate": r["engagement_rate"],
        "ctr": r["ctr"],
        "simulated": r["simulated"],
        "attributes": r["attributes"],
    }


@router.get("/summary", response_model=CreativeSummary)
async def summary(
    top: int = Query(default=5, ge=1, le=25),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CreativeSummary:
    """Top posts, attribute breakdowns and detected winning/fatigue signals."""
    perf = await load_post_performance(db, ctx.workspace.id)
    agg = aggregate(perf)
    return CreativeSummary(
        low_data=agg["low_data"],
        post_count=agg["post_count"],
        min_posts_for_signal=agg["min_posts_for_signal"],
        generated_at=agg.get("generated_at"),
        overall=agg["overall"],
        top_posts=[_serialize_post(r) for r in perf[:top]],
        breakdowns=agg["breakdowns"],
        winning_patterns=agg["winning_patterns"],
        fatigue_signals=agg["fatigue_signals"],
    )


@router.get("/recommendations", response_model=RecommendationsResponse)
async def recommendations(
    enrich: bool = Query(
        default=False,
        description="Optionally enrich rationale phrasing via the LLM; numbers stay real.",
    ),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> RecommendationsResponse:
    """Prioritized actions (double_down / stop / test) from the aggregates."""
    perf = await load_post_performance(db, ctx.workspace.id)
    agg = aggregate(perf)
    recs = build_recommendations(agg)

    if enrich and not agg["low_data"] and recs:
        recs = await _enrich_rationales(recs)

    return RecommendationsResponse(
        low_data=agg["low_data"],
        post_count=agg["post_count"],
        recommendations=[Recommendation(**r) for r in recs],
    )


async def _enrich_rationales(recs: list[dict]) -> list[dict]:
    """Defensively rephrase rationales with the LLM without touching numbers."""
    try:
        from app.llm.adapters import complete_json
    except Exception:  # noqa: BLE001 — LLM is optional
        return recs

    payload = [
        {"index": i, "action": r["action"], "attribute": r["attribute"],
         "value": r.get("value"), "rationale": r["rationale"]}
        for i, r in enumerate(recs)
    ]
    system = (
        "You are a marketing analyst. Rewrite each rationale to be punchy and "
        "actionable. Never invent or change any numbers, percentages or facts. "
        'Respond with JSON: {"items": [{"index": int, "rationale": str}]}.'
    )
    try:
        out = await complete_json(
            [{"role": "user", "content": str(payload)}], system=system
        )
    except Exception:  # noqa: BLE001
        return recs

    if not isinstance(out, dict) or out.get("_parse_error"):
        return recs
    items = out.get("items")
    if not isinstance(items, list):
        return recs
    for item in items:
        if not isinstance(item, dict):
            continue
        idx = item.get("index")
        text = item.get("rationale")
        if isinstance(idx, int) and 0 <= idx < len(recs) and isinstance(text, str):
            if text.strip():
                recs[idx]["rationale"] = text.strip()
    return recs
