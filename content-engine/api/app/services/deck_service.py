"""Deck persistence + generation orchestration.

Resolves the workspace's brand theme (colours/logo from BrandBrain) so generated
decks are on-brand, runs the designer agent grounded on workspace context, and
persists the deck + its slides. Also handles slide CRUD and reordering.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents import deck_designer
from app.models import BrandBrain, Deck, DeckSlide, Workspace
from app.services import chat_context, deck_media
from app.services.deck_themes import get_theme, resolve_theme_dict, list_themes

# Curated, on-brand palettes per style — used as a tasteful fallback when the
# workspace BrandBrain hasn't captured colours yet (never a blank white deck).
STYLE_PALETTES: dict[str, dict[str, str]] = {
    "modern": {"primary": "#14BB87", "accent": "#0FA874", "ink": "#0B1B16"},
    "bold": {"primary": "#7C3AED", "accent": "#EC4899", "ink": "#190B2E"},
    "minimal": {"primary": "#111827", "accent": "#14BB87", "ink": "#111827"},
    "editorial": {"primary": "#B45309", "accent": "#0F766E", "ink": "#1C1410"},
    "gradient": {"primary": "#2563EB", "accent": "#14BB87", "ink": "#0A1530"},
}

_HEX_RE = "0123456789abcdefABCDEF"


def _valid_hex(v: Any) -> str | None:
    if not isinstance(v, str):
        return None
    s = v.strip()
    if s.startswith("#") and len(s) in (4, 7, 9) and all(c in _HEX_RE for c in s[1:]):
        return s
    return None


def _ensure_references(
    slides: list[dict[str, Any]], evidence_sources: list[dict[str, str]]
) -> list[dict[str, Any]]:
    """Guarantee a closing References slide whenever we have sources to cite.

    If the model already produced a ``references`` slide we leave it (but top it up
    with any cited per-slide / evidence sources it missed). Otherwise we append one.
    """
    # Collect every URL cited across slides + the fresh-evidence/research sources.
    collected: list[dict[str, str]] = []
    seen: set[str] = set()

    def _add(label: str, url: str) -> None:
        url = (url or "").strip()
        if not url.startswith(("http://", "https://")) or url in seen:
            return
        seen.add(url)
        collected.append({"label": (label or url)[:140], "url": url})

    for s in slides:
        for src in (s.get("data") or {}).get("sources") or []:
            if isinstance(src, dict):
                _add(src.get("label", ""), src.get("url", ""))
    for src in evidence_sources:
        _add(src.get("label", ""), src.get("url", ""))

    if not collected:
        return slides

    ref_idx = next(
        (i for i, s in enumerate(slides) if s.get("layout") == "references"), None
    )
    if ref_idx is not None:
        existing = slides[ref_idx].setdefault("data", {})
        items = existing.get("items") if isinstance(existing.get("items"), list) else []
        have = {
            (it.get("url") or "").strip()
            for it in items
            if isinstance(it, dict)
        }
        for c in collected:
            if c["url"] not in have:
                items.append(c)
        existing["items"] = items[:14]
        existing.setdefault("title", "Sources")
        return slides

    slides.append({
        "layout": "references",
        "data": {"title": "Sources", "items": collected[:14]},
    })
    return slides


async def resolve_theme(
    db: AsyncSession, workspace: Workspace, style: str,
    theme_id: str | None = None,
) -> dict[str, Any]:
    """Build the deck theme from BrandBrain colours merged onto a theme template."""
    base = dict(STYLE_PALETTES.get(style, STYLE_PALETTES["modern"]))
    brand = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == workspace.id))
    ).scalar_one_or_none()

    brand_primary: str | None = None
    brand_accent: str | None = None
    logo_url = ""
    if brand is not None:
        brand_primary = _valid_hex(brand.primary_color)
        brand_accent = _valid_hex(brand.accent_color)
        if brand.logo_url:
            logo_url = brand.logo_url

    return resolve_theme_dict(
        theme_id=theme_id,
        style=style,
        brand_primary=brand_primary,
        brand_accent=brand_accent,
        brand_name=workspace.name,
        logo_url=logo_url,
    )


async def list_decks(db: AsyncSession, workspace_id: uuid.UUID) -> list[Deck]:
    res = await db.execute(
        select(Deck)
        .where(Deck.workspace_id == workspace_id)
        .order_by(desc(Deck.updated_at))
    )
    return list(res.scalars().all())


async def get_deck(
    db: AsyncSession, workspace_id: uuid.UUID, deck_id: uuid.UUID
) -> Deck | None:
    res = await db.execute(
        select(Deck)
        .where(Deck.id == deck_id, Deck.workspace_id == workspace_id)
        .options(selectinload(Deck.slides))
    )
    return res.scalar_one_or_none()


async def slide_count(db: AsyncSession, deck_id: uuid.UUID) -> int:
    res = await db.execute(
        select(func.count()).select_from(DeckSlide).where(DeckSlide.deck_id == deck_id)
    )
    return int(res.scalar_one() or 0)


def _deck_image_provider(deck: Deck) -> str | None:
    """The image model chosen when the deck was generated (None → service default)."""
    return (deck.meta or {}).get("image_provider")


def _deck_image_source(deck: Deck) -> str:
    """Image source chosen for the deck: 'ai' (generate) or 'stock' (Pexels)."""
    return (deck.meta or {}).get("image_source") or "ai"


async def create_and_generate(
    db: AsyncSession,
    workspace: Workspace,
    created_by: uuid.UUID | None,
    *,
    topic: str,
    audience: str | None,
    tone: str | None,
    style: str,
    slide_count: int | None,
    model_key: str | None,
    image_provider: str | None = None,
    image_source: str | None = None,
    theme_id: str | None = None,
) -> Deck:
    """Create a deck, generate its slides (grounded + branded) and persist them.

    Runs synchronously within the request: generation is a single blocking LLM
    call, matching the rest of content-engine. On failure the deck is saved with
    status='failed' so the UI can surface the error and offer a retry.
    """
    theme = await resolve_theme(db, workspace, style, theme_id=theme_id)
    deck = Deck(
        workspace_id=workspace.id,
        created_by=created_by,
        title=(topic or "Untitled deck")[:200],
        topic=topic,
        audience=audience,
        tone=tone,
        style=style,
        status="generating",
        model_key=model_key,
        theme=theme,
    )
    db.add(deck)
    await db.flush()

    try:
        ground = await chat_context.build_deck_grounding(
            db, workspace, topic, audience=audience
        )
        grounding = ground["grounding"]
        evidence_sources = ground.get("sources") or []
        designed = await deck_designer.design_deck(
            topic,
            grounding,
            audience=audience,
            tone=tone,
            slide_count=slide_count,
            model_key=model_key,
        )
    except Exception as exc:  # noqa: BLE001
        deck.status = "failed"
        deck.error = str(exc)[:1000]
        await db.flush()
        return deck

    deck.title = designed["title"][:200] or deck.title
    deck.style = designed["style"]
    theme["style"] = designed["style"]
    # Re-resolve palette for the (possibly model-chosen) style, keeping brand colours.
    deck.theme = await resolve_theme(db, workspace, designed["style"], theme_id=theme_id)
    deck.meta = {
        "subtitle": designed.get("subtitle", ""),
        "image_provider": image_provider,
        "image_source": image_source or "ai",
    }
    deck.error = None

    # Give the deck real, on-brand visuals (chosen image model → gpt-image → Pexels).
    slides = designed["slides"]
    slides = _ensure_references(slides, evidence_sources)
    try:
        slides = await deck_media.enrich_slides(
            deck.id, slides, deck.theme,
            provider=image_provider, source=image_source or "ai",
        )
    except Exception:  # noqa: BLE001 — imagery is best-effort, never block a deck
        pass

    for i, s in enumerate(slides):
        db.add(
            DeckSlide(
                deck_id=deck.id,
                position=i,
                layout=s["layout"],
                data=s["data"],
                speaker_notes=s.get("speaker_notes"),
            )
        )
    deck.status = "ready"
    await db.flush()
    return deck


async def update_deck(
    db: AsyncSession, deck: Deck, *, title: str | None = None, style: str | None = None,
    workspace: Workspace | None = None, theme_id: str | None = None,
) -> Deck:
    if title is not None:
        deck.title = title[:200] or deck.title
    if (style is not None or theme_id is not None) and workspace is not None:
        deck.style = style or deck.style
        deck.theme = await resolve_theme(db, workspace, deck.style, theme_id=theme_id)
    await db.flush()
    return deck


async def delete_deck(db: AsyncSession, deck: Deck) -> None:
    await db.delete(deck)
    await db.flush()


async def update_slide(
    db: AsyncSession, slide: DeckSlide, *, data: dict | None = None,
    layout: str | None = None, speaker_notes: str | None = None,
) -> DeckSlide:
    if data is not None:
        slide.data = data
    if layout is not None:
        slide.layout = layout
    if speaker_notes is not None:
        slide.speaker_notes = speaker_notes
    await db.flush()
    return slide


async def get_slide(
    db: AsyncSession, deck_id: uuid.UUID, slide_id: uuid.UUID
) -> DeckSlide | None:
    res = await db.execute(
        select(DeckSlide).where(DeckSlide.id == slide_id, DeckSlide.deck_id == deck_id)
    )
    return res.scalar_one_or_none()


async def reorder_slides(
    db: AsyncSession, deck_id: uuid.UUID, ordered_ids: list[uuid.UUID]
) -> None:
    res = await db.execute(select(DeckSlide).where(DeckSlide.deck_id == deck_id))
    slides = {s.id: s for s in res.scalars().all()}
    pos = 0
    for sid in ordered_ids:
        s = slides.get(sid)
        if s is not None:
            s.position = pos
            pos += 1
    # Any slides not in the list keep going after, preserving relative order.
    for s in sorted(slides.values(), key=lambda x: x.position):
        if s.id not in ordered_ids:
            s.position = pos
            pos += 1
    await db.flush()


async def delete_slide(db: AsyncSession, slide: DeckSlide) -> None:
    await db.delete(slide)
    await db.flush()


def _slide_outline(deck: Deck) -> list[dict[str, Any]]:
    return [
        {"layout": s.layout, "data": s.data or {}}
        for s in sorted(deck.slides, key=lambda x: x.position)
    ]


async def regenerate_slide(
    db: AsyncSession,
    workspace: Workspace,
    deck: Deck,
    slide: DeckSlide,
    *,
    instruction: str | None = None,
    layout: str | None = None,
    model_key: str | None = None,
    with_image: bool = True,
    rewrite_content: bool = True,
) -> DeckSlide:
    """Re-design a single slide with the AI, grounded on the workspace + deck story.

    Keeps the slide's position. ``layout`` lets the caller switch the slide to a
    different layout (Gamma-style "redesign"). ``rewrite_content`` controls whether
    the AI rewrites the slide copy/structure, and ``with_image`` controls whether a
    fresh hero visual is generated — so the editor can offer text, design and image
    as independent toggles.
    """
    target_layout = (layout or slide.layout or "bullets").lower()
    layout_changed = bool(layout) and target_layout != (slide.layout or "").lower()

    # If the user only wants a new image (no rewrite, no layout change), skip the
    # language model entirely and just refresh the visual.
    if not rewrite_content and not layout_changed and not instruction:
        if with_image:
            return await regenerate_slide_image(db, deck, slide)
        return slide

    topic = deck.topic or deck.title or ""
    ground = await chat_context.build_deck_grounding(
        db, workspace, topic, audience=deck.audience
    )
    designed = await deck_designer.design_slide(
        topic=topic,
        grounding=ground["grounding"],
        layout=target_layout,
        instruction=instruction,
        current={"layout": slide.layout, "data": slide.data or {}},
        deck_title=deck.title,
        audience=deck.audience,
        tone=deck.tone,
        outline=_slide_outline(deck),
        model_key=model_key or deck.model_key,
    )

    data = dict(designed["data"])
    if with_image:
        # Top up references-style sources onto the deck nothing — keep per-slide sources only.
        try:
            url = await deck_media.regenerate_slide_image(
                deck.id, slide.position, designed, deck.theme,
                provider=_deck_image_provider(deck),
                source=_deck_image_source(deck),
            )
            if url:
                data["image_url"] = url
        except Exception:  # noqa: BLE001 — imagery is best-effort
            pass
    elif (slide.data or {}).get("image_url"):
        # Preserve the existing visual when the user opted out of a new image.
        data["image_url"] = (slide.data or {}).get("image_url")

    slide.layout = designed["layout"]
    slide.data = data
    if designed.get("speaker_notes"):
        slide.speaker_notes = designed["speaker_notes"]
    deck.status = "ready"
    await db.flush()
    return slide


async def regenerate_slide_image(
    db: AsyncSession, deck: Deck, slide: DeckSlide
) -> DeckSlide:
    """Refresh ONLY the slide's hero image, keeping its copy intact."""
    payload = {
        "layout": slide.layout,
        "data": slide.data or {},
        "image_query": (slide.data or {}).get("image_query"),
        "image_prompt": (slide.data or {}).get("image_prompt"),
    }
    url = await deck_media.regenerate_slide_image(
        deck.id, slide.position, payload, deck.theme,
        provider=_deck_image_provider(deck),
        source=_deck_image_source(deck),
    )
    if url:
        data = dict(slide.data or {})
        data["image_url"] = url
        slide.data = data
        await db.flush()
    return slide


