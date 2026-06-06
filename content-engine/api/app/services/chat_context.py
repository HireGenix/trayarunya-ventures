"""Assemble the live workspace grounding injected into every team-chat turn.

The team assistant must always reason about the SPECIFIC company/client/individual
whose workspace is active. We pull the workspace's ICP, brand brain, most recent
strategy and recent research summaries into a compact context block that is
prepended to the system prompt.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BrandBrain, JobStatus, ResearchJob, Strategy, Workspace
from app.services import icp_service


def _clip(text: str, limit: int) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _findings_with_citations(jobs: list[ResearchJob], limit: int = 14) -> tuple[str, list[dict]]:
    """Flatten research ``findings`` into cited bullet lines + a source list.

    Each finding row is ``{"text": "...", "citations": [url, ...]}`` grouped under
    keys like ``audience_pains`` / ``value_props`` / ``trends``. Returns a markdown
    block and a deduped ``[{"label","url"}]`` source list for the References slide.
    """
    sections: list[str] = []
    sources: list[dict] = []
    seen: set[str] = set()
    count = 0
    for job in jobs:
        findings = job.findings if isinstance(job.findings, dict) else {}
        for key, rows in findings.items():
            if not isinstance(rows, list) or not rows:
                continue
            label = str(key).replace("_", " ").title()
            lines: list[str] = []
            for row in rows:
                if count >= limit:
                    break
                if isinstance(row, dict):
                    text = str(row.get("text") or "").strip()
                    cites = [c for c in (row.get("citations") or []) if isinstance(c, str)]
                else:
                    text, cites = str(row).strip(), []
                if not text:
                    continue
                cite_str = f" [src: {cites[0]}]" if cites else ""
                lines.append(f"- {text}{cite_str}")
                count += 1
                for c in cites:
                    if c and c not in seen:
                        seen.add(c)
                        sources.append({"label": text[:120] or c, "url": c})
            if lines:
                sections.append(f"### {label}\n" + "\n".join(lines))
        # Also harvest raw job-level sources (titled URLs) for references.
        for s in (job.sources or []):
            if not isinstance(s, dict):
                continue
            url = str(s.get("url") or "").strip()
            if url and url not in seen:
                seen.add(url)
                sources.append({"label": str(s.get("title") or url)[:120], "url": url})
        if count >= limit:
            break
    return ("\n\n".join(sections), sources)


async def build_workspace_grounding(db: AsyncSession, workspace: Workspace) -> str:
    """Return a markdown grounding block for ``workspace`` (may be mostly empty)."""
    parts: list[str] = [f"# ACTIVE WORKSPACE: {workspace.name}"]
    if getattr(workspace, "website", None):
        parts.append(f"Website: {workspace.website}")

    # --- ICP ---------------------------------------------------------------
    icp_row = await icp_service.get_icp(db, workspace.id)
    icp_brief = icp_service.to_brief(icp_row) if icp_row else None
    if icp_brief:
        parts.append("## Ideal Customer Profile\n" + _clip(
            json.dumps(icp_brief, ensure_ascii=False), 3500
        ))

    # --- Brand brain -------------------------------------------------------
    brand = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == workspace.id))
    ).scalar_one_or_none()
    if brand is not None:
        brand_ctx: dict[str, Any] = {
            "mission": brand.mission,
            "value_prop": brand.value_prop,
            "voice": brand.voice,
            "audience": brand.audience,
            "pillars": brand.pillars,
            "keywords": brand.keywords,
        }
        brand_ctx = {k: v for k, v in brand_ctx.items() if v}
        if brand_ctx:
            parts.append("## Brand\n" + _clip(json.dumps(brand_ctx, ensure_ascii=False), 3000))

    # --- Latest strategy ---------------------------------------------------
    strategy = (
        await db.execute(
            select(Strategy)
            .where(Strategy.workspace_id == workspace.id)
            .order_by(desc(Strategy.created_at))
            .limit(1)
        )
    ).scalar_one_or_none()
    if strategy is not None:
        strat_ctx = {
            "title": strategy.title,
            "objective": strategy.objective,
            "positioning": strategy.positioning,
            "pillars": strategy.pillars,
            "channel_plan": strategy.channel_plan,
            "funnel": strategy.funnel,
        }
        strat_ctx = {k: v for k, v in strat_ctx.items() if v}
        if strat_ctx:
            parts.append("## Current Strategy\n" + _clip(
                json.dumps(strat_ctx, ensure_ascii=False), 3500
            ))

    # --- Recent research ---------------------------------------------------
    jobs = (
        await db.execute(
            select(ResearchJob)
            .where(
                ResearchJob.workspace_id == workspace.id,
                ResearchJob.status == JobStatus.succeeded,
            )
            .order_by(desc(ResearchJob.created_at))
            .limit(3)
        )
    ).scalars().all()
    research_lines = [
        f"- {j.topic}: {_clip(j.summary, 600)}" for j in jobs if j.summary
    ]
    if research_lines:
        parts.append("## Recent Research\n" + "\n".join(research_lines))

    return "\n\n".join(parts)


def has_context(grounding: str) -> bool:
    """True when grounding contains more than just the workspace header."""
    return grounding.count("##") > 0


async def _brand_identity(db: AsyncSession, workspace: Workspace) -> tuple[str, dict]:
    """Compact brand-identity block + theme bits (name/website/colours/logo)."""
    bits: list[str] = [f"Brand / company name: {workspace.name}"]
    website = getattr(workspace, "website", None)
    if website:
        bits.append(f"Website: {website}")
    brand = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == workspace.id))
    ).scalar_one_or_none()
    theme: dict[str, Any] = {}
    if brand is not None:
        if brand.primary_color:
            bits.append(f"Primary brand colour: {brand.primary_color}")
            theme["primary"] = brand.primary_color
        if brand.accent_color:
            bits.append(f"Accent brand colour: {brand.accent_color}")
            theme["accent"] = brand.accent_color
        if brand.logo_url:
            bits.append("A brand logo is available and will be placed on the slides.")
            theme["logo_url"] = brand.logo_url
    return "\n".join(bits), theme


async def build_deck_grounding(
    db: AsyncSession,
    workspace: Workspace,
    topic: str,
    *,
    audience: str | None = None,
    run_fresh_pass: bool = True,
) -> dict[str, Any]:
    """Rich grounding for deck generation = workspace context + cited research +
    a fresh topical web pass (hybrid).

    Returns ``{"grounding": str, "sources": [{"label","url"}], "industry": str|None}``.
    """
    from app.services import deck_research  # local import avoids cycle at import time

    base = await build_workspace_grounding(db, workspace)
    parts = [base]
    sources: list[dict] = []

    # Strong brand identity up top so the designer always knows who it's for.
    identity, _theme = await _brand_identity(db, workspace)
    parts.insert(1, "## Brand identity\n" + identity)

    industry: str | None = None
    icp_row = await icp_service.get_icp(db, workspace.id)
    if icp_row is not None:
        brief = icp_service.to_brief(icp_row) or {}
        industry = brief.get("industry") or brief.get("segment")

    # --- Cited research findings from saved jobs ---------------------------
    jobs = (
        await db.execute(
            select(ResearchJob)
            .where(
                ResearchJob.workspace_id == workspace.id,
                ResearchJob.status == JobStatus.succeeded,
            )
            .order_by(desc(ResearchJob.created_at))
            .limit(4)
        )
    ).scalars().all()
    findings_block, research_sources = _findings_with_citations(list(jobs))
    if findings_block:
        parts.append("## Research findings (cite these)\n" + _clip(findings_block, 5000))
        sources.extend(research_sources)

    # --- Fresh topical web evidence (hybrid pass) -------------------------
    if run_fresh_pass:
        try:
            ev = await deck_research.gather_evidence(
                topic, industry=industry, audience=audience
            )
        except Exception:  # noqa: BLE001 — never block a deck on evidence
            ev = {"evidence": "", "sources": []}
        if ev.get("evidence"):
            parts.append("## Fresh web evidence (cite the URLs)\n" + ev["evidence"])
        for s in ev.get("sources", []):
            sources.append({"label": s.get("label", ""), "url": s.get("url", "")})

    # De-dupe sources by URL, keep order, cap.
    seen: set[str] = set()
    deduped: list[dict] = []
    for s in sources:
        url = (s.get("url") or "").strip()
        if url and url not in seen:
            seen.add(url)
            deduped.append({"label": (s.get("label") or url)[:140], "url": url})
    return {
        "grounding": "\n\n".join(p for p in parts if p),
        "sources": deduped[:14],
        "industry": industry,
    }
