"""Generic Azure LLM adapter driven by the model registry.

Every usable model lives in the DB-backed model registry and is mirrored into an
in-memory snapshot (:mod:`app.llm.registry_cache`). ``complete()`` resolves a
model by key (or the configured default), then dispatches by the model's ``kind``
to one of three Azure API shapes:

  - ``responses``         -> Azure OpenAI Responses API
  - ``anthropic``         -> Azure Anthropic Messages API
  - ``chat_completions``  -> Azure AI model-inference chat/completions API

Adding, changing or removing a model is a registry edit — no code change here.

Backwards compatibility: the legacy provider aliases ("gpt-5.5", "claude-opus",
"claude", "gpt5", …) are mapped onto registry keys, and if the registry snapshot
is empty (e.g. very early startup) we fall back to reading provider config
straight from ``settings`` so the platform never hard-fails.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import httpx

from app.config import settings
from app.llm import registry_cache
from app.llm.registry_cache import ResolvedModel

logger = logging.getLogger(__name__)

# Kept as ``str`` (not a closed Literal) so new registry keys work without code
# edits. Type alias retained for the many call sites that import ``Provider``.
Provider = str

CLAUDE_MAX_OUTPUT_TOKENS = 128_000
_RETRY_STATUSES = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3

# Friendly aliases -> registry keys, so existing callers/UI values keep working.
_ALIASES = {
    "gpt": "gpt-5.5",
    "gpt5": "gpt-5.5",
    "gpt-5.5": "gpt-5.5",
    "gpt-chat": "gpt-chat-latest",
    "gpt-chat-latest": "gpt-chat-latest",
    "claude": "claude-opus",
    "opus": "claude-opus",
    "claude-opus": "claude-opus",
    "sonnet": "claude-sonnet",
    "claude-sonnet": "claude-sonnet",
    "claude-sonnet-4-6": "claude-sonnet",
    "grok": "grok-4.3",
    "grok-4": "grok-4.3",
    "grok-4.3": "grok-4.3",
}


def _resolve_key(provider: str | None) -> str | None:
    if not provider:
        return None
    p = provider.strip().lower()
    if registry_cache.get(p):
        return p
    alias = _ALIASES.get(p)
    if alias and registry_cache.get(alias):
        return alias
    return alias or p


# --------------------------------------------------------------------------- #
# Legacy settings fallback (only used if the registry snapshot is empty)
# --------------------------------------------------------------------------- #
def _legacy_model(key: str | None) -> ResolvedModel | None:
    """Resolve a provider straight from settings when the cache is unloaded."""
    k = (key or "").lower()
    if k in ("claude-sonnet", "sonnet", "claude-sonnet-4-6") and settings.claude_sonnet_configured:
        return ResolvedModel(
            key="claude-sonnet", label="Claude Sonnet 4.6", kind="anthropic",
            endpoint=settings.azure_anthropic_endpoint, api_key=settings.azure_anthropic_key,
            model_name=settings.azure_anthropic_sonnet_model, api_version=None,
            enabled=True, is_default=False, sort_order=30,
        )
    if k in ("grok", "grok-4.3", "grok-4") and settings.grok_configured:
        return ResolvedModel(
            key="grok-4.3", label="Grok 4.3", kind="chat_completions",
            endpoint=settings.azure_grok_endpoint, api_key=settings.grok_key,
            model_name=settings.azure_grok_model, api_version=settings.azure_grok_api_version,
            enabled=True, is_default=False, sort_order=40,
        )
    if k in ("gpt-chat-latest", "gpt-chat") and settings.gptchat_configured:
        return ResolvedModel(
            key="gpt-chat-latest", label="GPT Chat (latest)", kind="responses",
            endpoint=settings.gptchat_endpoint, api_key=settings.gptchat_key,
            model_name=settings.azure_gptchat_deployment, api_version=settings.azure_gptchat_api_version,
            enabled=True, is_default=False, sort_order=50,
        )
    if k in ("", "claude", "claude-opus", "opus") and settings.claude_configured:
        return ResolvedModel(
            key="claude-opus", label="Claude Opus", kind="anthropic",
            endpoint=settings.azure_anthropic_endpoint, api_key=settings.azure_anthropic_key,
            model_name=settings.azure_anthropic_model, api_version=None,
            enabled=True, is_default=True, sort_order=20,
        )
    if settings.gpt5_configured:  # default workhorse / final fallback
        return ResolvedModel(
            key="gpt-5.5", label="GPT-5.5", kind="responses",
            endpoint=settings.azure_gpt5_endpoint, api_key=settings.azure_gpt5_key,
            model_name=settings.azure_gpt5_deployment, api_version=settings.azure_gpt5_api_version,
            enabled=True, is_default=True, sort_order=10,
        )
    return None


def _pick(provider: str | None) -> ResolvedModel | None:
    """Resolve the model to use, preferring the live registry snapshot."""
    key = _resolve_key(provider)
    if registry_cache.loaded():
        m = registry_cache.get(key) if key else None
        if m and m.configured and m.enabled:
            return m
        dflt = registry_cache.default_model()
        if dflt and dflt.configured:
            return dflt
        nxt = next((x for x in registry_cache.list_enabled() if x.configured), None)
        if nxt:
            return nxt
    return _legacy_model(key)


def _fallback_chain(primary: ResolvedModel | None) -> list[ResolvedModel]:
    """Primary first, then any other configured+enabled models for resilience."""
    chain: list[ResolvedModel] = []
    if primary:
        chain.append(primary)
    if registry_cache.loaded():
        for m in registry_cache.list_enabled():
            if m.configured and all(m.key != c.key for c in chain):
                chain.append(m)
    else:
        legacy = _legacy_model(None)
        if legacy and all(legacy.key != c.key for c in chain):
            chain.append(legacy)
    return chain


# --------------------------------------------------------------------------- #
# Per-kind callers
# --------------------------------------------------------------------------- #
def _responses_url(model: ResolvedModel) -> str:
    endpoint = (model.endpoint or "").rstrip("/")
    endpoint = endpoint.split("/openai/responses")[0]
    version = model.api_version or "2025-04-01-preview"
    return f"{endpoint}/openai/responses?api-version={version}"


def _msg_images(m: dict) -> list[str]:
    imgs = m.get("images")
    return [i for i in imgs if isinstance(i, str) and i] if isinstance(imgs, list) else []


async def _call_responses(model: ResolvedModel, messages: list[dict[str, str]], system: str) -> str:
    def _content(m: dict) -> list[dict]:
        is_assistant = m["role"] == "assistant"
        parts: list[dict] = [
            {
                "type": "output_text" if is_assistant else "input_text",
                "text": m["content"],
            }
        ]
        if not is_assistant:
            for url in _msg_images(m):
                parts.append({"type": "input_image", "image_url": url})
        return parts

    payload = {
        "model": model.model_name,
        "instructions": system,
        "input": [
            {"type": "message", "role": m["role"], "content": _content(m)}
            for m in messages
        ],
        "stream": False,
        "store": False,
    }
    data = await _post_with_retry(
        _responses_url(model),
        headers={"api-key": model.api_key or "", "Content-Type": "application/json"},
        json_body=payload, timeout=180, label=model.key,
    )
    if isinstance(data.get("output_text"), str) and data["output_text"]:
        return data["output_text"]
    text = ""
    for item in data.get("output", []) or []:
        for part in item.get("content", []) or []:
            if part.get("type") == "output_text" and isinstance(part.get("text"), str):
                text += part["text"]
    return text


async def _call_anthropic(model: ResolvedModel, messages: list[dict[str, str]], system: str) -> str:
    def _content(m: dict):
        images = _msg_images(m) if m["role"] != "assistant" else []
        if not images:
            return m["content"]
        parts: list[dict] = [{"type": "text", "text": m["content"]}]
        for url in images:
            if url.startswith("data:"):
                try:
                    header, b64 = url.split(",", 1)
                    media_type = header.split(";")[0].removeprefix("data:") or "image/png"
                except ValueError:
                    continue
                parts.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": media_type, "data": b64},
                })
            else:
                parts.append({"type": "image", "source": {"type": "url", "url": url}})
        return parts

    payload = {
        "model": model.model_name,
        "max_tokens": CLAUDE_MAX_OUTPUT_TOKENS,
        "system": system,
        "messages": [{"role": m["role"], "content": _content(m)} for m in messages],
        "stream": False,
    }
    data = await _post_with_retry(
        model.endpoint or "",
        headers={
            "x-api-key": model.api_key or "",
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json_body=payload, timeout=300, label=model.key,
    )
    return "".join(
        c.get("text", "") for c in data.get("content", []) if c.get("type") == "text"
    )


async def _call_chat_completions(model: ResolvedModel, messages: list[dict[str, str]], system: str) -> str:
    def _content(m: dict):
        images = _msg_images(m) if m["role"] != "assistant" else []
        if not images:
            return m["content"]
        parts: list[dict] = [{"type": "text", "text": m["content"]}]
        for url in images:
            parts.append({"type": "image_url", "image_url": {"url": url}})
        return parts

    chat_messages = [{"role": "system", "content": system}] + [
        {"role": m["role"], "content": _content(m)} for m in messages
    ]
    payload = {"model": model.model_name, "messages": chat_messages, "stream": False}
    data = await _post_with_retry(
        model.endpoint or "",
        headers={
            "api-key": model.api_key or "",
            "Authorization": f"Bearer {model.api_key or ''}",
            "Content-Type": "application/json",
        },
        json_body=payload, timeout=240, label=model.key,
    )
    choices = data.get("choices") or []
    if not choices:
        return ""
    msg = choices[0].get("message") or {}
    content = msg.get("content")
    if isinstance(content, list):  # some providers return content parts
        return "".join(p.get("text", "") for p in content if isinstance(p, dict))
    return content or ""


_DISPATCH = {
    "responses": _call_responses,
    "anthropic": _call_anthropic,
    "chat_completions": _call_chat_completions,
}


async def _post_with_retry(url: str, *, headers: dict, json_body: dict, timeout: int, label: str) -> dict:
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(url, headers=headers, json=json_body)
            if res.status_code in _RETRY_STATUSES and attempt < _MAX_RETRIES - 1:
                wait = 2.0 ** attempt
                logger.warning("%s returned %d, retrying in %.1fs (attempt %d/%d)",
                               label, res.status_code, wait, attempt + 1, _MAX_RETRIES)
                await asyncio.sleep(wait)
                continue
            res.raise_for_status()
            return res.json()
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            if exc.response.status_code not in _RETRY_STATUSES or attempt >= _MAX_RETRIES - 1:
                raise
            wait = 2.0 ** attempt
            logger.warning("%s HTTP %d, retrying in %.1fs", label, exc.response.status_code, wait)
            await asyncio.sleep(wait)
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            last_exc = exc
            if attempt >= _MAX_RETRIES - 1:
                raise
            wait = 2.0 ** attempt
            logger.warning("%s connection error, retrying in %.1fs: %s", label, wait, exc)
            await asyncio.sleep(wait)
    raise last_exc or RuntimeError(f"{label} failed after retries")


async def _call(model: ResolvedModel, messages: list[dict[str, str]], system: str) -> str:
    fn = _DISPATCH.get(model.kind)
    if fn is None:
        raise RuntimeError(f"Unknown model kind '{model.kind}' for '{model.key}'")
    return await fn(model, messages, system)


# --------------------------------------------------------------------------- #
# Public API (unchanged signatures)
# --------------------------------------------------------------------------- #
async def complete(
    messages: list[dict[str, str]],
    system: str,
    provider: Provider | None = None,
) -> str:
    """Complete with the requested model, falling back to other configured models.

    ``provider`` may be a registry key ("grok-4.3") or a legacy alias ("claude").
    If it is unavailable or fails at call time, we transparently fall back to the
    default and then any other enabled model so generation stays resilient.
    """
    primary = _pick(provider)
    chain = _fallback_chain(primary)
    if not chain:
        raise RuntimeError("No Azure LLM model configured")

    last_error: Exception | None = None
    for model in chain:
        try:
            return await _call(model, messages, system)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("model '%s' failed, trying next: %s", model.key, exc)
            continue
    raise last_error or RuntimeError("All LLM models failed")


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
