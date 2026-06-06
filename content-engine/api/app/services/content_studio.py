"""Content Studio service — the single source of truth for turning a brief into a
COMPLETE, format-correct deliverable (text + the right set of branded assets).

Both the Creation Studio (`routers/content.py`) and the Content Calendar
(`routers/calendar.py`) call into here so behaviour is identical everywhere:

- carousel / pdf  -> real per-slide copy, one branded image per slide
- single / static -> one branded social graphic
- article (blog)  -> full markdown article + a hero image
- newsletter      -> full sectioned issue + a header image
- text/video      -> copy only, no image

The two public entry points are :func:`produce_content` (no DB, does the LLM/image
work, safe to run concurrently) and :func:`persist_content` (writes the
``ContentItem`` + ``ContentImage`` rows). Keeping them split lets callers fan the
expensive work out concurrently and then persist sequentially on the async session.
"""
from __future__ import annotations

import base64
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.agents.image_agent import create_slide_deck, create_social_image
from app.agents.email_render import render_email_html
from app.agents.writer import generate_carousel_slides, generate_content
from app.config import settings
from app.models import ContentImage, ContentItem, ContentStatus, ContentType
from app.tools.trending import caption_and_tags

# Platforms whose posts should ship with a ready-to-post branded graphic.
VISUAL_PLATFORMS = {
    "linkedin",
    "instagram",
    "facebook",
    "x",
    "twitter",
    "threads",
    "pinterest",
    "youtube",
    "tiktok",
}

# Formats that are deliberately copy-only.
TEXT_ONLY_FORMATS = {"text", "video_script", "video"}

# Multi-slide formats and their default slide counts.
DECK_FORMATS = {"carousel": 6, "pdf": 5, "document": 5}

# Content types that should always come with a single hero/header graphic.
HERO_TYPES = {"blog", "newsletter"}

PROVIDER_MAP = {
    "gpt-5.5": "gpt-5.5",
    "gpt5": "gpt-5.5",
    "gpt": "gpt-5.5",
    "claude": "claude-opus",
    "claude-opus": "claude-opus",
    "opus": "claude-opus",
}


async def load_brand_logo_b64(db: AsyncSession, logo_url: str | None) -> str | None:
    """Resolve a brand ``logo_url`` (``/api/v1/images/<id>/raw``) to its base64 PNG.

    Returns ``None`` if the URL is external, malformed, or the image is missing —
    callers then simply skip logo compositing.
    """
    if not logo_url or "/images/" not in logo_url:
        return None
    try:
        raw_id = logo_url.split("/images/", 1)[1].split("/", 1)[0]
        image_id = uuid.UUID(raw_id)
    except (ValueError, IndexError):
        return None
    row = (
        await db.execute(select(ContentImage).where(ContentImage.id == image_id))
    ).scalar_one_or_none()
    return row.data_b64 if row else None


def provider_for(value: str | None):
    if not value:
        return None
    return PROVIDER_MAP.get(value.lower())


def coerce_type(value: str) -> ContentType:
    try:
        return ContentType(value)
    except ValueError:
        return ContentType.social_post


def resolve_format(content_type: str | None, fmt: str | None, with_image: bool = True) -> str:
    """Auto-detect the deliverable to build from the requested content type + format.

    This is what lets a single "Generate" click on a calendar entry do the right
    thing: the calendar planner stores the *asset* format (static/carousel/pdf/
    text/video_script) alongside the content type, and here we reconcile the two
    into one canonical deliverable so callers never have to.

    Canonical results: ``carousel`` | ``pdf`` | ``article`` | ``newsletter`` |
    ``static`` | ``text`` | ``video_script``.

    Precedence:
    1. An explicit deck request (carousel / pdf / document) always wins.
    2. An explicit copy-only request (``with_image`` off, or a text/video format)
       is respected — a lead magnet the user asked for as *text* stays text.
    3. Otherwise the content type drives the deliverable: lead magnets become a
       multi-page PDF, blogs an article (+hero), newsletters a sectioned issue
       (+header). This is the auto-detection the calendar relies on.
    """
    ct = (content_type or "").lower().strip()
    f = (fmt or "single").lower().strip()

    if f == "carousel":
        return "carousel"
    if f in ("pdf", "document"):
        return "pdf"
    if f in ("video_script", "video"):
        return f

    # Newsletters / emails are always the branded newsletter deliverable (with a
    # header image) — never plain text — regardless of the requested format.
    if ct == "newsletter":
        return "newsletter"

    explicit_text_only = (f == "text") and not with_image

    if not explicit_text_only:
        if ct == "lead_magnet":
            return "pdf"
        if ct == "blog":
            return "article"
        if ct == "newsletter":
            return "newsletter"

    if f == "text":
        return "text"
    if f in ("single", "static", ""):
        return "static"
    return f


