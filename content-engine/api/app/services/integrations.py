"""Per-provider sync logic for the external Integrations hub.

Each ``sync_*`` function takes a decrypted token plus the integration's stored
``config`` dict and performs a *real* lightweight read against the provider's
API using ``httpx``. On success it returns a small summary dict (counts, ids…);
on failure it raises :class:`SyncError` with a clean, user-facing message.

We never fabricate metrics: if a provider is unreachable, unauthenticated, or
not configured, the caller surfaces the error and marks the integration as
``error``. Network calls are defensive (short timeouts, narrow try/except).
"""
from __future__ import annotations

import logging
from typing import Any, Callable

import httpx

log = logging.getLogger("integrations")

# Short, defensive timeout for all outbound integration calls.
_TIMEOUT = httpx.Timeout(8.0, connect=5.0)


class SyncError(Exception):
    """Raised when a provider sync fails for a clean, user-facing reason."""


def _require(token: str | None, what: str = "access token") -> str:
    if not token:
        raise SyncError(f"Missing {what}. Reconnect this integration.")
    return token


def _http_error(provider: str, exc: Exception) -> SyncError:
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        if code in (401, 403):
            return SyncError(
                f"{provider}: authentication failed ({code}). The token may be "
                "invalid or expired — reconnect the integration."
            )
        return SyncError(f"{provider}: API returned HTTP {code}.")
    if isinstance(exc, (httpx.ConnectError, httpx.ConnectTimeout)):
        return SyncError(f"{provider}: could not reach the API (connection failed).")
    if isinstance(exc, httpx.TimeoutException):
        return SyncError(f"{provider}: request timed out.")
    return SyncError(f"{provider}: unexpected error contacting the API.")


