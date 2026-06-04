"""Research routes: create a job (queued/async), list, get, and fetch insights."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import AuditSnapshot, Competitor, Insight, ResearchJob
from app.schemas import (
    AuditSnapshotOut,
    CompetitorOut,
    InsightOut,
    ResearchCreate,
    ResearchOut,
    ResearchUpdate,
    SocialAuditOut,
    SocialAuditRequest,
    SocialBenchmarkRequest,
)
from app.services.research_runner import run_research_job
from app.services.usage_guard import enforce_limit
from app.tools.social_audit import audit_many, audit_profile
from app.worker.queue import enqueue

router = APIRouter(prefix="/research", tags=["research"])


@router.post("", response_model=ResearchOut, status_code=status.HTTP_202_ACCEPTED)
async def create_research(
    data: ResearchCreate,
    background: BackgroundTasks,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ResearchOut:
    await enforce_limit(db, ctx.workspace.id, "research")
    job = ResearchJob(
        workspace_id=ctx.workspace.id,
        created_by=ctx.user.id,
        topic=data.topic,
        target_url=data.target_url or ctx.workspace.website,
        countries=data.countries or None,
        platforms=data.platforms or None,
        self_handle=(data.self_handle.strip() if data.self_handle else None),
    )
    db.add(job)
    await db.flush()
    await db.commit()

    # Prefer the Redis worker (crawl4ai); fall back to an inline background task.
    queued = await enqueue("research", {"job_id": str(job.id)})
    if not queued:
        background.add_task(run_research_job, job.id)

    return ResearchOut.model_validate(job)


@router.post("/social-audit", response_model=SocialAuditOut)
async def social_audit(
    data: SocialAuditRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> SocialAuditOut:
    """Public profile audit — paste an Instagram URL/@handle to get follower
    numbers, post count and an estimated engagement rate. No login required."""
    result = await audit_profile(data.url)
    return SocialAuditOut.model_validate(result)


@router.post("/social-benchmark", response_model=list[SocialAuditOut])
async def social_benchmark(
    data: SocialBenchmarkRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> list[SocialAuditOut]:
    """Audit several profiles at once for side-by-side competitor benchmarking.
    The first url is treated as the primary (client) profile."""
    results = await audit_many(data.urls)
    return [SocialAuditOut.model_validate(r) for r in results]


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


@router.get("/{job_id}/audit-snapshots", response_model=list[AuditSnapshotOut])
async def get_audit_snapshots(
    job_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[AuditSnapshotOut]:
    """Auto-captured profile audits (client + competitors) for this job, used to
    render the you-vs-them benchmark table."""
    await _get_job(db, ctx, job_id)
    res = await db.execute(
        select(AuditSnapshot)
        .where(AuditSnapshot.research_job_id == job_id)
        .order_by(AuditSnapshot.is_primary.desc(), AuditSnapshot.created_at.asc())
    )
    return [AuditSnapshotOut.model_validate(s) for s in res.scalars().all()]
