"""Automation domain: event-driven workflows, runs and tasks.

This powers the platform's automation engine — the "if X happens → do Y" layer
that turns real marketing signals (a new lead, a published post, a client
approval, a performance drop) into concrete actions (notify Slack, send email,
create a task, call a CRM/webhook, raise an in-app alert).

Design is durable and decoupled:

- Domain code emits an :class:`AutomationEvent` inside its own transaction, so an
  event is never lost and never blocks the originating request.
- A background worker atomically *claims* pending events, matches them against
  active :class:`Workflow` rows, evaluates conditions, executes actions and
  records a :class:`WorkflowRun` audit trail. Claiming via a status flip makes it
  safe to run across multiple replicas.
- The ``task`` action writes a real :class:`Task` row that the team works from.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class EventStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class RunStatus(str, enum.Enum):
    success = "success"
    partial = "partial"
    failed = "failed"
    skipped = "skipped"


class TaskStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    done = "done"


class AutomationEvent(Base, UUIDMixin, TimestampMixin):
    """A durable domain signal awaiting workflow processing."""

    __tablename__ = "automation_events"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # Dotted event/trigger type, e.g. "revenue.lead", "content.published".
    event_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[EventStatus] = mapped_column(
        String(20), default=EventStatus.pending, index=True, nullable=False
    )
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Source of the event: domain module name or "manual"/"external".
    source: Mapped[str] = mapped_column(String(40), default="system", nullable=False)


class Workflow(Base, UUIDMixin, TimestampMixin):
    """An automation rule: a trigger + optional conditions + ordered actions."""

    __tablename__ = "automation_workflows"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The event/trigger type this workflow listens for.
    trigger_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    # List of {field, op, value} — all must pass (AND).
    conditions: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # Ordered list of {type, config} action steps.
    actions: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    run_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_name: Mapped[str | None] = mapped_column(String(200), nullable=True)


class WorkflowRun(Base, UUIDMixin, TimestampMixin):
    """A single execution of a workflow against one triggering event."""

    __tablename__ = "automation_runs"

    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("automation_workflows.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    event_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("automation_events.id", ondelete="SET NULL"),
        nullable=True,
    )
    trigger_type: Mapped[str] = mapped_column(String(80), nullable=False)
    trigger_payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[RunStatus] = mapped_column(
        String(20), default=RunStatus.success, index=True, nullable=False
    )
    # Per-action results: [{type, status, detail}].
    steps: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # True when triggered via the manual "test" endpoint rather than a live event.
    is_test: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class Task(Base, UUIDMixin, TimestampMixin):
    """An actionable to-do — created by automations or by the team manually."""

    __tablename__ = "automation_tasks"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        String(20), default=TaskStatus.open, index=True, nullable=False
    )
    # low | normal | high
    priority: Mapped[str] = mapped_column(String(20), default="normal", nullable=False)
    assignee: Mapped[str | None] = mapped_column(String(200), nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # manual | automation
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    workflow_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("automation_workflows.id", ondelete="SET NULL"),
        nullable=True,
    )
    run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("automation_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
