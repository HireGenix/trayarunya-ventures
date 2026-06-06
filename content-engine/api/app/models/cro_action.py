"""CRO Agent models — autonomous recommendations + per-workspace autonomy.

The CRO Agent (Phase 3) senses the funnel, diagnoses the biggest revenue leaks
and proposes concrete moves. Each proposal is persisted as a :class:`CROAction`
so the workspace has a durable, auditable activity log: what the agent saw, what
it suggested, the expected lift / revenue, and whether a human (or the agent
itself, at higher autonomy) acted on it.

``CROSettings`` stores the workspace's autonomy level and guardrails so the
background loop knows how far it is allowed to act without a human.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# What the agent can recommend.
ACTION_KINDS = (
    "leak_fix",       # plug a funnel drop-off
    "experiment",     # spin up an A/B test
    "ship_winner",    # roll out a proven variant
    "segment",        # personalize for a segment
    "insight",        # an observation worth surfacing
)

# Lifecycle of a recommendation.
ACTION_STATUSES = (
    "suggested",   # agent proposed it, awaiting decision
    "approved",    # human (or auto) approved → being acted on
    "running",     # experiment live / action in flight
    "shipped",     # completed and rolled out
    "dismissed",   # rejected / not pursued
)

# Autonomy levels — how far the agent may go without a human.
AUTONOMY_LEVELS = ("suggest", "approve", "auto")


class CROSettings(Base, UUIDMixin, TimestampMixin):
    """Per-workspace CRO Agent configuration (one row per workspace)."""

    __tablename__ = "cro_settings"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    # suggest = log only, approve = create drafts needing sign-off, auto = act.
    autonomy: Mapped[str] = mapped_column(String(20), default="suggest", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Guardrails the agent must respect even at ``auto``.
    min_visitors: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    max_active_experiments: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class CROAction(Base, UUIDMixin, TimestampMixin):
    """One CRO Agent recommendation / action in the workspace activity log."""

    __tablename__ = "cro_actions"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(30), default="insight", nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="suggested", index=True, nullable=False
    )
    priority: Mapped[str] = mapped_column(String(10), default="medium", nullable=False)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Quantified upside (REAL, derived from funnel math — never fabricated).
    expected_lift_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    expected_revenue: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0..1

    # The funnel leak / stage this action targets.
    target_stage: Mapped[str | None] = mapped_column(String(60), nullable=True)
    # Link to the experiment spun up to act on this (if any).
    experiment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    # Stable fingerprint so the loop can de-dupe identical open suggestions.
    dedupe_key: Mapped[str | None] = mapped_column(String(200), index=True, nullable=True)

    auto_executed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    acted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
