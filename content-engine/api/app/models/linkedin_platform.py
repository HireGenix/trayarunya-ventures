"""LinkedIn platform models — accounts, leads, pipeline, observations, outreach.

Powers the AI-guided, human-operated LinkedIn Copilot desktop app. Everything is
human-in-the-loop: the platform stores leads, pipeline stages, AI observations and
suggested (never auto-executed) outreach. It never stores LinkedIn passwords or
session cookies and never automates connections, messages or profile edits.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class LeadStage(str, enum.Enum):
    new = "new"
    researching = "researching"
    warming_up = "warming_up"
    connect_sent = "connect_sent"
    connected = "connected"
    in_conversation = "in_conversation"
    qualified = "qualified"
    won = "won"
    lost = "lost"
    nurture = "nurture"


class TaskType(str, enum.Enum):
    research = "research"
    warmup = "warmup"
    connect = "connect"
    follow_up = "follow_up"
    message = "message"
    content = "content"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    snoozed = "snoozed"
    done = "done"
    skipped = "skipped"


class AccountStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    archived = "archived"


class LinkedInAccount(Base, UUIDMixin, TimestampMixin):
    """A LinkedIn identity operated inside an isolated desktop browser window."""

    __tablename__ = "linkedin_accounts"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    profile_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    objective: Mapped[str] = mapped_column(String(120), nullable=False, default="high_ticket_leads")
    icp: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    offer: Mapped[str | None] = mapped_column(Text, nullable=True)
    voice: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Desktop session partition name (no credentials, no cookies — just an isolation key).
    session_partition: Mapped[str | None] = mapped_column(String(120), nullable=True)
    proxy_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=AccountStatus.active.value, nullable=False, index=True)
    daily_connect_cap: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    daily_message_cap: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LinkedInLead(Base, UUIDMixin, TimestampMixin):
    """A prospect being moved through the LinkedIn pipeline by a human operator."""

    __tablename__ = "linkedin_leads"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_accounts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(240), nullable=False)
    headline: Mapped[str | None] = mapped_column(String(600), nullable=True)
    company: Mapped[str | None] = mapped_column(String(240), nullable=True)
    role_title: Mapped[str | None] = mapped_column(String(240), nullable=True)
    location: Mapped[str | None] = mapped_column(String(240), nullable=True)
    profile_url: Mapped[str | None] = mapped_column(String(600), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    stage: Mapped[str] = mapped_column(String(30), default=LeadStage.new.value, nullable=False, index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False, index=True)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    enrichment: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(80), nullable=True)
    connect_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    message_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_action_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_action_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)


class LeadStageEvent(Base, UUIDMixin, TimestampMixin):
    """An audit-trail entry for every pipeline stage transition."""

    __tablename__ = "linkedin_lead_stage_events"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_leads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    from_stage: Mapped[str | None] = mapped_column(String(30), nullable=True)
    to_stage: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)


class LeadObservation(Base, UUIDMixin, TimestampMixin):
    """A point-in-time AI reading of a lead's profile/activity from the live browser."""

    __tablename__ = "linkedin_lead_observations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_leads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_accounts.id", ondelete="SET NULL"), nullable=True
    )
    source: Mapped[str] = mapped_column(String(40), default="vision", nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    signals: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    recommended_action: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class OutreachSequence(Base, UUIDMixin, TimestampMixin):
    """A human-paced, multi-touch outreach cadence template (suggested, never auto-run)."""

    __tablename__ = "linkedin_outreach_sequences"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_accounts.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    objective: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class OutreachStep(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "linkedin_outreach_steps"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sequence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_outreach_sequences.id", ondelete="CASCADE"), index=True, nullable=False
    )
    step_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    channel: Mapped[str] = mapped_column(String(40), default="linkedin", nullable=False)
    action_type: Mapped[str] = mapped_column(String(40), default=TaskType.message.value, nullable=False)
    day_offset: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    template: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class LeadTask(Base, UUIDMixin, TimestampMixin):
    """A single human action in the daily work-queue (AI-suggested, human-performed)."""

    __tablename__ = "linkedin_lead_tasks"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_leads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_accounts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    sequence_step_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("linkedin_outreach_steps.id", ondelete="SET NULL"), nullable=True
    )
    task_type: Mapped[str] = mapped_column(String(40), default=TaskType.research.value, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_copy: Mapped[str | None] = mapped_column(Text, nullable=True)
    policy_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default=TaskStatus.pending.value, nullable=False, index=True)
    due_date: Mapped[datetime | None] = mapped_column(Date, nullable=True, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("lead_id", "task_type", "sequence_step_id", name="uq_lead_task_step"),
    )
