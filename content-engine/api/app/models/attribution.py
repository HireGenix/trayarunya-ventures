"""Revenue attribution models.

A single ``RevenueEvent`` table captures the full journey from marketing
touchpoint to closed revenue, so we can attribute pipeline and revenue back to
the channel/campaign that drove it:

    touch (channel spend/effort) -> lead -> mql -> sql -> opportunity -> closed

Each row is one event for one contact at one stage. ``value`` carries currency
amounts (deal value at opportunity/closed stages; optional cost on touch rows).
Attribution math (first-touch, last-touch, linear) is computed in
``app.services.attribution`` from these rows — we never fabricate numbers.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# Canonical marketing channels we attribute to.
CHANNELS = (
    "linkedin",
    "content",
    "ads",
    "email",
    "organic",
    "referral",
    "events",
    "other",
)

# Funnel stages in order. ``touch`` is a pre-lead marketing interaction.
STAGES = (
    "touch",
    "lead",
    "mql",
    "sql",
    "opportunity",
    "closed_won",
    "closed_lost",
)

# Stages that represent real revenue (won) for ROI computation.
WON_STAGES = ("closed_won",)
# Stages counted as open pipeline value.
PIPELINE_STAGES = ("opportunity", "sql", "mql")


class RevenueEvent(Base, UUIDMixin, TimestampMixin):
    """One attribution event: a contact reaching a funnel stage via a channel."""

    __tablename__ = "revenue_events"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # Stable identifier for the person/company across events (email, CRM id…).
    contact_ref: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    channel: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    campaign: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    stage: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    # Revenue (deal value) for opportunity/closed rows; cost for touch rows.
    value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    # Optional CRM linkage + free-form context.
    external_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    source: Mapped[str | None] = mapped_column(String(60), nullable=True)  # crm/import/manual
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
