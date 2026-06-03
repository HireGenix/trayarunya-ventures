"""Creation Studio routes: generate content (LLM, grounded in brand+strategy),
list, get, update and delete content items."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.writer import generate_content
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import BrandBrain, ContentItem, ContentStatus, ContentType, Strategy
from app.schemas import ContentGenerateRequest, ContentOut, ContentUpdate

router = APIRouter(prefix="/content", tags=["content"])


def _coerce_type(value: str) -> ContentType:
    try:
        return ContentType(value)
    except ValueError:
        return ContentType.social_post


@router.post("/generate", response_model=list[ContentOut], status_code=status.HTTP_201_CREATED)
async def generate(
    data: ContentGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ContentOut]:
    brand_row = (
        await db.execute(
            select(BrandBrain).where(BrandBrain.workspace_id == ctx.workspace.id)
        )
    ).scalar_one_or_none()
    brand = (
        {
            "mission": brand_row.mission,
            "value_prop": brand_row.value_prop,
            "voice": brand_row.voice,
            "audience": brand_row.audience,
            "pillars": brand_row.pillars,
            "keywords": brand_row.keywords,
        }
        if brand_row
        else None
    )

    strategy = None
    if data.strategy_id:
        srow = await db.get(Strategy, data.strategy_id)
        if srow and srow.workspace_id == ctx.workspace.id:
            strategy = {
                "positioning": srow.positioning,
                "pillars": srow.pillars,
                "funnel": srow.funnel,
            }

    try:
        items = await generate_content(
            content_type=data.content_type,
            topic=data.topic,
            platform=data.platform,
            count=data.count,
            notes=data.notes,
            brand=brand,
            strategy=strategy,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Generation failed: {exc}")

    created: list[ContentItem] = []
    for it in items:
        item = ContentItem(
            workspace_id=ctx.workspace.id,
            strategy_id=data.strategy_id,
            created_by=ctx.user.id,
            content_type=_coerce_type(data.content_type),
            status=ContentStatus.draft,
            platform=data.platform,
            title=it.get("title"),
            body=it.get("body", ""),
            variants=it.get("variants") or {
                k: it.get(k) for k in ("hook", "hashtags", "cta") if it.get(k)
            },
            meta={"topic": data.topic},
        )
        db.add(item)
        created.append(item)

    await db.flush()
    await db.commit()
    for c in created:
        await db.refresh(c)
    return [ContentOut.model_validate(c) for c in created]


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
    return [ContentOut.model_validate(c) for c in res.scalars().all()]


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
    return ContentOut.model_validate(await _get_item(db, ctx, item_id))


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
