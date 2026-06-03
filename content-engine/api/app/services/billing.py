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
        "limits": {"workspaces": 1, "research_jobs": 5, "content_items": 30,
                   "social_accounts": 2, "ad_accounts": 0, "seats": 1},
        "features": ["Brand Brain", "Research agent", "Insights explorer",
                     "Creation Studio (limited)"],
    },
    {
        "code": "pro",
        "name": "Pro",
        "price_monthly": 49,
        "limits": {"workspaces": 3, "research_jobs": 100, "content_items": 1000,
                   "social_accounts": 6, "ad_accounts": 2, "seats": 3},
        "features": ["Everything in Free", "Unlimited insights", "Publishing (LinkedIn + X)",
                     "Scheduling", "Google Ads agent"],
    },
    {
        "code": "agency",
        "name": "Agency",
        "price_monthly": 199,
        "limits": {"workspaces": 50, "research_jobs": 1000, "content_items": 100000,
                   "social_accounts": 100, "ad_accounts": 50, "seats": 25},
        "features": ["Everything in Pro", "Unlimited workspaces", "All networks",
                     "Multi-client dashboard", "Priority models"],
    },
]


async def seed_plans(db: AsyncSession) -> None:
    existing = (await db.execute(select(Plan.code))).scalars().all()
    have = set(existing)
    for spec in DEFAULT_PLANS:
        if spec["code"] not in have:
            db.add(Plan(**spec))
    await db.commit()
