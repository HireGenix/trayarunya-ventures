"""Content optimization: templates table.

Revision ID: 0016
Revises: 0015
Create Date: 2025-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- New table: content_templates (optional DB-backed template overrides) ---
    op.create_table(
        "content_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("template_key", sa.String(100), nullable=False),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("content_type", sa.String(40), nullable=False, server_default="blog"),
        sa.Column("variables", postgresql.JSONB, nullable=True),
        sa.Column("system_prompt", sa.Text, nullable=True),
        sa.Column("user_prompt_template", sa.Text, nullable=True),
        sa.Column("meta", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("content_templates")
