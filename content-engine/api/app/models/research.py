"""Research domain: research jobs, competitors, and audience insights."""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class ResearchJob(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "research_jobs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    topic: Mapped[str] = mapped_column(String(500), nullable=False)
    target_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status"), default=JobStatus.queued, index=True, nullable=False
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Structured outputs
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    findings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    sources: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # Live agent reasoning trace + overall grounding confidence (Deep Research v3)
    reasoning: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Targeting (Deep Research v2)
    countries: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    platforms: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    self_handle: Mapped[str | None] = mapped_column(String(300), nullable=True)


class Competitor(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "competitors"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    research_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("research_jobs.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    positioning: Mapped[str | None] = mapped_column(Text, nullable=True)
    strengths: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    weaknesses: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    content_themes: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # Deep Research v2: where they operate + their social handles per platform
    country: Mapped[str | None] = mapped_column(String(80), nullable=True)
    social_handles: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class AuditSnapshot(Base, UUIDMixin, TimestampMixin):
    """A point-in-time public audit of one profile on one platform.

    Captured automatically after a research job (client + each discovered
    competitor) so we can render benchmark tables and track growth over time.
    """

    __tablename__ = "audit_snapshots"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    research_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("research_jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    competitor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competitors.id", ondelete="CASCADE"), nullable=True
    )
    platform: Mapped[str] = mapped_column(String(40), default="instagram", nullable=False)
    handle: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_primary: Mapped[bool] = mapped_column(default=False, nullable=False)
    country: Mapped[str | None] = mapped_column(String(80), nullable=True)
    profile: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Insight(Base, UUIDMixin, TimestampMixin):
    """AnswerThePublic-style demand/insight unit (question, keyword, trend)."""

    __tablename__ = "insights"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    research_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("research_jobs.id", ondelete="SET NULL"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(40), default="question", index=True, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[str | None] = mapped_column(String(40), nullable=True)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # new | tagged | actioned | archived
    status: Mapped[str] = mapped_column(String(30), default="new", nullable=False)
