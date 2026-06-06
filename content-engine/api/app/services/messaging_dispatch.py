"""Real SMS (Twilio) and WhatsApp (Meta Cloud API) dispatch.

Every provider call is a real httpx request guarded by credential checks.
If credentials are missing the caller gets an honest ``not_connected`` result —
no fake SIDs, no simulated delivery.

Used by the background dispatch loop and the 1:1 immediate-send endpoint.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import AsyncSessionLocal
from app.models.messaging import MessageBroadcast, MessageLog, MessagingContact

log = logging.getLogger("messaging_dispatch")

DISPATCH_INTERVAL_SECONDS = 30
DISPATCH_INITIAL_DELAY_SECONDS = 20
BATCH_SIZE = 50

TWILIO_API = "https://api.twilio.com/2010-04-01"
WHATSAPP_API = "https://graph.facebook.com/v21.0"


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Provider connection check ─────────────────────────────────────────────── #


@dataclass
class ChannelStatus:
    connected: bool
    provider: str | None = None
    reason: str | None = None


def channel_status(channel: str) -> ChannelStatus:
    """Return real connection status for a messaging channel."""
    if channel == "whatsapp":
        if settings.whatsapp_configured:
            return ChannelStatus(connected=True, provider="meta_whatsapp_cloud_api")
        return ChannelStatus(connected=False, reason="awaiting_credentials")
    # SMS
    if settings.twilio_configured:
        return ChannelStatus(connected=True, provider="twilio")
    if getattr(settings, "acs_connection_string", None):
        return ChannelStatus(connected=True, provider="azure_communication_services")
    return ChannelStatus(connected=False, reason="awaiting_credentials")


# ── Real provider sends ───────────────────────────────────────────────────── #


@dataclass
class SendResult:
    success: bool
    provider_message_id: str | None = None
    error: str | None = None


async def send_sms_twilio(to: str, body: str) -> SendResult:
    """Send a single SMS via the Twilio REST API (real httpx POST)."""
    if not settings.twilio_configured:
        return SendResult(success=False, error="twilio_not_configured")
    url = f"{TWILIO_API}/Accounts/{settings.twilio_sid}/Messages.json"
    auth_bytes = f"{settings.twilio_sid}:{settings.twilio_auth_token}".encode()
    auth_header = f"Basic {base64.b64encode(auth_bytes).decode()}"
    payload = {
        "To": to,
        "From": settings.twilio_from_number,
        "Body": body,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url,
                data=payload,
                headers={"Authorization": auth_header},
            )
        if resp.status_code in (200, 201):
            data = resp.json()
            return SendResult(
                success=True,
                provider_message_id=data.get("sid"),
            )
        return SendResult(
            success=False,
            error=f"twilio_http_{resp.status_code}: {resp.text[:300]}",
        )
    except httpx.HTTPError as exc:
        return SendResult(success=False, error=f"twilio_error: {exc}")


async def send_whatsapp_meta(to: str, body: str) -> SendResult:
    """Send a WhatsApp text message via Meta Cloud API (real httpx POST).

    ``to`` must be in international format (e.g. ``+15551234567``).
    This sends a session/text message. For template messages the caller should
    use ``send_whatsapp_template_meta`` instead.
    """
    if not settings.whatsapp_configured:
        return SendResult(success=False, error="whatsapp_not_configured")
    url = f"{WHATSAPP_API}/{settings.whatsapp_phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to.lstrip("+"),
        "type": "text",
        "text": {"body": body},
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.whatsapp_token}",
                    "Content-Type": "application/json",
                },
            )
        if resp.status_code in (200, 201):
            data = resp.json()
            messages = data.get("messages") or []
            mid = messages[0]["id"] if messages else None
            return SendResult(success=True, provider_message_id=mid)
        return SendResult(
            success=False,
            error=f"whatsapp_http_{resp.status_code}: {resp.text[:300]}",
        )
    except httpx.HTTPError as exc:
        return SendResult(success=False, error=f"whatsapp_error: {exc}")


async def send_whatsapp_template_meta(
    to: str,
    template_name: str,
    language_code: str = "en_US",
    components: list | None = None,
) -> SendResult:
    """Send a WhatsApp template message via Meta Cloud API."""
    if not settings.whatsapp_configured:
        return SendResult(success=False, error="whatsapp_not_configured")
    url = f"{WHATSAPP_API}/{settings.whatsapp_phone_id}/messages"
    template_obj: dict = {
        "name": template_name,
        "language": {"code": language_code},
    }
    if components:
        template_obj["components"] = components
    payload = {
        "messaging_product": "whatsapp",
        "to": to.lstrip("+"),
        "type": "template",
        "template": template_obj,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.whatsapp_token}",
                    "Content-Type": "application/json",
                },
            )
        if resp.status_code in (200, 201):
            data = resp.json()
            messages = data.get("messages") or []
            mid = messages[0]["id"] if messages else None
            return SendResult(success=True, provider_message_id=mid)
        return SendResult(
            success=False,
            error=f"whatsapp_http_{resp.status_code}: {resp.text[:300]}",
        )
    except httpx.HTTPError as exc:
        return SendResult(success=False, error=f"whatsapp_error: {exc}")


# ── Dispatch a single MessageLog row ──────────────────────────────────────── #


async def dispatch_one(log_row: MessageLog) -> SendResult:
    """Attempt real provider delivery for a single queued message row."""
    body = log_row.body or ""
    to = log_row.to_phone or ""
    if not to:
        return SendResult(success=False, error="missing_recipient_phone")
    if not body:
        return SendResult(success=False, error="empty_message_body")

    if log_row.channel == "whatsapp":
        return await send_whatsapp_meta(to, body)
    return await send_sms_twilio(to, body)


# ── Background dispatch loop ──────────────────────────────────────────────── #


async def messaging_dispatch_loop(stop: asyncio.Event) -> None:
    """Continuously dispatch queued messaging_logs rows until ``stop`` is set."""
    log.info("Messaging dispatch loop started (every %ss)", DISPATCH_INTERVAL_SECONDS)
    try:
        await asyncio.sleep(DISPATCH_INITIAL_DELAY_SECONDS)
    except asyncio.CancelledError:
        return

    while not stop.is_set():
        try:
            await _dispatch_queued()
        except asyncio.CancelledError:
            break
        except Exception:
            log.exception("messaging dispatch sweep failed")
        try:
            await asyncio.sleep(DISPATCH_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break


async def _dispatch_queued() -> None:
    """One sweep: pick up queued message logs and attempt real sends."""
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(MessageLog)
            .where(MessageLog.status == "queued")
            .order_by(MessageLog.created_at.asc())
            .limit(BATCH_SIZE)
        )
        rows = list(res.scalars().all())
        if not rows:
            return

        now = _now()
        for row in rows:
            cs = channel_status(row.channel)
            if not cs.connected:
                row.status = "skipped_not_connected"
                row.error = cs.reason or "provider_not_configured"
                continue

            result = await dispatch_one(row)
            if result.success:
                row.status = "sent"
                row.provider_message_id = result.provider_message_id
                row.sent_at = now
                row.error = None
            else:
                row.status = "failed"
                row.error = result.error

        # Refresh broadcast stats after processing
        broadcast_ids = {r.broadcast_id for r in rows if r.broadcast_id}
        for bc_id in broadcast_ids:
            bc = await db.get(MessageBroadcast, bc_id)
            if bc:
                stats_res = await db.execute(
                    select(MessageLog.status, func.count())
                    .where(MessageLog.broadcast_id == bc_id)
                    .group_by(MessageLog.status)
                )
                counts = {s: 0 for s in ("queued", "sent", "delivered", "read", "failed", "skipped_not_connected")}
                for sv, n in stats_res.all():
                    counts[sv] = int(n)
                bc.stats = {
                    "sent": counts["sent"],
                    "delivered": counts["delivered"],
                    "read": counts["read"],
                    "failed": counts["failed"],
                    "queued": counts["queued"],
                    "skipped_not_connected": counts["skipped_not_connected"],
                }

        await db.commit()
        log.info("Messaging dispatch: processed %d queued messages", len(rows))
