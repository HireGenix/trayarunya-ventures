"""Social Inbox service: real DB-backed queries, aggregation and sync.

All computation (counts, sentiment rollups, response-time math) lives here. The
``sync_inbox`` routine pulls from genuinely connected :class:`SocialAccount`
rows via the real Meta Graph API — it never fabricates demo messages.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.social import SocialAccount
from app.models.social_inbox import (
    InboxItem,
    InboxReply,
    ListeningHit,
    ListeningKeyword,
)
from app.services.social_inbox_ingest import (
    ChannelStatus,
    IngestResult,
    channel_statuses,
    ingest_workspace,
    send_reply_to_platform,
)


# --------------------------------------------------------------------------- #
# Inbox items
# --------------------------------------------------------------------------- #
async def list_items(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    platform: str | None = None,
    kind: str | None = None,
    status: str | None = None,
    sentiment: str | None = None,
    limit: int = 200,
) -> list[InboxItem]:
    """List inbox items for a workspace with optional filters, newest first."""
    stmt = select(InboxItem).where(InboxItem.workspace_id == ws_id)
    if platform:
        stmt = stmt.where(InboxItem.platform == platform)
    if kind:
        stmt = stmt.where(InboxItem.kind == kind)
    if status:
        stmt = stmt.where(InboxItem.status == status)
    if sentiment:
        stmt = stmt.where(InboxItem.sentiment == sentiment)
    stmt = stmt.order_by(
        func.coalesce(InboxItem.received_at, InboxItem.created_at).desc()
    ).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_item(
    db: AsyncSession, ws_id: uuid.UUID, item_id: uuid.UUID
) -> InboxItem | None:
    res = await db.execute(
        select(InboxItem).where(
            InboxItem.id == item_id, InboxItem.workspace_id == ws_id
        )
    )
    return res.scalar_one_or_none()


async def list_replies(
    db: AsyncSession, ws_id: uuid.UUID, item_id: uuid.UUID
) -> list[InboxReply]:
    res = await db.execute(
        select(InboxReply)
        .where(
            InboxReply.workspace_id == ws_id,
            InboxReply.inbox_item_id == item_id,
        )
        .order_by(InboxReply.created_at.asc())
    )
    return list(res.scalars().all())


async def add_reply(
    db: AsyncSession,
    ws_id: uuid.UUID,
    item_id: uuid.UUID,
    body: str,
    *,
    status: str = "draft",
    created_by: uuid.UUID | None = None,
    meta: dict | None = None,
) -> InboxReply:
    reply = InboxReply(
        workspace_id=ws_id,
        inbox_item_id=item_id,
        body=body,
        status=status,
        created_by=created_by,
        meta=meta,
    )
    if status == "sent":
        reply.sent_at = datetime.now(timezone.utc)
    db.add(reply)
    await db.flush()
    return reply


async def set_status(
    db: AsyncSession, item: InboxItem, status: str
) -> InboxItem:
    item.status = status
    await db.flush()
    return item


async def assign(
    db: AsyncSession, item: InboxItem, user_id: uuid.UUID | None
) -> InboxItem:
    item.assignee_user_id = user_id
    if item.status == "unread":
        item.status = "open"
    await db.flush()
    return item


# --------------------------------------------------------------------------- #
# Listening keywords + hits
# --------------------------------------------------------------------------- #
async def list_keywords(
    db: AsyncSession, ws_id: uuid.UUID
) -> list[ListeningKeyword]:
    res = await db.execute(
        select(ListeningKeyword)
        .where(ListeningKeyword.workspace_id == ws_id)
        .order_by(ListeningKeyword.created_at.desc())
    )
    return list(res.scalars().all())


async def create_keyword(
    db: AsyncSession,
    ws_id: uuid.UUID,
    term: str,
    *,
    platform: str | None = None,
    is_active: bool = True,
) -> ListeningKeyword:
    kw = ListeningKeyword(
        workspace_id=ws_id,
        term=term,
        platform=platform,
        is_active=is_active,
    )
    db.add(kw)
    await db.flush()
    return kw


async def list_hits(
    db: AsyncSession, ws_id: uuid.UUID, *, limit: int = 200
) -> list[ListeningHit]:
    res = await db.execute(
        select(ListeningHit)
        .where(ListeningHit.workspace_id == ws_id)
        .order_by(
            func.coalesce(ListeningHit.found_at, ListeningHit.created_at).desc()
        )
        .limit(limit)
    )
    return list(res.scalars().all())


# --------------------------------------------------------------------------- #
# Aggregation / overview
# --------------------------------------------------------------------------- #
async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Compute the real KPI rollup for the workspace inbox."""
    total = (
        await db.execute(
            select(func.count())
            .select_from(InboxItem)
            .where(InboxItem.workspace_id == ws_id)
        )
    ).scalar_one()

    # Counts by status.
    by_status_rows = (
        await db.execute(
            select(InboxItem.status, func.count())
            .where(InboxItem.workspace_id == ws_id)
            .group_by(InboxItem.status)
        )
    ).all()
    by_status = {s: c for s, c in by_status_rows}

    # Counts by sentiment (analyzed only).
    by_sent_rows = (
        await db.execute(
            select(InboxItem.sentiment, func.count())
            .where(InboxItem.workspace_id == ws_id)
            .group_by(InboxItem.sentiment)
        )
    ).all()
    by_sentiment = {(s or "unanalyzed"): c for s, c in by_sent_rows}

    # Counts by platform.
    by_plat_rows = (
        await db.execute(
            select(InboxItem.platform, func.count())
            .where(InboxItem.workspace_id == ws_id)
            .group_by(InboxItem.platform)
        )
    ).all()
    by_platform = {p: c for p, c in by_plat_rows}

    analyzed = sum(c for s, c in by_sent_rows if s)
    positive = by_sentiment.get("positive", 0)
    negative = by_sentiment.get("negative", 0)
    positive_pct = round((positive / analyzed) * 100, 1) if analyzed else 0.0

    # Mentions found today (listening hits).
    start_of_day = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    mentions_today = (
        await db.execute(
            select(func.count())
            .select_from(ListeningHit)
            .where(
                ListeningHit.workspace_id == ws_id,
                func.coalesce(ListeningHit.found_at, ListeningHit.created_at)
                >= start_of_day,
            )
        )
    ).scalar_one()

    avg_response = await _avg_response_minutes(db, ws_id)

    return {
        "total": total,
        "unread": by_status.get("unread", 0),
        "open": by_status.get("open", 0),
        "replied": by_status.get("replied", 0),
        "archived": by_status.get("archived", 0),
        "analyzed": analyzed,
        "positive": positive,
        "negative": negative,
        "neutral": by_sentiment.get("neutral", 0),
        "positive_pct": positive_pct,
        "by_sentiment": by_sentiment,
        "by_platform": by_platform,
        "mentions_today": mentions_today,
        "avg_response_minutes": avg_response,
    }


