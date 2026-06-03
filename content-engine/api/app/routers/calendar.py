"""Content Calendar routes.

Generate a date-aware, multi-platform content calendar (anchored to today),
list/get/delete calendars, and generate the actual content for a single calendar
entry — which creates a real ContentItem and links it back to the entry.
"""
from __future__ import annotations

import asyncio
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
from app.agents.image_agent import create_slide_deck, create_social_image
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
    CalendarDayGenerateRequest,
    CalendarEntryGenerateRequest,
    CalendarGenerateRequest,
    CalendarOut,
)
from app.tools.trending import caption_and_tags

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

# Post format -> how many slides / which asset to build.
FORMAT_SLIDES = {"static": 1, "carousel": 3, "pdf": 3}
TEXT_ONLY_FORMATS = {"text", "video_script"}

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

    opts = {
        "provider": data.provider,
        "with_image": data.with_image,
        "image_style": data.image_style,
        "image_provider": data.image_provider,
        "notes": data.notes,
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
    """Phase 1 (no DB): produce text, branded asset(s) and caption/hashtags.

    Runs the asset deck and the trending-caption work concurrently so graphics
    and captions are ready at roughly the same time. Returns a payload dict that
    ``_persist_entry`` writes to the database.
    """
    platform = (target.get("platform") or "").lower()
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

    items = await generate_content(
        content_type=target.get("content_type", "social_post"),
        topic=topic,
        platform=target.get("platform"),
        count=1,
        notes=notes,
        brand=brand,
        strategy=strategy,
        provider=_provider(opts.get("provider")),
        scheduled_date=target.get("date"),
    )
    it = items[0] if items else {"title": topic, "body": "", "variants": {}}
    body = it.get("body", "")

    want_image = (
        opts.get("with_image")
        and platform in VISUAL_PLATFORMS
        and fmt not in TEXT_ONLY_FORMATS
    )
    style = opts.get("image_style") or "modern_gradient"
    img_provider = opts.get("image_provider")

    async def _assets() -> list[tuple[bytes, str, str]]:
        if not want_image:
            return []
        try:
            if fmt in ("carousel", "pdf"):
                return await create_slide_deck(
                    topic=topic,
                    headline=it.get("title") or topic,
                    platform=platform,
                    fmt=fmt,
                    slides=FORMAT_SLIDES.get(fmt, 3),
                    style=style,
                    brand=brand,
                    extra=target.get("hook"),
                    provider=img_provider,
                )
            png, used, prompt = await create_social_image(
                topic=topic,
                headline=it.get("title") or topic,
                platform=platform,
                style=style,
                brand=brand,
                extra=target.get("hook"),
                provider=img_provider,
            )
            return [(png, used, prompt)]
        except Exception:  # noqa: BLE001 — assets are best-effort.
            return []

    async def _caption() -> dict:
        try:
            return await caption_and_tags(
                topic=topic,
                platform=target.get("platform"),
                brand=brand,
                body=body,
                provider=_provider(opts.get("provider")),
            )
        except Exception:  # noqa: BLE001
            return {}

    assets, caption = await asyncio.gather(_assets(), _caption())

    asset_kind = "text"
    if assets:
        asset_kind = {"carousel": "carousel", "pdf": "pdf"}.get(fmt, "image")

    return {
        "item": it,
        "topic": topic,
        "body": body,
        "assets": assets,
        "asset_kind": asset_kind,
        "style": style,
        "caption": caption.get("caption"),
        "hashtags": caption.get("hashtags") or [],
        "trending": caption.get("trending") or [],
    }


async def _persist_entry(
    db: AsyncSession,
    ctx: WorkspaceContext,
    cal: ContentCalendar,
    target: dict,
    payload: dict,
    provider: str | None,
) -> None:
    """Phase 2 (DB): write the ContentItem, any images, and update the entry."""
    entry_id = target.get("id")
    it = payload["item"]
    topic = payload["topic"]

    variants = dict(
        it.get("variants")
        or {k: it.get(k) for k in ("hook", "hashtags", "cta") if it.get(k)}
    )
    if payload.get("caption"):
        variants["caption"] = payload["caption"]
    if payload.get("hashtags"):
        variants["hashtags"] = payload["hashtags"]

    item = ContentItem(
        workspace_id=ctx.workspace.id,
        strategy_id=cal.strategy_id,
        created_by=ctx.user.id,
        content_type=_coerce_type(target.get("content_type", "social_post")),
        status=ContentStatus.draft,
        platform=target.get("platform"),
        title=it.get("title") or topic,
        body=payload["body"],
        variants=variants,
        meta={
            "calendar_id": str(cal.id),
            "calendar_entry_id": entry_id,
            "scheduled_date": target.get("date"),
            "format": target.get("format"),
            "provider": provider,
        },
    )
    db.add(item)
    await db.flush()  # need item.id to link images

    asset_urls: list[str] = []
    for png, used, prompt in payload.get("assets") or []:
        img = ContentImage(
            workspace_id=ctx.workspace.id,
            content_item_id=item.id,
            created_by=ctx.user.id,
            prompt=prompt,
            provider=used,
            style=payload.get("style"),
            size=None,
            mime="image/png",
            data_b64=base64.b64encode(png).decode("ascii"),
            meta={"calendar_entry_id": entry_id},
        )
        db.add(img)
        await db.flush()
        asset_urls.append(f"/api/v1/images/{img.id}/raw")

    if asset_urls:
        item.meta = {
            **(item.meta or {}),
            "image_url": asset_urls[0],
            "asset_urls": asset_urls,
        }
        flag_modified(item, "meta")

    target["status"] = "generated"
    target["content_item_id"] = str(item.id)
    target["asset_kind"] = payload.get("asset_kind", "text")
    if asset_urls:
        target["image_url"] = asset_urls[0]
        target["asset_urls"] = asset_urls
