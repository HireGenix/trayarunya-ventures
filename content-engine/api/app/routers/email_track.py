"""Public email tracking endpoints — open pixel, click redirect, webhook.

These URLs are embedded in outgoing campaign emails. They are hit by mail
clients (image loads) and subscriber clicks, so they must be fast, public
and unauthenticated. No workspace header is required.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Form, Query, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.email import (
    EmailCampaign,
    EmailList,
    EmailSendLog,
    EmailSubscriber,
)
from app.services import email as svc
from app.services.email_tracking import TRANSPARENT_GIF, verify_token

log = logging.getLogger("email_track")

router = APIRouter(prefix="/email/t", tags=["email-tracking"])


async def _bump_stat(db: AsyncSession, campaign_id: uuid.UUID | None, key: str) -> None:
    """Increment a campaign stats counter by 1."""
    if campaign_id is None:
        return
    campaign = await db.get(EmailCampaign, campaign_id)
    if campaign is None:
        return
    stats = dict(campaign.stats or {})
    stats[key] = stats.get(key, 0) + 1
    campaign.stats = stats


@router.get("/o/{token}.gif")
async def track_open(token: str, db: AsyncSession = Depends(get_db)) -> Response:
    """Record an email open (1x1 transparent GIF pixel)."""
    send_log_id = verify_token(token)
    if send_log_id is not None:
        log_row = await db.get(EmailSendLog, send_log_id)
        if log_row and log_row.opened_at is None:
            now = datetime.now(timezone.utc)
            log_row.opened_at = now
            if log_row.status in ("sent", "queued"):
                log_row.status = "opened"
            await _bump_stat(db, log_row.campaign_id, "opens")
            await db.commit()
    return Response(
        content=TRANSPARENT_GIF,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.get("/c/{token}")
async def track_click(
    token: str,
    u: str = Query(..., description="Original URL (percent-encoded)"),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Record a click and 302-redirect to the original URL."""
    send_log_id = verify_token(token)
    if send_log_id is not None:
        log_row = await db.get(EmailSendLog, send_log_id)
        if log_row:
            now = datetime.now(timezone.utc)
            log_row.clicked_url = u
            if log_row.clicked_at is None:
                log_row.clicked_at = now
            if log_row.opened_at is None:
                log_row.opened_at = now
                await _bump_stat(db, log_row.campaign_id, "opens")
            if log_row.status in ("sent", "queued", "opened"):
                log_row.status = "clicked"
            await _bump_stat(db, log_row.campaign_id, "clicks")
            await db.commit()
    return RedirectResponse(url=u, status_code=302)


# --------------------------------------------------------------------------- #
# Webhook: bounce / complaint from email provider
# --------------------------------------------------------------------------- #
webhook_router = APIRouter(prefix="/email/webhook", tags=["email-tracking"])