async def add_slide(
    db: AsyncSession,
    workspace: Workspace,
    deck: Deck,
    *,
    after_slide_id: uuid.UUID | None = None,
    layout: str = "bullets",
    instruction: str | None = None,
    generate: bool = True,
    model_key: str | None = None,
) -> DeckSlide:
    """Insert a new slide (optionally AI-authored) after ``after_slide_id``.

    Existing slides at/after the insert point are shifted down so positions stay
    contiguous and ordered.
    """
    ordered = sorted(deck.slides, key=lambda x: x.position)
    insert_pos = len(ordered)
    if after_slide_id is not None:
        for idx, s in enumerate(ordered):
            if s.id == after_slide_id:
                insert_pos = idx + 1
                break

    data: dict[str, Any] = {"title": "New slide"}
    notes: str | None = None
    resolved_layout = (layout or "bullets").lower()
    if generate:
        topic = deck.topic or deck.title or ""
        ground = await chat_context.build_deck_grounding(
            db, workspace, topic, audience=deck.audience
        )
        designed = await deck_designer.design_slide(
            topic=topic,
            grounding=ground["grounding"],
            layout=resolved_layout,
            instruction=instruction,
            deck_title=deck.title,
            audience=deck.audience,
            tone=deck.tone,
            outline=_slide_outline(deck),
            model_key=model_key or deck.model_key,
        )
        resolved_layout = designed["layout"]
        data = dict(designed["data"])
        notes = designed.get("speaker_notes")
        try:
            url = await deck_media.regenerate_slide_image(
                deck.id, insert_pos, designed, deck.theme,
                provider=_deck_image_provider(deck),
                source=_deck_image_source(deck),
            )
            if url:
                data["image_url"] = url
        except Exception:  # noqa: BLE001
            pass

    # Shift everything at/after the insert point down by one.
    for s in ordered:
        if s.position >= insert_pos:
            s.position += 1

    new_slide = DeckSlide(
        deck_id=deck.id,
        position=insert_pos,
        layout=resolved_layout,
        data=data,
        speaker_notes=notes,
    )
    db.add(new_slide)
    deck.status = "ready"
    await db.flush()
    return new_slide