# --------------------------------------------------------------------------- #
# CRM
# --------------------------------------------------------------------------- #
def sync_hubspot(token: str | None, config: dict[str, Any]) -> dict[str, Any]:
    """Fetch a real contacts count from HubSpot using the private app token."""
    access = _require(token, "HubSpot access token")
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.post(
                "https://api.hubapi.com/crm/v3/objects/contacts/search",
                headers={"Authorization": f"Bearer {access}"},
                json={"limit": 1, "filterGroups": []},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # noqa: BLE001
        raise _http_error("HubSpot", exc) from exc
    total = int(data.get("total", 0))
    return {"provider": "hubspot", "contacts": total}


def sync_salesforce(token: str | None, config: dict[str, Any]) -> dict[str, Any]:
    """Read org limits from Salesforce (validates token + instance URL)."""
    access = _require(token, "Salesforce access token")
    instance = (config or {}).get("instance_url")
    if not instance:
        raise SyncError("Salesforce: missing instance_url in config.")
    version = (config or {}).get("api_version", "v59.0")
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(
                f"{instance.rstrip('/')}/services/data/{version}/limits",
                headers={"Authorization": f"Bearer {access}"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # noqa: BLE001
        raise _http_error("Salesforce", exc) from exc
    daily = data.get("DailyApiRequests", {})
    return {
        "provider": "salesforce",
        "daily_api_max": daily.get("Max"),
        "daily_api_remaining": daily.get("Remaining"),
    }


def sync_pipedrive(token: str | None, config: dict[str, Any]) -> dict[str, Any]:
    """Read user/company info from Pipedrive using an API token."""
    api_token = _require(token, "Pipedrive API token")
    domain = (config or {}).get("company_domain")
    base = (
        f"https://{domain}.pipedrive.com/api/v1"
        if domain
        else "https://api.pipedrive.com/v1"
    )
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(f"{base}/users/me", params={"api_token": api_token})
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # noqa: BLE001
        raise _http_error("Pipedrive", exc) from exc
    info = data.get("data") or {}
    return {
        "provider": "pipedrive",
        "user": info.get("name"),
        "company": info.get("company_name"),
    }


# --------------------------------------------------------------------------- #
# Analytics
# --------------------------------------------------------------------------- #
def sync_ga4(token: str | None, config: dict[str, Any]) -> dict[str, Any]:
    """Validate a GA4 property by reading its metadata via the Data API."""
    access = _require(token, "Google access token")
    property_id = (config or {}).get("property_id")
    if not property_id:
        raise SyncError("GA4: missing property_id in config.")
    pid = str(property_id).replace("properties/", "")
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(
                f"https://analyticsdata.googleapis.com/v1beta/properties/{pid}/metadata",
                headers={"Authorization": f"Bearer {access}"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # noqa: BLE001
        raise _http_error("GA4", exc) from exc
    dims = data.get("dimensions") or []
    mets = data.get("metrics") or []
    return {
        "provider": "ga4",
        "property_id": pid,
        "dimensions_available": len(dims),
        "metrics_available": len(mets),
    }


def sync_search_console(token: str | None, config: dict[str, Any]) -> dict[str, Any]:
    """List verified sites for the connected Search Console account."""
    access = _require(token, "Google access token")
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(
                "https://www.googleapis.com/webmasters/v3/sites",
                headers={"Authorization": f"Bearer {access}"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # noqa: BLE001
        raise _http_error("Search Console", exc) from exc
    entries = data.get("siteEntry") or []
    sites = [e.get("siteUrl") for e in entries if e.get("siteUrl")]
    return {"provider": "search_console", "sites": len(sites), "site_urls": sites[:25]}


# --------------------------------------------------------------------------- #
# Ecommerce / Email
# --------------------------------------------------------------------------- #
def sync_shopify(token: str | None, config: dict[str, Any]) -> dict[str, Any]:
    """Read shop info + product count from a Shopify store (Admin API)."""
    access = _require(token, "Shopify Admin API access token")
    domain = (config or {}).get("shop_domain") or (config or {}).get("store_domain")
    if not domain:
        raise SyncError("Shopify: missing shop_domain in config (e.g. my-store.myshopify.com).")
    version = (config or {}).get("api_version", "2024-04")
    base = f"https://{domain.rstrip('/')}/admin/api/{version}"
    headers = {"X-Shopify-Access-Token": access}
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            shop = client.get(f"{base}/shop.json", headers=headers)
            shop.raise_for_status()
            count = client.get(f"{base}/products/count.json", headers=headers)
            count.raise_for_status()
            shop_data = shop.json().get("shop", {})
            products = count.json().get("count")
    except Exception as exc:  # noqa: BLE001
        raise _http_error("Shopify", exc) from exc
    return {
        "provider": "shopify",
        "shop": shop_data.get("name"),
        "domain": shop_data.get("myshopify_domain") or domain,
        "products": products,
    }


def sync_woocommerce(token: str | None, config: dict[str, Any]) -> dict[str, Any]:
    """Read product count from a WooCommerce store via REST API.

    The decrypted ``token`` holds the consumer secret; the consumer key lives in
    ``config['consumer_key']`` alongside the store ``base_url``.
    """
    secret = _require(token, "WooCommerce consumer secret")
    cfg = config or {}
    base_url = cfg.get("base_url") or cfg.get("store_url")
    key = cfg.get("consumer_key")
    if not base_url or not key:
        raise SyncError("WooCommerce: missing base_url or consumer_key in config.")
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(
                f"{base_url.rstrip('/')}/wp-json/wc/v3/products",
                params={"per_page": 1},
                auth=(key, secret),
            )
            resp.raise_for_status()
            total = resp.headers.get("X-WP-Total")
    except Exception as exc:  # noqa: BLE001
        raise _http_error("WooCommerce", exc) from exc
    return {
        "provider": "woocommerce",
        "products": int(total) if total and total.isdigit() else None,
    }


def sync_klaviyo(token: str | None, config: dict[str, Any]) -> dict[str, Any]:
    """Read account/lists info from Klaviyo using a private API key."""
    api_key = _require(token, "Klaviyo private API key")
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(
                "https://a.klaviyo.com/api/lists/",
                headers={
                    "Authorization": f"Klaviyo-API-Key {api_key}",
                    "revision": "2024-10-15",
                    "accept": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # noqa: BLE001
        raise _http_error("Klaviyo", exc) from exc
    lists = data.get("data") or []
    return {"provider": "klaviyo", "lists": len(lists)}


# Dispatch map: provider -> sync function.
SYNC: dict[str, Callable[[str | None, dict[str, Any]], dict[str, Any]]] = {
    "hubspot": sync_hubspot,
    "salesforce": sync_salesforce,
    "pipedrive": sync_pipedrive,
    "ga4": sync_ga4,
    "search_console": sync_search_console,
    "shopify": sync_shopify,
    "woocommerce": sync_woocommerce,
    "klaviyo": sync_klaviyo,
}
