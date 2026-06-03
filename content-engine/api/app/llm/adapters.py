"""Azure LLM adapters mirroring the main Trayarunya site.

Two providers, one async interface:
  - ``complete_gpt5``  -> Azure OpenAI Responses API
  - ``complete_claude``-> Azure Anthropic Messages API

``complete()`` picks a provider and returns the full text. A thin JSON helper
(``complete_json``) coerces the model output into a dict.
"""
from __future__ import annotations

import json
from typing import Any, Literal

import httpx

from app.config import settings

Provider = Literal["gpt-5.5", "claude-opus"]

CLAUDE_MAX_OUTPUT_TOKENS = 128_000


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
    async with httpx.AsyncClient(timeout=180) as client:
        res = await client.post(
            _gpt5_url(),
            headers={"api-key": settings.azure_gpt5_key or "", "Content-Type": "application/json"},
            json=payload,
        )
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
    res.raise_for_status()
    data = res.json()
    return "".join(
        c.get("text", "")
        for c in data.get("content", [])
        if c.get("type") == "text"
    )


async def complete(
    messages: list[dict[str, str]],
    system: str,
    provider: Provider | None = None,
) -> str:
    """Complete with the requested provider, falling back to whatever is configured."""
    chosen: Provider | None = provider
    if chosen is None:
        chosen = "claude-opus" if settings.claude_configured else "gpt-5.5"
    if chosen == "claude-opus" and settings.claude_configured:
        return await complete_claude(messages, system)
    if chosen == "gpt-5.5" and settings.gpt5_configured:
        return await complete_gpt5(messages, system)
    # Fall back to the other provider if the requested one is unavailable.
    if settings.claude_configured:
        return await complete_claude(messages, system)
    if settings.gpt5_configured:
        return await complete_gpt5(messages, system)
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
