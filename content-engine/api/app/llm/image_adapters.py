"""Azure image adapters for social graphics (Canva/Gamma-style).

Four providers, one async interface returning raw PNG bytes:
  - ``gpt-image``    -> Azure OpenAI images/generations + images/edits (gpt-image-2-1)
  - ``gpt-image-1.5``-> Azure OpenAI images/generations (gpt-image-1.5 deployment, same creds)
  - ``mai``          -> MAI-Image-2.5 (Azure AI services)
  - ``flux``         -> FLUX.2-pro (Black Forest Labs via Azure AI Foundry)

``generate_image()`` is **capacity-aware**: it first fills the preferred provider
up to its per-minute limit (RPM), then overflows to the next most-available
provider automatically.  For a 20-slide deck where the preferred model allows
only 5 rpm, slides 1-5 go there and slides 6-20 spill to the next configured
provider with remaining capacity.

``edit_image()`` does image-to-image via gpt-image's edits endpoint.
"""
from __future__ import annotations

import asyncio
import base64
import time
from collections import deque
from typing import Literal

import httpx

from app.config import settings

ImageProvider = Literal["gpt-image", "gpt-image-1.5", "mai", "flux"]

PROVIDER_ALIASES = {
    "gpt-image": "gpt-image",
    "gpt-image-2-1": "gpt-image",
    "gpt": "gpt-image",
    "gpt-image-1.5": "gpt-image-1.5",
    "gpt1.5": "gpt-image-1.5",
    "mai": "mai",
    "mai-image-2.5": "mai",
    "mai-image": "mai",
    "flux": "flux",
    "flux-2-pro": "flux",
    "flux.2-pro": "flux",
    # Legacy ids (retired MAI v1 blend) degrade gracefully to MAI-Image-2.5.
    "mai-2": "mai",
    "mai-image-2": "mai",
    "mai-flash": "mai",
    "mai-image-2.5-flash": "mai",
    "flash": "mai",
    "mai-blend": "mai",
    "mai-studio": "mai",
    "blend": "mai",
}

_TIMEOUT = httpx.Timeout(180.0, connect=20.0)


def normalize_provider(value: str | None) -> ImageProvider:
    if not value:
        return "gpt-image"
    return PROVIDER_ALIASES.get(value.lower().strip(), "gpt-image")  # type: ignore[return-value]


def normalize_provider(value: str | None) -> ImageProvider:
    if not value:
        return "gpt-image"
    return PROVIDER_ALIASES.get(value.lower().strip(), "gpt-image")  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Per-provider sliding-window rate limiter
# ---------------------------------------------------------------------------

class _SlidingWindow:
    """1-minute sliding-window counter for a single provider.

    ``acquire()`` claims a slot and returns True when capacity is available,
    or False when the provider is at its RPM ceiling.  Thread-safe via asyncio
    lock — safe across concurrent deck-image tasks in the same process.
    """

    def __init__(self, rpm: int) -> None:
        self._rpm = rpm
        self._timestamps: deque[float] = deque()
        self._lock = asyncio.Lock()

    @property
    def rpm(self) -> int:
        return self._rpm

    def _purge(self, now: float) -> None:
        cutoff = now - 60.0
        while self._timestamps and self._timestamps[0] < cutoff:
            self._timestamps.popleft()

    def available(self) -> int:
        """Approximate remaining capacity (no lock — for ordering decisions)."""
        now = time.monotonic()
        self._purge(now)
        return max(0, self._rpm - len(self._timestamps))

    async def acquire(self) -> bool:
        """Claim one slot. Returns True if acquired, False if rate-limited."""
        async with self._lock:
            now = time.monotonic()
            self._purge(now)
            if len(self._timestamps) < self._rpm:
                self._timestamps.append(now)
                return True
            return False


def _rpm(provider: ImageProvider) -> int:
    """Return the configured RPM for a provider, defaulting conservatively."""
    return {
        "gpt-image": settings.image_rpm,
        "gpt-image-1.5": settings.image_15_rpm,
        "mai": settings.mai_image_rpm,
        "flux": settings.flux_rpm,
    }.get(provider, 5)


# Module-level pool — created lazily so tests can override settings first.
_POOL: dict[ImageProvider, _SlidingWindow] = {}


def _get_window(provider: ImageProvider) -> _SlidingWindow:
    if provider not in _POOL:
        _POOL[provider] = _SlidingWindow(_rpm(provider))
    return _POOL[provider]


def _build_order(preferred: ImageProvider) -> list[ImageProvider]:
    """Return providers ordered by: preferred first, then remaining capacity desc.

    The preferred provider is placed at the front regardless of current usage so
    the caller's choice is honoured until its RPM budget is fully exhausted.
    Other configured providers fill in by descending available capacity.
    """
    all_providers: list[ImageProvider] = ["gpt-image", "gpt-image-1.5", "mai", "flux"]
    others = sorted(
        [p for p in all_providers if p != preferred],
        key=lambda p: _get_window(p).available(),
        reverse=True,
    )
    return [preferred, *others]


