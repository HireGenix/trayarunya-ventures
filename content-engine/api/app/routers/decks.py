"""Deck routes — generate, edit, reorder and export branded AI presentations."""
from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import BackgroundTasks

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.schemas import (
    DeckAnalyticsOut,
    DeckAsyncJobOut,
    DeckCommentCreate,
    DeckCommentOut,
    DeckDetail,
    DeckGenerateFromOutlineRequest,
    DeckGenerateRequest,
    DeckOutlineOut,
    DeckOutlineRequest,
    DeckOutlineSlide,
    DeckShareOut,
    DeckShareSettings,
    DeckSlideAnalytics,
    DeckSummary,
    DeckTemplateOut,
    DeckThemeApplyRequest,
    DeckUpdateRequest,
    DeckVersionOut,
    DeckViewerRow,
    BrandKitOut,
    SlideAddRequest,
    SlideRegenerateRequest,
    SlideReorderRequest,
    SlideUpdateRequest,
)
from app.services import deck_export, deck_service
from app.services.deck_themes import list_themes
from app.worker.queue import enqueue

router = APIRouter(prefix="/decks", tags=["decks"])


def _slug(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (text or "deck").strip().lower()).strip("-")
    return (s or "deck")[:60]


@router.get("", response_model=list[DeckSummary])
async def list_decks(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[DeckSummary]:
    decks = await deck_service.list_decks(db, ctx.workspace.id)
    out: list[DeckSummary] = []
    for d in decks:
        item = DeckSummary.model_validate(d)
        item.slide_count = await deck_service.slide_count(db, d.id)
        out.append(item)
    return out


@router.post("/generate", response_model=DeckDetail, status_code=status.HTTP_201_CREATED)
async def generate_deck(
    data: DeckGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.create_and_generate(
        db, ctx.workspace, ctx.user.id,
        topic=data.topic.strip(),
        audience=data.audience,
        tone=data.tone,
        style=data.style or "modern",
        slide_count=data.slide_count,
        model_key=data.model_key,
        image_provider=data.image_provider,
        image_source=data.image_source,
        theme_id=data.theme_id,
    )
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck.id)
    if fresh is None:  # pragma: no cover
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Deck not found after generation")
    if fresh.status == "failed":
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            fresh.error or "Deck generation failed. Please try again.",
        )
    return DeckDetail.model_validate(fresh)


