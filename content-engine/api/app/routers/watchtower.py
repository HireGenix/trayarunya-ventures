"""Competitor Watchtower API: always-on competitor monitoring.

CRUD for watched competitors plus on-demand real checks (fetch homepage, diff
against the stored snapshot, persist detected ``WatchEvent`` rows) and a global
events feed. All endpoints are scoped to the caller's active workspace.
"""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import CompetitorWatch, WatchEvent
from app.services.watchtower import _check_watch, build_snapshot, diff_snapshots

router = APIRouter(prefix="/watchtower", tags=["watchtower"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class WatchCreate(BaseModel):
    name: str
    website: str | None = None
    social_handles: dict | None = None
    seed: bool = True  # run an initial check to seed last_snapshot


class WatchUpdate(BaseModel):
    name: str | None = None
    website: str | None = None
    social_handles: dict | None = None
    active: bool | None = None


class WatchEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    watch_id: uuid.UUID
    kind: str
    title: str
    detail: str | None
    url: str | None
    importance: str
    created_at: dt.datetime


class WatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    website: str | None
    social_handles: dict | None
    active: bool
    last_checked_at: dt.datetime | None
    created_at: dt.datetime


class WatchListItem(WatchOut):
    event_count: int = 0


class WatchDetail(WatchOut):
    last_snapshot: dict | None
    events: list[WatchEventOut] = []


class CheckResult(BaseModel):
    watch_id: uuid.UUID
    ok: bool
    events_created: int
    error: str | None = None
    events: list[WatchEventOut] = []


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
async def _get_owned_watch(
    watch_id: uuid.UUID, ctx: WorkspaceContext, db: AsyncSession
) -> CompetitorWatch:
    watch = await db.get(CompetitorWatch, watch_id)
    if watch is None or watch.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Watch not found")
    return watch


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@router.get("", response_model=list[WatchListItem])
async def list_watches(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[WatchListItem]:
    res = await db.execute(
        select(CompetitorWatch)
        .where(CompetitorWatch.workspace_id == ctx.workspace.id)
        .order_by(CompetitorWatch.created_at.desc())
    )
    watches = res.scalars().all()

    counts_res = await db.execute(
        select(WatchEvent.watch_id, func.count())
        .where(WatchEvent.workspace_id == ctx.workspace.id)
        .group_by(WatchEvent.watch_id)
    )
    counts = {row[0]: int(row[1]) for row in counts_res.all()}

    items: list[WatchListItem] = []
    for w in watches:
        item = WatchListItem.model_validate(w)
        item.event_count = counts.get(w.id, 0)
        items.append(item)
    return items


@router.post("", response_model=WatchDetail, status_code=status.HTTP_201_CREATED)
async def create_watch(
    payload: WatchCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> WatchDetail:
    if not payload.name.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Name is required")

    watch = CompetitorWatch(
        workspace_id=ctx.workspace.id,
        name=payload.name.strip(),
        website=(payload.website or "").strip() or None,
        social_handles=payload.social_handles,
        active=True,
    )
    db.add(watch)
    await db.flush()

    if payload.seed and watch.website:
        snapshot = await build_snapshot(watch.website)
        watch.last_checked_at = dt.datetime.now(dt.timezone.utc)
        if snapshot.get("ok"):
            watch.last_snapshot = snapshot
    db.add(watch)
    await db.flush()
    await db.commit()
    await db.refresh(watch)

    detail = WatchDetail.model_validate(watch)
    detail.events = []
    return detail


@router.get("/events", response_model=list[WatchEventOut])
async def list_events(
    limit: int = Query(default=50, ge=1, le=200),
    importance: str | None = Query(default=None),
    kind: str | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[WatchEventOut]:
    stmt = select(WatchEvent).where(WatchEvent.workspace_id == ctx.workspace.id)
    if importance:
        stmt = stmt.where(WatchEvent.importance == importance)
    if kind:
        stmt = stmt.where(WatchEvent.kind == kind)
    stmt = stmt.order_by(WatchEvent.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return [WatchEventOut.model_validate(e) for e in res.scalars().all()]


@router.get("/{watch_id}", response_model=WatchDetail)
async def get_watch(
    watch_id: uuid.UUID,
    event_limit: int = Query(default=50, ge=1, le=200),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> WatchDetail:
    watch = await _get_owned_watch(watch_id, ctx, db)
    res = await db.execute(
        select(WatchEvent)
        .where(WatchEvent.watch_id == watch.id)
        .order_by(WatchEvent.created_at.desc())
        .limit(event_limit)
    )
    detail = WatchDetail.model_validate(watch)
    detail.events = [WatchEventOut.model_validate(e) for e in res.scalars().all()]
    return detail


@router.post("/{watch_id}/check", response_model=CheckResult)
async def check_watch(
    watch_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CheckResult:
    watch = await _get_owned_watch(watch_id, ctx, db)
    if not watch.website:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Watch has no website to check"
        )

    # Probe first so we can return a clean error without fabricating events.
    snapshot = await build_snapshot(watch.website)
    if not snapshot.get("ok"):
        watch.last_checked_at = dt.datetime.now(dt.timezone.utc)
        db.add(watch)
        await db.commit()
        return CheckResult(
            watch_id=watch.id,
            ok=False,
            events_created=0,
            error=snapshot.get("error") or "Could not fetch site",
        )

    created = await _check_watch(db, watch)

    res = await db.execute(
        select(WatchEvent)
        .where(WatchEvent.watch_id == watch.id)
        .order_by(WatchEvent.created_at.desc())
        .limit(created or 1)
    )
    recent = [WatchEventOut.model_validate(e) for e in res.scalars().all()]
    return CheckResult(
        watch_id=watch.id,
        ok=True,
        events_created=created,
        events=recent[:created] if created else [],
    )


@router.patch("/{watch_id}", response_model=WatchOut)
async def update_watch(
    watch_id: uuid.UUID,
    payload: WatchUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> WatchOut:
    watch = await _get_owned_watch(watch_id, ctx, db)
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Name cannot be empty")
        watch.name = payload.name.strip()
    if payload.website is not None:
        watch.website = payload.website.strip() or None
    if payload.social_handles is not None:
        watch.social_handles = payload.social_handles
    if payload.active is not None:
        watch.active = payload.active
    db.add(watch)
    await db.commit()
    await db.refresh(watch)
    return WatchOut.model_validate(watch)


@router.delete("/{watch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watch(
    watch_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    watch = await _get_owned_watch(watch_id, ctx, db)
    await db.delete(watch)
    await db.commit()
