"""Public social-profile auditing.

Pulls public profile numbers (followers / following / posts) and — where the
platform exposes them without auth — recent posts with like/comment counts so we
can estimate an engagement rate.

Instagram is the primary, fully-supported target via its public
``web_profile_info`` JSON endpoint. Everything degrades gracefully: if Instagram
rate-limits we fall back to parsing the ``og:description`` meta tag, and for other
platforms we return whatever OpenGraph metadata is publicly available.

No login or API keys are required. This is best-effort, public-data only.
"""
from __future__ import annotations

import asyncio
import re
import time
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
# Public web app id used by instagram.com itself for logged-out profile reads.
IG_APP_ID = "936619743392459"


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def parse_count(value: str | int | float | None) -> int | None:
    """Turn '1,234', '1.2M', '3.4k', 12 → an int. None on failure."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    s = str(value).strip().replace(",", "").replace(" ", "")
    if not s:
        return None
    m = re.match(r"^([\d.]+)\s*([kmb])?$", s, re.IGNORECASE)
    if not m:
        digits = re.sub(r"[^\d]", "", s)
        return int(digits) if digits else None
    num = float(m.group(1))
    suffix = (m.group(2) or "").lower()
    mult = {"k": 1_000, "m": 1_000_000, "b": 1_000_000_000}.get(suffix, 1)
    return int(num * mult)


def detect_platform(url: str) -> str:
    raw = url.strip()
    # Bare @handle or a plain username (no domain) → assume Instagram.
    if raw.startswith("@"):
        return "instagram"
    first = raw.split("/")[0]
    if "://" not in raw and "." not in first:
        return "instagram"
    host = urlparse(raw if "://" in raw else f"https://{raw}").netloc.lower()
    if "instagram.com" in host:
        return "instagram"
    if "linkedin.com" in host:
        return "linkedin"
    if "twitter.com" in host or "x.com" in host:
        return "x"
    if "youtube.com" in host or "youtu.be" in host:
        return "youtube"
    if "tiktok.com" in host:
        return "tiktok"
    if "facebook.com" in host:
        return "facebook"
    if not host:
        return "instagram"  # bare @handle → assume instagram
    return "web"


def extract_handle(url: str) -> str:
    """Pull a username from a profile URL or a bare @handle."""
    raw = url.strip()
    if raw.startswith("@"):
        return raw[1:].strip("/")
    if "://" not in raw and "." not in raw.split("/")[0]:
        return raw.strip("/").split("/")[0]
    path = urlparse(raw if "://" in raw else f"https://{raw}").path
    parts = [p for p in path.split("/") if p]
    if not parts:
        return ""
    handle = parts[-1] if parts[0] in {"in", "company", "@"} else parts[0]
    return handle.lstrip("@")


def _engagement_rate(posts: list[dict], followers: int | None) -> float | None:
    if not posts or not followers:
        return None
    interactions = [
        (p.get("likes") or 0) + (p.get("comments") or 0)
        for p in posts
        if p.get("likes") is not None or p.get("comments") is not None
    ]
    if not interactions:
        return None
    avg = sum(interactions) / len(interactions)
    return round(avg / followers * 100, 2)


_FORMAT_LABEL = {"image": "Static", "carousel": "Carousel", "reel": "Reel"}


def _media_type(typename: str | None, is_video: bool) -> str:
    if typename == "GraphSidecar":
        return "carousel"
    if typename == "GraphVideo" or is_video:
        return "reel"
    return "image"


def _content_insights(posts: list[dict]) -> dict | None:
    """Derive a marketer's read on the content: format mix, cadence, top post."""
    if not posts:
        return None

    # format mix
    mix: dict[str, int] = {}
    for p in posts:
        mix[p["media_type"]] = mix.get(p["media_type"], 0) + 1
    format_mix = [
        {"format": k, "label": _FORMAT_LABEL.get(k, k.title()), "count": v}
        for k, v in sorted(mix.items(), key=lambda kv: -kv[1])
    ]

    # posting cadence from timestamps
    stamps = sorted([p["taken_at"] for p in posts if p.get("taken_at")])
    posts_per_week = None
    last_post_days = None
    if len(stamps) >= 2:
        span_days = (stamps[-1] - stamps[0]) / 86400 or 1
        posts_per_week = round(len(stamps) / (span_days / 7), 1)
    if stamps:
        last_post_days = int((time.time() - stamps[-1]) / 86400)

    # engagement aggregates + top post
    likes = [p["likes"] for p in posts if p.get("likes") is not None]
    comments = [p["comments"] for p in posts if p.get("comments") is not None]
    avg_likes = round(sum(likes) / len(likes)) if likes else None
    avg_comments = round(sum(comments) / len(comments)) if comments else None

    top_idx = None
    best = -1
    for i, p in enumerate(posts):
        score = (p.get("likes") or 0) + (p.get("comments") or 0)
        if score > best:
            best, top_idx = score, i

    # best-performing format by avg engagement
    by_fmt: dict[str, list[int]] = {}
    for p in posts:
        by_fmt.setdefault(p["media_type"], []).append((p.get("likes") or 0) + (p.get("comments") or 0))
    best_format = None
    best_avg = -1.0
    for fmt, vals in by_fmt.items():
        a = sum(vals) / len(vals)
        if a > best_avg:
            best_avg, best_format = a, fmt

    return {
        "format_mix": format_mix,
        "posts_per_week": posts_per_week,
        "last_post_days": last_post_days,
        "avg_likes": avg_likes,
        "avg_comments": avg_comments,
        "top_post_index": top_idx,
        "best_format": best_format,
        "best_format_label": _FORMAT_LABEL.get(best_format, best_format.title()) if best_format else None,
        "sample_size": len(posts),
    }


