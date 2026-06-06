"""Funnels API — landing page & funnel builder with agentic generation.

All endpoints are workspace-scoped (bearer + X-Workspace-Id). Final paths are
``/api/v1/funnels/...``. Pydantic schemas are defined inline (per house style).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import funnels_agent as agent
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.services import funnels as svc
from app.services.automation import emit_event

router = APIRouter(prefix="/funnels", tags=["funnels"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class PageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str | None = None
    status: str
    blocks: list | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    theme: dict | None = None
    published_at: datetime | None = None
    views: int
    submissions: int


class PageCardOut(PageOut):
    conversion: float = 0.0


class CreatePageIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    blocks: list | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    theme: dict | None = None


class UpdatePageIn(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    blocks: list | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    theme: dict | None = None


class GeneratePageIn(BaseModel):
    brief: str = Field(min_length=1, max_length=4000)
    goal: str = Field(default="signup", max_length=40)
    name: str | None = Field(default=None, max_length=200)
    save: bool = True


class FunnelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    steps: list | None = None
    status: str


class CreateFunnelIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    steps: list | None = None


class OverviewOut(BaseModel):
    pages: int
    published: int
    avg_conversion: float
    total_views: int


# --------------------------------------------------------------------------- #
# Pages
# --------------------------------------------------------------------------- #
@router.get("/pages", response_model=list[PageCardOut])
async def list_pages(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    pages = await svc.list_pages(db, ctx.workspace.id)
    out: list[PageCardOut] = []
    for p in pages:
        card = PageCardOut.model_validate(p)
        card.conversion = await svc.conversion_rate(db, ctx.workspace.id, p)
        out.append(card)
    return out


@router.post("/pages", response_model=PageOut)
async def create_page(
    body: CreatePageIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    page = await svc.create_page(
        db,
        ctx.workspace.id,
        name=body.name,
        blocks=body.blocks,
        seo_title=body.seo_title,
        seo_description=body.seo_description,
        theme=body.theme,
    )
    await emit_event(
        db, ctx.workspace.id, "funnel.page.created", {"id": str(page.id)}
    )
    await db.commit()
    await db.refresh(page)
    return page


@router.get("/pages/{page_id}", response_model=PageCardOut)
async def get_page(
    page_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    page = await svc.get_page(db, ctx.workspace.id, page_id)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found")
    card = PageCardOut.model_validate(page)
    card.conversion = await svc.conversion_rate(db, ctx.workspace.id, page)
    return card


@router.patch("/pages/{page_id}", response_model=PageOut)
async def update_page(
    page_id: uuid.UUID,
    body: UpdatePageIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    page = await svc.get_page(db, ctx.workspace.id, page_id)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found")
    page = await svc.update_page(
        db,
        page,
        name=body.name,
        blocks=body.blocks,
        seo_title=body.seo_title,
        seo_description=body.seo_description,
        theme=body.theme,
    )
    await db.commit()
    await db.refresh(page)
    return page


@router.post("/pages/{page_id}/publish", response_model=PageOut)
async def publish_page(
    page_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    page = await svc.get_page(db, ctx.workspace.id, page_id)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found")
    page = await svc.publish_page(db, page)
    await emit_event(
        db,
        ctx.workspace.id,
        "funnel.page.published",
        {"id": str(page.id), "slug": page.slug},
    )
    await db.commit()
    await db.refresh(page)
    return page


@router.post("/pages/generate")
async def generate_page(
    body: GeneratePageIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await agent.generate_page(
        db, ctx.workspace.id, body.brief, body.goal
    )
    page_out = None
    if body.save:
        page = await svc.create_page(
            db,
            ctx.workspace.id,
            name=body.name or (result.get("seo_title") or "Generated page"),
            blocks=result.get("blocks"),
            seo_title=result.get("seo_title"),
            seo_description=result.get("seo_description"),
        )
        await emit_event(
            db,
            ctx.workspace.id,
            "funnel.page.generated",
            {"id": str(page.id), "goal": body.goal},
        )
        await db.commit()
        await db.refresh(page)
        page_out = PageOut.model_validate(page)
    return {"generated": result, "page": page_out}


@router.post("/pages/{page_id}/optimize")
async def optimize_page(
    page_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    page = await svc.get_page(db, ctx.workspace.id, page_id)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found")
    return await agent.optimize_copy(db, ctx.workspace.id, page_id)


# --------------------------------------------------------------------------- #
# Funnels
# --------------------------------------------------------------------------- #
@router.get("/funnels", response_model=list[FunnelOut])
async def list_funnels(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_funnels(db, ctx.workspace.id)


@router.post("/funnels", response_model=FunnelOut)
async def create_funnel(
    body: CreateFunnelIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    funnel = await svc.create_funnel(
        db, ctx.workspace.id, name=body.name, steps=body.steps
    )
    await emit_event(
        db, ctx.workspace.id, "funnel.created", {"id": str(funnel.id)}
    )
    await db.commit()
    await db.refresh(funnel)
    return funnel


# --------------------------------------------------------------------------- #
# Overview
# --------------------------------------------------------------------------- #
@router.get("/overview", response_model=OverviewOut)
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.overview(db, ctx.workspace.id)
