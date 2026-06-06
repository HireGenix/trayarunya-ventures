"""organizations.client_limit: per-org agency client cap

Revision ID: 0013_admin_client_limit
Revises: 0012_decks
Create Date: 2026-06-05
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0013_admin_client_limit"
down_revision: Union[str, None] = "0012_decks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("client_limit", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "client_limit")
