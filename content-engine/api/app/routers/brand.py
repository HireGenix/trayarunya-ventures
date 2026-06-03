"""Brand Brain routes: build (scrape + LLM) and fetch the workspace brand identity."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.brand_agent import build_brand
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import BrandBrain
from app.schemas import BrandBuildRequest, BrandOut

router = APIRouter(prefix="/brand", tags=["brand"])


async def _get_brand(db: AsyncSession, workspace_id) -> BrandBrain | None:
    res = await db.execute(
        select(BrandBrain).where(BrandBrain.workspace_id == workspace_id)
    )
    return res.scalar_one_or_none()


@router.get("", response_model=BrandOut | None)
async def get_brand(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    brand = await _get_brand(db, ctx.workspace.id)
    return BrandOut.model_validate(brand) if brand else None


@router.post("", response_model=BrandOut)
async def build_brand_brain(
    data: BrandBuildRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> BrandOut:
    result = await build_brand(data.website)
    if result.get("error") and not result.get("value_prop"):
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Could not read site: {result['error']}",
        )

    brand = await _get_brand(db, ctx.workspace.id)
    if brand is None:
        brand = BrandBrain(workspace_id=ctx.workspace.id)
        db.add(brand)

    brand.website = result.get("website")
    brand.primary_color = result.get("primary_color")
    brand.accent_color = result.get("accent_color")
    brand.logo_url = result.get("logo_url")
    brand.mission = result.get("mission")
    brand.value_prop = result.get("value_prop")
    brand.voice = result.get("voice")
    brand.audience = result.get("audience")
    brand.pillars = result.get("pillars")
    brand.keywords = result.get("keywords")
    brand.profile = result.get("profile")

    # Persist the discovered website onto the workspace too.
    if result.get("website") and not ctx.workspace.website:
        ctx.workspace.website = result["website"]

    await db.flush()
    await db.commit()
    await db.refresh(brand)
    return BrandOut.model_validate(brand)
