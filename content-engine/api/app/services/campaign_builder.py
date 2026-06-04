"""Campaign Builder service.

Assembles a full, structured campaign pack (timeline, assets, budget split and
measurement plan) from a set of inputs, grounded in the workspace brand brain and
optionally a referenced insight/strategy.

The LLM does the heavy lifting via :func:`build_campaign_pack`, but every code path
is defensive: if the model is unconfigured, errors out, or returns unparseable
JSON, we fall back to a deterministic template pack so the API never crashes.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.llm.adapters import complete_json

logger = logging.getLogger(__name__)

DEFAULT_CHANNELS = ["linkedin", "email", "blog", "ads"]

# Map a channel to a sensible default ContentType string (must match
# app.models.content.ContentType values).
CHANNEL_CONTENT_TYPE = {
    "linkedin": "social_post",
    "twitter": "social_post",
    "x": "social_post",
    "instagram": "social_post",
    "facebook": "social_post",
    "social": "social_post",
    "email": "newsletter",
    "newsletter": "newsletter",
    "blog": "blog",
    "seo": "blog",
    "ads": "ad_copy",
    "ppc": "ad_copy",
    "paid": "ad_copy",
    "lead_magnet": "lead_magnet",
}


def content_type_for_channel(channel: str) -> str:
    """Best-effort mapping from a free-form channel name to a ContentType value."""
    key = (channel or "").strip().lower()
    return CHANNEL_CONTENT_TYPE.get(key, "social_post")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_start(start_date: Any) -> datetime:
    if isinstance(start_date, datetime):
        return start_date
    if isinstance(start_date, str) and start_date:
        try:
            return datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            pass
    return _now()


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


# --------------------------------------------------------------------------- #
# Prompt builder
# --------------------------------------------------------------------------- #
SYSTEM_PROMPT = (
    "You are a senior B2B growth marketing strategist. You design complete, "
    "actionable campaign packs that a small team can execute immediately. You "
    "always ground your recommendations in the provided brand voice, audience and "
    "strategy. You respond with STRICT JSON only — no prose, no markdown fences."
)


def _brand_block(brand: dict | None) -> str:
    if not brand:
        return "No brand brain available."
    parts = []
    if brand.get("mission"):
        parts.append(f"Mission: {brand['mission']}")
    if brand.get("value_prop"):
        parts.append(f"Value proposition: {brand['value_prop']}")
    if brand.get("voice"):
        parts.append(f"Voice: {brand['voice']}")
    if brand.get("audience"):
        parts.append(f"Audience: {brand['audience']}")
    if brand.get("pillars"):
        parts.append(f"Content pillars: {brand['pillars']}")
    if brand.get("keywords"):
        parts.append(f"Keywords: {brand['keywords']}")
    return "\n".join(parts) or "No brand brain available."


def _grounding_block(insight: dict | None, strategy: dict | None) -> str:
    parts: list[str] = []
    if insight:
        parts.append(
            "Source insight (demand signal to anchor the campaign on):\n"
            f"- {insight.get('text')} (kind={insight.get('kind')}, intent={insight.get('intent')})"
        )
    if strategy:
        parts.append(
            "Source strategy (align the campaign to this):\n"
            f"- Title: {strategy.get('title')}\n"
            f"- Objective: {strategy.get('objective')}\n"
            f"- Positioning: {strategy.get('positioning')}\n"
            f"- Pillars: {strategy.get('pillars')}\n"
            f"- KPIs: {strategy.get('kpis')}"
        )
    return "\n\n".join(parts) or "No referenced insight or strategy."


def build_prompt(brand: dict | None, inputs: dict) -> tuple[str, list[dict[str, str]]]:
    """Return (system, messages) for the campaign-pack LLM call."""
    channels = inputs.get("channels") or DEFAULT_CHANNELS
    start = _coerce_start(inputs.get("start_date"))
    user = f"""Design a complete campaign pack as STRICT JSON.

