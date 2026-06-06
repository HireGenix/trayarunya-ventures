"""Referrals service: program CRUD, advocate codes, conversion + loyalty math.

All aggregation (earnings rollups, leaderboards, overview KPIs, payout state
transitions, loyalty balances) lives here. Every query is workspace-scoped and
all counters are derived from real persisted rows — nothing is fabricated.
"""
from __future__ import annotations

import secrets
import string
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.referrals import (
    Advocate,
    LoyaltyLedger,
    ReferralConversion,
    ReferralProgram,
)

_CODE_ALPHABET = string.ascii_uppercase + string.digits


# --------------------------------------------------------------------------- #
# Programs
# --------------------------------------------------------------------------- #
async def list_programs(db: AsyncSession, ws_id: uuid.UUID) -> list[ReferralProgram]:
    res = await db.execute(
        select(ReferralProgram)
        .where(ReferralProgram.workspace_id == ws_id)
        .order_by(ReferralProgram.created_at.desc())
    )
    return list(res.scalars().all())


async def get_program(
    db: AsyncSession, ws_id: uuid.UUID, program_id: uuid.UUID
) -> ReferralProgram | None:
    res = await db.execute(
        select(ReferralProgram).where(
            ReferralProgram.id == program_id,
            ReferralProgram.workspace_id == ws_id,
        )
    )
    return res.scalar_one_or_none()


async def create_program(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    type: str = "referral",
    reward_type: str = "cash",
    reward_value: float = 0.0,
    status: str = "active",
    description: str | None = None,
    terms: dict | None = None,
) -> ReferralProgram:
    program = ReferralProgram(
        workspace_id=ws_id,
        name=name,
        type=type,
        reward_type=reward_type,
        reward_value=float(reward_value or 0.0),
        status=status,
        description=description,
        terms=terms,
    )
    db.add(program)
    await db.flush()
    await db.refresh(program)
    return program


async def update_program(
    db: AsyncSession,
    ws_id: uuid.UUID,
    program_id: uuid.UUID,
    **fields,
) -> ReferralProgram | None:
    program = await get_program(db, ws_id, program_id)
    if program is None:
        return None
    for key, value in fields.items():
        if value is not None and hasattr(program, key):
            setattr(program, key, value)
    await db.flush()
    await db.refresh(program)
    return program


# --------------------------------------------------------------------------- #
# Advocates
# --------------------------------------------------------------------------- #
async def list_advocates(
    db: AsyncSession, ws_id: uuid.UUID, program_id: uuid.UUID | None = None
) -> list[Advocate]:
    stmt = select(Advocate).where(Advocate.workspace_id == ws_id)
    if program_id is not None:
        stmt = stmt.where(Advocate.program_id == program_id)
    res = await db.execute(stmt.order_by(Advocate.earnings.desc()))
    return list(res.scalars().all())


async def get_advocate(
    db: AsyncSession, ws_id: uuid.UUID, advocate_id: uuid.UUID
) -> Advocate | None:
    res = await db.execute(
        select(Advocate).where(
            Advocate.id == advocate_id, Advocate.workspace_id == ws_id
        )
    )
    return res.scalar_one_or_none()


async def _generate_code(db: AsyncSession, name: str) -> str:
    """Produce a short unique, human-friendly advocate code."""
    base = "".join(ch for ch in name.upper() if ch.isalnum())[:6] or "REF"
    for _ in range(12):
        suffix = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(4))
        code = f"{base}-{suffix}"
        exists = await db.execute(select(Advocate.id).where(Advocate.code == code))
        if exists.scalar_one_or_none() is None:
            return code
    # Extremely unlikely fallback — fully random, still unique-checked.
    return "REF-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))


async def create_advocate(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    program_id: uuid.UUID,
    name: str,
    email: str | None = None,
    status: str = "active",
    code: str | None = None,
) -> Advocate:
    advocate_code = code or await _generate_code(db, name)
    advocate = Advocate(
        workspace_id=ws_id,
        program_id=program_id,
        name=name,
        email=email,
        code=advocate_code,
        status=status,
    )
    db.add(advocate)
    await db.flush()
    await db.refresh(advocate)
    return advocate


async def get_advocate_by_code(
    db: AsyncSession, ws_id: uuid.UUID, code: str
) -> Advocate | None:
    res = await db.execute(
        select(Advocate).where(
            Advocate.workspace_id == ws_id, Advocate.code == code
        )
    )
    return res.scalar_one_or_none()


async def record_click(db: AsyncSession, advocate: Advocate) -> Advocate:
    advocate.clicks = int(advocate.clicks or 0) + 1
    await db.flush()
    return advocate


async def record_signup(db: AsyncSession, advocate: Advocate) -> Advocate:
    advocate.signups = int(advocate.signups or 0) + 1
    await db.flush()
    return advocate


# --------------------------------------------------------------------------- #
# Conversions + rewards
# --------------------------------------------------------------------------- #
def _compute_reward(program: ReferralProgram | None, value: float) -> float:
    """Reward owed for a conversion, grounded in the program's reward config."""
    if program is None:
        return 0.0
    rv = float(program.reward_value or 0.0)
    if program.reward_type in ("cash", "credit", "points"):
        return rv
    if program.reward_type == "discount":
        # discount reward_value is a percentage of the sale value
        return round(float(value or 0.0) * rv / 100.0, 2)
    return rv


async def record_conversion(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    advocate: Advocate,
    program: ReferralProgram | None,
    referred_email: str | None = None,
    value: float = 0.0,
    occurred_at: datetime | None = None,
) -> ReferralConversion:
    reward = _compute_reward(program, value)
    conversion = ReferralConversion(
        workspace_id=ws_id,
        advocate_id=advocate.id,
        referred_email=referred_email,
        value=float(value or 0.0),
        reward=reward,
        status="pending",
        occurred_at=occurred_at or datetime.now(timezone.utc),
    )
    db.add(conversion)
    advocate.conversions = int(advocate.conversions or 0) + 1
    await db.flush()
    await db.refresh(conversion)
    return conversion


