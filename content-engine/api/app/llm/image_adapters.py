"""Azure text-to-image adapters for social graphics (Canva/Gamma-style).

Three providers, one async interface returning raw PNG bytes:
  - ``gpt-image``  -> Azure OpenAI images/generations (gpt-image-2-1) [primary, reliable]
  - ``mai``        -> MAI-Image-2.5 (Azure AI services)
  - ``flux``       -> FLUX.2-pro (Black Forest Labs via Azure AI Foundry)

``generate_image()`` selects a provider and gracefully falls back to gpt-image
if the requested provider errors or is not configured, so image generation never
hard-fails when at least gpt-image is available.
"""
from __future__ import annotations

import asyncio
import base64
from typing import Literal

import httpx

from app.config import settings

ImageProvider = Literal["gpt-image", "mai", "flux"]

PROVIDER_ALIASES = {
    "gpt-image": "gpt-image",
    "gpt-image-2-1": "gpt-image",
    "gpt": "gpt-image",
    "mai": "mai",
    "mai-image-2.5": "mai",
    "mai-image": "mai",
    "flux": "flux",
    "flux-2-pro": "flux",
    "flux.2-pro": "flux",
}

_TIMEOUT = httpx.Timeout(180.0, connect=20.0)


def normalize_provider(value: str | None) -> ImageProvider:
    if not value:
        return "gpt-image"
    return PROVIDER_ALIASES.get(value.lower().strip(), "gpt-image")  # type: ignore[return-value]


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


async def _mai_image(prompt: str, size: str) -> bytes:
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


async def generate_image(
    prompt: str,
    size: str = "1024x1024",
    provider: str | None = None,
    quality: str = "high",
) -> tuple[bytes, str]:
    """Generate a PNG image. Returns (png_bytes, provider_used).

    Falls back to gpt-image when the requested provider errors so the feature
    stays resilient to a single provider/deployment being unavailable.
    ``quality`` (low|medium|high) is honoured by gpt-image; other providers ignore it.
    """
    chosen = normalize_provider(provider)

    order: list[ImageProvider] = []
    if chosen != "gpt-image":
        order.append(chosen)
    order.append("gpt-image")

    last_error: Exception | None = None
    for prov in order:
        try:
            if prov == "gpt-image":
                if not settings.image_configured:
                    continue
                return await _gpt_image(prompt, size, quality), "gpt-image"
            if prov == "mai":
                if not (settings.azure_mai_image_endpoint and settings.azure_mai_image_key):
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
    raise RuntimeError("No image generation provider configured")
