"""Content optimization, brand voice, repurposing, templates and bulk generation.

Enterprise-class content tools: SERP-optimized editing with live scoring,
brand-voice consistency, content atomization, and template-based generation.
"""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models.content import ContentItem, ContentStatus
from app.models.content_template import ContentTemplateModel
from app.llm.adapters import complete, _extract_json

router = APIRouter(prefix="/content-optimize", tags=["content-optimize"])


# ── Schemas ──────────────────────────────────────────────────────────────────
class SerpResearchRequest(BaseModel):
    keyword: str = Field(min_length=2, max_length=200)
    limit: int = Field(default=8, ge=3, le=15)


class ScoreRequest(BaseModel):
    text: str = Field(min_length=10)
    keyword: str = Field(min_length=2, max_length=200)


class InlineAIRequest(BaseModel):
    text: str = Field(min_length=1)
    command: str = Field(description="One of: rewrite, expand, shorten, improve_seo, continue")
    keyword: str | None = None
    target_terms: list[str] | None = None
    provider: str | None = None


class BrandVoiceScoreRequest(BaseModel):
    text: str = Field(min_length=10)


class RepurposeRequest(BaseModel):
    content_item_id: str | None = None
    source_text: str | None = None
    source_title: str | None = None
    channels: list[str]
    provider: str | None = None


class TemplateGenerateRequest(BaseModel):
    template_id: str
    variables: dict[str, str]
    provider: str | None = None


class BulkGenerateRequest(BaseModel):
    template_id: str
    rows: list[dict[str, str]]
    provider: str | None = None


class TemplateVariableSpec(BaseModel):
    key: str
    label: str
    placeholder: str | None = None


class TemplateCreateRequest(BaseModel):
    template_key: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=300)
    category: str | None = None
    description: str | None = None
    content_type: str = "blog"
    variables: list[TemplateVariableSpec] = Field(default_factory=list)
    system_prompt: str | None = None
    user_prompt_template: str | None = None


class TemplateUpdateRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    content_type: str | None = None
    variables: list[TemplateVariableSpec] | None = None
    system_prompt: str | None = None
    user_prompt_template: str | None = None


class BriefGenerateRequest(BaseModel):
    keyword: str = Field(min_length=2, max_length=200)
    content_item_id: str | None = None


