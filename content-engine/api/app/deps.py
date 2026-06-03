"""FastAPI dependencies: current user, workspace scoping, role guards."""
from __future__ import annotations

import uuid

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Membership, Role, User, Workspace
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