BRAND CONTEXT:
{_brand_block(brand)}

GROUNDING:
{_grounding_block(inputs.get("insight"), inputs.get("strategy"))}

CAMPAIGN INPUTS:
- Name: {inputs.get('name') or '(generate a strong campaign name)'}
- Goal: {inputs.get('goal')}
- Audience: {inputs.get('audience') or '(use brand audience)'}
- Offer: {inputs.get('offer') or '(none specified — infer a relevant offer)'}
- Channels: {channels}
- Total budget: {inputs.get('budget') if inputs.get('budget') is not None else '(unspecified)'}
- Start date (phase 0 anchor): {_iso(start)}

Return JSON with EXACTLY this shape:
{{
  "name": "string campaign name",
  "summary": "1-2 sentence campaign summary",
  "timeline": [
    {{"phase": "Awareness", "start_offset_days": 0, "duration_days": 14,
      "objective": "string", "key_activities": ["..."]}}
  ],
  "assets": [
    {{"channel": "linkedin", "type": "LinkedIn post series", "title": "string",
      "brief": "short actionable brief", "quantity": 1, "to_content": true,
      "content_type": "social_post"}}
  ],
  "budget_split": {{"linkedin": 0.4, "email": 0.2, "blog": 0.1, "ads": 0.3}},
  "measurement": [
    {{"kpi": "MQLs", "target": "50", "channel": "all", "cadence": "weekly"}}
  ]
}}