# --------------------------------------------------------------------------- #
# instagram
# --------------------------------------------------------------------------- #
async def _ig_web_profile(handle: str) -> dict | None:
    """Primary path: instagram's public web_profile_info JSON."""
    url = "https://www.instagram.com/api/v1/users/web_profile_info/"
    headers = {
        "User-Agent": UA,
        "x-ig-app-id": IG_APP_ID,
        "Accept": "*/*",
        "Referer": f"https://www.instagram.com/{handle}/",
    }
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            res = await client.get(url, params={"username": handle}, headers=headers)
            if res.status_code != 200:
                return None
            data = res.json()
    except Exception:  # noqa: BLE001
        return None

    user = (data.get("data") or {}).get("user")
    if not user:
        return None

    followers = (user.get("edge_followed_by") or {}).get("count")
    following = (user.get("edge_follow") or {}).get("count")
    posts_count = (user.get("edge_owner_to_timeline_media") or {}).get("count")

    recent: list[dict] = []
    media_edges = (user.get("edge_owner_to_timeline_media") or {}).get("edges") or []
    for edge in media_edges[:12]:
        node = edge.get("node") or {}
        caption_edges = (node.get("edge_media_to_caption") or {}).get("edges") or []
        caption = ""
        if caption_edges:
            caption = (caption_edges[0].get("node") or {}).get("text", "")
        is_video = bool(node.get("is_video"))
        recent.append(
            {
                "thumbnail": node.get("thumbnail_src") or node.get("display_url"),
                "likes": (node.get("edge_liked_by") or node.get("edge_media_preview_like") or {}).get("count"),
                "comments": (node.get("edge_media_to_comment") or {}).get("count"),
                "is_video": is_video,
                "media_type": _media_type(node.get("__typename"), is_video),
                "taken_at": node.get("taken_at_timestamp"),
                "caption": (caption or "")[:160],
                "permalink": f"https://www.instagram.com/p/{node.get('shortcode')}/" if node.get("shortcode") else None,
            }
        )

    followers_i = parse_count(followers)
    return {
        "platform": "instagram",
        "found": True,
        "private": bool(user.get("is_private")),
        "username": user.get("username") or handle,
        "full_name": user.get("full_name"),
        "biography": user.get("biography"),
        "is_verified": bool(user.get("is_verified")),
        "is_business": bool(user.get("is_business_account")),
        "category": user.get("category_name") or user.get("business_category_name"),
        "profile_pic_url": user.get("profile_pic_url_hd") or user.get("profile_pic_url"),
        "external_url": user.get("external_url"),
        "followers": followers_i,
        "following": parse_count(following),
        "posts": parse_count(posts_count),
        "recent_posts": recent,
        "engagement_rate": _engagement_rate(recent, followers_i),
        "content_insights": _content_insights(recent),
        "source": "instagram_web_profile",
    }


