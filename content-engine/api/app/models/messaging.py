"""Messaging models — SMS & WhatsApp marketing.

Real, DB-backed entities for an agentic messaging module:

* :class:`MessagingContact`  — an opt-in audience member on a channel.
* :class:`MessageTemplate`   — a reusable, variable-bearing message body.
* :class:`MessageBroadcast`  — a one-to-many send (immediate or scheduled).
* :class:`MessageLog`        — the per-recipient delivery ledger that every
  rate (delivered / read / failed) is computed from.

All tables are workspace-scoped (FK CASCADE + index) so a workspace deletion
cleans up its messaging footprint atomically.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

CHANNELS = ("sms", "whatsapp")
TEMPLATE_CATEGORIES = ("marketing", "utility")
TEMPLATE_STATUSES = ("draft", "pending", "approved")
BROADCAST_STATUSES = ("draft", "scheduled", "sending", "sent")
LOG_STATUSES = ("queued", "sent", "delivered", "read", "failed")


class MessagingContact(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "messaging_contacts"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    channel: Mapped[str] = mapped_column(String(20), default="sms", nullable=False)
    opt_in: Mapped[bool] = mapped_column(default=True, nullable=False)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)


class MessageTemplate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "messaging_templates"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="sms", nullable=False)
    category: Mapped[str] = mapped_column(String(20), default="marketing", nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    # WhatsApp marketing templates must be approved by the BSP before use.
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    variables: Mapped[list | None] = mapped_column(JSONB, nullable=True)


class MessageBroadcast(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "messaging_broadcasts"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="sms", nullable=False)
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messaging_templates.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Audience segmentation filter, e.g. {"tag": "vip", "opt_in": true}.
    audience: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Rolled-up counters {sent, delivered, read, failed} computed from logs.
    stats: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class MessageLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "messaging_logs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    broadcast_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messaging_broadcasts.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messaging_contacts.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    channel: Mapped[str] = mapped_column(String(20), default="sms", nullable=False)
    to_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False)
    provider_message_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
