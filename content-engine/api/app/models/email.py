"""Native Email Marketing Engine — lists, subscribers, campaigns, drip
sequences and per-send delivery telemetry.

All tables are workspace-scoped (FK CASCADE + index). Flexible blobs use JSONB
so the agent and service layers can persist structured AI output and real
aggregate stats without schema churn.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin, TimestampMixin

# Canonical status vocabularies (kept here so router + service agree).
SUBSCRIBER_STATUSES = ("subscribed", "unsubscribed", "bounced", "complained", "pending")
CAMPAIGN_STATUSES = ("draft", "scheduled", "sending", "sent", "failed")
SENDLOG_STATUSES = ("queued", "sent", "opened", "clicked", "bounced", "failed")


class EmailList(Base, UUIDMixin, TimestampMixin):
    """A named audience list of subscribers."""

    __tablename__ = "email_lists"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Optional default merge fields / settings for the list.
    settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class EmailSubscriber(Base, UUIDMixin, TimestampMixin):
    """A single contact belonging to a list."""

    __tablename__ = "email_subscribers"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    list_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_lists.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="subscribed", nullable=False)
    # Free-form segmentation primitives.
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    attributes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Double opt-in confirmation token (set while status == "pending").
    confirm_token: Mapped[str | None] = mapped_column(String(200), nullable=True)


class EmailCampaign(Base, UUIDMixin, TimestampMixin):
    """A one-off broadcast to a list."""

    __tablename__ = "email_campaigns"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    list_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_lists.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    preheader: Mapped[str | None] = mapped_column(String(500), nullable=True)
    from_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    body_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Structured block representation (subject variants, sections, etc.).
    body_blocks: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Optional dynamic audience: resolve recipients from a saved segment.
    segment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_segments.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(40), default="draft", nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Real aggregate counters: {"sent": n, "opens": n, "clicks": n, "bounces": n}.
    stats: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ab_test: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class EmailSequence(Base, UUIDMixin, TimestampMixin):
    """A drip automation: a trigger plus ordered, delayed steps."""

    __tablename__ = "email_sequences"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    list_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_lists.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    trigger: Mapped[str] = mapped_column(String(80), default="subscribe", nullable=False)
    # Ordered list: [{"order": 1, "delay_hours": 0, "subject": "...", "template": "..."}].
    steps: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Autonomy: suggest / approve / auto.
    autonomy: Mapped[str] = mapped_column(String(20), default="suggest", nullable=False)


class EmailSendLog(Base, UUIDMixin, TimestampMixin):
    """Per-recipient delivery + engagement record (the analytics source of truth)."""

    __tablename__ = "email_send_logs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_campaigns.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    subscriber_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_subscribers.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="queued", nullable=False)
    provider: Mapped[str | None] = mapped_column(String(60), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The specific URL a recipient clicked (populated on click webhook).
    clicked_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    opened_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    clicked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    variant_key: Mapped[str | None] = mapped_column(String(40), nullable=True)
    sequence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_sequences.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )


ENROLLMENT_STATUSES = ("enrolled", "completed", "cancelled")


class EmailEnrollment(Base, UUIDMixin, TimestampMixin):
    """Tracks a subscriber's progress through a drip sequence."""

    __tablename__ = "email_enrollments"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sequence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_sequences.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    subscriber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_subscribers.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    current_step: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="enrolled", nullable=False)
    next_run_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class EmailTemplate(Base, UUIDMixin, TimestampMixin):
    """A reusable, block-based email design (starter gallery or workspace-owned)."""

    __tablename__ = "email_templates"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    preheader: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Structured block representation consumed by the email compiler.
    body_blocks: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    thumbnail: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_starter: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class EmailSegment(Base, UUIDMixin, TimestampMixin):
    """A saved, rule-driven audience that resolves to subscribers at send time."""

    __tablename__ = "email_segments"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    list_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_lists.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Conditions blob: {"match": "all"|"any", "conditions": [...]}.
    rules: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class EmailSuppression(Base, UUIDMixin, TimestampMixin):
    """A global do-not-send entry (hard bounces, complaints, manual blocks)."""

    __tablename__ = "email_suppressions"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
