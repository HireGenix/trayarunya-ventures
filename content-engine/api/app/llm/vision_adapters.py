"""Azure multimodal (vision) LLM adapters.

Adds a base64-image input path on top of the text-only ``adapters`` module so the
LinkedIn Copilot can send live screenshots/DOM crops to a vision model and get
back structured, policy-safe guidance.

Two providers, one async interface:
  - ``complete_vision_gpt5``   -> Azure OpenAI Responses API (``input_image``)
  - ``complete_vision_claude`` -> Azure Anthropic Messages API (image content blocks)

``complete_vision`` picks a provider (falling back to the other) and returns text.
``complete_vision_json`` coerces the output into a dict.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Literal

import httpx

from app.config import settings
from app.llm.adapters import Provider, _extract_json

logger = logging.getLogger(__name__)

_RETRY_STATUSES = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3
_CLAUDE_MAX_OUTPUT_TOKENS = 8_000
_MAX_IMAGES = 6

_VisionMediaType = Literal["image/png", "image/jpeg", "image/webp", "image/gif"]


def _normalize_data_url(image: str) -> tuple[str, str, str]:
    """Return (data_url, media_type, raw_base64) for a base64 image string.

    Accepts either a full ``data:image/png;base64,xxxx`` URL or a raw base64 body
    (assumed PNG).
    """
    if image.startswith("data:"):
        try:
            header, body = image.split(",", 1)
            media_type = header.split(";")[0].removeprefix("data:") or "image/png"
        except ValueError:
            media_type, body = "image/png", image
        return image, media_type, body
    media_type = "image/png"
    return f"data:{media_type};base64,{image}", media_type, image


def _gpt5_url() -> str:
    endpoint = (settings.azure_gpt5_endpoint or "").rstrip("/")
    endpoint = endpoint.split("/openai/responses")[0]
    return f"{endpoint}/openai/responses?api-version={settings.azure_gpt5_api_version}"


async def complete_vision_gpt5(text: str, images: list[str], system: str) -> str:
    if not settings.gpt5_configured:
        raise RuntimeError("GPT-5.5 is not configured")
    content: list[dict[str, Any]] = [{"type": "input_text", "text": text}]
    for img in images[:_MAX_IMAGES]:
        data_url, _media, _body = _normalize_data_url(img)
        content.append({"type": "input_image", "image_url": data_url})
    payload = {
        "model": settings.azure_gpt5_deployment,
        "instructions": system,
        "input": [{"type": "message", "role": "user", "content": content}],
        "stream": False,
        "store": False,
    }
    for attempt in range(_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                res = await client.post(
                    _gpt5_url(),
                    headers={"api-key": settings.azure_gpt5_key or "", "Content-Type": "application/json"},
                    json=payload,
                )
            if res.status_code in _RETRY_STATUSES and attempt < _MAX_RETRIES - 1:
                await asyncio.sleep(2.0 ** attempt)
                continue
            res.raise_for_status()
            data = res.json()
            if isinstance(data.get("output_text"), str) and data["output_text"]:
                return data["output_text"]
            text_out = ""
            for item in data.get("output", []) or []:
                for part in item.get("content", []) or []:
                    if part.get("type") == "output_text" and isinstance(part.get("text"), str):
                        text_out += part["text"]
            return text_out
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in _RETRY_STATUSES or attempt >= _MAX_RETRIES - 1:
                raise
            await asyncio.sleep(2.0 ** attempt)
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            if attempt >= _MAX_RETRIES - 1:
                raise
            logger.warning("GPT-5.5 vision connection error, retrying: %s", exc)
            await asyncio.sleep(2.0 ** attempt)
    raise RuntimeError("GPT-5.5 vision failed after retries")


async def complete_vision_claude(text: str, images: list[str], system: str) -> str:
    if not settings.claude_configured:
        raise RuntimeError("Claude Opus is not configured")
    content: list[dict[str, Any]] = []
    for img in images[:_MAX_IMAGES]:
        _data_url, media_type, body = _normalize_data_url(img)
        content.append(
            {
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": body},
            }
        )
    content.append({"type": "text", "text": text})
    payload = {
        "model": settings.azure_anthropic_model,
        "max_tokens": _CLAUDE_MAX_OUTPUT_TOKENS,
        "system": system,
        "messages": [{"role": "user", "content": content}],
        "stream": False,
    }
    for attempt in range(_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                res = await client.post(
                    settings.azure_anthropic_endpoint,
                    headers={
                        "x-api-key": settings.azure_anthropic_key or "",
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
            if res.status_code in _RETRY_STATUSES and attempt < _MAX_RETRIES - 1:
                await asyncio.sleep(2.0 ** attempt)
                continue
            res.raise_for_status()
            data = res.json()
            return "".join(c.get("text", "") for c in data.get("content", []) if c.get("type") == "text")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in _RETRY_STATUSES or attempt >= _MAX_RETRIES - 1:
                raise
            await asyncio.sleep(2.0 ** attempt)
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            if attempt >= _MAX_RETRIES - 1:
                raise
            logger.warning("Claude vision connection error, retrying: %s", exc)
            await asyncio.sleep(2.0 ** attempt)
    raise RuntimeError("Claude vision failed after retries")


def vision_configured() -> bool:
    return bool(settings.gpt5_configured or settings.claude_configured)


async def complete_vision(
    text: str,
    images: list[str],
    system: str,
    provider: Provider | None = None,
) -> str:
    """Run a vision completion with fallback across configured providers."""
    chosen: Provider | None = provider
    if chosen is None:
        chosen = "gpt-5.5" if settings.gpt5_configured else "claude-opus"
    order: list[Provider] = ["gpt-5.5", "claude-opus"] if chosen == "gpt-5.5" else ["claude-opus", "gpt-5.5"]

    last_error: Exception | None = None
    for prov in order:
        if prov == "gpt-5.5" and not settings.gpt5_configured:
            continue
        if prov == "claude-opus" and not settings.claude_configured:
            continue
        try:
            if prov == "gpt-5.5":
                return await complete_vision_gpt5(text, images, system)
            return await complete_vision_claude(text, images, system)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            continue
    if last_error:
        raise last_error
    raise RuntimeError("No Azure vision provider configured")


async def complete_vision_json(
    text: str,
    images: list[str],
    system: str,
    provider: Provider | None = None,
) -> dict[str, Any]:
    raw = await complete_vision(text, images, system, provider)
    try:
        return json.loads(_extract_json(raw))
    except json.JSONDecodeError:
        return {"_raw": raw, "_parse_error": True}
