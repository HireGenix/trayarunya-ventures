"""Social domain: connected social accounts (OAuth) and publishing schedules."""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class SocialPlatform(str, enum.Enum):
    linkedin = "linkedin"
    x = "x"
    instagram = "instagram"
    facebook = "facebook"
    youtube = "youtube"
    tiktok = "tiktok"


class ScheduleStatus(str, enum.Enum):
    pending = "pending"
    publishing = "publishing"
    published = "published"
    failed = "failed"
    canceled = "canceled"
    skipped_not_connected = "skipped_not_connected"


class SocialAccount(Base, UUIDMixin, TimestampMixin):
    """A connected social account. Tokens are stored encrypted at rest in prod."""

    __tablename__ = "social_accounts"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    platform: Mapped[SocialPlatform] = mapped_column(
        Enum(SocialPlatform, name="social_platform"), index=True, nullable=False
    )
    external_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[object | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scopes: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Schedule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "schedules"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    content_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="CASCADE"), index=True
    )
    social_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("social_accounts.id", ondelete="CASCADE"), index=True
    )
    scheduled_at: Mapped[object] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    status: Mapped[ScheduleStatus] = mapped_column(
        Enum(ScheduleStatus, name="schedule_status"),
        default=ScheduleStatus.pending,
        index=True,
        nullable=False,
    )
    external_post_id: Mapped[str | None] = mapped_column(String(300), nullable=True)
    permalink: Mapped[str | None] = mapped_column(String(600), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
