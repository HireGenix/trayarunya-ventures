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
from app.models.watchtower import WatchTarget, WatchSnapshot, WatchDiff
from app.services.watchtower import (
    _check_watch, build_snapshot, diff_snapshots,
    # new enterprise functions:
    list_targets, create_target, get_target_snapshots, get_target_diffs,
    get_diff_detail, get_timeline, check_target,
)

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
# Enterprise schemas (targets / snapshots / diffs / timeline)
# --------------------------------------------------------------------------- #
class TargetCreate(BaseModel):
    url: str
    label: str | None = None


class TargetUpdate(BaseModel):
    active: bool | None = None
    label: str | None = None


class TargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    watch_id: uuid.UUID
    url: str
    label: str | None
    active: bool
    status: str
    last_checked_at: dt.datetime | None
    last_content_hash: str | None
    check_interval_seconds: int
    created_at: dt.datetime


class SnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    target_id: uuid.UUID
    content_hash: str
    title: str | None
    meta_description: str | None
    h1s: list | None
    headline: str | None
    pricing_signals: list | dict | None
    raw_text_length: int | None
    fetched_at: dt.datetime


class DiffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    target_id: uuid.UUID
    old_snapshot_id: uuid.UUID | None
    new_snapshot_id: uuid.UUID | None
    classification: str
    summary: str | None
    detail: dict | None
    importance: str
    detected_at: dt.datetime


class DiffDetailOut(BaseModel):
    id: str
    workspace_id: str
    target_id: str
    classification: str
    summary: str | None
    detail: dict | None
    importance: str
    detected_at: str | None
    old_snapshot: dict | None
    new_snapshot: dict | None


class TimelinePoint(BaseModel):
    date: str
    changes: int
    high: int
    medium: int
    low: int


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


async def _get_owned_target(
    target_id: uuid.UUID, ctx: WorkspaceContext, db: AsyncSession
) -> WatchTarget:
    target = await db.get(WatchTarget, target_id)
    if target is None or target.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Target not found")
    return target


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


@router.delete("/{watch_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_watch(
    watch_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    watch = await _get_owned_watch(watch_id, ctx, db)
    await db.delete(watch)
    await db.commit()


# --------------------------------------------------------------------------- #
# Enterprise endpoints (targets / snapshots / diffs / timeline)
# --------------------------------------------------------------------------- #
@router.get("/{watch_id}/targets", response_model=list[TargetOut])
async def list_watch_targets(
    watch_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[TargetOut]:
    await _get_owned_watch(watch_id, ctx, db)
    targets = await list_targets(db, ctx.workspace.id, watch_id=watch_id)
    return [TargetOut.model_validate(t) for t in targets]


@router.post(
    "/{watch_id}/targets",
    response_model=TargetOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_watch_target(
    watch_id: uuid.UUID,
    payload: TargetCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> TargetOut:
    await _get_owned_watch(watch_id, ctx, db)
    if not payload.url.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "URL is required")
    target = await create_target(
        db,
        workspace_id=ctx.workspace.id,
        watch_id=watch_id,
        url=payload.url.strip(),
        label=(payload.label or "").strip() or None,
    )
    return TargetOut.model_validate(target)


@router.post("/targets/{target_id}/check", response_model=dict)
async def check_watch_target(
    target_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    target = await _get_owned_target(target_id, ctx, db)
    diff = await check_target(db, target)
    return {
        "target_id": str(target.id),
        "ok": True,
        "changed": diff is not None,
        "diff_id": str(diff.id) if diff is not None else None,
    }


@router.get("/targets/{target_id}/snapshots", response_model=list[SnapshotOut])
async def list_target_snapshots(
    target_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=200),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[SnapshotOut]:
    await _get_owned_target(target_id, ctx, db)
    snapshots = await get_target_snapshots(db, target_id, limit=limit)
    return [SnapshotOut.model_validate(s) for s in snapshots]


@router.get("/targets/{target_id}/diffs", response_model=list[DiffOut])
async def list_target_diffs(
    target_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=200),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[DiffOut]:
    await _get_owned_target(target_id, ctx, db)
    diffs = await get_target_diffs(db, target_id, limit=limit)
    return [DiffOut.model_validate(d) for d in diffs]


@router.get("/diffs/{diff_id}", response_model=DiffDetailOut)
async def get_watch_diff(
    diff_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> DiffDetailOut:
    detail = await get_diff_detail(db, diff_id)
    if detail is None or detail.get("workspace_id") != str(ctx.workspace.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Diff not found")
    return DiffDetailOut(**detail)


@router.get("/{watch_id}/timeline", response_model=list[TimelinePoint])
async def get_watch_timeline(
    watch_id: uuid.UUID,
    days: int = Query(default=90, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[TimelinePoint]:
    await _get_owned_watch(watch_id, ctx, db)
    points = await get_timeline(
        db, ctx.workspace.id, watch_id=watch_id, days=days
    )
    return [TimelinePoint(**p) for p in points]


@router.patch("/targets/{target_id}", response_model=TargetOut)
async def update_watch_target(
    target_id: uuid.UUID,
    payload: TargetUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> TargetOut:
    target = await _get_owned_target(target_id, ctx, db)
    if payload.active is not None:
        target.active = payload.active
    if payload.label is not None:
        target.label = payload.label.strip() or None
    db.add(target)
    await db.commit()
    await db.refresh(target)
    return TargetOut.model_validate(target)


@router.delete(
    "/targets/{target_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_watch_target(
    target_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    target = await _get_owned_target(target_id, ctx, db)
    await db.delete(target)
    await db.commit()
