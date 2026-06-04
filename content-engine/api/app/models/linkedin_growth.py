"""LinkedIn Growth Copilot models.

Human-in-the-loop only: the platform stores objectives, user-provided profile
snapshots, AI recommendations and manual action items. It never stores LinkedIn
passwords and never automates connection requests, messages or profile edits.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class LinkedInActionStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    done = "done"
    dismissed = "dismissed"


class LinkedInActionPriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class LinkedInGrowthProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "linkedin_growth_profiles"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    account_label: Mapped[str] = mapped_column(String(200), nullable=False)
    profile_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    objective: Mapped[str] = mapped_column(String(120), nullable=False, default="high_ticket_leads")
    icp: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    offer: Mapped[str | None] = mapped_column(Text, nullable=True)
    voice: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False, index=True)
    latest_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    latest_grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    latest_audit: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    latest_audit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LinkedInProfileAudit(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "linkedin_profile_audits"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_growth_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    objective_context: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    grade: Mapped[str] = mapped_column(String(20), nullable=False, default="needs_work")
    findings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    recommendations: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    drafts: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    compliance: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class LinkedInActionItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "linkedin_action_items"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_growth_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    audit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_profile_audits.id", ondelete="SET NULL"), nullable=True, index=True
    )
    section: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default=LinkedInActionPriority.medium.value, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default=LinkedInActionStatus.open.value, nullable=False, index=True)
    suggested_copy: Mapped[str | None] = mapped_column(Text, nullable=True)
    policy_note: Mapped[str | None] = mapped_column(Text, nullable=True)
