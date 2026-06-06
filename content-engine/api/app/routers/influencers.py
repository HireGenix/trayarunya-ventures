"""Influencers API — creator CRM, AI outreach, campaigns, UGC rights, overview.

All endpoints are workspace-scoped via ``get_workspace_ctx`` and every query is
filtered by ``ctx.workspace.id``. Meaningful actions emit automation events.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import influencers_agent as agent
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.services import influencers as svc
from app.services import influencers_enterprise as ent_svc
from app.services.automation import emit_event

router = APIRouter(prefix="/influencers", tags=["influencers"])


# --------------------------------------------------------------------------- #
# Schemas (inline, like routers/cro.py)
# --------------------------------------------------------------------------- #
class CreatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    handle: str
    name: str
    platform: str
    followers: int | None = None
    engagement_rate: float | None = None
    niche: str | None = None
    email: str | None = None
    stage: str
    rate_card: float | None = None
    notes: str | None = None
    tags: list | None = None
    avg_likes: int | None = None
    avg_comments: int | None = None
    avg_views: int | None = None
    quality_score: float | None = None
    fraud_risk: float | None = None
    fraud_flags: list[str] | None = None
    tier: str | None = None
    created_at: datetime


class CreatorCreateIn(BaseModel):
    handle: str = Field(min_length=1, max_length=200)
    name: str | None = Field(default=None, max_length=200)
    platform: str = "instagram"
    followers: int | None = Field(default=None, ge=0)
    engagement_rate: float | None = Field(default=None, ge=0)
    niche: str | None = None
    email: str | None = None
    stage: str = "prospect"
    rate_card: float | None = Field(default=None, ge=0)
    notes: str | None = None
    tags: list[str] | None = None
    avg_likes: int | None = Field(default=None, ge=0)
    avg_comments: int | None = Field(default=None, ge=0)
    avg_views: int | None = Field(default=None, ge=0)


class CreatorUpdateIn(BaseModel):
    handle: str | None = Field(default=None, max_length=200)
    name: str | None = Field(default=None, max_length=200)
    platform: str | None = None
    followers: int | None = Field(default=None, ge=0)
    engagement_rate: float | None = Field(default=None, ge=0)
    niche: str | None = None
    email: str | None = None
    stage: str | None = None
    rate_card: float | None = Field(default=None, ge=0)
    notes: str | None = None
    tags: list[str] | None = None
    avg_likes: int | None = Field(default=None, ge=0)
    avg_comments: int | None = Field(default=None, ge=0)
    avg_views: int | None = Field(default=None, ge=0)


class OutreachOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    creator_id: uuid.UUID
    channel: str
    subject: str | None = None
    body: str
    status: str
    sent_at: str | None = None
    created_at: datetime


class OutreachIn(BaseModel):
    goal: str = Field(default="Explore a collaboration", max_length=2000)
    send: bool = False


class MatchIn(BaseModel):
    brief: str = Field(min_length=1, max_length=4000)


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    brief: str | None = None
    budget: float | None = None
    status: str
    deliverables: list | None = None
    creator_ids: list | None = None
    spend: float | None = None
    impressions: int | None = None
    clicks: int | None = None
    conversions: int | None = None
    created_at: datetime


class CampaignCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    brief: str | None = None
    budget: float | None = Field(default=None, ge=0)
    status: str = "planning"
    deliverables: list[str] | None = None
    creator_ids: list[uuid.UUID] | None = None
    spend: float | None = Field(default=None, ge=0)
    impressions: int | None = Field(default=None, ge=0)
    clicks: int | None = Field(default=None, ge=0)
    conversions: int | None = Field(default=None, ge=0)


class UGCOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    creator_id: uuid.UUID | None = None
    url: str
    type: str
    usage_rights: str
    status: str
    source: str | None = None
    created_at: datetime


class UGCCreateIn(BaseModel):
    url: str = Field(min_length=1, max_length=1000)
    creator_id: uuid.UUID | None = None
    type: str = "image"
    usage_rights: str = "none"
    status: str = "pending"
    source: str | None = None


class RightsIn(BaseModel):
    usage_rights: str = Field(description="none | requested | granted")


# --------------------------------------------------------------------------- #
# Creators
# --------------------------------------------------------------------------- #
@router.get("/creators", response_model=list[CreatorOut])
async def list_creators(
    stage: str | None = None,
    tier: str | None = None,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_creators(db, ctx.workspace.id, stage=stage, tier=tier)


@router.post("/creators", response_model=CreatorOut, status_code=status.HTTP_201_CREATED)
async def create_creator(
    body: CreatorCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    creator = await svc.create_creator(db, ctx.workspace.id, body.model_dump())
    await emit_event(
        db, ctx.workspace.id, "influencer.creator.added",
        {"creator_id": str(creator.id), "handle": creator.handle},
    )
    await db.commit()
    await db.refresh(creator)
    return creator


@router.get("/creators/{creator_id}", response_model=CreatorOut)
async def get_creator(
    creator_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    creator = await svc.get_creator(db, ctx.workspace.id, creator_id)
    if creator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Creator not found")
    return creator


@router.patch("/creators/{creator_id}", response_model=CreatorOut)
async def update_creator(
    creator_id: uuid.UUID,
    body: CreatorUpdateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    creator = await svc.get_creator(db, ctx.workspace.id, creator_id)
    if creator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Creator not found")
    prev_stage = creator.stage
    creator = await svc.update_creator(db, creator, body.model_dump(exclude_unset=True))
    if creator.stage != prev_stage:
        await emit_event(
            db, ctx.workspace.id, "influencer.creator.stage_changed",
            {"creator_id": str(creator.id), "from": prev_stage, "to": creator.stage},
        )
    await db.commit()
    await db.refresh(creator)
    return creator


# --------------------------------------------------------------------------- #
# AI outreach (agent draft + store)
# --------------------------------------------------------------------------- #
@router.post("/creators/{creator_id}/outreach", response_model=OutreachOut)
async def draft_outreach(
    creator_id: uuid.UUID,
    body: OutreachIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    creator = await svc.get_creator(db, ctx.workspace.id, creator_id)
    if creator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Creator not found")

    draft = await agent.outreach_draft(db, ctx.workspace.id, creator_id, body.goal)
    if draft.get("error"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Creator not found")

    row = await svc.create_outreach(
        db,
        ctx.workspace.id,
        creator_id,
        channel=draft.get("channel", "email"),
        body=draft.get("body", ""),
        subject=draft.get("subject"),
        status="drafted",
    )
    if body.send:
        row = await svc.mark_outreach_sent(db, row)
        await emit_event(
            db, ctx.workspace.id, "influencer.outreach.sent",
            {
                "creator_id": str(creator_id),
                "outreach_id": str(row.id),
                "channel": row.channel,
            },
        )
    await db.commit()
    await db.refresh(row)
    return row


# --------------------------------------------------------------------------- #
# AI match — ideal creator persona for a brief
# --------------------------------------------------------------------------- #
@router.post("/match")
async def match_brief(
    body: MatchIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await agent.find_match_brief(db, ctx.workspace.id, body.brief)


# --------------------------------------------------------------------------- #
# Campaigns
# --------------------------------------------------------------------------- #
@router.get("/campaigns", response_model=list[CampaignOut])
async def list_campaigns(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_campaigns(db, ctx.workspace.id)


@router.post("/campaigns", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    camp = await svc.create_campaign(db, ctx.workspace.id, body.model_dump())
    await emit_event(
        db, ctx.workspace.id, "influencer.campaign.created",
        {"campaign_id": str(camp.id), "name": camp.name},
    )
    await db.commit()
    await db.refresh(camp)
    return camp


# --------------------------------------------------------------------------- #
# UGC assets + rights
# --------------------------------------------------------------------------- #
@router.get("/ugc", response_model=list[UGCOut])
async def list_ugc(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_ugc(db, ctx.workspace.id)


@router.post("/ugc", response_model=UGCOut, status_code=status.HTTP_201_CREATED)
async def create_ugc(
    body: UGCCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    asset = await svc.create_ugc(db, ctx.workspace.id, body.model_dump())
    await emit_event(
        db, ctx.workspace.id, "ugc.asset.added",
        {"asset_id": str(asset.id), "type": asset.type},
    )
    await db.commit()
    await db.refresh(asset)
    return asset


@router.post("/ugc/{asset_id}/rights", response_model=UGCOut)
async def set_rights(
    asset_id: uuid.UUID,
    body: RightsIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    asset = await svc.get_ugc(db, ctx.workspace.id, asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    asset = await svc.set_ugc_rights(db, asset, body.usage_rights)
    if asset.usage_rights == "granted":
        await emit_event(
            db, ctx.workspace.id, "ugc.rights.granted",
            {"asset_id": str(asset.id), "creator_id": str(asset.creator_id) if asset.creator_id else None},
        )
    await db.commit()
    await db.refresh(asset)
    return asset


# --------------------------------------------------------------------------- #
# Enterprise: scoring, fraud, ROI, outreach draft
# --------------------------------------------------------------------------- #
@router.post("/creators/score-all")
async def score_all(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Batch-recompute engagement, quality, fraud, tier for all creators."""
    # Pull ICP keywords for fit scoring
    icp_kw: list | None = None
    try:
        from app.models.icp import ICPProfile
        icp = (
            await db.execute(
                __import__("sqlalchemy").select(ICPProfile).where(
                    ICPProfile.workspace_id == ctx.workspace.id
                )
            )
        ).scalar_one_or_none()
        if icp and icp.keywords:
            icp_kw = icp.keywords
    except Exception:
        pass
    creators = await ent_svc.score_all_creators(db, ctx.workspace.id, icp_keywords=icp_kw)
    await db.commit()
    return {"scored": len(creators)}


