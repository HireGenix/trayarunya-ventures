"""client portal invites + members

Revision ID: 0003_client_portal
Revises: 0002_revenue_events
Create Date: 2026-06-04
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003_client_portal"
down_revision: Union[str, None] = "0002_revenue_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


portal_role = postgresql.ENUM(
    "viewer", "approver", name="portal_role", create_type=False
)
invite_status = postgresql.ENUM(
    "pending", "accepted", "revoked", name="invite_status", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    portal_role.create(bind, checkfirst=True)
    invite_status.create(bind, checkfirst=True)

    op.create_table(
        "client_portal_invites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", portal_role, nullable=False, server_default="viewer"),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("status", invite_status, nullable=False, server_default="pending"),
        sa.Column("invited_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("invited_by_name", sa.String(length=200), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["accepted_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_client_portal_invites_workspace_id", "client_portal_invites", ["workspace_id"])
    op.create_index("ix_client_portal_invites_email", "client_portal_invites", ["email"])
    op.create_index("ix_client_portal_invites_status", "client_portal_invites", ["status"])
    op.create_index(
        "ix_client_portal_invites_token_hash",
        "client_portal_invites",
        ["token_hash"],
        unique=True,
    )

    op.create_table(
        "client_portal_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", portal_role, nullable=False, server_default="viewer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("invited_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_portal_member_ws_user"),
    )
    op.create_index("ix_client_portal_members_workspace_id", "client_portal_members", ["workspace_id"])
    op.create_index("ix_client_portal_members_user_id", "client_portal_members", ["user_id"])


def downgrade() -> None:
    op.drop_table("client_portal_members")
    op.drop_table("client_portal_invites")
    bind = op.get_bind()
    invite_status.drop(bind, checkfirst=True)
    portal_role.drop(bind, checkfirst=True)
