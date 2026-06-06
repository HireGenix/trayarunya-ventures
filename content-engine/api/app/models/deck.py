"""AI deck generator — branded, on-message presentations.

Every deck belongs to a workspace and is generated grounded on that workspace's
ICP, brand brain, strategy and research, then themed with the brand's colours so
the output is on-brand, not a blank template. Slides are stored individually so
they can be re-ordered, edited and re-rendered.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

# Deck lifecycle.
DECK_STATUSES = ("draft", "generating", "ready", "failed")

# Supported slide layouts the designer + renderer understand.
SLIDE_LAYOUTS = (
    "cover",
    "agenda",
    "section",
    "bullets",
    "two_column",
    "stats",
    "quote",
    "timeline",
    "comparison",
    "cta",
    "image",
    "references",
    "cards",
    "process",
    "comparison_matrix",
    "chart",
)


class Deck(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "decks"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), default="Untitled deck", nullable=False)
    # The user's prompt / brief that produced this deck.
    topic: Mapped[str | None] = mapped_column(Text, nullable=True)
    audience: Mapped[str | None] = mapped_column(String(300), nullable=True)
    tone: Mapped[str | None] = mapped_column(String(120), nullable=True)
    style: Mapped[str] = mapped_column(String(40), default="modern", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    model_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Resolved theme tokens (primary/accent/font/style) used by web + exporters.
    theme: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    share_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    share_enabled: Mapped[bool] = mapped_column(default=False, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    require_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)

    slides: Mapped[list["DeckSlide"]] = relationship(
        "DeckSlide",
        back_populates="deck",
        cascade="all, delete-orphan",
        order_by="DeckSlide.position",
    )


class DeckSlide(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "deck_slides"

    deck_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    layout: Mapped[str] = mapped_column(String(40), default="bullets", nullable=False)
    # Layout-specific structured content (title, bullets, stats, quote, …).
    data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    speaker_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    deck: Mapped["Deck"] = relationship("Deck", back_populates="slides")


class DeckComment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "deck_comments"

    deck_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    slide_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    author: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(default=False, nullable=False)


class DeckVersion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "deck_versions"

    deck_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    label: Mapped[str | None] = mapped_column(String(200), nullable=True)


class DeckView(Base, UUIDMixin, TimestampMixin):
    """One viewer session on a shared deck — recorded by the public beacon."""
    __tablename__ = "deck_views"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    deck_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    share_token: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    session_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    viewer_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    total_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class DeckSlideView(Base, UUIDMixin, TimestampMixin):
    """Per-slide engagement for a viewer session — upserted by heartbeat."""
    __tablename__ = "deck_slide_views"

    deck_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    session_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    slide_index: Mapped[int] = mapped_column(Integer, nullable=False)
    seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
