"""Public shared-deck endpoints — NO authentication required.

Mounted without auth middleware so unauthenticated viewers can access shared
decks via share token.  Analytics beacons (view / heartbeat) record REAL
viewer sessions — never fabricated data.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.deck import Deck, DeckSlide, DeckView, DeckSlideView
from app.schemas import (
    DeckDetail,
    DeckHeartbeatRequest,
    DeckShareMeta,
    DeckUnlockRequest,
    DeckViewOut,
)
from app.security import verify_password
from app.services import deck_service

router = APIRouter(prefix="/p/decks", tags=["deck-shared"])


def _check_expiry(deck: Deck) -> None:
    """Raise 410 Gone if the share link has expired."""
    if deck.expires_at and deck.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_410_GONE, "This share link has expired")


# ---------- Metadata (no slide content leaked) ----------

@router.get("/shared/{token}/meta", response_model=DeckShareMeta)
async def shared_deck_meta(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> DeckShareMeta:
    """Return share-gate metadata WITHOUT leaking slide content."""
    deck = await deck_service.get_shared_deck(db, token)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found or sharing is disabled")
    expired = bool(
        deck.expires_at
        and deck.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
    )
    slide_count = len(deck.slides) if deck.slides else 0
    return DeckShareMeta(
        title=deck.title,
        slide_count=slide_count,
        require_email=bool(deck.require_email),
        require_password=bool(deck.password_hash),
        expired=expired,
    )


# ---------- Full deck (gated by email/password if configured) ----------

@router.get("/shared/{token}", response_model=DeckDetail)
async def get_shared_deck(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    """Return a deck for public viewing via its share token.

    If the deck requires email or password, this endpoint still returns the
    deck to maintain backward compat — the /meta + /unlock flow is the
    recommended gate.  The frontend should check meta first.
    """
    deck = await deck_service.get_shared_deck(db, token)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found or sharing is disabled")
    _check_expiry(deck)
    return DeckDetail.model_validate(deck)


# ---------- Unlock (email / password gate) ----------

@router.post("/shared/{token}/unlock", response_model=DeckDetail)
async def unlock_shared_deck(
    token: str,
    body: DeckUnlockRequest,
    db: AsyncSession = Depends(get_db),
) -> DeckDetail:
    """Validate email / password and return the full deck."""
    deck = await deck_service.get_shared_deck(db, token)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found or sharing is disabled")
    _check_expiry(deck)

    if deck.password_hash:
        if not body.password or not verify_password(body.password, deck.password_hash):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Incorrect password")

    if deck.require_email and not body.email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Email is required")

    return DeckDetail.model_validate(deck)


# ---------- View beacon ----------

@router.post("/shared/{token}/view", response_model=DeckViewOut)
async def record_view(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> DeckViewOut:
    """Create a DeckView session for a real viewer visit."""
    deck = await deck_service.get_shared_deck(db, token)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found or sharing is disabled")
    _check_expiry(deck)

    import uuid as _uuid

    now = datetime.now(timezone.utc)
    session_id = _uuid.uuid4().hex[:32]
    view = DeckView(
        workspace_id=deck.workspace_id,
        deck_id=deck.id,
        share_token=token,
        session_id=session_id,
        started_at=now,
        last_seen_at=now,
        total_seconds=0,
    )
    db.add(view)
    await db.commit()
    return DeckViewOut(session_id=session_id)


# ---------- Heartbeat beacon ----------

@router.post("/shared/{token}/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
async def heartbeat(
    token: str,
    body: DeckHeartbeatRequest,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Upsert per-slide engagement and bump the DeckView session."""
    deck = await deck_service.get_shared_deck(db, token)
    if deck is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deck not found")

    now = datetime.now(timezone.utc)

    # Bump DeckView.last_seen_at + total_seconds
    stmt_view = (
        update(DeckView)
        .where(DeckView.session_id == body.session_id, DeckView.deck_id == deck.id)
        .values(last_seen_at=now, total_seconds=DeckView.total_seconds + body.delta_seconds)
    )
    await db.execute(stmt_view)

    # Upsert DeckSlideView
    result = await db.execute(
        select(DeckSlideView).where(
            DeckSlideView.session_id == body.session_id,
            DeckSlideView.deck_id == deck.id,
            DeckSlideView.slide_index == body.slide_index,
        )
    )
    sv = result.scalar_one_or_none()
    if sv:
        sv.seconds += body.delta_seconds
        sv.viewed_at = now
    else:
        sv = DeckSlideView(
            deck_id=deck.id,
            session_id=body.session_id,
            slide_index=body.slide_index,
            seconds=body.delta_seconds,
            viewed_at=now,
        )
        db.add(sv)

    await db.commit()
