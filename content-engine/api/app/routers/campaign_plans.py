"""Campaign Builder routes.

Assemble a full campaign pack (timeline, assets, budget split, measurement plan)
from a goal/audience/offer, grounded in the workspace brand brain and optionally a
referenced insight/strategy. Campaign plans can then be turned into draft
ContentItem rows, making them immediately actionable in the Creation Studio.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    BrandBrain,
    CampaignPlan,
    ContentItem,
    ContentStatus,
    ContentType,
    Insight,
    Strategy,
)
from app.services.campaign_builder import build_campaign_pack

router = APIRouter(prefix="/campaign-plans", tags=["campaign-plans"])


# --------------------------------------------------------------------------- #
# Schemas (inline)
# --------------------------------------------------------------------------- #
class CampaignBuildRequest(BaseModel):
    name: str | None = None
    goal: str
    audience: str | None = None
    offer: str | None = None
    channels: list[str] | None = None
    budget: float | None = None
    source_insight_id: uuid.UUID | None = None
    source_strategy_id: uuid.UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    status: str | None = Field(default=None, pattern="^(draft|active|completed|archived)$")
    budget: float | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class CampaignPlanOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    goal: str | None = None
    audience: str | None = None
    offer: str | None = None
    channels: list[Any] | None = None
    plan: dict[str, Any] | None = None
    source_insight_id: uuid.UUID | None = None
    source_strategy_id: uuid.UUID | None = None
    budget: float | None = None
    status: str
    start_date: datetime | None = None
    end_date: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ToContentResult(BaseModel):
    created_item_ids: list[uuid.UUID]
    count: int


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
async def _load_brand(db: AsyncSession, workspace_id: uuid.UUID) -> dict | None:
    brand = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == workspace_id))
    ).scalar_one_or_none()
    if not brand:
        return None
    return {
        "mission": brand.mission,
        "value_prop": brand.value_prop,
        "voice": brand.voice,
        "audience": brand.audience,
        "pillars": brand.pillars,
        "keywords": brand.keywords,
    }


async def _get_owned(
    db: AsyncSession, plan_id: uuid.UUID, workspace_id: uuid.UUID
) -> CampaignPlan:
    plan = await db.get(CampaignPlan, plan_id)
    if not plan or plan.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign plan not found")
    return plan


def _coerce_content_type(value: str | None) -> ContentType:
    try:
        return ContentType(value)
    except (ValueError, TypeError):
        return ContentType.social_post


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@router.get("", response_model=list[CampaignPlanOut])
async def list_campaign_plans(
    plan_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[CampaignPlanOut]:
    stmt = select(CampaignPlan).where(CampaignPlan.workspace_id == ctx.workspace.id)
    if plan_status:
        stmt = stmt.where(CampaignPlan.status == plan_status)
    stmt = stmt.order_by(CampaignPlan.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return [CampaignPlanOut.model_validate(p) for p in res.scalars().all()]


@router.post("/build", response_model=CampaignPlanOut, status_code=status.HTTP_201_CREATED)
async def build_campaign(
    body: CampaignBuildRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignPlanOut:
    ws_id = ctx.workspace.id
    brand = await _load_brand(db, ws_id)

    insight_payload: dict | None = None
    if body.source_insight_id is not None:
        insight = await db.get(Insight, body.source_insight_id)
        if not insight or insight.workspace_id != ws_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Source insight not found")
        insight_payload = {
            "text": insight.text,
            "kind": insight.kind,
            "intent": insight.intent,
        }

    strategy_payload: dict | None = None
    if body.source_strategy_id is not None:
        strategy = await db.get(Strategy, body.source_strategy_id)
        if not strategy or strategy.workspace_id != ws_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Source strategy not found")
        strategy_payload = {
            "title": strategy.title,
            "objective": strategy.objective,
            "positioning": strategy.positioning,
            "pillars": strategy.pillars,
            "kpis": strategy.kpis,
        }

    inputs = {
        "name": body.name,
        "goal": body.goal,
        "audience": body.audience,
        "offer": body.offer,
        "channels": body.channels,
        "budget": body.budget,
        "start_date": body.start_date,
        "insight": insight_payload,
        "strategy": strategy_payload,
    }

    pack = await build_campaign_pack(brand, inputs)

    plan = CampaignPlan(
        workspace_id=ws_id,
        name=body.name or pack.get("name") or f"Campaign: {body.goal}",
        goal=body.goal,
        audience=body.audience,
        offer=body.offer,
        channels=body.channels,
        plan=pack,
        source_insight_id=body.source_insight_id,
        source_strategy_id=body.source_strategy_id,
        budget=body.budget,
        status="draft",
        start_date=body.start_date,
        end_date=body.end_date,
    )
    db.add(plan)
    await db.flush()
    await db.refresh(plan)
    return CampaignPlanOut.model_validate(plan)


@router.get("/{plan_id}", response_model=CampaignPlanOut)
async def get_campaign_plan(
    plan_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignPlanOut:
    plan = await _get_owned(db, plan_id, ctx.workspace.id)
    return CampaignPlanOut.model_validate(plan)


@router.patch("/{plan_id}", response_model=CampaignPlanOut)
async def update_campaign_plan(
    plan_id: uuid.UUID,
    body: CampaignUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignPlanOut:
    plan = await _get_owned(db, plan_id, ctx.workspace.id)
    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(plan, field, value)
    await db.flush()
    await db.refresh(plan)
    return CampaignPlanOut.model_validate(plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign_plan(
    plan_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    plan = await _get_owned(db, plan_id, ctx.workspace.id)
    await db.delete(plan)


@router.post("/{plan_id}/to-content", response_model=ToContentResult)
async def campaign_to_content(
    plan_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ToContentResult:
    plan = await _get_owned(db, plan_id, ctx.workspace.id)
    pack = plan.plan if isinstance(plan.plan, dict) else {}
    assets = pack.get("assets") if isinstance(pack.get("assets"), list) else []

    created_ids: list[uuid.UUID] = []
    for asset in assets:
        if not isinstance(asset, dict):
            continue
        if not asset.get("to_content", True):
            continue
        title = asset.get("title") or asset.get("type") or plan.name
        item = ContentItem(
            workspace_id=ctx.workspace.id,
            strategy_id=plan.source_strategy_id,
            created_by=ctx.user.id,
            content_type=_coerce_content_type(asset.get("content_type")),
            status=ContentStatus.draft,
            platform=asset.get("channel"),
            title=title,
            body=asset.get("brief") or "",
            meta={
                "campaign_plan_id": str(plan.id),
                "campaign_name": plan.name,
                "asset_type": asset.get("type"),
            },
        )
        db.add(item)
        await db.flush()
        created_ids.append(item.id)

    return ToContentResult(created_item_ids=created_ids, count=len(created_ids))
