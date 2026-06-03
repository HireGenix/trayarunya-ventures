"""Shared publishing flow: compose the outgoing post, load its image, and execute
the publish against a connected account — with an idempotency guard so the same
content item is never double-posted to the same account.

Used by both the manual ``/social/publish`` route and the background scheduler so
the two paths behave identically.
"""
from __future__ import annotations

import base64
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ContentImage,
    ContentItem,
    ContentStatus,
    Schedule,
    ScheduleStatus,
    SocialAccount,
    SocialPlatform,
)
from app.services.publisher import PublishError, publish

log = logging.getLogger("publish_flow")

# Content must reach one of these states before it may go out the door.
PUBLISHABLE_STATES = {
    ContentStatus.approved,
    ContentStatus.scheduled,
    ContentStatus.published,
}


def compose_text(item: ContentItem, account: SocialAccount) -> str:
    """Build the outgoing post text: best caption + platform variant + hashtags."""
    variants = item.variants or {}
    text = variants.get("caption") or item.body or ""
    if account.platform == SocialPlatform.x and variants.get("x"):
        text = variants.get("x")
    tags = variants.get("hashtags")
    if isinstance(tags, list) and tags:
        tag_line = " ".join(str(t) if str(t).startswith("#") else f"#{t}" for t in tags)
        if tag_line and tag_line not in text:
            text = f"{text}\n\n{tag_line}".strip()
    return text


async def load_primary_image(db: AsyncSession, item: ContentItem) -> bytes | None:
    """Return the raw bytes of the item's first generated image, if any."""
    row = (
        await db.execute(
            select(ContentImage)
            .where(ContentImage.content_item_id == item.id)
            .order_by(ContentImage.created_at.asc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not row or not row.data_b64:
        return None
    try:
        return base64.b64decode(row.data_b64)
    except (ValueError, TypeError):
        log.warning("Could not decode image for content item %s", item.id)
        return None


async def already_published(
    db: AsyncSession, item: ContentItem, account: SocialAccount
) -> Schedule | None:
    """Idempotency guard: return an existing successful publish for this
    item+account so callers can avoid double-posting."""
    return (
        await db.execute(
            select(Schedule)
            .where(
                Schedule.content_item_id == item.id,
                Schedule.social_account_id == account.id,
                Schedule.status == ScheduleStatus.published,
                Schedule.external_post_id.is_not(None),
            )
            .limit(1)
        )
    ).scalar_one_or_none()


async def execute_publish(
    db: AsyncSession,
    item: ContentItem,
    account: SocialAccount,
    sched: Schedule,
) -> None:
    """Publish ``item`` via ``account`` and update ``sched``/``item`` status.

    Does not commit — the caller owns the transaction. Sets the schedule to
    ``published`` (with external id) or ``failed`` (with error).
    """
    text = compose_text(item, account)
    image_bytes = await load_primary_image(db, item)
    try:
        external_id = await publish(account, text, image_bytes)
        sched.status = ScheduleStatus.published
        sched.external_post_id = external_id
        sched.error = None
        item.status = ContentStatus.published
    except PublishError as exc:
        sched.status = ScheduleStatus.failed
        sched.error = str(exc)[:1000]
