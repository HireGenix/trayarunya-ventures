"""Client portal models: invites + members.

The client portal lets an agency invite a customer (their "marketing partner")
into a **single workspace** with a restricted, read-only/approval experience.

Security model
--------------
- A portal user is a normal :class:`~app.models.tenant.User` (so they get a real
  password + JWT), but their access is granted via :class:`ClientPortalMember`,
  **not** via the agency :class:`~app.models.tenant.Membership`.  Because every
  agency endpoint authorizes through ``Membership``, a portal client can never
  reach the agency dashboard — they have no membership row.
- Invites store only a SHA-256 ``token_hash``; the raw token is shown to the
  agency exactly once and embedded in the share link.  It cannot be recovered
  from the database.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class PortalRole(str, enum.Enum):
    """What a client can do inside the portal."""

    viewer = "viewer"        # read-only: dashboards, reports, status
    approver = "approver"    # viewer + can approve / request changes on content


class InviteStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    revoked = "revoked"


class ClientPortalInvite(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "client_portal_invites"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    role: Mapped[PortalRole] = mapped_column(
        Enum(PortalRole, name="portal_role"), default=PortalRole.viewer, nullable=False
    )
    # SHA-256 hex of the random invite token. Raw token is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    status: Mapped[InviteStatus] = mapped_column(
        Enum(InviteStatus, name="invite_status"),
        default=InviteStatus.pending,
        index=True,
        nullable=False,
    )
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    invited_by_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    accepted_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class ClientPortalMember(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "client_portal_members"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[PortalRole] = mapped_column(
        Enum(PortalRole, name="portal_role"), default=PortalRole.viewer, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_portal_member_ws_user"),
    )
