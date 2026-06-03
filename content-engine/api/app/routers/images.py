"""Image generation routes — Canva/Gamma-style social graphics.

Generate an AI image (optionally brand-aware and tied to a content item),
persist the PNG in Postgres (base64), list/delete, and serve the raw bytes.
"""
from __future__ import annotations

import base64
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.image_agent import create_social_image
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import BrandBrain, ContentImage, ContentItem
from app.schemas import ImageGenerateRequest, ImageOut, ImageRegenerateRequest

router = APIRouter(prefix="/images", tags=["images"])


def _to_out(img: ContentImage) -> ImageOut:
    return ImageOut(
        id=img.id,
        workspace_id=img.workspace_id,
        content_item_id=img.content_item_id,
        prompt=img.prompt,
        provider=img.provider,
        style=img.style,
        size=img.size,
        mime=img.mime,
        url=f"/api/v1/images/{img.id}/raw",
        created_at=img.created_at,
    )


async def _load_brand(db: AsyncSession, workspace_id: uuid.UUID) -> dict | None:
    row = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == workspace_id))
    ).scalar_one_or_none()
    if not row:
        return None
    from app.services.content_studio import load_brand_logo_b64

    return {
        "primary_color": row.primary_color,
        "accent_color": row.accent_color,
        "voice": row.voice,
        "value_prop": row.value_prop,
        "mission": row.mission,
        "logo_url": getattr(row, "logo_url", None),
        "logo_b64": await load_brand_logo_b64(db, getattr(row, "logo_url", None)),
    }


@router.post("/generate", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
async def generate(
    data: ImageGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ImageOut:
    item: ContentItem | None = None
    topic = data.topic
    headline = data.headline
    platform = data.platform

    if data.content_item_id:
        item = await db.get(ContentItem, data.content_item_id)
        if item is None or item.workspace_id != ctx.workspace.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Content item not found")
        topic = topic or item.title or (item.body[:120] if item.body else None)
        headline = headline or item.title
        platform = platform or item.platform

    if data.prompt:
        topic = topic or data.prompt

    if not (data.prompt or topic):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Provide a prompt, topic, or content_item_id")

    brand = await _load_brand(db, ctx.workspace.id) if data.use_brand else None

    try:
        if data.prompt and not data.content_item_id:
            # Explicit prompt: still enrich with brand colors + style for quality.
            from app.agents.image_agent import build_image_prompt, size_for_platform
            from app.llm.image_adapters import generate_image

            final_prompt = build_image_prompt(
                topic=data.prompt,
                headline=headline,
                platform=platform,
                style=data.style,
                brand=brand,
                extra=data.extra,
            )
            size = size_for_platform(platform, data.size)
            png, used = await generate_image(final_prompt, size=size, provider=data.provider)
            if brand and brand.get("logo_b64"):
                from app.agents.logo_overlay import composite_logo

                png = composite_logo(png, logo_b64=brand["logo_b64"], corner="bottom-right")
        else:
            png, used, final_prompt = await create_social_image(
                topic=topic or "brand social post",
                headline=headline,
                platform=platform,
                style=data.style,
                brand=brand,
                extra=data.extra,
                size=data.size,
                provider=data.provider,
            )
            size = data.size or "1024x1024"
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Image generation failed: {exc}")

    img = ContentImage(
        workspace_id=ctx.workspace.id,
        content_item_id=data.content_item_id,
        created_by=ctx.user.id,
        prompt=final_prompt,
        provider=used,
        style=data.style,
        size=size,
        mime="image/png",
        data_b64=base64.b64encode(png).decode("ascii"),
        meta={"requested_provider": data.provider},
    )
    db.add(img)
    await db.flush()
    await db.commit()
    await db.refresh(img)
    return _to_out(img)


@router.post("/{image_id}/regenerate", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
async def regenerate(
    image_id: uuid.UUID,
    data: ImageRegenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ImageOut:
    """Re-render an existing image from its original prompt + a change instruction.

    The providers are text-to-image only, so rather than pixel-editing the source
    we re-generate guided by the source prompt with the requested change appended,
    preserving the brand palette, style and size. If ``replace`` is set and the
    source image belongs to a content item's deck, the new image takes its slot.
    """
    source = await db.get(ContentImage, image_id)
    if source is None or source.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")

    from app.llm.image_adapters import generate_image

    base_prompt = source.prompt or "a professional, brand-aligned social media graphic"
    final_prompt = (
        f"{base_prompt}\n\nIMPORTANT — APPLY THIS CHANGE while keeping the same overall "
        f"composition, brand colours and style: {data.instruction.strip()}. "
        f"Keep all on-image text perfectly spelled."
    )
    size = source.size or "1024x1024"
    provider = data.provider or source.meta and source.meta.get("requested_provider")

    try:
        png, used = await generate_image(final_prompt, size=size, provider=provider)
        brand = await _load_brand(db, ctx.workspace.id)
        if brand and brand.get("logo_b64"):
            from app.agents.logo_overlay import composite_logo

            png = composite_logo(png, logo_b64=brand["logo_b64"], corner="bottom-right")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Image regeneration failed: {exc}")

    new_meta = dict(source.meta or {})
    new_meta["regenerated_from"] = str(source.id)
    new_meta["change_instruction"] = data.instruction.strip()

    img = ContentImage(
        workspace_id=ctx.workspace.id,
        content_item_id=source.content_item_id,
        created_by=ctx.user.id,
        prompt=final_prompt,
        provider=used,
        style=source.style,
        size=size,
        mime="image/png",
        data_b64=base64.b64encode(png).decode("ascii"),
        meta=new_meta,
    )
    db.add(img)
    await db.flush()

    # Optionally swap this image's slot in the parent content item's asset deck.
    if data.replace and source.content_item_id is not None:
        item = await db.get(ContentItem, source.content_item_id)
        if item is not None and item.workspace_id == ctx.workspace.id:
            from sqlalchemy.orm.attributes import flag_modified

            meta = dict(item.meta or {})
            urls = list(meta.get("asset_urls") or [])
            old_url = f"/api/v1/images/{source.id}/raw"
            new_url = f"/api/v1/images/{img.id}/raw"
            replaced = False
            for i, u in enumerate(urls):
                if u == old_url:
                    urls[i] = new_url
                    replaced = True
                    break
            idx = (source.meta or {}).get("slide_index")
            if not replaced and isinstance(idx, int) and 0 <= idx < len(urls):
                urls[idx] = new_url
                replaced = True
            if replaced:
                meta["asset_urls"] = urls
                meta["image_url"] = urls[0] if urls else None
                item.meta = meta
                flag_modified(item, "meta")

    await db.commit()
    await db.refresh(img)
    return _to_out(img)


@router.get("", response_model=list[ImageOut])
async def list_images(
    content_item_id: uuid.UUID | None = None,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ImageOut]:
    stmt = (
        select(ContentImage)
        .where(ContentImage.workspace_id == ctx.workspace.id)
        .order_by(ContentImage.created_at.desc())
    )
    if content_item_id is not None:
        stmt = stmt.where(ContentImage.content_item_id == content_item_id)
    res = await db.execute(stmt)
    return [_to_out(i) for i in res.scalars().all()]


@router.get("/{image_id}/raw")
async def raw_image(image_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Response:
    img = await db.get(ContentImage, image_id)
    if img is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    return Response(
        content=base64.b64decode(img.data_b64),
        media_type=img.mime or "image/png",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    image_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    img = await db.get(ContentImage, image_id)
    if img is None or img.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    await db.delete(img)
    await db.commit()
