"""Deck imagery — give every deck real, on-brand visuals (studio-grade).

The designer agent emits an ``image_prompt`` (for AI image models) and an
``image_query`` (for stock photography) per visual slide. This module turns those
hints into actual picture URLs and writes them back onto each slide's ``data`` as
``image_url`` so the on-screen renderer and the PPTX/PDF exporters can place a
full-bleed hero behind the headline.

Sourcing strategy for decks/PPTs (best-effort, never hard-fails a deck):
  1. The chosen image model — a bespoke, text-free, on-brand backdrop per slide
     (defaults to ``MAI-Image-2.5``; the user can pick gpt-image or FLUX.2 Pro at
     generation time). The generated PNG is hosted in Blob storage so the web view
     + PPTX/PDF exports all reuse it.
  2. gpt-image as an automatic fallback inside ``generate_image`` if the model errors.
  3. Pexels only as an absolute last resort so a deck never ends up image-less.

All slide images are fetched concurrently with a per-image timeout so enriching a
deck adds seconds, not minutes, and one slow provider can't stall the rest.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from app.config import settings
from app.llm.image_adapters import generate_image
from app.services import pexels
from app.services.blob_storage import blob_enabled, upload_bytes

log = logging.getLogger("deck_media")

# Layouts that read best with a full-bleed photographic / generated backdrop.
HERO_LAYOUTS = {"cover", "section", "cta", "image", "quote"}
# Content layouts that get a tall side / accent image. Intentionally empty:
# infographic + content slides (cards/process/matrix/stats/bullets/agenda) render
# CLEAN on white with icons + callouts (Gamma-style), so no photo is forced on them.
SIDE_LAYOUTS: set[str] = set()

# Default image model for decks/PPTs when the user doesn't pick one.
DEFAULT_DECK_PROVIDER = "gpt-image-1.5"   # GPT Image 1.5 — high-RPM, on-brand backdrops

_PER_IMAGE_TIMEOUT = 70.0  # seconds; a stuck provider must not block the deck
_MAX_HERO = 6              # full-bleed hero backdrops
_MAX_SIDE = 5              # tall content-slide images


def _resolve_provider(provider: str | None) -> str:
    # Decks default to GPT Image 1.5 (highest RPM headroom) regardless of the
    # social-post default, so slide imagery stays fast + consistent.
    return (provider or DEFAULT_DECK_PROVIDER)


def _images_available() -> bool:
    return bool(
        settings.mai_image_configured
        or settings.image_configured
        or settings.azure_flux_endpoint
        or settings.pexels_api_key
    )


def _brand_bits(theme: dict[str, Any] | None) -> tuple[str, str]:
    t = theme or {}
    return str(t.get("brand_name") or ""), str(t.get("primary") or "#14BB87")


def _ai_prompt(slide: dict[str, Any], brand: str, primary: str) -> str:
    d = slide.get("data") or {}
    subject = (
        slide.get("image_prompt")
        or slide.get("image_query")
        or d.get("title")
        or d.get("eyebrow")
        or d.get("quote")
        or "abstract modern business background"
    )
    return (
        f"Editorial, premium presentation background image: {subject}. "
        "Cinematic lighting, shallow depth of field, modern and clean, lots of negative "
        f"space, brand accent colour {primary}. Absolutely NO text, NO words, NO letters, "
        "NO logos, NO watermarks, NO charts. Photographic, high quality, 16:9."
    )


def _stock_query(slide: dict[str, Any]) -> str:
    d = slide.get("data") or {}
    q = (
        slide.get("image_query")
        or slide.get("image_prompt")
        or d.get("title")
        or d.get("eyebrow")
        or ""
    )
    q = str(q).strip()
    # Keep stock queries short — Pexels matches best on 2-4 concrete words.
    words = [w for w in q.replace("/", " ").split() if w]
    return " ".join(words[:5]) or "modern business"


async def _resolve_one(
    deck_id: uuid.UUID,
    idx: int,
    slide: dict[str, Any],
    theme: dict[str, Any] | None,
    *,
    provider: str,
    portrait: bool = False,
    source: str = "ai",
) -> str | None:
    """Resolve a single slide image URL for the deck.

    ``provider`` selects the image model (gpt-image-1.5 / gpt-image / mai / flux).
    ``source`` selects where imagery comes from:
      - ``"ai"``    -> generate with the chosen model (Pexels only as last resort)
      - ``"stock"`` -> use Pexels stock photography directly (no AI generation)
    The result is hosted in Blob so every renderer reuses it.
    """
    brand, primary = _brand_bits(theme)
    size = "1024x1536" if portrait else "1536x1024"
    orientation = "portrait" if portrait else "landscape"

    # Stock-only mode: skip AI generation entirely, go straight to Pexels.
    if source == "stock":
        try:
            photo = await pexels.search_photo(_stock_query(slide), orientation=orientation)
            if photo and photo.get("url"):
                log.info("deck %s slide %s image via pexels (stock)", deck_id, idx)
                return photo["url"]
        except Exception as exc:  # noqa: BLE001
            log.warning("deck %s slide %s pexels (stock) failed: %s", deck_id, idx, exc)
        return None

    # 1) Chosen image model (gpt-image auto-fallback) → host in blob.
    if (settings.mai_image_configured or settings.image_configured or settings.azure_flux_endpoint) and blob_enabled():
        try:
            png, used = await generate_image(
                _ai_prompt(slide, brand, primary),
                size=size,
                provider=provider,
                quality="medium",
            )
            url = await upload_bytes(
                png, f"decks/{deck_id}/slide-{idx}.png", "image/png"
            )
            if url:
                log.info("deck %s slide %s image via %s", deck_id, idx, used)
                return url
        except Exception as exc:  # noqa: BLE001 — fall through to stock
            log.warning("deck %s slide %s AI image failed: %s", deck_id, idx, exc)

    # 2) Pexels stock photo — absolute last resort so a deck is never image-less.
    try:
        photo = await pexels.search_photo(_stock_query(slide), orientation=orientation)
        if photo and photo.get("url"):
            log.info("deck %s slide %s image via pexels (fallback)", deck_id, idx)
            return photo["url"]
    except Exception as exc:  # noqa: BLE001
        log.warning("deck %s slide %s pexels failed: %s", deck_id, idx, exc)

    return None


async def regenerate_slide_image(
    deck_id: uuid.UUID,
    position: int,
    slide: dict[str, Any],
    theme: dict[str, Any] | None,
    provider: str | None = None,
    source: str = "ai",
) -> str | None:
    """Generate a fresh image for ONE slide (best-effort). Returns the URL or None.

    Uses the deck's chosen image model (``provider``) and ``source`` (ai|stock);
    hero layouts render landscape and content layouts render portrait, matching
    :func:`enrich_slides`.
    """
    if not _images_available():
        return None
    model = _resolve_provider(provider)
    layout = slide.get("layout")
    portrait = layout in SIDE_LAYOUTS
    # Use a time-suffixed index so the blob path is unique and CDNs don't serve stale art.
    idx = f"{position}-{uuid.uuid4().hex[:6]}"
    try:
        return await asyncio.wait_for(
            _resolve_one(deck_id, idx, slide, theme, provider=model, portrait=portrait, source=source),  # type: ignore[arg-type]
            timeout=_PER_IMAGE_TIMEOUT,
        )
    except (asyncio.TimeoutError, Exception):  # noqa: BLE001
        return None


async def enrich_slides(
    deck_id: uuid.UUID,
    slides: list[dict[str, Any]],
    theme: dict[str, Any] | None,
    provider: str | None = None,
    source: str = "ai",
) -> list[dict[str, Any]]:
    """Populate ``data.image_url`` on visual slides, in place. Best-effort.

    Hero slides (cover/section/cta/image/quote) get a full-bleed backdrop;
    content slides (bullets/agenda) get a tall portrait so they stop reading like
    plain text walls. All imagery uses the deck's chosen model (``provider``),
    is hosted in Blob and reused by the web view + PPTX/PDF exports. ``slides``
    are normalised designer dicts ``{layout, data, ...}``.
    """
    if not _images_available():
        return slides

    model = _resolve_provider(provider)
    # (index, slide, provider, portrait)
    hero: list[tuple[int, dict[str, Any], str, bool]] = []
    side: list[tuple[int, dict[str, Any], str, bool]] = []
    for i, s in enumerate(slides):
        layout = s.get("layout")
        if layout in HERO_LAYOUTS:
            hero.append((i, s, model, False))
        elif layout in SIDE_LAYOUTS:
            side.append((i, s, model, True))

    targets = hero[:_MAX_HERO] + side[:_MAX_SIDE]
    if not targets:
        return slides

    async def _run(
        i: int, s: dict[str, Any], provider: str, portrait: bool
    ) -> tuple[int, str | None]:
        try:
            url = await asyncio.wait_for(
                _resolve_one(deck_id, i, s, theme, provider=provider, portrait=portrait, source=source),
                timeout=_PER_IMAGE_TIMEOUT,
            )
        except (asyncio.TimeoutError, Exception):  # noqa: BLE001
            url = None
        return i, url

    results = await asyncio.gather(
        *(_run(i, s, provider, portrait) for i, s, provider, portrait in targets)
    )
    for i, url in results:
        if url:
            slides[i].setdefault("data", {})["image_url"] = url
    return slides
