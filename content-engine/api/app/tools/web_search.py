"""Free web search via DuckDuckGo HTML endpoints (no API key).

Ported from the main site's ``src/lib/freeSearch.ts``. Primary endpoint is
``html.duckduckgo.com``; ``lite.duckduckgo.com`` is a backup. Results are parsed
with BeautifulSoup and DDG redirect links are decoded.
"""
from __future__ import annotations

import urllib.parse
from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str

    def to_dict(self) -> dict[str, str]:
        return {"title": self.title, "url": self.url, "snippet": self.snippet}


def _decode_ddg(href: str) -> str:
    if href.startswith("//"):
        href = "https:" + href
    parsed = urllib.parse.urlparse(href)
    if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
        qs = urllib.parse.parse_qs(parsed.query)
        if "uddg" in qs:
            return urllib.parse.unquote(qs["uddg"][0])
    return href


def _parse(html: str, limit: int) -> list[SearchResult]:
    soup = BeautifulSoup(html, "lxml")
    out: list[SearchResult] = []
    for node in soup.select(".result, .result__body, .web-result"):
        a = node.select_one("a.result__a")
        if not a:
            continue
        url = _decode_ddg(a.get("href", ""))
        if not url.startswith("http"):
            continue
        snippet_el = node.select_one(".result__snippet")
        out.append(
            SearchResult(
                title=a.get_text(strip=True),
                url=url,
                snippet=snippet_el.get_text(strip=True) if snippet_el else "",
            )
        )
        if len(out) >= limit:
            break
    return out


async def _post(client: httpx.AsyncClient, url: str, query: str) -> str:
    res = await client.post(
        url,
        data={"q": query, "kl": "us-en"},
        headers={
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "text/html",
        },
    )
    res.raise_for_status()
    return res.text


async def web_search(query: str, limit: int = 8) -> list[SearchResult]:
    """Return up to ``limit`` DuckDuckGo results for ``query``."""
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        try:
            html = await _post(client, "https://html.duckduckgo.com/html/", query)
            results = _parse(html, limit)
            if results:
                return results
        except Exception:
            pass
        try:
            html = await _post(client, "https://lite.duckduckgo.com/lite/", query)
            return _parse(html, limit)
        except Exception:
            return []


def _parse_news(payload: dict, limit: int) -> list[SearchResult]:
    out: list[SearchResult] = []
    for r in (payload.get("results") or [])[:limit]:
        url = r.get("url") or ""
        if not url.startswith("http"):
            continue
        src = r.get("source") or ""
        title = r.get("title") or ""
        out.append(
            SearchResult(
                title=f"{title} — {src}" if src else title,
                url=url,
                snippet=r.get("excerpt") or r.get("body") or "",
            )
        )
    return out


async def _ddg_vqd(client: httpx.AsyncClient, query: str) -> str | None:
    """DuckDuckGo's JSON endpoints need a one-time ``vqd`` token."""
    res = await client.get(
        "https://duckduckgo.com/",
        params={"q": query},
        headers={"User-Agent": UA},
    )
    import re

    m = re.search(r"vqd=\"([\d-]+)\"", res.text) or re.search(r"vqd=([\d-]+)&", res.text)
    return m.group(1) if m else None


async def news_search(query: str, limit: int = 6) -> list[SearchResult]:
    """Fresh news results via DuckDuckGo's news JSON endpoint (no API key)."""
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        try:
            vqd = await _ddg_vqd(client, query)
            if not vqd:
                return []
            res = await client.get(
                "https://duckduckgo.com/news.js",
                params={"l": "us-en", "o": "json", "q": query, "vqd": vqd, "noamp": "1"},
                headers={"User-Agent": UA, "Accept": "application/json"},
            )
            res.raise_for_status()
            return _parse_news(res.json(), limit)
        except Exception:
            return []


# Public sites we can productively search via a site:-scoped web query when a
# platform is requested. Keeps us within DDG (no per-network API keys).
PLATFORM_SITES: dict[str, str] = {
    "youtube": "youtube.com",
    "reddit": "reddit.com",
    "linkedin": "linkedin.com/company",
    "x": "x.com",
    "tiktok": "tiktok.com",
    "pinterest": "pinterest.com",
    "facebook": "facebook.com",
    "instagram": "instagram.com",
    "news": "",  # handled by news_search
}


async def multi_search(
    query: str,
    *,
    limit: int = 6,
    include_news: bool = True,
    platforms: list[str] | None = None,
) -> list[dict]:
    """Fan out a single query across web, news and platform-scoped searches.

    Returns dicts tagged with ``source_type`` (``web`` | ``news`` | ``platform``)
    and ``platform`` so the agent can reason about where evidence came from.
    """
    out: list[dict] = []
    seen: set[str] = set()

    def _add(items: list[SearchResult], source_type: str, platform: str | None = None) -> None:
        for r in items:
            if r.url in seen:
                continue
            seen.add(r.url)
            d = r.to_dict()
            d["source_type"] = source_type
            if platform:
                d["platform"] = platform
            out.append(d)

    _add(await web_search(query, limit=limit), "web")
    if include_news:
        _add(await news_search(query, limit=4), "news")
    for p in (platforms or []):
        site = PLATFORM_SITES.get(p.lower())
        if not site:
            continue
        _add(await web_search(f"{query} site:{site}", limit=3), "platform", p.lower())
    return out

