"""Brand Brain agent — turns a scraped site profile into a structured brand identity.

Scrapes the homepage (colors, logo, copy), then uses the LLM to infer mission,
value proposition, brand voice, target audience, content pillars and keywords.
Falls back gracefully to the scraped facts if no LLM is configured.
"""
from __future__ import annotations

import json
from typing import Any

from app.llm.adapters import _extract_json, complete
from app.tools.brand_extract import extract_brand

BRAND_SYSTEM = (
    "You are a senior brand strategist. From a company's homepage content, infer a "
    "precise, usable brand brain. Be specific; avoid generic filler.\n\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "mission": "one sentence",\n'
    '  "value_prop": "one crisp sentence on the core value",\n'
    '  "voice": {"tone": ["..."], "style": "...", "do": ["..."], "dont": ["..."]},\n'
    '  "audience": {"segments": [{"name": "...", "pains": ["..."], "desires": ["..."]}],\n'
    '               "icp": "ideal customer profile"},\n'
    '  "pillars": [{"name": "...", "description": "..."}],\n'
    '  "keywords": ["..."]\n'
    "}\n"
)


async def build_brand(website: str) -> dict[str, Any]:
    profile = await extract_brand(website)
    result: dict[str, Any] = {
        "website": profile.url,
        "primary_color": profile.primary_color,
        "accent_color": profile.accent_color,
        "palette": profile.palette,
        "logo_url": profile.logo_url,
        "social_links": profile.social_links,
        "profile": profile.to_dict(),
    }
    if not profile.ok:
        result["error"] = profile.error
        return result

    prompt = (
        f"Company site: {profile.url}\n"
        f"Title: {profile.title}\n"
        f"Description: {profile.description}\n\n"
        f"Homepage text:\n{profile.text[:16000]}"
    )
    try:
        raw = await complete([{"role": "user", "content": prompt}], BRAND_SYSTEM)
        enriched = json.loads(_extract_json(raw))
    except Exception as exc:  # noqa: BLE001
        enriched = {"value_prop": profile.description, "_llm_error": str(exc)[:300]}

    result.update(
        {
            "mission": enriched.get("mission"),
            "value_prop": enriched.get("value_prop") or profile.description,
            "voice": enriched.get("voice"),
            "audience": enriched.get("audience"),
            "pillars": enriched.get("pillars"),
            "keywords": enriched.get("keywords"),
        }
    )
    return result
