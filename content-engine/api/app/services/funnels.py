"""Funnels service: page/funnel CRUD, publishing and real conversion math.

Conversion rate is computed from actual rows: a page's submissions over its
unique-visit count (FunnelVisit). No demo numbers — if there is no traffic the
rate is simply 0.0.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.funnels import Funnel, FunnelVisit, LandingPage

VALID_BLOCK_TYPES = {"hero", "features", "cta", "form", "testimonial", "faq"}


def slugify(value: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return base or "page"


# --------------------------------------------------------------------------- #
# Landing pages
# --------------------------------------------------------------------------- #
async def list_pages(db: AsyncSession, ws_id: uuid.UUID) -> list[LandingPage]:
    res = await db.execute(
        select(LandingPage)
        .where(LandingPage.workspace_id == ws_id)
        .order_by(LandingPage.created_at.desc())
    )
    return list(res.scalars().all())


async def get_page(
    db: AsyncSession, ws_id: uuid.UUID, page_id: uuid.UUID
) -> LandingPage | None:
    res = await db.execute(
        select(LandingPage).where(
            LandingPage.workspace_id == ws_id, LandingPage.id == page_id
        )
    )
    return res.scalar_one_or_none()


async def get_page_by_slug(db: AsyncSession, slug: str) -> LandingPage | None:
    """Public-safe getter: only ever returns a *published* page by slug."""
    res = await db.execute(
        select(LandingPage).where(
            LandingPage.slug == slug, LandingPage.status == "published"
        )
    )
    return res.scalar_one_or_none()


async def create_page(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    blocks: list | None = None,
    seo_title: str | None = None,
    seo_description: str | None = None,
    theme: dict | None = None,
) -> LandingPage:
    page = LandingPage(
        workspace_id=ws_id,
        name=name,
        status="draft",
        blocks=render_blocks(blocks or []),
        seo_title=seo_title,
        seo_description=seo_description,
        theme=theme,
    )
    db.add(page)
    await db.flush()
    await db.refresh(page)
    return page


async def update_page(
    db: AsyncSession,
    page: LandingPage,
    *,
    name: str | None = None,
    blocks: list | None = None,
    seo_title: str | None = None,
    seo_description: str | None = None,
    theme: dict | None = None,
) -> LandingPage:
    if name is not None:
        page.name = name
    if blocks is not None:
        page.blocks = render_blocks(blocks)
    if seo_title is not None:
        page.seo_title = seo_title
    if seo_description is not None:
        page.seo_description = seo_description
    if theme is not None:
        page.theme = theme
    await db.flush()
    await db.refresh(page)
    return page


async def publish_page(db: AsyncSession, page: LandingPage) -> LandingPage:
    page.status = "published"
    if not page.slug:
        page.slug = slugify(page.name)
    page.published_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(page)
    return page


def render_blocks(blocks: list | None) -> list:
    """Normalise an ordered block list, keeping only known types in order."""
    out: list = []
    for idx, raw in enumerate(blocks or []):
        if not isinstance(raw, dict):
            continue
        btype = str(raw.get("type", "")).strip().lower()
        if btype not in VALID_BLOCK_TYPES:
            continue
        props = raw.get("props")
        if not isinstance(props, dict):
            props = {}
        out.append({"type": btype, "order": idx, "props": props})
    return out


# --------------------------------------------------------------------------- #
# Visits / analytics
# --------------------------------------------------------------------------- #
async def record_visit(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    page_id: uuid.UUID | None = None,
    funnel_id: uuid.UUID | None = None,
    step_index: int = 0,
    anon_id: str | None = None,
) -> FunnelVisit:
    visit = FunnelVisit(
        workspace_id=ws_id,
        page_id=page_id,
        funnel_id=funnel_id,
        step_index=step_index,
        anon_id=anon_id,
    )
    db.add(visit)
    if page_id is not None:
        page = await db.get(LandingPage, page_id)
        if page is not None and page.workspace_id == ws_id:
            page.views = (page.views or 0) + 1
    await db.flush()
    return visit


async def record_submission(
    db: AsyncSession, ws_id: uuid.UUID, page: LandingPage
) -> LandingPage:
    page.submissions = (page.submissions or 0) + 1
    await db.flush()
    await db.refresh(page)
    return page


async def page_visit_count(
    db: AsyncSession, ws_id: uuid.UUID, page_id: uuid.UUID
) -> int:
    res = await db.execute(
        select(func.count(FunnelVisit.id)).where(
            FunnelVisit.workspace_id == ws_id, FunnelVisit.page_id == page_id
        )
    )
    return int(res.scalar_one() or 0)


async def conversion_rate(
    db: AsyncSession, ws_id: uuid.UUID, page: LandingPage
) -> float:
    """Real conversion = submissions / visits (visits prefer FunnelVisit rows)."""
    visits = await page_visit_count(db, ws_id, page.id)
    if visits <= 0:
        visits = page.views or 0
    if visits <= 0:
        return 0.0
    return round((page.submissions or 0) / visits, 4)


# --------------------------------------------------------------------------- #
# Funnels
# --------------------------------------------------------------------------- #
async def list_funnels(db: AsyncSession, ws_id: uuid.UUID) -> list[Funnel]:
    res = await db.execute(
        select(Funnel)
        .where(Funnel.workspace_id == ws_id)
        .order_by(Funnel.created_at.desc())
    )
    return list(res.scalars().all())


async def create_funnel(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    steps: list | None = None,
) -> Funnel:
    funnel = Funnel(
        workspace_id=ws_id,
        name=name,
        steps=steps or [],
        status="draft",
    )
    db.add(funnel)
    await db.flush()
    await db.refresh(funnel)
    return funnel


# --------------------------------------------------------------------------- #
# Overview rollup
# --------------------------------------------------------------------------- #
async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    pages = await list_pages(db, ws_id)
    published = [p for p in pages if p.status == "published"]
    total_views = sum(p.views or 0 for p in pages)

    rates: list[float] = []
    for p in pages:
        rates.append(await conversion_rate(db, ws_id, p))
    avg_conversion = round(sum(rates) / len(rates), 4) if rates else 0.0

    return {
        "pages": len(pages),
        "published": len(published),
        "avg_conversion": avg_conversion,
        "total_views": total_views,
    }
