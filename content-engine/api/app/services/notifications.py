"""Notification service: create in-app alerts, with optional de-duplication.

Used by routers and background loops (publish failures/successes, ad-budget
warnings, performance-drop alerts) to surface workspace-scoped notifications.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.models import Notification


async def notify(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    level: str,
    category: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    dedupe_key: str | None = None,
) -> Notification | None:
    """Create a workspace notification.

    If ``dedupe_key`` is provided, skip the insert (returning ``None``) when an
    UNREAD notification with the same ``workspace_id`` + ``dedupe_key`` already
    exists, so alert loops don't post the same alert twice.
    """
    if dedupe_key:
        existing = await db.execute(
            select(Notification.id)
            .where(Notification.workspace_id == workspace_id)
            .where(Notification.dedupe_key == dedupe_key)
            .where(Notification.read.is_(False))
            .limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            return None

    notification = Notification(
        workspace_id=workspace_id,
        level=level,
        category=category,
        title=title,
        body=body,
        link=link,
        dedupe_key=dedupe_key,
    )
    db.add(notification)
    await db.flush()
    await db.commit()
    await db.refresh(notification)
    return notification


async def notify_new_session(workspace_id: uuid.UUID, **kw) -> Notification | None:
    """Convenience wrapper that opens its own session for background loops."""
    async with AsyncSessionLocal() as db:
        return await notify(db, workspace_id, **kw)