async def duplicate_slide(db: AsyncSession, deck: Deck, slide: DeckSlide) -> DeckSlide:
    """Clone a slide immediately after the original."""
    for s in deck.slides:
        if s.position > slide.position:
            s.position += 1
    clone = DeckSlide(
        deck_id=deck.id,
        position=slide.position + 1,
        layout=slide.layout,
        data=dict(slide.data or {}),
        speaker_notes=slide.speaker_notes,
    )
    db.add(clone)
    await db.flush()
    return clone


# ---------- Collaboration: comments, versions, sharing ----------

async def snapshot_version(db: AsyncSession, deck: Deck, label: str | None = None) -> "DeckVersion":
    """Save a snapshot of the current deck state for version history."""
    from app.models import DeckVersion

    # Count existing versions
    res = await db.execute(
        select(func.count()).select_from(DeckVersion).where(DeckVersion.deck_id == deck.id)
    )
    count = int(res.scalar_one() or 0)

    snapshot = {
        "title": deck.title,
        "style": deck.style,
        "theme": deck.theme,
        "meta": deck.meta,
        "slides": [
            {"layout": s.layout, "data": s.data, "speaker_notes": s.speaker_notes, "position": s.position}
            for s in sorted(deck.slides, key=lambda x: x.position)
        ],
    }
    version = DeckVersion(
        deck_id=deck.id,
        version_number=count + 1,
        snapshot=snapshot,
        label=label,
    )
    db.add(version)
    await db.flush()
    return version


