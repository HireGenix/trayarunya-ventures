"""Creation Studio routes: generate content (LLM, grounded in brand+strategy),
list, get, update and delete content items."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import BrandBrain, ContentImage, ContentItem, ContentStatus, Strategy
from app.schemas import (
    ContentAssetsRequest,
    ContentGenerateRequest,
    ContentOut,
    ContentUpdate,
)
from app.services.content_studio import (
    load_brand_logo_b64,
    persist_content,
    produce_content,
)

router = APIRouter(prefix="/content", tags=["content"])

# Formats that trigger asset (graphic) generation alongside the copy.
ASSET_FORMATS = {"single", "static", "carousel", "pdf", "document", "article", "newsletter"}


async def _latest_images(
    db: AsyncSession, item_ids: list[uuid.UUID]
) -> dict[uuid.UUID, ContentImage]:
    """Return the most recent image per content item id."""
    if not item_ids:
        return {}
    res = await db.execute(
        select(ContentImage)
        .where(ContentImage.content_item_id.in_(item_ids))
        .order_by(ContentImage.created_at.desc())
    )
    latest: dict[uuid.UUID, ContentImage] = {}
    for img in res.scalars().all():
        cid = img.content_item_id
        if cid is not None and cid not in latest:
            latest[cid] = img
    return latest


def _out_with_image(item: ContentItem, img: ContentImage | None) -> ContentOut:
    out = ContentOut.model_validate(item)
    meta = item.meta or {}
    asset_urls = meta.get("asset_urls") or []
    if asset_urls:
        out.asset_urls = asset_urls
        out.image_url = asset_urls[0]
    elif img is not None:
        out.image_url = f"/api/v1/images/{img.id}/raw"
        out.asset_urls = [out.image_url]
    if img is not None:
        out.image_id = img.id
    out.asset_kind = meta.get("asset_kind") or ("image" if out.image_url else "text")
    out.email_html = meta.get("email_html")
    out.email_format = meta.get("email_format")
    return out


async def _load_brand(db: AsyncSession, workspace_id: uuid.UUID) -> dict | None:
    brand_row = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == workspace_id))
    ).scalar_one_or_none()
    if not brand_row:
        return None
    profile = brand_row.profile if isinstance(brand_row.profile, dict) else {}
    return {
        "mission": brand_row.mission,
        "value_prop": brand_row.value_prop,
        "voice": brand_row.voice,
        "audience": brand_row.audience,
        "pillars": brand_row.pillars,
        "keywords": brand_row.keywords,
        "primary_color": brand_row.primary_color,
        "accent_color": brand_row.accent_color,
        "name": profile.get("name"),
        "website": brand_row.website,
        "logo_url": brand_row.logo_url,
        "logo_b64": await load_brand_logo_b64(db, brand_row.logo_url),
    }


async def _load_strategy(
    db: AsyncSession, workspace_id: uuid.UUID, strategy_id: uuid.UUID | None
) -> dict | None:
    if not strategy_id:
        return None
    srow = await db.get(Strategy, strategy_id)
    if srow and srow.workspace_id == workspace_id:
        return {
            "positioning": srow.positioning,
            "pillars": srow.pillars,
            "funnel": srow.funnel,
        }
    return None


@router.post("/generate", response_model=list[ContentOut], status_code=status.HTTP_201_CREATED)
async def generate(
    data: ContentGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ContentOut]:
    brand = await _load_brand(db, ctx.workspace.id)
    strategy = await _load_strategy(db, ctx.workspace.id, data.strategy_id)

    fmt = (data.format or "single").lower()
    # Build complete deliverables (copy + the right graphics) for each requested item.
    want_assets = data.with_image or fmt in ASSET_FORMATS
    created: list[ContentItem] = []
    try:
        for _ in range(max(1, data.count)):
            payload = await produce_content(
                content_type=data.content_type,
                topic=data.topic,
                platform=data.platform,
                fmt=fmt,
                notes=data.notes,
                brand=brand,
                strategy=strategy,
                provider=data.provider,
                image_style=data.image_style,
                image_provider=data.image_provider,
                with_image=want_assets,
                slides=data.slides,
                scheduled_date=data.scheduled_date,
                email_format=data.email_format,
            )
            item = await persist_content(
                db,
                workspace_id=ctx.workspace.id,
                created_by=ctx.user.id,
                strategy_id=data.strategy_id,
                content_type=data.content_type,
                platform=data.platform,
                payload=payload,
                meta_extra={
                    "topic": data.topic,
                    "provider": data.provider,
                    "format": fmt,
                    "scheduled_date": data.scheduled_date,
                },
            )
            created.append(item)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Generation failed: {exc}")

    await db.commit()
    out: list[ContentOut] = []
    for c in created:
        await db.refresh(c)
        out.append(_out_with_image(c, None))
    return out


@router.post("/{item_id}/assets", response_model=ContentOut)
async def build_assets(
    item_id: uuid.UUID,
    data: ContentAssetsRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ContentOut:
    """(Re)build the branded graphics for an existing content item using its copy."""
    item = await _get_item(db, ctx, item_id)
    brand = await _load_brand(db, ctx.workspace.id)
    strategy = await _load_strategy(db, ctx.workspace.id, item.strategy_id)
    topic = (item.meta or {}).get("topic") or item.title or item.body[:120] or "content"

    try:
        payload = await produce_content(
            content_type=item.content_type.value,
            topic=topic,
            platform=item.platform,
            fmt=(data.format or "single").lower(),
            notes=None,
            brand=brand,
            strategy=strategy,
            provider=data.provider,
            image_style=data.image_style,
            image_provider=data.image_provider,
            with_image=True,
            slides=data.slides,
            email_format=data.email_format or (item.meta or {}).get("email_format"),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Asset generation failed: {exc}")

    # Persist freshly-built images, link them to THIS item, refresh asset metadata.
    import base64 as _b64

    from app.models import ContentImage as _CI

    asset_urls: list[str] = []
    slide_specs = payload.get("slides") or []
    for idx, (png, used, prompt) in enumerate(payload.get("assets") or []):
        spec = slide_specs[idx] if idx < len(slide_specs) else None
        img = _CI(
            workspace_id=ctx.workspace.id,
            content_item_id=item.id,
            created_by=ctx.user.id,
            prompt=prompt,
            provider=used,
            style=payload.get("style"),
            mime="image/png",
            data_b64=_b64.b64encode(png).decode("ascii"),
            meta={
                "slide_index": idx,
                "heading": (spec or {}).get("heading") if spec else None,
                "caption": (spec or {}).get("body") if spec else None,
            },
        )
        db.add(img)
        await db.flush()
        asset_urls.append(f"/api/v1/images/{img.id}/raw")

    from sqlalchemy.orm.attributes import flag_modified

    item.meta = {
        **(item.meta or {}),
        "asset_kind": payload.get("asset_kind", "image"),
        "asset_urls": asset_urls,
        "image_url": asset_urls[0] if asset_urls else None,
    }
    if slide_specs:
        item.meta["slides"] = slide_specs

    _efmt = payload.get("email_format")
    if _efmt and item.content_type.value == "newsletter":
        from app.agents.email_render import render_email_html as _render_email

        item.meta["email_format"] = _efmt
        if _efmt == "html":
            item.meta["email_html"] = _render_email(
                subject=item.title or "Newsletter",
                markdown_body=item.body or "",
                header_image_url=asset_urls[0] if asset_urls else None,
                brand=brand,
            )
    flag_modified(item, "meta")
    await db.commit()
    await db.refresh(item)
    return _out_with_image(item, None)


@router.get("", response_model=list[ContentOut])
async def list_content(
    content_type: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ContentOut]:
    stmt = select(ContentItem).where(ContentItem.workspace_id == ctx.workspace.id)
    if content_type:
        stmt = stmt.where(ContentItem.content_type == _coerce_type(content_type))
    if status_filter:
        try:
            stmt = stmt.where(ContentItem.status == ContentStatus(status_filter))
        except ValueError:
            pass
    stmt = stmt.order_by(ContentItem.created_at.desc())
    res = await db.execute(stmt)
    items = list(res.scalars().all())
    images = await _latest_images(db, [i.id for i in items])
    return [_out_with_image(i, images.get(i.id)) for i in items]


async def _get_item(db: AsyncSession, ctx: WorkspaceContext, item_id: uuid.UUID) -> ContentItem:
    item = await db.get(ContentItem, item_id)
    if item is None or item.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Content item not found")
    return item


@router.get("/{item_id}", response_model=ContentOut)
async def get_content(
    item_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ContentOut:
    item = await _get_item(db, ctx, item_id)
    images = await _latest_images(db, [item.id])
    return _out_with_image(item, images.get(item.id))


@router.patch("/{item_id}", response_model=ContentOut)
async def update_content(
    item_id: uuid.UUID,
    data: ContentUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ContentOut:
    item = await _get_item(db, ctx, item_id)
    if data.title is not None:
        item.title = data.title
    if data.body is not None:
        item.body = data.body
    if data.platform is not None:
        item.platform = data.platform
    if data.variants is not None:
        item.variants = data.variants
    if data.meta is not None:
        item.meta = data.meta
    if data.status is not None:
        try:
            item.status = ContentStatus(data.status)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid status")
    await db.flush()
    await db.commit()
    await db.refresh(item)
    return ContentOut.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    item_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    item = await _get_item(db, ctx, item_id)
    await db.delete(item)
    await db.commit()
