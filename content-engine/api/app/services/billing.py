"""Billing service: seed default plans and resolve a workspace's current plan."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Plan

DEFAULT_PLANS = [
    {
        "code": "free",
        "name": "Free",
        "price_monthly": 0,
        "limits": {"workspaces": 1, "research_jobs": 2, "strategies": 1,
                   "content_calendars": 1, "content_items": 5,
                   "social_accounts": 2, "ad_accounts": 0, "seats": 1},
        "features": ["1 workspace", "2 research runs", "1 strategy",
                     "1 content calendar", "5 posts"],
    },
    {
        "code": "pro",
        "name": "Pro",
        "price_monthly": 499,
        "limits": {"workspaces": 3, "research_jobs": 100, "strategies": 100,
                   "content_calendars": 50, "content_items": 1000,
                   "social_accounts": 6, "ad_accounts": 2, "seats": 1},
        "features": ["Everything in Free", "Unlimited insights", "Publishing (LinkedIn + X)",
                     "Scheduling", "Google Ads agent"],
    },
    {
        "code": "agency",
        "name": "Agency",
        "price_monthly": 199,
        "limits": {"workspaces": 50, "research_jobs": 1000, "strategies": 1000,
                   "content_calendars": 1000, "content_items": 100000,
                   "social_accounts": 100, "ad_accounts": 50, "seats": 25},
        "features": ["Everything in Pro", "Unlimited workspaces", "All networks",
                     "Multi-client dashboard", "Priority models"],
    },
]


async def seed_plans(db: AsyncSession) -> None:
    existing = (await db.execute(select(Plan))).scalars().all()
    by_code = {p.code: p for p in existing}
    for spec in DEFAULT_PLANS:
        current = by_code.get(spec["code"])
        if current is None:
            db.add(Plan(**spec))
        else:
            # Keep built-in plans in sync with the shipped defaults so limit
            # changes (e.g. the freemium quotas) roll out on deploy.
            current.name = spec["name"]
            current.price_monthly = spec["price_monthly"]
            current.limits = spec["limits"]
            current.features = spec["features"]
    await db.commit()
