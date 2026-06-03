"""Ads agent — generates a complete, execution-ready paid campaign plan.

Produces keyword themes, ad groups, RSA headlines/descriptions, audiences,
negative keywords, budget allocation and an optimization playbook. Works for
standard Google Ads and for Google Ad Grants (nonprofit) constraints.
"""
from __future__ import annotations

import json
from typing import Any

from app.llm.adapters import _extract_json, complete

ADS_SYSTEM = (
    "You are a senior paid-media strategist and Google Ads expert. Design a complete, "
    "launch-ready campaign. Be concrete and compliant.\n\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "name": "campaign name",\n'
    '  "objective": "...",\n'
    '  "recommended_daily_budget": 0,\n'
    '  "ad_groups": [\n'
    "    {\n"
    '      "name": "...",\n'
    '      "keywords": [{"text": "...", "match": "phrase|exact|broad"}],\n'
    '      "negative_keywords": ["..."],\n'
    '      "headlines": ["<=30 chars each, 8-12 of them"],\n'
    '      "descriptions": ["<=90 chars each, 3-4 of them"],\n'
    '      "final_url_path": "/landing"\n'
    "    }\n"
    "  ],\n"
    '  "audiences": ["..."],\n'
    '  "extensions": {"sitelinks": ["..."], "callouts": ["..."]},\n'
    '  "optimization_playbook": ["weekly actions the agent will take"],\n'
    '  "kpis": [{"metric": "...", "target": "..."}]\n'
    "}\n"
    "If is_grant is true: keep keywords mostly exact/phrase, avoid single-word keywords, "
    "keep max CPC <= $2.00, and ensure quality-score-friendly tightly-themed ad groups."
)


async def generate_campaign(
    *,
    objective: str,
    product: str,
    is_grant: bool,
    daily_budget: float | None,
    brand: dict[str, Any] | None,
    strategy: dict[str, Any] | None,
) -> dict[str, Any]:
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
        f"PRODUCT/SERVICE: {product}\n"
        f"OBJECTIVE: {objective}\n"
        f"IS_GRANT (Google Ad Grants nonprofit): {is_grant}\n"
        f"DAILY_BUDGET HINT: {daily_budget if daily_budget is not None else 'recommend one'}\n"
    )
    raw = await complete([{"role": "user", "content": prompt}], ADS_SYSTEM)
    try:
        return json.loads(_extract_json(raw))
    except json.JSONDecodeError:
        return {"name": product[:60], "objective": objective, "_raw": raw[:4000]}