@router.get("/campaigns/{campaign_id}/roi")
async def campaign_roi(
    campaign_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await ent_svc.get_campaign_roi(db, ctx.workspace.id, campaign_id)
    if result.get("error"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, result["error"])
    return result


@router.get("/campaigns/roi")
async def all_campaigns_roi(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await ent_svc.get_all_campaigns_roi(db, ctx.workspace.id)


class OutreachDraftIn(BaseModel):
    goal: str = Field(default="Explore a collaboration", max_length=2000)


@router.post("/creators/{creator_id}/draft-outreach")
async def enterprise_outreach_draft(
    creator_id: uuid.UUID,
    body: OutreachDraftIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Enterprise outreach: LLM draft with deterministic fallback. Draft only."""
    creator = await svc.get_creator(db, ctx.workspace.id, creator_id)
    if creator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Creator not found")
    draft = await agent.outreach_draft(db, ctx.workspace.id, creator_id, body.goal)
    if draft.get("error"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Creator not found")
    return draft


# --------------------------------------------------------------------------- #
# Overview + autonomy cycle
# --------------------------------------------------------------------------- #
@router.get("/overview")
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.compute_overview(db, ctx.workspace.id)


@router.post("/agent/run")
async def run_agent(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await agent.run_cycle(db, ctx.workspace.id)
