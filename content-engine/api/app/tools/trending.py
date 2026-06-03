"""Trending hashtags + AI caption helper.

Uses the free DuckDuckGo web search (``app.tools.web_search``) to discover
trending hashtags for a topic/platform and, opportunistically, crawl4ai
(``app.tools.crawler``) to read the top result for extra signal. A single LLM
call then crafts a platform-native caption. Everything is best-effort: if search
or crawling fails, we still return a sensible caption and any hashtags we found.
"""
from __future__ import annotations

import json
import re
from datetime import date
from typing import Any

from app.llm.adapters import Provider, _extract_json, complete
from app.tools.crawler import deep_crawl
from app.tools.web_search import web_search

_HASHTAG_RE = re.compile(r"#[A-Za-z][A-Za-z0-9_]{1,40}")


def _slugify_tag(word: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", word)
    return f"#{cleaned}" if cleaned else ""


async def fetch_trending_tags(topic: str, platform: str | None, limit: int = 12) -> list[str]:
    """Return up to ``limit`` trending-ish hashtags for ``topic`` on ``platform``."""
    plat = (platform or "social media").strip()
    query = f"{topic} {plat} trending hashtags {date.today().year}"
    found: list[str] = []
    try:
        results = await web_search(query, limit=8)
    except Exception:  # noqa: BLE001
        results = []

    blob_parts: list[str] = []
    for r in results:
        blob_parts.append(f"{r.title} {r.snippet}")
    # Opportunistic deep-crawl of the first result for richer hashtag signal.
    if results:
        try:
            crawled = await deep_crawl(results[0].url)
            if crawled.ok and crawled.text:
                blob_parts.append(crawled.text[:4000])
        except Exception:  # noqa: BLE001
            pass

    blob = " ".join(blob_parts)
    for m in _HASHTAG_RE.findall(blob):
        tag = m if m.startswith("#") else f"#{m}"
        if tag.lower() not in {t.lower() for t in found}:
            found.append(tag)
        if len(found) >= limit:
            break

    # If search yielded nothing usable, derive a few tags from the topic words.
    if len(found) < 3:
        for word in re.split(r"\s+", topic)[:6]:
            tag = _slugify_tag(word)
            if tag and tag.lower() not in {t.lower() for t in found}:
                found.append(tag)
    return found[:limit]


CAPTION_SYSTEM = (
    "You are a senior social copywriter. Write a single, platform-native caption that is "
    "scroll-stopping, on-brand, and ready to publish. No preamble, no quotes around it. "
    "Return STRICT JSON: {\"caption\": \"...\", \"hashtags\": [\"#tag\", ...]}.\n"
    "Caption length by platform: X/twitter <= 270 chars; LinkedIn 1-3 short paragraphs; "
    "Instagram punchy with line breaks; others concise. Pick the 5-10 most relevant hashtags "
    "from the provided trending list (and add a couple of evergreen brand ones if needed)."
)


async def craft_caption(
    *,
    topic: str,
    platform: str | None,
    brand: dict[str, Any] | None,
    body: str | None,
    trending: list[str],
    provider: Provider | None = None,
) -> dict[str, Any]:
    """Return {'caption': str, 'hashtags': [str, ...]} — best-effort."""
    voice = ""
    if brand:
        v = brand.get("voice")
        if isinstance(v, dict):
            voice = v.get("tone") or ""
        elif isinstance(v, str):
            voice = v
    prompt = (
        f"PLATFORM: {platform or 'social'}\n"
        f"TOPIC: {topic}\n"
        f"BRAND VOICE: {voice or 'confident, helpful, expert'}\n"
        f"VALUE PROP: {(brand or {}).get('value_prop') or ''}\n"
        f"TRENDING HASHTAGS (choose from these): {', '.join(trending) or 'none found'}\n"
        f"DRAFT CONTENT (for context):\n{(body or '')[:1500]}\n\n"
        "Write the caption + choose hashtags now."
    )
    try:
        raw = await complete([{"role": "user", "content": prompt}], CAPTION_SYSTEM, provider)
        data = json.loads(_extract_json(raw))
        caption = str(data.get("caption") or "").strip()
        tags = data.get("hashtags")
        if not isinstance(tags, list):
            tags = trending[:8]
        tags = [str(t if str(t).startswith("#") else f"#{t}") for t in tags][:10]
        if caption:
            return {"caption": caption, "hashtags": tags}
    except Exception:  # noqa: BLE001
        pass
    # Fallback: short caption from the topic + the trending tags we found.
    return {"caption": topic.strip(), "hashtags": trending[:8]}


async def caption_and_tags(
    *,
    topic: str,
    platform: str | None,
    brand: dict[str, Any] | None,
    body: str | None,
    provider: Provider | None = None,
) -> dict[str, Any]:
    """Convenience: fetch trending tags then craft a caption. Best-effort."""
    trending = await fetch_trending_tags(topic, platform)
    result = await craft_caption(
        topic=topic,
        platform=platform,
        brand=brand,
        body=body,
        trending=trending,
        provider=provider,
    )
    result["trending"] = trending
    return result