@webhook_router.post("/{provider}")
async def provider_webhook(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle bounce/complaint webhook from the email provider.

    Accepts a generic JSON shape:
      { "type": "bounce"|"complaint", "email": "...", "message_id": "..." }
    Azure Communication Email status callbacks and similar providers post
    analogous payloads.
    """
    try:
        body = await request.json()
    except Exception:
        return {"status": "ignored", "reason": "invalid JSON"}

    if not isinstance(body, dict):
        return {"status": "ignored", "reason": "expected object"}

    event_type = str(body.get("type") or body.get("eventType") or body.get("event") or "").lower()
    recipient = str(body.get("email") or body.get("recipient") or body.get("to") or "").strip().lower()
    message_id = body.get("message_id") or body.get("messageId")

    if event_type not in ("bounce", "complaint", "dropped", "hard_bounce", "spam"):
        return {"status": "ignored", "reason": f"unhandled event type: {event_type}"}
    if not recipient:
        return {"status": "ignored", "reason": "no recipient email"}

    is_complaint = event_type in ("complaint", "spam")
    new_sub_status = "complained" if is_complaint else "bounced"
    new_log_status = "bounced"
    stat_key = "bounces"

    # Update all matching subscribers across workspaces for this email
    res = await db.execute(
        select(EmailSubscriber).where(
            EmailSubscriber.email == recipient,
            EmailSubscriber.status == "subscribed",
        )
    )
    for sub in res.scalars().all():
        sub.status = new_sub_status

    # Update send logs
    stmt = select(EmailSendLog).where(EmailSendLog.email == recipient)
    if message_id:
        # If we have a message_id, try to match; otherwise update most recent
        pass
    res = await db.execute(
        stmt.where(EmailSendLog.status.in_(["sent", "queued", "opened", "clicked"]))
        .order_by(EmailSendLog.created_at.desc())
        .limit(5)
    )
    for log_row in res.scalars().all():
        log_row.status = new_log_status
        await _bump_stat(db, log_row.campaign_id, stat_key)

    await db.commit()
    return {"status": "processed", "event": event_type, "email": recipient}


# --------------------------------------------------------------------------- #
# Public subscriber self-service: confirm / unsubscribe / preferences
# --------------------------------------------------------------------------- #
def _page(title: str, body: str) -> str:
    """Minimal, self-contained HTML page for subscriber-facing actions."""
    return (
        "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\" />"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />"
        f"<title>{title}</title>"
        "<style>body{margin:0;font-family:Arial,Helvetica,sans-serif;"
        "background:#f4f4f7;color:#1f2933;}"
        ".wrap{max-width:520px;margin:48px auto;background:#fff;border-radius:8px;"
        "padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08);}"
        "h1{font-size:22px;margin:0 0 12px;}p{line-height:1.6;color:#475569;}"
        ".btn{display:inline-block;margin-top:16px;padding:12px 22px;border:0;"
        "border-radius:6px;background:#2563eb;color:#fff;font-weight:bold;"
        "text-decoration:none;cursor:pointer;font-size:15px;}"
        "label{display:block;padding:8px 0;}</style></head>"
        f"<body><div class=\"wrap\">{body}</div></body></html>"
    )


async def _subscriber_from_token(
    db: AsyncSession, token: str
) -> tuple[EmailSubscriber | None, EmailSendLog | None]:
    """Resolve a tracking token to its subscriber via the send log."""
    send_log_id = verify_token(token)
    if send_log_id is None:
        return None, None
    log_row = await db.get(EmailSendLog, send_log_id)
    if log_row is None or log_row.subscriber_id is None:
        return None, log_row
    sub = await db.get(EmailSubscriber, log_row.subscriber_id)
    return sub, log_row


@router.get("/confirm/{token}", response_class=HTMLResponse)
async def confirm_subscription(
    token: str, db: AsyncSession = Depends(get_db)
) -> HTMLResponse:
    """Double opt-in confirmation. Activates a pending subscriber."""
    # Primary path: the token IS the subscriber's stored confirm_token.
    res = await db.execute(
        select(EmailSubscriber).where(EmailSubscriber.confirm_token == token)
    )
    sub = res.scalar_one_or_none()
    # Fallback: treat the token as a signed send-log token.
    if sub is None:
        sub, _ = await _subscriber_from_token(db, token)

    if sub is None:
        return HTMLResponse(
            _page(
                "Confirmation link invalid",
                "<h1>Link invalid or expired</h1>"
                "<p>We couldn't confirm this subscription. The link may have "
                "already been used or expired.</p>",
            ),
            status_code=404,
        )

    sub.status = "subscribed"
    sub.confirm_token = None
    await db.commit()
    return HTMLResponse(
        _page(
            "Subscription confirmed",
            "<h1>You're confirmed! 🎉</h1>"
            "<p>Thanks for confirming your email address. You'll start hearing "
            "from us soon.</p>",
        )
    )


@router.get("/unsubscribe/{token}", response_class=HTMLResponse)
async def unsubscribe(token: str, db: AsyncSession = Depends(get_db)) -> HTMLResponse:
    """One-click unsubscribe. Opts the subscriber out and suppresses the email."""
    sub, _log = await _subscriber_from_token(db, token)
    if sub is None:
        return HTMLResponse(
            _page(
                "Unsubscribe link invalid",
                "<h1>Link invalid or expired</h1>"
                "<p>We couldn't process this request.</p>",
            ),
            status_code=404,
        )

    sub.status = "unsubscribed"
    await svc.create_suppression(
        db, sub.workspace_id, email=sub.email, reason="unsubscribe"
    )
    await db.commit()
    return HTMLResponse(
        _page(
            "Unsubscribed",
            "<h1>You've been unsubscribed</h1>"
            f"<p><strong>{sub.email}</strong> will no longer receive emails "
            "from us. We're sorry to see you go.</p>"
            f"<a class=\"btn\" href=\"/email/t/preferences/{token}\">"
            "Manage preferences instead</a>",
        )
    )


async def _subscriber_rows_for_email(
    db: AsyncSession, ws_id: uuid.UUID, email: str
) -> list[EmailSubscriber]:
    res = await db.execute(
        select(EmailSubscriber).where(
            EmailSubscriber.workspace_id == ws_id,
            EmailSubscriber.email == email,
        )
    )
    return list(res.scalars().all())


@router.get("/preferences/{token}", response_class=HTMLResponse)
async def preferences(token: str, db: AsyncSession = Depends(get_db)) -> HTMLResponse:
    """Preference center: list the subscriber's lists with unsubscribe toggles."""
    sub, _log = await _subscriber_from_token(db, token)
    if sub is None:
        return HTMLResponse(
            _page(
                "Preferences link invalid",
                "<h1>Link invalid or expired</h1>"
                "<p>We couldn't load your preferences.</p>",
            ),
            status_code=404,
        )

    rows = await _subscriber_rows_for_email(db, sub.workspace_id, sub.email)
    checkboxes = []
    for row in rows:
        lst = await db.get(EmailList, row.list_id)
        list_name = lst.name if lst else "List"
        checked = "checked" if row.status == "subscribed" else ""
        checkboxes.append(
            f"<label><input type=\"checkbox\" name=\"lists\" "
            f"value=\"{row.list_id}\" {checked} /> {list_name}</label>"
        )
    if not checkboxes:
        checkboxes.append("<p>You are not on any mailing lists.</p>")

    body = (
        "<h1>Email preferences</h1>"
        f"<p>Managing preferences for <strong>{sub.email}</strong>. "
        "Check the lists you'd like to keep receiving.</p>"
        f"<form method=\"post\" action=\"/email/t/preferences/{token}\">"
        + "".join(checkboxes)
        + "<button class=\"btn\" type=\"submit\">Save preferences</button>"
        "</form>"
    )
    return HTMLResponse(_page("Email preferences", body))


@router.post("/preferences/{token}", response_class=HTMLResponse)
async def update_preferences(
    token: str,
    lists: list[str] = Form(default=[]),
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Apply preference selections: stay subscribed only to the chosen lists."""
    sub, _log = await _subscriber_from_token(db, token)
    if sub is None:
        return HTMLResponse(
            _page(
                "Preferences link invalid",
                "<h1>Link invalid or expired</h1>"
                "<p>We couldn't update your preferences.</p>",
            ),
            status_code=404,
        )

    keep: set[str] = {str(x) for x in lists}
    rows = await _subscriber_rows_for_email(db, sub.workspace_id, sub.email)
    any_subscribed = False
    for row in rows:
        if str(row.list_id) in keep:
            row.status = "subscribed"
            any_subscribed = True
        else:
            row.status = "unsubscribed"

    # If the subscriber opted out of everything, add a suppression entry.
    if not any_subscribed:
        await svc.create_suppression(
            db, sub.workspace_id, email=sub.email, reason="preferences"
        )

    await db.commit()
    return HTMLResponse(
        _page(
            "Preferences saved",
            "<h1>Preferences updated ✅</h1>"
            "<p>Your email preferences have been saved.</p>",
        )
    )
