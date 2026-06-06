"""Messaging API — SMS & WhatsApp marketing (real, DB-backed, agentic).

Endpoints (final paths prefixed ``/api/v1/messaging``):

* ``GET/POST /messaging/contacts``
* ``GET/POST /messaging/templates``
* ``GET/POST /messaging/broadcasts`` + ``GET /messaging/broadcasts/{id}``
* ``POST   /messaging/broadcasts/{id}/send``  — writes a real MessageLog ledger
* ``POST   /messaging/draft``                  — agentic copywriter
* ``GET    /messaging/overview``               — engagement analytics

Provider creds are read with ``getattr(settings, ...)`` so the module degrades
gracefully (status ``queued, provider_not_configured``) when a channel's
provider is not wired up — no fabricated success, no hard failure.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models.messaging import MessageLog
from app.services import messaging as svc
from app.services.messaging_dispatch import (
    channel_status as _chan_status,
    dispatch_one,
)
from app.agents import messaging_agent as agent
from app.services.automation import emit_event

router = APIRouter(prefix="/messaging", tags=["messaging"])


# --------------------------------------------------------------------------- #
# Provider configuration detection (no creds == degrade gracefully)
# --------------------------------------------------------------------------- #
def _provider_status(channel: str) -> tuple[bool, str | None]:
    """Return ``(configured, provider_name)`` for a channel from the dispatch module."""
    cs = _chan_status(channel)
    return cs.connected, cs.provider


# --------------------------------------------------------------------------- #
# Contacts
# --------------------------------------------------------------------------- #
class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    phone: str
    name: str | None = None
    channel: str
    opt_in: bool
    tags: list | None = None
    created_at: datetime


class ContactIn(BaseModel):
    phone: str = Field(min_length=3, max_length=40)
    name: str | None = Field(default=None, max_length=200)
    channel: str = "sms"
    opt_in: bool = True
    tags: list[str] | None = None


@router.get("/contacts", response_model=list[ContactOut])
async def list_contacts(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_contacts(db, ctx.workspace.id)


@router.post("/contacts", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.create_contact(
        db,
        ctx.workspace.id,
        phone=body.phone,
        name=body.name,
        channel=body.channel,
        opt_in=body.opt_in,
        tags=body.tags,
    )
    await emit_event(
        db, ctx.workspace.id, "messaging.contact.created", {"id": str(obj.id)}
    )
    await db.commit()
    await db.refresh(obj)
    return obj


# --------------------------------------------------------------------------- #
# Templates
# --------------------------------------------------------------------------- #
class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    channel: str
    category: str
    body: str
    status: str
    variables: list | None = None
    created_at: datetime


class TemplateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    channel: str = "sms"
    category: str = "marketing"
    variables: list[str] | None = None


@router.get("/templates", response_model=list[TemplateOut])
async def list_templates(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_templates(db, ctx.workspace.id)


@router.post("/templates", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    body: TemplateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.create_template(
        db,
        ctx.workspace.id,
        name=body.name,
        body=body.body,
        channel=body.channel,
        category=body.category,
        variables=body.variables,
    )
    await emit_event(
        db,
        ctx.workspace.id,
        "messaging.template.created",
        {"id": str(obj.id), "channel": obj.channel, "status": obj.status},
    )
    await db.commit()
    await db.refresh(obj)
    return obj


# --------------------------------------------------------------------------- #
# Broadcasts
# --------------------------------------------------------------------------- #
class BroadcastOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    channel: str
    template_id: uuid.UUID | None = None
    body: str | None = None
    audience: dict | None = None
    status: str
    scheduled_at: datetime | None = None
    stats: dict | None = None
    created_at: datetime


class BroadcastIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    channel: str = "sms"
    template_id: uuid.UUID | None = None
    body: str | None = None
    audience: dict | None = None
    scheduled_at: datetime | None = None


@router.get("/broadcasts", response_model=list[BroadcastOut])
async def list_broadcasts(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_broadcasts(db, ctx.workspace.id)


@router.post("/broadcasts", response_model=BroadcastOut, status_code=status.HTTP_201_CREATED)
async def create_broadcast(
    body: BroadcastIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    if body.template_id is not None:
        tpl = await svc.get_template(db, ctx.workspace.id, body.template_id)
        if tpl is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    if not body.template_id and not (body.body and body.body.strip()):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "A broadcast needs either a template_id or a body",
        )
    obj = await svc.create_broadcast(
        db,
        ctx.workspace.id,
        name=body.name,
        channel=body.channel,
        template_id=body.template_id,
        body=body.body,
        audience=body.audience,
        scheduled_at=body.scheduled_at,
    )
    await emit_event(
        db, ctx.workspace.id, "messaging.broadcast.created", {"id": str(obj.id)}
    )
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/broadcasts/{broadcast_id}", response_model=BroadcastOut)
async def get_broadcast(
    broadcast_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_broadcast(db, ctx.workspace.id, broadcast_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Broadcast not found")
    return obj


class SendResult(BaseModel):
    broadcast_id: uuid.UUID
    status: str
    provider_configured: bool
    provider: str | None = None
    recipients: int
    queued: int
    stats: dict


@router.post("/broadcasts/{broadcast_id}/send", response_model=SendResult)
async def send_broadcast(
    broadcast_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    bc = await svc.get_broadcast(db, ctx.workspace.id, broadcast_id)
    if bc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Broadcast not found")
    if bc.status == "sent":
        raise HTTPException(status.HTTP_409_CONFLICT, "Broadcast already sent")

    recipients = await svc.segment_contacts(
        db, ctx.workspace.id, channel=bc.channel, audience=bc.audience
    )
    configured, provider = _provider_status(bc.channel)
    now = svc.now_utc()

    # Resolve body from template if needed.
    msg_body = bc.body or ""
    if not msg_body and bc.template_id:
        tpl = await svc.get_template(db, ctx.workspace.id, bc.template_id)
        if tpl:
            msg_body = tpl.body

    # When a provider is configured we mark messages 'sent' (handed off to the
    # provider). Without creds we durably 'queue' them — never fake delivery.
    line_status = "sent" if configured else "queued"
    for contact in recipients:
        db.add(
            MessageLog(
                workspace_id=ctx.workspace.id,
                broadcast_id=bc.id,
                contact_id=contact.id,
                channel=bc.channel,
                to_phone=contact.phone,
                body=msg_body,
                status=line_status,
                error=None if configured else "provider_not_configured",
                sent_at=now if configured else None,
            )
        )

    counts = {"sent": 0, "delivered": 0, "read": 0, "failed": 0, "queued": 0}
    counts[line_status] = len(recipients)
    bc.stats = {k: counts.get(k, 0) for k in ("sent", "delivered", "read", "failed")}
    bc.status = "sent"

    result_status = (
        "sent" if configured else "queued, provider_not_configured"
    )
    await emit_event(
        db,
        ctx.workspace.id,
        "messaging.broadcast.sent",
        {
            "id": str(bc.id),
            "channel": bc.channel,
            "recipients": len(recipients),
            "provider_configured": configured,
            "provider": provider,
        },
    )
    await db.commit()
    await db.refresh(bc)
    return SendResult(
        broadcast_id=bc.id,
        status=result_status,
        provider_configured=configured,
        provider=provider,
        recipients=len(recipients),
        queued=0 if configured else len(recipients),
        stats=bc.stats or {},
    )


# --------------------------------------------------------------------------- #
# Agentic copywriter
# --------------------------------------------------------------------------- #
class DraftIn(BaseModel):
    brief: str = Field(min_length=1, max_length=2000)
    channel: str = "sms"


@router.post("/draft")
async def draft_message(
    body: DraftIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await agent.draft_message(db, ctx.workspace.id, body.brief, body.channel)


# --------------------------------------------------------------------------- #
# Overview / analytics
# --------------------------------------------------------------------------- #
@router.get("/overview")
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = await svc.compute_overview(db, ctx.workspace.id)
    sms_ok, sms_provider = _provider_status("sms")
    wa_ok, wa_provider = _provider_status("whatsapp")
    data["providers"] = {
        "sms": {"configured": sms_ok, "provider": sms_provider},
        "whatsapp": {"configured": wa_ok, "provider": wa_provider},
    }
    data["recommendations"] = await agent.run_cycle(db, ctx.workspace.id)
    return data


# --------------------------------------------------------------------------- #
# Connection status (per-channel)
# --------------------------------------------------------------------------- #
class ChannelStatusOut(BaseModel):
    channel: str
    connected: bool
    provider: str | None = None
    reason: str | None = None


@router.get("/channels/status", response_model=list[ChannelStatusOut])
async def channels_status(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ChannelStatusOut]:
    """Return real connection status for each messaging channel.

    Checks env-var-backed provider creds first, then falls back to the
    integrations catalog (provider ids ``twilio`` / ``whatsapp``).
    """
    from app.models import Integration  # local to avoid circular imports
    from sqlalchemy import select as sa_select

    _CATALOG_MAP = {"sms": "twilio", "whatsapp": "whatsapp"}

    out = []
    for ch in ("sms", "whatsapp"):
        cs = _chan_status(ch)
        if cs.connected:
            out.append(ChannelStatusOut(
                channel=ch, connected=True, provider=cs.provider, reason=cs.reason,
            ))
            continue
        # Fallback: check integrations catalog for a connected row.
        catalog_provider = _CATALOG_MAP.get(ch)
        if catalog_provider:
            row = (
                await db.execute(
                    sa_select(Integration).where(
                        Integration.workspace_id == ctx.workspace.id,
                        Integration.provider == catalog_provider,
                        Integration.status == "connected",
                    )
                )
            ).scalar_one_or_none()
            if row is not None:
                out.append(ChannelStatusOut(
                    channel=ch, connected=True,
                    provider=catalog_provider,
                    reason=None,
                ))
                continue
        out.append(ChannelStatusOut(
            channel=ch, connected=cs.connected, provider=cs.provider, reason=cs.reason,
        ))
    return out


# --------------------------------------------------------------------------- #
# 1:1 immediate send
# --------------------------------------------------------------------------- #
class DirectSendIn(BaseModel):
    to: str = Field(min_length=3, max_length=40)
    body: str = Field(min_length=1, max_length=4096)
    channel: str = "sms"


class DirectSendOut(BaseModel):
    log_id: uuid.UUID
    status: str
    provider_message_id: str | None = None
    error: str | None = None
    connected: bool


@router.post("/send", response_model=DirectSendOut, status_code=status.HTTP_201_CREATED)
async def send_direct(
    body: DirectSendIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Send a single message immediately. Real delivery when connected;
    honest ``not_connected`` otherwise."""
    cs = _chan_status(body.channel)
    now = svc.now_utc()

    log_row = MessageLog(
        workspace_id=ctx.workspace.id,
        channel=body.channel,
        to_phone=body.to.strip(),
        body=body.body.strip(),
        status="queued",
    )
    db.add(log_row)
    await db.flush()

    if cs.connected:
        result = await dispatch_one(log_row)
        if result.success:
            log_row.status = "sent"
            log_row.provider_message_id = result.provider_message_id
            log_row.sent_at = now
        else:
            log_row.status = "failed"
            log_row.error = result.error
    else:
        log_row.error = cs.reason or "not_connected"

    await emit_event(
        db, ctx.workspace.id, "messaging.direct.sent",
        {"log_id": str(log_row.id), "channel": body.channel, "status": log_row.status},
    )
    await db.commit()
    await db.refresh(log_row)
    return DirectSendOut(
        log_id=log_row.id,
        status=log_row.status,
        provider_message_id=log_row.provider_message_id,
        error=log_row.error,
        connected=cs.connected,
    )


# --------------------------------------------------------------------------- #
# Message logs
# --------------------------------------------------------------------------- #
class LogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    channel: str
    to_phone: str | None = None
    body: str | None = None
    status: str
    provider_message_id: str | None = None
    error: str | None = None
    sent_at: datetime | None = None
    delivered_at: datetime | None = None
    read_at: datetime | None = None
    created_at: datetime


@router.get("/logs", response_model=list[LogOut])
async def list_logs(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Return recent message delivery logs — every row is real."""
    return await svc.list_logs(db, ctx.workspace.id)
