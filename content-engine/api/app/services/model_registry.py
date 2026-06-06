"""Model-registry service: seed-from-env, CRUD and cache refresh.

This is the only module that reads/writes the ``model_registry`` table. It keeps
the in-memory :mod:`app.llm.registry_cache` in sync so the hot-path adapter never
needs a DB session.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.llm import registry_cache
from app.llm.registry_cache import ResolvedModel
from app.models import ModelRegistry
from app.services.crypto import decrypt, encrypt

log = logging.getLogger("model_registry")


@dataclass(frozen=True)
class SeedSpec:
    key: str
    label: str
    kind: str
    endpoint: str | None
    api_key: str | None
    model_name: str
    api_version: str | None
    is_default: bool
    sort_order: int


def _env_seeds() -> list[SeedSpec]:
    """Build the seed list from configured env/secret values.

    Only models whose endpoint+key are present are seeded, so an unconfigured
    provider never shows up as a broken option. The default is the first
    configured model in priority order.
    """
    seeds: list[SeedSpec] = []

    # 1. GPT-5.5 (Responses) — primary workhorse.
    if settings.gpt5_configured:
        seeds.append(SeedSpec(
            key="gpt-5.5", label="GPT-5.5", kind="responses",
            endpoint=settings.azure_gpt5_endpoint, api_key=settings.azure_gpt5_key,
            model_name=settings.azure_gpt5_deployment, api_version=settings.azure_gpt5_api_version,
            is_default=False, sort_order=10,
        ))

    # 2. Claude Opus (Anthropic).
    if settings.claude_configured:
        seeds.append(SeedSpec(
            key="claude-opus", label="Claude Opus", kind="anthropic",
            endpoint=settings.azure_anthropic_endpoint, api_key=settings.azure_anthropic_key,
            model_name=settings.azure_anthropic_model, api_version=None,
            is_default=True, sort_order=20,
        ))

    # 3. Claude Sonnet 4.6 (Anthropic, same endpoint/key, different model).
    if settings.claude_sonnet_configured:
        seeds.append(SeedSpec(
            key="claude-sonnet", label="Claude Sonnet 4.6", kind="anthropic",
            endpoint=settings.azure_anthropic_endpoint, api_key=settings.azure_anthropic_key,
            model_name=settings.azure_anthropic_sonnet_model, api_version=None,
            is_default=False, sort_order=30,
        ))

    # 4. Grok 4.3 (chat/completions).
    if settings.grok_configured:
        seeds.append(SeedSpec(
            key="grok-4.3", label="Grok 4.3", kind="chat_completions",
            endpoint=settings.azure_grok_endpoint, api_key=settings.grok_key,
            model_name=settings.azure_grok_model, api_version=settings.azure_grok_api_version,
            is_default=False, sort_order=40,
        ))

    # 5. gpt-chat-latest (Responses) — conversational chat surface.
    if settings.gptchat_configured:
        seeds.append(SeedSpec(
            key="gpt-chat-latest", label="GPT Chat (latest)", kind="responses",
            endpoint=settings.gptchat_endpoint, api_key=settings.gptchat_key,
            model_name=settings.azure_gptchat_deployment, api_version=settings.azure_gptchat_api_version,
            is_default=False, sort_order=50,
        ))

    # Guarantee exactly one default among configured seeds.
    if seeds and not any(s.is_default for s in seeds):
        seeds[0] = SeedSpec(**{**seeds[0].__dict__, "is_default": True})
    return seeds


def _to_resolved(row: ModelRegistry) -> ResolvedModel:
    return ResolvedModel(
        key=row.key,
        label=row.label,
        kind=row.kind,
        endpoint=row.endpoint,
        api_key=decrypt(row.api_key_encrypted),
        model_name=row.model_name,
        api_version=row.api_version,
        enabled=row.enabled,
        is_default=row.is_default,
        sort_order=row.sort_order,
    )


async def refresh_cache(db: AsyncSession) -> None:
    """Reload the in-memory snapshot from the DB."""
    res = await db.execute(select(ModelRegistry))
    rows = res.scalars().all()
    registry_cache.set_models([_to_resolved(r) for r in rows])
    log.info("model registry cache refreshed: %d models", len(rows))


async def seed_from_env(db: AsyncSession) -> None:
    """Upsert env-derived models into the registry, then refresh the cache.

    - New env models are inserted (source="env").
    - Existing env-sourced rows are kept in sync with env (endpoint/key/model/
      version), but user-toggled ``enabled``/``sort_order``/``is_default`` and any
      manually-added models are preserved.
    - Manually-added models (source="manual") are never touched here.
    """
    res = await db.execute(select(ModelRegistry))
    existing = {r.key: r for r in res.scalars().all()}

    seeds = _env_seeds()
    seeded_default_key = next((s.key for s in seeds if s.is_default), None)

    for spec in seeds:
        row = existing.get(spec.key)
        if row is None:
            enc_key = encrypt(spec.api_key) if spec.api_key else None
            db.add(ModelRegistry(
                key=spec.key, label=spec.label, kind=spec.kind,
                endpoint=spec.endpoint, api_key_encrypted=enc_key,
                model_name=spec.model_name, api_version=spec.api_version,
                enabled=True, is_default=spec.is_default, sort_order=spec.sort_order,
                source="env",
            ))
        elif row.source == "env":
            # Keep provider wiring fresh from env; preserve user toggles.
            row.label = spec.label
            row.kind = spec.kind
            row.endpoint = spec.endpoint
            row.model_name = spec.model_name
            row.api_version = spec.api_version
            # Only re-encrypt when the plaintext actually changed, so we don't
            # churn the row (new Fernet IV) and dirty updated_at on every boot.
            current_plain = decrypt(row.api_key_encrypted) if row.api_key_encrypted else None
            if (spec.api_key or None) != current_plain:
                row.api_key_encrypted = encrypt(spec.api_key) if spec.api_key else None

    # If no model is currently marked default at all, adopt the env default.
    res2 = await db.execute(select(ModelRegistry))
    all_rows = res2.scalars().all()
    if all_rows and not any(r.is_default and r.enabled for r in all_rows) and seeded_default_key:
        for r in all_rows:
            r.is_default = (r.key == seeded_default_key)

    await db.commit()
    await refresh_cache(db)


# --------------------------------------------------------------------------- #
# CRUD (superadmin)
# --------------------------------------------------------------------------- #
async def list_models(db: AsyncSession) -> list[ModelRegistry]:
    res = await db.execute(select(ModelRegistry).order_by(ModelRegistry.sort_order, ModelRegistry.label))
    return list(res.scalars().all())


async def create_model(
    db: AsyncSession, *, key: str, label: str, kind: str, model_name: str,
    endpoint: str | None, api_key: str | None, api_version: str | None,
    enabled: bool, is_default: bool, sort_order: int,
) -> ModelRegistry:
    if is_default:
        await _clear_defaults(db)
    row = ModelRegistry(
        key=key, label=label, kind=kind, model_name=model_name,
        endpoint=endpoint, api_key_encrypted=encrypt(api_key) if api_key else None,
        api_version=api_version, enabled=enabled, is_default=is_default,
        sort_order=sort_order, source="manual",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await refresh_cache(db)
    return row


async def update_model(db: AsyncSession, model_id: uuid.UUID, patch: dict) -> ModelRegistry | None:
    row = await db.get(ModelRegistry, model_id)
    if row is None:
        return None
    if patch.get("is_default"):
        await _clear_defaults(db)
    for field in ("key", "label", "kind", "model_name", "endpoint", "api_version",
                  "enabled", "is_default", "sort_order"):
        if field in patch and patch[field] is not None:
            setattr(row, field, patch[field])
    # Only overwrite the key when a new plaintext value is supplied.
    if patch.get("api_key"):
        row.api_key_encrypted = encrypt(patch["api_key"])
    await db.commit()
    await db.refresh(row)
    await refresh_cache(db)
    return row


async def delete_model(db: AsyncSession, model_id: uuid.UUID) -> bool:
    row = await db.get(ModelRegistry, model_id)
    if row is None:
        return False
    await db.delete(row)
    await db.commit()
    await refresh_cache(db)
    return True


async def _clear_defaults(db: AsyncSession) -> None:
    res = await db.execute(select(ModelRegistry).where(ModelRegistry.is_default.is_(True)))
    for r in res.scalars().all():
        r.is_default = False
