"""decks + deck_slides: AI branded presentation generator

Revision ID: 0012_decks
Revises: 0011_team_chat
Create Date: 2026-06-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0012_decks"
down_revision: Union[str, None] = "0011_team_chat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "decks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=300), nullable=False, server_default="Untitled deck"),
        sa.Column("topic", sa.Text(), nullable=True),
        sa.Column("audience", sa.String(length=300), nullable=True),
        sa.Column("tone", sa.String(length=120), nullable=True),
        sa.Column("style", sa.String(length=40), nullable=False, server_default="modern"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("model_key", sa.String(length=80), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("theme", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_decks_workspace_id", "decks", ["workspace_id"])

    op.create_table(
        "deck_slides",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deck_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("layout", sa.String(length=40), nullable=False, server_default="bullets"),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("speaker_notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["deck_id"], ["decks.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_deck_slides_deck_id", "deck_slides", ["deck_id"])


def downgrade() -> None:
    op.drop_index("ix_deck_slides_deck_id", table_name="deck_slides")
    op.drop_table("deck_slides")
    op.drop_index("ix_decks_workspace_id", table_name="decks")
    op.drop_table("decks")
