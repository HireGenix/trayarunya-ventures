"""SEO Suite API — rank tracking, on-page audits, AI content briefs.

All endpoints are workspace-scoped via ``get_workspace_ctx`` and every query is
filtered by ``ctx.workspace.id``. Final paths: ``/api/v1/seo/...``.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import seo_agent as agent
from app.db import AsyncSessionLocal, get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.services import seo as svc
from app.services.automation import emit_event

router = APIRouter(prefix="/seo", tags=["seo"])


# --------------------------------------------------------------------------- #
# Schemas (inline, per recipe)
# --------------------------------------------------------------------------- #
class KeywordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    term: str
    country: str
    device: str
    intent: str | None = None
    current_rank: int | None = None
    previous_rank: int | None = None
    search_volume: int | None = None
    difficulty: int | None = None
    volume_proxy: int | None = None
    metrics: dict | None = None
    last_checked_at: datetime | None = None
    is_tracked: bool
    created_at: datetime


class KeywordCreate(BaseModel):
    term: str = Field(min_length=1, max_length=300)
    country: str = Field(default="US", max_length=8)
    device: str = Field(default="desktop")
    intent: str | None = Field(default=None, max_length=40)
    search_volume: int | None = None
    difficulty: int | None = Field(default=None, ge=0, le=100)
    volume_proxy: int | None = Field(default=None, ge=0, le=100)
    metrics: dict | None = None
    is_tracked: bool = True


class ResearchIn(BaseModel):
    seed: str = Field(min_length=1, max_length=200)
    country: str = Field(default="US", max_length=8)
    limit: int = Field(default=25, ge=1, le=60)


class KeywordIdeaOut(BaseModel):
    keyword: str
    difficulty: int
    volume_proxy: int
    intent: str
    cluster: str
    source: str
    confidence: str
    metrics: dict | None = None


class KeywordBulkItem(BaseModel):
    term: str = Field(min_length=1, max_length=300)
    country: str = Field(default="US", max_length=8)
    device: str = Field(default="desktop")
    intent: str | None = Field(default=None, max_length=40)
    difficulty: int | None = Field(default=None, ge=0, le=100)
    volume_proxy: int | None = Field(default=None, ge=0, le=100)
    metrics: dict | None = None
    is_tracked: bool = True


class KeywordBulkIn(BaseModel):
    keywords: list[KeywordBulkItem] = Field(min_length=1, max_length=200)


class CheckSerpIn(BaseModel):
    domain: str = Field(min_length=1, max_length=255)


class SiteAuditIn(BaseModel):
    url: str = Field(min_length=1, max_length=1000)
    max_pages: int = Field(default=20, ge=1, le=100)


class SiteAuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    base_url: str
    max_pages: int
    pages_crawled: int
    score: int
    issues: list | None = None
    status: str
    created_at: datetime


class ContentScoreIn(BaseModel):
    keyword: str = Field(min_length=1, max_length=300)
    text: str | None = Field(default=None, max_length=200000)
    url: str | None = Field(default=None, max_length=1000)


class TrackToggleIn(BaseModel):
    is_tracked: bool


class SnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    keyword_id: uuid.UUID
    rank: int | None = None
    url: str | None = None
    checked_at: datetime


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    url: str
    score: int
    issues: list | None = None
    status: str
    created_at: datetime


class AuditIn(BaseModel):
    url: str = Field(min_length=1, max_length=1000)
    html_or_meta: str | None = Field(default=None, max_length=200000)


class BriefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    target_keyword: str
    title: str | None = None
    outline: dict | None = None
    word_count_target: int | None = None
    status: str
    brief_md: str | None = None
    created_at: datetime


class BriefIn(BaseModel):
    keyword: str = Field(min_length=1, max_length=300)


# --------------------------------------------------------------------------- #
# Keywords
# --------------------------------------------------------------------------- #
@router.get("/keywords", response_model=list[KeywordOut])
async def list_keywords(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_keywords(db, ctx.workspace.id)


@router.post("/keywords", response_model=KeywordOut)
async def create_keyword(
    body: KeywordCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    kw = await svc.create_keyword(
        db,
        ctx.workspace.id,
        term=body.term,
        country=body.country,
        device=body.device,
        intent=body.intent,
        search_volume=body.search_volume,
        difficulty=body.difficulty,
        volume_proxy=body.volume_proxy,
        metrics=body.metrics,
        is_tracked=body.is_tracked,
    )
    await db.commit()
    await db.refresh(kw)
    return kw


@router.post("/research", response_model=list[KeywordIdeaOut])
async def research_keywords(
    body: ResearchIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Research keyword ideas from real SERP + crawled competitor content.

    Returns ideas with transparent difficulty/volume proxies, LLM-labelled
    intent, and clustering. Numbers are estimates derived from real data.
    """
    return await svc.keyword_research(body.seed, body.country, body.limit)