def size_for_dims(width: int, height: int) -> str:
    """Map an output WxH to the nearest size the image models support.

    gpt-image / MAI accept 1024x1024 (square), 1024x1536 (portrait) and
    1536x1024 (landscape). We pick by aspect ratio; the caller scales/crops the
    returned PNG to the exact video dimensions afterwards.
    """
    if height <= 0 or width <= 0:
        return "1024x1024"
    ratio = width / height
    if ratio >= 1.2:
        return "1536x1024"
    if ratio <= 0.83:
        return "1024x1536"
    return "1024x1024"


def _b64_from_openai_payload(payload: dict) -> bytes:
    data = (payload.get("data") or [])
    if not data:
        raise RuntimeError("Image API returned no data")
    item = data[0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    if item.get("url"):
        # Some deployments return a URL instead of inline base64.
        raise _NeedsUrlFetch(item["url"])
    raise RuntimeError("Image API returned neither b64_json nor url")


class _NeedsUrlFetch(Exception):
    def __init__(self, url: str):
        self.url = url


async def _fetch_url(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


async def _gpt_image(prompt: str, size: str, quality: str = "high") -> bytes:
    base = (settings.azure_image_endpoint or "").rstrip("/")
    url = (
        f"{base}/openai/deployments/{settings.azure_image_deployment}"
        f"/images/generations?api-version={settings.azure_image_api_version}"
    )
    payload = {"prompt": prompt, "n": 1, "size": size, "quality": quality}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(
            url,
            headers={"api-key": settings.azure_image_key or "", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code == 400:
            # Some deployments reject the quality field — retry without it.
            payload.pop("quality", None)
            r = await client.post(
                url,
                headers={"api-key": settings.azure_image_key or "", "Content-Type": "application/json"},
                json=payload,
            )
        r.raise_for_status()
        try:
            return _b64_from_openai_payload(r.json())
        except _NeedsUrlFetch as e:
            return await _fetch_url(e.url)


async def _gpt_image_15(prompt: str, size: str, quality: str = "high") -> bytes:
    """Same Azure OpenAI endpoint/key as gpt-image, but uses the gpt-image-1.5 deployment."""
    base = (settings.azure_image_endpoint or "").rstrip("/")
    url = (
        f"{base}/openai/deployments/{settings.azure_image_15_deployment}"
        f"/images/generations?api-version={settings.azure_image_api_version}"
    )
    payload = {"prompt": prompt, "n": 1, "size": size, "quality": quality}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(
            url,
            headers={"api-key": settings.azure_image_key or "", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code == 400:
            payload.pop("quality", None)
            r = await client.post(
                url,
                headers={"api-key": settings.azure_image_key or "", "Content-Type": "application/json"},
                json=payload,
            )
        r.raise_for_status()
        try:
            return _b64_from_openai_payload(r.json())
        except _NeedsUrlFetch as e:
            return await _fetch_url(e.url)



    base = (settings.azure_mai_image_endpoint or "").rstrip("/")
    url = (
        f"{base}/openai/deployments/{settings.azure_mai_image_deployment}"
        f"/images/generations?api-version=2024-02-01"
    )
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(
            url,
            headers={"api-key": settings.azure_mai_image_key or "", "Content-Type": "application/json"},
            json={"prompt": prompt, "n": 1, "size": size},
        )
        r.raise_for_status()
        try:
            return _b64_from_openai_payload(r.json())
        except _NeedsUrlFetch as e:
            return await _fetch_url(e.url)


async def _flux_image(prompt: str, size: str) -> bytes:
    """Black Forest Labs FLUX via Azure AI Foundry (async polling pattern)."""
    url = settings.azure_flux_endpoint or ""
    try:
        w, h = (int(x) for x in size.lower().split("x"))
    except Exception:
        w, h = 1024, 1024
    headers = {
        "Authorization": f"Bearer {settings.azure_flux_key or ''}",
        "Content-Type": "application/json",
    }
    body = {"model": settings.azure_flux_model, "prompt": prompt, "width": w, "height": h}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(url, headers=headers, json=body)
        r.raise_for_status()
        payload = r.json()
        # Inline result?
        if isinstance(payload, dict):
            if payload.get("data") and isinstance(payload["data"], list):
                try:
                    return _b64_from_openai_payload(payload)
                except _NeedsUrlFetch as e:
                    return await _fetch_url(e.url)
            # Polling pattern: poll until an image url is returned.
            poll_url = payload.get("polling_url") or payload.get("id")
            sample = (payload.get("result") or {}).get("sample")
            if sample:
                return await _fetch_url(sample)
            if poll_url and poll_url.startswith("http"):
                for _ in range(30):
                    await asyncio.sleep(2)
                    pr = await client.get(poll_url, headers=headers)
                    pr.raise_for_status()
                    pj = pr.json()
                    status = (pj.get("status") or "").lower()
                    res = pj.get("result") or {}
                    if res.get("sample"):
                        return await _fetch_url(res["sample"])
                    if status in ("ready", "succeeded", "completed") and pj.get("data"):
                        return _b64_from_openai_payload(pj)
                    if status in ("error", "failed"):
                        raise RuntimeError(f"FLUX generation failed: {pj}")
    raise RuntimeError("FLUX returned an unrecognized response")


async def _gpt_image_edit(
    prompt: str,
    images: list[bytes],
    size: str,
    quality: str = "high",
) -> bytes:
    """Image-to-image via Azure OpenAI ``images/edits`` (gpt-image-2-1).

    The first image is the canvas to edit; any additional images are treated as
    references (e.g. the brand logo). gpt-image honours the requested ``size`` and
    composes a fresh PNG using the inputs as guidance.
    """
    base = (settings.azure_image_endpoint or "").rstrip("/")
    url = (
        f"{base}/openai/deployments/{settings.azure_image_deployment}"
        f"/images/edits?api-version={settings.azure_image_api_version}"
    )
    files = [
        ("image[]", (f"image_{i}.png", img, "image/png"))
        for i, img in enumerate(images)
        if img
    ]
    if not files:
        raise RuntimeError("edit_image called with no input images")
    data = {"prompt": prompt, "n": "1", "size": size, "quality": quality}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(
            url,
            headers={"api-key": settings.azure_image_key or ""},
            data=data,
            files=files,
        )
        if r.status_code == 400:
            # Some deployments reject quality or the image[] field name — retry leaner.
            data.pop("quality", None)
            files_single = [("image", (f"image_0.png", images[0], "image/png"))]
            r = await client.post(
                url,
                headers={"api-key": settings.azure_image_key or ""},
                data=data,
                files=files_single,
            )
        r.raise_for_status()
        try:
            return _b64_from_openai_payload(r.json())
        except _NeedsUrlFetch as e:
            return await _fetch_url(e.url)


async def generate_image(
    prompt: str,
    size: str = "1024x1024",
    provider: str | None = None,
    quality: str = "high",
) -> tuple[bytes, str]:
    """Generate a PNG image. Returns (png_bytes, provider_used).

    **Capacity-aware**: fills the preferred provider up to its RPM limit, then
    automatically overflows to the next most-available provider.  For a 20-slide
    deck where the preferred model allows 5 rpm, requests 1-5 go there and 6-20
    spill to whichever provider has the most remaining capacity — with no
    manual intervention needed.

    ``quality`` (low|medium|high) is honoured by gpt-image/gpt-image-1.5;
    other providers ignore it.
    """
    chosen = normalize_provider(provider)
    order = _build_order(chosen)

    last_error: Exception | None = None
    for prov in order:
        window = _get_window(prov)
        # Skip if rate-limit window is full for this provider.
        if not await window.acquire():
            continue
        try:
            if prov == "gpt-image":
                if not settings.image_configured:
                    continue
                return await _gpt_image(prompt, size, quality), "gpt-image"
            if prov == "gpt-image-1.5":
                if not settings.image_configured:
                    continue
                return await _gpt_image_15(prompt, size, quality), "gpt-image-1.5"
            if prov == "mai":
                if not settings.mai_image_configured:
                    continue
                return await _mai_image(prompt, size), "mai"
            if prov == "flux":
                if not (settings.azure_flux_endpoint and settings.azure_flux_key):
                    continue
                return await _flux_image(prompt, size), "flux"
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            continue

    if last_error:
        raise last_error
    raise RuntimeError("No image generation provider available (all configured providers at capacity or unconfigured)")


async def edit_image(
    prompt: str,
    images: list[bytes],
    size: str = "1024x1024",
    provider: str | None = None,
    quality: str = "high",
) -> tuple[bytes, str]:
    """Image-to-image edit. Returns (png_bytes, provider_used).

    Uses gpt-image ``images/edits`` to transform the provided source image(s)
    according to ``prompt`` (the first image is the canvas, the rest are
    references such as the brand logo). All current providers funnel through
    gpt-image for editing since it is the reliable, configured edit backend.

    Falls back to text-to-image ``generate_image`` if editing is unavailable or
    errors, so callers never hard-fail.
    """
    inputs = [img for img in images if img]
    if inputs and settings.image_configured:
        try:
            png = await _gpt_image_edit(prompt, inputs, size, quality)
            return png, "gpt-image"
        except Exception:  # noqa: BLE001 — fall back to fresh generation below.
            pass
    return await generate_image(prompt, size=size, provider=provider, quality=quality)
