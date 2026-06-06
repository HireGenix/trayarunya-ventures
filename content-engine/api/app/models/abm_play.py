"""ABM Play orchestration models: multi-step plays + account enrollment.

Three tables support the full play lifecycle:

    AbmPlay           -> a named multi-step ABM play (email / ad / content / task)
    AbmPlayStep       -> an ordered step inside a play (channel + instructions)
    AbmPlayEnrollment -> tracks one account's progress through a play

Plays are workspace-scoped, steps are JSONB-free first-class rows for
queryability, and enrollment carries a status state-machine:

    pending -> active -> paused -> completed
                      -> skipped
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

PLAY_STATUSES = ("draft", "active", "paused", "archived")
ENROLLMENT_STATUSES = ("pending", "active", "paused", "completed", "skipped")


class AbmPlay(Base, UUIDMixin, TimestampMixin):
    """A reusable multi-step ABM play (sequence of outreach actions)."""

    __tablename__ = "abm_plays"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # draft | active | paused | archived
    status: Mapped[str] = mapped_column(
        String(20), default="draft", nullable=False, index=True
    )
    # Ordered list of step summaries cached for list views.
    step_summary: Mapped[list | None] = mapped_column(JSONB, nullable=True)


class AbmPlayStep(Base, UUIDMixin, TimestampMixin):
    """One ordered step inside an ABM play."""

    __tablename__ = "abm_play_steps"

    play_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("abm_plays.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    ordinal: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # email | linkedin | ad | content | task | call
    channel: Mapped[str] = mapped_column(String(40), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(400), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    delay_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class AbmPlayEnrollment(Base, UUIDMixin, TimestampMixin):
    """Tracks one account's progress through a play."""

    __tablename__ = "abm_play_enrollments"

    play_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("abm_plays.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("abm_accounts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # pending | active | paused | completed | skipped
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )
    current_step: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
