"""Influencers Agent — the agentic AI brain for creator discovery & outreach.

SENSE -> read real workspace rows (creators, campaigns, UGC) + brand/ICP voice.
DIAGNOSE -> rank pipeline gaps and pending UGC rights.
PLAN/ACT -> draft personalized outreach, describe ideal-creator personas,
            and suggest the next best step per creator.

Every call is grounded in real DB rows. A deterministic fallback guarantees the
feature never hard-fails when the LLM is unavailable.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json, complete
from app.models.influencers import Creator, InfluencerCampaign, UGCAsset

log = logging.getLogger("influencers_agent")

SYSTEM = (
    "You are an expert influencer-marketing and creator-partnerships strategist. "
    "You ground every recommendation in the brand's ICP and voice and in the real "
    "creator data provided. Respond with strict JSON only — no prose, no markdown."
)

# Next-step heuristics per pipeline stage (deterministic fallback + grounding).
_STAGE_NEXT_STEP = {
    "prospect": "Research fit and send a first personalized outreach.",
    "contacted": "Follow up; share the brief and proposed deliverables.",
    "negotiating": "Align on rate card and lock deliverables + timeline.",
    "active": "Collect deliverables and request UGC usage rights.",
    "completed": "Capture results, request testimonial, nurture for re-engagement.",
}


async def _load_brand_voice(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    """Pull brand/ICP voice context if available — best effort, never fatal."""
    ctx: dict[str, Any] = {}
    try:
        from app.models import BrandBrain  # local import to avoid hard coupling

        bb = (
            await db.execute(
                select(BrandBrain).where(BrandBrain.workspace_id == ws_id)
            )
        ).scalar_one_or_none()
        if bb is not None:
            ctx["mission"] = bb.mission
            ctx["value_prop"] = bb.value_prop
            ctx["voice"] = bb.voice
            ctx["audience"] = bb.audience
            ctx["keywords"] = bb.keywords
    except Exception:  # noqa: BLE001 — brand context is optional
        log.debug("brand voice unavailable for ws=%s", ws_id)
    try:
        from app.models.icp import ICPProfile

        icp = (
            await db.execute(
                select(ICPProfile).where(ICPProfile.workspace_id == ws_id)
            )
        ).scalar_one_or_none()
        if icp is not None:
            ctx.setdefault("value_prop", icp.value_prop)
            ctx["industry"] = icp.industry
            ctx["target_customer"] = icp.target_customer
            ctx["brand_voice"] = icp.brand_voice
            ctx["personas"] = icp.personas
            ctx.setdefault("keywords", icp.keywords)
    except Exception:  # noqa: BLE001
        log.debug("icp unavailable for ws=%s", ws_id)
    return {k: v for k, v in ctx.items() if v}


# --------------------------------------------------------------------------- #
# 1) Find ideal creator persona for a brief
# --------------------------------------------------------------------------- #
async def find_match_brief(db: AsyncSession, ws_id: uuid.UUID, brief: str) -> dict:
    """Describe the ideal creator persona + search keywords + outreach angle."""
    brand = await _load_brand_voice(db, ws_id)
    user = (
        f"Brand context (ICP / voice): {brand or 'not yet defined'}\n"
        f"Campaign brief: {brief}\n\n"
        "Design the ideal creator we should partner with for this brief. "
        "Return JSON with EXACTLY these keys:\n"
        '{"persona": "1-2 sentence ideal-creator description",\n'
        ' "platforms": ["instagram"|"youtube"|"tiktok"|"x"|"linkedin", ...],\n'
        ' "niches": ["..."],\n'
        ' "follower_range": "e.g. 10k-50k micro",\n'
        ' "min_engagement_rate": 0.0,\n'
        ' "search_keywords": ["hashtags or search terms to find them"],\n'
        ' "outreach_angle": "the hook/angle that will resonate",\n'
        ' "rationale": "why this fits the ICP"}'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        if isinstance(data, dict) and not data.get("_parse_error") and data.get("persona"):
            return data
    except Exception as exc:  # noqa: BLE001
        log.warning("find_match_brief LLM failed: %s", exc)

    # Deterministic fallback grounded in brand keywords.
    kws = brand.get("keywords") or []
    if isinstance(kws, list):
        kws = [str(k) for k in kws][:6]
    else:
        kws = []
    niche_seed = brand.get("industry") or "the brand's category"
    return {
        "persona": (
            f"A trusted micro-creator in {niche_seed} whose audience matches our ICP "
            "and who produces authentic, high-engagement content."
        ),
        "platforms": ["instagram", "tiktok"],
        "niches": [str(niche_seed)],
        "follower_range": "10k-50k micro",
        "min_engagement_rate": 0.03,
        "search_keywords": kws or [str(niche_seed)],
        "outreach_angle": (
            "Lead with shared audience values and a clear, low-friction first collaboration."
        ),
        "rationale": (
            "Micro-creators in the brand's category typically deliver the best "
            "engagement-to-cost ratio and authentic alignment with the ICP."
        ),
        "_fallback": True,
    }


# --------------------------------------------------------------------------- #
# 2) Personalized outreach draft
# --------------------------------------------------------------------------- #
async def outreach_draft(
    db: AsyncSession,
    ws_id: uuid.UUID,
    creator_id: uuid.UUID,
    goal: str,
) -> dict:
    """Draft a personalized outreach message for a specific creator."""
    creator = (
        await db.execute(
            select(Creator).where(
                Creator.workspace_id == ws_id, Creator.id == creator_id
            )
        )
    ).scalar_one_or_none()
    if creator is None:
        return {"error": "creator_not_found"}

    brand = await _load_brand_voice(db, ws_id)
    channel = "email" if creator.email else "dm"
    user = (
        f"Brand context (ICP / voice): {brand or 'not yet defined'}\n"
        f"Creator: name={creator.name}, handle=@{creator.handle}, "
        f"platform={creator.platform}, niche={creator.niche or 'unknown'}, "
        f"followers={creator.followers}, engagement_rate={creator.engagement_rate}\n"
        f"Outreach goal: {goal}\n"
        f"Preferred channel: {channel}\n\n"
        "Write a concise, personalized, non-generic outreach message that references "
        "the creator's niche and platform and reflects the brand voice. "
        "Return JSON: {\"channel\": \"email\"|\"dm\", \"subject\": \"...\" (null for dm), "
        "\"body\": \"the message\"}"
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        if isinstance(data, dict) and not data.get("_parse_error") and data.get("body"):
            data.setdefault("channel", channel)
            if data["channel"] == "dm":
                data["subject"] = None
            return data
    except Exception as exc:  # noqa: BLE001
        log.warning("outreach_draft LLM failed: %s", exc)

    # Deterministic fallback — still personalized from real creator fields.
    niche = creator.niche or f"{creator.platform} content"
    subject = None
    if channel == "email":
        subject = f"Partnering with you on {niche}"
    body = (
        f"Hi {creator.name},\n\n"
        f"We've been following your {niche} content on {creator.platform} and love how "
        "it resonates with your audience. "
        f"{goal.strip() or 'We would love to explore a collaboration.'}\n\n"
        "Would you be open to a quick chat about a partnership? Happy to share a brief "
        "and proposed deliverables.\n\nBest,\nThe team"
    )
    return {"channel": channel, "subject": subject, "body": body, "_fallback": True}


# --------------------------------------------------------------------------- #
# 3) Autonomy cycle — next-step per creator + pending UGC rights
# --------------------------------------------------------------------------- #
async def run_cycle(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Suggest the next step for each pipeline creator and flag UGC rights gaps."""
    creators = list(
        (
            await db.execute(
                select(Creator)
                .where(Creator.workspace_id == ws_id)
                .order_by(Creator.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    ugc = list(
        (
            await db.execute(
                select(UGCAsset).where(UGCAsset.workspace_id == ws_id)
            )
        )
        .scalars()
        .all()
    )
    campaigns = list(
        (
            await db.execute(
                select(InfluencerCampaign).where(
                    InfluencerCampaign.workspace_id == ws_id
                )
            )
        )
        .scalars()
        .all()
    )

    suggestions: list[dict[str, Any]] = []
    for c in creators:
        if c.stage == "completed":
            continue
        suggestions.append(
            {
                "creator_id": str(c.id),
                "name": c.name,
                "handle": c.handle,
                "stage": c.stage,
                "next_step": _STAGE_NEXT_STEP.get(
                    c.stage, "Review and advance this relationship."
                ),
            }
        )

    rights_pending = [
        {
            "asset_id": str(a.id),
            "url": a.url,
            "type": a.type,
            "usage_rights": a.usage_rights,
        }
        for a in ugc
        if a.usage_rights in ("none", "requested")
    ]

    return {
        "workspace_id": str(ws_id),
        "creators_in_pipeline": len(suggestions),
        "suggestions": suggestions,
        "ugc_rights_pending": rights_pending,
        "active_campaigns": sum(1 for x in campaigns if x.status == "live"),
    }
