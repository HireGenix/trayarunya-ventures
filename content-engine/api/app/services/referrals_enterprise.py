"""Enterprise referrals service: viral analytics, reward tiers, fraud detection.

Heavy-logic companion to :mod:`app.services.referrals`. Everything here is
derived from real persisted rows — no value is fabricated. When the underlying
data is too sparse to be meaningful, responses carry ``low_data: True`` together
with the partial figures that *can* be grounded in the database.

Every query is workspace-scoped via ``workspace_id``.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta

import numpy as np
from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.referrals import (
    Advocate,
    AdvocateReward,
    FraudFlag,
    ReferralConversion,
    RewardTier,
    FRAUD_FLAG_TYPES,
    REWARD_STATUSES,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    """Coerce a possibly-naive datetime to an aware UTC datetime."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# --------------------------------------------------------------------------- #
# 1. Viral metrics
# --------------------------------------------------------------------------- #
async def viral_metrics(
    db: AsyncSession, ws_id: uuid.UUID, days: int = 90
) -> dict:
    """Compute K-factor and viral growth metrics from real advocate/conversion data.

    K-factor = (avg invites per advocate) × (conversion rate), where invites are
    the advocate ``signups`` and the conversion rate is
    ``total_conversions / total_signups``. Viral cycle time is the median number
    of hours between an advocate's creation and their first conversion.
    """
    since = _utcnow() - timedelta(days=days)

    adv_res = await db.execute(
        select(Advocate).where(
            Advocate.workspace_id == ws_id, Advocate.status == "active"
        )
    )
    advocates = list(adv_res.scalars().all())
    advocate_count = len(advocates)

    conv_res = await db.execute(
        select(ReferralConversion).where(
            ReferralConversion.workspace_id == ws_id,
            ReferralConversion.occurred_at >= since,
        )
    )
    conversions = list(conv_res.scalars().all())

    total_clicks = sum(int(a.clicks or 0) for a in advocates)
    total_signups = sum(int(a.signups or 0) for a in advocates)
    total_conversions = len(conversions)

    conversion_rate = (
        total_conversions / total_signups if total_signups > 0 else 0.0
    )
    avg_invites = (total_signups / advocate_count) if advocate_count > 0 else 0.0
    k_factor = round(avg_invites * conversion_rate, 4)

    # Viral cycle time: median hours between advocate creation and first conversion.
    first_conv: dict[uuid.UUID, datetime] = {}
    for conv in conversions:
        occurred = _aware(conv.occurred_at)
        if occurred is None:
            continue
        existing = first_conv.get(conv.advocate_id)
        if existing is None or occurred < existing:
            first_conv[conv.advocate_id] = occurred

    cycle_hours: list[float] = []
    for adv in advocates:
        first = first_conv.get(adv.id)
        created = _aware(adv.created_at)
        if first is not None and created is not None:
            delta = (first - created).total_seconds() / 3600.0
            if delta >= 0:
                cycle_hours.append(delta)

    viral_cycle_time_hours = (
        float(np.median(np.array(cycle_hours, dtype=float)))
        if cycle_hours
        else None
    )

    # Time series: conversions grouped by day within the window.
    ts_res = await db.execute(
        select(
            cast(ReferralConversion.occurred_at, Date).label("day"),
            func.count(ReferralConversion.id).label("conversions"),
            func.coalesce(func.sum(ReferralConversion.value), 0.0).label("value"),
        )
        .where(
            ReferralConversion.workspace_id == ws_id,
            ReferralConversion.occurred_at >= since,
        )
        .group_by(cast(ReferralConversion.occurred_at, Date))
        .order_by(cast(ReferralConversion.occurred_at, Date))
    )
    time_series = [
        {
            "date": row.day.isoformat() if row.day is not None else None,
            "conversions": int(row.conversions or 0),
            "value": round(float(row.value or 0.0), 2),
        }
        for row in ts_res.all()
    ]

    low_data = advocate_count < 3 or total_conversions < 5

    return {
        "k_factor": k_factor,
        "viral_cycle_time_hours": viral_cycle_time_hours,
        "funnel": {
            "clicks": total_clicks,
            "signups": total_signups,
            "conversions": total_conversions,
        },
        "time_series": time_series,
        "advocate_count": advocate_count,
        "low_data": low_data,
    }


