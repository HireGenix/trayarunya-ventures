"""Run a research job end-to-end and persist results. Used by the API background
task path and the Redis worker."""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.research_graph import run_research
from app.db import AsyncSessionLocal
from app.models import AuditSnapshot, Competitor, Insight, JobStatus, ResearchJob
from app.services import icp_service
from app.tools.social_audit import audit_many, extract_handle

logger = logging.getLogger(__name__)


async def run_research_job(job_id: uuid.UUID, db: AsyncSession | None = None) -> None:
    """Execute the research graph for ``job_id`` and persist outputs.

    Opens its own session when called without one (worker context).
    Safe to re-run: existing Competitor/Insight/AuditSnapshot rows for the job
    are deleted before inserting fresh results (upsert semantics).
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

        async def _on_step(steps: list[dict]) -> None:
            """Persist reasoning trace mid-run via a *separate* session to avoid
            AsyncSession concurrency issues with the main flow's session."""
            step_session = AsyncSessionLocal()
            try:
                step_job = await step_session.get(ResearchJob, job_id)
                if step_job is not None:
                    step_job.reasoning = list(steps)
                    await step_session.flush()
                    await step_session.commit()
            except Exception:  # noqa: BLE001
                pass
            finally:
                await step_session.close()

        try:
            icp_row = await icp_service.get_icp(session, job.workspace_id)
            icp_brief = icp_service.to_brief(icp_row) if icp_row else None
            result = await run_research(
                topic=job.topic,
                target_url=job.target_url,
                competitor_urls=[],
                countries=job.countries or [],
                platforms=job.platforms or [],
                on_step=_on_step,
                icp=icp_brief,
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
        job.reasoning = result.get("steps")
        job.confidence = result.get("confidence")

        # Upsert semantics: delete existing rows for this job before re-inserting
        # so retrying a job never doubles up on competitors/insights/snapshots.
        await session.execute(delete(AuditSnapshot).where(AuditSnapshot.research_job_id == job.id))
        await session.execute(delete(Insight).where(Insight.research_job_id == job.id))
        await session.execute(delete(Competitor).where(Competitor.research_job_id == job.id))
        await session.flush()

        saved_competitors: list[Competitor] = []
        for comp in result.get("competitors", []) or []:
            handles = comp.get("social_handles")
            if not isinstance(handles, dict):
                handles = None
            obj = Competitor(
                workspace_id=job.workspace_id,
                research_job_id=job.id,
                name=comp.get("name", "Unknown"),
                website=comp.get("website"),
                positioning=comp.get("positioning"),
                strengths=comp.get("strengths"),
                weaknesses=comp.get("weaknesses"),
                content_themes=comp.get("content_themes"),
                country=comp.get("country"),
                social_handles=handles,
            )
            session.add(obj)
            saved_competitors.append(obj)

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
                    meta={
                        "citations": [c for c in (ins.get("citations") or []) if isinstance(c, str)],
                        "grounded": bool(ins.get("grounded")),
                    },
                )
            )

        await session.flush()  # assign competitor ids before auditing

        # --- Auto social-audit pass (Instagram) --------------------------------
        try:
            await _auto_audit(session, job, saved_competitors)
        except Exception:  # noqa: BLE001
            logger.warning("Auto social audit failed for job %s", job_id)

        # Respect a mid-run cancellation: if the API marked this job failed
        # (Cancelled by user) while we were working, don't overwrite it back to
        # succeeded — drop our pending writes and stop.
        async with AsyncSessionLocal() as check_session:
            current = await check_session.get(ResearchJob, job_id)
            if current is not None and current.status == JobStatus.failed:
                if own_session:
                    await session.rollback()
                return

        # Mark succeeded only after all persists succeed; any exception here
        # propagates to the outer try/except which marks the job failed.
        job.status = JobStatus.succeeded
        await session.flush()
        if own_session:
            await session.commit()
    except Exception as exc:  # noqa: BLE001
        # Ensure the job is never left stuck in `running` state.
        try:
            stuck = await session.get(ResearchJob, job_id)
            if stuck and stuck.status == JobStatus.running:
                stuck.status = JobStatus.failed
                stuck.error = f"Unexpected error: {exc!s}"[:2000]
                await session.flush()
                if own_session:
                    await session.commit()
        except Exception:  # noqa: BLE001
            pass
        raise
    finally:
        if own_session:
            await session.close()


def _ig_handle(handles: dict | None) -> str | None:
    if not isinstance(handles, dict):
        return None
    raw = handles.get("instagram") or handles.get("ig")
    if not raw or not isinstance(raw, str):
        return None
    h = raw.strip().lstrip("@").strip("/")
    return h or None


async def _auto_audit(session, job: ResearchJob, competitors: list[Competitor]) -> None:
    """Audit the client + competitor Instagram handles and persist snapshots."""
    platforms = [p.lower() for p in (job.platforms or [])]
    # Instagram is the only platform with reliable public numbers today.
    if platforms and "instagram" not in platforms:
        return

    # client handle: prefer explicit self_handle, else an instagram target url
    client_handle: str | None = None
    if getattr(job, "self_handle", None):
        client_handle = extract_handle(job.self_handle)
    elif job.target_url and "instagram.com" in job.target_url:
        client_handle = extract_handle(job.target_url)

    # map handle -> competitor (for linking snapshots)
    comp_by_handle: dict[str, Competitor] = {}
    handles: list[str] = []
    if client_handle:
        handles.append(client_handle)
    for c in competitors:
        h = _ig_handle(c.social_handles)
        if h and h.lower() not in {x.lower() for x in handles}:
            handles.append(h)
            comp_by_handle[h.lower()] = c

    if len(handles) < 1:
        return

    results = await audit_many(handles[:6])
    for r in results:
        if not r.get("found"):
            continue
        uname = (r.get("username") or r.get("query") or "").lstrip("@")
        comp = comp_by_handle.get(uname.lower()) or comp_by_handle.get((r.get("query") or "").lower())
        is_primary = bool(client_handle) and uname.lower() == client_handle.lower()
        session.add(
            AuditSnapshot(
                workspace_id=job.workspace_id,
                research_job_id=job.id,
                competitor_id=comp.id if comp else None,
                platform="instagram",
                handle=uname,
                is_primary=is_primary,
                country=(comp.country if comp else None),
                profile=r,
            )
        )
