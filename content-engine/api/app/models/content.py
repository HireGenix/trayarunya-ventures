"""Content domain: content items (posts/threads/blogs/lead-magnets) and assets."""
from __future__ import annotations

import enum
import uuid
from datetime import date as date_
from datetime import datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

class ContentStatus(str, enum.Enum):
    draft = "draft"
    in_review = "in_review"
    approved = "approved"
    scheduled = "scheduled"
    published = "published"
    archived = "archived"


class ContentType(str, enum.Enum):
    social_post = "social_post"
    thread = "thread"
    blog = "blog"
    newsletter = "newsletter"
    lead_magnet = "lead_magnet"
    ad_copy = "ad_copy"


class ContentItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "content_items"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    strategy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("strategies.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    content_type: Mapped[ContentType] = mapped_column(
        Enum(ContentType, name="content_type"), default=ContentType.social_post, nullable=False
    )
    status: Mapped[ContentStatus] = mapped_column(
        Enum(ContentStatus, name="content_status"),
        default=ContentStatus.draft,
        index=True,
        nullable=False,
    )
    platform: Mapped[str | None] = mapped_column(String(40), nullable=True)
    title: Mapped[str | None] = mapped_column(String(400), nullable=True)
    body: Mapped[str] = mapped_column(Text, default="", nullable=False)
    # Per-platform variants, hashtags, CTAs, QA notes, etc.
    variants: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Asset(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "assets"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    content_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="CASCADE"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(40), default="image", nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class ContentCalendar(Base, UUIDMixin, TimestampMixin):
    """A date-wise, multi-platform content calendar for a client/workspace.

    ``entries`` is a JSONB list; each entry is a dict like::

        {
          "id": "<uuid>",
          "date": "2026-06-03",
          "platform": "linkedin",
          "content_type": "social_post",
          "title": "...",
          "hook": "...",
          "theme": "...",
          "funnel_stage": "awareness",
          "notes": "...",
          "status": "planned" | "generated",
          "content_item_id": "<uuid>" | null
        }
    """

    __tablename__ = "content_calendars"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    strategy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("strategies.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), default="Content Calendar", nullable=False)
    client_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    start_date: Mapped["date_"] = mapped_column(Date, nullable=False)
    end_date: Mapped["date_"] = mapped_column(Date, nullable=False)
    platforms: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    entries: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class ContentImage(Base, UUIDMixin, TimestampMixin):
    """AI-generated social graphic. PNG bytes are stored base64 in the DB so the
    asset survives container restarts without external blob storage."""

    __tablename__ = "content_images"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    content_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider: Mapped[str | None] = mapped_column(String(40), nullable=True)
    style: Mapped[str | None] = mapped_column(String(60), nullable=True)
    size: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mime: Mapped[str] = mapped_column(String(40), default="image/png", nullable=False)
    data_b64: Mapped[str] = mapped_column(Text, nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class ContentVideo(Base, UUIDMixin, TimestampMixin):
    """AI-generated short-form video (Reels/Shorts/TikTok/YouTube).

    Built from an AI script + Pexels stock b-roll + Azure OpenAI voiceover +
    auto word-timed captions, assembled with ffmpeg into an MP4.

    Video bytes are large, so unlike ``ContentImage`` they are NOT stored in the
    DB. ``storage`` is ``"blob"`` (Azure Blob, ``url`` is the public/SAS URL) or
    ``"local"`` (``path`` points at a file under ``settings.media_root``; bytes
    are streamed via ``/api/v1/videos/{id}/raw``).
    """

    __tablename__ = "content_videos"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    content_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    topic: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # one of: youtube | youtube_shorts | reels | tiktok
    fmt: Mapped[str] = mapped_column(String(40), default="reels", nullable=False)
    provider: Mapped[str | None] = mapped_column(String(60), nullable=True)
    voice: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ready", nullable=False)
    duration_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime: Mapped[str] = mapped_column(String(40), default="video/mp4", nullable=False)
    storage: Mapped[str] = mapped_column(String(20), default="local", nullable=False)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    captions_srt: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
