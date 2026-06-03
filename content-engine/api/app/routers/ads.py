"""Ads routes (M5): ad accounts, AI campaign generation, list and status updates."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.ads_strategist import generate_campaign
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    AdAccount,
    AdPlatform,
    BrandBrain,
    Campaign,
    CampaignStatus,
    Strategy,
)
from app.schemas import (
    AdAccountCreate,
    AdAccountOut,
    CampaignGenerateRequest,
    CampaignOut,
)

router = APIRouter(prefix="/ads", tags=["ads"])


@router.get("/accounts", response_model=list[AdAccountOut])
async def list_accounts(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[AdAccountOut]:
    res = await db.execute(
        select(AdAccount).where(AdAccount.workspace_id == ctx.workspace.id)
    )
    return [AdAccountOut.model_validate(a) for a in res.scalars().all()]


@router.post("/accounts", response_model=AdAccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AdAccountCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AdAccountOut:
    try:
        platform = AdPlatform(data.platform)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported ad platform")
    account = AdAccount(
        workspace_id=ctx.workspace.id,
        platform=platform,
        name=data.name,
        external_id=data.external_id,
        is_grant=data.is_grant,
    )
    db.add(account)
    await db.flush()
    await db.commit()
    await db.refresh(account)
    return AdAccountOut.model_validate(account)


@router.post("/campaigns/generate", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def generate(
    data: CampaignGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignOut:
    account = await db.get(AdAccount, data.ad_account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ad account not found")

    brand_row = (
        await db.execute(
            select(BrandBrain).where(BrandBrain.workspace_id == ctx.workspace.id)
        )
    ).scalar_one_or_none()
    brand = (
        {
            "value_prop": brand_row.value_prop,
            "audience": brand_row.audience,
            "keywords": brand_row.keywords,
        }
        if brand_row
        else None
    )
    strategy = None
    if data.strategy_id:
        srow = await db.get(Strategy, data.strategy_id)
        if srow and srow.workspace_id == ctx.workspace.id:
            strategy = {"positioning": srow.positioning, "funnel": srow.funnel}

    try:
        plan = await generate_campaign(
            objective=data.objective,
            product=data.product,
            is_grant=account.is_grant,
            daily_budget=data.daily_budget,
            brand=brand,
            strategy=strategy,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Campaign generation failed: {exc}")

    campaign = Campaign(
        workspace_id=ctx.workspace.id,
        ad_account_id=account.id,
        name=plan.get("name", data.product)[:300],
        objective=data.objective,
        status=CampaignStatus.draft,
        daily_budget=data.daily_budget or plan.get("recommended_daily_budget"),
        plan=plan,
        assets={"ad_groups": plan.get("ad_groups", [])},
    )
    db.add(campaign)
    await db.flush()
    await db.commit()
    await db.refresh(campaign)
    return CampaignOut.model_validate(campaign)


@router.get("/campaigns", response_model=list[CampaignOut])
async def list_campaigns(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[CampaignOut]:
    res = await db.execute(
        select(Campaign)
        .where(Campaign.workspace_id == ctx.workspace.id)
        .order_by(Campaign.created_at.desc())
    )
    return [CampaignOut.model_validate(c) for c in res.scalars().all()]


@router.get("/campaigns/{campaign_id}", response_model=CampaignOut)
async def get_campaign(
    campaign_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignOut:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None or campaign.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return CampaignOut.model_validate(campaign)


@router.patch("/campaigns/{campaign_id}/status", response_model=CampaignOut)
async def update_status(
    campaign_id: uuid.UUID,
    new_status: str,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignOut:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None or campaign.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    try:
        campaign.status = CampaignStatus(new_status)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid status")
    await db.flush()
    await db.commit()
    await db.refresh(campaign)
    return CampaignOut.model_validate(campaign)