# ── SERP Research ────────────────────────────────────────────────────────────
@router.post("/serp-research")
async def serp_research(
    data: SerpResearchRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> dict:
    from app.services.content_optimize import research_serp
    result = await research_serp(data.keyword, limit=data.limit)
    return result.to_dict()


# ── Content Scoring ──────────────────────────────────────────────────────────
@router.post("/score")
async def score_content_endpoint(
    data: ScoreRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> dict:
    from app.services.content_optimize import research_serp, score_content
    research = await research_serp(data.keyword, limit=6)
    score = score_content(data.text, research)
    return score.to_dict()


# ── Inline AI Commands ───────────────────────────────────────────────────────
_COMMAND_PROMPTS: dict[str, str] = {
    "rewrite": (
        "Rewrite the following text to improve clarity, flow, and engagement. "
        "Maintain the same meaning and approximate length. Return ONLY the rewritten text."
    ),
    "expand": (
        "Expand the following text with more detail, examples, and depth. "
        "Add 50-100% more content. Maintain the same style and tone. Return ONLY the expanded text."
    ),
    "shorten": (
        "Condense the following text to about half its length while preserving "
        "all key points and meaning. Return ONLY the shortened text."
    ),
    "improve_seo": (
        "Rewrite the following text to better incorporate SEO target terms naturally. "
        "Do NOT keyword-stuff. Maintain readability. Return ONLY the improved text."
    ),
    "continue": (
        "Continue writing from where this text ends. Match the style, tone, and topic. "
        "Add 2-3 more paragraphs. Return ONLY the new continuation text (not the original)."
    ),
}


@router.post("/inline-ai")
async def inline_ai(
    data: InlineAIRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> dict:
    cmd = data.command.lower().strip()
    base_prompt = _COMMAND_PROMPTS.get(cmd)
    if not base_prompt:
        raise HTTPException(status_code=400, detail=f"Unknown command: {cmd}")

    system = base_prompt
    if cmd == "improve_seo" and data.target_terms:
        system += f"\n\nTarget SEO terms to incorporate: {', '.join(data.target_terms[:20])}"
    if data.keyword:
        system += f"\nPrimary keyword: {data.keyword}"

    try:
        result = await complete(
            messages=[{"role": "user", "content": data.text}],
            system=system,
            provider=data.provider,
        )
        return {"result": result.strip(), "command": cmd}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# ── Brand Voice ──────────────────────────────────────────────────────────────
@router.get("/brand-voice")
async def get_brand_voice(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.brand_voice import build_brand_voice_profile
    profile = await build_brand_voice_profile(db, ctx.workspace.id)
    return profile.to_dict()


@router.post("/brand-voice/score")
async def score_brand_voice(
    data: BrandVoiceScoreRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.brand_voice import build_brand_voice_profile, score_voice_consistency
    profile = await build_brand_voice_profile(db, ctx.workspace.id)
    score = score_voice_consistency(data.text, profile)
    return score.to_dict()


# ── Repurposing ──────────────────────────────────────────────────────────────
@router.post("/repurpose")
async def repurpose(
    data: RepurposeRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.content_repurpose import repurpose_content, CHANNEL_CONSTRAINTS
    from app.services.brand_voice import build_brand_voice_profile, voice_context_for_generation

    source_text = data.source_text or ""
    source_title = data.source_title or ""

    if data.content_item_id:
        item = await db.get(ContentItem, uuid.UUID(data.content_item_id))
        if not item or item.workspace_id != ctx.workspace.id:
            raise HTTPException(status_code=404, detail="Content item not found")
        source_text = item.body or ""
        source_title = item.title or ""

    if not source_text:
        raise HTTPException(status_code=400, detail="No source text provided")

    # Build brand voice context
    profile = await build_brand_voice_profile(db, ctx.workspace.id)
    voice_ctx = voice_context_for_generation(profile)

    variants = await repurpose_content(
        source_text=source_text,
        source_title=source_title,
        channels=data.channels,
        brand_voice_context=voice_ctx,
        provider=data.provider,
    )

    return {
        "source_title": source_title,
        "channels": list(CHANNEL_CONSTRAINTS.keys()),
        "variants": [v.to_dict() for v in variants],
    }


@router.get("/repurpose/channels")
async def list_channels(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> dict:
    from app.services.content_repurpose import CHANNEL_CONSTRAINTS
    return {
        "channels": [
            {"key": k, "label": v["label"], "max_chars": v["max_chars"]}
            for k, v in CHANNEL_CONSTRAINTS.items()
        ]
    }


# ── Templates ────────────────────────────────────────────────────────────────
def _db_template_to_dict(t: ContentTemplateModel) -> dict:
    variables = t.variables if isinstance(t.variables, list) else []
    return {
        "id": t.template_key,
        "template_id": str(t.id),
        "template_key": t.template_key,
        "name": t.name,
        "category": t.category,
        "description": t.description,
        "content_type": t.content_type,
        "variables": variables,
        "system_prompt": t.system_prompt,
        "user_prompt_template": t.user_prompt_template,
        "source": "custom",
    }


@router.get("/templates")
async def templates_list(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.content_templates import list_templates

    merged: dict[str, dict] = {}
    for t in list_templates():
        d = dict(t)
        d.setdefault("source", "builtin")
        merged[d["id"]] = d

    res = await db.execute(
        select(ContentTemplateModel).where(
            ContentTemplateModel.workspace_id == ctx.workspace.id
        )
    )
    for row in res.scalars().all():
        # DB (custom) templates override built-ins sharing the same key.
        merged[row.template_key] = _db_template_to_dict(row)

    return {"templates": list(merged.values())}


@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def template_create(
    data: TemplateCreateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = ContentTemplateModel(
        workspace_id=ctx.workspace.id,
        template_key=data.template_key,
        name=data.name,
        category=data.category,
        description=data.description,
        content_type=data.content_type or "blog",
        variables=[v.model_dump(exclude_none=True) for v in data.variables],
        system_prompt=data.system_prompt,
        user_prompt_template=data.user_prompt_template,
    )
    db.add(row)
    await db.flush()
    await db.commit()
    await db.refresh(row)
    return _db_template_to_dict(row)


async def _get_db_template(
    db: AsyncSession, ctx: WorkspaceContext, template_id: str
) -> ContentTemplateModel:
    try:
        tid = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Template not found")
    row = await db.get(ContentTemplateModel, tid)
    if row is None or row.workspace_id != ctx.workspace.id:
        raise HTTPException(status_code=404, detail="Template not found")
    return row


@router.put("/templates/{template_id}")
async def template_update(
    template_id: str,
    data: TemplateUpdateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await _get_db_template(db, ctx, template_id)
    if data.name is not None:
        row.name = data.name
    if data.category is not None:
        row.category = data.category
    if data.description is not None:
        row.description = data.description
    if data.content_type is not None:
        row.content_type = data.content_type
    if data.variables is not None:
        row.variables = [v.model_dump(exclude_none=True) for v in data.variables]
    if data.system_prompt is not None:
        row.system_prompt = data.system_prompt
    if data.user_prompt_template is not None:
        row.user_prompt_template = data.user_prompt_template
    await db.flush()
    await db.commit()
    await db.refresh(row)
    return _db_template_to_dict(row)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def template_delete(
    template_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    row = await _get_db_template(db, ctx, template_id)
    await db.delete(row)
    await db.commit()


@router.get("/templates/{template_id}")
async def template_get(
    template_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> dict:
    from app.services.content_templates import get_template
    t = get_template(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t.to_dict()


@router.post("/templates/generate")
async def template_generate(
    data: TemplateGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.content_templates import generate_from_template
    from app.services.brand_voice import build_brand_voice_profile, voice_context_for_generation

    profile = await build_brand_voice_profile(db, ctx.workspace.id)
    voice_ctx = voice_context_for_generation(profile)

    result = await generate_from_template(
        data.template_id,
        data.variables,
        brand_voice_context=voice_ctx,
        provider=data.provider,
    )
    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])
    return result


@router.post("/templates/bulk-generate")
async def template_bulk_generate(
    data: BulkGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.content_templates import bulk_generate
    from app.services.brand_voice import build_brand_voice_profile, voice_context_for_generation

    if not data.rows:
        raise HTTPException(status_code=400, detail="No rows provided")

    profile = await build_brand_voice_profile(db, ctx.workspace.id)
    voice_ctx = voice_context_for_generation(profile)

    results = await bulk_generate(
        data.template_id,
        data.rows,
        brand_voice_context=voice_ctx,
        provider=data.provider,
    )
    return {"results": results, "total": len(results)}


# ── Content Brief Generation ─────────────────────────────────────────────────
def _empty_brief(keyword: str) -> dict:
    """Structured empty state when no real SERP data is available."""
    return {
        "status": "awaiting_data",
        "keyword": keyword,
        "target_audience": None,
        "search_intent": None,
        "outline": [],
        "key_terms": [],
        "competitor_angles": [],
        "suggested_meta_title": None,
        "suggested_meta_description": None,
        "internal_link_targets": [],
    }


_BRIEF_SYSTEM = (
    "You are an expert SEO content strategist. Using ONLY the real SERP research "
    "data provided (top-ranking headings, common questions, and term frequencies), "
    "produce a structured content brief. Do NOT invent statistics or facts that are "
    "not supported by the supplied data. Return STRICT JSON with this shape: "
    '{"target_audience": "...", "search_intent": "informational|commercial|transactional|navigational", '
    '"outline": [{"level": "h2"|"h3", "text": "..."}], '
    '"suggested_meta_title": "...", "suggested_meta_description": "..."}'
)


@router.post("/brief/generate")
async def brief_generate(
    data: BriefGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate a structured content brief grounded in real SERP research.

    Never fabricates data — key terms, competitor angles and outline signals are
    derived from actual top-ranking competitor pages. If SERP research returns no
    usable results, a structured ``awaiting_data`` empty state is returned.
    """
    from app.services.content_optimize import research_serp

    research = await research_serp(data.keyword, limit=8)

    if research.competitors_analyzed == 0 or not research.target_terms:
        return _empty_brief(data.keyword)

    # Real, deterministic signals straight from the SERP research.
    key_terms = [
        {
            "term": t.term,
            "suggested_count": t.suggested_count,
            "competitor_avg": t.competitor_avg,
            "importance": t.importance,
        }
        for t in research.target_terms[:25]
    ]
    competitor_angles = list(research.headings[:15])

    # Optional source item to anchor internal linking suggestions.
    source_title = ""
    if data.content_item_id:
        try:
            item = await db.get(ContentItem, uuid.UUID(data.content_item_id))
        except ValueError:
            item = None
        if item and item.workspace_id == ctx.workspace.id:
            source_title = item.title or ""

    research_payload = {
        "keyword": research.keyword,
        "recommended_word_count": research.recommended_word_count,
        "competitor_headings": research.headings[:20],
        "common_questions": research.questions[:15],
        "top_terms": [t.term for t in research.target_terms[:25]],
    }

    user_prompt = (
        f"Keyword: {data.keyword}\n"
        f"Real SERP research data (from {research.competitors_analyzed} competitor pages):\n"
        f"{json.dumps(research_payload, ensure_ascii=False)}\n\n"
        "Produce the content brief JSON now."
    )

    parsed: dict[str, Any] = {}
    try:
        raw = await complete(
            messages=[{"role": "user", "content": user_prompt}],
            system=_BRIEF_SYSTEM,
        )
        parsed = json.loads(_extract_json(raw))
    except Exception:
        parsed = {}

    outline = parsed.get("outline") if isinstance(parsed.get("outline"), list) else []
    # Fall back to real competitor headings if the model did not return an outline.
    if not outline and research.headings:
        outline = [{"level": "h2", "text": h} for h in research.headings[:10]]

    internal_link_targets = [source_title] if source_title else []
    for q in research.questions[:5]:
        internal_link_targets.append(q)

    return {
        "status": "ok",
        "keyword": data.keyword,
        "target_audience": parsed.get("target_audience"),
        "search_intent": parsed.get("search_intent"),
        "outline": outline,
        "key_terms": key_terms,
        "competitor_angles": competitor_angles,
        "suggested_meta_title": parsed.get("suggested_meta_title"),
        "suggested_meta_description": parsed.get("suggested_meta_description"),
        "internal_link_targets": internal_link_targets,
    }
