"""Guardrails: AI brand-voice & compliance policies, checks and rules.

Every table is workspace-scoped (FK CASCADE + index). Policies define what to
enforce (banned terms, required disclaimers, reading level, tone, claims). A
check is one evaluation of a piece of content, storing the deterministic +
AI-derived violations and an overall 0-100 brand-fit score. Rules are optional
fine-grained regex/keyword patterns attached to a policy.
"""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

POLICY_KINDS = ("voice", "legal", "banned_terms", "claims", "accessibility")
SEVERITIES = ("low", "medium", "high", "critical")
CHECK_STATUSES = ("complete", "queued", "error")


class GuardrailPolicy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "guardrail_policies"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(40), default="voice", nullable=False)
    # config = {banned_words: [], required_disclaimers: [], reading_level: int, tone: str}
    config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    severity: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class GuardrailCheck(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "guardrail_checks"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    content_ref: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    policies_run: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # violations = [{policy, severity, span, message, suggestion}]
    violations: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="complete", nullable=False)


class GuardrailRule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "guardrail_rules"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    policy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("guardrail_policies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    pattern: Mapped[str] = mapped_column(String(500), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
