"""Strategy routes: generate a strategy from a research job, list, and get."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.strategist import run_strategy
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import JobStatus, ResearchJob, Strategy
from app.schemas import StrategyCreate, StrategyOut

router = APIRouter(prefix="/strategies", tags=["strategy"])


@router.post("", response_model=StrategyOut, status_code=status.HTTP_201_CREATED)
async def create_strategy(
    data: StrategyCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> StrategyOut:
    job = await db.get(ResearchJob, data.research_job_id)
    if job is None or job.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Research job not found")
    if job.status != JobStatus.succeeded:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Research job is '{job.status.value}', not ready for strategy",
        )

    brief = {
        "topic": job.topic,
        "summary": job.summary,
        "findings": job.findings,
    }
    result = await run_strategy(brief, data.objective)

    strategy = Strategy(
        workspace_id=ctx.workspace.id,
        research_job_id=job.id,
        title=result.get("title", "Content & Social Strategy"),
        objective=data.objective,
        positioning=result.get("positioning"),
        pillars=result.get("pillars"),
        channel_plan=result.get("channel_plan"),
        funnel=result.get("funnel"),
        lead_magnets=result.get("lead_magnets"),
        content_calendar=result.get("content_calendar"),
        kpis=result.get("kpis"),
        raw=result,
    )
    db.add(strategy)
    await db.flush()
    return StrategyOut.model_validate(strategy)


@router.get("", response_model=list[StrategyOut])
async def list_strategies(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[StrategyOut]:
    res = await db.execute(
        select(Strategy)
        .where(Strategy.workspace_id == ctx.workspace.id)
        .order_by(Strategy.created_at.desc())
    )
    return [StrategyOut.model_validate(s) for s in res.scalars().all()]


@router.get("/{strategy_id}", response_model=StrategyOut)
async def get_strategy(
    strategy_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> StrategyOut:
    strategy = await db.get(Strategy, strategy_id)
    if strategy is None or strategy.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Strategy not found")
    return StrategyOut.model_validate(strategy)
