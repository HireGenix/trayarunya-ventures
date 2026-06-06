"""Marketing Mix Modeling (MMM) & incrementality domain models.

These tables back a *real*, DB-driven marketing-mix model. Spend and revenue
series are stored as ``ChannelSpendSeries`` rows (ingested manually or synced
from real ``RevenueEvent`` / ads ``Metric`` data). A fitted model is an
``MmmModel`` whose ``results`` JSONB holds channel contributions, ROI, base vs.
incremental split and saturation — all computed by least-squares regression on
the actual rows in ``app.services.mmm`` (never fabricated). ``IncrementalityTest``
records holdout/geo/ghost lift experiments per channel.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# Lifecycle states for a fitted model.
MODEL_STATUSES = ("draft", "running", "ready", "failed", "awaiting_data")
# Incrementality experiment methods.
INCREMENTALITY_METHODS = ("holdout", "geo", "ghost")


class MmmModel(Base, UUIDMixin, TimestampMixin):
    """A marketing-mix model fitted over a time window for a workspace."""

    __tablename__ = "mmm_models"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    # List of channel names included in the fit.
    channels: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", nullable=False)
    # {contributions, roi_by_channel, base_vs_incremental, saturation}
    results: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    r_squared: Mapped[float | None] = mapped_column(Float, nullable=True)


class ChannelSpendSeries(Base, UUIDMixin, TimestampMixin):
    """One observation: spend (and optional revenue/conversions) for a channel on a date."""

    __tablename__ = "mmm_channel_spend_series"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    channel: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    spend: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    conversions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    revenue: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str | None] = mapped_column(String(40), nullable=True)


class IncrementalityTest(Base, UUIDMixin, TimestampMixin):
    """A lift experiment (holdout / geo / ghost) measuring incremental impact."""

    __tablename__ = "mmm_incrementality_tests"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    channel: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    method: Mapped[str] = mapped_column(String(20), default="holdout", nullable=False)
    lift_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", nullable=False)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