# --------------------------------------------------------------------------- #
# 2-3. Reward tiers
# --------------------------------------------------------------------------- #
async def list_reward_tiers(
    db: AsyncSession, ws_id: uuid.UUID, program_id: uuid.UUID | None = None
) -> list[RewardTier]:
    """List reward tiers for the workspace, optionally scoped to a program."""
    stmt = select(RewardTier).where(RewardTier.workspace_id == ws_id)
    if program_id is not None:
        stmt = stmt.where(RewardTier.program_id == program_id)
    res = await db.execute(stmt.order_by(RewardTier.milestone.asc()))
    return list(res.scalars().all())


async def create_reward_tier(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    program_id: uuid.UUID,
    name: str,
    milestone: int,
    reward_type: str = "cash",
    reward_value: float = 0.0,
    description: str | None = None,
) -> RewardTier:
    """Create a milestone-based reward tier for a program."""
    tier = RewardTier(
        workspace_id=ws_id,
        program_id=program_id,
        name=name,
        milestone=int(milestone),
        reward_type=reward_type,
        reward_value=float(reward_value or 0.0),
        description=description,
    )
    db.add(tier)
    await db.flush()
    await db.refresh(tier)
    return tier


# --------------------------------------------------------------------------- #
# 4. Compute advocate rewards
# --------------------------------------------------------------------------- #
async def compute_advocate_rewards(
    db: AsyncSession, ws_id: uuid.UUID, advocate_id: uuid.UUID
) -> list[dict]:
    """Materialise earned reward tiers for an advocate from their conversions.

    Counts the advocate's approved + paid conversions, walks each tier of their
    program in milestone order, and creates a pending :class:`AdvocateReward`
    for every newly-cleared milestone that has not already been recorded.
    """
    adv_res = await db.execute(
        select(Advocate).where(
            Advocate.id == advocate_id, Advocate.workspace_id == ws_id
        )
    )
    advocate = adv_res.scalar_one_or_none()
    if advocate is None:
        return []

    conv_count = int(
        (
            await db.execute(
                select(func.count(ReferralConversion.id)).where(
                    ReferralConversion.workspace_id == ws_id,
                    ReferralConversion.advocate_id == advocate_id,
                    ReferralConversion.status.in_(("approved", "paid")),
                )
            )
        ).scalar_one()
        or 0
    )

    tiers = await list_reward_tiers(db, ws_id, program_id=advocate.program_id)

    results: list[dict] = []
    for tier in tiers:
        earned = conv_count >= int(tier.milestone or 0)
        existing = (
            await db.execute(
                select(AdvocateReward).where(
                    AdvocateReward.workspace_id == ws_id,
                    AdvocateReward.advocate_id == advocate_id,
                    AdvocateReward.tier_id == tier.id,
                )
            )
        ).scalar_one_or_none()

        status = existing.status if existing is not None else "pending"
        if earned and existing is None:
            reward = AdvocateReward(
                workspace_id=ws_id,
                advocate_id=advocate_id,
                tier_id=tier.id,
                reward_type=tier.reward_type,
                reward_value=float(tier.reward_value or 0.0),
                status="pending",
            )
            db.add(reward)
            await db.flush()
            await db.refresh(reward)
            status = reward.status

        results.append(
            {
                "tier_name": tier.name,
                "milestone": int(tier.milestone or 0),
                "reward_type": tier.reward_type,
                "reward_value": float(tier.reward_value or 0.0),
                "status": status,
                "earned": earned,
            }
        )

    return results


# --------------------------------------------------------------------------- #
# 5-6. Advocate rewards listing + status transitions
# --------------------------------------------------------------------------- #
async def list_advocate_rewards(
    db: AsyncSession,
    ws_id: uuid.UUID,
    advocate_id: uuid.UUID | None = None,
    status: str | None = None,
) -> list[AdvocateReward]:
    """List advocate rewards, optionally filtered by advocate and/or status."""
    stmt = select(AdvocateReward).where(AdvocateReward.workspace_id == ws_id)
    if advocate_id is not None:
        stmt = stmt.where(AdvocateReward.advocate_id == advocate_id)
    if status is not None:
        stmt = stmt.where(AdvocateReward.status == status)
    res = await db.execute(stmt.order_by(AdvocateReward.created_at.desc()))
    return list(res.scalars().all())


async def update_reward_status(
    db: AsyncSession, ws_id: uuid.UUID, reward_id: uuid.UUID, new_status: str
) -> AdvocateReward | None:
    """Transition an advocate reward to ``new_status`` (validated against REWARD_STATUSES)."""
    if new_status not in REWARD_STATUSES:
        raise ValueError(
            f"Invalid reward status {new_status!r}; expected one of {REWARD_STATUSES}"
        )
    res = await db.execute(
        select(AdvocateReward).where(
            AdvocateReward.id == reward_id,
            AdvocateReward.workspace_id == ws_id,
        )
    )
    reward = res.scalar_one_or_none()
    if reward is None:
        return None
    reward.status = new_status
    await db.flush()
    await db.refresh(reward)
    return reward


