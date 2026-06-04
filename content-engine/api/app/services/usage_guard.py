"""Server-side billing/usage enforcement.

Resolves a workspace's active plan, counts current-period usage, and enforces
plan limits *before* expensive create actions (research jobs, content items,
ad campaigns). Designed to fail open: the guard must never crash a request
because of its own internals — on any unexpected error it logs and allows.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Campaign, ContentItem, Organization, Plan, ResearchJob, Workspace

logger = logging.getLogger("app.usage_guard")

# Default plan code used when an organization has no plan set or the referenced
# plan row does not exist.
DEFAULT_PLAN_CODE = "free"

# Maps the public resource key used by callers to the matching column in the
# Plan.limits JSON (defined in app/services/billing.py seed_plans) and the
# model whose rows are counted for current-period usage.
_RESOURCE_MAP: dict[str, tuple[str, type]] = {
    "research": ("research_jobs", ResearchJob),
    "content": ("content_items", ContentItem),
    "ads": ("ad_accounts", Campaign),
}


def _period_start() -> datetime:
    """Start of the current calendar-month billing period (UTC)."""
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


async def get_active_plan(db: AsyncSession, workspace_id: uuid.UUID) -> Plan | None:
    """Resolve the plan for the workspace's organization.

    Falls back to the default (free/starter) plan if the org has no plan set or
    the referenced plan code is missing. Returns ``None`` only when billing is
    not configured at all (no plans seeded), which callers treat as fail-open.
    """
    try:
        workspace = await db.get(Workspace, workspace_id)
        if workspace is None:
            return None

        org = await db.get(Organization, workspace.organization_id)
        plan_code = (org.plan if org and org.plan else DEFAULT_PLAN_CODE)

        plan = (
            await db.execute(select(Plan).where(Plan.code == plan_code))
        ).scalar_one_or_none()

        if plan is None:
            # Org references a missing plan — fall back to the default plan row.
            plan = (
                await db.execute(select(Plan).where(Plan.code == DEFAULT_PLAN_CODE))
            ).scalar_one_or_none()

        return plan
    except Exception:  # noqa: BLE001
        logger.exception("get_active_plan failed for workspace %s", workspace_id)
        return None


async def current_usage(db: AsyncSession, workspace_id: uuid.UUID) -> dict:
    """Count current-period usage for the workspace, keyed by resource.

    Returns a dict like ``{"research": 3, "content": 12, "ads": 0}``. Counts
    rows created since the start of the current calendar month.
    """
    usage: dict[str, int] = {}
    period_start = _period_start()
    for resource, (_limit_key, model) in _RESOURCE_MAP.items():
        try:
            count = (
                await db.execute(
                    select(func.count(model.id)).where(
                        model.workspace_id == workspace_id,
                        model.created_at >= period_start,
                    )
                )
            ).scalar() or 0
            usage[resource] = int(count)
        except Exception:  # noqa: BLE001
            logger.exception(
                "current_usage count failed for resource=%s workspace=%s",
                resource,
                workspace_id,
            )
            usage[resource] = 0
    return usage


async def enforce_limit(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    resource: str,
    amount: int = 1,
) -> None:
    """Enforce the plan limit for ``resource`` before a create action.

    Raises ``HTTPException(402)`` with an upgrade hint when the action would
    exceed the plan's allowance. Fails open (allows) when the plan/limits are
    not configured, when the limit is ``None`` (unlimited), or on any
    unexpected internal error.
    """
    try:
        mapping = _RESOURCE_MAP.get(resource)
        if mapping is None:
            logger.warning("enforce_limit: unknown resource '%s' — allowing", resource)
            return

        limit_key, _model = mapping

        plan = await get_active_plan(db, workspace_id)
        if plan is None or not plan.limits:
            # Billing/plans not configured — fail open.
            logger.info(
                "enforce_limit: no plan/limits for workspace %s — allowing %s",
                workspace_id,
                resource,
            )
            return

        limit = plan.limits.get(limit_key)
        if limit is None:
            # Unlimited for this resource.
            return

        try:
            limit_val = int(limit)
        except (TypeError, ValueError):
            logger.warning(
                "enforce_limit: non-numeric limit %r for %s — allowing",
                limit,
                limit_key,
            )
            return

        usage = await current_usage(db, workspace_id)
        used = usage.get(resource, 0)

        if used + amount > limit_val:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "plan_limit_reached",
                    "resource": resource,
                    "plan": plan.code,
                    "limit": limit_val,
                    "used": used,
                    "message": (
                        f"You've reached your {plan.name} plan limit for "
                        f"{limit_key.replace('_', ' ')} ({used}/{limit_val} this "
                        f"month). Upgrade your plan to continue."
                    ),
                    "upgrade_hint": "Upgrade to a higher plan in Billing settings.",
                },
            )
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001
        logger.exception(
            "enforce_limit failed unexpectedly for resource=%s workspace=%s — allowing",
            resource,
            workspace_id,
        )
        return
