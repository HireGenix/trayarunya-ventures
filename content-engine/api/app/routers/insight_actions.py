"""Insights → Action: tag/status updates, convert an insight into a draft
content item, and push an insight into a strategy as an input idea.

This lives in a dedicated router (separate from ``insights.py``) and shares the
``/insights`` prefix. It only uses distinct sub-paths (``/{id}`` PATCH,
``/{id}/to-content``, ``/{id}/to-strategy``, ``/bulk-tag``) so it never collides
with the existing GET "" / DELETE "/{id}" routes.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    ContentItem,
    ContentStatus,
    ContentType,
    Insight,
    Strategy,
)

router = APIRouter(prefix="/insights", tags=["insights"])


# ───────────────────────── Pydantic models (inline) ─────────────────────────
class InsightUpdateIn(BaseModel):
    tags: list[str] | None = None
    status: str | None = None


class InsightActionOut(BaseModel):
    id: uuid.UUID
    kind: str
    text: str
    intent: str | None = None
    score: float
    tags: list[str] | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ToStrategyIn(BaseModel):
    strategy_id: str


class BulkTagIn(BaseModel):
    ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


# ─────────────────────────────── helpers ────────────────────────────────────
def _parse_uuid(value: str, what: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid {what}")


async def _get_owned_insight(
    db: AsyncSession, insight_id: uuid.UUID, workspace_id: uuid.UUID
) -> Insight:
    insight = await db.get(Insight, insight_id)
    if not insight or insight.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Insight not found")
    return insight


# ─────────────────────────────── routes ─────────────────────────────────────
@router.post("/bulk-tag")
async def bulk_tag_insights(
    body: BulkTagIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """Apply (merge) a set of tags onto many insights at once."""
    if not body.ids or not body.tags:
        return {"updated": 0}
    ids = [_parse_uuid(i, "insight id") for i in body.ids]
    res = await db.execute(
        select(Insight).where(
            Insight.workspace_id == ctx.workspace.id, Insight.id.in_(ids)
        )
    )
    rows = res.scalars().all()
    updated = 0
    for insight in rows:
        existing = list(insight.tags or [])
        merged = existing + [t for t in body.tags if t not in existing]
        if merged != existing:
            insight.tags = merged
            if insight.status == "new":
                insight.status = "tagged"
            updated += 1
    if updated:
        await db.commit()
    return {"updated": updated}


@router.patch("/{insight_id}", response_model=InsightActionOut)
async def update_insight(
    insight_id: uuid.UUID,
    body: InsightUpdateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> InsightActionOut:
    """Update an insight's tags and/or status."""
    insight = await _get_owned_insight(db, insight_id, ctx.workspace.id)
    if body.tags is not None:
        insight.tags = body.tags
        if body.status is None and insight.status == "new" and body.tags:
            insight.status = "tagged"
    if body.status is not None:
        insight.status = body.status
    await db.commit()
    await db.refresh(insight)
    return InsightActionOut.model_validate(insight)


@router.post("/{insight_id}/to-content")
async def insight_to_content(
    insight_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Create a lightweight DRAFT content item seeded from the insight."""
    insight = await _get_owned_insight(db, insight_id, ctx.workspace.id)

    raw = (insight.text or "").strip()
    title = raw if len(raw) <= 120 else raw[:117].rstrip() + "…"
    if not title:
        title = "Untitled idea"

    body_lines = [raw or ""]
    if insight.intent:
        body_lines.append(f"\nIntent: {insight.intent}")
    body_lines.append("\n\n— Drafted from an insight. Expand into a full piece.")
    body = "".join(body_lines)

    item = ContentItem(
        workspace_id=ctx.workspace.id,
        created_by=getattr(ctx.user, "id", None),
        content_type=ContentType.social_post,
        status=ContentStatus.draft,
        title=title,
        body=body,
        meta={
            "source": "insight",
            "insight_id": str(insight.id),
            "insight_kind": insight.kind,
            "insight_intent": insight.intent,
        },
    )
    db.add(item)
    insight.status = "actioned"
    await db.commit()
    await db.refresh(item)
    return {"content_item_id": str(item.id), "title": item.title or title}


@router.post("/{insight_id}/to-strategy")
async def insight_to_strategy(
    insight_id: uuid.UUID,
    body: ToStrategyIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Append the insight text to a target strategy as an input idea."""
    insight = await _get_owned_insight(db, insight_id, ctx.workspace.id)
    strategy_id = _parse_uuid(body.strategy_id, "strategy id")
    strategy = await db.get(Strategy, strategy_id)
    if not strategy or strategy.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Strategy not found")

    raw = dict(strategy.raw or {})
    inputs = list(raw.get("insight_inputs") or [])
    inputs.append(
        {
            "insight_id": str(insight.id),
            "text": insight.text,
            "kind": insight.kind,
            "intent": insight.intent,
            "score": insight.score,
            "added_at": datetime.utcnow().isoformat(),
        }
    )
    raw["insight_inputs"] = inputs
    # Reassign so SQLAlchemy detects the JSONB change.
    strategy.raw = raw

    insight.status = "actioned"
    await db.commit()
    return {"strategy_id": str(strategy.id), "added": True}
