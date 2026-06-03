"""Brand Brain: per-workspace brand identity, voice and color system."""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class BrandBrain(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "brand_brains"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, unique=True
    )
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Extracted brand identity
    primary_color: Mapped[str | None] = mapped_column(String(9), nullable=True)
    accent_color: Mapped[str | None] = mapped_column(String(9), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    mission: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_prop: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Voice + audience captured as structured JSON
    voice: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    audience: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    pillars: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    keywords: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # Raw extracted profile from the deep-research crawl
    profile: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
