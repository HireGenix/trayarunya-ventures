"""Strategy agent — turns a research brief into a master content + social strategy.

Uses DSPy when available (GPT-5.5 backend) for a typed, optimizable Signature, and
falls back to a strict-JSON LLM call when DSPy/credentials are absent so the endpoint
always works.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any

from app.llm.adapters import _extract_json, complete
from app.llm.dspy_config import configure_dspy

_STRATEGY_BASE = (
    "You are the Chief Strategy Officer of an elite B2B/B2C/D2C marketing partner. "
    "You treat the client's growth as your own. From the research brief and the "
    "Ideal Customer Profile, design a complete, execution-ready content + social "
    "strategy. Be specific and opinionated.\n\n"
)

_STRATEGY_SCHEMA_TAIL = (
    "  \"funnel\": {\"awareness\": [\"...\"], \"consideration\": [\"...\"], \"decision\": [\"...\"]},\n"
    "  \"lead_magnets\": [{\"title\": \"...\", \"format\": \"...\", \"promise\": \"...\"}],\n"
    "  \"content_calendar\": [{\"week\": 1, \"theme\": \"...\",\n"
    "      \"items\": [{\"platform\": \"...\", \"type\": \"...\", \"hook\": \"...\"}]}],\n"
    "  \"kpis\": [{\"metric\": \"...\", \"target\": \"...\"}]\n"
    "}\n"
    "Make content_calendar cover 4 weeks. Ground every choice in the research and ICP."
)

# Segment-specific channel_plan guidance. Each entry lists the channel_plan keys
# the model MUST produce and the tactical emphasis for that go-to-market motion.
_SEGMENT_CHANNELS: dict[str, str] = {
    "B2B": (
        "This is a B2B motion. channel_plan MUST include keys: \"linkedin_company\", "
        "\"linkedin_personal\", \"email\", \"x\", and \"abm\".\n"
        "CRITICAL: outreach happens from a PERSONAL profile (founder/SDR) while selling "
        "the COMPANY's offer, so the company page and the personal profile must be "
        "ALIGNED in narrative. For linkedin_company give brand-authority cadence/formats; "
        "for linkedin_personal give the founder/SDR's personal-brand cadence, POV posts, "
        "and how it ladders up to the company message. email = nurture + outbound "
        "sequences; abm = named-account plays for the target personas."
    ),
    "B2C": (
        "This is a B2C motion. channel_plan MUST include keys: \"instagram\", \"tiktok\", "
        "\"youtube\", and \"facebook\". Emphasise broad reach, trend-jacking, short-form "
        "video, community and social-first storytelling."
    ),
    "D2C": (
        "This is a D2C motion. channel_plan MUST include keys: \"instagram\", \"tiktok\", "
        "\"meta_ads\", \"email_sms\", and \"influencer_ugc\". Emphasise product-led creative, "
        "shopping behaviour, paid-social scaling, retention via email/SMS, and UGC/creator "
        "partnerships."
    ),
}

_DEFAULT_CHANNELS = (
    "channel_plan MUST include keys: \"linkedin\", \"x\", \"blog\", and \"newsletter\"."
)


def build_strategy_system(segment: str | None) -> str:
    seg = (segment or "").upper()
    channel_guidance = _SEGMENT_CHANNELS.get(seg, _DEFAULT_CHANNELS)
    return (
        _STRATEGY_BASE
        + "Return STRICT JSON:\n"
        + "{\n"
        + '  "title": "...",\n'
        + '  "positioning": "one-paragraph positioning statement",\n'
        + '  "pillars": [{"name": "...", "why": "...", "angles": ["..."]}],\n'
        + '  "channel_plan": {"<channel>": {"cadence": "...", "formats": ["..."]}},\n'
        + _STRATEGY_SCHEMA_TAIL
        + "\n\nCHANNEL STRATEGY:\n"
        + channel_guidance
    )


# Back-compat default (used by DSPy fallback / generic callers).
STRATEGY_SYSTEM = build_strategy_system(None)


def _research_to_prompt(
    brief: dict[str, Any], objective: str | None, icp: dict[str, Any] | None = None
) -> str:
    today = date.today()
    icp_block = ""
    if icp:
        icp_block = f"\n\nIdeal Customer Profile (JSON):\n{json.dumps(icp, ensure_ascii=False)[:8000]}"
    return (
        f"TODAY'S DATE: {today.isoformat()} ({today.strftime('%A, %d %B %Y')}). "
        f"Anchor the calendar and timing to this date.\n\n"
        f"Objective: {objective or 'Grow qualified pipeline and authority.'}"
        f"{icp_block}\n\n"
        f"Research brief (JSON):\n{json.dumps(brief, ensure_ascii=False)[:40000]}"
    )


async def _llm_strategy(
    brief: dict[str, Any], objective: str | None, icp: dict[str, Any] | None = None
) -> dict[str, Any]:
    segment = (icp or {}).get("segment")
    raw = await complete(
        [{"role": "user", "content": _research_to_prompt(brief, objective, icp)}],
        build_strategy_system(segment),
    )
    try:
        return json.loads(_extract_json(raw))
    except json.JSONDecodeError:
        return {"title": "Strategy", "positioning": raw[:2000]}


def _dspy_strategy(
    brief: dict[str, Any], objective: str | None, icp: dict[str, Any] | None = None
) -> dict[str, Any] | None:
    """Optional DSPy path. Returns None if DSPy is unavailable."""
    if not configure_dspy():
        return None
    try:
        import dspy

        class StrategySignature(dspy.Signature):
            """Design a complete, execution-ready content + social strategy as JSON."""

            objective: str = dspy.InputField()
            research_brief: str = dspy.InputField(desc="JSON research brief")
            strategy_json: str = dspy.OutputField(desc="Strict JSON per the required schema")

        predictor = dspy.Predict(StrategySignature)
        seg = (icp or {}).get("segment")
        brief_with_icp = dict(brief)
        if icp:
            brief_with_icp["icp"] = icp
            brief_with_icp["segment"] = seg
        out = predictor(
            objective=objective or "Grow qualified pipeline and authority.",
            research_brief=json.dumps(brief_with_icp, ensure_ascii=False)[:40000],
        )
        return json.loads(_extract_json(out.strategy_json))
    except Exception:
        return None


async def run_strategy(
    brief: dict[str, Any],
    objective: str | None = None,
    icp: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = _dspy_strategy(brief, objective, icp)
    if not data:
        data = await _llm_strategy(brief, objective, icp)
    data.setdefault("title", "Content & Social Strategy")
    return data