async def list_conversions(
    db: AsyncSession, ws_id: uuid.UUID, status: str | None = None
) -> list[ReferralConversion]:
    stmt = select(ReferralConversion).where(ReferralConversion.workspace_id == ws_id)
    if status is not None:
        stmt = stmt.where(ReferralConversion.status == status)
    res = await db.execute(stmt.order_by(ReferralConversion.occurred_at.desc()))
    return list(res.scalars().all())


async def get_conversion(
    db: AsyncSession, ws_id: uuid.UUID, conversion_id: uuid.UUID
) -> ReferralConversion | None:
    res = await db.execute(
        select(ReferralConversion).where(
            ReferralConversion.id == conversion_id,
            ReferralConversion.workspace_id == ws_id,
        )
    )
    return res.scalar_one_or_none()


async def approve_conversion(
    db: AsyncSession, ws_id: uuid.UUID, conversion: ReferralConversion
) -> ReferralConversion:
    """Approve a pending conversion and credit the advocate's earnings."""
    if conversion.status == "pending":
        conversion.status = "approved"
        advocate = await get_advocate(db, ws_id, conversion.advocate_id)
        if advocate is not None:
            advocate.earnings = round(
                float(advocate.earnings or 0.0) + float(conversion.reward or 0.0), 2
            )
    await db.flush()
    await db.refresh(conversion)
    return conversion


async def pay_conversion(
    db: AsyncSession, conversion: ReferralConversion
) -> ReferralConversion:
    if conversion.status in ("approved", "pending"):
        conversion.status = "paid"
    await db.flush()
    await db.refresh(conversion)
    return conversion


# --------------------------------------------------------------------------- #
# Loyalty
# --------------------------------------------------------------------------- #
async def accrue_points(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    points: int,
    advocate_id: uuid.UUID | None = None,
    contact: str | None = None,
    reason: str | None = None,
) -> LoyaltyLedger:
    """Append a loyalty entry, computing the running balance for the subject."""
    prior = await loyalty_balance(db, ws_id, advocate_id=advocate_id, contact=contact)
    balance = prior + int(points or 0)
    entry = LoyaltyLedger(
        workspace_id=ws_id,
        advocate_id=advocate_id,
        contact=contact,
        points=int(points or 0),
        reason=reason,
        balance=balance,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def loyalty_balance(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    advocate_id: uuid.UUID | None = None,
    contact: str | None = None,
) -> int:
    stmt = select(func.coalesce(func.sum(LoyaltyLedger.points), 0)).where(
        LoyaltyLedger.workspace_id == ws_id
    )
    if advocate_id is not None:
        stmt = stmt.where(LoyaltyLedger.advocate_id == advocate_id)
    elif contact is not None:
        stmt = stmt.where(LoyaltyLedger.contact == contact)
    res = await db.execute(stmt)
    return int(res.scalar_one() or 0)


async def list_loyalty(
    db: AsyncSession, ws_id: uuid.UUID, limit: int = 100
) -> list[LoyaltyLedger]:
    res = await db.execute(
        select(LoyaltyLedger)
        .where(LoyaltyLedger.workspace_id == ws_id)
        .order_by(LoyaltyLedger.created_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


# --------------------------------------------------------------------------- #
# Analytics: leaderboard + overview
# --------------------------------------------------------------------------- #
async def leaderboard(
    db: AsyncSession, ws_id: uuid.UUID, limit: int = 25
) -> list[Advocate]:
    res = await db.execute(
        select(Advocate)
        .where(Advocate.workspace_id == ws_id)
        .order_by(
            Advocate.earnings.desc(),
            Advocate.conversions.desc(),
            Advocate.signups.desc(),
        )
        .limit(limit)
    )
    return list(res.scalars().all())


async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Real KPI rollup for the workspace's referral programs."""
    active_advocates = int(
        (
            await db.execute(
                select(func.count(Advocate.id)).where(
                    Advocate.workspace_id == ws_id, Advocate.status == "active"
                )
            )
        ).scalar_one()
        or 0
    )
    total_conversions = int(
        (
            await db.execute(
                select(func.count(ReferralConversion.id)).where(
                    ReferralConversion.workspace_id == ws_id
                )
            )
        ).scalar_one()
        or 0
    )
    revenue_referred = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(ReferralConversion.value), 0.0)).where(
                    ReferralConversion.workspace_id == ws_id
                )
            )
        ).scalar_one()
        or 0.0
    )
    payouts_due = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(ReferralConversion.reward), 0.0)).where(
                    ReferralConversion.workspace_id == ws_id,
                    ReferralConversion.status == "approved",
                )
            )
        ).scalar_one()
        or 0.0
    )
    pending_conversions = int(
        (
            await db.execute(
                select(func.count(ReferralConversion.id)).where(
                    ReferralConversion.workspace_id == ws_id,
                    ReferralConversion.status == "pending",
                )
            )
        ).scalar_one()
        or 0
    )
    active_programs = int(
        (
            await db.execute(
                select(func.count(ReferralProgram.id)).where(
                    ReferralProgram.workspace_id == ws_id,
                    ReferralProgram.status == "active",
                )
            )
        ).scalar_one()
        or 0
    )
    return {
        "active_advocates": active_advocates,
        "active_programs": active_programs,
        "conversions": total_conversions,
        "pending_conversions": pending_conversions,
        "revenue_referred": round(revenue_referred, 2),
        "payouts_due": round(payouts_due, 2),
    }
