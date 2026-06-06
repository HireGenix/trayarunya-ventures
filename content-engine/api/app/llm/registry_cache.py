"""In-memory snapshot of the model registry.

``adapters.complete()`` is called from agents/services that often do not have a
DB session handy, and it runs on a hot path. So instead of querying Postgres on
every call we keep a process-local snapshot of the enabled models, refreshed:

  - once at startup (after seeding the registry from env), and
  - whenever a superadmin creates/updates/deletes a model.

Each entry is fully resolved (endpoint + DECRYPTED key + model name + kind) so a
caller can dispatch without touching the DB or the crypto layer again.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass


@dataclass(frozen=True)
class ResolvedModel:
    key: str
    label: str
    kind: str          # responses | anthropic | chat_completions
    endpoint: str | None
    api_key: str | None  # decrypted
    model_name: str
    api_version: str | None
    enabled: bool
    is_default: bool
    sort_order: int

    @property
    def configured(self) -> bool:
        return bool(self.endpoint and self.api_key and self.model_name)


_lock = threading.RLock()
_MODELS: dict[str, ResolvedModel] = {}
_ORDER: list[str] = []
_DEFAULT_KEY: str | None = None


def set_models(models: list[ResolvedModel]) -> None:
    """Replace the whole snapshot (called after seed + on every CRUD change)."""
    global _DEFAULT_KEY
    ordered = sorted(models, key=lambda m: (m.sort_order, m.label.lower()))
    with _lock:
        _MODELS.clear()
        _ORDER.clear()
        for m in ordered:
            _MODELS[m.key] = m
            _ORDER.append(m.key)
        explicit_default = next((m.key for m in ordered if m.is_default and m.enabled), None)
        first_enabled = next((m.key for m in ordered if m.enabled), None)
        _DEFAULT_KEY = explicit_default or first_enabled


def get(key: str | None) -> ResolvedModel | None:
    if not key:
        return None
    with _lock:
        return _MODELS.get(key)


def default_key() -> str | None:
    with _lock:
        return _DEFAULT_KEY


def default_model() -> ResolvedModel | None:
    with _lock:
        return _MODELS.get(_DEFAULT_KEY) if _DEFAULT_KEY else None


def list_all() -> list[ResolvedModel]:
    with _lock:
        return [_MODELS[k] for k in _ORDER]


def list_enabled() -> list[ResolvedModel]:
    with _lock:
        return [_MODELS[k] for k in _ORDER if _MODELS[k].enabled]


def loaded() -> bool:
    with _lock:
        return bool(_MODELS)
