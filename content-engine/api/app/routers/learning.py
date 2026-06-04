"""Learning-loop routes: analyse real post performance into signals and refine a
strategy from them. Kept in a dedicated router (prefix ``/learning``) so it never
collides with the core strategy CRUD router."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import LearningSignal, Strategy
from app.services.learning_loop import analyze_workspace, refine_strategy

router = APIRouter(prefix="/learning", tags=["learning"])


class LearningSignalOut(BaseModel):
    id: str
    kind: str
    title: str
    detail: str | None = None
    recommendation: str | None = None
    metric: dict | None = None
    applied: bool = False
    created_at: datetime | None = None

    @classmethod
    def from_model(cls, s: LearningSignal) -> "LearningSignalOut":
        return cls(
            id=str(s.id),
            kind=s.kind,
            title=s.title,
            detail=s.detail,
            recommendation=s.recommendation,
            metric=s.metric,
            applied=bool(s.applied),
            created_at=s.created_at,
        )


class RefinementOut(BaseModel):
    summary: str
    keep: list[str] = Field(default_factory=list)
    stop: list[str] = Field(default_factory=list)
    double_down: list[str] = Field(default_factory=list)
    pillar_changes: list[str] = Field(default_factory=list)
    updated_pillars: list = Field(default_factory=list)


class ApplyIn(BaseModel):
    updated_pillars: list = Field(default_factory=list)


class ApplyOut(BaseModel):
    id: str
    pillars: list | None = None


async def _load_signals(
    db: AsyncSession, workspace_id: uuid.UUID
) -> list[LearningSignal]:
    res = await db.execute(
        select(LearningSignal)
        .where(LearningSignal.workspace_id == workspace_id)
        .order_by(LearningSignal.created_at.desc())
    )
    return list(res.scalars().all())


@router.post("/analyze", response_model=list[LearningSignalOut])
async def analyze(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[LearningSignalOut]:
    signals = await analyze_workspace(db, ctx.workspace.id)
    await db.commit()
    for s in signals:
        await db.refresh(s)
    signals.sort(key=lambda s: s.created_at or datetime.min, reverse=True)
    return [LearningSignalOut.from_model(s) for s in signals]


@router.get("/signals", response_model=list[LearningSignalOut])
async def list_signals(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[LearningSignalOut]:
    signals = await _load_signals(db, ctx.workspace.id)
    return [LearningSignalOut.from_model(s) for s in signals]


async def _get_strategy(
    db: AsyncSession, workspace_id: uuid.UUID, strategy_id: str
) -> Strategy:
    try:
        sid = uuid.UUID(strategy_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Strategy not found")
    strategy = await db.get(Strategy, sid)
    if strategy is None or strategy.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Strategy not found")
    return strategy


@router.post("/strategies/{strategy_id}/refine", response_model=RefinementOut)
async def refine(
    strategy_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> RefinementOut:
    strategy = await _get_strategy(db, ctx.workspace.id, strategy_id)

    signals = await _load_signals(db, ctx.workspace.id)
    if not signals:
        signals = await analyze_workspace(db, ctx.workspace.id)
        await db.commit()
        for s in signals:
            await db.refresh(s)

    result = await refine_strategy(db, ctx.workspace.id, strategy, signals)
    return RefinementOut(**result)


@router.post("/strategies/{strategy_id}/apply", response_model=ApplyOut)
async def apply(
    strategy_id: str,
    body: ApplyIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ApplyOut:
    strategy = await _get_strategy(db, ctx.workspace.id, strategy_id)

    strategy.pillars = body.updated_pillars
    db.add(strategy)

    signals = await _load_signals(db, ctx.workspace.id)
    for s in signals:
        if not s.applied:
            s.applied = True
            db.add(s)

    await db.flush()
    await db.commit()
    await db.refresh(strategy)
    return ApplyOut(id=str(strategy.id), pillars=strategy.pillars)
