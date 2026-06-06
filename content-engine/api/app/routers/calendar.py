"""Content Calendar routes.

Generate a date-aware, multi-platform content calendar (anchored to today),
list/get/delete calendars, generate the actual content for a single calendar
entry, and serve a unified calendar feed aggregating all real scheduled items
across sources (social, email, content).
"""
from __future__ import annotations

import asyncio
import calendar as _calmod
import copy
import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.agents.calendar_agent import (
    DEFAULT_PLATFORMS,
    generate_calendar,
    platforms_for_segment,
)
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import BrandBrain, ContentCalendar, Strategy
from app.services import icp_service
from app.services.usage_guard import enforce_limit
from app.schemas import (
    CalendarDayGenerateRequest,
    CalendarEntryGenerateRequest,
    CalendarFeedItem,
    CalendarFeedResponse,
    CalendarGenerateRequest,
    CalendarOut,
    CalendarQuickAddRequest,
    CalendarRescheduleRequest,
)
from app.services.content_studio import (
    load_brand_logo_b64,
    persist_content,
    produce_content,
    provider_for,
)
from app.services.calendar_feed import (
    detect_gaps,
    get_unified_feed,
    quick_add_item,
    reschedule_item,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])

_provider = provider_for


def _end_of_month(d: date) -> date:
    last = _calmod.monthrange(d.year, d.month)[1]
    return date(d.year, d.month, last)


