"""Deep-crawl wrapper around crawl4ai with a graceful httpx fallback.

crawl4ai needs Playwright/Chromium and only runs in the worker/Container App image.
If it is unavailable (e.g. local dev without browsers), we fall back to a plain
httpx fetch + BeautifulSoup text extraction so the pipeline still works.

Performance notes (why live used to be much slower than local):
- Locally crawl4ai is usually absent, so we use the very fast httpx fallback.
- Live, crawl4ai IS installed. Opening a fresh ``AsyncWebCrawler`` per URL spawns a
  brand-new Chromium (cold start ~2-4s) and re-runs crawl4ai's DB migration every
  time. Crawling 9 URLs sequentially that way dominated the run time.
``deep_crawl_many`` fixes both: it opens ONE browser for the whole batch and lets
crawl4ai crawl the URLs concurrently (``arun_many``), with a parallel httpx
fallback when crawl4ai can't run.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

import httpx
from bs4 import BeautifulSoup

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# Cap on simultaneous httpx fallback fetches so we don't open hundreds of sockets.
_FALLBACK_CONCURRENCY = 8


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


async def _fallback_many(urls: list[str]) -> list[CrawlResult]:
    sem = asyncio.Semaphore(_FALLBACK_CONCURRENCY)

    async def one(u: str) -> CrawlResult:
        async with sem:
            return await _fallback_fetch(u)

    return await asyncio.gather(*[one(u) for u in urls])


def _parse_c4a(result, fallback_url: str) -> CrawlResult:
    """Turn a crawl4ai result object into our CrawlResult."""
    url = getattr(result, "url", None) or fallback_url
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


async def deep_crawl(url: str) -> CrawlResult:
    """Crawl a single URL, preferring crawl4ai, falling back to httpx."""
    try:
        from crawl4ai import AsyncWebCrawler  # noqa: WPS433

        async with AsyncWebCrawler(headless=True, verbose=False) as crawler:
            result = await crawler.arun(url=url)
            return _parse_c4a(result, url)
    except Exception:
        return await _fallback_fetch(url)


async def deep_crawl_many(urls: list[str]) -> list[CrawlResult]:
    """Crawl many URLs efficiently.

    Opens a single Chromium for the whole batch and crawls the URLs concurrently
    via crawl4ai's ``arun_many``. Falls back to parallel httpx fetches when
    crawl4ai is unavailable (local dev) or the browser can't launch. Order of the
    returned list is not guaranteed to match the input.
    """
    urls = [u for u in dict.fromkeys(urls) if u]  # dedupe, drop falsy, keep order
    if not urls:
        return []

    try:
        from crawl4ai import AsyncWebCrawler  # noqa: WPS433

        async with AsyncWebCrawler(headless=True, verbose=False) as crawler:
            arun_many = getattr(crawler, "arun_many", None)
            if callable(arun_many):
                raw = await arun_many(urls=urls)
                results = list(raw or [])
                # arun_many may not return one result per URL; backfill misses
                # with the fast httpx path rather than re-launching the browser.
                got = {getattr(r, "url", None) for r in results}
                parsed = [_parse_c4a(r, "") for r in results]
                missing = [u for u in urls if u not in got]
                if missing:
                    parsed.extend(await _fallback_many(missing))
                return parsed

            # Older crawl4ai without arun_many: reuse the one browser, run
            # single-URL crawls concurrently.
            sem = asyncio.Semaphore(4)

            async def one(u: str) -> CrawlResult:
                async with sem:
                    try:
                        return _parse_c4a(await crawler.arun(url=u), u)
                    except Exception:  # noqa: BLE001
                        return await _fallback_fetch(u)

            return await asyncio.gather(*[one(u) for u in urls])
    except Exception:
        return await _fallback_many(urls)
