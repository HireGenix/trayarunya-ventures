"""Variant assignment — deterministic visitor → variant bucketing.

Each row records which variant a visitor was assigned to for a given experiment.
The assignment is deterministic (hash-based) so the same visitor always sees the
same variant for the same experiment, enabling flicker-free rendering and
consistent analytics attribution.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class VariantAssignment(Base, UUIDMixin):
    """One visitor's deterministic variant assignment for one experiment."""

    __tablename__ = "variant_assignments"

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("experiments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    visitor_id: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    variant_key: Mapped[str] = mapped_column(String(80), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    impressions: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
