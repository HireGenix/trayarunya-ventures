"""Email enterprise: enrollments + A/B testing + tracking columns.

Revision ID: 0015
Revises: 0014
Create Date: 2025-07-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0015"
down_revision = "0014_marketing_suite"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- New table: email_enrollments ---
    op.create_table(
        "email_enrollments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sequence_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("email_sequences.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("subscriber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("email_subscribers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("current_step", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.String(40), nullable=False, server_default="enrolled"),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- New columns on email_campaigns ---
    op.add_column("email_campaigns", sa.Column("ab_test", postgresql.JSONB, nullable=True))

    # --- New columns on email_send_logs ---
    op.add_column("email_send_logs", sa.Column("variant_key", sa.String(40), nullable=True))
    op.add_column("email_send_logs", sa.Column("sequence_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_sendlog_sequence",
        "email_send_logs",
        "email_sequences",
        ["sequence_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_email_send_logs_sequence_id", "email_send_logs", ["sequence_id"])


def downgrade() -> None:
    op.drop_index("ix_email_send_logs_sequence_id", table_name="email_send_logs")
    op.drop_constraint("fk_sendlog_sequence", "email_send_logs", type_="foreignkey")
    op.drop_column("email_send_logs", "sequence_id")
    op.drop_column("email_send_logs", "variant_key")
    op.drop_column("email_campaigns", "ab_test")
    op.drop_table("email_enrollments")
