"""DB-backed content template overrides (optional per-workspace customization).

The code-level template registry in ``services/content_templates.py`` provides
the built-in templates. Workspaces can override or add custom templates via
this table. The router checks both sources.
"""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ContentTemplateModel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "content_templates"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
    )
    template_key: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str] = mapped_column(
        String(40), default="blog", nullable=False
    )
    variables: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_prompt_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
