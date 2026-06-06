"""Pexels stock-video (b-roll) client for the AI video pipeline.

Pexels provides licensed **stock footage** — not generative video. We search
per scene with the AI-chosen query, pick the best-fitting clip for the target
orientation, and download the MP4 bytes for ffmpeg to assemble.

Free API key: https://www.pexels.com/api/  (set ``PEXELS_API_KEY``).
"""
from __future__ import annotations

import httpx

from app.config import settings

_BASE = "https://api.pexels.com/videos"
_TIMEOUT = httpx.Timeout(60.0, connect=15.0)


def _headers() -> dict[str, str]:
    return {"Authorization": settings.pexels_api_key or ""}


def _pick_file(
    video: dict, *, want_portrait: bool, min_h: int = 720, target_h: int = 1080
) -> str | None:
    """Choose the best progressive MP4 link for the desired orientation.

    ``target_h`` lets the caller bias selection toward higher-resolution source
    files (e.g. 4K output) instead of always preferring ~1080p.
    """
    files = [f for f in video.get("video_files", []) if f.get("file_type") == "video/mp4"]
    if not files:
        return None

    def score(f: dict) -> tuple:
        w, h = f.get("width") or 0, f.get("height") or 0
        portrait = h >= w
        orient_match = 1 if portrait == want_portrait else 0
        height_ok = 1 if h >= min_h else 0
        # Closeness to the desired working height (biases toward target_h).
        closeness = -abs(h - target_h)
        return (orient_match, height_ok, closeness)

    best = max(files, key=score)
    return best.get("link")


async def search_clips(
    query: str,
    *,
    orientation: str = "portrait",
    per_page: int = 8,
    min_h: int = 720,
    target_h: int = 1080,
) -> list[dict]:
    """Return candidate clips: ``[{id, duration, url, width, height}]``."""
    if not settings.pexels_api_key:
        raise RuntimeError(
            "Pexels unavailable: set PEXELS_API_KEY (free at pexels.com/api)."
        )
    want_portrait = orientation == "portrait"
    # For 4K output bump the requested size so Pexels returns larger source files.
    size = "large" if target_h >= 1600 else "medium"
    params = {
        "query": query,
        "orientation": orientation,
        "per_page": str(per_page),
        "size": size,
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.get(f"{_BASE}/search", headers=_headers(), params=params)
        if r.status_code >= 400:
            raise RuntimeError(f"Pexels search failed ({r.status_code}): {r.text[:200]}")
        payload = r.json()

    out: list[dict] = []
    for v in payload.get("videos", []):
        link = _pick_file(v, want_portrait=want_portrait, min_h=min_h, target_h=target_h)
        if not link:
            continue
        out.append(
            {
                "id": v.get("id"),
                "duration": v.get("duration") or 0,
                "url": link,
                "width": v.get("width"),
                "height": v.get("height"),
                "thumb": v.get("image"),
            }
        )
    return out


async def download_clip(url: str) -> bytes:
    """Download the raw MP4 bytes for a chosen clip link."""
    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


# --------------------------------------------------------------------------- #
# Photos (stock imagery for decks / graphics)
# --------------------------------------------------------------------------- #
_PHOTO_BASE = "https://api.pexels.com/v1"


async def search_photo(
    query: str,
    *,
    orientation: str = "landscape",
    size: str = "large",
) -> dict | None:
    """Return the best-matching stock photo for ``query`` or ``None``.

    Result: ``{id, url, thumb, photographer, width, height, alt}`` where ``url``
    is a directly-usable Pexels CDN link (safe to render or download). Returns
    ``None`` (never raises) so callers can fall back gracefully.
    """
    if not settings.pexels_api_key or not query.strip():
        return None
    params = {
        "query": query.strip(),
        "orientation": orientation,
        "size": size,
        "per_page": "1",
    }
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(f"{_PHOTO_BASE}/search", headers=_headers(), params=params)
            if r.status_code >= 400:
                return None
            payload = r.json()
    except Exception:  # noqa: BLE001 — imagery is best-effort
        return None

    photos = payload.get("photos") or []
    if not photos:
        return None
    p = photos[0]
    src = p.get("src") or {}
    # Prefer a large landscape crop; fall back through the size ladder.
    link = src.get("large2x") or src.get("large") or src.get("original") or src.get("medium")
    if not link:
        return None
    return {
        "id": p.get("id"),
        "url": link,
        "thumb": src.get("medium") or link,
        "photographer": p.get("photographer") or "",
        "width": p.get("width"),
        "height": p.get("height"),
        "alt": p.get("alt") or query.strip(),
    }


async def download_bytes(url: str) -> bytes:
    """Download raw bytes for any Pexels (or other) media URL."""
    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content
