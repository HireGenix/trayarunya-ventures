"""Conversation + message persistence for the team chat."""
from __future__ import annotations

import uuid

from sqlalchemy import asc, delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ChatMessage, Conversation


async def list_conversations(db: AsyncSession, workspace_id: uuid.UUID) -> list[Conversation]:
    res = await db.execute(
        select(Conversation)
        .where(Conversation.workspace_id == workspace_id, Conversation.archived.is_(False))
        .order_by(desc(Conversation.pinned), desc(Conversation.updated_at))
    )
    return list(res.scalars().all())


async def get_conversation(
    db: AsyncSession, workspace_id: uuid.UUID, conversation_id: uuid.UUID
) -> Conversation | None:
    res = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
        )
    )
    return res.scalar_one_or_none()


async def create_conversation(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    created_by: uuid.UUID | None,
    *,
    title: str = "New chat",
    model_key: str | None = None,
) -> Conversation:
    convo = Conversation(
        workspace_id=workspace_id,
        created_by=created_by,
        title=title or "New chat",
        model_key=model_key,
    )
    db.add(convo)
    await db.flush()
    return convo


async def list_messages(db: AsyncSession, conversation_id: uuid.UUID) -> list[ChatMessage]:
    res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(asc(ChatMessage.created_at))
    )
    return list(res.scalars().all())


async def add_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    meta: dict | None = None,
) -> ChatMessage:
    msg = ChatMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        meta=meta,
    )
    db.add(msg)
    await db.flush()
    return msg


async def last_message_preview(db: AsyncSession, conversation_id: uuid.UUID) -> str | None:
    res = await db.execute(
        select(ChatMessage.content)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(desc(ChatMessage.created_at))
        .limit(1)
    )
    val = res.scalar_one_or_none()
    if not val:
        return None
    return val[:120]


async def delete_conversation(db: AsyncSession, conversation: Conversation) -> None:
    await db.execute(delete(Conversation).where(Conversation.id == conversation.id))