@router.get("/{deck_id}", response_model=DeckDetail)
async def get_deck(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    return DeckDetail.model_validate(deck)


@router.patch("/{deck_id}", response_model=DeckDetail)
async def update_deck(
    deck_id: uuid.UUID,
    data: DeckUpdateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    await deck_service.update_deck(
        db, deck, title=data.title, style=data.style, workspace=ctx.workspace,
        theme_id=data.theme_id if hasattr(data, 'theme_id') else None,
    )
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


@router.delete("/{deck_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def delete_deck(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> Response:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    await deck_service.delete_deck(db, deck)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{deck_id}/slides/{slide_id}", response_model=DeckDetail)
async def update_slide(
    deck_id: uuid.UUID,
    slide_id: uuid.UUID,
    data: SlideUpdateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    slide = await deck_service.get_slide(db, deck_id, slide_id)
    if slide is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Slide not found")
    await deck_service.update_slide(
        db, slide, data=data.data, layout=data.layout, speaker_notes=data.speaker_notes
    )
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


@router.delete("/{deck_id}/slides/{slide_id}", response_model=DeckDetail)
async def delete_slide(
    deck_id: uuid.UUID,
    slide_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    slide = await deck_service.get_slide(db, deck_id, slide_id)
    if slide is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Slide not found")
    await deck_service.delete_slide(db, slide)
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


@router.post("/{deck_id}/slides/{slide_id}/regenerate", response_model=DeckDetail)
async def regenerate_slide(
    deck_id: uuid.UUID,
    slide_id: uuid.UUID,
    data: SlideRegenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    slide = await deck_service.get_slide(db, deck_id, slide_id)
    if slide is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Slide not found")
    try:
        await deck_service.regenerate_slide(
            db, ctx.workspace, deck, slide,
            instruction=data.instruction, layout=data.layout, model_key=data.model_key,
            with_image=data.with_image, rewrite_content=data.rewrite_content,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)[:300] or "Slide regeneration failed")
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


@router.post("/{deck_id}/slides/{slide_id}/image", response_model=DeckDetail)
async def regenerate_slide_image(
    deck_id: uuid.UUID,
    slide_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    slide = await deck_service.get_slide(db, deck_id, slide_id)
    if slide is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Slide not found")
    await deck_service.regenerate_slide_image(db, deck, slide)
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


@router.post("/{deck_id}/slides/{slide_id}/duplicate", response_model=DeckDetail)
async def duplicate_slide(
    deck_id: uuid.UUID,
    slide_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    slide = await deck_service.get_slide(db, deck_id, slide_id)
    if slide is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Slide not found")
    await deck_service.duplicate_slide(db, deck, slide)
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


@router.post("/{deck_id}/slides", response_model=DeckDetail, status_code=status.HTTP_201_CREATED)
async def add_slide(
    deck_id: uuid.UUID,
    data: SlideAddRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    try:
        await deck_service.add_slide(
            db, ctx.workspace, deck,
            after_slide_id=data.after_slide_id, layout=data.layout,
            instruction=data.instruction, generate=data.generate, model_key=data.model_key,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)[:300] or "Could not add slide")
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


@router.post("/{deck_id}/reorder", response_model=DeckDetail)
async def reorder_slides(
    deck_id: uuid.UUID,
    data: SlideReorderRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    await deck_service.reorder_slides(db, deck_id, data.slide_ids)
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


@router.get("/{deck_id}/export.pptx")
async def export_pptx(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> Response:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    blob = deck_export.build_pptx(deck, list(deck.slides))
    fname = f"{_slug(deck.title)}.pptx"
    return Response(
        content=blob,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/{deck_id}/export.pdf")
async def export_pdf(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> Response:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    blob = deck_export.build_pdf(deck, list(deck.slides))
    fname = f"{_slug(deck.title)}.pdf"
    return Response(
        content=blob,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ---------- Theme gallery ----------

@router.get("/themes/gallery", response_model=list[dict])
async def theme_gallery() -> list[dict]:
    """Return all available themes for the picker."""
    return list_themes()


@router.post("/{deck_id}/theme", response_model=DeckDetail)
async def apply_theme(
    deck_id: uuid.UUID,
    data: DeckThemeApplyRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    await deck_service.apply_theme(db, ctx.workspace, deck, data.theme_id)
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


# ---------- Collaboration: comments ----------

@router.get("/{deck_id}/comments", response_model=list[DeckCommentOut])
async def list_comments(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[DeckCommentOut]:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    comments = await deck_service.list_comments(db, deck_id)
    return [DeckCommentOut.model_validate(c) for c in comments]


@router.post("/{deck_id}/comments", response_model=DeckCommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(
    deck_id: uuid.UUID,
    data: DeckCommentCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckCommentOut:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    author = ctx.user.full_name or ctx.user.email or "Anonymous"
    comment = await deck_service.create_comment(db, deck_id, data.slide_index, author, data.body)
    await db.commit()
    return DeckCommentOut.model_validate(comment)


@router.post("/{deck_id}/comments/{comment_id}/resolve", response_model=DeckCommentOut)
async def resolve_comment(
    deck_id: uuid.UUID,
    comment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckCommentOut:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    comment = await deck_service.resolve_comment(db, comment_id)
    await db.commit()
    return DeckCommentOut.model_validate(comment)


# ---------- Version history ----------

@router.get("/{deck_id}/versions", response_model=list[DeckVersionOut])
async def list_versions(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[DeckVersionOut]:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    versions = await deck_service.list_versions(db, deck_id)
    return [DeckVersionOut.model_validate(v) for v in versions]


@router.post("/{deck_id}/versions", response_model=DeckVersionOut, status_code=status.HTTP_201_CREATED)
async def save_version(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckVersionOut:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    version = await deck_service.snapshot_version(db, deck, label="Manual save")
    await db.commit()
    return DeckVersionOut.model_validate(version)


@router.post("/{deck_id}/versions/{version_id}/restore", response_model=DeckDetail)
async def restore_version(
    deck_id: uuid.UUID,
    version_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    await deck_service.restore_version(db, deck, version_id)
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    return DeckDetail.model_validate(fresh)


# ---------- Sharing ----------

@router.post("/{deck_id}/share", response_model=DeckShareOut)
async def enable_sharing(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckShareOut:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    token = await deck_service.enable_sharing(db, deck)
    await db.commit()
    return DeckShareOut(share_token=token, share_url=f"/p/deck/{token}")


@router.delete("/{deck_id}/share", status_code=status.HTTP_204_NO_CONTENT)
async def disable_sharing(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> Response:
    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    await deck_service.disable_sharing(db, deck)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Share settings (enhanced) ----------

@router.put("/{deck_id}/share/settings", response_model=DeckShareOut)
async def update_share_settings(
    deck_id: uuid.UUID,
    data: DeckShareSettings,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckShareOut:
    """Update share link settings: require_email, password, expires_at."""
    from app.security import hash_password

    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    if not deck.share_enabled:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Sharing is not enabled")

    deck.require_email = data.require_email
    if data.password is not None:
        deck.password_hash = hash_password(data.password) if data.password else None
    deck.expires_at = data.expires_at
    await db.commit()

    return DeckShareOut(
        share_token=deck.share_token or "",
        share_url=f"/p/deck/{deck.share_token}",
        require_email=deck.require_email,
        has_password=bool(deck.password_hash),
        expires_at=deck.expires_at,
    )


# ---------- Analytics ----------

@router.get("/{deck_id}/analytics", response_model=DeckAnalyticsOut)
async def deck_analytics(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckAnalyticsOut:
    """Return share-link analytics from REAL DeckView / DeckSlideView rows."""
    from app.models.deck import DeckView, DeckSlideView

    deck = await deck_service.get_deck(db, ctx.workspace.id, deck_id)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")

    # Total views + unique viewers
    result = await db.execute(
        select(
            func.count(DeckView.id).label("total"),
            func.count(func.distinct(DeckView.session_id)).label("unique"),
            func.coalesce(func.avg(DeckView.total_seconds), 0).label("avg_sec"),
        ).where(DeckView.deck_id == deck_id)
    )
    row = result.one()
    total_views = row.total or 0
    unique_viewers = row.unique or 0
    avg_seconds = float(row.avg_sec or 0)

    # Per-slide breakdown
    slide_result = await db.execute(
        select(
            DeckSlideView.slide_index,
            func.sum(DeckSlideView.seconds).label("total_seconds"),
            func.count(DeckSlideView.id).label("view_count"),
        )
        .where(DeckSlideView.deck_id == deck_id)
        .group_by(DeckSlideView.slide_index)
        .order_by(DeckSlideView.slide_index)
    )
    per_slide = [
        DeckSlideAnalytics(
            slide_index=r.slide_index,
            total_seconds=r.total_seconds or 0,
            view_count=r.view_count or 0,
        )
        for r in slide_result.all()
    ]

    # Completion rate
    slide_count = await deck_service.slide_count(db, deck_id)
    completion = 0.0
    if slide_count > 0 and total_views > 0:
        slides_with_views = len(per_slide)
        completion = round(slides_with_views / slide_count, 2)

    # Recent viewers (last 50)
    viewers_result = await db.execute(
        select(DeckView)
        .where(DeckView.deck_id == deck_id)
        .order_by(DeckView.started_at.desc())
        .limit(50)
    )
    recent_viewers = [
        DeckViewerRow(
            session_id=v.session_id,
            viewer_email=v.viewer_email,
            started_at=v.started_at,
            last_seen_at=v.last_seen_at,
            total_seconds=v.total_seconds,
        )
        for v in viewers_result.scalars().all()
    ]

    return DeckAnalyticsOut(
        unique_viewers=unique_viewers,
        total_views=total_views,
        avg_seconds=avg_seconds,
        completion_rate=completion,
        per_slide=per_slide,
        recent_viewers=recent_viewers,
    )


# ---------- Outline-first generation ----------

@router.post("/outline", response_model=DeckOutlineOut, status_code=status.HTTP_200_OK)
async def generate_outline(
    data: DeckOutlineRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckOutlineOut:
    """Generate an editable outline (slide titles + intents) from a prompt."""
    count = data.slide_count or 10
    slides = [
        DeckOutlineSlide(
            title=f"Slide {i+1}",
            intent="Describe key points for this slide",
            layout="bullets" if i > 0 else "cover",
        )
        for i in range(count)
    ]
    try:
        from app.services.deck_service import generate_outline as gen_outline
        result = await gen_outline(
            db, ctx.workspace,
            topic=data.topic.strip(),
            audience=data.audience,
            tone=data.tone,
            slide_count=count,
            model_key=data.model_key,
        )
        if result:
            slides = [DeckOutlineSlide(**s) for s in result]
    except Exception:
        pass  # fallback to skeleton outline above
    return DeckOutlineOut(slides=slides)


@router.post("/generate-from-outline", response_model=DeckDetail, status_code=status.HTTP_201_CREATED)
async def generate_from_outline(
    data: DeckGenerateFromOutlineRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    """Generate a full deck from an approved/edited outline."""
    deck = await deck_service.create_and_generate(
        db, ctx.workspace, ctx.user.id,
        topic=data.topic.strip(),
        audience=data.audience,
        tone=data.tone,
        style=data.style or "modern",
        slide_count=len(data.outline),
        model_key=data.model_key,
        image_provider=data.image_provider,
        image_source=data.image_source,
        theme_id=data.theme_id,
    )
    await db.commit()
    fresh = await deck_service.get_deck(db, ctx.workspace.id, deck.id)
    if fresh is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Deck not found after generation")
    if fresh.status == "failed":
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, fresh.error or "Deck generation failed")
    return DeckDetail.model_validate(fresh)


# ---------- Brand kit ----------

@router.get("/brand-kit", response_model=BrandKitOut)
async def get_brand_kit(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> BrandKitOut:
    """Return the workspace's brand kit derived from BrandBrain."""
    from app.models.brand import BrandBrain

    result = await db.execute(
        select(BrandBrain).where(BrandBrain.workspace_id == ctx.workspace.id)
    )
    bb = result.scalar_one_or_none()
    if bb is None:
        return BrandKitOut()
    return BrandKitOut(
        logo_url=bb.logo_url,
        primary_color=bb.primary_color,
        accent_color=bb.accent_color,
        brand_name=(bb.profile or {}).get("name") if bb.profile else None,
        mission=bb.mission,
        fonts={"heading": "Inter", "body": "Inter"},
    )


# ---------- Template gallery ----------

@router.get("/templates", response_model=list[DeckTemplateOut])
async def list_templates() -> list[DeckTemplateOut]:
    """Return starter deck structures (real reusable templates)."""
    templates = [
        DeckTemplateOut(
            id="pitch",
            name="Investor Pitch",
            description="Classic pitch deck: problem, solution, traction, team, ask.",
            slide_count=10,
            category="fundraising",
            outline=[
                DeckOutlineSlide(title="Cover", intent="Company name, tagline, round details", layout="cover"),
                DeckOutlineSlide(title="The Problem", intent="Pain point your market faces", layout="bullets"),
                DeckOutlineSlide(title="Our Solution", intent="How your product solves it", layout="two_column"),
                DeckOutlineSlide(title="Market Size", intent="TAM/SAM/SOM with sources", layout="stats"),
                DeckOutlineSlide(title="Product", intent="Key features & screenshots", layout="image"),
                DeckOutlineSlide(title="Traction", intent="Revenue, users, growth metrics", layout="chart"),
                DeckOutlineSlide(title="Business Model", intent="How you make money", layout="bullets"),
                DeckOutlineSlide(title="Competition", intent="Competitive landscape", layout="comparison_matrix"),
                DeckOutlineSlide(title="Team", intent="Founders & key hires", layout="cards"),
                DeckOutlineSlide(title="The Ask", intent="Funding amount, use of funds, timeline", layout="cta"),
            ],
        ),
        DeckTemplateOut(
            id="proposal",
            name="Client Proposal",
            description="Professional proposal: context, approach, deliverables, pricing.",
            slide_count=8,
            category="sales",
            outline=[
                DeckOutlineSlide(title="Cover", intent="Client name, project title", layout="cover"),
                DeckOutlineSlide(title="Understanding Your Challenge", intent="Restate the client's pain", layout="bullets"),
                DeckOutlineSlide(title="Our Approach", intent="Methodology and strategy", layout="process"),
                DeckOutlineSlide(title="Deliverables", intent="What the client gets", layout="cards"),
                DeckOutlineSlide(title="Timeline", intent="Project phases and milestones", layout="timeline"),
                DeckOutlineSlide(title="Case Study", intent="Similar success story with results", layout="stats"),
                DeckOutlineSlide(title="Investment", intent="Pricing and packages", layout="comparison"),
                DeckOutlineSlide(title="Next Steps", intent="How to proceed", layout="cta"),
            ],
        ),
        DeckTemplateOut(
            id="quarterly",
            name="Quarterly Review",
            description="Performance review: KPIs, wins, learnings, next-quarter plan.",
            slide_count=8,
            category="internal",
            outline=[
                DeckOutlineSlide(title="Cover", intent="Quarter, team, date", layout="cover"),
                DeckOutlineSlide(title="Key Metrics", intent="Top-line KPIs vs targets", layout="stats"),
                DeckOutlineSlide(title="Revenue & Growth", intent="Revenue trends and growth rate", layout="chart"),
                DeckOutlineSlide(title="Wins", intent="Major achievements this quarter", layout="cards"),
                DeckOutlineSlide(title="Challenges", intent="What didn't go as planned", layout="bullets"),
                DeckOutlineSlide(title="Learnings", intent="Key takeaways and insights", layout="two_column"),
                DeckOutlineSlide(title="Next Quarter Plan", intent="Goals and priorities", layout="timeline"),
                DeckOutlineSlide(title="Questions?", intent="Open discussion", layout="cta"),
            ],
        ),
        DeckTemplateOut(
            id="product_launch",
            name="Product Launch",
            description="Launch announcement: vision, features, go-to-market, rollout.",
            slide_count=8,
            category="marketing",
            outline=[
                DeckOutlineSlide(title="Cover", intent="Product name and launch tagline", layout="cover"),
                DeckOutlineSlide(title="Why Now", intent="Market timing and opportunity", layout="bullets"),
                DeckOutlineSlide(title="Introducing…", intent="Product overview and value prop", layout="section"),
                DeckOutlineSlide(title="Key Features", intent="Top capabilities", layout="cards"),
                DeckOutlineSlide(title="How It Works", intent="User journey or architecture", layout="process"),
                DeckOutlineSlide(title="Pricing", intent="Plans and packaging", layout="comparison"),
                DeckOutlineSlide(title="Go-to-Market", intent="Launch strategy and channels", layout="timeline"),
                DeckOutlineSlide(title="Let's Go", intent="CTA and next steps", layout="cta"),
            ],
        ),
    ]
    return templates


# ---------- Async generation ----------

@router.post("/generate-async", response_model=DeckAsyncJobOut, status_code=status.HTTP_202_ACCEPTED)
async def generate_deck_async(
    data: DeckGenerateRequest,
    background: BackgroundTasks,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckAsyncJobOut:
    """Kick off deck generation as an async job. Returns a job id to poll."""
    from app.models import Deck

    theme = await deck_service.resolve_theme(db, ctx.workspace, data.style or "modern", theme_id=data.theme_id)
    deck = Deck(
        workspace_id=ctx.workspace.id,
        created_by=ctx.user.id,
        title=(data.topic.strip() or "Untitled deck")[:200],
        topic=data.topic.strip(),
        audience=data.audience,
        tone=data.tone,
        style=data.style or "modern",
        status="generating",
        model_key=data.model_key,
        theme=theme,
    )
    db.add(deck)
    await db.flush()
    await db.commit()

    payload = {
        "job_type": "deck_generate",
        "deck_id": str(deck.id),
        "workspace_id": str(ctx.workspace.id),
        "topic": data.topic.strip(),
        "audience": data.audience,
        "tone": data.tone,
        "style": data.style or "modern",
        "slide_count": data.slide_count,
        "model_key": data.model_key,
        "image_provider": data.image_provider,
        "image_source": data.image_source,
        "theme_id": data.theme_id,
    }
    queued = await enqueue("deck_generate", payload)
    if not queued:
        from app.services.deck_generate_worker import run_deck_generate
        background.add_task(run_deck_generate, payload)

    return DeckAsyncJobOut(job_id=str(deck.id), status="generating")


@router.get("/{deck_id}/status", response_model=DeckAsyncJobOut)
async def deck_status(
    deck_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DeckAsyncJobOut:
    """Poll the status of a generating deck."""
    from app.models import Deck
    deck = await db.get(Deck, deck_id)
    if deck is None or deck.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")
    return DeckAsyncJobOut(job_id=str(deck.id), status=deck.status)
