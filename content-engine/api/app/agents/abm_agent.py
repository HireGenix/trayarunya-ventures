"""The ABM Agent — enterprise account intelligence + play recommendations.

Grounded entirely in real rows the ABM module writes (AbmAccount, AbmPlay,
AbmPlayEnrollment) and the workspace ICP. SENSE -> SCORE -> RECOMMEND:

    score_accounts       -> batch recompute fit + intent + tier for all accounts
    recommend_play_copy  -> LLM-generated play copy grounded in fit factors + tier
    suggest_play         -> propose a play structure from account tier + ICP

Every LLM call has a deterministic fallback so the feature never hard-fails.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models.icp import ICPProfile
from app.models.platform import AbmAccount
from app.services import abm_enterprise as svc

log = logging.getLogger("abm_agent")

SYSTEM = (
    "You are an expert B2B account-based marketing strategist. "
    "You design multi-step ABM plays and personalized outreach grounded in real "
    "account data and ICP fit analysis. Respond with strict JSON only — no prose, "
    "no markdown."
)


async def _load_icp(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any] | None:
    row = (
        await db.execute(
            select(ICPProfile).where(ICPProfile.workspace_id == ws_id)
        )
    ).scalar_one_or_none()
    if row is None:
        return None
    return {
        "segment": row.segment,
        "industry": row.industry,
        "value_prop": row.value_prop,
        "target_customer": row.target_customer,
        "personas": row.personas,
        "keywords": row.keywords,
        "geographies": row.geographies,
    }


# ── 1) Batch scoring ───────────────────────────────────────────────────── #

async def score_accounts(
    db: AsyncSession, ws_id: uuid.UUID
) -> dict[str, Any]:
    """Recompute fit + intent + tier for every account in the workspace."""
    results = await svc.score_all_accounts(db, ws_id)
    await db.flush()

    tier_counts = {"tier_1": 0, "tier_2": 0, "tier_3": 0}
    for r in results:
        t = r.get("tier", "tier_3")
        tier_counts[t] = tier_counts.get(t, 0) + 1

    return {
        "scored": len(results),
        "tier_distribution": tier_counts,
        "accounts": results,
    }


# ── 2) Play copy generation (LLM + fallback) ───────────────────────────── #

def _fallback_play_copy(
    company: str,
    tier: str,
    fit_factors: dict | None,
) -> dict[str, Any]:
    """Deterministic play copy when LLM is unavailable."""
    industry_reason = (fit_factors or {}).get("industry", {}).get("reason", "")
    is_icp_fit = "match" in industry_reason

    if tier == "tier_1":
        return {
            "play_name": f"High-priority: {company}",
            "steps": [
                {"channel": "email", "delay_days": 0,
                 "subject": f"Tailored for {company}",
                 "body": "Personalized value-led opener referencing their specific pain points and your solution."},
                {"channel": "linkedin", "delay_days": 2,
                 "subject": "Connect with champion",
                 "body": "Connection request with a relevant insight — no pitch."},
                {"channel": "email", "delay_days": 5,
                 "subject": "Proof point",
                 "body": "Share a case study from their industry showing measurable ROI."},
                {"channel": "call", "delay_days": 8,
                 "subject": "Discovery call",
                 "body": "Direct ask for a 15-minute call with two time options."},
            ],
        }
    if tier == "tier_2":
        return {
            "play_name": f"Nurture: {company}",
            "steps": [
                {"channel": "email", "delay_days": 0,
                 "subject": f"Idea for {company}",
                 "body": "Educational opener that reframes a common industry challenge."},
                {"channel": "content", "delay_days": 4,
                 "subject": "Share resource",
                 "body": "Send a relevant whitepaper, guide, or benchmark report."},
                {"channel": "email", "delay_days": 9,
                 "subject": "Follow-up",
                 "body": "Gentle follow-up with social proof and a soft CTA."},
            ],
        }
    return {
        "play_name": f"Awareness: {company}",
        "steps": [
            {"channel": "email", "delay_days": 0,
             "subject": f"Worth knowing: {company}",
             "body": "Lightweight educational touch to build brand awareness."},
            {"channel": "content", "delay_days": 7,
             "subject": "Resource share",
             "body": "Share broadly useful content relevant to their space."},
        ],
    }


async def recommend_play_copy(
    db: AsyncSession,
    ws_id: uuid.UUID,
    account_id: uuid.UUID,
) -> dict[str, Any]:
    """Generate play copy for an account, grounded in fit factors + tier."""
    account = await db.get(AbmAccount, account_id)
    if account is None or account.workspace_id != ws_id:
        return {"error": "account_not_found"}

    icp_row = (
        await db.execute(
            select(ICPProfile).where(ICPProfile.workspace_id == ws_id)
        )
    ).scalar_one_or_none()
    fit = svc.compute_fit_score(account, icp_row)
    tier = account.tier or svc.compute_tier(
        fit["fit_score"],
        float(account.intent_score or 0),
    )
    fallback = _fallback_play_copy(account.company, tier, fit.get("factors"))

    user = (
        "Design an ABM play for this account.\n"
        f"Company: {account.company}\n"
        f"Industry: {account.industry or 'unknown'}\n"
        f"Tier: {tier}\n"
        f"ICP fit score: {fit['fit_score']}/100\n"
        f"Fit factors: {fit['factors']}\n"
        f"Stage: {account.stage}\n"
        "Create a multi-step play with 2-4 steps across email, linkedin, content, "
        "call channels. Each step: channel, delay_days, subject, body.\n"
        'Return JSON: {"play_name": str, "steps": [{"channel": str, '
        '"delay_days": int, "subject": str, "body": str}]}'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        steps = data.get("steps") if isinstance(data, dict) else None
        if not isinstance(steps, list) or not steps:
            raise ValueError("no steps")
        return {
            "play_name": str(data.get("play_name") or fallback["play_name"]),
            "steps": [
                {
                    "channel": str(s.get("channel", "email")),
                    "delay_days": int(s.get("delay_days", 0)),
                    "subject": str(s.get("subject", "")),
                    "body": str(s.get("body", "")),
                }
                for s in steps
                if isinstance(s, dict)
            ],
            "fit_score": fit["fit_score"],
            "tier": tier,
            "source": "llm",
        }
    except Exception as exc:  # noqa: BLE001
        log.warning("recommend_play_copy fell back: %s", exc)
        return {**fallback, "fit_score": fit["fit_score"], "tier": tier, "source": "fallback"}


# ── 3) Suggest play structure ───────────────────────────────────────────── #

async def suggest_play(
    db: AsyncSession,
    ws_id: uuid.UUID,
    tier: str = "tier_2",
) -> dict[str, Any]:
    """Propose a play template based on tier + ICP."""
    icp = await _load_icp(db, ws_id)
    fallback = _fallback_play_copy("Target Account", tier, None)

    user = (
        f"Design a reusable ABM play template for {tier} accounts.\n"
        f"ICP: {icp or 'not provided'}\n"
        "The play should have 2-5 steps across email, linkedin, content, ad, "
        "call, task channels. Include realistic delays between steps.\n"
        'Return JSON: {"play_name": str, "description": str, '
        '"steps": [{"channel": str, "delay_days": int, "subject": str, '
        '"body": str}]}'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        steps = data.get("steps") if isinstance(data, dict) else None
        if not isinstance(steps, list) or not steps:
            raise ValueError("no steps")
        return {
            "play_name": str(data.get("play_name") or fallback["play_name"]),
            "description": str(data.get("description") or ""),
            "steps": [
                {
                    "channel": str(s.get("channel", "email")),
                    "delay_days": int(s.get("delay_days", 0)),
                    "subject": str(s.get("subject", "")),
                    "body": str(s.get("body", "")),
                }
                for s in steps
                if isinstance(s, dict)
            ],
            "source": "llm",
        }
    except Exception as exc:  # noqa: BLE001
        log.warning("suggest_play fell back: %s", exc)
        return {
            **fallback,
            "description": "Default play template based on account tier.",
            "source": "fallback",
        }
