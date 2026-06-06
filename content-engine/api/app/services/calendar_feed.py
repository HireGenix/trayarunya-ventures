"""Unified calendar feed service — aggregates real scheduled items from
content_items, social schedules, and email campaigns into a single
normalized stream.  Heavy logic lives here; the router stays thin.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import and_, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import ContentItem, ContentStatus
from app.models.social import Schedule, ScheduleStatus, SocialAccount
from app.models.email import EmailCampaign


# ------------------------------------------------------------------ #
#  Unified feed item shape
# ------------------------------------------------------------------ #

def _dt(v: datetime | date | None) -> str | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    return datetime(v.year, v.month, v.day, tzinfo=timezone.utc).isoformat()


def _status_for_content(s: str) -> str:
    """Map ContentStatus values to calendar-friendly labels."""
    mapping = {
        "draft": "draft",
        "in_review": "draft",
        "approved": "scheduled",
        "scheduled": "scheduled",
        "published": "published",
        "archived": "published",
    }
    return mapping.get(s, "draft")


def _status_for_schedule(s: str) -> str:
    mapping = {
        "pending": "scheduled",
        "publishing": "scheduled",
        "published": "published",
        "failed": "failed",
        "canceled": "draft",
        "skipped_not_connected": "failed",
    }
    return mapping.get(s, "scheduled")


def _status_for_campaign(s: str) -> str:
    mapping = {
        "draft": "draft",
        "scheduled": "scheduled",
        "sending": "scheduled",
        "sent": "published",
        "failed": "failed",
    }
    return mapping.get(s, "draft")


# ------------------------------------------------------------------ #
#  Main feed query
# ------------------------------------------------------------------ #

async def get_unified_feed(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    start: date,
    end: date,
    *,
    channels: list[str] | None = None,
    source_types: list[str] | None = None,
    statuses: list[str] | None = None,
) -> list[dict]:
    """Return all real scheduled/dated items for *workspace_id* in [start, end].

    Each returned dict: ``{id, source_type, source_id, title, channel,
    scheduled_at, status, meta}``.
    """
    start_dt = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    end_dt = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc)
    items: list[dict] = []

    want_content = source_types is None or "content" in source_types
    want_social = source_types is None or "social" in source_types
    want_email = source_types is None or "email" in source_types

    # --- 1) ContentItems with scheduled_at ---
    if want_content:
        q = select(ContentItem).where(
            ContentItem.workspace_id == workspace_id,
            ContentItem.scheduled_at.isnot(None),
            ContentItem.scheduled_at >= start_dt,
            ContentItem.scheduled_at <= end_dt,
        )
        if channels:
            q = q.where(ContentItem.platform.in_(channels))
        rows = (await db.execute(q)).scalars().all()
        for r in rows:
            st = _status_for_content(r.status.value if hasattr(r.status, 'value') else str(r.status))
            if statuses and st not in statuses:
                continue
            items.append({
                "id": f"content:{r.id}",
                "source_type": "content",
                "source_id": str(r.id),
                "title": r.title or "(Untitled)",
                "channel": r.platform or r.content_type.value if hasattr(r.content_type, 'value') else str(r.content_type),
                "scheduled_at": _dt(r.scheduled_at),
                "status": st,
                "meta": {
                    "content_type": r.content_type.value if hasattr(r.content_type, 'value') else str(r.content_type),
                    "body_preview": (r.body or "")[:120],
                },
            })

    # --- 2) Social schedules ---
    if want_social:
        q = (
            select(Schedule, SocialAccount.platform, SocialAccount.display_name, ContentItem.title)
            .outerjoin(SocialAccount, Schedule.social_account_id == SocialAccount.id)
            .outerjoin(ContentItem, Schedule.content_item_id == ContentItem.id)
            .where(
                Schedule.workspace_id == workspace_id,
                Schedule.scheduled_at >= start_dt,
                Schedule.scheduled_at <= end_dt,
            )
        )
        if channels:
            q = q.where(SocialAccount.platform.in_(channels))
        rows = (await db.execute(q)).all()
        for sched, platform, acct_name, ci_title in rows:
            st = _status_for_schedule(sched.status.value if hasattr(sched.status, 'value') else str(sched.status))
            if statuses and st not in statuses:
                continue
            plat_str = platform.value if hasattr(platform, 'value') else str(platform) if platform else "social"
            items.append({
                "id": f"social:{sched.id}",
                "source_type": "social",
                "source_id": str(sched.id),
                "title": ci_title or f"Post on {plat_str}",
                "channel": plat_str,
                "scheduled_at": _dt(sched.scheduled_at),
                "status": st,
                "meta": {
                    "content_item_id": str(sched.content_item_id),
                    "account_name": acct_name,
                    "external_post_id": sched.external_post_id,
                    "permalink": sched.permalink,
                    "error": sched.error,
                },
            })

    # --- 3) Email campaigns ---
    if want_email:
        q = select(EmailCampaign).where(
            EmailCampaign.workspace_id == workspace_id,
            or_(
                and_(
                    EmailCampaign.scheduled_at.isnot(None),
                    EmailCampaign.scheduled_at >= start_dt,
                    EmailCampaign.scheduled_at <= end_dt,
                ),
                and_(
                    EmailCampaign.sent_at.isnot(None),
                    EmailCampaign.sent_at >= start_dt,
                    EmailCampaign.sent_at <= end_dt,
                ),
            ),
        )
        if channels and "email" not in channels:
            pass  # email is always "email" channel
        rows = (await db.execute(q)).scalars().all()
        for c in rows:
            st = _status_for_campaign(c.status or "draft")
            if statuses and st not in statuses:
                continue
            sched_at = c.sent_at or c.scheduled_at
            items.append({
                "id": f"email:{c.id}",
                "source_type": "email",
                "source_id": str(c.id),
                "title": c.name or c.subject or "(Untitled campaign)",
                "channel": "email",
                "scheduled_at": _dt(sched_at),
                "status": st,
                "meta": {
                    "subject": c.subject,
                    "preheader": c.preheader,
                },
            })

    items.sort(key=lambda x: x["scheduled_at"] or "")
    return items


# ------------------------------------------------------------------ #
#  Reschedule
# ------------------------------------------------------------------ #

async def reschedule_item(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    source_type: str,
    source_id: uuid.UUID,
    new_scheduled_at: datetime,
) -> dict:
    """Move a real item to a new date/time.  Returns the updated feed item dict.

    Rejects already-published or already-sent items.
    """
    if source_type == "content":
        row = await db.get(ContentItem, source_id)
        if row is None or row.workspace_id != workspace_id:
            raise ValueError("Content item not found")
        if row.status in (ContentStatus.published, ContentStatus.archived):
            raise ValueError("Cannot reschedule a published content item")
        row.scheduled_at = new_scheduled_at
        await db.flush()
        return {
            "id": f"content:{row.id}",
            "source_type": "content",
            "source_id": str(row.id),
            "title": row.title or "(Untitled)",
            "channel": row.platform or (row.content_type.value if hasattr(row.content_type, 'value') else str(row.content_type)),
            "scheduled_at": _dt(new_scheduled_at),
            "status": _status_for_content(row.status.value if hasattr(row.status, 'value') else str(row.status)),
            "meta": {},
        }

    if source_type == "social":
        row = await db.get(Schedule, source_id)
        if row is None or row.workspace_id != workspace_id:
            raise ValueError("Schedule not found")
        if row.status in (ScheduleStatus.published, ScheduleStatus.publishing):
            raise ValueError("Cannot reschedule a published or in-progress post")
        row.scheduled_at = new_scheduled_at
        await db.flush()
        return {
            "id": f"social:{row.id}",
            "source_type": "social",
            "source_id": str(row.id),
            "title": f"Social post",
            "channel": "social",
            "scheduled_at": _dt(new_scheduled_at),
            "status": _status_for_schedule(row.status.value if hasattr(row.status, 'value') else str(row.status)),
            "meta": {},
        }

    if source_type == "email":
        row = await db.get(EmailCampaign, source_id)
        if row is None or row.workspace_id != workspace_id:
            raise ValueError("Campaign not found")
        if row.status in ("sent", "sending"):
            raise ValueError("Cannot reschedule a sent or sending campaign")
        row.scheduled_at = new_scheduled_at
        await db.flush()
        return {
            "id": f"email:{row.id}",
            "source_type": "email",
            "source_id": str(row.id),
            "title": row.name or row.subject or "(Untitled)",
            "channel": "email",
            "scheduled_at": _dt(new_scheduled_at),
            "status": _status_for_campaign(row.status or "draft"),
            "meta": {},
        }

    raise ValueError(f"Unknown source_type: {source_type}")


# ------------------------------------------------------------------ #
#  Quick-add (creates a real ContentItem)
# ------------------------------------------------------------------ #

async def quick_add_item(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str,
    scheduled_at: datetime,
    platform: str | None = None,
    content_type: str = "social_post",
) -> dict:
    """Create a real ContentItem draft and return a unified feed dict."""
    from app.models.content import ContentType

    ct = ContentType.social_post
    for member in ContentType:
        if member.value == content_type:
            ct = member
            break

    item = ContentItem(
        workspace_id=workspace_id,
        created_by=user_id,
        content_type=ct,
        status=ContentStatus.draft,
        platform=platform,
        title=title,
        body="",
        scheduled_at=scheduled_at,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return {
        "id": f"content:{item.id}",
        "source_type": "content",
        "source_id": str(item.id),
        "title": item.title or "(Untitled)",
        "channel": platform or ct.value,
        "scheduled_at": _dt(scheduled_at),
        "status": "draft",
        "meta": {"content_type": ct.value},
    }


# ------------------------------------------------------------------ #
#  Gap detection
# ------------------------------------------------------------------ #

def detect_gaps(
    items: list[dict],
    start: date,
    end: date,
) -> list[str]:
    """Return ISO date strings within [start, end] that have zero items."""
    occupied = set()
    for it in items:
        sa = it.get("scheduled_at")
        if sa:
            occupied.add(sa[:10])

    gaps: list[str] = []
    current = start
    from datetime import timedelta
    while current <= end:
        ds = current.isoformat()
        if ds not in occupied:
            gaps.append(ds)
        current += timedelta(days=1)
    return gaps