Rules:
- Create one timeline phase per logical stage (awareness, consideration, conversion, retention) appropriate to the goal.
- Provide at least one asset per requested channel; include lead magnet + email sequence + ad set where relevant.
- "to_content": true means a draft ContentItem should be created for it.
- "content_type" MUST be one of: social_post, thread, blog, newsletter, lead_magnet, ad_copy.
- budget_split values are fractions that sum to ~1.0 across the channels.
- Return JSON only."""
    return SYSTEM_PROMPT, [{"role": "user", "content": user}]


# --------------------------------------------------------------------------- #
# Deterministic fallback template
# --------------------------------------------------------------------------- #
def fallback_pack(inputs: dict) -> dict:
    """A sensible deterministic campaign pack built purely from the inputs."""
    channels = [c for c in (inputs.get("channels") or DEFAULT_CHANNELS) if c]
    if not channels:
        channels = list(DEFAULT_CHANNELS)
    goal = inputs.get("goal") or "Grow qualified pipeline"
    audience = inputs.get("audience") or "target audience"
    offer = inputs.get("offer")
    name = inputs.get("name") or f"Campaign: {goal}"

    phases = [
        ("Awareness", 0, 14, f"Build awareness with {audience} around: {goal}"),
        ("Consideration", 14, 14, "Nurture interest with proof, education and lead magnets"),
        ("Conversion", 28, 14, f"Drive conversions{(' for ' + offer) if offer else ''}"),
        ("Retention", 42, 14, "Re-engage and expand with existing leads/customers"),
    ]
    timeline = [
        {
            "phase": ph,
            "start_offset_days": off,
            "duration_days": dur,
            "objective": obj,
            "key_activities": [f"Publish across {', '.join(channels)}"],
        }
        for (ph, off, dur, obj) in phases
    ]

    asset_templates = {
        "social_post": ("Post series", "A 4-part post series tailored to the goal and audience."),
        "newsletter": ("Email sequence", "A 3-email nurture sequence driving toward the offer."),
        "blog": ("Cornerstone blog", "An SEO cornerstone article addressing the core demand."),
        "ad_copy": ("Ad set", "A paid ad set with 2-3 variants for testing."),
        "lead_magnet": ("Lead magnet", "A downloadable lead magnet to capture demand."),
        "thread": ("Thread", "A narrative thread expanding the core message."),
    }
    assets = []
    for ch in channels:
        ct = content_type_for_channel(ch)
        label, brief = asset_templates.get(ct, ("Content piece", "On-brand content for this channel."))
        assets.append(
            {
                "channel": ch,
                "type": f"{ch.title()} {label}",
                "title": f"{name} — {ch.title()}",
                "brief": brief,
                "quantity": 1,
                "to_content": True,
                "content_type": ct,
            }
        )
    # Always include a lead magnet if not already covered.
    if not any(a["content_type"] == "lead_magnet" for a in assets):
        assets.append(
            {
                "channel": "lead_magnet",
                "type": "Lead magnet",
                "title": f"{name} — Lead Magnet",
                "brief": "A downloadable asset to capture and qualify demand.",
                "quantity": 1,
                "to_content": True,
                "content_type": "lead_magnet",
            }
        )

    share = round(1.0 / len(channels), 4)
    budget_split = {ch: share for ch in channels}

    measurement = [
        {"kpi": "Reach / Impressions", "target": "TBD", "channel": "all", "cadence": "weekly"},
        {"kpi": "Leads (MQLs)", "target": "TBD", "channel": "all", "cadence": "weekly"},
        {"kpi": "Conversions", "target": "TBD", "channel": "all", "cadence": "weekly"},
        {"kpi": "Cost per lead", "target": "TBD", "channel": "ads", "cadence": "weekly"},
    ]

    return {
        "name": name,
        "summary": f"Multi-channel campaign to {goal.lower()} across {', '.join(channels)}.",
        "timeline": timeline,
        "assets": assets,
        "budget_split": budget_split,
        "measurement": measurement,
        "_fallback": True,
    }


# --------------------------------------------------------------------------- #
# Normaliser
# --------------------------------------------------------------------------- #
def _normalise_pack(pack: dict, inputs: dict) -> dict:
    """Coerce an LLM pack into the canonical shape, filling gaps from the fallback."""
    template = fallback_pack(inputs)
    out: dict[str, Any] = {}
    out["name"] = pack.get("name") or template["name"]
    out["summary"] = pack.get("summary") or template["summary"]

    timeline = pack.get("timeline")
    out["timeline"] = timeline if isinstance(timeline, list) and timeline else template["timeline"]

    assets = pack.get("assets")
    if isinstance(assets, list) and assets:
        valid_types = {"social_post", "thread", "blog", "newsletter", "lead_magnet", "ad_copy"}
        norm_assets = []
        for a in assets:
            if not isinstance(a, dict):
                continue
            ch = a.get("channel") or "social"
            ct = a.get("content_type")
            if ct not in valid_types:
                ct = content_type_for_channel(str(ch))
            norm_assets.append(
                {
                    "channel": ch,
                    "type": a.get("type") or "Content piece",
                    "title": a.get("title") or f"{out['name']} — {ch}",
                    "brief": a.get("brief") or "",
                    "quantity": a.get("quantity") or 1,
                    "to_content": bool(a.get("to_content", True)),
                    "content_type": ct,
                }
            )
        out["assets"] = norm_assets or template["assets"]
    else:
        out["assets"] = template["assets"]

    bs = pack.get("budget_split")
    out["budget_split"] = bs if isinstance(bs, dict) and bs else template["budget_split"]

    meas = pack.get("measurement")
    out["measurement"] = meas if isinstance(meas, list) and meas else template["measurement"]

    return out


# --------------------------------------------------------------------------- #
# Public entrypoint
# --------------------------------------------------------------------------- #
async def build_campaign_pack(brand: dict | None, inputs: dict) -> dict:
    """Assemble a full campaign pack. Never raises — falls back deterministically."""
    try:
        system, messages = build_prompt(brand, inputs)
        raw = await complete_json(messages, system)
        if not isinstance(raw, dict) or raw.get("_parse_error") or raw.get("_raw"):
            logger.warning("Campaign LLM returned unparseable JSON; using fallback pack")
            return fallback_pack(inputs)
        return _normalise_pack(raw, inputs)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Campaign pack generation failed (%s); using fallback", exc)
        return fallback_pack(inputs)