# --------------------------------------------------------------------------- #
# 7. Fraud detection
# --------------------------------------------------------------------------- #
async def run_fraud_detection(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Run deterministic fraud heuristics across advocates and recent conversions.

    Heuristics: self-referral, velocity spikes, conversion-value anomalies
    (z-score), and duplicate identities. Flags are de-duplicated per
    ``(advocate_id, conversion_id, flag_type)`` and each advocate's
    ``fraud_score`` is set to the maximum risk score across their flags.
    """
    now = _utcnow()
    since_30 = now - timedelta(days=30)
    since_24h = now - timedelta(hours=24)

    adv_res = await db.execute(
        select(Advocate).where(Advocate.workspace_id == ws_id)
    )
    advocates = list(adv_res.scalars().all())
    advocates_by_id = {a.id: a for a in advocates}

    conv_res = await db.execute(
        select(ReferralConversion).where(
            ReferralConversion.workspace_id == ws_id,
            ReferralConversion.occurred_at >= since_30,
        )
    )
    conversions = list(conv_res.scalars().all())

    # (advocate_id, conversion_id, flag_type) -> risk_score   (best score wins)
    pending_flags: dict[tuple, tuple[float, dict]] = {}

    def _stage(
        advocate_id: uuid.UUID | None,
        conversion_id: uuid.UUID | None,
        flag_type: str,
        risk_score: float,
        details: dict,
    ) -> None:
        key = (advocate_id, conversion_id, flag_type)
        prev = pending_flags.get(key)
        if prev is None or risk_score > prev[0]:
            pending_flags[key] = (round(float(risk_score), 4), details)

    # (a) Self-referral -------------------------------------------------------
    ip_owners: dict[str, set[uuid.UUID]] = {}
    for conv in conversions:
        ip = (conv.ip_address or "").strip()
        if ip:
            ip_owners.setdefault(ip, set()).add(conv.advocate_id)

    for conv in conversions:
        advocate = advocates_by_id.get(conv.advocate_id)
        adv_email = (advocate.email or "").strip().lower() if advocate else ""
        ref_email = (conv.referred_email or "").strip().lower()
        is_self = bool(adv_email) and adv_email == ref_email

        shared_ip = False
        ip = (conv.ip_address or "").strip()
        if ip and len(ip_owners.get(ip, set())) > 1:
            shared_ip = True

        if is_self or shared_ip:
            _stage(
                conv.advocate_id,
                conv.id,
                "self_referral",
                0.9,
                {
                    "matched_email": is_self,
                    "shared_ip": shared_ip,
                    "ip_address": ip or None,
                },
            )

    # (b) Velocity spike ------------------------------------------------------
    conv_by_advocate: dict[uuid.UUID, list[ReferralConversion]] = {}
    for conv in conversions:
        conv_by_advocate.setdefault(conv.advocate_id, []).append(conv)

    for advocate in advocates:
        adv_convs = conv_by_advocate.get(advocate.id, [])
        count_24h = sum(
            1
            for c in adv_convs
            if (_aware(c.occurred_at) or now) >= since_24h
        )

        total_conv = int(advocate.conversions or 0) or len(adv_convs)
        created = _aware(advocate.created_at) or now
        days_since = max((now - created).total_seconds() / 86400.0, 1.0)
        avg_daily = total_conv / days_since

        if count_24h > 10 or (avg_daily > 0 and count_24h > 3 * avg_daily):
            _stage(
                advocate.id,
                None,
                "velocity_spike",
                min(1.0, count_24h / 20.0),
                {
                    "count_24h": count_24h,
                    "avg_daily_rate": round(avg_daily, 4),
                },
            )

    # (c) Conversion anomaly (z-score) ---------------------------------------
    if len(conversions) >= 2:
        values = np.array([float(c.value or 0.0) for c in conversions], dtype=float)
        mean = float(values.mean())
        std = float(values.std())
        if std > 0:
            for conv, val in zip(conversions, values):
                z = (val - mean) / std
                if abs(z) > 3.0:
                    _stage(
                        conv.advocate_id,
                        conv.id,
                        "conversion_anomaly",
                        min(1.0, abs(z) / 5.0),
                        {"value": float(val), "z_score": round(float(z), 4)},
                    )

    # (d) Duplicate identity --------------------------------------------------
    email_groups: dict[str, list[ReferralConversion]] = {}
    for conv in conversions:
        if conv.referred_email:
            key = conv.referred_email.strip().lower()
            if key:
                email_groups.setdefault(key, []).append(conv)

    for email, group in email_groups.items():
        if len(group) > 2:
            risk = min(1.0, len(group) / 5.0)
            for conv in group:
                _stage(
                    conv.advocate_id,
                    conv.id,
                    "duplicate_identity",
                    risk,
                    {"referred_email": email, "count": len(group)},
                )

    # Persist new flags (skip ones already recorded) --------------------------
    flags_created = 0
    for (advocate_id, conversion_id, flag_type), (risk_score, details) in pending_flags.items():
        if flag_type not in FRAUD_FLAG_TYPES:
            continue
        dup_stmt = select(FraudFlag).where(
            FraudFlag.workspace_id == ws_id,
            FraudFlag.flag_type == flag_type,
        )
        dup_stmt = dup_stmt.where(
            FraudFlag.advocate_id == advocate_id
            if advocate_id is not None
            else FraudFlag.advocate_id.is_(None)
        )
        dup_stmt = dup_stmt.where(
            FraudFlag.conversion_id == conversion_id
            if conversion_id is not None
            else FraudFlag.conversion_id.is_(None)
        )
        existing = (await db.execute(dup_stmt)).scalar_one_or_none()
        if existing is not None:
            continue
        db.add(
            FraudFlag(
                workspace_id=ws_id,
                advocate_id=advocate_id,
                conversion_id=conversion_id,
                flag_type=flag_type,
                risk_score=risk_score,
                details=details,
                resolved=False,
            )
        )
        flags_created += 1

    if flags_created:
        await db.flush()

    # Recompute each advocate's fraud_score = max risk across their flags ------
    high_risk_advocates = 0
    for advocate in advocates:
        max_res = await db.execute(
            select(func.max(FraudFlag.risk_score)).where(
                FraudFlag.workspace_id == ws_id,
                FraudFlag.advocate_id == advocate.id,
            )
        )
        max_score = max_res.scalar_one_or_none()
        advocate.fraud_score = float(max_score) if max_score is not None else 0.0
        if advocate.fraud_score > 0.7:
            high_risk_advocates += 1

    await db.flush()

    return {
        "flags_created": flags_created,
        "advocates_scanned": len(advocates),
        "conversions_scanned": len(conversions),
        "high_risk_advocates": high_risk_advocates,
    }


# --------------------------------------------------------------------------- #
# 8-9. Fraud flag listing + resolution
# --------------------------------------------------------------------------- #
async def list_fraud_flags(
    db: AsyncSession,
    ws_id: uuid.UUID,
    resolved: bool | None = None,
    advocate_id: uuid.UUID | None = None,
) -> list[FraudFlag]:
    """List fraud flags, optionally filtered by resolution state and/or advocate."""
    stmt = select(FraudFlag).where(FraudFlag.workspace_id == ws_id)
    if resolved is not None:
        stmt = stmt.where(FraudFlag.resolved == resolved)
    if advocate_id is not None:
        stmt = stmt.where(FraudFlag.advocate_id == advocate_id)
    res = await db.execute(stmt.order_by(FraudFlag.created_at.desc()))
    return list(res.scalars().all())


async def resolve_fraud_flag(
    db: AsyncSession, ws_id: uuid.UUID, flag_id: uuid.UUID, resolved_by: str
) -> FraudFlag | None:
    """Mark a fraud flag as resolved; returns ``None`` when the flag is absent."""
    res = await db.execute(
        select(FraudFlag).where(
            FraudFlag.id == flag_id, FraudFlag.workspace_id == ws_id
        )
    )
    flag = res.scalar_one_or_none()
    if flag is None:
        return None
    flag.resolved = True
    flag.resolved_by = resolved_by
    await db.flush()
    await db.refresh(flag)
    return flag


# --------------------------------------------------------------------------- #
# 10. Per-advocate analytics
# --------------------------------------------------------------------------- #
async def advocate_analytics(
    db: AsyncSession, ws_id: uuid.UUID, advocate_id: uuid.UUID
) -> dict:
    """Deep per-advocate analytics grounded in conversions, rewards, and flags."""
    adv_res = await db.execute(
        select(Advocate).where(
            Advocate.id == advocate_id, Advocate.workspace_id == ws_id
        )
    )
    advocate = adv_res.scalar_one_or_none()
    if advocate is None:
        return {"low_data": True, "found": False}

    conv_res = await db.execute(
        select(ReferralConversion).where(
            ReferralConversion.workspace_id == ws_id,
            ReferralConversion.advocate_id == advocate_id,
        )
    )
    conversions = list(conv_res.scalars().all())

    clicks = int(advocate.clicks or 0)
    signups = int(advocate.signups or 0)
    conv_count = len(conversions)
    earnings = float(advocate.earnings or 0.0)

    conversion_rate = (conv_count / signups) if signups > 0 else 0.0
    total_value = sum(float(c.value or 0.0) for c in conversions)
    avg_conversion_value = (total_value / conv_count) if conv_count > 0 else 0.0

    rewards = await list_advocate_rewards(db, ws_id, advocate_id=advocate_id)
    tiers_earned = [
        {
            "tier_id": str(r.tier_id) if r.tier_id is not None else None,
            "reward_type": r.reward_type,
            "reward_value": float(r.reward_value or 0.0),
            "status": r.status,
        }
        for r in rewards
    ]

    flags = await list_fraud_flags(db, ws_id, advocate_id=advocate_id)
    fraud_flags = [
        {
            "id": str(f.id),
            "flag_type": f.flag_type,
            "risk_score": float(f.risk_score or 0.0),
            "resolved": bool(f.resolved),
        }
        for f in flags
    ]

    # Monthly conversion trend over the last 12 months.
    since_12mo = _utcnow() - timedelta(days=365)
    trend_res = await db.execute(
        select(
            func.date_trunc("month", ReferralConversion.occurred_at).label("month"),
            func.count(ReferralConversion.id).label("conversions"),
            func.coalesce(func.sum(ReferralConversion.value), 0.0).label("value"),
        )
        .where(
            ReferralConversion.workspace_id == ws_id,
            ReferralConversion.advocate_id == advocate_id,
            ReferralConversion.occurred_at >= since_12mo,
        )
        .group_by(func.date_trunc("month", ReferralConversion.occurred_at))
        .order_by(func.date_trunc("month", ReferralConversion.occurred_at))
    )
    monthly_trend = [
        {
            "month": row.month.date().isoformat() if row.month is not None else None,
            "conversions": int(row.conversions or 0),
            "value": round(float(row.value or 0.0), 2),
        }
        for row in trend_res.all()
    ]

    low_data = conv_count < 5

    return {
        "advocate_id": str(advocate.id),
        "name": advocate.name,
        "clicks": clicks,
        "signups": signups,
        "conversions": conv_count,
        "earnings": round(earnings, 2),
        "conversion_rate": round(conversion_rate, 4),
        "average_conversion_value": round(avg_conversion_value, 2),
        "total_value": round(total_value, 2),
        "reward_tiers_earned": tiers_earned,
        "fraud_flags": fraud_flags,
        "fraud_score": float(advocate.fraud_score or 0.0),
        "monthly_trend": monthly_trend,
        "low_data": low_data,
    }


# --------------------------------------------------------------------------- #
# 11. Extended leaderboard
# --------------------------------------------------------------------------- #
async def leaderboard_extended(
    db: AsyncSession, ws_id: uuid.UUID, limit: int = 25
) -> list[dict]:
    """Top advocates by earnings, enriched with conversion rate, fraud score, value."""
    value_res = await db.execute(
        select(
            ReferralConversion.advocate_id.label("advocate_id"),
            func.coalesce(func.sum(ReferralConversion.value), 0.0).label("total_value"),
        )
        .where(ReferralConversion.workspace_id == ws_id)
        .group_by(ReferralConversion.advocate_id)
    )
    value_by_advocate = {
        row.advocate_id: float(row.total_value or 0.0) for row in value_res.all()
    }

    adv_res = await db.execute(
        select(Advocate)
        .where(Advocate.workspace_id == ws_id)
        .order_by(
            Advocate.earnings.desc(),
            Advocate.conversions.desc(),
            Advocate.signups.desc(),
        )
        .limit(limit)
    )
    advocates = list(adv_res.scalars().all())

    rows: list[dict] = []
    for advocate in advocates:
        signups = int(advocate.signups or 0)
        conv_count = int(advocate.conversions or 0)
        conversion_rate = (conv_count / signups) if signups > 0 else 0.0
        rows.append(
            {
                "advocate_id": str(advocate.id),
                "name": advocate.name,
                "code": advocate.code,
                "earnings": round(float(advocate.earnings or 0.0), 2),
                "clicks": int(advocate.clicks or 0),
                "signups": signups,
                "conversions": conv_count,
                "conversion_rate": round(conversion_rate, 4),
                "fraud_score": float(advocate.fraud_score or 0.0),
                "total_value": round(value_by_advocate.get(advocate.id, 0.0), 2),
            }
        )
    return rows
