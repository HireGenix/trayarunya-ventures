"""Client portal API.

Two audiences share this router:

* **Agency** (authenticated as a workspace member via ``get_workspace_ctx``)
  manages client invites and members — endpoints under ``/portal/invites`` and
  ``/portal/members``.
* **Clients** (authenticated with a portal-scoped JWT via ``get_portal_ctx``)
  consume a restricted, branded surface — overview, attribution, reports and
  content approvals — under ``/portal/overview``, ``/portal/reports`` etc.

Everything a client sees is computed from real workspace data; nothing is
fabricated. Clients can never reach agency endpoints because they hold no
:class:`~app.models.tenant.Membership` and their token is rejected by
``get_current_user``.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import (
    PortalContext,
    WorkspaceContext,
    get_portal_ctx,
    get_workspace_ctx,
    require_role,
)
from app.models import (
    Approval,
    AuditLog,
    ContentItem,
    ContentStatus,
    Report,
    Role,
    User,
    Workspace,
)
from app.models.attribution import RevenueEvent
from app.models.portal_client import (
    ClientPortalInvite,
    ClientPortalMember,
    InviteStatus,
    PortalRole,
)
from app.security import create_portal_token, hash_password, verify_password
from app.services.attribution import compute_attribution

router = APIRouter(prefix="/portal", tags=["portal"])

INVITE_TTL_DAYS = 14


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _actor_name(user: User) -> str | None:
    return getattr(user, "full_name", None) or getattr(user, "email", None)


# --------------------------------------------------------------------------- #
# Schemas — agency side
# --------------------------------------------------------------------------- #
class InviteCreate(BaseModel):
    email: EmailStr
    role: PortalRole = PortalRole.viewer


class InviteOut(BaseModel):
    id: uuid.UUID
    email: str
    role: PortalRole
    status: InviteStatus
    invited_by_name: str | None = None
    expires_at: datetime
    accepted_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteCreated(BaseModel):
    invite: InviteOut
    # Raw token + ready-to-share accept path. Shown ONCE — never retrievable again.
    token: str
    accept_path: str


class MemberOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    full_name: str
    role: PortalRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
# Schemas — client side
# --------------------------------------------------------------------------- #
class AcceptRequest(BaseModel):
    token: str
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    workspace_id: uuid.UUID | None = None


class PortalWorkspace(BaseModel):
    workspace_id: uuid.UUID
    workspace_name: str
    role: PortalRole


class PortalSession(BaseModel):
    access_token: str
    workspace_id: uuid.UUID
    workspace_name: str
    role: PortalRole
    full_name: str
    email: str
    workspaces: list[PortalWorkspace]


class InvitePreview(BaseModel):
    email: str
    role: PortalRole
    workspace_name: str
    agency_name: str | None = None
    valid: bool


class ApprovalDecision(BaseModel):
    decision: str  # approved | changes_requested
    note: str | None = None


# --------------------------------------------------------------------------- #
# Agency: invite management
# --------------------------------------------------------------------------- #
@router.post("/invites", response_model=InviteCreated, status_code=status.HTTP_201_CREATED)
async def create_invite(
    payload: InviteCreate,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> InviteCreated:
    email = payload.email.lower()

    # Already an active member of this workspace?
    existing_member = (
        await db.execute(
            select(ClientPortalMember)
            .join(User, User.id == ClientPortalMember.user_id)
            .where(
                ClientPortalMember.workspace_id == ctx.workspace.id,
                func.lower(User.email) == email,
                ClientPortalMember.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if existing_member is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This client already has portal access")

    # Reuse a pending invite for the same email if present.
    pending = (
        await db.execute(
            select(ClientPortalInvite).where(
                ClientPortalInvite.workspace_id == ctx.workspace.id,
                func.lower(ClientPortalInvite.email) == email,
                ClientPortalInvite.status == InviteStatus.pending,
            )
        )
    ).scalar_one_or_none()

    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = _now() + timedelta(days=INVITE_TTL_DAYS)

    if pending is not None:
        pending.token_hash = token_hash
        pending.role = payload.role
        pending.expires_at = expires_at
        pending.invited_by = ctx.user.id
        pending.invited_by_name = _actor_name(ctx.user)
        invite = pending
    else:
        invite = ClientPortalInvite(
            workspace_id=ctx.workspace.id,
            email=email,
            role=payload.role,
            token_hash=token_hash,
            status=InviteStatus.pending,
            invited_by=ctx.user.id,
            invited_by_name=_actor_name(ctx.user),
            expires_at=expires_at,
        )
        db.add(invite)

    await db.flush()
    await db.refresh(invite)
    return InviteCreated(
        invite=InviteOut.model_validate(invite),
        token=raw_token,
        accept_path=f"/portal/accept/{raw_token}",
    )


@router.get("/invites", response_model=list[InviteOut])
async def list_invites(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[InviteOut]:
    rows = (
        await db.execute(
            select(ClientPortalInvite)
            .where(ClientPortalInvite.workspace_id == ctx.workspace.id)
            .order_by(ClientPortalInvite.created_at.desc())
        )
    ).scalars().all()
    return [InviteOut.model_validate(r) for r in rows]


@router.post("/invites/{invite_id}/revoke", response_model=InviteOut)
async def revoke_invite(
    invite_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> InviteOut:
    invite = await db.get(ClientPortalInvite, invite_id)
    if invite is None or invite.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invite not found")
    if invite.status == InviteStatus.pending:
        invite.status = InviteStatus.revoked
    await db.flush()
    await db.refresh(invite)
    return InviteOut.model_validate(invite)


# --------------------------------------------------------------------------- #
# Agency: member management
# --------------------------------------------------------------------------- #
@router.get("/members", response_model=list[MemberOut])
async def list_members(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[MemberOut]:
    rows = (
        await db.execute(
            select(ClientPortalMember, User)
            .join(User, User.id == ClientPortalMember.user_id)
            .where(ClientPortalMember.workspace_id == ctx.workspace.id)
            .order_by(ClientPortalMember.created_at.desc())
        )
    ).all()
    return [
        MemberOut(
            id=m.id,
            user_id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=m.role,
            is_active=m.is_active,
            created_at=m.created_at,
        )
        for m, u in rows
    ]


@router.post("/members/{member_id}/revoke", response_model=MemberOut)
async def revoke_member(
    member_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> MemberOut:
    member = await db.get(ClientPortalMember, member_id)
    if member is None or member.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    member.is_active = False
    await db.flush()
    user = await db.get(User, member.user_id)
    return MemberOut(
        id=member.id,
        user_id=member.user_id,
        email=user.email if user else "",
        full_name=user.full_name if user else "",
        role=member.role,
        is_active=member.is_active,
        created_at=member.created_at,
    )


@router.post("/members/{member_id}/restore", response_model=MemberOut)
async def restore_member(
    member_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> MemberOut:
    member = await db.get(ClientPortalMember, member_id)
    if member is None or member.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    member.is_active = True
    await db.flush()
    user = await db.get(User, member.user_id)
    return MemberOut(
        id=member.id,
        user_id=member.user_id,
        email=user.email if user else "",
        full_name=user.full_name if user else "",
        role=member.role,
        is_active=member.is_active,
        created_at=member.created_at,
    )


# --------------------------------------------------------------------------- #
# Public: invite preview + accept (no auth)
# --------------------------------------------------------------------------- #
async def _resolve_invite(db: AsyncSession, raw_token: str) -> ClientPortalInvite:
    invite = (
        await db.execute(
            select(ClientPortalInvite).where(
                ClientPortalInvite.token_hash == _hash_token(raw_token)
            )
        )
    ).scalar_one_or_none()
    if invite is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invite not found")
    return invite


def _invite_usable(invite: ClientPortalInvite) -> None:
    if invite.status == InviteStatus.revoked:
        raise HTTPException(status.HTTP_410_GONE, "This invite has been revoked")
    if invite.status == InviteStatus.accepted:
        raise HTTPException(status.HTTP_409_CONFLICT, "This invite was already used")
    if _now() > _aware(invite.expires_at):
        raise HTTPException(status.HTTP_410_GONE, "This invite has expired")


@router.get("/invites/preview/{raw_token}", response_model=InvitePreview)
async def preview_invite(
    raw_token: str,
    db: AsyncSession = Depends(get_db),
) -> InvitePreview:
    invite = await _resolve_invite(db, raw_token)
    ws = await db.get(Workspace, invite.workspace_id)
    valid = (
        invite.status == InviteStatus.pending
        and _now() <= _aware(invite.expires_at)
    )
    return InvitePreview(
        email=invite.email,
        role=invite.role,
        workspace_name=ws.name if ws else "Workspace",
        agency_name=invite.invited_by_name,
        valid=valid,
    )


async def _portal_workspaces(db: AsyncSession, user_id: uuid.UUID) -> list[PortalWorkspace]:
    rows = (
        await db.execute(
            select(ClientPortalMember, Workspace)
            .join(Workspace, Workspace.id == ClientPortalMember.workspace_id)
            .where(
                ClientPortalMember.user_id == user_id,
                ClientPortalMember.is_active.is_(True),
            )
        )
    ).all()
    return [
        PortalWorkspace(workspace_id=m.workspace_id, workspace_name=w.name, role=m.role)
        for m, w in rows
    ]


def _session(
    user: User, ws: Workspace, role: PortalRole, workspaces: list[PortalWorkspace]
) -> PortalSession:
    token = create_portal_token(str(user.id), str(ws.id))
    return PortalSession(
        access_token=token,
        workspace_id=ws.id,
        workspace_name=ws.name,
        role=role,
        full_name=user.full_name,
        email=user.email,
        workspaces=workspaces,
    )


@router.post("/accept", response_model=PortalSession)
async def accept_invite(
    payload: AcceptRequest,
    db: AsyncSession = Depends(get_db),
) -> PortalSession:
    invite = await _resolve_invite(db, payload.token)
    _invite_usable(invite)

    ws = await db.get(Workspace, invite.workspace_id)
    if ws is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace no longer exists")

    email = invite.email.lower()
    user = (
        await db.execute(select(User).where(func.lower(User.email) == email))
    ).scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        await db.flush()
    else:
        # Existing identity: the password must match so we never silently reset it.
        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "An account already exists for this email. Enter your existing password to link it.",
            )

    member = (
        await db.execute(
            select(ClientPortalMember).where(
                ClientPortalMember.workspace_id == ws.id,
                ClientPortalMember.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if member is None:
        member = ClientPortalMember(
            workspace_id=ws.id,
            user_id=user.id,
            role=invite.role,
            is_active=True,
            invited_by=invite.invited_by,
        )
        db.add(member)
    else:
        member.role = invite.role
        member.is_active = True

    invite.status = InviteStatus.accepted
    invite.accepted_at = _now()
    invite.accepted_user_id = user.id

    db.add(
        AuditLog(
            workspace_id=ws.id,
            actor_id=user.id,
            actor_name=_actor_name(user),
            action="portal.invite.accepted",
            entity_type="portal",
            entity_id=member.id if member.id else None,
            meta={"email": email, "role": invite.role.value},
        )
    )
    await db.flush()

    workspaces = await _portal_workspaces(db, user.id)
    return _session(user, ws, invite.role, workspaces)


@router.post("/login", response_model=PortalSession)
async def portal_login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> PortalSession:
    user = (
        await db.execute(
            select(User).where(func.lower(User.email) == payload.email.lower())
        )
    ).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    workspaces = await _portal_workspaces(db, user.id)
    if not workspaces:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No client portal access")

    chosen = None
    if payload.workspace_id is not None:
        chosen = next(
            (w for w in workspaces if w.workspace_id == payload.workspace_id), None
        )
        if chosen is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No access to that workspace")
    else:
        chosen = workspaces[0]

    ws = await db.get(Workspace, chosen.workspace_id)
    return _session(user, ws, chosen.role, workspaces)


@router.post("/switch/{workspace_id}", response_model=PortalSession)
async def portal_switch(
    workspace_id: uuid.UUID,
    ctx: PortalContext = Depends(get_portal_ctx),
    db: AsyncSession = Depends(get_db),
) -> PortalSession:
    workspaces = await _portal_workspaces(db, ctx.user.id)
    target = next((w for w in workspaces if w.workspace_id == workspace_id), None)
    if target is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No access to that workspace")
    ws = await db.get(Workspace, workspace_id)
    return _session(ctx.user, ws, target.role, workspaces)


# --------------------------------------------------------------------------- #
# Client: identity
# --------------------------------------------------------------------------- #
@router.get("/me", response_model=PortalSession)
async def portal_me(
    ctx: PortalContext = Depends(get_portal_ctx),
    db: AsyncSession = Depends(get_db),
) -> PortalSession:
    workspaces = await _portal_workspaces(db, ctx.user.id)
    # Re-issue a fresh token so the session keeps sliding on activity.
    return _session(ctx.user, ctx.workspace, ctx.role, workspaces)


# --------------------------------------------------------------------------- #
# Client: overview / attribution / reports
# --------------------------------------------------------------------------- #
async def _attribution_for(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    rows = (
        await db.execute(
            select(RevenueEvent).where(RevenueEvent.workspace_id == ws_id)
        )
    ).scalars().all()
    return compute_attribution(list(rows))


async def _content_status_counts(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, int]:
    rows = (
        await db.execute(
            select(ContentItem.status, func.count())
            .where(ContentItem.workspace_id == ws_id)
            .group_by(ContentItem.status)
        )
    ).all()
    counts: dict[str, int] = {s.value: 0 for s in ContentStatus}
    for st, n in rows:
        key = st.value if hasattr(st, "value") else str(st)
        counts[key] = int(n)
    return counts


@router.get("/overview")
async def portal_overview(
    ctx: PortalContext = Depends(get_portal_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    ws_id = ctx.workspace.id
    attribution = await _attribution_for(db, ws_id)
    content_counts = await _content_status_counts(db, ws_id)

    reports_count = (
        await db.execute(
            select(func.count()).select_from(Report).where(Report.workspace_id == ws_id)
        )
    ).scalar_one()

    pending_approvals = content_counts.get(ContentStatus.in_review.value, 0)

    return {
        "workspace": {"id": str(ws_id), "name": ctx.workspace.name},
        "role": ctx.role.value,
        "totals": attribution["totals"],
        "top_channels": attribution["channels"][:5],
        "funnel": attribution["funnel"],
        "content_counts": content_counts,
        "reports_count": int(reports_count),
        "pending_approvals": int(pending_approvals),
        "published_count": content_counts.get(ContentStatus.published.value, 0),
    }


@router.get("/attribution")
async def portal_attribution(
    ctx: PortalContext = Depends(get_portal_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await _attribution_for(db, ctx.workspace.id)


@router.get("/reports")
async def portal_reports(
    ctx: PortalContext = Depends(get_portal_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(Report)
            .where(Report.workspace_id == ctx.workspace.id)
            .order_by(Report.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "id": str(r.id),
            "token": r.token,
            "title": r.title,
            "client_name": r.client_name,
            "date_from": str(r.date_from) if r.date_from else None,
            "date_to": str(r.date_to) if r.date_to else None,
            "views": r.views,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


# --------------------------------------------------------------------------- #
# Client: content approvals
# --------------------------------------------------------------------------- #
@router.get("/approvals")
async def portal_approvals(
    ctx: PortalContext = Depends(get_portal_ctx),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[dict[str, Any]]:
    items = (
        await db.execute(
            select(ContentItem)
            .where(
                ContentItem.workspace_id == ctx.workspace.id,
                ContentItem.status == ContentStatus.in_review,
            )
            .order_by(ContentItem.updated_at.desc())
            .limit(limit)
        )
    ).scalars().all()

    out: list[dict[str, Any]] = []
    for item in items:
        latest = (
            await db.execute(
                select(Approval)
                .where(
                    Approval.workspace_id == ctx.workspace.id,
                    Approval.entity_type == "content",
                    Approval.entity_id == item.id,
                )
                .order_by(Approval.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        out.append(
            {
                "id": str(item.id),
                "title": item.title,
                "body": item.body,
                "content_type": item.content_type.value
                if hasattr(item.content_type, "value")
                else str(item.content_type),
                "platform": item.platform,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
                "latest_decision": latest.status if latest else None,
                "latest_note": latest.note if latest else None,
            }
        )
    return out


@router.post("/approvals/{content_item_id}")
async def portal_decide(
    content_item_id: uuid.UUID,
    payload: ApprovalDecision,
    ctx: PortalContext = Depends(get_portal_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if ctx.role != PortalRole.approver:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Your portal role cannot approve content"
        )
    decision = payload.decision.strip()
    if decision not in {"approved", "changes_requested"}:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "decision must be 'approved' or 'changes_requested'",
        )

    item = await db.get(ContentItem, content_item_id)
    if item is None or item.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Content item not found")

    approval = Approval(
        workspace_id=ctx.workspace.id,
        entity_type="content",
        entity_id=item.id,
        status=decision,
        reviewer_id=ctx.user.id,
        reviewer_name=_actor_name(ctx.user),
        note=payload.note,
    )
    db.add(approval)

    # Reflect the client's decision on the content lifecycle.
    if decision == "approved":
        item.status = ContentStatus.approved
    else:
        item.status = ContentStatus.draft  # send back to the team for revision

    db.add(
        AuditLog(
            workspace_id=ctx.workspace.id,
            actor_id=ctx.user.id,
            actor_name=_actor_name(ctx.user),
            action="portal.content.decision",
            entity_type="content",
            entity_id=item.id,
            meta={"decision": decision, "note": payload.note},
        )
    )
    await db.flush()
    await db.refresh(approval)
    try:
        from app.services.automation import emit_event
        event_type = "content.approved" if decision == "approved" else "content.changes_requested"
        await emit_event(
            db, ctx.workspace.id, event_type,
            {
                "title": item.title or "",
                "platform": getattr(item.content_type, "value", str(item.content_type)),
                "reviewer": _actor_name(ctx.user),
                "note": payload.note or "",
            },
            source="portal",
        )
    except Exception:  # noqa: BLE001 — automation must never break the approval
        pass
    return {
        "content_item_id": str(item.id),
        "decision": decision,
        "status": item.status.value,
        "approval_id": str(approval.id),
    }
