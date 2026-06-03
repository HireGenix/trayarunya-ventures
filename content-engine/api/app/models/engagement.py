"""Engagement domain: in-app notifications/alerts and learning-loop signals.

These power two platform capabilities:
- ``Notification`` — workspace-scoped alerts surfaced in the dashboard bell
  (publish failures/successes, ad-budget warnings, performance-drop alerts).
- ``LearningSignal`` — derived findings from real post performance that feed the
  closed feedback loop (winners/losers/patterns) and drive strategy refinement.
"""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Notification(Base, UUIDMixin, TimestampMixin):
    """A single workspace alert shown in the dashboard notification center."""

    __tablename__ = "notifications"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # info | success | warning | error
    level: Mapped[str] = mapped_column(String(20), default="info", nullable=False)
    # category groups alerts: publishing | ads | performance | system | billing
    category: Mapped[str] = mapped_column(String(40), default="system", nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # optional de-dupe key so the alert loop doesn't post the same alert twice
    dedupe_key: Mapped[str | None] = mapped_column(String(200), index=True, nullable=True)


class LearningSignal(Base, UUIDMixin, TimestampMixin):
    """A derived performance finding that feeds the strategy refinement loop."""

    __tablename__ = "learning_signals"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # top_performer | underperformer | pattern
    kind: Mapped[str] = mapped_column(String(40), default="pattern", nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    # frozen metric context (impressions/engagement/ctr/platform/content ref)
    metric: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    applied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
