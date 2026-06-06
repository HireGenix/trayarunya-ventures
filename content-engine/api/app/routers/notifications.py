"""In-app notification center: list, unread-count, mark-read, delete.

All endpoints are scoped to the caller's active workspace.
"""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    level: str
    category: str
    title: str
    body: str | None
    link: str | None
    read: bool
    created_at: dt.datetime


class UnreadCountOut(BaseModel):
    count: int


class ReadAllOut(BaseModel):
    updated: int


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationOut]:
    stmt = select(Notification).where(Notification.workspace_id == ctx.workspace.id)
    if unread_only:
        stmt = stmt.where(Notification.read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return [NotificationOut.model_validate(n) for n in res.scalars().all()]


@router.get("/unread-count", response_model=UnreadCountOut)
async def unread_count(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> UnreadCountOut:
    stmt = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.workspace_id == ctx.workspace.id)
        .where(Notification.read.is_(False))
    )
    res = await db.execute(stmt)
    return UnreadCountOut(count=int(res.scalar_one()))


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> NotificationOut:
    notification = await db.get(Notification, notification_id)
    if not notification or notification.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    notification.read = True
    await db.commit()
    await db.refresh(notification)
    return NotificationOut.model_validate(notification)


@router.post("/read-all", response_model=ReadAllOut)
async def mark_all_read(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ReadAllOut:
    stmt = (
        update(Notification)
        .where(Notification.workspace_id == ctx.workspace.id)
        .where(Notification.read.is_(False))
        .values(read=True)
    )
    res = await db.execute(stmt)
    await db.commit()
    return ReadAllOut(updated=int(res.rowcount or 0))


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_notification(
    notification_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    notification = await db.get(Notification, notification_id)
    if not notification or notification.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    await db.delete(notification)
    await db.commit()
