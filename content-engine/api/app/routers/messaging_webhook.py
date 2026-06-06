"""Public messaging webhook — delivery / read receipts from providers.

This router is PUBLIC (no auth, no api prefix) — mirroring email_track.py.
The orchestrator wires it directly on the FastAPI app (not under /api/v1).

Twilio sends delivery status callbacks as form POSTs.
Meta WhatsApp Cloud API sends JSON webhook payloads.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.messaging import MessageBroadcast, MessageLog

log = logging.getLogger("messaging_webhook")

router = APIRouter(prefix="/messaging/webhook", tags=["messaging-webhook"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Status mapping helpers ─────────────────────────────────────────────────── #

TWILIO_STATUS_MAP = {
    "queued": "queued",
    "sent": "sent",
    "delivered": "delivered",
    "read": "read",
    "undelivered": "failed",
    "failed": "failed",
}

META_STATUS_MAP = {
    "sent": "sent",
    "delivered": "delivered",
    "read": "read",
    "failed": "failed",
}


async def _update_broadcast_stats(db: AsyncSession, broadcast_id: uuid.UUID) -> None:
    """Recompute rolled-up stats for a broadcast from its logs."""
    from sqlalchemy import func

    bc = await db.get(MessageBroadcast, broadcast_id)
    if not bc:
        return
    res = await db.execute(
        select(MessageLog.status, func.count())
        .where(MessageLog.broadcast_id == broadcast_id)
        .group_by(MessageLog.status)
    )
    counts: dict[str, int] = {}
    for sv, n in res.all():
        counts[sv] = int(n)
    bc.stats = {
        "sent": counts.get("sent", 0),
        "delivered": counts.get("delivered", 0),
        "read": counts.get("read", 0),
        "failed": counts.get("failed", 0),
        "queued": counts.get("queued", 0),
    }


# ── Twilio delivery webhooks ──────────────────────────────────────────────── #

@router.post("/twilio")
async def twilio_status_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Ingest Twilio SMS delivery status callbacks (form-encoded POST)."""
    try:
        form = await request.form()
    except Exception:
        return {"status": "ignored", "reason": "invalid_form"}

    message_sid = str(form.get("MessageSid") or "").strip()
    message_status = str(form.get("MessageStatus") or "").strip().lower()

    if not message_sid or not message_status:
        return {"status": "ignored", "reason": "missing_fields"}

    mapped = TWILIO_STATUS_MAP.get(message_status)
    if not mapped:
        return {"status": "ignored", "reason": f"unhandled_status: {message_status}"}

    res = await db.execute(
        select(MessageLog).where(MessageLog.provider_message_id == message_sid).limit(1)
    )
    log_row = res.scalar_one_or_none()
    if not log_row:
        return {"status": "ignored", "reason": "message_not_found"}

    now = _now()
    log_row.status = mapped
    if mapped == "delivered" and not log_row.delivered_at:
        log_row.delivered_at = now
    elif mapped == "read" and not log_row.read_at:
        log_row.read_at = now
        if not log_row.delivered_at:
            log_row.delivered_at = now
    elif mapped == "failed":
        error_code = form.get("ErrorCode") or form.get("errorCode")
        log_row.error = f"twilio_{error_code}" if error_code else "twilio_delivery_failed"

    if log_row.broadcast_id:
        await _update_broadcast_stats(db, log_row.broadcast_id)

    await db.commit()
    return {"status": "processed", "message_sid": message_sid, "new_status": mapped}


# ── Meta WhatsApp Cloud API webhooks ──────────────────────────────────────── #

@router.get("/whatsapp")
async def whatsapp_verify(request: Request) -> str:
    """Handle Meta webhook verification challenge (GET with hub.verify_token)."""
    from app.config import settings

    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge", "")
    verify_token = getattr(settings, "whatsapp_verify_token", None) or "messaging_webhook"

    if mode == "subscribe" and token == verify_token:
        return challenge
    return ""


@router.post("/whatsapp")
async def whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Ingest Meta WhatsApp Cloud API delivery/read status webhooks."""
    try:
        body = await request.json()
    except Exception:
        return {"status": "ignored", "reason": "invalid_json"}

    if not isinstance(body, dict):
        return {"status": "ignored", "reason": "expected_object"}

    processed = 0
    entries = body.get("entry") or []
    for entry in entries:
        changes = entry.get("changes") or []
        for change in changes:
            value = change.get("value") or {}
            statuses = value.get("statuses") or []
            for st in statuses:
                wamid = st.get("id", "").strip()
                wa_status = st.get("status", "").strip().lower()
                mapped = META_STATUS_MAP.get(wa_status)
                if not wamid or not mapped:
                    continue

                res = await db.execute(
                    select(MessageLog)
                    .where(MessageLog.provider_message_id == wamid)
                    .limit(1)
                )
                log_row = res.scalar_one_or_none()
                if not log_row:
                    continue

                now = _now()
                log_row.status = mapped
                if mapped == "delivered" and not log_row.delivered_at:
                    log_row.delivered_at = now
                elif mapped == "read" and not log_row.read_at:
                    log_row.read_at = now
                    if not log_row.delivered_at:
                        log_row.delivered_at = now
                elif mapped == "failed":
                    errors = st.get("errors") or []
                    err_msg = errors[0].get("title", "delivery_failed") if errors else "delivery_failed"
                    log_row.error = f"whatsapp_{err_msg}"

                if log_row.broadcast_id:
                    await _update_broadcast_stats(db, log_row.broadcast_id)
                processed += 1

    if processed:
        await db.commit()
    return {"status": "processed", "updates": processed}
