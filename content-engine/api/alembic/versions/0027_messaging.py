"""Add dispatch columns to messaging_logs: to_phone, body, provider_message_id, delivered_at, read_at.

Revision ID: 0027_messaging
Revises: 0026_publishing
Create Date: 2025-01-01 00:00:00.000000
"""
from __future__ import annotations

from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = "0027_messaging"
down_revision: Union[str, None] = "0026_publishing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS to_phone VARCHAR(40)")
    op.execute("ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS body TEXT")
    op.execute("ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(200)")
    op.execute("ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ")
    op.execute("ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ")


def downgrade() -> None:
    op.drop_column("messaging_logs", "read_at")
    op.drop_column("messaging_logs", "delivered_at")
    op.drop_column("messaging_logs", "provider_message_id")
    op.drop_column("messaging_logs", "body")
    op.drop_column("messaging_logs", "to_phone")
