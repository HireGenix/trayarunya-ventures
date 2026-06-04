"""Real OAuth 2.0 flows for the external Integrations hub.

This mirrors :mod:`app.services.oauth` (which handles social/ads networks) but
targets the CRM / analytics / ecommerce providers exposed in the Integrations
hub: HubSpot, Google Analytics 4, Google Search Console and Shopify.

Responsibilities:
- Build a real provider authorization URL (with CSRF ``state`` + offline access
  where the provider supports refresh tokens).
- Exchange an authorization ``code`` for an access/refresh token pair.
- Refresh an expired access token using a stored refresh token.

Token *storage* (encryption) and persistence live in the router; this module is
purely the protocol layer. Provider client credentials come from settings and
are user-supplied — if a provider is not configured we raise a clear error
instead of emitting a broken redirect.
"""
from __future__ import annotations

import logging
import secrets
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import settings

log = logging.getLogger("integrations.oauth")

# Authorization state lives in-process with a short TTL. The state token is the
# only value that travels through the browser; the payload (workspace id, shop
# domain…) never leaves the server.
_STATE_TTL = 600.0  # seconds
_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


class OAuthError(Exception):
    """Raised for any user-facing OAuth failure (config, exchange, refresh)."""


# --------------------------------------------------------------------------- #
# State store
# --------------------------------------------------------------------------- #
class _StateStore:
    def __init__(self) -> None:
        self._data: dict[str, dict[str, Any]] = {}

    def _prune(self) -> None:
        now = time.time()
        stale = [
            s
            for s, p in self._data.items()
            if now - p.get("_created_at", 0) > _STATE_TTL
        ]
        for s in stale:
            self._data.pop(s, None)

    def set(self, state: str, payload: dict[str, Any]) -> None:
        self._prune()
        payload["_created_at"] = time.time()
        self._data[state] = payload

    def pop(self, state: str) -> dict[str, Any] | None:
        self._prune()
        entry = self._data.pop(state, None)
        if entry is None:
            return None
        if time.time() - entry.get("_created_at", 0) > _STATE_TTL:
            return None
        return entry


_store = _StateStore()


# --------------------------------------------------------------------------- #
# Provider configuration
# --------------------------------------------------------------------------- #
@dataclass
class HubProvider:
    name: str
    auth_url: str
    token_url: str
    scopes: list[str]
    # Some providers (Shopify) build the auth/token URL per-shop at runtime.
    per_shop: bool = False
    offline: bool = False  # request a refresh token (Google)
    extra_auth_params: dict[str, str] = field(default_factory=dict)

    def client_id(self) -> str | None:
        return _CLIENT_IDS[self.name]()

    def client_secret(self) -> str | None:
        return _CLIENT_SECRETS[self.name]()


# Credential accessors are indirected through settings so tests can monkeypatch
# settings without rebuilding the provider table.
_CLIENT_IDS = {
    "hubspot": lambda: settings.hubspot_client_id,
    "ga4": lambda: settings.google_client_id,
    "search_console": lambda: settings.google_client_id,
    "shopify": lambda: settings.shopify_api_key,
}
_CLIENT_SECRETS = {
    "hubspot": lambda: settings.hubspot_client_secret,
    "ga4": lambda: settings.google_client_secret,
    "search_console": lambda: settings.google_client_secret,
    "shopify": lambda: settings.shopify_api_secret,
}

# Default OAuth scopes per provider. Read-only where possible.
_HUBSPOT_SCOPES = ["oauth", "crm.objects.contacts.read"]
_GA4_SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
_SEARCH_CONSOLE_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
_SHOPIFY_SCOPES = ["read_products", "read_orders"]


def _providers() -> dict[str, HubProvider]:
    return {
        "hubspot": HubProvider(
            name="hubspot",
            auth_url="https://app.hubspot.com/oauth/authorize",
            token_url="https://api.hubapi.com/oauth/v1/token",
            scopes=_HUBSPOT_SCOPES,
        ),
        "ga4": HubProvider(
            name="ga4",
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=_GA4_SCOPES,
            offline=True,
            extra_auth_params={"access_type": "offline", "prompt": "consent"},
        ),
        "search_console": HubProvider(
            name="search_console",
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=_SEARCH_CONSOLE_SCOPES,
            offline=True,
            extra_auth_params={"access_type": "offline", "prompt": "consent"},
        ),
        "shopify": HubProvider(
            name="shopify",
            # Filled per-shop at runtime; the static values are placeholders.
            auth_url="https://{shop}/admin/oauth/authorize",
            token_url="https://{shop}/admin/oauth/access_token",
            scopes=_SHOPIFY_SCOPES,
            per_shop=True,
        ),
    }


# Providers that support the real OAuth flow implemented here.
OAUTH_PROVIDERS = frozenset(_providers().keys())


def get_provider(provider: str) -> HubProvider | None:
    return _providers().get(provider)


def provider_configured(provider: str) -> bool:
    p = _providers().get(provider)
    return bool(p and p.client_id() and p.client_secret())


