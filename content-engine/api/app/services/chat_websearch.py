"""Web-search augmentation for chat turns.

The assistant can pull live results from the platform's own inbuilt web search
(``tools.web_search.multi_search`` — SearXNG → Tavily → Brave → LangSearch → DDG).
We trigger it either explicitly (the user toggled "Web") or implicitly when the
message contains research/web-search intent keywords. Results are formatted into
a markdown block the assistant is told to cite.
"""
from __future__ import annotations

import logging
import re

from app.tools.web_search import multi_search

log = logging.getLogger("chat_websearch")

# Intent keywords (English + common Hinglish) that imply "go search the web".
_TRIGGERS = [
    "search the web", "web search", "google ", "look up", "latest", "news",
    "today", "current", "recent", "trend", "trending", "competitor", "competitors",
    "/research", "research ", "find out", "khoj", "dhoondh", "search karo",
    "web par", "internet par", "latest news", "price of", "compare",
]

_STOPWORDS = {
    "the", "a", "an", "for", "to", "of", "and", "or", "on", "in", "is", "are",
    "what", "who", "how", "why", "when", "give", "me", "please", "about", "search",
    "web", "google", "find", "latest", "news", "tell", "can", "you", "do", "with",
}


def wants_web_search(text: str) -> bool:
    low = (text or "").lower()
    return any(t in low for t in _TRIGGERS)


def _query_from(text: str) -> str:
    cleaned = re.sub(r"[/](research|search)\b", " ", (text or "").lower())
    cleaned = re.sub(r"\b(search the web|web search|search karo|look up|find out)\b", " ", cleaned)
    words = [w for w in re.findall(r"[a-z0-9@#.\-]+", cleaned) if w not in _STOPWORDS]
    query = " ".join(words).strip()
    return (query or (text or "").strip())[:160]


async def run_web_search(text: str, *, limit: int = 6) -> tuple[str, list[dict]]:
    """Return (markdown_block, raw_results). Empty string when nothing found."""
    query = _query_from(text)
    if not query:
        return "", []
    try:
        results = await multi_search(query, limit=limit, include_news=True)
    except Exception as exc:  # noqa: BLE001
        log.warning("chat web search failed: %s", exc)
        return "", []
    if not results:
        return "", []

    lines = [f"## LIVE WEB RESULTS (query: {query})"]
    for i, r in enumerate(results[:8], 1):
        title = (r.get("title") or r.get("url") or "").strip()
        url = r.get("url") or ""
        snippet = (r.get("snippet") or "").strip().replace("\n", " ")
        if len(snippet) > 280:
            snippet = snippet[:279] + "…"
        lines.append(f"{i}. [{title}]({url})\n   {snippet}")
    lines.append(
        "\nUse these results to answer. Cite sources inline as markdown links "
        "and add a short 'Sources' list. Do not invent URLs."
    )
    return "\n".join(lines), results
