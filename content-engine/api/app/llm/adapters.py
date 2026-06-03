"""Azure LLM adapters mirroring the main Trayarunya site.

Two providers, one async interface:
  - ``complete_gpt5``  -> Azure OpenAI Responses API
  - ``complete_claude``-> Azure Anthropic Messages API

``complete()`` picks a provider and returns the full text. A thin JSON helper
(``complete_json``) coerces the model output into a dict.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Literal

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

Provider = Literal["gpt-5.5", "claude-opus"]

CLAUDE_MAX_OUTPUT_TOKENS = 128_000
_RETRY_STATUSES = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3


def _gpt5_url() -> str:
    endpoint = (settings.azure_gpt5_endpoint or "").rstrip("/")
    endpoint = endpoint.split("/openai/responses")[0]
    return f"{endpoint}/openai/responses?api-version={settings.azure_gpt5_api_version}"


async def complete_gpt5(messages: list[dict[str, str]], system: str) -> str:
    if not settings.gpt5_configured:
        raise RuntimeError("GPT-5.5 is not configured")
    payload = {
        "model": settings.azure_gpt5_deployment,
        "instructions": system,
        "input": [
            {
                "type": "message",
                "role": m["role"],
                "content": [
                    {
                        "type": "output_text" if m["role"] == "assistant" else "input_text",
                        "text": m["content"],
                    }
                ],
            }
            for m in messages
        ],
        "stream": False,
        "store": False,
    }
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                res = await client.post(
                    _gpt5_url(),
                    headers={"api-key": settings.azure_gpt5_key or "", "Content-Type": "application/json"},
                    json=payload,
                )
            if res.status_code in _RETRY_STATUSES and attempt < _MAX_RETRIES - 1:
                wait = 2.0 ** attempt
                logger.warning("GPT-5.5 returned %d, retrying in %.1fs (attempt %d/%d)", res.status_code, wait, attempt + 1, _MAX_RETRIES)
                await asyncio.sleep(wait)
                continue
            res.raise_for_status()
            data = res.json()
            if isinstance(data.get("output_text"), str) and data["output_text"]:
                return data["output_text"]
            text = ""
            for item in data.get("output", []) or []:
                for part in item.get("content", []) or []:
                    if part.get("type") == "output_text" and isinstance(part.get("text"), str):
                        text += part["text"]
            return text
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            if exc.response.status_code not in _RETRY_STATUSES or attempt >= _MAX_RETRIES - 1:
                raise
            wait = 2.0 ** attempt
            logger.warning("GPT-5.5 HTTP %d, retrying in %.1fs", exc.response.status_code, wait)
            await asyncio.sleep(wait)
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            last_exc = exc
            if attempt >= _MAX_RETRIES - 1:
                raise
            wait = 2.0 ** attempt
            logger.warning("GPT-5.5 connection error, retrying in %.1fs: %s", wait, exc)
            await asyncio.sleep(wait)
    raise last_exc or RuntimeError("GPT-5.5 failed after retries")


async def complete_claude(messages: list[dict[str, str]], system: str) -> str:
    if not settings.claude_configured:
        raise RuntimeError("Claude Opus is not configured")
    payload = {
        "model": settings.azure_anthropic_model,
        "max_tokens": CLAUDE_MAX_OUTPUT_TOKENS,
        "system": system,
        "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
        "stream": False,
    }
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=300) as client:
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
                wait = 2.0 ** attempt
                logger.warning("Claude returned %d, retrying in %.1fs (attempt %d/%d)", res.status_code, wait, attempt + 1, _MAX_RETRIES)
                await asyncio.sleep(wait)
                continue
            res.raise_for_status()
            data = res.json()
            return "".join(
                c.get("text", "")
                for c in data.get("content", [])
                if c.get("type") == "text"
            )
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            if exc.response.status_code not in _RETRY_STATUSES or attempt >= _MAX_RETRIES - 1:
                raise
            wait = 2.0 ** attempt
            logger.warning("Claude HTTP %d, retrying in %.1fs", exc.response.status_code, wait)
            await asyncio.sleep(wait)
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            last_exc = exc
            if attempt >= _MAX_RETRIES - 1:
                raise
            wait = 2.0 ** attempt
            logger.warning("Claude connection error, retrying in %.1fs: %s", wait, exc)
            await asyncio.sleep(wait)
    raise last_exc or RuntimeError("Claude failed after retries")


async def complete(
    messages: list[dict[str, str]],
    system: str,
    provider: Provider | None = None,
) -> str:
    """Complete with the requested provider, falling back to whatever is configured.

    If the requested provider is configured but fails at call time (e.g. the
    endpoint is unreachable), transparently fall back to the other provider so
    content generation stays resilient to a single provider outage.
    """
    chosen: Provider | None = provider
    if chosen is None:
        chosen = "claude-opus" if settings.claude_configured else "gpt-5.5"

    order: list[Provider] = []
    if chosen == "claude-opus":
        order = ["claude-opus", "gpt-5.5"]
    else:
        order = ["gpt-5.5", "claude-opus"]

    last_error: Exception | None = None
    for prov in order:
        if prov == "claude-opus" and not settings.claude_configured:
            continue
        if prov == "gpt-5.5" and not settings.gpt5_configured:
            continue
        try:
            if prov == "claude-opus":
                return await complete_claude(messages, system)
            return await complete_gpt5(messages, system)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            continue

    if last_error:
        raise last_error
    raise RuntimeError("No Azure LLM provider configured")


def _extract_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        text = text.rsplit("```", 1)[0]
        text = text.removeprefix("json").strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


async def complete_json(
    messages: list[dict[str, str]],
    system: str,
    provider: Provider | None = None,
) -> dict[str, Any]:
    raw = await complete(messages, system, provider)
    try:
        return json.loads(_extract_json(raw))
    except json.JSONDecodeError:
        return {"_raw": raw, "_parse_error": True}
