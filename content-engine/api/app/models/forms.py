"""Forms module: forms, quizzes, surveys & polls with real submission storage.

Every table is workspace-scoped (FK CASCADE + index). A form's questions live as
an ordered list of typed fields in JSONB so the builder can compose text / email
/ select / radio / checkbox / rating / nps inputs without schema churn. Each
submission row is the single source of truth for completion-rate and scoring math
(real, never fabricated).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Form(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "forms_forms"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # form / quiz / survey / poll
    kind: Mapped[str] = mapped_column(String(40), default="form", nullable=False)
    # Ordered list of {id,label,type,required,options:[...]} where
    # type in text/email/select/radio/checkbox/rating/nps.
    fields: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # {redirect:str, progressive_profiling:bool, ...}
    settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", nullable=False)
    slug: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    submissions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class FormSubmission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "forms_submissions"

    form_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forms_forms.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # {field_id: answer, ...}
    data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(320), nullable=True, index=True)
    # Quiz score or NPS value when applicable; null otherwise.
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    anon_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