async def list_versions(db: AsyncSession, deck_id: uuid.UUID) -> list["DeckVersion"]:
    from app.models import DeckVersion

    res = await db.execute(
        select(DeckVersion)
        .where(DeckVersion.deck_id == deck_id)
        .order_by(desc(DeckVersion.version_number))
    )
    return list(res.scalars().all())


async def restore_version(db: AsyncSession, deck: Deck, version_id: uuid.UUID) -> Deck:
    """Restore deck from a version snapshot (saves current state first)."""
    from app.models import DeckVersion

    version = await db.get(DeckVersion, version_id)
    if version is None or version.deck_id != deck.id:
        raise ValueError("Version not found")

    # Snapshot current before restoring
    await snapshot_version(db, deck, label="Auto-save before restore")

    snap = version.snapshot or {}
    deck.title = snap.get("title", deck.title)
    deck.style = snap.get("style", deck.style)
    deck.theme = snap.get("theme", deck.theme)
    deck.meta = snap.get("meta", deck.meta)

    # Delete current slides, recreate from snapshot
    await db.execute(delete(DeckSlide).where(DeckSlide.deck_id == deck.id))
    for i, s in enumerate(snap.get("slides", [])):
        db.add(DeckSlide(
            deck_id=deck.id,
            position=s.get("position", i),
            layout=s.get("layout", "bullets"),
            data=s.get("data", {}),
            speaker_notes=s.get("speaker_notes"),
        ))
    deck.status = "ready"
    await db.flush()
    return deck


