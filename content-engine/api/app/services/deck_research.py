"""Fresh, topical web evidence for a deck (the hybrid research pass).

When a deck is generated we want real, up-to-date stats and citations — not just
whatever the workspace happened to research before. This module runs a few quick
web searches around the deck's topic (and the workspace's industry), dedupes the
results, and returns a compact evidence block plus a list of citable sources so
the designer can ground claims and we can build a References slide.

Best-effort: if web search is unconfigured or returns nothing, callers simply get
empty results and fall back to the workspace's saved research.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.tools.web_search import web_search

log = logging.getLogger("deck_research")

_PASS_TIMEOUT = 35.0   # seconds — never stall a deck on a slow provider
_MAX_SOURCES = 12      # cap citations we keep / show on the References slide


def _domain(url: str) -> str:
    try:
        from urllib.parse import urlparse

        host = urlparse(url).netloc.lower()
        return host[4:] if host.startswith("www.") else host
    except Exception:  # noqa: BLE001
        return ""


def _queries(topic: str, *, industry: str | None, audience: str | None) -> list[str]:
    topic = (topic or "").strip()
    qs: list[str] = []
    if topic:
        qs.append(f"{topic} statistics 2024")
        qs.append(f"{topic} market trends data")
    if industry:
        qs.append(f"{industry} industry benchmarks {topic}".strip())
    if audience and topic:
        qs.append(f"{audience} {topic} insights")
    # De-dupe while preserving order; keep it small for latency/cost.
    seen: set[str] = set()
    out: list[str] = []
    for q in qs:
        k = q.lower().strip()
        if k and k not in seen:
            seen.add(k)
            out.append(q)
    return out[:4]


async def gather_evidence(
    topic: str,
    *,
    industry: str | None = None,
    audience: str | None = None,
    limit_per_query: int = 5,
) -> dict[str, Any]:
    """Return ``{"evidence": str, "sources": [{"label","url","snippet"}]}``.

    ``evidence`` is a markdown block of titled snippets with their URLs, ready to
    inject into the designer grounding. ``sources`` is a deduped, capped list for
    the References slide. Both are empty when nothing is found.
    """
    queries = _queries(topic, industry=industry, audience=audience)
    if not queries:
        return {"evidence": "", "sources": []}

    async def _run(q: str) -> list[Any]:
        try:
            return await web_search(q, limit=limit_per_query)
        except Exception as exc:  # noqa: BLE001
            log.warning("deck evidence query failed (%s): %s", q, exc)
            return []

    try:
        batches = await asyncio.wait_for(
            asyncio.gather(*(_run(q) for q in queries)), timeout=_PASS_TIMEOUT
        )
    except (asyncio.TimeoutError, Exception) as exc:  # noqa: BLE001
        log.warning("deck evidence pass timed out/failed: %s", exc)
        return {"evidence": "", "sources": []}

    seen_urls: set[str] = set()
    sources: list[dict[str, str]] = []
    for results in batches:
        for r in results:
            url = getattr(r, "url", "") or ""
            title = (getattr(r, "title", "") or "").strip()
            snippet = (getattr(r, "snippet", "") or "").strip()
            if not url or url in seen_urls or not title:
                continue
            seen_urls.add(url)
            sources.append({
                "label": title[:140],
                "url": url,
                "snippet": snippet[:280],
            })
            if len(sources) >= _MAX_SOURCES:
                break
        if len(sources) >= _MAX_SOURCES:
            break

    if not sources:
        return {"evidence": "", "sources": []}

    lines = ["The following are FRESH web search results — use them for real, "
             "specific stats and cite the URL when you state a number or claim:"]
    for s in sources:
        dom = _domain(s["url"])
        snip = f" — {s['snippet']}" if s["snippet"] else ""
        lines.append(f"- [{s['label']}]({s['url']}) ({dom}){snip}")
    return {"evidence": "\n".join(lines), "sources": sources}
