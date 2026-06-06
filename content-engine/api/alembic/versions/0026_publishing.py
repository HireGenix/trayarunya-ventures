"""Add publishing enhancements: skipped_not_connected status + permalink column.

Revision ID: 0026_publishing
Revises: 0025_ads_write
Create Date: 2025-01-01 00:00:00.000000
"""
from __future__ import annotations

from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = "0026_publishing"
down_revision: Union[str, None] = "0025_ads_write"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum value to schedule_status (idempotent)
    op.execute(
        "ALTER TYPE schedule_status ADD VALUE IF NOT EXISTS 'skipped_not_connected'"
    )
    # Add permalink column to schedules (idempotent)
    op.execute(
        "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS permalink VARCHAR(600)"
    )


def downgrade() -> None:
    op.drop_column("schedules", "permalink")
    # Postgres does not support DROP VALUE from an enum easily; leaving it.
