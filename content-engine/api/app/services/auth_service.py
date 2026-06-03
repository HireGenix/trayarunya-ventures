"""Auth service: signup (user + org + first workspace) and login."""
from __future__ import annotations

import re
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Membership,
    Organization,
    OrgType,
    Role,
    User,
    Workspace,
)
from app.schemas import LoginRequest, SignupRequest
from app.security import create_access_token, hash_password, verify_password


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or uuid.uuid4().hex[:8]


async def _unique_org_slug(db: AsyncSession, base: str) -> str:
    slug = slugify(base)
    candidate = slug
    i = 1
    while True:
        res = await db.execute(select(Organization).where(Organization.slug == candidate))
        if res.scalar_one_or_none() is None:
            return candidate
        i += 1
        candidate = f"{slug}-{i}"


async def signup(db: AsyncSession, data: SignupRequest) -> tuple[User, str]:
    res = await db.execute(select(User).where(User.email == data.email.lower()))
    if res.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        email=data.email.lower(),
        full_name=data.full_name,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.flush()

    try:
        org_type = OrgType(data.org_type)
    except ValueError:
        org_type = OrgType.company

    org = Organization(
        name=data.org_name,
        slug=await _unique_org_slug(db, data.org_name),
        org_type=org_type,
    )
    db.add(org)
    await db.flush()

    workspace = Workspace(
        organization_id=org.id,
        name=data.org_name,
        slug="default",
    )
    db.add(workspace)
    await db.flush()

    membership = Membership(
        user_id=user.id,
        organization_id=org.id,
        workspace_id=workspace.id,
        role=Role.owner,
    )
    db.add(membership)
    await db.flush()

    token = create_access_token(str(user.id), extra={"email": user.email})
    return user, token


async def login(db: AsyncSession, data: LoginRequest) -> tuple[User, str]:
    res = await db.execute(select(User).where(User.email == data.email.lower()))
    user = res.scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")
    token = create_access_token(str(user.id), extra={"email": user.email})
    return user, token
