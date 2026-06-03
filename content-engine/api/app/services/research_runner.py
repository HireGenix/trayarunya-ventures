"""Run a research job end-to-end and persist results. Used by the API background
task path and the Redis worker."""
from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.research_graph import run_research
from app.db import AsyncSessionLocal
from app.models import Competitor, Insight, JobStatus, ResearchJob


async def run_research_job(job_id: uuid.UUID, db: AsyncSession | None = None) -> None:
    """Execute the research graph for ``job_id`` and persist outputs.

    Opens its own session when called without one (worker context).
    """
    own_session = db is None
    session = db or AsyncSessionLocal()
    try:
        job = await session.get(ResearchJob, job_id)
        if job is None:
            return
        job.status = JobStatus.running
        job.error = None
        await session.flush()
        if own_session:
            await session.commit()

        try:
            result = await run_research(
                topic=job.topic,
                target_url=job.target_url,
                competitor_urls=[],
            )
        except Exception as exc:  # noqa: BLE001
            job.status = JobStatus.failed
            job.error = str(exc)[:2000]
            await session.flush()
            if own_session:
                await session.commit()
            return

        job.summary = result.get("summary")
        job.findings = result.get("findings")
        job.sources = result.get("sources")
        job.status = JobStatus.succeeded

        for comp in result.get("competitors", []) or []:
            session.add(
                Competitor(
                    workspace_id=job.workspace_id,
                    research_job_id=job.id,
                    name=comp.get("name", "Unknown"),
                    website=comp.get("website"),
                    positioning=comp.get("positioning"),
                    strengths=comp.get("strengths"),
                    weaknesses=comp.get("weaknesses"),
                    content_themes=comp.get("content_themes"),
                )
            )

        for ins in result.get("insights", []) or []:
            try:
                score = float(ins.get("score", 0) or 0)
            except (TypeError, ValueError):
                score = 0.0
            session.add(
                Insight(
                    workspace_id=job.workspace_id,
                    research_job_id=job.id,
                    kind=ins.get("kind", "question"),
                    text=ins.get("text", ""),
                    intent=ins.get("intent"),
                    score=score,
                )
            )

        await session.flush()
        if own_session:
            await session.commit()
    finally:
        if own_session:
            await session.close()
