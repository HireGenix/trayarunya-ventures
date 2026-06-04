"""External Integrations hub: CRM / analytics / ecommerce / email connections.

Workspace-scoped CRUD for :class:`Integration` plus a catalog of supported
providers and a real per-provider *sync* that reads live data via httpx. Tokens
are always stored encrypted (``access_token_enc`` / ``refresh_token_enc``) — raw
secrets never leave the request and are never returned to clients.

The manual API-key / token connect path is fully real and persists. Providers
that ship a platform OAuth app return an OAuth start stub; if that app is not
configured at the platform level we return ``503`` with a clear message.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import Integration
from app.services.crypto import decrypt, encrypt
from app.services.integrations import SYNC, SyncError

router = APIRouter(prefix="/integrations", tags=["integrations"])


# --------------------------------------------------------------------------- #
# Provider catalog metadata
# --------------------------------------------------------------------------- #
def _hubspot_configured() -> bool:
    return bool(settings.hubspot_client_id and settings.hubspot_client_secret)


def _google_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def _shopify_configured() -> bool:
    return bool(settings.shopify_api_key and settings.shopify_api_secret)


# provider -> static metadata. ``oauth`` means a platform OAuth app is the
# intended connect flow; ``configured`` reflects whether that app's credentials
# exist in settings. ``manual`` providers connect with a user-supplied token.
PROVIDERS: dict[str, dict[str, Any]] = {
    "hubspot": {
        "label": "HubSpot",
        "category": "crm",
        "oauth": True,
        "configured": _hubspot_configured,
        "manual": True,  # private app token
        "token_label": "Private app access token",
    },
    "salesforce": {
        "label": "Salesforce",
        "category": "crm",
        "oauth": False,
        "configured": lambda: False,
        "manual": True,
        "token_label": "Access token (requires instance_url in config)",
    },
    "pipedrive": {
        "label": "Pipedrive",
        "category": "crm",
        "oauth": False,
        "configured": lambda: False,
        "manual": True,
        "token_label": "API token",
    },
    "ga4": {
        "label": "Google Analytics 4",
        "category": "analytics",
        "oauth": True,
        "configured": _google_configured,
        "manual": True,  # OAuth access token (requires property_id in config)
        "token_label": "OAuth access token (requires property_id in config)",
    },
    "search_console": {
        "label": "Google Search Console",
        "category": "analytics",
        "oauth": True,
        "configured": _google_configured,
        "manual": True,
        "token_label": "OAuth access token",
    },
    "shopify": {
        "label": "Shopify",
        "category": "ecommerce",
        "oauth": True,
        "configured": _shopify_configured,
        "manual": True,  # Admin API access token
        "token_label": "Admin API access token (requires shop_domain in config)",
    },
    "woocommerce": {
        "label": "WooCommerce",
        "category": "ecommerce",
        "oauth": False,
        "configured": lambda: False,
        "manual": True,
        "token_label": "Consumer secret (requires base_url + consumer_key in config)",
    },
    "klaviyo": {
        "label": "Klaviyo",
        "category": "email",
        "oauth": False,
        "configured": lambda: False,
        "manual": True,
        "token_label": "Private API key",
    },
}

_SECRET_CONFIG_KEYS = {"consumer_secret", "client_secret", "api_secret", "password"}


def _safe_config(config: dict[str, Any] | None) -> dict[str, Any]:
    """Strip any secret-ish keys before returning config to a client."""
    if not config:
        return {}
    return {k: v for k, v in config.items() if k.lower() not in _SECRET_CONFIG_KEYS}


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- #
# Pydantic models
# --------------------------------------------------------------------------- #
class IntegrationOut(BaseModel):
    id: str
    provider: str
    category: str
    display_name: str | None
    status: str
    config: dict[str, Any]
    last_sync_at: datetime | None
    last_error: str | None
    expires_at: datetime | None
    created_at: datetime | None

    @classmethod
    def from_model(cls, m: Integration) -> "IntegrationOut":
        return cls(
            id=str(m.id),
            provider=m.provider,
            category=m.category,
            display_name=m.display_name,
            status=m.status,
            config=_safe_config(m.config),
            last_sync_at=m.last_sync_at,
            last_error=m.last_error,
            expires_at=m.expires_at,
            created_at=getattr(m, "created_at", None),
        )


class CatalogEntry(BaseModel):
    provider: str
    label: str
    category: str
    oauth: bool
    configured: bool
    manual_connect: bool
    token_label: str | None = None


class ConnectIn(BaseModel):
    provider: str
    category: str | None = None
    display_name: str | None = None
    api_key: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    config: dict[str, Any] | None = None


class OAuthStart(BaseModel):
    provider: str
    authorization_url: str
    state: str


class SyncResult(BaseModel):
    id: str
    provider: str
    status: str
    last_sync_at: datetime | None
    summary: dict[str, Any] | None = None
    last_error: str | None = None


class ProviderHealth(BaseModel):
    provider: str
    status: str
    last_sync_at: datetime | None
    last_error: str | None


class HealthOut(BaseModel):
    total: int
    connected: int
    error: int
    expired: int
    disconnected: int
    providers: list[ProviderHealth]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
async def _get_owned(
    db: AsyncSession, integration_id: uuid.UUID, workspace_id: uuid.UUID
) -> Integration:
    obj = await db.get(Integration, integration_id)
    if obj is None or obj.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Integration not found")
    return obj


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@router.get("", response_model=list[IntegrationOut])
async def list_integrations(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[IntegrationOut]:
    res = await db.execute(
        select(Integration)
        .where(Integration.workspace_id == ctx.workspace.id)
        .order_by(Integration.created_at.desc())
    )
    return [IntegrationOut.from_model(m) for m in res.scalars().all()]


@router.get("/catalog", response_model=list[CatalogEntry])
async def catalog(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> list[CatalogEntry]:
    out: list[CatalogEntry] = []
    for provider, meta in PROVIDERS.items():
        out.append(
            CatalogEntry(
                provider=provider,
                label=meta["label"],
                category=meta["category"],
                oauth=bool(meta["oauth"]),
                configured=bool(meta["configured"]()),
                manual_connect=bool(meta["manual"]),
                token_label=meta.get("token_label"),
            )
        )
    return out


@router.get("/health", response_model=HealthOut)
async def health(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> HealthOut:
    res = await db.execute(
        select(Integration).where(Integration.workspace_id == ctx.workspace.id)
    )
    items = list(res.scalars().all())
    counts = {"connected": 0, "error": 0, "expired": 0, "disconnected": 0}
    providers: list[ProviderHealth] = []
    for m in items:
        if m.status in counts:
            counts[m.status] += 1
        providers.append(
            ProviderHealth(
                provider=m.provider,
                status=m.status,
                last_sync_at=m.last_sync_at,
                last_error=m.last_error,
            )
        )
    return HealthOut(
        total=len(items),
        connected=counts["connected"],
        error=counts["error"],
        expired=counts["expired"],
        disconnected=counts["disconnected"],
        providers=providers,
    )


@router.post("/connect", status_code=status.HTTP_201_CREATED)
async def connect(
    body: ConnectIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    provider = body.provider.strip().lower()
    meta = PROVIDERS.get(provider)
    if meta is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Unsupported provider '{provider}'"
        )

    token = (body.access_token or body.api_key or "").strip() or None

    # No token supplied: this is an OAuth-style connect attempt.
    if token is None:
        if meta["oauth"]:
            if not meta["configured"]():
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    f"{meta['label']} OAuth is not configured on this platform. "
                    "Set the platform credentials or connect with a manual API "
                    "token instead.",
                )
            # Platform OAuth app exists & configured — return a start stub.
            state = uuid.uuid4().hex
            return OAuthStart(
                provider=provider,
                authorization_url=f"/api/integrations/{provider}/oauth/callback?state={state}",
                state=state,
            )
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{meta['label']} requires an API key / token to connect.",
        )

    # Manual token path — real and persisted.
    category = (body.category or meta["category"]).strip()
    integration = Integration(
        workspace_id=ctx.workspace.id,
        provider=provider,
        category=category,
        display_name=body.display_name or meta["label"],
        status="connected",
        access_token_enc=encrypt(token),
        refresh_token_enc=encrypt(body.refresh_token) if body.refresh_token else None,
        config=body.config or {},
        last_error=None,
    )
    db.add(integration)
    await db.commit()
    await db.refresh(integration)
    return IntegrationOut.from_model(integration)


@router.post("/{integration_id}/sync", response_model=SyncResult)
async def sync(
    integration_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> SyncResult:
    obj = await _get_owned(db, integration_id, ctx.workspace.id)

    fn = SYNC.get(obj.provider)
    if fn is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Sync not supported for provider '{obj.provider}'.",
        )

    token = decrypt(obj.access_token_enc)
    summary: dict[str, Any] | None = None
    try:
        summary = fn(token, obj.config or {})
    except SyncError as exc:
        obj.status = "error"
        obj.last_error = str(exc)
        await db.commit()
        await db.refresh(obj)
        return SyncResult(
            id=str(obj.id),
            provider=obj.provider,
            status=obj.status,
            last_sync_at=obj.last_sync_at,
            summary=None,
            last_error=obj.last_error,
        )
    except Exception:  # noqa: BLE001
        obj.status = "error"
        obj.last_error = "Unexpected error during sync."
        await db.commit()
        await db.refresh(obj)
        return SyncResult(
            id=str(obj.id),
            provider=obj.provider,
            status=obj.status,
            last_sync_at=obj.last_sync_at,
            summary=None,
            last_error=obj.last_error,
        )

    obj.status = "connected"
    obj.last_error = None
    obj.last_sync_at = _now()
    await db.commit()
    await db.refresh(obj)
    return SyncResult(
        id=str(obj.id),
        provider=obj.provider,
        status=obj.status,
        last_sync_at=obj.last_sync_at,
        summary=summary,
        last_error=None,
    )


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect(
    integration_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    obj = await _get_owned(db, integration_id, ctx.workspace.id)
    await db.delete(obj)
    await db.commit()
