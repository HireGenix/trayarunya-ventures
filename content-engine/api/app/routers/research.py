"""Research routes: create a job (queued/async), list, get, and fetch insights."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import Competitor, Insight, ResearchJob
from app.schemas import (
    CompetitorOut,
    InsightOut,
    ResearchCreate,
    ResearchOut,
    ResearchUpdate,
)
from app.services.research_runner import run_research_job
from app.worker.queue import enqueue

router = APIRouter(prefix="/research", tags=["research"])


@router.post("", response_model=ResearchOut, status_code=status.HTTP_202_ACCEPTED)
async def create_research(
    data: ResearchCreate,
    background: BackgroundTasks,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ResearchOut:
    job = ResearchJob(
        workspace_id=ctx.workspace.id,
        created_by=ctx.user.id,
        topic=data.topic,
        target_url=data.target_url or ctx.workspace.website,
    )
    db.add(job)
    await db.flush()
    await db.commit()

    # Prefer the Redis worker (crawl4ai); fall back to an inline background task.
    queued = await enqueue("research", {"job_id": str(job.id)})
    if not queued:
        background.add_task(run_research_job, job.id)

    return ResearchOut.model_validate(job)


@router.get("", response_model=list[ResearchOut])
async def list_research(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ResearchOut]:
    res = await db.execute(
        select(ResearchJob)
        .where(ResearchJob.workspace_id == ctx.workspace.id)
        .order_by(ResearchJob.created_at.desc())
    )
    return [ResearchOut.model_validate(j) for j in res.scalars().all()]


async def _get_job(db: AsyncSession, ctx: WorkspaceContext, job_id: uuid.UUID) -> ResearchJob:
    job = await db.get(ResearchJob, job_id)
    if job is None or job.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Research job not found")
    return job


@router.get("/{job_id}", response_model=ResearchOut)
async def get_research(
    job_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ResearchOut:
    return ResearchOut.model_validate(await _get_job(db, ctx, job_id))


@router.patch("/{job_id}", response_model=ResearchOut)
async def update_research(
    job_id: uuid.UUID,
    data: ResearchUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ResearchOut:
    job = await _get_job(db, ctx, job_id)
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(job, field, value)
    await db.commit()
    await db.refresh(job)
    return ResearchOut.model_validate(job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_research(
    job_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    job = await _get_job(db, ctx, job_id)
    await db.delete(job)
    await db.commit()


@router.get("/{job_id}/insights", response_model=list[InsightOut])
async def get_insights(
    job_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[InsightOut]:
    await _get_job(db, ctx, job_id)
    res = await db.execute(
        select(Insight)
        .where(Insight.research_job_id == job_id)
        .order_by(Insight.score.desc())
    )
    return [InsightOut.model_validate(i) for i in res.scalars().all()]


@router.get("/{job_id}/competitors", response_model=list[CompetitorOut])
async def get_competitors(
    job_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[CompetitorOut]:
    await _get_job(db, ctx, job_id)
    res = await db.execute(
        select(Competitor).where(Competitor.research_job_id == job_id)
    )
    return [CompetitorOut.model_validate(c) for c in res.scalars().all()]
