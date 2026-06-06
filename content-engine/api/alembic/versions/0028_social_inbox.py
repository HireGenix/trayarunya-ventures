"""Add conversation_id and intent columns to social_inbox_items; platform_reply_id to replies.

Revision ID: 0028_social_inbox
Revises: 0027_messaging
Create Date: 2025-01-01 00:00:00.000000
"""
from __future__ import annotations

from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = "0028_social_inbox"
down_revision: Union[str, None] = "0027_messaging"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE social_inbox_items ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(300)"
    )
    op.execute(
        "ALTER TABLE social_inbox_items ADD COLUMN IF NOT EXISTS intent VARCHAR(40)"
    )
    op.execute(
        "ALTER TABLE social_inbox_items ADD COLUMN IF NOT EXISTS urgency VARCHAR(20)"
    )
    op.execute(
        "ALTER TABLE social_inbox_replies ADD COLUMN IF NOT EXISTS platform_reply_id VARCHAR(300)"
    )


def downgrade() -> None:
    op.drop_column("social_inbox_replies", "platform_reply_id")
    op.drop_column("social_inbox_items", "urgency")
    op.drop_column("social_inbox_items", "intent")
    op.drop_column("social_inbox_items", "conversation_id")
