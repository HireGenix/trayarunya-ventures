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


# --------------------------------------------------------------------------- #
# Keyed providers (preferred — reliable, no scraping/403). Each returns [] when
# unconfigured or on error so the caller can fall through to the next provider.
# --------------------------------------------------------------------------- #
async def _searxng_search(query: str, limit: int) -> list[SearchResult]:
    """Self-hosted SearXNG meta-search (free, primary).

    Aggregates Google/Bing/DDG/Brave behind one JSON endpoint. A tight timeout
    (settings.searxng_timeout_seconds) ensures a slow instance falls through to
    the keyed providers rather than stalling research.
    """
    from app.config import settings

    if not settings.searxng_url:
        return []
    base = settings.searxng_url.rstrip("/")
    try:
        async with httpx.AsyncClient(
            timeout=settings.searxng_timeout_seconds, follow_redirects=True
        ) as client:
            res = await client.get(
                f"{base}/search",
                params={
                    "q": query,
                    "format": "json",
                    "language": "en",
                    "safesearch": 0,
                },
                headers={"Accept": "application/json", "User-Agent": UA},
            )
            res.raise_for_status()
            data = res.json()
        out: list[SearchResult] = []
        for r in (data.get("results") or []):
            url = r.get("url") or ""
            if not url.startswith("http"):
                continue
            out.append(
                SearchResult(
                    title=r.get("title") or url,
                    url=url,
                    snippet=r.get("content") or "",
                )
            )
            if len(out) >= limit:
                break
        return out
    except Exception:
        return []


async def _tavily_search(query: str, limit: int) -> list[SearchResult]:
    from app.config import settings

    if not settings.tavily_api_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": settings.tavily_api_key,
                    "query": query,
                    "max_results": limit,
                    "search_depth": "basic",
                },
            )
            res.raise_for_status()
            data = res.json()
        out: list[SearchResult] = []
        for r in (data.get("results") or [])[:limit]:
            url = r.get("url") or ""
            if url.startswith("http"):
                out.append(
                    SearchResult(
                        title=r.get("title") or url,
                        url=url,
                        snippet=r.get("content") or "",
                    )
                )
        return out
    except Exception:
        return []


async def _brave_search(query: str, limit: int) -> list[SearchResult]:
    from app.config import settings

    if not settings.brave_search_api_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": limit},
                headers={
                    "Accept": "application/json",
                    "X-Subscription-Token": settings.brave_search_api_key,
                },
            )
            res.raise_for_status()
            data = res.json()
        out: list[SearchResult] = []
        for r in ((data.get("web") or {}).get("results") or [])[:limit]:
            url = r.get("url") or ""
            if url.startswith("http"):
                out.append(
                    SearchResult(
                        title=r.get("title") or url,
                        url=url,
                        snippet=r.get("description") or "",
                    )
                )
        return out
    except Exception:
        return []


async def _langsearch_search(query: str, limit: int) -> list[SearchResult]:
    from app.config import settings

    if not settings.langsearch_api_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                "https://api.langsearch.com/v1/web-search",
                json={"query": query, "count": limit},
                headers={
                    "Authorization": f"Bearer {settings.langsearch_api_key}",
                    "Content-Type": "application/json",
                },
            )
            res.raise_for_status()
            data = res.json()
        # LangSearch nests results under data.webPages.value
        pages = (
            ((data.get("data") or {}).get("webPages") or {}).get("value")
            or (data.get("webPages") or {}).get("value")
            or []
        )
        out: list[SearchResult] = []
        for r in pages[:limit]:
            url = r.get("url") or ""
            if url.startswith("http"):
                out.append(
                    SearchResult(
                        title=r.get("name") or url,
                        url=url,
                        snippet=r.get("snippet") or r.get("summary") or "",
                    )
                )
        return out
    except Exception:
        return []


async def _ddg_search(query: str, limit: int) -> list[SearchResult]:
    """Keyless DuckDuckGo HTML scrape (last-resort; can be rate-limited)."""
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


async def web_search(query: str, limit: int = 8) -> list[SearchResult]:
    """Return up to ``limit`` web results, trying reliable keyed providers first.

    Order: SearXNG (self-hosted, free) -> Tavily -> Brave -> LangSearch ->
    DuckDuckGo. The first provider that returns results wins; unconfigured or
    slow/failing providers are skipped. SearXNG has a tight timeout so a slow
    instance can't stall the run — it just falls through to the paid providers.
    """
    for provider in (
        _searxng_search,
        _tavily_search,
        _brave_search,
        _langsearch_search,
        _ddg_search,
    ):
        results = await provider(query, limit)
        if results:
            return results
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
    """Fresh news results via DuckDuckGo's news JSON endpoint (no API key).

    DDG is frequently rate-limited (HTTP 403) in cloud environments, so this is
    strictly best-effort with a tight timeout — it must never stall research.
    """
    async with httpx.AsyncClient(timeout=6, follow_redirects=True) as client:
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

    # Run web, news and platform-scoped searches concurrently so a slow/blocked
    # provider (e.g. DuckDuckGo news) can't serialise the whole fan-out.
    import asyncio

    plats = [p.lower() for p in (platforms or []) if PLATFORM_SITES.get(p.lower())]
    tasks: list = [web_search(query, limit=limit)]
    if include_news:
        tasks.append(news_search(query, limit=4))
    for p in plats:
        tasks.append(web_search(f"{query} site:{PLATFORM_SITES[p]}", limit=3))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    idx = 0
    web_res = results[idx]; idx += 1
    _add(web_res if not isinstance(web_res, BaseException) else [], "web")
    if include_news:
        news_res = results[idx]; idx += 1
        _add(news_res if not isinstance(news_res, BaseException) else [], "news")
    for p in plats:
        pr = results[idx]; idx += 1
        _add(pr if not isinstance(pr, BaseException) else [], "platform", p)
    return out

