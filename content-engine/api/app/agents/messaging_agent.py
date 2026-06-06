"""The Messaging Agent — agentic SMS & WhatsApp copy + cadence brain.

SENSE  -> read real contacts / templates / broadcast engagement for a workspace
DIAGNOSE -> understand opt-in base, channel mix, delivery & read performance
PLAN/ACT -> draft channel-appropriate copy (SMS <=160 chars, WhatsApp richer)
            grounded in the workspace BrandBrain voice; recommend the next
            broadcast / follow-up from engagement.

Every LLM call has a deterministic fallback so the feature never hard-fails.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models.messaging import (
    CHANNELS,
    MessageBroadcast,
    MessageLog,
    MessagingContact,
)

log = logging.getLogger("messaging_agent")

SYSTEM = (
    "You are an expert SMS and WhatsApp marketing strategist for a brand. "
    "You write concise, compliant, high-converting mobile messages that match "
    "the brand voice and always include a clear call to action. "
    "Respond with strict JSON only."
)

SMS_LIMIT = 160


def _norm_channel(channel: str | None) -> str:
    c = (channel or "sms").strip().lower()
    return c if c in CHANNELS else "sms"


async def _load_brand_voice(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    """Best-effort brand grounding; messaging works without a BrandBrain too."""
    try:
        from app.models import BrandBrain  # local import avoids hard coupling

        bb = (
            await db.execute(
                select(BrandBrain).where(BrandBrain.workspace_id == ws_id)
            )
        ).scalar_one_or_none()
        if bb is None:
            return {}
        return {
            "mission": getattr(bb, "mission", None),
            "value_prop": getattr(bb, "value_prop", None),
            "voice": getattr(bb, "voice", None),
            "keywords": getattr(bb, "keywords", None),
        }
    except Exception:  # noqa: BLE001 — grounding is optional, never fatal
        return {}


def _fallback_message(brief: str, channel: str, voice: dict[str, Any]) -> dict:
    """Deterministic copy used when the LLM returns nothing usable."""
    chan = _norm_channel(channel)
    brief = (brief or "your offer").strip()
    if chan == "sms":
        text = f"{brief[:110]} Reply STOP to opt out."
        text = text[:SMS_LIMIT]
        return {
            "channel": "sms",
            "message": text,
            "variables": [],
            "char_count": len(text),
            "rationale": "Deterministic SMS fallback (LLM unavailable).",
            "fallback": True,
        }
    text = (
        f"Hi {{{{name}}}}, {brief[:180]} "
        "Tap below to learn more, or reply STOP to opt out."
    )
    return {
        "channel": "whatsapp",
        "message": text,
        "variables": ["name"],
        "char_count": len(text),
        "rationale": "Deterministic WhatsApp fallback (LLM unavailable).",
        "fallback": True,
    }


async def draft_message(
    db: AsyncSession,
    ws_id: uuid.UUID,
    brief: str,
    channel: str = "sms",
) -> dict:
    """Draft a channel-appropriate marketing message grounded in brand voice."""
    chan = _norm_channel(channel)
    voice = await _load_brand_voice(db, ws_id)

    if chan == "sms":
        guidance = (
            f"Channel: SMS. Keep the message at or under {SMS_LIMIT} characters "
            "including a brief opt-out (e.g. 'Reply STOP to opt out'). Plain "
            "text only, no markdown."
        )
    else:
        guidance = (
            "Channel: WhatsApp. You may be slightly longer and warmer. Open with "
            "a {{name}} personalization variable, keep it scannable, end with a "
            "clear call to action and an opt-out path."
        )

    user = (
        f"Brand voice/context (may be empty): {voice}\n"
        f"Marketing brief: {brief}\n"
        f"{guidance}\n"
        "Use {{double_curly}} placeholders for any personalization variables.\n"
        'Return JSON: {"channel": "%s", "message": "...", '
        '"variables": ["..."], "rationale": "..."}' % chan
    )

    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
    except Exception as exc:  # noqa: BLE001
        log.warning("draft_message LLM failed: %s", exc)
        data = {}

    msg = (data or {}).get("message")
    if not isinstance(msg, str) or not msg.strip():
        return _fallback_message(brief, chan, voice)

    msg = msg.strip()
    if chan == "sms" and len(msg) > SMS_LIMIT:
        msg = msg[:SMS_LIMIT].rstrip()

    variables = data.get("variables")
    if not isinstance(variables, list):
        variables = []
    return {
        "channel": chan,
        "message": msg,
        "variables": [str(v) for v in variables],
        "char_count": len(msg),
        "rationale": str(data.get("rationale") or "AI-drafted message."),
        "fallback": False,
    }


async def run_cycle(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Autonomy loop: recommend the next broadcast / follow-up from engagement."""
    contacts = int(
        (
            await db.execute(
                select(func.count())
                .select_from(MessagingContact)
                .where(
                    MessagingContact.workspace_id == ws_id,
                    MessagingContact.opt_in.is_(True),
                )
            )
        ).scalar_one()
    )
    sent_broadcasts = int(
        (
            await db.execute(
                select(func.count())
                .select_from(MessageBroadcast)
                .where(
                    MessageBroadcast.workspace_id == ws_id,
                    MessageBroadcast.status == "sent",
                )
            )
        ).scalar_one()
    )
    res = await db.execute(
        select(MessageLog.status, func.count())
        .where(MessageLog.workspace_id == ws_id)
        .group_by(MessageLog.status)
    )
    log_counts = {s: 0 for s in ("queued", "sent", "delivered", "read", "failed")}
    for status_value, n in res.all():
        log_counts[status_value] = int(n)

    delivered = log_counts["delivered"] + log_counts["read"]
    attempted = delivered + log_counts["sent"] + log_counts["failed"]
    read_rate = round(log_counts["read"] / delivered, 4) if delivered else 0.0

    recommendations: list[dict[str, Any]] = []
    if contacts == 0:
        recommendations.append(
            {
                "type": "grow_audience",
                "priority": "high",
                "message": "No opted-in contacts yet. Import or collect "
                "opt-ins before broadcasting.",
            }
        )
    elif sent_broadcasts == 0:
        recommendations.append(
            {
                "type": "first_broadcast",
                "priority": "high",
                "message": f"You have {contacts} opted-in contacts and no "
                "broadcasts sent. Launch a welcome broadcast.",
            }
        )
    else:
        if read_rate and read_rate < 0.4:
            recommendations.append(
                {
                    "type": "improve_copy",
                    "priority": "medium",
                    "message": f"Read rate is {round(read_rate * 100)}%. Test a "
                    "shorter hook and a single clear CTA.",
                }
            )
        recommendations.append(
            {
                "type": "follow_up",
                "priority": "medium",
                "message": "Send a follow-up to recipients who were delivered "
                "but have not read the last broadcast.",
            }
        )

    return {
        "opted_in_contacts": contacts,
        "broadcasts_sent": sent_broadcasts,
        "messages_attempted": attempted,
        "delivered": delivered,
        "read_rate": read_rate,
        "recommendations": recommendations,
    }
