"""Real Meta Graph API ingestion + reply for the Social Inbox.

Pulls IG/FB comments, mentions, and conversations (DMs) when a workspace has
a connected :class:`SocialAccount` with a valid access token. When credentials
are absent the caller receives an honest ``not_connected`` status — never
fabricated messages.

Replies are sent via the same Graph API and the platform reply id is stored.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import AsyncSessionLocal
from app.models.social import SocialAccount, SocialPlatform
from app.models.social_inbox import InboxItem
from app.services.token_vault import get_account_token

log = logging.getLogger("social_inbox_ingest")

GRAPH_BASE = "https://graph.facebook.com/v21.0"
POLL_INTERVAL_SECONDS = 120
POLL_INITIAL_DELAY_SECONDS = 25


# ── Connection status ─────────────────────────────────────────────────────── #


@dataclass
class ChannelStatus:
    platform: str
    connected: bool
    account_id: str | None = None
    display_name: str | None = None
    reason: str | None = None


async def channel_statuses(
    db: AsyncSession, ws_id: uuid.UUID
) -> list[ChannelStatus]:
    """Return real connection status for every social account in the workspace."""
    res = await db.execute(
        select(SocialAccount).where(
            SocialAccount.workspace_id == ws_id,
            SocialAccount.is_active.is_(True),
        )
    )
    accounts = list(res.scalars().all())
    statuses: list[ChannelStatus] = []
    for acc in accounts:
        platform = acc.platform.value if hasattr(acc.platform, "value") else str(acc.platform)
        token = get_account_token(acc)
        if token:
            statuses.append(
                ChannelStatus(
                    platform=platform,
                    connected=True,
                    account_id=acc.external_id,
                    display_name=acc.display_name,
                )
            )
        else:
            statuses.append(
                ChannelStatus(
                    platform=platform,
                    connected=False,
                    display_name=acc.display_name,
                    reason="awaiting_credentials",
                )
            )
    return statuses


# ── Graph API helpers ──────────────────────────────────────────────────────── #

_RETRY_STATUS = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3


async def _graph_get(
    client: httpx.AsyncClient, path: str, token: str, params: dict | None = None
) -> dict | None:
    """GET from the Meta Graph API with retries. Returns None on failure."""
    url = f"{GRAPH_BASE}/{path.lstrip('/')}"
    p = dict(params or {})
    p["access_token"] = token
    for attempt in range(_MAX_RETRIES):
        try:
            res = await client.get(url, params=p, timeout=30)
        except (httpx.TransportError, httpx.TimeoutException):
            if attempt == _MAX_RETRIES - 1:
                return None
            await asyncio.sleep(1.5 * (2 ** attempt))
            continue
        if res.status_code in _RETRY_STATUS and attempt < _MAX_RETRIES - 1:
            await asyncio.sleep(1.5 * (2 ** attempt))
            continue
        if res.status_code >= 300:
            log.warning("Graph GET %s → %s: %s", url, res.status_code, res.text[:300])
            return None
        return res.json()
    return None


async def _graph_post(
    client: httpx.AsyncClient, path: str, token: str, payload: dict
) -> dict | None:
    """POST to the Meta Graph API with retries. Returns None on failure."""
    url = f"{GRAPH_BASE}/{path.lstrip('/')}"
    payload["access_token"] = token
    for attempt in range(_MAX_RETRIES):
        try:
            res = await client.post(url, json=payload, timeout=30)
        except (httpx.TransportError, httpx.TimeoutException):
            if attempt == _MAX_RETRIES - 1:
                return None
            await asyncio.sleep(1.5 * (2 ** attempt))
            continue
        if res.status_code in _RETRY_STATUS and attempt < _MAX_RETRIES - 1:
            await asyncio.sleep(1.5 * (2 ** attempt))
            continue
        if res.status_code >= 300:
            log.warning("Graph POST %s → %s: %s", url, res.status_code, res.text[:300])
            return None
        return res.json()
    return None


# ── Ingestion: pull real comments/mentions/conversations ───────────────── #


@dataclass
class IngestResult:
    platform: str
    fetched: int = 0
    status: str = "ok"
    errors: list[str] = field(default_factory=list)


async def _already_ingested(
    db: AsyncSession, ws_id: uuid.UUID, external_id: str
) -> bool:
    """Check if an item with this external_id already exists."""
    res = await db.execute(
        select(InboxItem.id).where(
            InboxItem.workspace_id == ws_id,
            InboxItem.external_id == external_id,
        ).limit(1)
    )
    return res.scalar_one_or_none() is not None


async def _ingest_fb_page_comments(
    db: AsyncSession,
    ws_id: uuid.UUID,
    account: SocialAccount,
    token: str,
    client: httpx.AsyncClient,
) -> IngestResult:
    """Pull comments on the Facebook Page's recent posts."""
    result = IngestResult(platform="facebook")
    page_id = account.external_id or "me"
    # Get recent posts
    posts = await _graph_get(
        client, f"{page_id}/posts", token,
        {"fields": "id", "limit": "25"},
    )
    if not posts or "data" not in posts:
        result.status = "no_posts_or_error"
        return result

    for post in posts["data"]:
        post_id = post.get("id")
        if not post_id:
            continue
        comments = await _graph_get(
            client, f"{post_id}/comments", token,
            {"fields": "id,from,message,created_time,permalink_url", "limit": "50"},
        )
        if not comments or "data" not in comments:
            continue
        for c in comments["data"]:
            ext_id = c.get("id", "")
            if not ext_id or await _already_ingested(db, ws_id, ext_id):
                continue
            author = c.get("from", {})
            received = None
            if c.get("created_time"):
                try:
                    received = datetime.fromisoformat(c["created_time"].replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    received = datetime.now(timezone.utc)
            item = InboxItem(
                workspace_id=ws_id,
                platform="facebook",
                kind="comment",
                author_handle=author.get("id"),
                author_name=author.get("name"),
                text=c.get("message", ""),
                permalink=c.get("permalink_url"),
                external_id=ext_id,
                received_at=received or datetime.now(timezone.utc),
                status="unread",
                meta={"post_id": post_id, "source": "graph_api"},
            )
            db.add(item)
            result.fetched += 1

    return result


async def _ingest_ig_comments(
    db: AsyncSession,
    ws_id: uuid.UUID,
    account: SocialAccount,
    token: str,
    client: httpx.AsyncClient,
) -> IngestResult:
    """Pull comments on the IG Business account's recent media."""
    result = IngestResult(platform="instagram")
    ig_user_id = account.external_id
    if not ig_user_id:
        result.status = "no_external_id"
        return result

    media = await _graph_get(
        client, f"{ig_user_id}/media", token,
        {"fields": "id", "limit": "25"},
    )
    if not media or "data" not in media:
        result.status = "no_media_or_error"
        return result

    for m in media["data"]:
        media_id = m.get("id")
        if not media_id:
            continue
        comments = await _graph_get(
            client, f"{media_id}/comments", token,
            {"fields": "id,from,text,timestamp,username", "limit": "50"},
        )
        if not comments or "data" not in comments:
            continue
        for c in comments["data"]:
            ext_id = c.get("id", "")
            if not ext_id or await _already_ingested(db, ws_id, ext_id):
                continue
            received = None
            if c.get("timestamp"):
                try:
                    received = datetime.fromisoformat(c["timestamp"].replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    received = datetime.now(timezone.utc)
            item = InboxItem(
                workspace_id=ws_id,
                platform="instagram",
                kind="comment",
                author_handle=c.get("username"),
                author_name=c.get("from", {}).get("username") if isinstance(c.get("from"), dict) else c.get("username"),
                text=c.get("text", ""),
                external_id=ext_id,
                received_at=received or datetime.now(timezone.utc),
                status="unread",
                meta={"media_id": media_id, "source": "graph_api"},
            )
            db.add(item)
            result.fetched += 1

    return result


async def _ingest_ig_mentions(
    db: AsyncSession,
    ws_id: uuid.UUID,
    account: SocialAccount,
    token: str,
    client: httpx.AsyncClient,
) -> IngestResult:
    """Pull @mentions of the IG Business account."""
    result = IngestResult(platform="instagram")
    ig_user_id = account.external_id
    if not ig_user_id:
        return result

    tags = await _graph_get(
        client, f"{ig_user_id}/tags", token,
        {"fields": "id,caption,timestamp,username,permalink", "limit": "25"},
    )
    if not tags or "data" not in tags:
        return result

    for t in tags["data"]:
        ext_id = f"ig_mention_{t.get('id', '')}"
        if not ext_id or await _already_ingested(db, ws_id, ext_id):
            continue
        received = None
        if t.get("timestamp"):
            try:
                received = datetime.fromisoformat(t["timestamp"].replace("Z", "+00:00"))
            except (ValueError, TypeError):
                received = datetime.now(timezone.utc)
        item = InboxItem(
            workspace_id=ws_id,
            platform="instagram",
            kind="mention",
            author_handle=t.get("username"),
            author_name=t.get("username"),
            text=t.get("caption", ""),
            permalink=t.get("permalink"),
            external_id=ext_id,
            received_at=received or datetime.now(timezone.utc),
            status="unread",
            meta={"source": "graph_api"},
        )
        db.add(item)
        result.fetched += 1

    return result


async def _ingest_fb_conversations(
    db: AsyncSession,
    ws_id: uuid.UUID,
    account: SocialAccount,
    token: str,
    client: httpx.AsyncClient,
) -> IngestResult:
    """Pull Facebook Page Conversations (DMs)."""
    result = IngestResult(platform="facebook")
    page_id = account.external_id or "me"

    convos = await _graph_get(
        client, f"{page_id}/conversations", token,
        {"fields": "id,participants,updated_time", "limit": "25"},
    )
    if not convos or "data" not in convos:
        return result

    for convo in convos["data"]:
        convo_id = convo.get("id")
        if not convo_id:
            continue
        msgs = await _graph_get(
            client, f"{convo_id}/messages", token,
            {"fields": "id,from,message,created_time", "limit": "25"},
        )
        if not msgs or "data" not in msgs:
            continue
        for m in msgs["data"]:
            ext_id = m.get("id", "")
            if not ext_id or await _already_ingested(db, ws_id, ext_id):
                continue
            sender = m.get("from", {})
            # Skip messages from the page itself
            if sender.get("id") == page_id:
                continue
            received = None
            if m.get("created_time"):
                try:
                    received = datetime.fromisoformat(m["created_time"].replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    received = datetime.now(timezone.utc)
            item = InboxItem(
                workspace_id=ws_id,
                platform="facebook",
                kind="dm",
                author_handle=sender.get("id"),
                author_name=sender.get("name"),
                text=m.get("message", ""),
                external_id=ext_id,
                received_at=received or datetime.now(timezone.utc),
                status="unread",
                meta={"conversation_id": convo_id, "source": "graph_api"},
            )
            db.add(item)
            result.fetched += 1

    return result


# ── Unified ingest entry point ─────────────────────────────────────────── #


async def ingest_workspace(
    db: AsyncSession, ws_id: uuid.UUID
) -> list[IngestResult]:
    """Pull all inbound interactions for connected accounts in a workspace.

    Returns one :class:`IngestResult` per account+channel. When credentials are
    missing the result carries ``status="not_connected"`` — never fabricated data.
    """
    res = await db.execute(
        select(SocialAccount).where(
            SocialAccount.workspace_id == ws_id,
            SocialAccount.is_active.is_(True),
        )
    )
    accounts = list(res.scalars().all())
    results: list[IngestResult] = []

    async with httpx.AsyncClient() as client:
        for acc in accounts:
            platform = acc.platform.value if hasattr(acc.platform, "value") else str(acc.platform)
            token = get_account_token(acc)
            if not token:
                results.append(IngestResult(platform=platform, status="not_connected"))
                continue

            try:
                if platform == "facebook":
                    r1 = await _ingest_fb_page_comments(db, ws_id, acc, token, client)
                    r2 = await _ingest_fb_conversations(db, ws_id, acc, token, client)
                    r1.fetched += r2.fetched
                    r1.errors.extend(r2.errors)
                    results.append(r1)
                elif platform == "instagram":
                    r1 = await _ingest_ig_comments(db, ws_id, acc, token, client)
                    r2 = await _ingest_ig_mentions(db, ws_id, acc, token, client)
                    r1.fetched += r2.fetched
                    r1.errors.extend(r2.errors)
                    results.append(r1)
                else:
                    results.append(
                        IngestResult(platform=platform, status="platform_not_supported")
                    )
            except Exception as exc:
                log.exception("Ingest error for %s/%s", platform, acc.id)
                results.append(
                    IngestResult(platform=platform, status="error", errors=[str(exc)])
                )

    return results


# ── Real reply via Graph API ───────────────────────────────────────────── #


@dataclass
class ReplyDelivery:
    sent: bool
    platform_reply_id: str | None = None
    status: str = "sent"
    error: str | None = None


async def send_reply_to_platform(
    db: AsyncSession, ws_id: uuid.UUID, item: InboxItem, body: str
) -> ReplyDelivery:
    """Send a reply to a real platform message/comment via Graph API.

    Returns honest delivery status — never pretends a reply was sent.
    """
    platform = item.platform
    if platform not in ("facebook", "instagram"):
        return ReplyDelivery(sent=False, status="platform_not_supported")

    # Find the connected account for this platform
    res = await db.execute(
        select(SocialAccount).where(
            SocialAccount.workspace_id == ws_id,
            SocialAccount.platform == platform,
            SocialAccount.is_active.is_(True),
        )
    )
    account = res.scalars().first()
    if not account:
        return ReplyDelivery(sent=False, status="not_connected")

    token = get_account_token(account)
    if not token:
        return ReplyDelivery(sent=False, status="awaiting_credentials")

    ext_id = item.external_id
    if not ext_id:
        return ReplyDelivery(sent=False, status="no_external_id", error="Item has no external_id to reply to")

    meta = item.meta or {}
    async with httpx.AsyncClient() as client:
        try:
            if item.kind == "comment":
                # Reply to a comment
                result = await _graph_post(
                    client, f"{ext_id}/replies", token, {"message": body}
                )
                if result and result.get("id"):
                    return ReplyDelivery(sent=True, platform_reply_id=result["id"])
                return ReplyDelivery(
                    sent=False, status="api_error",
                    error="Graph API did not return a reply id"
                )
            elif item.kind == "dm":
                # Reply to a DM via the conversation
                convo_id = meta.get("conversation_id")
                if not convo_id:
                    return ReplyDelivery(
                        sent=False, status="no_conversation_id",
                        error="DM item missing conversation_id in metadata"
                    )
                result = await _graph_post(
                    client, f"{convo_id}/messages", token, {"message": body}
                )
                if result and result.get("id"):
                    return ReplyDelivery(sent=True, platform_reply_id=result["id"])
                return ReplyDelivery(
                    sent=False, status="api_error",
                    error="Graph API did not return a message id"
                )
            else:
                return ReplyDelivery(sent=False, status="unsupported_kind")
        except Exception as exc:
            log.exception("Reply send error for item %s", item.id)
            return ReplyDelivery(sent=False, status="error", error=str(exc))


# ── Background poll loop ──────────────────────────────────────────────── #


async def social_inbox_poll_loop(stop: asyncio.Event) -> None:
    """Background loop: poll connected workspaces for new inbound interactions.

    Mirrors the pattern in messaging_dispatch.py.
    """
    await asyncio.sleep(POLL_INITIAL_DELAY_SECONDS)
    log.info("social_inbox_poll_loop started (interval=%ds)", POLL_INTERVAL_SECONDS)

    while not stop.is_set():
        try:
            async with AsyncSessionLocal() as db:
                # Find workspaces with active social accounts that have tokens
                ws_rows = (
                    await db.execute(
                        select(SocialAccount.workspace_id)
                        .where(SocialAccount.is_active.is_(True))
                        .group_by(SocialAccount.workspace_id)
                    )
                ).all()

                for (ws_id,) in ws_rows:
                    try:
                        results = await ingest_workspace(db, ws_id)
                        total = sum(r.fetched for r in results)
                        if total > 0:
                            await db.commit()
                            log.info(
                                "Ingested %d items for workspace %s", total, ws_id
                            )
                        else:
                            await db.rollback()
                    except Exception:
                        log.exception("Ingest failed for workspace %s", ws_id)
                        await db.rollback()
        except Exception:
            log.exception("social_inbox_poll_loop iteration error")

        try:
            await asyncio.wait_for(stop.wait(), timeout=POLL_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            pass

    log.info("social_inbox_poll_loop stopped")
