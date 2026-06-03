"""Creation Studio agent — generates execution-ready content grounded in the
workspace brand brain and (optionally) a strategy.

Supports social posts, threads, long-form blogs, newsletters, lead magnets and
ad copy. Returns structured items with title, body and per-platform variants.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any

from app.llm.adapters import Provider, _extract_json, complete

WRITER_SYSTEM = (
    "You are an elite content writer for a B2B/B2C/D2C marketing partner that treats "
    "the client's growth as its own. Write specific, original, high-signal content that "
    "matches the brand voice and drives the stated objective. No fluff, no clichés.\n\n"
    "You will be given: brand context, an optional strategy, the content type, target "
    "platform, and a topic. Produce the requested number of items.\n\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "items": [\n'
    "    {\n"
    '      "title": "short internal title",\n'
    '      "body": "the full content, ready to publish",\n'
    '      "hook": "the scroll-stopping first line",\n'
    '      "hashtags": ["..."],\n'
    '      "cta": "the call to action",\n'
    '      "variants": {"linkedin": "...", "x": "..."}\n'
    "    }\n"
    "  ]\n"
    "}\n"
    "Rules by type:\n"
    "- social_post: 120-220 words, 1 idea, strong hook, line breaks for skimming.\n"
    "- thread: 'body' is the full thread; 'variants.x' splits into numbered tweets.\n"
    "- blog: 700-1200 words with markdown headings and a clear takeaway.\n"
    "- newsletter: subject line in title, scannable sections in body.\n"
    "- lead_magnet: an outline + the actual content for a checklist/guide/template.\n"
    "- ad_copy: 3-5 headline/description pairs inside body, plus variants per platform.\n"
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
                },
                ensure_ascii=False,
            )[:6000]
        )
    return "\n\n".join(parts) or "No brand context yet; infer a credible B2B voice."


async def generate_content(
    *,
    content_type: str,
    topic: str,
    platform: str | None,
    count: int,
    notes: str | None,
    brand: dict[str, Any] | None,
    strategy: dict[str, Any] | None,
    provider: Provider | None = None,
    scheduled_date: str | None = None,
) -> list[dict[str, Any]]:
    today = date.today()
    date_line = f"TODAY'S DATE: {today.isoformat()} ({today.strftime('%A, %d %B %Y')})\n"
    if scheduled_date:
        date_line += f"PUBLISH DATE: {scheduled_date}\n"
    prompt = (
        f"{date_line}"
        f"{_ctx_block(brand, strategy)}\n\n"
        f"CONTENT TYPE: {content_type}\n"
        f"PLATFORM: {platform or 'general'}\n"
        f"TOPIC: {topic}\n"
        f"NUMBER OF ITEMS: {count}\n"
        f"NOTES: {notes or 'none'}\n"
    )
    raw = await complete([{"role": "user", "content": prompt}], WRITER_SYSTEM, provider)
    try:
        data = json.loads(_extract_json(raw))
        items = data.get("items")
        if isinstance(items, list) and items:
            return items[:count]
    except json.JSONDecodeError:
        pass
    # Fallback: wrap the raw text as a single item so the call always yields content.
    return [{"title": topic[:80], "body": raw, "variants": {}}]
