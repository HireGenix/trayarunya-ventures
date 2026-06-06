"""The Referrals Agent — autonomous referral / affiliate / loyalty strategist.

Grounds every decision in **real** workspace rows (programs, advocates,
conversions) and, where useful, the brand voice from ``BrandBrain``. Three
capabilities:

    design_program(db, ws_id, brief)  -> propose reward structure + share copy
    outreach_copy(db, ws_id, adv_id)  -> personalized invite/share message
    run_cycle(db, ws_id)              -> SENSE->DIAGNOSE->PLAN top advocates,
                                          reward boosts, pending approvals

Each LLM call has a deterministic fallback so the feature never hard-fails.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models.brand import BrandBrain
from app.models.referrals import Advocate, ReferralConversion, ReferralProgram
from app.services import referrals as svc

log = logging.getLogger("referrals_agent")

SYSTEM = (
    "You are an expert referral, affiliate and loyalty program strategist for a "
    "marketing platform. You design high-converting, on-brand advocacy programs. "
    "Respond with strict JSON only — no prose, no markdown fences."
)


async def _load_brand(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    bb = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == ws_id))
    ).scalar_one_or_none()
    if bb is None:
        return {}
    return {
        "value_prop": bb.value_prop,
        "mission": bb.mission,
        "voice": bb.voice,
        "audience": bb.audience,
        "keywords": bb.keywords,
    }


def _brand_label(brand: dict[str, Any]) -> str:
    return (brand.get("value_prop") or brand.get("mission") or "our product").strip()


# --------------------------------------------------------------------------- #
# design_program
# --------------------------------------------------------------------------- #
def _fallback_design(brief: str, brand: dict[str, Any]) -> dict[str, Any]:
    label = _brand_label(brand)
    return {
        "name": (brief.strip()[:60] or "Advocate Rewards") + " Program",
        "type": "referral",
        "reward_type": "cash",
        "reward_value": 25.0,
        "messaging": {
            "headline": f"Share {label}, earn rewards",
            "subhead": "Give your friends a perk and get rewarded when they join.",
        },
        "share_copy": [
            f"I use {label} every day — join with my link and we both get a reward.",
            f"Loving {label}? Here's my referral code for a head start.",
            f"Get started with {label} using my link — it's worth it.",
        ],
        "terms": {
            "reward_trigger": "qualified_conversion",
            "min_purchase": 0,
            "expires_days": 30,
        },
        "rationale": "Deterministic baseline: a simple cash-for-conversion "
        "referral program with three on-brand share templates.",
        "source": "fallback",
    }


async def design_program(
    db: AsyncSession, ws_id: uuid.UUID, brief: str
) -> dict[str, Any]:
    """Propose a complete program (reward structure, messaging, share copy)."""
    brand = await _load_brand(db, ws_id)
    existing = int(
        (
            await db.execute(
                select(func.count(ReferralProgram.id)).where(
                    ReferralProgram.workspace_id == ws_id
                )
            )
        ).scalar_one()
        or 0
    )
    user = (
        f"Brief: {brief}\n"
        f"Brand value prop: {_brand_label(brand)}\n"
        f"Brand voice: {brand.get('voice')}\n"
        f"Target audience: {brand.get('audience')}\n"
        f"Existing programs in workspace: {existing}\n\n"
        "Design ONE advocacy program. Choose type from referral|affiliate|loyalty "
        "and reward_type from cash|credit|points|discount. Ground messaging and "
        "share copy in the brand voice.\n"
        "Return JSON: {"
        '"name": str, "type": str, "reward_type": str, "reward_value": number, '
        '"messaging": {"headline": str, "subhead": str}, '
        '"share_copy": [str, str, str], '
        '"terms": {"reward_trigger": str, "min_purchase": number, "expires_days": number}, '
        '"rationale": str}'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        if not data or data.get("_parse_error") or not data.get("name"):
            return _fallback_design(brief, brand)
        data.setdefault("source", "llm")
        return data
    except Exception:  # noqa: BLE001
        log.exception("design_program failed; using fallback")
        return _fallback_design(brief, brand)


# --------------------------------------------------------------------------- #
# outreach_copy
# --------------------------------------------------------------------------- #
def _fallback_outreach(advocate: Advocate, brand: dict[str, Any]) -> dict[str, Any]:
    label = _brand_label(brand)
    first = (advocate.name or "there").split(" ")[0]
    return {
        "subject": f"{first}, share {label} and earn",
        "invite": (
            f"Hi {first}, thanks for being part of our community. Share your code "
            f"{advocate.code} with friends — when they join {label}, you earn a reward."
        ),
        "share_message": (
            f"I use {label} and think you'd love it. Use my code {advocate.code} "
            "to get started."
        ),
        "source": "fallback",
    }


async def outreach_copy(
    db: AsyncSession, ws_id: uuid.UUID, advocate_id: uuid.UUID
) -> dict[str, Any]:
    """Generate a personalized invite/share message for one advocate."""
    advocate = await svc.get_advocate(db, ws_id, advocate_id)
    if advocate is None:
        return {"error": "advocate_not_found"}
    brand = await _load_brand(db, ws_id)
    program = await svc.get_program(db, ws_id, advocate.program_id)
    user = (
        f"Advocate: {advocate.name} (code {advocate.code}); "
        f"clicks={advocate.clicks}, signups={advocate.signups}, "
        f"conversions={advocate.conversions}, earnings={advocate.earnings}.\n"
        f"Program: {program.name if program else 'n/a'} "
        f"(reward {program.reward_type if program else 'n/a'} "
        f"{program.reward_value if program else 0}).\n"
        f"Brand value prop: {_brand_label(brand)}\n"
        f"Brand voice: {brand.get('voice')}\n\n"
        "Write a warm, on-brand outreach message inviting this advocate to share "
        "their referral code, plus a short share_message they can forward.\n"
        'Return JSON: {"subject": str, "invite": str, "share_message": str}'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        if not data or data.get("_parse_error") or not data.get("invite"):
            return _fallback_outreach(advocate, brand)
        data.setdefault("source", "llm")
        return data
    except Exception:  # noqa: BLE001
        log.exception("outreach_copy failed; using fallback")
        return _fallback_outreach(advocate, brand)


# --------------------------------------------------------------------------- #
# run_cycle — autonomy loop
# --------------------------------------------------------------------------- #
async def run_cycle(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    """SENSE real rows; suggest reward boosts + flag pending conversions.

    Read-only autonomy: returns recommendations the UI / background loop can
    surface. Never mutates rows here, so it is safe to call repeatedly.
    """
    top = await svc.leaderboard(db, ws_id, limit=5)
    pending = await svc.list_conversions(db, ws_id, status="pending")
    ov = await svc.overview(db, ws_id)

    boosts: list[dict[str, Any]] = []
    for adv in top:
        if int(adv.conversions or 0) <= 0:
            continue
        # Advocates converting well but earning little are boost candidates.
        rate = (adv.conversions or 0) / max(adv.signups or 0, 1)
        boosts.append(
            {
                "advocate_id": str(adv.id),
                "name": adv.name,
                "code": adv.code,
                "conversions": int(adv.conversions or 0),
                "earnings": float(adv.earnings or 0.0),
                "conversion_rate": round(rate, 3),
                "suggestion": (
                    "Offer a tier bump or bonus — strong converter."
                    if rate >= 0.3 or (adv.conversions or 0) >= 3
                    else "Send a re-engagement nudge to lift conversion."
                ),
            }
        )

    flagged = [
        {
            "conversion_id": str(c.id),
            "advocate_id": str(c.advocate_id),
            "referred_email": c.referred_email,
            "value": float(c.value or 0.0),
            "reward": float(c.reward or 0.0),
        }
        for c in pending
    ]

    return {
        "overview": ov,
        "top_advocates": len(top),
        "reward_boosts": boosts,
        "pending_to_approve": flagged,
        "summary": (
            f"{ov['active_advocates']} active advocates, "
            f"{ov['conversions']} conversions, "
            f"${ov['payouts_due']} payouts due, "
            f"{len(flagged)} pending conversions to review."
        ),
    }
