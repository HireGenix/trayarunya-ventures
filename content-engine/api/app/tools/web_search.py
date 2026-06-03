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
