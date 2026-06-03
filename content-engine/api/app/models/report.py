"""Client-facing report snapshot model."""
from __future__ import annotations

import uuid

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Report(Base, UUIDMixin, TimestampMixin):
    """Immutable snapshot of workspace metrics shared with a client.

    The ``token`` column holds a random UUID used as the public share key —
    it is NOT the same as the primary-key ``id``.  The ``data`` JSONB column
    stores a frozen copy of AnalyticsSummary + per-post stats so the report
    never changes after creation even if underlying metrics are refreshed.
    """

    __tablename__ = "reports"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token: Mapped[str] = mapped_column(
        String(36), unique=True, index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    client_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    date_from: Mapped[str | None] = mapped_column(Date, nullable=True)  # ISO date
    date_to: Mapped[str | None] = mapped_column(Date, nullable=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
