"""Lead Scoring & Nurture models.

Three tables capture the full lead-scoring loop, all grounded in real rows:

    Lead          -> one contact in the workspace pipeline (stage + derived score/grade)
    LeadActivity  -> one real engagement signal for a lead (page view, email open…)
    ScoringRule   -> a workspace-defined rule that awards points when matched

Scores are NEVER random: ``app.services.leadscore`` recomputes each lead's score
by summing the points of active ``ScoringRule`` rows that match the lead's real
activities/attributes, then assigns an A/B/C/D grade by threshold.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# Lifecycle stages, in funnel order.
LEAD_STAGES = ("subscriber", "mql", "sql", "opportunity", "customer")

# Real engagement signal kinds we can score on.
ACTIVITY_KINDS = (
    "page_view",
    "email_open",
    "email_click",
    "form_submit",
    "meeting",
    "custom",
)

# Letter grades, best to worst.
GRADES = ("A", "B", "C", "D")

# Autonomy levels for the lead-scoring agent.
AUTONOMY_LEVELS = ("suggest", "approve", "auto")


class Lead(Base, UUIDMixin, TimestampMixin):
    """One contact in the workspace pipeline with a derived score + grade."""

    __tablename__ = "leadscore_leads"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    source: Mapped[str | None] = mapped_column(String(80), nullable=True)
    stage: Mapped[str] = mapped_column(
        String(20), default="subscriber", index=True, nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    grade: Mapped[str] = mapped_column(String(1), default="D", nullable=False)
    # Firmographic / ICP-fit attributes the rules can match against.
    attributes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    last_activity_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class LeadActivity(Base, UUIDMixin, TimestampMixin):
    """One real engagement signal for a lead — the raw input to scoring."""

    __tablename__ = "leadscore_activities"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("leadscore_leads.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class ScoringRule(Base, UUIDMixin, TimestampMixin):
    """A workspace-defined rule that awards points when matched.

    ``condition`` is a small JSON predicate, e.g.::

        {"activity_kind": "email_click", "op": "count_gte", "value": 2}
        {"field": "company", "op": "exists"}
        {"field": "source", "op": "eq", "value": "webinar"}
    """

    __tablename__ = "leadscore_rules"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    condition: Mapped[dict] = mapped_column(JSONB, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