async def _ig_meta_fallback(handle: str) -> dict | None:
    """Fallback: parse the public profile HTML og:description meta tag."""
    url = f"https://www.instagram.com/{handle}/"
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            res = await client.get(url, headers={"User-Agent": UA})
            if res.status_code != 200:
                return None
            html = res.text
    except Exception:  # noqa: BLE001
        return None

    soup = BeautifulSoup(html, "lxml")
    desc_tag = soup.find("meta", property="og:description") or soup.find(
        "meta", attrs={"name": "description"}
    )
    img_tag = soup.find("meta", property="og:image")
    title_tag = soup.find("meta", property="og:title")
    if not desc_tag or not desc_tag.get("content"):
        return None

    desc = desc_tag["content"]
    m = re.search(
        r"([\d.,]+[KMB]?)\s+Followers?,\s+([\d.,]+[KMB]?)\s+Following,\s+([\d.,]+[KMB]?)\s+Posts?",
        desc,
        re.IGNORECASE,
    )
    if not m:
        return None

    full_name = None
    if title_tag and title_tag.get("content"):
        full_name = title_tag["content"].split("(@")[0].strip() or None

    return {
        "platform": "instagram",
        "found": True,
        "private": False,
        "username": handle,
        "full_name": full_name,
        "biography": None,
        "is_verified": False,
        "is_business": False,
        "category": None,
        "profile_pic_url": img_tag["content"] if img_tag and img_tag.get("content") else None,
        "external_url": None,
        "followers": parse_count(m.group(1)),
        "following": parse_count(m.group(2)),
        "posts": parse_count(m.group(3)),
        "recent_posts": [],
        "engagement_rate": None,
        "source": "instagram_meta",
    }


async def audit_instagram(handle: str) -> dict:
    result = await _ig_web_profile(handle)
    if result:
        return result
    result = await _ig_meta_fallback(handle)
    if result:
        return result
    return {
        "platform": "instagram",
        "found": False,
        "username": handle,
        "error": (
            "Couldn't read this profile. It may be private, mistyped, or Instagram is "
            "rate-limiting public reads right now — try again in a minute."
        ),
    }


# --------------------------------------------------------------------------- #
# generic OpenGraph (other platforms / websites)
# --------------------------------------------------------------------------- #
async def audit_generic(url: str, platform: str) -> dict:
    full = url if "://" in url else f"https://{url}"
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            res = await client.get(full, headers={"User-Agent": UA})
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "lxml")
    except Exception as exc:  # noqa: BLE001
        return {"platform": platform, "found": False, "username": extract_handle(url), "error": str(exc)}

    def og(prop: str) -> str | None:
        tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        return tag["content"] if tag and tag.get("content") else None

    return {
        "platform": platform,
        "found": True,
        "limited": True,
        "username": extract_handle(url),
        "full_name": og("og:title"),
        "biography": og("og:description"),
        "profile_pic_url": og("og:image"),
        "external_url": full,
        "followers": None,
        "following": None,
        "posts": None,
        "recent_posts": [],
        "engagement_rate": None,
        "source": "opengraph",
        "note": (
            "This platform blocks public profile scraping, so only basic page "
            "metadata is available. Instagram gives full numbers."
        ),
    }


async def audit_profile(url: str) -> dict:
    """Entry point: detect platform and return public profile numbers."""
    platform = detect_platform(url)
    if platform == "instagram":
        return await audit_instagram(extract_handle(url))
    return await audit_generic(url, platform)


async def audit_many(urls: list[str]) -> list[dict]:
    """Audit several profiles for side-by-side benchmarking.

    Runs with a small concurrency cap + jitter so Instagram doesn't rate-limit
    the batch. The first url is treated as the primary (the client); the rest are
    competitors. Order is preserved.
    """
    seen: set[str] = set()
    ordered: list[str] = []
    for u in urls:
        key = (u or "").strip().lower()
        if key and key not in seen:
            seen.add(key)
            ordered.append(u.strip())

    sem = asyncio.Semaphore(2)

    async def one(idx: int, u: str) -> tuple[int, dict]:
        async with sem:
            try:
                res = await audit_profile(u)
            except Exception as exc:  # noqa: BLE001
                res = {"platform": detect_platform(u), "found": False, "username": extract_handle(u), "error": str(exc)}
            res["query"] = u
            res["is_primary"] = idx == 0
            return idx, res

    results = await asyncio.gather(*(one(i, u) for i, u in enumerate(ordered)))
    return [r for _, r in sorted(results, key=lambda t: t[0])]
