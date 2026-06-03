"""Billing routes (M6): list plans, current plan + usage summary."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    AdAccount,
    ContentItem,
    Organization,
    Plan,
    ResearchJob,
    SocialAccount,
)
from app.schemas import BillingSummary, PlanOut, UsageOut

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans", response_model=list[PlanOut])
async def list_plans(db: AsyncSession = Depends(get_db)) -> list[PlanOut]:
    res = await db.execute(select(Plan).order_by(Plan.price_monthly.asc()))
    return [PlanOut.model_validate(p) for p in res.scalars().all()]


@router.get("/summary", response_model=BillingSummary)
async def billing_summary(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> BillingSummary:
    org = await db.get(Organization, ctx.workspace.organization_id)
    plan_code = org.plan if org else "free"
    plan_row = (
        await db.execute(select(Plan).where(Plan.code == plan_code))
    ).scalar_one_or_none()

    async def _count(model) -> int:
        return (
            await db.execute(
                select(func.count(model.id)).where(
                    model.workspace_id == ctx.workspace.id
                )
            )
        ).scalar() or 0

    usage = [
        UsageOut(metric="research_jobs", quantity=await _count(ResearchJob), period=date.today()),
        UsageOut(metric="content_items", quantity=await _count(ContentItem), period=date.today()),
        UsageOut(metric="social_accounts", quantity=await _count(SocialAccount), period=date.today()),
        UsageOut(metric="ad_accounts", quantity=await _count(AdAccount), period=date.today()),
    ]

    return BillingSummary(
        plan=PlanOut.model_validate(plan_row) if plan_row else None,
        usage=usage,
    )
