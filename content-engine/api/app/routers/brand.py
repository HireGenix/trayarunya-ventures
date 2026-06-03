"""Brand Brain routes: build (scrape + LLM) and fetch the workspace brand identity."""
from __future__ import annotations

import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.brand_agent import build_brand
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import BrandBrain, ContentImage
from app.schemas import BrandBuildRequest, BrandOut, BrandUpdate

router = APIRouter(prefix="/brand", tags=["brand"])


async def _get_brand(db: AsyncSession, workspace_id) -> BrandBrain | None:
    res = await db.execute(
        select(BrandBrain).where(BrandBrain.workspace_id == workspace_id)
    )
    return res.scalar_one_or_none()


async def _ensure_brand(db: AsyncSession, workspace_id) -> BrandBrain:
    brand = await _get_brand(db, workspace_id)
    if brand is None:
        brand = BrandBrain(workspace_id=workspace_id)
        db.add(brand)
        await db.flush()
    return brand


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


@router.patch("", response_model=BrandOut)
async def update_brand(
    data: BrandUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> BrandOut:
    """Manually edit brand colors / logo / mission / value prop."""
    brand = await _ensure_brand(db, ctx.workspace.id)
    fields = data.model_dump(exclude_unset=True)
    for key, value in fields.items():
        setattr(brand, key, value)
    await db.flush()
    await db.commit()
    await db.refresh(brand)
    return BrandOut.model_validate(brand)


@router.post("/logo", response_model=BrandOut)
async def upload_logo(
    file: UploadFile = File(...),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> BrandOut:
    """Upload a brand logo; stored as a workspace asset and linked on the brand."""
    raw = await file.read()
    if not raw:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Logo too large (max 5MB)")
    mime = file.content_type or "image/png"
    if not mime.startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be an image")

    img = ContentImage(
        workspace_id=ctx.workspace.id,
        content_item_id=None,
        created_by=ctx.user.id,
        prompt="brand logo upload",
        provider="upload",
        style="logo",
        size=None,
        mime=mime,
        data_b64=base64.b64encode(raw).decode("ascii"),
        meta={"kind": "logo"},
    )
    db.add(img)
    await db.flush()

    brand = await _ensure_brand(db, ctx.workspace.id)
    brand.logo_url = f"/api/v1/images/{img.id}/raw"
    await db.flush()
    await db.commit()
    await db.refresh(brand)
    return BrandOut.model_validate(brand)
