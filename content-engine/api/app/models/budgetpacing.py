"""Budget pacing domain: cross-channel budgets, spend records, pacing alerts
and AI reallocation proposals. All rows are workspace-scoped (CASCADE)."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Budget(Base, UUIDMixin, TimestampMixin):
    """A cross-channel budget envelope for a workspace over a period."""

    __tablename__ = "budgetpacing_budgets"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    period: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    # {channel: amount} allocation map, e.g. {"google": 5000, "meta": 3000}
    channels: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)


class SpendRecord(Base, UUIDMixin, TimestampMixin):
    """A single spend observation, either entered manually or synced from ads."""

    __tablename__ = "budgetpacing_spend_records"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    budget_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("budgetpacing_budgets.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    channel: Mapped[str] = mapped_column(String(40), default="other", nullable=False)
    amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class PacingAlert(Base, UUIDMixin, TimestampMixin):
    """A detected pacing condition that needs attention."""

    __tablename__ = "budgetpacing_alerts"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    budget_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("budgetpacing_budgets.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    kind: Mapped[str] = mapped_column(String(30), default="overspend", nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(20), default="warning", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)


class ReallocationProposal(Base, UUIDMixin, TimestampMixin):
    """An AI (or deterministic) proposal to move budget between channels."""

    __tablename__ = "budgetpacing_proposals"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    budget_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("budgetpacing_budgets.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    # [{"from": "meta", "to": "google", "amount": 500, "reason": "..."}]
    moves: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    projected_lift: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="suggested", nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
