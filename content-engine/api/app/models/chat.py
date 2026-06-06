"""Team chat — a workspace-grounded assistant (ChatGPT/Claude-style) for the team.

Every conversation belongs to a workspace and is silently grounded on that
workspace's live context (ICP, brand brain, latest strategy, recent research) so
the assistant always reasons about the specific company/client/individual whose
account is active.
"""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# Allowed message roles.
ROLES = ("user", "assistant", "system")


class Conversation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "conversations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), default="New chat", nullable=False)
    # Preferred model registry key for this conversation (nullable => platform default).
    model_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class ChatMessage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chat_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user | assistant | system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Optional metadata: model used, grounding snapshot ref, token counts, etc.
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
