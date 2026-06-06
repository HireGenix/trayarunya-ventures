"""Platform admin service (superuser): users, organizations, and plans.

All logic here is reachable only through :func:`app.deps.require_superuser`-guarded
routes. It manages the global identity/billing surface: listing every registered
user, provisioning accounts, assigning/terminating plans, capping agency clients,
and CRUD over the plan catalogue (including custom plans).
"""
from __future__ import annotations

import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import (
    Membership,
    Organization,
    OrgType,
    Plan,
    Role,
    User,
    Workspace,
)
from app.schemas import (
    AdminOrgOut,
    AdminOrgUpdate,
    AdminPlanCreate,
    AdminPlanUpdate,
    AdminUserCreate,
    AdminUserOut,
    AdminUserUpdate,
)
from app.security import hash_password
from app.services import stripe_billing
from app.services.auth_service import _unique_org_slug

DEFAULT_PLAN_CODE = "free"

log = logging.getLogger("admin_service")


# --------------------------------------------------------------------------- #
# Superadmin bootstrap (called on startup when SUPERADMIN_EMAIL is set)
# --------------------------------------------------------------------------- #
async def ensure_superadmin(db: AsyncSession) -> None:
    """Guarantee a platform superadmin exists, driven entirely by env config.

    - If a user with ``superadmin_email`` exists, promote it to superadmin.
    - Otherwise, when ``superadmin_password`` is also set, create the account
      with a personal org + workspace so it can log in immediately.
    This is the only path that mints a superadmin, so customers cannot self-elevate.
    """
    email = (settings.superadmin_email or "").strip().lower()
    if not email:
        return

    existing = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()

    if existing is not None:
        if not existing.is_superuser or not existing.is_active:
            existing.is_superuser = True
            existing.is_active = True
            await db.commit()
        return

    if not settings.superadmin_password:
        # Cannot create without a password; nothing more to do.
        return

    user = User(
        email=email,
        full_name=settings.superadmin_name or "Platform Admin",
        password_hash=hash_password(settings.superadmin_password),
        is_superuser=True,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    org = Organization(
        name=settings.superadmin_name or "Platform Admin",
        slug=await _unique_org_slug(db, "platform-admin"),
        org_type=OrgType.company,
        plan=DEFAULT_PLAN_CODE,
    )
    db.add(org)
    await db.flush()

    ws = Workspace(organization_id=org.id, name=org.name, slug="default")
    db.add(ws)
    await db.flush()

    db.add(
        Membership(
            user_id=user.id,
            organization_id=org.id,
            workspace_id=ws.id,
            role=Role.owner,
        )
    )
    await db.commit()


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
async def _org_out(db: AsyncSession, org: Organization) -> AdminOrgOut:
    ws_count = (
        await db.execute(
            select(func.count(Workspace.id)).where(
                Workspace.organization_id == org.id
            )
        )
    ).scalar() or 0
    return AdminOrgOut(
        id=org.id,
        name=org.name,
        slug=org.slug,
        org_type=org.org_type.value if hasattr(org.org_type, "value") else str(org.org_type),
        plan=org.plan,
        client_limit=org.client_limit,
        workspace_count=int(ws_count),
        has_subscription=bool(org.stripe_subscription_id),
    )


async def _primary_membership(db: AsyncSession, user_id: uuid.UUID) -> Membership | None:
    """Pick the user's primary membership: prefer owner, else most recent."""
    rows = (
        await db.execute(
            select(Membership).where(Membership.user_id == user_id)
        )
    ).scalars().all()
    if not rows:
        return None
    owners = [m for m in rows if m.role == Role.owner]
    return owners[0] if owners else rows[0]


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
async def list_users(db: AsyncSession) -> list[AdminUserOut]:
    users = (
        await db.execute(select(User).order_by(User.created_at.desc()))
    ).scalars().all()

    out: list[AdminUserOut] = []
    for u in users:
        membership = await _primary_membership(db, u.id)
        org_out: AdminOrgOut | None = None
        role: str | None = None
        if membership is not None:
            role = membership.role.value if hasattr(membership.role, "value") else str(membership.role)
            org = await db.get(Organization, membership.organization_id)
            if org is not None:
                org_out = await _org_out(db, org)
        out.append(
            AdminUserOut(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_active=u.is_active,
                is_superuser=u.is_superuser,
                role=role,
                created_at=u.created_at,
                org=org_out,
            )
        )
    return out


async def create_user(db: AsyncSession, data: AdminUserCreate) -> AdminUserOut:
    email = data.email.lower()
    existing = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    # Validate plan code exists.
    plan = (
        await db.execute(select(Plan).where(Plan.code == data.plan_code))
    ).scalar_one_or_none()
    if plan is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown plan '{data.plan_code}'")

    try:
        org_type = OrgType(data.org_type)
    except ValueError:
        org_type = OrgType.company

    user = User(
        email=email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        is_superuser=data.is_superuser,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    org = Organization(
        name=data.org_name,
        slug=await _unique_org_slug(db, data.org_name),
        org_type=org_type,
        plan=data.plan_code,
        client_limit=data.client_limit,
    )
    db.add(org)
    await db.flush()

    ws = Workspace(organization_id=org.id, name=data.org_name, slug="default")
    db.add(ws)
    await db.flush()

    db.add(
        Membership(
            user_id=user.id,
            organization_id=org.id,
            workspace_id=ws.id,
            role=Role.owner,
        )
    )
    await db.commit()
    await db.refresh(user)

    membership = await _primary_membership(db, user.id)
    role = membership.role.value if membership else None

    # Best-effort welcome email (never blocks user creation).
    try:
        from app.services.emails import send_welcome_email

        await send_welcome_email(
            to=user.email,
            full_name=user.full_name,
            org_name=org.name,
            plan_name=plan.name,
            temp_password=data.password,
        )
    except Exception:  # noqa: BLE001
        log.exception("welcome email failed for %s", user.email)

    return AdminUserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        role=role,
        created_at=user.created_at,
        org=await _org_out(db, org),
    )


async def update_user(
    db: AsyncSession, user_id: uuid.UUID, data: AdminUserUpdate, actor: User
) -> AdminUserOut:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    patch = data.model_dump(exclude_unset=True)

    # Guard: a superadmin cannot demote or deactivate their own account (avoid lockout).
    if user.id == actor.id:
        if patch.get("is_superuser") is False:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot remove your own superadmin access")
        if patch.get("is_active") is False:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot deactivate your own account")

    if "full_name" in patch and patch["full_name"]:
        user.full_name = patch["full_name"]
    if "is_active" in patch and patch["is_active"] is not None:
        user.is_active = patch["is_active"]
    if "is_superuser" in patch and patch["is_superuser"] is not None:
        user.is_superuser = patch["is_superuser"]
    if patch.get("password"):
        user.password_hash = hash_password(patch["password"])

    await db.commit()
    await db.refresh(user)

    membership = await _primary_membership(db, user.id)
    org_out = None
    role = None
    if membership is not None:
        role = membership.role.value if hasattr(membership.role, "value") else str(membership.role)
        org = await db.get(Organization, membership.organization_id)
        if org is not None:
            org_out = await _org_out(db, org)
    return AdminUserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        role=role,
        created_at=user.created_at,
        org=org_out,
    )