@router.post("/keywords/bulk", response_model=list[KeywordOut])
async def bulk_create_keywords(
    body: KeywordBulkIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Track multiple keywords at once (e.g. straight from /research)."""
    created = []
    for item in body.keywords:
        kw = await svc.create_keyword(
            db,
            ctx.workspace.id,
            term=item.term,
            country=item.country,
            device=item.device,
            intent=item.intent,
            difficulty=item.difficulty,
            volume_proxy=item.volume_proxy,
            metrics=item.metrics,
            is_tracked=item.is_tracked,
        )
        created.append(kw)
    await db.commit()
    for kw in created:
        await db.refresh(kw)
    return created


@router.post("/keywords/{keyword_id}/track", response_model=KeywordOut)
async def toggle_tracking(
    keyword_id: uuid.UUID,
    body: TrackToggleIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    kw = await svc.set_tracking(db, ctx.workspace.id, keyword_id, body.is_tracked)
    if kw is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Keyword not found")
    await db.commit()
    await db.refresh(kw)
    return kw


@router.post("/keywords/{keyword_id}/check")
async def check_keyword(
    keyword_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    kw = await svc.get_keyword(db, ctx.workspace.id, keyword_id)
    if kw is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Keyword not found")

    prev = kw.previous_rank
    result = await svc.check_keyword(db, ctx.workspace.id, kw)

    # Emit a rank-drop signal when a real reading worsened the position.
    if result.get("status") == "recorded":
        delta = result.get("delta")
        if delta is not None and delta < 0:
            await emit_event(
                db,
                ctx.workspace.id,
                "seo.rank.drop",
                {
                    "keyword_id": str(kw.id),
                    "term": kw.term,
                    "current_rank": kw.current_rank,
                    "previous_rank": prev,
                    "drop": abs(delta),
                },
            )
    await db.commit()
    return result


@router.get("/keywords/{keyword_id}/history", response_model=list[SnapshotOut])
async def keyword_history(
    keyword_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    kw = await svc.get_keyword(db, ctx.workspace.id, keyword_id)
    if kw is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Keyword not found")
    return await svc.keyword_history(db, ctx.workspace.id, keyword_id)


@router.post("/keywords/{keyword_id}/check-serp")
async def check_keyword_serp(
    keyword_id: uuid.UUID,
    body: CheckSerpIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Free SERP-scrape rank check: find ``domain`` in the live SERP for the term."""
    kw = await svc.get_keyword(db, ctx.workspace.id, keyword_id)
    if kw is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Keyword not found")

    prev = kw.previous_rank
    result = await svc.check_keyword_serp(db, ctx.workspace.id, kw, body.domain)

    if result.get("status") == "recorded":
        delta = result.get("delta")
        if delta is not None and delta < 0:
            await emit_event(
                db,
                ctx.workspace.id,
                "seo.rank.drop",
                {
                    "keyword_id": str(kw.id),
                    "term": kw.term,
                    "current_rank": kw.current_rank,
                    "previous_rank": prev,
                    "drop": abs(delta),
                },
            )
    await db.commit()
    return result


# --------------------------------------------------------------------------- #
# Full-site audits (background multi-page crawl)
# --------------------------------------------------------------------------- #
async def _run_site_audit_bg(ws_id: uuid.UUID, audit_id: uuid.UUID) -> None:
    """Background worker: crawl the site and finalize the audit in a fresh session."""
    async with AsyncSessionLocal() as db:
        try:
            await svc.run_site_crawl_audit(db, ws_id, audit_id)
            await db.commit()
        except Exception:  # noqa: BLE001
            await db.rollback()
            # Mark the audit failed so it doesn't hang in 'running' forever.
            try:
                audit = await svc.get_site_audit(db, ws_id, audit_id)
                if audit is not None and audit.status == "running":
                    await svc.finalize_site_audit(
                        db, audit, score=0, issues=audit.issues or [],
                        pages_crawled=audit.pages_crawled, status="failed",
                    )
                    await db.commit()
            except Exception:  # noqa: BLE001
                await db.rollback()


@router.post("/site-audit", response_model=SiteAuditOut)
async def run_site_audit(
    body: SiteAuditIn,
    background: BackgroundTasks,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Kick off a multi-page site audit in the background; returns the running row."""
    audit = await svc.create_site_audit(db, ctx.workspace.id, body.url, body.max_pages)
    await db.commit()
    await db.refresh(audit)
    background.add_task(_run_site_audit_bg, ctx.workspace.id, audit.id)
    return audit


@router.get("/site-audits", response_model=list[SiteAuditOut])
async def list_site_audits(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_site_audits(db, ctx.workspace.id)


@router.get("/site-audits/{audit_id}", response_model=SiteAuditOut)
async def get_site_audit(
    audit_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    audit = await svc.get_site_audit(db, ctx.workspace.id, audit_id)
    if audit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site audit not found")
    return audit


# --------------------------------------------------------------------------- #
# Content scoring + gaps + share of voice
# --------------------------------------------------------------------------- #
@router.post("/content-score")
async def content_score(
    body: ContentScoreIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Score draft text or a live URL against real SERP research for the keyword."""
    payload = (body.url or body.text or "").strip()
    if not payload:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Provide either 'text' or 'url'")
    return await svc.score_content_for_keyword(body.keyword, payload)


@router.get("/content-gaps")
async def content_gaps(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Subtopics/questions competitors cover for tracked keywords but the site misses."""
    return await svc.content_gaps_v2(db, ctx.workspace.id)


@router.get("/share-of-voice")
async def share_of_voice(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Weighted visibility across tracked, ranked keywords."""
    return await svc.share_of_voice(db, ctx.workspace.id)


# --------------------------------------------------------------------------- #
# Audits
# --------------------------------------------------------------------------- #
@router.post("/audit", response_model=AuditOut)
async def run_audit(
    body: AuditIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    audit = await svc.create_audit(db, ctx.workspace.id, body.url)
    result = await agent.audit_page(db, ctx.workspace.id, body.url, body.html_or_meta)
    audit = await svc.finalize_audit(
        db, audit, score=result.get("score", 0), issues=result.get("issues", [])
    )
    await db.commit()
    await db.refresh(audit)
    return audit


@router.get("/audits", response_model=list[AuditOut])
async def list_audits(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_audits(db, ctx.workspace.id)


@router.get("/audits/{audit_id}", response_model=AuditOut)
async def get_audit(
    audit_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    audit = await svc.get_audit(db, ctx.workspace.id, audit_id)
    if audit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Audit not found")
    return audit


# --------------------------------------------------------------------------- #
# Content briefs (AI)
# --------------------------------------------------------------------------- #
@router.post("/briefs", response_model=BriefOut)
async def create_brief(
    body: BriefIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    data = await agent.content_brief(db, ctx.workspace.id, body.keyword)
    brief = await svc.save_brief(
        db,
        ctx.workspace.id,
        target_keyword=body.keyword,
        title=data.get("title"),
        outline={
            "outline": data.get("outline"),
            "key_questions": data.get("key_questions"),
            "entities": data.get("entities"),
            "internal_link_suggestions": data.get("internal_link_suggestions"),
            "secondary_keywords": data.get("secondary_keywords"),
            "meta_description": data.get("meta_description"),
            "search_intent": data.get("search_intent"),
            "serp_research": data.get("serp_research"),
        },
        word_count_target=data.get("word_count_target"),
        brief_md=data.get("brief_md"),
        status="ready",
    )
    await emit_event(
        db,
        ctx.workspace.id,
        "seo.brief.created",
        {
            "brief_id": str(brief.id),
            "target_keyword": brief.target_keyword,
            "generated_by": data.get("generated_by"),
        },
    )
    await db.commit()
    await db.refresh(brief)
    return brief


@router.get("/briefs", response_model=list[BriefOut])
async def list_briefs(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_briefs(db, ctx.workspace.id)


# --------------------------------------------------------------------------- #
# Overview + autonomous cycle
# --------------------------------------------------------------------------- #
@router.get("/overview")
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.overview(db, ctx.workspace.id)


@router.post("/agent/run")
async def run_agent(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await agent.run_cycle(db, ctx.workspace.id)
    for drop in result.get("rank_drops", []):
        await emit_event(db, ctx.workspace.id, "seo.rank.drop", drop)
    await db.commit()
    return result


# --------------------------------------------------------------------------- #
# SERP Features
# --------------------------------------------------------------------------- #
class SerpFeaturesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    keyword_id: uuid.UUID
    features: list | None = None
    detected_at: datetime | None = None


@router.get("/serp-features", response_model=list[SerpFeaturesOut])
async def list_serp_features(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_serp_features(db, ctx.workspace.id)


@router.post("/keywords/{keyword_id}/detect-serp-features")
async def detect_serp_features(
    keyword_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Scrape the live SERP for the keyword term and detect likely SERP features."""
    kw = await svc.get_keyword(db, ctx.workspace.id, keyword_id)
    if kw is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Keyword not found")
    result = await svc.detect_serp_features_for_keyword(db, ctx.workspace.id, kw)
    await db.commit()
    return result


# --------------------------------------------------------------------------- #
# Competitor keyword gap
# --------------------------------------------------------------------------- #
class CompetitorGapIn(BaseModel):
    your_domain: str = Field(min_length=1, max_length=255)
    competitor_domains: list[str] = Field(min_length=1, max_length=3)
    keywords: list[str] | None = None


@router.post("/competitor-gap")
async def competitor_gap(
    body: CompetitorGapIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Compare your SERP positions against competitors for tracked or supplied keywords."""
    return await svc.competitor_keyword_gap(
        db,
        ctx.workspace.id,
        body.your_domain,
        body.competitor_domains,
        keyword_terms=body.keywords,
    )


# --------------------------------------------------------------------------- #
# Internal link graph
# --------------------------------------------------------------------------- #
class LinkGraphIn(BaseModel):
    site_audit_id: uuid.UUID | None = None
    base_url: str | None = Field(default=None, max_length=1000)


class LinkGraphOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    site_audit_id: uuid.UUID | None = None
    base_url: str
    graph: dict | None = None
    orphan_pages: list | None = None
    suggestions: list | None = None
    status: str
    created_at: datetime


async def _run_link_graph_bg(ws_id: uuid.UUID, graph_id: uuid.UUID) -> None:
    """Background worker: build the link graph in a fresh DB session."""
    async with AsyncSessionLocal() as db:
        try:
            await svc.build_link_graph(db, ws_id, graph_id=graph_id)
            await db.commit()
        except Exception:  # noqa: BLE001
            await db.rollback()
            try:
                graph = await svc.get_link_graph(db, ws_id, graph_id)
                if graph is not None and graph.status == "running":
                    graph.status = "failed"
                    await db.commit()
            except Exception:  # noqa: BLE001
                await db.rollback()


@router.post("/link-graph", response_model=LinkGraphOut)
async def build_link_graph(
    body: LinkGraphIn,
    background: BackgroundTasks,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Kick off internal link graph computation in the background; returns running row."""
    base_url = (body.base_url or "").strip() or None
    if base_url is None and body.site_audit_id is not None:
        audit = await svc.get_site_audit(db, ctx.workspace.id, body.site_audit_id)
        if audit is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Site audit not found")
        base_url = audit.base_url
    if not base_url:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Provide either 'base_url' or a valid 'site_audit_id'"
        )

    graph = await svc.create_link_graph(
        db, ctx.workspace.id, base_url=base_url, site_audit_id=body.site_audit_id
    )
    await db.commit()
    await db.refresh(graph)
    background.add_task(_run_link_graph_bg, ctx.workspace.id, graph.id)
    return graph


@router.get("/link-graphs", response_model=list[LinkGraphOut])
async def list_link_graphs(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_link_graphs(db, ctx.workspace.id)


# --------------------------------------------------------------------------- #
# Schema / JSON-LD generator
# --------------------------------------------------------------------------- #
class SchemaGenerateIn(BaseModel):
    schema_type: str = Field(min_length=1, max_length=60)  # Article|Product|FAQ|HowTo|Organization|BreadcrumbList
    fields: dict


@router.post("/schema/generate")
async def generate_schema(
    body: SchemaGenerateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Build a JSON-LD object + <script> tag for the given schema type and fields."""
    return svc.generate_schema_jsonld(body.schema_type, body.fields)


class SchemaValidateIn(BaseModel):
    jsonld: dict


@router.post("/schema/validate")
async def validate_schema(
    body: SchemaValidateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Validate required properties for a JSON-LD object's @type."""
    return svc.validate_schema_jsonld(body.jsonld)


# --------------------------------------------------------------------------- #
# Topical authority map
# --------------------------------------------------------------------------- #
class TopicClusterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    topic: str
    keywords: list | None = None
    keyword_ids: list | None = None
    coverage_pct: int
    authority_score: int
    pillar_gaps: list | None = None
    computed_at: datetime | None = None


@router.post("/topics/compute")
async def compute_topics(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Cluster tracked keywords into topics and score topical authority."""
    clusters = await svc.compute_topic_clusters(db, ctx.workspace.id)
    await db.commit()
    return clusters


@router.get("/topics", response_model=list[TopicClusterOut])
async def list_topics(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_topic_clusters(db, ctx.workspace.id)


# --------------------------------------------------------------------------- #
# Enhanced content score
# --------------------------------------------------------------------------- #
class ContentScoreEnhancedIn(BaseModel):
    keyword: str = Field(min_length=1, max_length=300)
    text: str = Field(min_length=1, max_length=200000)


@router.post("/content-score-enhanced")
async def content_score_enhanced(
    body: ContentScoreEnhancedIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Score draft text against SERP research with a letter grade + term gaps."""
    return await svc.score_content_enhanced(body.keyword, body.text)


# --------------------------------------------------------------------------- #
# Backlinks
# --------------------------------------------------------------------------- #
class BacklinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    source_url: str
    target_url: str
    anchor_text: str | None = None
    referring_domain: str
    first_seen: datetime | None = None
    source_file: str | None = None
    created_at: datetime


class ReferringDomainOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    domain: str
    backlink_count: int
    first_seen: datetime | None = None
    created_at: datetime


class BacklinkUploadIn(BaseModel):
    csv_content: str = Field(min_length=1, max_length=5_000_000)
    filename: str = Field(default="backlinks.csv", max_length=200)


@router.get("/backlinks", response_model=list[BacklinkOut])
async def list_backlinks(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_backlinks(db, ctx.workspace.id)


@router.get("/referring-domains", response_model=list[ReferringDomainOut])
async def list_referring_domains(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_referring_domains(db, ctx.workspace.id)


@router.post("/backlinks/upload")
async def upload_backlinks(
    body: BacklinkUploadIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Import a GSC-style backlinks CSV (sent as text in ``csv_content``)."""
    result = await svc.upload_backlinks_csv(
        db, ctx.workspace.id, body.csv_content, body.filename
    )
    await db.commit()
    return result


# --------------------------------------------------------------------------- #
# Track all keywords
# --------------------------------------------------------------------------- #
class TrackAllIn(BaseModel):
    domain: str = Field(min_length=1, max_length=255)


async def _run_track_all_bg(ws_id: uuid.UUID, domain: str) -> None:
    """Background worker: SERP-check all tracked keywords in a fresh session."""
    async with AsyncSessionLocal() as db:
        try:
            result = await svc.track_all_keywords(db, ws_id, domain)
            for res in result.get("results", []):
                if res.get("status") == "recorded":
                    delta = res.get("delta")
                    if delta is not None and delta < 0:
                        await emit_event(
                            db,
                            ws_id,
                            "seo.rank.drop",
                            {
                                "keyword_id": res.get("keyword_id"),
                                "term": res.get("term"),
                                "current_rank": res.get("rank"),
                                "previous_rank": res.get("previous_rank"),
                                "drop": abs(delta),
                            },
                        )
            await db.commit()
        except Exception:  # noqa: BLE001
            await db.rollback()


@router.post("/track-all")
async def track_all(
    body: TrackAllIn,
    background: BackgroundTasks,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Kick off a SERP rank check for every tracked keyword against ``domain``."""
    keywords = await svc.list_keywords(db, ctx.workspace.id)
    tracked = [k for k in keywords if k.is_tracked]
    if not tracked:
        return {"status": "awaiting_data", "detail": "No tracked keywords.", "scheduled": 0}
    background.add_task(_run_track_all_bg, ctx.workspace.id, body.domain)
    return {"status": "scheduled", "scheduled": len(tracked), "domain": body.domain}
