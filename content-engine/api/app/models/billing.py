"""Billing domain: subscription plans and per-workspace usage metering."""
from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Plan(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "plans"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price_monthly: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Limits: workspaces, research_jobs, content_items, social_accounts, ad_accounts, seats
    limits: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    features: Mapped[list | None] = mapped_column(JSONB, nullable=True)


class UsageRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "usage_records"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    metric: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    period: Mapped[date] = mapped_column(Date, index=True, nullable=False)