async def delete_user(db: AsyncSession, user_id: uuid.UUID, actor: User) -> None:
    if user_id == actor.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete your own account")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    # Collect orgs the user owns, so we can clean up orphaned tenants.
    owned_org_ids = (
        await db.execute(
            select(Membership.organization_id).where(
                Membership.user_id == user_id,
                Membership.role == Role.owner,
            )
        )
    ).scalars().all()

    # Delete the user (memberships cascade via FK ondelete).
    await db.delete(user)
    await db.flush()

    # Cancel Stripe + delete any org that now has no remaining members.
    for org_id in set(owned_org_ids):
        remaining = (
            await db.execute(
                select(func.count(Membership.id)).where(
                    Membership.organization_id == org_id
                )
            )
        ).scalar() or 0
        if remaining == 0:
            org = await db.get(Organization, org_id)
            if org is not None:
                try:
                    await stripe_billing.cancel_subscription(org)
                except Exception:  # noqa: BLE001
                    pass
                await db.delete(org)  # workspaces cascade
    await db.commit()


# --------------------------------------------------------------------------- #
# Organizations
# --------------------------------------------------------------------------- #
async def update_org(
    db: AsyncSession, org_id: uuid.UUID, data: AdminOrgUpdate
) -> AdminOrgOut:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")

    patch = data.model_dump(exclude_unset=True)

    if "plan_code" in patch and patch["plan_code"]:
        plan = (
            await db.execute(select(Plan).where(Plan.code == patch["plan_code"]))
        ).scalar_one_or_none()
        if plan is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown plan '{patch['plan_code']}'")
        org.plan = patch["plan_code"]
    if "org_type" in patch and patch["org_type"]:
        try:
            org.org_type = OrgType(patch["org_type"])
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown org_type '{patch['org_type']}'")
    if "client_limit" in patch:
        org.client_limit = patch["client_limit"]

    await db.commit()
    await db.refresh(org)
    return await _org_out(db, org)