def _slides_to_body(title: str | None, slides: list[dict]) -> str:
    """Render the carousel/PDF slide copy as readable markdown for the text body."""
    lines: list[str] = []
    if title:
        lines.append(f"# {title}")
        lines.append("")
    for i, s in enumerate(slides, start=1):
        heading = (s.get("heading") or "").strip()
        body = (s.get("body") or "").strip()
        lines.append(f"## Slide {i}{' — ' + heading if heading else ''}")
        if body:
            lines.append("")
            lines.append(body)
        lines.append("")
    return "\n".join(lines).strip()


def _wants_image(*, fmt: str, content_type: str, platform: str | None, with_image: bool) -> bool:
    # Newsletters / emails always need a branded header image — it's embedded in
    # the HTML email and anchors the layout, so we never skip it regardless of the
    # caller's with_image preference.
    if content_type == "newsletter" or fmt == "newsletter":
        return True
    if not with_image:
        return False
    if fmt in TEXT_ONLY_FORMATS:
        return False
    if fmt in DECK_FORMATS:
        return True
    if content_type in HERO_TYPES:
        return True
    return (platform or "").lower() in VISUAL_PLATFORMS


async def produce_content(
    *,
    content_type: str,
    topic: str,
    platform: str | None,
    fmt: str,
    notes: str | None,
    brand: dict | None,
    strategy: dict | None,
    provider: str | None = None,
    image_style: str | None = None,
    image_provider: str | None = None,
    with_image: bool = True,
    slides: int | None = None,
    scheduled_date: str | None = None,
    email_format: str | None = None,
) -> dict[str, Any]:
    """Produce a complete deliverable payload (no DB writes).

    Returns a dict consumed by :func:`persist_content` with keys: ``item``
    (``{title, body, variants}``), ``assets`` (list of ``(orig_idx, png, provider, prompt)``),
    ``asset_kind``, ``style``, ``caption``, ``hashtags``, ``slides``.
    """
    fmt = (fmt or "static").lower()
    fmt = resolve_format(content_type, fmt, with_image=with_image)
    style = image_style or "modern_gradient"
    # Default post/calendar imagery to the configured image model (MAI-Image-2.5)
    # for premium, on-brand, text-free visuals.
    image_provider = image_provider or settings.default_post_image_provider
    text_provider = provider_for(provider)
    want_image = _wants_image(
        fmt=fmt, content_type=content_type, platform=platform, with_image=with_image
    )

    # ---- Multi-slide deck (carousel / pdf): slide copy drives text AND images ----
    if fmt in DECK_FORMATS:
        n = max(2, min(slides or DECK_FORMATS[fmt], 10))
        deck = await generate_carousel_slides(
            topic=topic,
            platform=platform,
            slides=n,
            notes=notes,
            brand=brand,
            strategy=strategy,
            provider=text_provider,
            fmt="pdf" if fmt in ("pdf", "document") else "carousel",
        )
        slide_specs = deck["slides"]
        title = deck.get("title") or topic[:80]
        body = _slides_to_body(title, slide_specs)
        assets: list[tuple[int, bytes, str, str]] = []
        if want_image:
            try:
                assets = await create_slide_deck(
                    topic=topic,
                    headline=title,
                    platform=platform,
                    fmt="pdf" if fmt in ("pdf", "document") else "carousel",
                    slides=len(slide_specs),
                    style=style,
                    brand=brand,
                    provider=image_provider,
                    slide_specs=slide_specs,
                )
            except Exception:  # noqa: BLE001 — assets are best-effort.
                assets = []
        variants: dict[str, Any] = {}
        if deck.get("hashtags"):
            variants["hashtags"] = deck["hashtags"]
        return {
            "item": {"title": title, "body": body, "variants": variants},
            "assets": assets,
            "asset_kind": "pdf" if fmt in ("pdf", "document") else "carousel",
            "format": fmt,
            "style": style,
            "caption": deck.get("caption"),
            "hashtags": deck.get("hashtags") or [],
            "slides": slide_specs,
        }

    # ---- Single piece (social / blog / newsletter / thread / ad / lead_magnet) ----
    items = await generate_content(
        content_type=content_type,
        topic=topic,
        platform=platform,
        count=1,
        notes=notes,
        brand=brand,
        strategy=strategy,
        provider=text_provider,
        scheduled_date=scheduled_date,
    )
    it = items[0] if items else {"title": (topic or "Content")[:80], "body": "", "variants": {}}
    body = it.get("body", "")

    # Newsletters/emails are a standalone deliverable — strip any per-platform
    # (linkedin/x/…) variants the writer may have produced so the Studio shows
    # ONLY the newsletter, nothing else.
    if content_type == "newsletter":
        it["variants"] = {}

    assets = []
    if want_image:
        try:
            # Newsletters/emails need a wide banner header — force the platform hint
            # so the image is generated landscape and cropped to a 2:1 email banner.
            img_platform = "newsletter" if content_type == "newsletter" else platform
            png, used, prompt = await create_social_image(
                topic=topic,
                headline=it.get("title") or topic,
                platform=img_platform,
                style=style,
                brand=brand,
                extra=notes,
                provider=image_provider,
            )
            assets = [(0, png, used, prompt)]  # 4-tuple: (orig_idx, png, provider, prompt)
        except Exception:  # noqa: BLE001
            assets = []

    caption = None
    hashtags: list[str] = []
    if content_type != "newsletter":
        try:
            cap = await caption_and_tags(
                topic=topic, platform=platform, brand=brand, body=body, provider=text_provider
            )
            caption = cap.get("caption")
            hashtags = cap.get("hashtags") or []
        except Exception:  # noqa: BLE001
            pass

    return {
        "item": it,
        "assets": assets,
        "asset_kind": "image" if assets else "text",
        "format": fmt,
        "style": style,
        "caption": caption,
        "hashtags": hashtags,
        "slides": [],
        "email_format": (email_format or "normal") if content_type == "newsletter" else None,
        "brand": brand,
    }


