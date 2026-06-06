"""Multi-tenant core: users, organizations, workspaces, memberships.

Tenancy model
-------------
- ``User``       : a person with login credentials (global identity).
- ``Organization``: top-level tenant (an individual, freelancer, company or agency).
- ``Workspace``  : a brand/client space inside an org (agencies have many).
- ``Membership`` : links a user to an org with a role; optionally scoped to a workspace.

Almost every domain row is scoped by ``workspace_id`` for hard tenant isolation.
"""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class OrgType(str, enum.Enum):
    individual = "individual"
    freelancer = "freelancer"
    company = "company"
    agency = "agency"


class Role(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    manager = "manager"
    editor = "editor"
    viewer = "viewer"


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Organization(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    org_type: Mapped[OrgType] = mapped_column(
        Enum(OrgType, name="org_type"), default=OrgType.company, nullable=False
    )
    plan: Mapped[str] = mapped_column(String(50), default="free", nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Per-org override for the max number of client workspaces (agencies). When
    # null, the plan's ``limits.workspaces`` allowance applies.
    client_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)

    workspaces: Mapped[list["Workspace"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )


class Workspace(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "workspaces"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="workspaces")

    __table_args__ = (
        UniqueConstraint("organization_id", "slug", name="uq_workspace_org_slug"),
    )


class Membership(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "memberships"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    role: Mapped[Role] = mapped_column(Enum(Role, name="role"), default=Role.owner, nullable=False)

    user: Mapped["User"] = relationship(back_populates="memberships")
    organization: Mapped["Organization"] = relationship(back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_member_user_org"),
    )