async def _avg_response_minutes(
    db: AsyncSession, ws_id: uuid.UUID
) -> float | None:
    """Average minutes between an item arriving and its first sent reply."""
    rows = (
        await db.execute(
            select(
                func.coalesce(InboxItem.received_at, InboxItem.created_at),
                func.min(InboxReply.sent_at),
            )
            .join(InboxReply, InboxReply.inbox_item_id == InboxItem.id)
            .where(
                InboxItem.workspace_id == ws_id,
                InboxReply.status == "sent",
                InboxReply.sent_at.isnot(None),
            )
            .group_by(InboxItem.id, InboxItem.received_at, InboxItem.created_at)
        )
    ).all()
    deltas: list[float] = []
    for received, first_sent in rows:
        if received is None or first_sent is None:
            continue
        try:
            mins = (first_sent - received).total_seconds() / 60.0
        except TypeError:
            continue
        if mins >= 0:
            deltas.append(mins)
    if not deltas:
        return None
    return round(sum(deltas) / len(deltas), 1)


# --------------------------------------------------------------------------- #
# Sync — pull from genuinely connected accounts only
# --------------------------------------------------------------------------- #
async def connected_accounts(
    db: AsyncSession, ws_id: uuid.UUID
) -> list[SocialAccount]:
    res = await db.execute(
        select(SocialAccount).where(
            SocialAccount.workspace_id == ws_id,
            SocialAccount.is_active.is_(True),
        )
    )
    return list(res.scalars().all())


def _has_real_connector(account: SocialAccount) -> bool:
    """A connector is 'real' only when we actually hold an access token.

    Without a token there is no live API to read interactions from, so we must
    not fabricate messages — we degrade gracefully instead.
    """
    return bool(getattr(account, "access_token", None))


async def sync_inbox(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Sync inbound interactions from connected accounts via real Graph API.

    For each connected :class:`SocialAccount` with a valid access token, calls
    the Meta Graph API to pull comments, mentions, and DMs. When credentials are
    absent the account is reported as ``not_connected`` — never fabricated data.
    """
    accounts = await connected_accounts(db, ws_id)
    results = await ingest_workspace(db, ws_id)
    fetched = sum(r.fetched for r in results)

    platforms: list[dict] = []
    for r in results:
        platforms.append({
            "platform": r.platform,
            "status": r.status,
            "fetched": r.fetched,
        })
    # Include accounts not covered by results (e.g. unsupported platforms)
    result_platforms = {r.platform for r in results}
    for acc in accounts:
        platform = getattr(acc.platform, "value", str(acc.platform))
        if platform not in result_platforms:
            platforms.append({"platform": platform, "status": "not_connected"})

    existing = (
        await db.execute(
            select(func.count())
            .select_from(InboxItem)
            .where(InboxItem.workspace_id == ws_id)
        )
    ).scalar_one()

    return {
        "fetched": fetched,
        "connected_accounts": len(accounts),
        "platforms": platforms,
        "existing_items": existing,
    }


async def get_channel_statuses(
    db: AsyncSession, ws_id: uuid.UUID
) -> list[dict]:
    """Return per-channel connected/not status for the workspace."""
    statuses = await channel_statuses(db, ws_id)
    return [
        {
            "platform": s.platform,
            "connected": s.connected,
            "account_id": s.account_id,
            "display_name": s.display_name,
            "reason": s.reason,
        }
        for s in statuses
    ]


async def reply_via_platform(
    db: AsyncSession, ws_id: uuid.UUID, item: InboxItem, body: str
) -> dict:
    """Send a reply via the real platform API. Returns delivery status dict."""
    delivery = await send_reply_to_platform(db, ws_id, item, body)
    return {
        "sent": delivery.sent,
        "platform_reply_id": delivery.platform_reply_id,
        "status": delivery.status,
        "error": delivery.error,
    }
