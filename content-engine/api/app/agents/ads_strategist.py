"""Ads strategist agent — generates complete, execution-ready paid campaign plans.

The plan structure adapts to the platform:
  * Google Ads   → keyword themes, ad groups, RSA headlines/descriptions, extensions
  * Meta Ads     → audiences, placements, creative angles, primary text/headlines
  * LinkedIn Ads → professional targeting (title/seniority/industry), sponsored content

All variants also return a budget recommendation, KPI targets and an agentic
optimization playbook the optimizer agent later acts on.
"""
from __future__ import annotations

import json
from typing import Any

from app.llm.adapters import _extract_json, complete

_COMMON_TAIL = (
    '  "audiences": ["specific audience descriptions"],\n'
    '  "optimization_playbook": ["weekly actions the AI agent will take"],\n'
    '  "kpis": [{"metric": "CTR|CPC|CPA|ROAS|Conv. rate", "target": "value"}]\n'
    "}\n"
)

GOOGLE_SYSTEM = (
    "You are a senior Google Ads strategist. Design a complete, launch-ready Search "
    "campaign. Be concrete and policy-compliant.\n\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "name": "campaign name",\n'
    '  "objective": "...",\n'
    '  "channel": "Search",\n'
    '  "recommended_daily_budget": 0,\n'
    '  "ad_groups": [\n'
    "    {\n"
    '      "name": "tightly themed group",\n'
    '      "keywords": [{"text": "...", "match": "phrase|exact|broad"}],\n'
    '      "negative_keywords": ["..."],\n'
    '      "headlines": ["<=30 chars, 8-12 of them"],\n'
    '      "descriptions": ["<=90 chars, 3-4 of them"],\n'
    '      "final_url_path": "/landing"\n'
    "    }\n"
    "  ],\n"
    '  "extensions": {"sitelinks": ["..."], "callouts": ["..."]},\n'
    + _COMMON_TAIL
    + "If is_grant is true (Google Ad Grants nonprofit), follow Ad Grants policy: "
    "eligible campaign types are Search (Responsive Search Ads) and Performance Max "
    "for Grantees only — never Display, Video or Shopping. Use Maximize Conversions "
    "bidding (no manual CPC cap required), enforce a budget no higher than $329/day "
    "($10,000/mo), require conversion tracking, keep keywords mostly exact/phrase, "
    "avoid single-word and overly generic keywords, maintain a 5%+ CTR, and use "
    "tightly-themed ad groups. Set \"channel\" to \"Search\" or \"Performance Max\" "
    "accordingly and add \"bidding\": \"Maximize Conversions\"."
)

META_SYSTEM = (
    "You are a senior Meta (Facebook/Instagram) Ads strategist. Design a complete, "
    "launch-ready campaign optimized for the funnel stage implied by the objective.\n\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "name": "campaign name",\n'
    '  "objective": "Awareness|Traffic|Engagement|Leads|Sales",\n'
    '  "recommended_daily_budget": 0,\n'
    '  "placements": ["Facebook Feed", "Instagram Reels", "Stories", "..."],\n'
    '  "ad_sets": [\n'
    "    {\n"
    '      "name": "audience-based ad set",\n'
    '      "targeting": {"interests": ["..."], "behaviors": ["..."], "lookalike": "1-3% of ...", "age_range": "25-54", "geo": ["..."]},\n'
    '      "creative_angles": ["hook/angle to test"],\n'
    '      "primary_texts": ["<=125 chars, 3-4"],\n'
    '      "headlines": ["<=40 chars, 3-4"],\n'
    '      "call_to_action": "Learn More|Sign Up|Shop Now"\n'
    "    }\n"
    "  ],\n"
    + _COMMON_TAIL
)

LINKEDIN_SYSTEM = (
    "You are a senior LinkedIn Ads strategist focused on B2B demand generation. "
    "Design a complete, launch-ready Sponsored Content campaign.\n\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "name": "campaign name",\n'
    '  "objective": "Brand Awareness|Website Visits|Engagement|Lead Generation",\n'
    '  "ad_format": "Single Image|Carousel|Document|Video|Message",\n'
    '  "recommended_daily_budget": 0,\n'
    '  "ad_sets": [\n'
    "    {\n"
    '      "name": "segment-based ad set",\n'
    '      "targeting": {"job_titles": ["..."], "seniorities": ["Manager","Director","VP","CXO"], "industries": ["..."], "company_size": ["51-200","201-500"], "skills": ["..."], "geo": ["..."]},\n'
    '      "intro_texts": ["<=150 chars, 3-4"],\n'
    '      "headlines": ["<=70 chars, 3-4"],\n'
    '      "call_to_action": "Learn More|Download|Register|Request Demo"\n'
    "    }\n"
    "  ],\n"
    '  "lead_gen_form": {"fields": ["Name","Work Email","Company","Job Title"], "headline": "..."},\n'
    + _COMMON_TAIL
)

_SYSTEMS = {
    "google_ads": GOOGLE_SYSTEM,
    "meta_ads": META_SYSTEM,
    "linkedin_ads": LINKEDIN_SYSTEM,
}


async def generate_campaign(
    *,
    platform: str,
    objective: str,
    product: str,
    is_grant: bool,
    daily_budget: float | None,
    audience: str | None = None,
    locations: list[str] | None = None,
    brand: dict[str, Any] | None,
    strategy: dict[str, Any] | None,
) -> dict[str, Any]:
    system = _SYSTEMS.get(platform, GOOGLE_SYSTEM)

    ctx = ""
    if brand:
        ctx += "BRAND:\n" + json.dumps(
            {k: brand.get(k) for k in ("value_prop", "audience", "keywords")},
            ensure_ascii=False,
        )[:5000]
    if strategy:
        ctx += "\nSTRATEGY:\n" + json.dumps(
            {k: strategy.get(k) for k in ("positioning", "funnel")},
            ensure_ascii=False,
        )[:4000]

    prompt = (
        f"{ctx}\n\n"
        f"PLATFORM: {platform}\n"
        f"PRODUCT/SERVICE: {product}\n"
        f"OBJECTIVE: {objective}\n"
        f"TARGET AUDIENCE: {audience or 'infer from brand/strategy'}\n"
        f"TARGET LOCATIONS: {', '.join(locations) if locations else 'infer best-fit markets'}\n"
        f"IS_GRANT (Google Ad Grants nonprofit): {is_grant}\n"
        f"DAILY_BUDGET HINT: {daily_budget if daily_budget is not None else 'recommend one'}\n"
    )
    raw = await complete([{"role": "user", "content": prompt}], system)
    try:
        plan = json.loads(_extract_json(raw))
    except json.JSONDecodeError:
        return {"name": product[:60], "objective": objective, "_raw": raw[:4000]}
    plan.setdefault("name", product[:60])
    plan.setdefault("objective", objective)
    plan["platform"] = platform
    return plan
