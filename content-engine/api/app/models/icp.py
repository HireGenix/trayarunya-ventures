"""ICP (Ideal Customer Profile) — per-workspace audience + segment intelligence.

Captured via a guided discovery chat (mirrors the marketing-site contact-page
ICP chat) BEFORE research, then used to ground research, strategy and calendar
generation. One profile per workspace.
"""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# Allowed go-to-market segments. Drives channel mix in strategy + calendar.
SEGMENTS = ("B2B", "B2C", "D2C")


class ICPProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "icp_profiles"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, unique=True
    )
    # draft | ready
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)

    # Core business profile
    segment: Mapped[str | None] = mapped_column(String(10), nullable=True)  # B2B | B2C | D2C
    industry: Mapped[str | None] = mapped_column(String(200), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    company_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_prop: Mapped[str | None] = mapped_column(Text, nullable=True)
    offer: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_customer: Mapped[str | None] = mapped_column(Text, nullable=True)
    brand_voice: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Structured audience intelligence
    personas: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    pains: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    goals: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    geographies: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    channels: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    keywords: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    competitors: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # B2B-only: company vs personal/founder profile alignment for outreach
    b2b: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    completeness: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Full merged extract from the discovery chat (superset of typed columns)
    raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
