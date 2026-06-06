"""Social Inbox + Listening domain.

Unified inbox of inbound social interactions (comments, DMs, mentions) plus a
brand-listening layer (keywords and the hits they catch). Every table is
workspace-scoped (FK CASCADE + index) so a workspace teardown is clean.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# Soft enums kept as plain strings so the registry/UI can extend without a
# migration. Documented here for callers.
INBOX_PLATFORMS = ("linkedin", "instagram", "x", "facebook", "youtube", "tiktok")
INBOX_KINDS = ("comment", "dm", "mention")
SENTIMENTS = ("positive", "neutral", "negative")
INBOX_STATUSES = ("unread", "open", "replied", "archived")
REPLY_STATUSES = ("draft", "sent")


class InboxItem(Base, UUIDMixin, TimestampMixin):
    """A single inbound social interaction surfaced into the unified inbox."""

    __tablename__ = "social_inbox_items"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    platform: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(20), default="comment", index=True, nullable=False)
    author_handle: Mapped[str | None] = mapped_column(String(200), nullable=True)
    author_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    permalink: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="unread", index=True, nullable=False)
    assignee_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    external_id: Mapped[str | None] = mapped_column(String(300), index=True, nullable=True)
    conversation_id: Mapped[str | None] = mapped_column(String(300), nullable=True)
    intent: Mapped[str | None] = mapped_column(String(40), nullable=True)
    urgency: Mapped[str | None] = mapped_column(String(20), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True, nullable=True
    )
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class InboxReply(Base, UUIDMixin, TimestampMixin):
    """A reply (draft or sent) authored against an inbox item."""

    __tablename__ = "social_inbox_replies"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    inbox_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("social_inbox_items.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    platform_reply_id: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class ListeningKeyword(Base, UUIDMixin, TimestampMixin):
    """A brand-listening term. ``platform`` NULL means listen across all platforms."""

    __tablename__ = "social_listening_keywords"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    term: Mapped[str] = mapped_column(String(200), nullable=False)
    platform: Mapped[str | None] = mapped_column(String(40), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ListeningHit(Base, UUIDMixin, TimestampMixin):
    """A single match found by a listening keyword."""

    __tablename__ = "social_listening_hits"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    keyword_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("social_listening_keywords.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    platform: Mapped[str | None] = mapped_column(String(40), nullable=True)
    author: Mapped[str | None] = mapped_column(String(300), nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    found_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True, nullable=True
    )
