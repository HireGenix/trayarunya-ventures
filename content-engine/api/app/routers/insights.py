"""Insights explorer: AnswerThePublic-style aggregated insights across all research
jobs in a workspace, with kind/intent filtering and text search."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import Insight
from app.schemas import InsightExplorerOut

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", response_model=list[InsightExplorerOut])
async def list_insights(
    kind: str | None = Query(default=None),
    intent: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[InsightExplorerOut]:
    stmt = select(Insight).where(Insight.workspace_id == ctx.workspace.id)
    if kind:
        stmt = stmt.where(Insight.kind == kind)
    if intent:
        stmt = stmt.where(Insight.intent == intent)
    if q:
        stmt = stmt.where(Insight.text.ilike(f"%{q}%"))
    stmt = stmt.order_by(Insight.score.desc()).limit(limit)
    res = await db.execute(stmt)
    return [InsightExplorerOut.model_validate(i) for i in res.scalars().all()]
