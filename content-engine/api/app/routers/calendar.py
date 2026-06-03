"""Content Calendar routes.

Generate a date-aware, multi-platform content calendar (anchored to today),
list/get/delete calendars, and generate the actual content for a single calendar
entry — which creates a real ContentItem and links it back to the entry.
"""
from __future__ import annotations

import base64
import calendar as _calmod
import copy
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.agents.calendar_agent import DEFAULT_PLATFORMS, generate_calendar
from app.agents.image_agent import create_social_image
from app.agents.writer import generate_content
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    BrandBrain,
    ContentCalendar,
    ContentImage,
    ContentItem,
    ContentStatus,
    ContentType,
    Strategy,
)
from app.schemas import (
    CalendarEntryGenerateRequest,
    CalendarGenerateRequest,
    CalendarOut,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])

# Platforms whose entries should ship with a ready-to-post branded graphic.
VISUAL_PLATFORMS = {
    "linkedin",
    "instagram",
    "facebook",
    "x",
    "twitter",
    "threads",
    "pinterest",
    "youtube",
}

PROVIDER_MAP = {
    "gpt-5.5": "gpt-5.5",
    "gpt5": "gpt-5.5",
    "gpt": "gpt-5.5",
    "claude": "claude-opus",
    "claude-opus": "claude-opus",
    "opus": "claude-opus",
}


def _provider(value: str | None):
    if not value:
        return None
    return PROVIDER_MAP.get(value.lower())


def _coerce_type(value: str) -> ContentType:
    try:
        return ContentType(value)
    except ValueError:
        return ContentType.social_post


def _end_of_month(d: date) -> date:
    last = _calmod.monthrange(d.year, d.month)[1]
    return date(d.year, d.month, last)


async def _load_brand(db: AsyncSession, workspace_id: uuid.UUID) -> dict | None:
    row = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == workspace_id))
    ).scalar_one_or_none()
    if not row:
        return None
    return {
        "mission": row.mission,
        "value_prop": row.value_prop,
        "voice": row.voice,
        "audience": row.audience,
        "pillars": row.pillars,
        "keywords": row.keywords,
        "primary_color": row.primary_color,
        "accent_color": row.accent_color,
    }


async def _load_strategy(
    db: AsyncSession, workspace_id: uuid.UUID, strategy_id: uuid.UUID | None
) -> tuple[dict | None, Strategy | None]:
    if not strategy_id:
        return None, None
    srow = await db.get(Strategy, strategy_id)
    if not srow or srow.workspace_id != workspace_id:
        return None, None
    return (
        {
            "positioning": srow.positioning,
            "pillars": srow.pillars,
            "funnel": srow.funnel,
            "lead_magnets": srow.lead_magnets,
        },
        srow,
    )


