"""Free, in-process brand identity + color extractor.

Fetches a company's homepage and mines:
  - declared brand colors (<meta theme-color>, CSS custom props, frequent vivid colors)
  - logo URL (og:image / <img> with 'logo' in the name)
  - title, description, social links

No API key, no headless browser — httpx + BeautifulSoup + regex. Mirrors the
heuristics in the main site's src/lib/brandColors.ts.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

_HEX_RE = re.compile(r"#([0-9a-fA-F]{3,8})\b")
_RGB_RE = re.compile(r"rgba?\(([^)]+)\)")
_VAR_RE = re.compile(
    r"--(?:[\w-]*?(?:primary|brand|accent|secondary)[\w-]*?)\s*:\s*([^;]+);", re.I
)

# Near-white / near-black / grey tones we don't want to treat as a brand color.
def _is_vivid(r: int, g: int, b: int) -> bool:
    mx, mn = max(r, g, b), min(r, g, b)
    if mx < 30 or mn > 225:  # too dark or too light
        return False
    if (mx - mn) < 25:  # greyscale
        return False
    return True


def _to_hex(r: int, g: int, b: int) -> str:
    return f"{r:02X}{g:02X}{b:02X}"


def _parse_color(token: str) -> tuple[int, int, int] | None:
    t = token.strip().lower()
    m = _HEX_RE.match(t if t.startswith("#") else "#" + t.lstrip("#"))
    if m:
        h = m.group(1)
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        if len(h) >= 6:
            h = h[:6]
            try:
                return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
            except ValueError:
                return None
    m = _RGB_RE.match(t)
    if m:
        parts = [p.strip() for p in m.group(1).split(",")]
        if len(parts) >= 3:
            try:
                return (
                    max(0, min(255, int(float(parts[0])))),
                    max(0, min(255, int(float(parts[1])))),
                    max(0, min(255, int(float(parts[2])))),
                )
            except ValueError:
                return None
    return None


@dataclass
class BrandProfile:
    url: str
    ok: bool = True
    title: str = ""
    description: str = ""
    primary_color: str | None = None
    accent_color: str | None = None
    palette: list[str] = field(default_factory=list)
    logo_url: str | None = None
    social_links: list[str] = field(default_factory=list)
    text: str = ""
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "ok": self.ok,
            "title": self.title,
            "description": self.description,
            "primary_color": self.primary_color,
            "accent_color": self.accent_color,
            "palette": self.palette,
            "logo_url": self.logo_url,
            "social_links": self.social_links,
            "error": self.error,
        }


def _normalize_url(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


async def extract_brand(url: str) -> BrandProfile:
    url = _normalize_url(url)
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
            res = await client.get(url, headers={"User-Agent": UA})
            res.raise_for_status()
            html = res.text
            final_url = str(res.url)
    except Exception as exc:  # noqa: BLE001
        return BrandProfile(url=url, ok=False, error=str(exc))

    soup = BeautifulSoup(html, "lxml")
    base = f"{urlparse(final_url).scheme}://{urlparse(final_url).netloc}"

    title = (soup.title.get_text(strip=True) if soup.title else "") or ""
    desc = ""
    md = soup.find("meta", attrs={"name": "description"}) or soup.find(
        "meta", attrs={"property": "og:description"}
    )
    if md and md.get("content"):
        desc = md["content"].strip()

    # ---- declared colors (highest confidence) ----
    declared: list[str] = []
    for sel in ("theme-color", "msapplication-TileColor"):
        tag = soup.find("meta", attrs={"name": sel})
        if tag and tag.get("content"):
            rgb = _parse_color(tag["content"])
            if rgb:
                declared.append(_to_hex(*rgb))

    style_blocks = " ".join(s.get_text() for s in soup.find_all("style"))
    inline_styles = " ".join(
        t.get("style", "") for t in soup.find_all(style=True)
    )

    # ---- pull a few linked stylesheets (many sites ship colors only there) ----
    sheet_hrefs: list[str] = []
    for link in soup.find_all("link", href=True):
        rel = " ".join(link.get("rel") or []).lower()
        href = link["href"]
        if "stylesheet" in rel or href.lower().split("?")[0].endswith(".css"):
            sheet_hrefs.append(urljoin(base, href))
    external_css = ""
    if sheet_hrefs:
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c2:
                for h in sheet_hrefs[:4]:
                    try:
                        r = await c2.get(h, headers={"User-Agent": UA})
                        if r.status_code == 200 and "css" in r.headers.get(
                            "content-type", "css"
                        ):
                            external_css += " " + r.text[:400000]
                    except Exception:  # noqa: BLE001
                        continue
        except Exception:  # noqa: BLE001
            pass

    css_text = style_blocks + " " + inline_styles + " " + external_css
    for m in _VAR_RE.finditer(css_text):
        rgb = _parse_color(m.group(1))
        if rgb and _is_vivid(*rgb):
            declared.append(_to_hex(*rgb))

    # ---- frequency of vivid colors across CSS ----
    freq: Counter[str] = Counter()
    for m in _HEX_RE.finditer(css_text):
        rgb = _parse_color("#" + m.group(1))
        if rgb and _is_vivid(*rgb):
            freq[_to_hex(*rgb)] += 1
    for m in _RGB_RE.finditer(css_text):
        rgb = _parse_color("rgb(" + m.group(1) + ")")
        if rgb and _is_vivid(*rgb):
            freq[_to_hex(*rgb)] += 1

    palette: list[str] = []
    for c in declared:
        if c not in palette:
            palette.append(c)
    for c, _ in freq.most_common(10):
        if c not in palette:
            palette.append(c)

    primary = palette[0] if palette else None
    accent = palette[1] if len(palette) > 1 else None

    # ---- logo ----
    logo = None
    og = soup.find("meta", attrs={"property": "og:image"})
    if og and og.get("content"):
        logo = urljoin(base, og["content"])
    if not logo:
        for img in soup.find_all("img", src=True):
            src = img["src"]
            alt = (img.get("alt") or "").lower()
            if "logo" in src.lower() or "logo" in alt:
                logo = urljoin(base, src)
                break

    # ---- social links ----
    socials = []
    social_domains = ("linkedin.com", "twitter.com", "x.com", "facebook.com",
                      "instagram.com", "youtube.com", "tiktok.com")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if any(d in href for d in social_domains) and href.startswith("http"):
            if href not in socials:
                socials.append(href)

    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = " ".join(soup.get_text(" ").split())[:20000]

    return BrandProfile(
        url=final_url,
        ok=True,
        title=title,
        description=desc,
        primary_color=primary,
        accent_color=accent,
        palette=palette[:8],
        logo_url=logo,
        social_links=socials[:10],
        text=text,
    )
