"""Deep-crawl wrapper around crawl4ai with a graceful httpx fallback.

crawl4ai needs Playwright/Chromium and only runs in the worker/Container App image.
If it is unavailable (e.g. local dev without browsers), we fall back to a plain
httpx fetch + BeautifulSoup text extraction so the pipeline still works.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import httpx
from bs4 import BeautifulSoup

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


@dataclass
class CrawlResult:
    url: str
    title: str = ""
    markdown: str = ""
    text: str = ""
    links: list[str] = field(default_factory=list)
    ok: bool = True
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "title": self.title,
            "text": self.text[:20000],
            "links": self.links[:50],
            "ok": self.ok,
            "error": self.error,
        }


async def _fallback_fetch(url: str) -> CrawlResult:
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
            res = await client.get(url, headers={"User-Agent": UA})
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "lxml")
            for tag in soup(["script", "style", "noscript"]):
                tag.decompose()
            title = soup.title.get_text(strip=True) if soup.title else ""
            text = " ".join(soup.get_text(" ").split())
            links = [
                a["href"]
                for a in soup.find_all("a", href=True)
                if a["href"].startswith("http")
            ]
            return CrawlResult(url=url, title=title, text=text, markdown=text, links=links)
    except Exception as exc:  # noqa: BLE001
        return CrawlResult(url=url, ok=False, error=str(exc))


async def deep_crawl(url: str) -> CrawlResult:
    """Crawl a single URL, preferring crawl4ai, falling back to httpx."""
    try:
        from crawl4ai import AsyncWebCrawler  # noqa: WPS433

        async with AsyncWebCrawler(headless=True, verbose=False) as crawler:
            result = await crawler.arun(url=url)
            md = getattr(result, "markdown", "") or ""
            if isinstance(md, object) and hasattr(md, "raw_markdown"):
                md = md.raw_markdown  # newer crawl4ai returns a MarkdownResult
            links_obj = getattr(result, "links", {}) or {}
            internal = [l.get("href") for l in links_obj.get("internal", []) if l.get("href")]
            external = [l.get("href") for l in links_obj.get("external", []) if l.get("href")]
            return CrawlResult(
                url=url,
                title=(getattr(result, "metadata", {}) or {}).get("title", ""),
                markdown=str(md),
                text=str(md),
                links=[*internal, *external],
                ok=bool(getattr(result, "success", True)),
            )
    except Exception:
        return await _fallback_fetch(url)
