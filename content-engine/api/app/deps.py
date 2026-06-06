"""FastAPI dependencies: current user, workspace scoping, role guards."""
from __future__ import annotations

import uuid

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Membership, Role, User, Workspace
from app.models.portal_client import ClientPortalMember, PortalRole
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    # Portal (client) tokens must never authenticate against agency endpoints.
    if payload.get("scope") == "portal":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Client portal token cannot access this resource")
    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token subject")
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


class WorkspaceContext:
    """Resolved current workspace + the caller's role within it."""

    def __init__(self, workspace: Workspace, role: Role, user: User):
        self.workspace = workspace
        self.role = role
        self.user = user


async def get_workspace_ctx(
    x_workspace_id: str | None = Header(default=None, alias="X-Workspace-Id"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceContext:
    if not x_workspace_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Missing X-Workspace-Id header"
        )
    try:
        ws_id = uuid.UUID(x_workspace_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid workspace id")

    workspace = await db.get(Workspace, ws_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")

    # Caller must be a member of the workspace's organization.
    res = await db.execute(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.organization_id == workspace.organization_id,
        )
    )
    membership = res.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No access to this workspace")

    return WorkspaceContext(workspace=workspace, role=membership.role, user=user)


def require_role(*allowed: Role):
    """Guard factory: ensure the caller's workspace role is in ``allowed``."""

    async def _guard(ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> WorkspaceContext:
        if ctx.role not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires one of roles: {', '.join(r.value for r in allowed)}",
            )
        return ctx

    return _guard


async def require_superuser(user: User = Depends(get_current_user)) -> User:
    """Guard: only a platform superadmin (``is_superuser``) may proceed.

    Used for platform-wide settings such as the model registry, which are not
    scoped to any workspace.
    """
    if not user.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Requires superadmin")
    return user


# --------------------------------------------------------------------------- #
# Client portal context
# --------------------------------------------------------------------------- #
class PortalContext:
    """Resolved portal session: the client user, their workspace and portal role."""

    def __init__(self, user: User, workspace: Workspace, member: ClientPortalMember):
        self.user = user
        self.workspace = workspace
        self.member = member
        self.role = member.role


async def get_portal_ctx(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> PortalContext:
    """Authenticate a client-portal user.

    Portal tokens carry ``scope="portal"`` and a ``wsid`` claim. Access is granted
    only if an active :class:`ClientPortalMember` row links the user to that
    workspace — completely independent of agency memberships.
    """
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(creds.credentials)
    if not payload or payload.get("scope") != "portal":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid portal session")
    try:
        user_id = uuid.UUID(str(payload.get("sub")))
        ws_id = uuid.UUID(str(payload.get("wsid")))
    except (ValueError, TypeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed portal token")

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    res = await db.execute(
        select(ClientPortalMember).where(
            ClientPortalMember.user_id == user_id,
            ClientPortalMember.workspace_id == ws_id,
            ClientPortalMember.is_active.is_(True),
        )
    )
    member = res.scalar_one_or_none()
    if member is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Portal access revoked")

    workspace = await db.get(Workspace, ws_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")

    return PortalContext(user=user, workspace=workspace, member=member)


def require_portal_role(*allowed: PortalRole):
    """Guard factory: ensure the portal caller's role is in ``allowed``."""

    async def _guard(ctx: PortalContext = Depends(get_portal_ctx)) -> PortalContext:
        if ctx.role not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires portal role: {', '.join(r.value for r in allowed)}",
            )
        return ctx

    return _guard