@router.post("/generate", response_model=CalendarOut, status_code=status.HTTP_201_CREATED)
async def generate(
    data: CalendarGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CalendarOut:
    today = date.today()
    start = data.start_date or today
    if start < today:
        start = today
    end = data.end_date or _end_of_month(start)
    if end < start:
        end = _end_of_month(start)

    platforms = data.platforms or DEFAULT_PLATFORMS

    brand = await _load_brand(db, ctx.workspace.id)
    strategy, _ = await _load_strategy(db, ctx.workspace.id, data.strategy_id)

    client = data.client_name or ctx.workspace.name

    try:
        entries = await generate_calendar(
            client_name=client,
            start_date=start,
            end_date=end,
            today=today,
            platforms=platforms,
            brand=brand,
            strategy=strategy,
            goal=data.goal,
            provider=_provider(data.provider),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Calendar generation failed: {exc}")

    # Attach stable ids + status to each entry so we can generate content per-entry.
    for e in entries:
        e["id"] = str(uuid.uuid4())
        e["status"] = "planned"
        e["content_item_id"] = None

    cal = ContentCalendar(
        workspace_id=ctx.workspace.id,
        strategy_id=data.strategy_id,
        created_by=ctx.user.id,
        title=data.title or f"{start.strftime('%B %Y')} Content Calendar",
        client_name=client,
        start_date=start,
        end_date=end,
        platforms=platforms,
        entries=entries,
        meta={"goal": data.goal, "provider": data.provider},
    )
    db.add(cal)
    await db.flush()
    await db.commit()
    await db.refresh(cal)
    return CalendarOut.model_validate(cal)


@router.get("", response_model=list[CalendarOut])
async def list_calendars(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[CalendarOut]:
    res = await db.execute(
        select(ContentCalendar)
        .where(ContentCalendar.workspace_id == ctx.workspace.id)
        .order_by(ContentCalendar.created_at.desc())
    )
    return [CalendarOut.model_validate(c) for c in res.scalars().all()]


@router.get("/{calendar_id}", response_model=CalendarOut)
async def get_calendar(
    calendar_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CalendarOut:
    cal = await db.get(ContentCalendar, calendar_id)
    if cal is None or cal.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Calendar not found")
    return CalendarOut.model_validate(cal)


@router.delete("/{calendar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar(
    calendar_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    cal = await db.get(ContentCalendar, calendar_id)
    if cal is None or cal.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Calendar not found")
    await db.delete(cal)
    await db.commit()


@router.post("/{calendar_id}/entries/{entry_id}/generate", response_model=CalendarOut)
async def generate_entry(
    calendar_id: uuid.UUID,
    entry_id: str,
    data: CalendarEntryGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CalendarOut:
    cal = await db.get(ContentCalendar, calendar_id)
    if cal is None or cal.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Calendar not found")

    entries = copy.deepcopy(list(cal.entries or []))
    target = next((e for e in entries if e.get("id") == entry_id), None)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Calendar entry not found")

    brand = await _load_brand(db, ctx.workspace.id)
    strategy, _ = await _load_strategy(db, ctx.workspace.id, cal.strategy_id)

    topic = target.get("title") or target.get("theme") or "Content"
    notes_parts = [
        target.get("hook") and f"Hook/angle: {target['hook']}",
        target.get("theme") and f"Theme: {target['theme']}",
        target.get("funnel_stage") and f"Funnel stage: {target['funnel_stage']}",
        target.get("notes"),
        data.notes,
    ]
    notes = " | ".join(p for p in notes_parts if p)

    try:
        items = await generate_content(
            content_type=target.get("content_type", "social_post"),
            topic=topic,
            platform=target.get("platform"),
            count=1,
            notes=notes,
            brand=brand,
            strategy=strategy,
            provider=_provider(data.provider),
            scheduled_date=target.get("date"),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Generation failed: {exc}")

    it = items[0] if items else {"title": topic, "body": "", "variants": {}}
    item = ContentItem(
        workspace_id=ctx.workspace.id,
        strategy_id=cal.strategy_id,
        created_by=ctx.user.id,
        content_type=_coerce_type(target.get("content_type", "social_post")),
        status=ContentStatus.draft,
        platform=target.get("platform"),
        title=it.get("title") or topic,
        body=it.get("body", ""),
        variants=it.get("variants")
        or {k: it.get(k) for k in ("hook", "hashtags", "cta") if it.get(k)},
        meta={
            "calendar_id": str(cal.id),
            "calendar_entry_id": entry_id,
            "scheduled_date": target.get("date"),
            "provider": data.provider,
        },
    )
    db.add(item)
    await db.flush()

    # Build the COMPLETE post: for visual platforms, attach a branded graphic so
    # the entry is ready to publish (not just text).
    image_url: str | None = None
    platform = (target.get("platform") or "").lower()
    if data.with_image and platform in VISUAL_PLATFORMS:
        try:
            png, used, prompt = await create_social_image(
                topic=topic,
                headline=item.title,
                platform=platform,
                style=data.image_style or "modern_gradient",
                brand=brand,
                extra=target.get("hook"),
                provider=data.image_provider,
            )
            img = ContentImage(
                workspace_id=ctx.workspace.id,
                content_item_id=item.id,
                created_by=ctx.user.id,
                prompt=prompt,
                provider=used,
                style=data.image_style or "modern_gradient",
                size=None,
                mime="image/png",
                data_b64=base64.b64encode(png).decode("ascii"),
                meta={"calendar_entry_id": entry_id},
            )
            db.add(img)
            await db.flush()
            image_url = f"/api/v1/images/{img.id}/raw"
            item.meta = {**(item.meta or {}), "image_url": image_url, "image_id": str(img.id)}
            flag_modified(item, "meta")
        except Exception:  # noqa: BLE001 — image is best-effort; text still ships.
            image_url = None

    target["status"] = "generated"
    target["content_item_id"] = str(item.id)
    if image_url:
        target["image_url"] = image_url
    target["asset_kind"] = "image" if image_url else "text"
    # Reassign + flag so SQLAlchemy reliably detects the JSONB change.
    cal.entries = entries
    flag_modified(cal, "entries")

    await db.commit()
    await db.refresh(cal)
    return CalendarOut.model_validate(cal)