async def terminate_org(db: AsyncSession, org_id: uuid.UUID) -> AdminOrgOut:
    """Terminate an org's paid plan: cancel Stripe subscription + revert to free."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")

    try:
        await stripe_billing.cancel_subscription(org)
    except Exception:  # noqa: BLE001
        pass
    org.plan = DEFAULT_PLAN_CODE
    await db.commit()
    await db.refresh(org)
    return await _org_out(db, org)


# --------------------------------------------------------------------------- #
# Plans (catalogue + custom plans)
# --------------------------------------------------------------------------- #
async def _plan_in_use(db: AsyncSession, code: str) -> int:
    return int(
        (
            await db.execute(
                select(func.count(Organization.id)).where(Organization.plan == code)
            )
        ).scalar()
        or 0
    )


async def list_plans(db: AsyncSession) -> list[Plan]:
    return list(
        (await db.execute(select(Plan).order_by(Plan.price_monthly))).scalars().all()
    )


async def plan_usage(db: AsyncSession, code: str) -> int:
    return await _plan_in_use(db, code)


async def create_plan(db: AsyncSession, data: AdminPlanCreate) -> Plan:
    code = data.code.strip().lower()
    existing = (
        await db.execute(select(Plan).where(Plan.code == code))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Plan '{code}' already exists")
    plan = Plan(
        code=code,
        name=data.name,
        price_monthly=data.price_monthly,
        limits=data.limits or {},
        features=data.features or [],
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


async def update_plan(
    db: AsyncSession, plan_id: uuid.UUID, data: AdminPlanUpdate
) -> Plan:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    patch = data.model_dump(exclude_unset=True)
    if "name" in patch and patch["name"]:
        plan.name = patch["name"]
    if "price_monthly" in patch and patch["price_monthly"] is not None:
        plan.price_monthly = patch["price_monthly"]
    if "limits" in patch and patch["limits"] is not None:
        plan.limits = patch["limits"]
    if "features" in patch and patch["features"] is not None:
        plan.features = patch["features"]
    await db.commit()
    await db.refresh(plan)
    return plan


# Built-in plans must never be deleted (the app + signup rely on them).
_PROTECTED_PLAN_CODES = {"free", "pro", "agency"}


async def delete_plan(db: AsyncSession, plan_id: uuid.UUID) -> None:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    if plan.code in _PROTECTED_PLAN_CODES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Built-in plans cannot be deleted")
    in_use = await _plan_in_use(db, plan.code)
    if in_use > 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Plan is assigned to {in_use} organization(s). Reassign them first.",
        )
    await db.execute(delete(Plan).where(Plan.id == plan_id))
    await db.commit()
