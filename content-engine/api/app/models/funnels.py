"""Funnels module: landing pages, funnels and real visit analytics.

Every table is workspace-scoped (FK CASCADE + index). Page content lives as an
ordered list of typed blocks in JSONB so the builder can compose hero / features
/ cta / form / testimonial / faq sections without schema churn. Visit rows are
the single source of truth for conversion-rate math (real, never fabricated).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class LandingPage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "funnels_landing_pages"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", nullable=False)
    # Ordered list of {type:hero/features/cta/form/testimonial/faq, props:{...}}
    blocks: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    seo_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    theme: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    submissions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Funnel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "funnels_funnels"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Ordered list of {page_id?: str, label?: str, goal: str}
    steps: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", nullable=False)


class FunnelVisit(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "funnels_visits"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("funnels_landing_pages.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    funnel_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("funnels_funnels.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    step_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    anon_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
