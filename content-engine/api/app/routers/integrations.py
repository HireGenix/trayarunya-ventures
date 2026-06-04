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

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import AsyncSessionLocal, get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import Integration
from app.services import integrations_oauth as oauth_svc
from app.services.crypto import decrypt, encrypt
from app.services.integrations import SYNC, SyncError

log = logging.getLogger("integrations")

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


async def _maybe_refresh(
    db: AsyncSession, obj: Integration, exc: SyncError
) -> str | None:
    """Attempt a one-shot OAuth token refresh after an auth failure.

    Returns the new decrypted access token on success (and persists the rotated
    tokens), or ``None`` if refresh is not applicable/possible. Never raises.
    """
    if "authentication failed" not in str(exc).lower():
        return None
    if not oauth_svc.supports_refresh(obj.provider):
        return None
    refresh_token = decrypt(obj.refresh_token_enc)
    if not refresh_token:
        return None
    try:
        token = await oauth_svc.refresh_access_token(
            obj.provider, refresh_token, obj.config or {}
        )
    except oauth_svc.OAuthError:
        return None
    access = token.get("access_token")
    if not access:
        return None
    obj.access_token_enc = encrypt(access)
    new_refresh = token.get("refresh_token")
    if new_refresh:
        obj.refresh_token_enc = encrypt(new_refresh)
    obj.expires_at = oauth_svc.expires_at_from(token)
    return access


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
            # Platform OAuth app exists & configured — build the real provider
            # authorization URL the browser should be sent to.
            try:
                url, state = oauth_svc.build_authorization_url(
                    provider, str(ctx.workspace.id), body.config or {}
                )
            except oauth_svc.OAuthError as exc:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
            return OAuthStart(
                provider=provider,
                authorization_url=url,
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


# --------------------------------------------------------------------------- #
# OAuth callback (browser redirect target — no auth dependency)
# --------------------------------------------------------------------------- #
def _popup_html(title: str, message: str, ok: bool, status_code: int = 200) -> HTMLResponse:
    color = "#0FA874" if ok else "#D92C4A"
    icon = "✅" if ok else "⚠️"
    return HTMLResponse(
        "<!doctype html><html><body style='font-family:system-ui,sans-serif;"
        "padding:2.5rem;color:#11151B;background:#FAFBFC'>"
        f"<h2 style='color:{color};margin:0 0 .5rem'>{icon} {title}</h2>"
        f"<p style='color:#6B7280'>{message}</p>"
        "<p style='color:#6B7280;font-size:.9rem'>You can close this window and "
        "return to the dashboard.</p>"
        "<script>try{if(window.opener){window.opener.postMessage("
        f"{{source:'integrations-oauth',ok:{str(ok).lower()}}},'*');}}"
        "setTimeout(function(){window.close();},1600);}catch(e){}</script>"
        "</body></html>",
        status_code=status_code,
    )


@router.get("/{provider}/oauth/callback", response_class=HTMLResponse)
async def oauth_callback(
    provider: str,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
) -> HTMLResponse:
    """Provider OAuth redirect target.

    Exchanges the authorization ``code`` for tokens, persists (or updates) an
    encrypted :class:`Integration` for the originating workspace, then renders a
    self-closing popup page. No workspace auth dependency runs here — the
    signed, short-lived ``state`` is the trust anchor.
    """
    provider = provider.strip().lower()
    if provider not in oauth_svc.OAUTH_PROVIDERS:
        return _popup_html("Unsupported provider", provider, ok=False, status_code=400)
    if error:
        return _popup_html(
            "Authorization declined",
            error_description or error,
            ok=False,
            status_code=400,
        )
    if not code or not state:
        return _popup_html(
            "Missing parameters",
            "The provider did not return a code/state.",
            ok=False,
            status_code=400,
        )

    state_data = oauth_svc.pop_state(state)
    if not state_data:
        return _popup_html(
            "Session expired",
            "This authorization link is invalid or has expired. Please retry the connection.",
            ok=False,
            status_code=400,
        )

    try:
        token = await oauth_svc.exchange_code(provider, code, state_data)
    except oauth_svc.OAuthError as exc:
        return _popup_html("Connection failed", str(exc), ok=False, status_code=502)

    access = token.get("access_token")
    if not access:
        return _popup_html(
            "Connection failed",
            f"{provider}: the provider did not return an access token.",
            ok=False,
            status_code=502,
        )
    refresh = token.get("refresh_token")
    expires_at = oauth_svc.expires_at_from(token)

    meta = PROVIDERS.get(provider, {})
    config: dict[str, Any] = {}
    if state_data.get("shop"):
        config["shop_domain"] = state_data["shop"]
    if token.get("scope"):
        config["scopes"] = token["scope"]

    try:
        workspace_id = uuid.UUID(str(state_data["workspace_id"]))
    except (ValueError, KeyError):
        return _popup_html(
            "Connection failed",
            "Invalid workspace context in the authorization state.",
            ok=False,
            status_code=400,
        )

    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(
                select(Integration).where(
                    Integration.workspace_id == workspace_id,
                    Integration.provider == provider,
                )
            )
        ).scalar_one_or_none()

        if existing is not None:
            existing.access_token_enc = encrypt(access)
            if refresh:
                existing.refresh_token_enc = encrypt(refresh)
            existing.expires_at = expires_at
            existing.status = "connected"
            existing.last_error = None
            merged = dict(existing.config or {})
            merged.update(config)
            existing.config = merged
        else:
            db.add(
                Integration(
                    workspace_id=workspace_id,
                    provider=provider,
                    category=meta.get("category", "crm"),
                    display_name=meta.get("label", provider),
                    status="connected",
                    access_token_enc=encrypt(access),
                    refresh_token_enc=encrypt(refresh) if refresh else None,
                    config=config,
                    expires_at=expires_at,
                    last_error=None,
                )
            )
        await db.commit()

    return _popup_html(
        f"{meta.get('label', provider.title())} connected",
        "Your account is connected and ready to sync.",
        ok=True,
    )


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
        # Auth failure + refreshable provider → try a one-shot token refresh.
        refreshed = await _maybe_refresh(db, obj, exc)
        if refreshed is not None:
            try:
                summary = fn(refreshed, obj.config or {})
            except SyncError as exc2:
                exc = exc2
            except Exception:  # noqa: BLE001
                exc = SyncError("Unexpected error during sync after token refresh.")
            else:
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