async def persist_content(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    created_by: uuid.UUID | None,
    strategy_id: uuid.UUID | None,
    content_type: str,
    platform: str | None,
    payload: dict[str, Any],
    meta_extra: dict | None = None,
    status: ContentStatus = ContentStatus.draft,
) -> ContentItem:
    """Write the ``ContentItem`` and any generated images, linking slides via meta."""
    it = payload["item"]
    variants = dict(
        it.get("variants")
        or {k: it.get(k) for k in ("hook", "hashtags", "cta") if it.get(k)}
    )
    if payload.get("caption"):
        variants["caption"] = payload["caption"]
    if payload.get("hashtags"):
        variants["hashtags"] = payload["hashtags"]

    meta = {
        "asset_kind": payload.get("asset_kind", "text"),
        **(meta_extra or {}),
    }
    # The auto-detected deliverable is authoritative for display.
    if payload.get("format"):
        meta["format"] = payload["format"]

    item = ContentItem(
        workspace_id=workspace_id,
        strategy_id=strategy_id,
        created_by=created_by,
        content_type=coerce_type(content_type),
        status=status,
        platform=platform,
        title=it.get("title"),
        body=it.get("body", ""),
        variants=variants or None,
        meta=meta,
    )
    db.add(item)
    await db.flush()  # need item.id to link images

    asset_urls: list[str] = []
    slide_specs = payload.get("slides") or []
    for (orig_idx, png, used, prompt) in (payload.get("assets") or []):
        spec = slide_specs[orig_idx] if orig_idx < len(slide_specs) else None
        img = ContentImage(
            workspace_id=workspace_id,
            content_item_id=item.id,
            created_by=created_by,
            prompt=prompt,
            provider=used,
            style=payload.get("style"),
            size=None,
            mime="image/png",
            data_b64=base64.b64encode(png).decode("ascii"),
            meta={
                "slide_index": orig_idx,
                "heading": (spec or {}).get("heading") if spec else None,
                "caption": (spec or {}).get("body") if spec else None,
            },
        )
        db.add(img)
        await db.flush()
        asset_urls.append(f"/api/v1/images/{img.id}/raw")

    item.meta = {
        **(item.meta or {}),
        "asset_urls": asset_urls,
        "image_url": asset_urls[0] if asset_urls else None,
    }
    if slide_specs:
        item.meta["slides"] = slide_specs

    # Newsletter delivery format: record it and, for HTML, render a branded email.
    email_format = payload.get("email_format")
    if email_format and coerce_type(content_type) == ContentType.newsletter:
        item.meta["email_format"] = email_format
        if email_format == "html":
            item.meta["email_html"] = render_email_html(
                subject=it.get("title") or "Newsletter",
                markdown_body=it.get("body", ""),
                header_image_url=asset_urls[0] if asset_urls else None,
                brand=payload.get("brand"),
                cta_text=(payload.get("item") or {}).get("cta"),
                cta_url=(payload.get("brand") or {}).get("website"),
            )

    flag_modified(item, "meta")
    await db.flush()
    return item
