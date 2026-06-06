"""Client-facing report routes.

POST  /reports          — create a frozen metric snapshot for a client
GET   /reports          — list workspace reports
DELETE /reports/{token} — delete a report
GET   /reports/public/{token} — PUBLIC (no auth), view report + increment views
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal, get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    ContentItem,
    ContentStatus,
    Metric,
    Report,
    Schedule,
    ScheduleStatus,
    SocialAccount,
)
from app.services.report_pdf import render_report_pdf


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ReportCreate(BaseModel):
    title: str
    client_name: str | None = None
    days: int = 30  # lookback window


class ReportOut(BaseModel):
    id: str
    token: str
    title: str
    client_name: str | None
    date_from: str | None
    date_to: str | None
    views: int
    created_at: str

    class Config:
        from_attributes = True


class PublicReport(BaseModel):
    title: str
    client_name: str | None
    date_from: str | None
    date_to: str | None
    workspace_name: str
    views: int
    created_at: str
    data: dict[str, Any]


class ShareSettings(BaseModel):
    expires_in_days: int | None = None  # None = no change; 0 = clear expiry
    passcode: str | None = None         # "" clears, None = no change
    revoked: bool | None = None


class ShareSettingsOut(BaseModel):
    id: str
    token: str
    expires_at: str | None
    revoked: bool
    passcode_set: bool


# ---------------------------------------------------------------------------
# Share-link enforcement helpers (backward compatible — columns optional)
# ---------------------------------------------------------------------------


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_revoked(report: Report) -> bool:
    return bool(getattr(report, "revoked", False))


def _is_expired(report: Report) -> bool:
    exp = getattr(report, "expires_at", None)
    if exp is None:
        return False
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return _now() > exp


def _passcode(report: Report) -> str | None:
    code = getattr(report, "passcode", None)
    return code or None


def _pdf_filename(report: Report) -> str:
    base = (getattr(report, "title", None) or "report").strip().lower()
    safe = "".join(c if c.isalnum() else "-" for c in base).strip("-") or "report"
    return f"{safe[:60]}.pdf"


def _enforce_share_access(report: Report, code: str | None) -> None:
    """Raise the appropriate HTTPException if the share link is not accessible."""
    if _is_revoked(report):
        raise HTTPException(status_code=410, detail="This report link has been revoked")
    if _is_expired(report):
        raise HTTPException(status_code=410, detail="This report link has expired")
    required = _passcode(report)
    if required and code != required:
        raise HTTPException(status_code=401, detail="A valid passcode is required")


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/reports", tags=["reports"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _build_snapshot(db: AsyncSession, workspace_id: uuid.UUID, days: int) -> dict:
    """Build a JSON-serialisable metric snapshot for the given workspace."""
    since = date.today() - timedelta(days=days)

    # ---- summary metrics -------------------------------------------------
    metrics = (
        await db.execute(
            select(Metric).where(
                Metric.workspace_id == workspace_id,
                Metric.metric_date >= since,
            )
        )
    ).scalars().all()

    totals: dict[str, float] = {
        "impressions": 0, "clicks": 0, "engagements": 0,
        "conversions": 0, "spend": 0,
    }
    by_source: dict[str, dict[str, float]] = {}
    series_map: dict[str, dict[str, float]] = {}

    for m in metrics:
        for k in totals:
            v = float(getattr(m, k))
            totals[k] += v
            src = by_source.setdefault(m.source, {k: 0.0 for k in totals})
            src[k] = src.get(k, 0.0) + v
            day = series_map.setdefault(m.metric_date.isoformat(), {k: 0.0 for k in totals})
            day[k] = day.get(k, 0.0) + v

    series = [{"date": d, **vals} for d, vals in sorted(series_map.items())]

    # ---- content counts --------------------------------------------------
    content_count = (
        await db.execute(
            select(ContentItem).where(ContentItem.workspace_id == workspace_id)
        )
    ).scalars()
    content_count_n = len(list(content_count))

    published_count = (
        await db.execute(
            select(ContentItem).where(
                ContentItem.workspace_id == workspace_id,
                ContentItem.status == ContentStatus.published,
            )
        )
    ).scalars()
    published_count_n = len(list(published_count))

    # ---- per-post stats --------------------------------------------------
    schedules = (
        await db.execute(
            select(Schedule).where(
                Schedule.workspace_id == workspace_id,
                Schedule.status == ScheduleStatus.published,
            )
        )
    ).scalars().all()

    # latest metric per schedule
    metric_rows = (
        await db.execute(
            select(Metric).where(
                Metric.workspace_id == workspace_id,
                Metric.ref_id.is_not(None),
            )
        )
    ).scalars().all()
    latest_by_ref: dict = {}
    for mr in metric_rows:
        prev = latest_by_ref.get(mr.ref_id)
        if prev is None or mr.metric_date >= prev.metric_date:
            latest_by_ref[mr.ref_id] = mr

    posts = []
    for sched in schedules:
        item = await db.get(ContentItem, sched.content_item_id)
        account = await db.get(SocialAccount, sched.social_account_id)
        platform = "unknown"
        if account is not None:
            platform = (
                account.platform.value
                if hasattr(account.platform, "value")
                else str(account.platform)
            )
        mr = latest_by_ref.get(sched.id)
        extra = (mr.extra or {}) if mr else {}
        published_at = sched.updated_at or sched.scheduled_at
        posts.append(
            {
                "schedule_id": str(sched.id),
                "title": item.title if item else None,
                "platform": platform,
                "published_at": published_at.isoformat() if published_at else None,
                "impressions": int(mr.impressions) if mr else 0,
                "clicks": int(mr.clicks) if mr else 0,
                "engagements": int(mr.engagements) if mr else 0,
                "likes": int(extra.get("likes", 0) or 0),
                "comments": int(extra.get("comments", 0) or 0),
                "shares": int(extra.get("shares", 0) or 0),
                "simulated": bool(extra.get("simulated", False)),
            }
        )

    ctr = (totals["clicks"] / totals["impressions"] * 100) if totals["impressions"] else 0.0

    return {
        "totals": totals,
        "ctr": round(ctr, 2),
        "by_source": by_source,
        "series": series,
        "content_count": content_count_n,
        "published_count": published_count_n,
        "posts": posts,
    }


# ---------------------------------------------------------------------------
# Authenticated routes
# ---------------------------------------------------------------------------


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def create_report(
    data: ReportCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ReportOut:
    """Freeze the current analytics snapshot into a shareable client report."""
    snapshot = await _build_snapshot(db, ctx.workspace.id, data.days)
    today = date.today()
    report = Report(
        workspace_id=ctx.workspace.id,
        token=str(uuid.uuid4()),
        title=data.title,
        client_name=data.client_name,
        date_from=(today - timedelta(days=data.days)).isoformat(),
        date_to=today.isoformat(),
        data=snapshot,
        views=0,
    )
    db.add(report)
    await db.flush()
    await db.commit()
    await db.refresh(report)
    return ReportOut(
        id=str(report.id),
        token=report.token,
        title=report.title,
        client_name=report.client_name,
        date_from=str(report.date_from) if report.date_from else None,
        date_to=str(report.date_to) if report.date_to else None,
        views=report.views,
        created_at=report.created_at.isoformat(),
    )


@router.get("", response_model=list[ReportOut])
async def list_reports(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ReportOut]:
    rows = (
        await db.execute(
            select(Report)
            .where(Report.workspace_id == ctx.workspace.id)
            .order_by(Report.created_at.desc())
        )
    ).scalars().all()
    return [
        ReportOut(
            id=str(r.id),
            token=r.token,
            title=r.title,
            client_name=r.client_name,
            date_from=str(r.date_from) if r.date_from else None,
            date_to=str(r.date_to) if r.date_to else None,
            views=r.views,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.delete("/{token}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_report(
    token: str,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    report = (
        await db.execute(
            select(Report).where(
                Report.token == token,
                Report.workspace_id == ctx.workspace.id,
            )
        )
    ).scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()


async def _workspace_name(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    from app.models.tenant import Workspace  # local import avoids circular

    ws = await db.get(Workspace, workspace_id)
    return ws.name if ws else "Trayarunya Ventures"


@router.get("/{report_id}/pdf")
async def download_report_pdf(
    report_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Authenticated, workspace-scoped PDF export of a report."""
    report = (
        await db.execute(
            select(Report).where(
                Report.id == report_id,
                Report.workspace_id == ctx.workspace.id,
            )
        )
    ).scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    ws_name = await _workspace_name(db, report.workspace_id)
    pdf_bytes = await render_report_pdf(report, ws_name)
    filename = _pdf_filename(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{report_id}/share-settings", response_model=ShareSettingsOut)
async def update_share_settings(
    report_id: uuid.UUID,
    settings: ShareSettings,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ShareSettingsOut:
    """Configure expiry, passcode and revocation for a report's public link."""
    report = (
        await db.execute(
            select(Report).where(
                Report.id == report_id,
                Report.workspace_id == ctx.workspace.id,
            )
        )
    ).scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    if settings.expires_in_days is not None:
        if settings.expires_in_days <= 0:
            setattr(report, "expires_at", None)
        else:
            setattr(report, "expires_at", _now() + timedelta(days=settings.expires_in_days))
    if settings.passcode is not None:
        setattr(report, "passcode", settings.passcode or None)
    if settings.revoked is not None:
        setattr(report, "revoked", bool(settings.revoked))

    await db.commit()
    await db.refresh(report)

    exp = getattr(report, "expires_at", None)
    return ShareSettingsOut(
        id=str(report.id),
        token=report.token,
        expires_at=exp.isoformat() if exp else None,
        revoked=bool(getattr(report, "revoked", False)),
        passcode_set=bool(getattr(report, "passcode", None)),
    )


# ---------------------------------------------------------------------------
# PUBLIC route — no auth, clients open this link
# ---------------------------------------------------------------------------


@router.get("/public/{token}", response_model=PublicReport)
async def get_public_report(
    token: str,
    code: str | None = Query(default=None),
    x_report_passcode: str | None = Header(default=None),
) -> PublicReport:
    """Return the frozen report snapshot for a given share token.

    This endpoint is intentionally unauthenticated so clients can open the
    link without logging in.  The token is a random UUID so it cannot be
    guessed.  Access is additionally gated by optional expiry, revocation and
    passcode settings (all backward compatible — links without them keep
    working).
    """
    async with AsyncSessionLocal() as db:
        report = (
            await db.execute(select(Report).where(Report.token == token))
        ).scalar_one_or_none()
        if report is None:
            raise HTTPException(status_code=404, detail="Report not found or link expired")

        _enforce_share_access(report, code or x_report_passcode)

        # Resolve workspace name
        from app.models.tenant import Workspace  # local import avoids circular

        ws = await db.get(Workspace, report.workspace_id)
        ws_name = ws.name if ws else "Trayarunya Ventures"

        # Increment view counter
        report.views = (report.views or 0) + 1
        await db.commit()
        await db.refresh(report)

        return PublicReport(
            title=report.title,
            client_name=report.client_name,
            date_from=str(report.date_from) if report.date_from else None,
            date_to=str(report.date_to) if report.date_to else None,
            workspace_name=ws_name,
            views=report.views,
            created_at=report.created_at.isoformat(),
            data=report.data or {},
        )


@router.get("/public/{token}/pdf")
async def get_public_report_pdf(
    token: str,
    code: str | None = Query(default=None),
    x_report_passcode: str | None = Header(default=None),
) -> Response:
    """Public PDF export for a valid, non-revoked, non-expired share token."""
    async with AsyncSessionLocal() as db:
        report = (
            await db.execute(select(Report).where(Report.token == token))
        ).scalar_one_or_none()
        if report is None:
            raise HTTPException(status_code=404, detail="Report not found or link expired")

        _enforce_share_access(report, code or x_report_passcode)

        from app.models.tenant import Workspace  # local import avoids circular

        ws = await db.get(Workspace, report.workspace_id)
        ws_name = ws.name if ws else "Trayarunya Ventures"

        pdf_bytes = await render_report_pdf(report, ws_name)
        filename = _pdf_filename(report)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
