"""Reputation models — reviews, review-requests and connected sources.

Every table is workspace-scoped (FK CASCADE + index) and writes only real rows.
External profile metrics (avg rating / totals) are stored verbatim from a
connector or manual entry — never fabricated.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# Canonical vocabularies (kept here so service/agent/router agree).
REVIEW_SOURCES = ("google", "trustpilot", "g2", "facebook", "manual")
REVIEW_STATUSES = ("new", "responded", "flagged")
REVIEW_SENTIMENTS = ("positive", "neutral", "negative")
REQUEST_CHANNELS = ("email", "sms")
REQUEST_STATUSES = ("queued", "sent", "clicked", "reviewed")


class Review(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reputation_reviews"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source: Mapped[str] = mapped_column(String(40), default="manual", nullable=False)
    author: Mapped[str | None] = mapped_column(String(200), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    themes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="new", nullable=False)
    response_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    external_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    review_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class ReviewRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reputation_review_requests"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    customer_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    channel: Mapped[str] = mapped_column(String(20), default="email", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class ReputationSource(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reputation_sources"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source: Mapped[str] = mapped_column(String(40), default="google", nullable=False)
    profile_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    avg_rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_reviews: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_connected: Mapped[bool] = mapped_column(default=False, nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
