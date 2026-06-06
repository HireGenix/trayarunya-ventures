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
from app.services.token_vault import get_account_token

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


def is_account_connected(account: SocialAccount) -> bool:
    """Check whether the account has a usable token stored."""
    token = get_account_token(account)
    return bool(token and account.is_active)


async def execute_publish(
    db: AsyncSession,
    item: ContentItem,
    account: SocialAccount,
    sched: Schedule,
) -> None:
    """Publish ``item`` via ``account`` and update ``sched``/``item`` status.

    Does not commit -- the caller owns the transaction. Sets the schedule to
    ``published`` (with external id) or ``failed`` (with error), or
    ``skipped_not_connected`` when the channel lacks credentials.
    """
    if not is_account_connected(account):
        sched.status = ScheduleStatus.skipped_not_connected
        sched.error = (
            f"Channel {getattr(account.platform, 'value', str(account.platform))} "
            "is not connected -- no access token. Connect the account and retry."
        )
        return

    text = compose_text(item, account)
    image_bytes = await load_primary_image(db, item)
    platform = getattr(account.platform, "value", str(account.platform))

    # Instagram needs a public image URL, not raw bytes
    image_url: str | None = None
    if platform == "instagram" and not image_bytes:
        # Try to use the item's image_url if it's a public URL
        raw_url = getattr(item, "image_url", None)
        if raw_url and str(raw_url).startswith("http"):
            image_url = str(raw_url)

    try:
        result = await publish(
            account, text, image_bytes, image_url=image_url,
        )
        if isinstance(result, tuple):
            external_id, permalink = result
        else:
            external_id = result
            permalink = None
        sched.status = ScheduleStatus.published
        sched.external_post_id = external_id
        sched.permalink = permalink
        sched.error = None
        item.status = ContentStatus.published
        try:
            from app.services.notifications import notify
            await notify(
                db, account.workspace_id,
                level="success", category="publishing",
                title=f"Published to {platform}",
                body=(item.title or text)[:160],
                link="/dashboard/publishing",
                dedupe_key=f"pub-ok:{sched.id}",
            )
        except Exception:  # noqa: BLE001 — notification must never break publishing
            log.exception("Failed to create publish-success notification")
        try:
            from app.services.automation import emit_event
            await emit_event(
                db, account.workspace_id, "content.published",
                {
                    "platform": platform,
                    "title": item.title or "",
                    "content_type": getattr(item.content_type, "value", str(item.content_type)),
                    "external_post_id": external_id,
                },
                source="publish_flow",
            )
        except Exception:  # noqa: BLE001 — automation must never break publishing
            log.exception("Failed to emit content.published event")
    except PublishError as exc:
        sched.status = ScheduleStatus.failed
        sched.error = str(exc)[:1000]
        try:
            from app.services.notifications import notify
            await notify(
                db, account.workspace_id,
                level="error", category="publishing",
                title=f"Publish failed on {platform}",
                body=str(exc)[:200],
                link="/dashboard/publishing",
                dedupe_key=f"pub-fail:{sched.id}",
            )
        except Exception:  # noqa: BLE001
            log.exception("Failed to create publish-failure notification")
        try:
            from app.services.automation import emit_event
            await emit_event(
                db, account.workspace_id, "publish.failed",
                {
                    "platform": platform,
                    "title": item.title or "",
                    "error": str(exc)[:300],
                },
                source="publish_flow",
            )
        except Exception:  # noqa: BLE001
            log.exception("Failed to emit publish.failed event")
