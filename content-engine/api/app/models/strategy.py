"""Strategy domain: the master content + social strategy produced by the agents."""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Strategy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "strategies"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    research_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("research_jobs.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Structured strategy produced by the DSPy Strategist agent
    positioning: Mapped[str | None] = mapped_column(Text, nullable=True)
    pillars: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    channel_plan: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    funnel: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    lead_magnets: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    content_calendar: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    kpis: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
