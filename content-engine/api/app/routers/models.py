"""Model registry routes.

- ``GET /models`` — any authenticated user: the enabled models for the picker.
  Returns only safe fields (key/label/kind/is_default) — never keys or endpoints.
- ``/admin/models`` — superadmin only: full CRUD over the registry.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_superuser
from app.llm import registry_cache
from app.models import ModelRegistry, User
from app.models.model_registry import MODEL_KINDS
from app.schemas import ModelAdminOut, ModelCreate, ModelPublicOut, ModelUpdate
from app.services import model_registry as svc

router = APIRouter(prefix="/models", tags=["models"])
admin_router = APIRouter(prefix="/admin/models", tags=["admin", "models"])


# --------------------------------------------------------------------------- #
# Public (authenticated) — used by the frontend model picker
# --------------------------------------------------------------------------- #
@router.get("", response_model=list[ModelPublicOut])
async def list_public_models(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ModelPublicOut]:
    # Serve from the in-memory snapshot; load it lazily if empty.
    if not registry_cache.loaded():
        await svc.refresh_cache(db)
    models = [m for m in registry_cache.list_enabled() if m.configured]
    return [
        ModelPublicOut(key=m.key, label=m.label, kind=m.kind, is_default=m.is_default)
        for m in models
    ]


# --------------------------------------------------------------------------- #
# Superadmin CRUD
# --------------------------------------------------------------------------- #
def _to_admin_out(row: ModelRegistry) -> ModelAdminOut:
    out = ModelAdminOut.model_validate(row)
    out.has_key = bool(row.api_key_encrypted)
    return out


@admin_router.get("", response_model=list[ModelAdminOut])
async def admin_list_models(
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> list[ModelAdminOut]:
    rows = await svc.list_models(db)
    return [_to_admin_out(r) for r in rows]


@admin_router.post("", response_model=ModelAdminOut, status_code=status.HTTP_201_CREATED)
async def admin_create_model(
    data: ModelCreate,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> ModelAdminOut:
    if data.kind not in MODEL_KINDS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"kind must be one of {MODEL_KINDS}")
    existing = await svc.list_models(db)
    if any(r.key == data.key for r in existing):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Model key '{data.key}' already exists")
    row = await svc.create_model(
        db, key=data.key, label=data.label, kind=data.kind, model_name=data.model_name,
        endpoint=data.endpoint, api_key=data.api_key, api_version=data.api_version,
        enabled=data.enabled, is_default=data.is_default, sort_order=data.sort_order,
    )
    return _to_admin_out(row)


@admin_router.patch("/{model_id}", response_model=ModelAdminOut)
async def admin_update_model(
    model_id: uuid.UUID,
    data: ModelUpdate,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> ModelAdminOut:
    patch = data.model_dump(exclude_unset=True)
    if "kind" in patch and patch["kind"] not in MODEL_KINDS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"kind must be one of {MODEL_KINDS}")
    row = await svc.update_model(db, model_id, patch)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Model not found")
    return _to_admin_out(row)


@admin_router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def admin_delete_model(
    model_id: uuid.UUID,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> None:
    ok = await svc.delete_model(db, model_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Model not found")