def redirect_uri(provider: str) -> str:
    base = settings.oauth_redirect_base.rstrip("/")
    return f"{base}/api/v1/integrations/{provider}/oauth/callback"


def _normalize_shop(domain: str | None) -> str:
    if not domain:
        raise OAuthError(
            "Shopify: missing shop_domain in config (e.g. my-store.myshopify.com)."
        )
    shop = domain.strip().rstrip("/").replace("https://", "").replace("http://", "")
    if "." not in shop:
        shop = f"{shop}.myshopify.com"
    return shop


# --------------------------------------------------------------------------- #
# Authorization URL
# --------------------------------------------------------------------------- #
def build_authorization_url(
    provider: str,
    workspace_id: str,
    config: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """Return ``(authorization_url, state)`` for the given provider.

    Raises :class:`OAuthError` if the provider is unknown or not configured.
    """
    p = _providers().get(provider)
    if not p:
        raise OAuthError(f"Unsupported OAuth provider: {provider}")
    cid, csecret = p.client_id(), p.client_secret()
    if not (cid and csecret):
        raise OAuthError(
            f"{provider} OAuth is not configured on this platform. Set the "
            f"{provider.upper()} client id/secret, or connect with a manual token."
        )

    config = config or {}
    state = secrets.token_urlsafe(24)
    payload: dict[str, Any] = {"workspace_id": workspace_id, "provider": provider}

    if p.per_shop:  # Shopify
        shop = _normalize_shop(config.get("shop_domain") or config.get("store_domain"))
        payload["shop"] = shop
        auth_base = p.auth_url.format(shop=shop)
    else:
        auth_base = p.auth_url

    params: dict[str, str] = {
        "response_type": "code",
        "client_id": cid,
        "redirect_uri": redirect_uri(provider),
        "scope": " ".join(p.scopes),
        "state": state,
    }
    params.update(p.extra_auth_params)

    _store.set(state, payload)
    url = str(httpx.URL(auth_base, params=params))
    return url, state


def pop_state(state: str | None) -> dict[str, Any] | None:
    if not state:
        return None
    return _store.pop(state)


# --------------------------------------------------------------------------- #
# Token exchange + refresh
# --------------------------------------------------------------------------- #
def _token_endpoint(p: HubProvider, state_data: dict[str, Any]) -> str:
    if p.per_shop:
        shop = _normalize_shop(state_data.get("shop"))
        return p.token_url.format(shop=shop)
    return p.token_url


async def exchange_code(
    provider: str,
    code: str,
    state_data: dict[str, Any],
) -> dict[str, Any]:
    """Exchange an authorization code for a token payload.

    Returns the provider's raw token JSON (``access_token``, optional
    ``refresh_token``, ``expires_in``…). Raises :class:`OAuthError` on failure.
    """
    p = _providers().get(provider)
    if not p:
        raise OAuthError(f"Unsupported OAuth provider: {provider}")
    cid, csecret = p.client_id(), p.client_secret()
    if not (cid and csecret):
        raise OAuthError(f"{provider} OAuth is not configured.")

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": cid,
        "client_secret": csecret,
        "redirect_uri": redirect_uri(provider),
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            res = await client.post(
                _token_endpoint(p, state_data), data=data, headers=headers
            )
            res.raise_for_status()
            return res.json()
    except httpx.HTTPStatusError as exc:
        log.warning("%s token exchange HTTP %s", provider, exc.response.status_code)
        raise OAuthError(
            f"{provider}: token exchange failed (HTTP {exc.response.status_code})."
        ) from exc
    except httpx.HTTPError as exc:
        raise OAuthError(f"{provider}: could not reach the token endpoint.") from exc


async def refresh_access_token(
    provider: str,
    refresh_token: str,
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Use a refresh token to obtain a fresh access token.

    Returns the provider's raw token JSON. Raises :class:`OAuthError` on failure
    or if the provider does not support refresh.
    """
    p = _providers().get(provider)
    if not p:
        raise OAuthError(f"Unsupported OAuth provider: {provider}")
    cid, csecret = p.client_id(), p.client_secret()
    if not (cid and csecret):
        raise OAuthError(f"{provider} OAuth is not configured.")

    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": cid,
        "client_secret": csecret,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    state_like = {"shop": (config or {}).get("shop_domain")}
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            res = await client.post(
                _token_endpoint(p, state_like), data=data, headers=headers
            )
            res.raise_for_status()
            return res.json()
    except httpx.HTTPStatusError as exc:
        raise OAuthError(
            f"{provider}: token refresh failed (HTTP {exc.response.status_code}). "
            "Reconnect the integration."
        ) from exc
    except httpx.HTTPError as exc:
        raise OAuthError(f"{provider}: could not reach the token endpoint.") from exc


def supports_refresh(provider: str) -> bool:
    p = _providers().get(provider)
    return bool(p and p.offline)


def expires_at_from(token: dict[str, Any]) -> datetime | None:
    """Compute an absolute expiry from a token payload's ``expires_in``."""
    expires_in = token.get("expires_in")
    if not isinstance(expires_in, (int, float)):
        return None
    return datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