async def _load_brand(db: AsyncSession, workspace_id: uuid.UUID) -> dict | None:
    row = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == workspace_id))
    ).scalar_one_or_none()
    if not row:
        return None
    profile = row.profile if isinstance(row.profile, dict) else {}
    return {
        "mission": row.mission,
        "value_prop": row.value_prop,
        "voice": row.voice,
        "audience": row.audience,
        "pillars": row.pillars,
        "keywords": row.keywords,
        "primary_color": row.primary_color,
        "accent_color": row.accent_color,
        "name": profile.get("name"),
        "website": row.website,
        "logo_url": row.logo_url,
        "logo_b64": await load_brand_logo_b64(db, row.logo_url),
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
    await enforce_limit(db, ctx.workspace.id, "calendar")
    today = date.today()
    start = data.start_date or today
    if start < today:
        start = today
    end = data.end_date or _end_of_month(start)
    if end < start:
        end = _end_of_month(start)

    brand = await _load_brand(db, ctx.workspace.id)
    strategy, _ = await _load_strategy(db, ctx.workspace.id, data.strategy_id)

    icp_row = await icp_service.get_icp(db, ctx.workspace.id)
    icp_brief = icp_service.to_brief(icp_row) if icp_row else None

    # Segment decides the default channel mix when the caller doesn't pass one.
    if data.platforms:
        platforms = data.platforms
    elif icp_row and icp_row.segment:
        platforms = platforms_for_segment(icp_row.segment)
    else:
        platforms = DEFAULT_PLATFORMS

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
            icp=icp_brief,
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


# ------------------------------------------------------------------ #
#  Unified calendar feed endpoints (real data only)
# ------------------------------------------------------------------ #


@router.get("/feed", response_model=CalendarFeedResponse)
async def calendar_feed(
    start: date = Query(..., description="Feed start date (YYYY-MM-DD)"),
    end: date = Query(..., description="Feed end date (YYYY-MM-DD)"),
    channels: str | None = Query(None, description="Comma-separated channel filter"),
    source_types: str | None = Query(None, description="Comma-separated: content,social,email"),
    statuses: str | None = Query(None, description="Comma-separated: draft,scheduled,published,failed"),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CalendarFeedResponse:
    """Unified calendar feed: all real scheduled items across content, social
    and email sources for the given date range."""
    if end < start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "end must be >= start")

    ch = [c.strip() for c in channels.split(",") if c.strip()] if channels else None
    st = [s.strip() for s in source_types.split(",") if s.strip()] if source_types else None
    ss = [s.strip() for s in statuses.split(",") if s.strip()] if statuses else None

    items = await get_unified_feed(
        db, ctx.workspace.id, start, end,
        channels=ch, source_types=st, statuses=ss,
    )
    gaps = detect_gaps(items, start, end)
    return CalendarFeedResponse(
        items=[CalendarFeedItem(**i) for i in items],
        gaps=gaps,
    )


@router.post("/feed/reschedule", response_model=CalendarFeedItem)
async def calendar_reschedule(
    data: CalendarRescheduleRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CalendarFeedItem:
    """Move a real scheduled item to a new date/time. Rejects published items."""
    try:
        result = await reschedule_item(
            db, ctx.workspace.id, data.source_type, data.source_id,
            data.new_scheduled_at,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    await db.commit()
    return CalendarFeedItem(**result)


@router.post("/feed/quick-add", response_model=CalendarFeedItem, status_code=status.HTTP_201_CREATED)
async def calendar_quick_add(
    data: CalendarQuickAddRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CalendarFeedItem:
    """Create a real content item draft from a calendar day cell."""
    result = await quick_add_item(
        db, ctx.workspace.id, ctx.user.id,
        title=data.title,
        scheduled_at=data.scheduled_at,
        platform=data.platform,
        content_type=data.content_type,
    )
    await db.commit()
    return CalendarFeedItem(**result)


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


@router.delete("/{calendar_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
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

    opts = {
        "provider": data.provider,
        "with_image": data.with_image,
        "image_style": data.image_style,
        "image_provider": data.image_provider,
        "notes": data.notes,
        "email_format": data.email_format,
    }
    try:
        payload = await _produce_entry(target, brand, strategy, opts)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Generation failed: {exc}")

    await _persist_entry(db, ctx, cal, target, payload, data.provider)
    cal.entries = entries
    flag_modified(cal, "entries")

    await db.commit()
    await db.refresh(cal)
    return CalendarOut.model_validate(cal)


@router.post("/{calendar_id}/generate-day", response_model=CalendarOut)
async def generate_day(
    calendar_id: uuid.UUID,
    data: CalendarDayGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CalendarOut:
    """One click → generate EVERY not-yet-generated entry for a given date.

    The expensive LLM/image work runs concurrently (bounded), then results are
    persisted to the DB sequentially (the async session is single-threaded).
    """
    cal = await db.get(ContentCalendar, calendar_id)
    if cal is None or cal.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Calendar not found")

    target_date = data.date.isoformat() if isinstance(data.date, date) else str(data.date)
    entries = copy.deepcopy(list(cal.entries or []))
    todo = [
        e
        for e in entries
        if e.get("date") == target_date and e.get("status") != "generated"
    ]
    if not todo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No pending entries for that date")

    brand = await _load_brand(db, ctx.workspace.id)
    strategy, _ = await _load_strategy(db, ctx.workspace.id, cal.strategy_id)

    opts = {
        "provider": data.provider,
        "with_image": data.with_image,
        "image_style": data.image_style,
        "image_provider": data.image_provider,
        "notes": None,
        "email_format": data.email_format,
    }

    sem = asyncio.Semaphore(2)

    async def _run(entry: dict):
        async with sem:
            try:
                return entry, await _produce_entry(entry, brand, strategy, opts)
            except Exception:  # noqa: BLE001 — one failure shouldn't sink the day.
                return entry, None

    results = await asyncio.gather(*[_run(e) for e in todo])

    persisted = 0
    for entry, payload in results:
        if payload is None:
            continue
        await _persist_entry(db, ctx, cal, entry, payload, data.provider)
        persisted += 1

    if persisted == 0:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "All entries failed to generate")

    cal.entries = entries
    flag_modified(cal, "entries")
    await db.commit()
    await db.refresh(cal)
    return CalendarOut.model_validate(cal)


# --- internal generation helpers ------------------------------------------------


async def _produce_entry(
    target: dict,
    brand: dict | None,
    strategy: dict | None,
    opts: dict,
) -> dict:
    """Phase 1 (no DB): produce complete copy + branded asset(s) via the shared
    Content Studio service so calendar entries and Quick Create behave identically.
    """
    fmt = (target.get("format") or "static").lower()
    topic = target.get("title") or target.get("theme") or "Content"
    notes_parts = [
        target.get("hook") and f"Hook/angle: {target['hook']}",
        target.get("theme") and f"Theme: {target['theme']}",
        target.get("funnel_stage") and f"Funnel stage: {target['funnel_stage']}",
        target.get("notes"),
        opts.get("notes"),
    ]
    notes = " | ".join(p for p in notes_parts if p)

    return await produce_content(
        content_type=target.get("content_type", "social_post"),
        topic=topic,
        platform=target.get("platform"),
        fmt=fmt,
        notes=notes,
        brand=brand,
        strategy=strategy,
        provider=opts.get("provider"),
        image_style=opts.get("image_style"),
        image_provider=opts.get("image_provider"),
        with_image=bool(opts.get("with_image")),
        scheduled_date=target.get("date"),
        email_format=opts.get("email_format"),
    )


async def _persist_entry(
    db: AsyncSession,
    ctx: WorkspaceContext,
    cal: ContentCalendar,
    target: dict,
    payload: dict,
    provider: str | None,
) -> None:
    """Phase 2 (DB): write the ContentItem + images and update the calendar entry."""
    entry_id = target.get("id")
    item = await persist_content(
        db,
        workspace_id=ctx.workspace.id,
        created_by=ctx.user.id,
        strategy_id=cal.strategy_id,
        content_type=target.get("content_type", "social_post"),
        platform=target.get("platform"),
        payload=payload,
        meta_extra={
            "calendar_id": str(cal.id),
            "calendar_entry_id": entry_id,
            "scheduled_date": target.get("date"),
            "format": target.get("format"),
            "provider": provider,
            "topic": payload.get("topic") or target.get("title"),
        },
    )

    asset_urls = (item.meta or {}).get("asset_urls") or []
    target["status"] = "generated"
    target["content_item_id"] = str(item.id)
    target["asset_kind"] = payload.get("asset_kind", "text")
    # Reflect the auto-detected deliverable on the entry (e.g. a lead-magnet
    # planned as "static" is surfaced as the "pdf" playbook it became).
    if payload.get("format"):
        target["format"] = payload["format"]
    if asset_urls:
        target["image_url"] = asset_urls[0]
        target["asset_urls"] = asset_urls