async def list_comments(db: AsyncSession, deck_id: uuid.UUID) -> list["DeckComment"]:
    from app.models import DeckComment

    res = await db.execute(
        select(DeckComment)
        .where(DeckComment.deck_id == deck_id)
        .order_by(DeckComment.created_at)
    )
    return list(res.scalars().all())


async def create_comment(
    db: AsyncSession, deck_id: uuid.UUID, slide_index: int, author: str, body: str
) -> "DeckComment":
    from app.models import DeckComment

    comment = DeckComment(
        deck_id=deck_id,
        slide_index=slide_index,
        author=author,
        body=body,
    )
    db.add(comment)
    await db.flush()
    return comment


async def resolve_comment(db: AsyncSession, comment_id: uuid.UUID) -> "DeckComment":
    from app.models import DeckComment

    comment = await db.get(DeckComment, comment_id)
    if comment is None:
        raise ValueError("Comment not found")
    comment.resolved = True
    await db.flush()
    return comment


async def enable_sharing(db: AsyncSession, deck: Deck) -> str:
    """Enable public sharing and return the share token."""
    import secrets

    if not deck.share_token:
        deck.share_token = secrets.token_urlsafe(32)
    deck.share_enabled = True
    await db.flush()
    return deck.share_token


async def disable_sharing(db: AsyncSession, deck: Deck) -> None:
    deck.share_enabled = False
    await db.flush()


async def get_shared_deck(db: AsyncSession, token: str) -> "Deck | None":
    """Fetch a shared deck by token (public, no auth)."""
    from app.models import Deck
    from sqlalchemy.orm import selectinload

    res = await db.execute(
        select(Deck)
        .where(Deck.share_token == token, Deck.share_enabled == True)  # noqa: E712
        .options(selectinload(Deck.slides))
    )
    return res.scalar_one_or_none()


async def apply_theme(db: AsyncSession, workspace: "Workspace", deck: Deck, theme_id: str) -> Deck:
    """Re-theme an existing deck without regenerating content."""
    deck.theme = await resolve_theme(db, workspace, deck.style, theme_id=theme_id)
    await db.flush()
    return deck
