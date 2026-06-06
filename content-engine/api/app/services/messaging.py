"""Messaging service — CRUD + real engagement math.

Every metric (delivery rate, read rate, broadcast counts) is derived from
:class:`MessageLog` rows the module itself writes. Audience segmentation runs
against real :class:`MessagingContact` rows by tag / opt-in.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.messaging import (
    CHANNELS,
    MessageBroadcast,
    MessageLog,
    MessageTemplate,
    MessagingContact,
)


def _norm_channel(channel: str | None) -> str:
    c = (channel or "sms").strip().lower()
    return c if c in CHANNELS else "sms"


# --------------------------------------------------------------------------- #
# Contacts
# --------------------------------------------------------------------------- #
async def list_contacts(db: AsyncSession, ws_id: uuid.UUID) -> list[MessagingContact]:
    res = await db.execute(
        select(MessagingContact)
        .where(MessagingContact.workspace_id == ws_id)
        .order_by(MessagingContact.created_at.desc())
    )
    return list(res.scalars().all())


async def create_contact(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    phone: str,
    name: str | None = None,
    channel: str = "sms",
    opt_in: bool = True,
    tags: list | None = None,
) -> MessagingContact:
    obj = MessagingContact(
        workspace_id=ws_id,
        phone=phone.strip(),
        name=(name or None),
        channel=_norm_channel(channel),
        opt_in=bool(opt_in),
        tags=tags or [],
    )
    db.add(obj)
    await db.flush()
    return obj


async def segment_contacts(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    channel: str | None = None,
    audience: dict | None = None,
) -> list[MessagingContact]:
    """Resolve the recipient set for a broadcast from a real audience filter.

    Supported filter keys: ``channel``, ``opt_in`` (defaults to True), ``tag``
    / ``tags`` (any-match against the contact's JSONB tag list).
    """
    audience = audience or {}
    stmt = select(MessagingContact).where(MessagingContact.workspace_id == ws_id)

    chan = _norm_channel(channel or audience.get("channel"))
    stmt = stmt.where(MessagingContact.channel == chan)

    opt_in = audience.get("opt_in", True)
    if opt_in is not None:
        stmt = stmt.where(MessagingContact.opt_in.is_(bool(opt_in)))

    res = await db.execute(stmt.order_by(MessagingContact.created_at.desc()))
    rows = list(res.scalars().all())

    wanted: list[str] = []
    if isinstance(audience.get("tags"), list):
        wanted = [str(t).lower() for t in audience["tags"] if t]
    elif audience.get("tag"):
        wanted = [str(audience["tag"]).lower()]
    if wanted:
        rows = [
            c
            for c in rows
            if isinstance(c.tags, list)
            and any(str(t).lower() in wanted for t in c.tags)
        ]
    return rows


# --------------------------------------------------------------------------- #
# Templates
# --------------------------------------------------------------------------- #
async def list_templates(db: AsyncSession, ws_id: uuid.UUID) -> list[MessageTemplate]:
    res = await db.execute(
        select(MessageTemplate)
        .where(MessageTemplate.workspace_id == ws_id)
        .order_by(MessageTemplate.created_at.desc())
    )
    return list(res.scalars().all())


async def get_template(
    db: AsyncSession, ws_id: uuid.UUID, template_id: uuid.UUID
) -> MessageTemplate | None:
    obj = await db.get(MessageTemplate, template_id)
    if obj is None or obj.workspace_id != ws_id:
        return None
    return obj


async def create_template(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    body: str,
    channel: str = "sms",
    category: str = "marketing",
    variables: list | None = None,
) -> MessageTemplate:
    chan = _norm_channel(channel)
    # WhatsApp marketing templates require BSP approval; SMS is usable at once.
    if chan == "whatsapp":
        status = "pending"
    else:
        status = "approved"
    obj = MessageTemplate(
        workspace_id=ws_id,
        name=name.strip(),
        body=body,
        channel=chan,
        category=category if category in ("marketing", "utility") else "marketing",
        status=status,
        variables=variables or _extract_vars(body),
    )
    db.add(obj)
    await db.flush()
    return obj


def _extract_vars(body: str) -> list[str]:
    """Pull ``{{var}}`` tokens out of a template body, de-duplicated, in order."""
    out: list[str] = []
    i = 0
    while True:
        start = body.find("{{", i)
        if start == -1:
            break
        end = body.find("}}", start + 2)
        if end == -1:
            break
        token = body[start + 2 : end].strip()
        if token and token not in out:
            out.append(token)
        i = end + 2
    return out


# --------------------------------------------------------------------------- #
# Broadcasts
# --------------------------------------------------------------------------- #
async def list_broadcasts(db: AsyncSession, ws_id: uuid.UUID) -> list[MessageBroadcast]:
    res = await db.execute(
        select(MessageBroadcast)
        .where(MessageBroadcast.workspace_id == ws_id)
        .order_by(MessageBroadcast.created_at.desc())
    )
    return list(res.scalars().all())


async def get_broadcast(
    db: AsyncSession, ws_id: uuid.UUID, broadcast_id: uuid.UUID
) -> MessageBroadcast | None:
    obj = await db.get(MessageBroadcast, broadcast_id)
    if obj is None or obj.workspace_id != ws_id:
        return None
    return obj


async def create_broadcast(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    channel: str = "sms",
    template_id: uuid.UUID | None = None,
    body: str | None = None,
    audience: dict | None = None,
    scheduled_at: datetime | None = None,
) -> MessageBroadcast:
    obj = MessageBroadcast(
        workspace_id=ws_id,
        name=name.strip(),
        channel=_norm_channel(channel),
        template_id=template_id,
        body=(body or None),
        audience=audience or {},
        status="scheduled" if scheduled_at else "draft",
        scheduled_at=scheduled_at,
        stats={"sent": 0, "delivered": 0, "read": 0, "failed": 0},
    )
    db.add(obj)
    await db.flush()
    return obj


async def broadcast_log_stats(
    db: AsyncSession, ws_id: uuid.UUID, broadcast_id: uuid.UUID
) -> dict[str, int]:
    """Live counters for a single broadcast, computed from its logs."""
    res = await db.execute(
        select(MessageLog.status, func.count())
        .where(
            MessageLog.workspace_id == ws_id,
            MessageLog.broadcast_id == broadcast_id,
        )
        .group_by(MessageLog.status)
    )
    counts = {s: 0 for s in ("queued", "sent", "delivered", "read", "failed")}
    for status_value, n in res.all():
        counts[status_value] = int(n)
    return counts


# --------------------------------------------------------------------------- #
# Overview / engagement analytics (all real, from logs)
# --------------------------------------------------------------------------- #
async def compute_overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    contacts_total = int(
        (
            await db.execute(
                select(func.count())
                .select_from(MessagingContact)
                .where(MessagingContact.workspace_id == ws_id)
            )
        ).scalar_one()
    )
    opted_in = int(
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
    templates_total = int(
        (
            await db.execute(
                select(func.count())
                .select_from(MessageTemplate)
                .where(MessageTemplate.workspace_id == ws_id)
            )
        ).scalar_one()
    )
    broadcasts_sent = int(
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

    # "sent" denominator includes everything that left the queue.
    attempted = (
        log_counts["sent"]
        + log_counts["delivered"]
        + log_counts["read"]
        + log_counts["failed"]
    )
    delivered = log_counts["delivered"] + log_counts["read"]
    read = log_counts["read"]
    delivery_rate = round(delivered / attempted, 4) if attempted else 0.0
    read_rate = round(read / delivered, 4) if delivered else 0.0
    fail_rate = round(log_counts["failed"] / attempted, 4) if attempted else 0.0

    by_channel: dict[str, int] = {}
    res = await db.execute(
        select(MessagingContact.channel, func.count())
        .where(MessagingContact.workspace_id == ws_id)
        .group_by(MessagingContact.channel)
    )
    for chan, n in res.all():
        by_channel[chan] = int(n)

    return {
        "contacts": contacts_total,
        "opted_in": opted_in,
        "templates": templates_total,
        "broadcasts_sent": broadcasts_sent,
        "messages_attempted": attempted,
        "delivered": delivered,
        "read": read,
        "failed": log_counts["failed"],
        "queued": log_counts["queued"],
        "delivery_rate": delivery_rate,
        "read_rate": read_rate,
        "fail_rate": fail_rate,
        "contacts_by_channel": by_channel,
    }


async def list_logs(
    db: AsyncSession, ws_id: uuid.UUID, *, limit: int = 100
) -> list[MessageLog]:
    """Return the most recent message log rows for a workspace."""
    res = await db.execute(
        select(MessageLog)
        .where(MessageLog.workspace_id == ws_id)
        .order_by(MessageLog.created_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


async def get_contact_by_phone(
    db: AsyncSession, ws_id: uuid.UUID, phone: str, channel: str
) -> MessagingContact | None:
    """Lookup a contact by phone + channel."""
    res = await db.execute(
        select(MessagingContact).where(
            MessagingContact.workspace_id == ws_id,
            MessagingContact.phone == phone.strip(),
            MessagingContact.channel == _norm_channel(channel),
        )
    )
    return res.scalar_one_or_none()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
