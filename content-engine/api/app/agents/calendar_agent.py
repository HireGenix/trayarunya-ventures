"""Content Calendar agent — builds a date-wise, multi-platform content calendar.

The agent is *date-aware*: it is told today's date and the exact window to plan
for, so it always produces a calendar anchored to the real current date (e.g.
"plan June from the 3rd onward"). It spreads content across every channel the
client cares about — social networks, the website/blog, and community/long-form
platforms like Quora, Reddit and Medium — grounded in the brand and strategy.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any

from app.llm.adapters import Provider, _extract_json, complete

# Default channel mix. The website/blog + community platforms are first-class so
# the calendar is never "socials only".
DEFAULT_PLATFORMS = [
    "linkedin",
    "x",
    "instagram",
    "facebook",
    "youtube",
    "blog",
    "newsletter",
    "quora",
    "reddit",
    "medium",
]

# Sensible content_type per platform (used to nudge the model + as a fallback).
PLATFORM_DEFAULT_TYPE = {
    "linkedin": "social_post",
    "x": "thread",
    "instagram": "social_post",
    "facebook": "social_post",
    "youtube": "social_post",
    "blog": "blog",
    "website": "blog",
    "newsletter": "newsletter",
    "quora": "social_post",
    "reddit": "social_post",
    "medium": "blog",
    "tiktok": "social_post",
}

# Post FORMAT per platform — drives which asset we build (image/carousel/pdf/none).
VALID_FORMATS = {"static", "carousel", "pdf", "text", "video_script"}
PLATFORM_DEFAULT_FORMAT = {
    "linkedin": "pdf",
    "x": "text",
    "instagram": "carousel",
    "facebook": "static",
    "youtube": "video_script",
    "blog": "text",
    "website": "text",
    "newsletter": "text",
    "quora": "text",
    "reddit": "text",
    "medium": "text",
    "tiktok": "video_script",
    "pinterest": "static",
    "threads": "static",
}


def default_format(platform: str, content_type: str) -> str:
    if content_type == "thread":
        return "text"
    if content_type in ("blog", "newsletter"):
        return "text"
    return PLATFORM_DEFAULT_FORMAT.get(platform, "static")

CALENDAR_SYSTEM = (
    "You are the Head of Content Planning at an elite B2B/B2C/D2C marketing partner "
    "that treats the client's growth as its own. You build precise, execution-ready "
    "content calendars.\n\n"
    "You are DATE-AWARE. You will be given today's date and the exact planning window. "
    "Plan ONLY within that window, starting from the given start date. Distribute "
    "content intelligently across the requested platforms — respect each platform's "
    "norms (LinkedIn thought-leadership, X threads, Instagram visual hooks, YouTube "
    "scripts, blog/Medium long-form SEO, Quora/Reddit helpful expert answers, "
    "newsletter digests). Sequence themes so they build a narrative across the month "
    "and move the audience through awareness -> consideration -> decision.\n\n"
    "Return STRICT JSON ONLY:\n"
    "{\n"
    '  "entries": [\n'
    "    {\n"
    '      "date": "YYYY-MM-DD",            // within the window\n'
    '      "platform": "linkedin",          // one of the requested platforms\n'
    '      "content_type": "social_post",   // social_post|thread|blog|newsletter|lead_magnet|ad_copy\n'
    '      "format": "static",              // static|carousel|pdf|text|video_script (the asset to design)\n'
    '      "title": "short working title",\n'
    '      "hook": "the scroll-stopping angle",\n'
    '      "theme": "the pillar/theme this serves",\n'
    '      "funnel_stage": "awareness|consideration|decision",\n'
    '      "notes": "what to cover / CTA / format guidance"\n'
    "    }\n"
    "  ]\n"
    "}\n"
    "Aim for a realistic, sustainable cadence (not every platform every day). "
    "Prioritise weekdays for B2B.\n"
    "Pick a sensible FORMAT per entry: 'carousel' for Instagram/visual storytelling, "
    "'pdf' for LinkedIn document/slide posts, 'static' for single-image posts, "
    "'video_script' for YouTube/TikTok, and 'text' for X threads, blogs, newsletters and "
    "community answers. Cover the FULL window."
)


def _ctx_block(brand: dict[str, Any] | None, strategy: dict[str, Any] | None) -> str:
    parts: list[str] = []
    if brand:
        parts.append(
            "BRAND:\n"
            + json.dumps(
                {
                    "mission": brand.get("mission"),
                    "value_prop": brand.get("value_prop"),
                    "voice": brand.get("voice"),
                    "audience": brand.get("audience"),
                    "pillars": brand.get("pillars"),
                    "keywords": brand.get("keywords"),
                },
                ensure_ascii=False,
            )[:8000]
        )
    if strategy:
        parts.append(
            "STRATEGY:\n"
            + json.dumps(
                {
                    "positioning": strategy.get("positioning"),
                    "pillars": strategy.get("pillars"),
                    "funnel": strategy.get("funnel"),
                    "lead_magnets": strategy.get("lead_magnets"),
                },
                ensure_ascii=False,
            )[:6000]
        )
    return "\n\n".join(parts) or "No brand/strategy context yet; infer a credible B2B voice."


async def generate_calendar(
    *,
    client_name: str | None,
    start_date: date,
    end_date: date,
    today: date,
    platforms: list[str],
    brand: dict[str, Any] | None,
    strategy: dict[str, Any] | None,
    goal: str | None = None,
    provider: Provider | None = None,
) -> list[dict[str, Any]]:
    if start_date > end_date:
        start_date, end_date = end_date, start_date
    chosen = [p for p in platforms if p] or DEFAULT_PLATFORMS
    prompt = (
        f"TODAY'S DATE: {today.isoformat()} ({today.strftime('%A, %d %B %Y')})\n"
        f"PLANNING WINDOW: {start_date.isoformat()} to {end_date.isoformat()} "
        f"({(end_date - start_date).days + 1} days)\n"
        f"CLIENT: {client_name or 'the client'}\n"
        f"GOAL: {goal or 'Grow qualified pipeline, authority and demand.'}\n"
        f"PLATFORMS: {', '.join(chosen)}\n\n"
        f"{_ctx_block(brand, strategy)}\n\n"
        "Build the calendar now. Start at the start date, never schedule before it, "
        "and stay within the window."
    )
    raw = await complete([{"role": "user", "content": prompt}], CALENDAR_SYSTEM, provider)
    entries: list[dict[str, Any]] = []
    try:
        data = json.loads(_extract_json(raw))
        if isinstance(data.get("entries"), list):
            entries = data["entries"]
    except json.JSONDecodeError:
        entries = []

    cleaned: list[dict[str, Any]] = []
    for e in entries:
        if not isinstance(e, dict):
            continue
        plat = str(e.get("platform") or "").lower().strip()
        if plat not in chosen:
            # keep it but normalise unknowns to the closest requested platform
            plat = plat if plat else chosen[0]
        ctype = e.get("content_type") or PLATFORM_DEFAULT_TYPE.get(plat, "social_post")
        fmt = str(e.get("format") or "").lower().strip()
        if fmt not in VALID_FORMATS:
            fmt = default_format(plat, ctype)
        d = str(e.get("date") or "").strip()
        if not d or not (start_date.isoformat() <= d <= end_date.isoformat()):
            # Drop empty or out-of-window dates rather than mis-scheduling.
            continue
        cleaned.append(
            {
                "date": d,
                "platform": plat,
                "content_type": ctype,
                "format": fmt,
                "title": e.get("title") or "Untitled",
                "hook": e.get("hook") or "",
                "theme": e.get("theme") or "",
                "funnel_stage": e.get("funnel_stage") or "awareness",
                "notes": e.get("notes") or "",
            }
        )

    cleaned.sort(key=lambda x: (x["date"], x["platform"]))
    return cleaned
