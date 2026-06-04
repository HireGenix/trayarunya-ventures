"""Unit tests for the Integrations-hub OAuth service.

These are pure (no DB, no network): provider client creds are monkeypatched onto
``settings`` and all HTTP is faked. They assert the *protocol* layer — auth URL
construction, CSRF state lifecycle, code exchange and token refresh.
"""
from __future__ import annotations

from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from app.config import settings
from app.services import integrations_oauth as oauth_svc


# --------------------------------------------------------------------------- #
# httpx fakes
# --------------------------------------------------------------------------- #
class _FakeResp:
    def __init__(self, json_data: dict, status_code: int = 200) -> None:
        self._json = json_data
        self.status_code = status_code

    def json(self) -> dict:
        return self._json

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            req = httpx.Request("POST", "https://example.test/token")
            raise httpx.HTTPStatusError(
                "error",
                request=req,
                response=httpx.Response(self.status_code, request=req),
            )


class _FakeClient:
    def __init__(self, resp) -> None:
        self._resp = resp
        self.last_url: str | None = None
        self.last_data: dict | None = None

    async def __aenter__(self) -> "_FakeClient":
        return self

    async def __aexit__(self, *a) -> bool:
        return False

    async def post(self, url, data=None, headers=None):  # noqa: ANN001
        self.last_url = url
        self.last_data = data
        if isinstance(self._resp, Exception):
            raise self._resp
        return self._resp


def _patch_client(monkeypatch, resp) -> _FakeClient:
    client = _FakeClient(resp)
    monkeypatch.setattr(oauth_svc.httpx, "AsyncClient", lambda *a, **k: client)
    return client


# --------------------------------------------------------------------------- #
# Authorization URL
# --------------------------------------------------------------------------- #
def test_build_authorization_url_hubspot(monkeypatch):
    monkeypatch.setattr(settings, "hubspot_client_id", "hub-cid")
    monkeypatch.setattr(settings, "hubspot_client_secret", "hub-secret")

    url, state = oauth_svc.build_authorization_url("hubspot", "ws-1", {})

    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    assert parsed.netloc == "app.hubspot.com"
    assert qs["client_id"] == ["hub-cid"]
    assert qs["response_type"] == ["code"]
    assert qs["state"] == [state]
    assert qs["redirect_uri"][0].endswith("/api/v1/integrations/hubspot/oauth/callback")
    # State is retrievable exactly once.
    data = oauth_svc.pop_state(state)
    assert data and data["workspace_id"] == "ws-1"
    assert oauth_svc.pop_state(state) is None  # consumed


def test_build_authorization_url_unconfigured_raises(monkeypatch):
    monkeypatch.setattr(settings, "hubspot_client_id", None)
    monkeypatch.setattr(settings, "hubspot_client_secret", None)
    with pytest.raises(oauth_svc.OAuthError):
        oauth_svc.build_authorization_url("hubspot", "ws-1", {})


def test_build_authorization_url_unknown_provider():
    with pytest.raises(oauth_svc.OAuthError):
        oauth_svc.build_authorization_url("totally-unknown", "ws-1", {})


def test_build_authorization_url_google_offline(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "g-cid")
    monkeypatch.setattr(settings, "google_client_secret", "g-secret")

    url, _ = oauth_svc.build_authorization_url("ga4", "ws-2", {})
    qs = parse_qs(urlparse(url).query)
    assert qs["access_type"] == ["offline"]
    assert qs["prompt"] == ["consent"]
    assert "analytics.readonly" in qs["scope"][0]


def test_build_authorization_url_shopify_per_shop(monkeypatch):
    monkeypatch.setattr(settings, "shopify_api_key", "shop-key")
    monkeypatch.setattr(settings, "shopify_api_secret", "shop-secret")

    url, state = oauth_svc.build_authorization_url(
        "shopify", "ws-3", {"shop_domain": "my-store"}
    )
    parsed = urlparse(url)
    # bare store name is normalized to the full myshopify domain
    assert parsed.netloc == "my-store.myshopify.com"
    assert parsed.path == "/admin/oauth/authorize"
    data = oauth_svc.pop_state(state)
    assert data and data["shop"] == "my-store.myshopify.com"


def test_build_authorization_url_shopify_missing_shop_raises(monkeypatch):
    monkeypatch.setattr(settings, "shopify_api_key", "shop-key")
    monkeypatch.setattr(settings, "shopify_api_secret", "shop-secret")
    with pytest.raises(oauth_svc.OAuthError):
        oauth_svc.build_authorization_url("shopify", "ws-3", {})


# --------------------------------------------------------------------------- #
# State store
# --------------------------------------------------------------------------- #
def test_pop_state_unknown_returns_none():
    assert oauth_svc.pop_state("does-not-exist") is None
    assert oauth_svc.pop_state(None) is None


# --------------------------------------------------------------------------- #
# Code exchange
# --------------------------------------------------------------------------- #
async def test_exchange_code_success(monkeypatch):
    monkeypatch.setattr(settings, "hubspot_client_id", "hub-cid")
    monkeypatch.setattr(settings, "hubspot_client_secret", "hub-secret")
    client = _patch_client(
        monkeypatch,
        _FakeResp({"access_token": "AT", "refresh_token": "RT", "expires_in": 1800}),
    )

    token = await oauth_svc.exchange_code("hubspot", "the-code", {"workspace_id": "ws"})
    assert token["access_token"] == "AT"
    assert token["refresh_token"] == "RT"
    assert client.last_data["grant_type"] == "authorization_code"
    assert client.last_data["code"] == "the-code"
    assert client.last_url == "https://api.hubapi.com/oauth/v1/token"


async def test_exchange_code_shopify_uses_shop_token_url(monkeypatch):
    monkeypatch.setattr(settings, "shopify_api_key", "shop-key")
    monkeypatch.setattr(settings, "shopify_api_secret", "shop-secret")
    client = _patch_client(monkeypatch, _FakeResp({"access_token": "shpat_x"}))

    token = await oauth_svc.exchange_code(
        "shopify", "c", {"shop": "my-store.myshopify.com"}
    )
    assert token["access_token"] == "shpat_x"
    assert client.last_url == "https://my-store.myshopify.com/admin/oauth/access_token"


async def test_exchange_code_http_error_raises(monkeypatch):
    monkeypatch.setattr(settings, "hubspot_client_id", "hub-cid")
    monkeypatch.setattr(settings, "hubspot_client_secret", "hub-secret")
    _patch_client(monkeypatch, _FakeResp({}, status_code=400))
    with pytest.raises(oauth_svc.OAuthError):
        await oauth_svc.exchange_code("hubspot", "bad", {})


# --------------------------------------------------------------------------- #
# Refresh
# --------------------------------------------------------------------------- #
async def test_refresh_access_token_success(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "g-cid")
    monkeypatch.setattr(settings, "google_client_secret", "g-secret")
    client = _patch_client(
        monkeypatch, _FakeResp({"access_token": "newAT", "expires_in": 3600})
    )

    token = await oauth_svc.refresh_access_token("ga4", "the-refresh")
    assert token["access_token"] == "newAT"
    assert client.last_data["grant_type"] == "refresh_token"
    assert client.last_data["refresh_token"] == "the-refresh"


async def test_refresh_access_token_http_error_raises(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "g-cid")
    monkeypatch.setattr(settings, "google_client_secret", "g-secret")
    _patch_client(monkeypatch, _FakeResp({}, status_code=401))
    with pytest.raises(oauth_svc.OAuthError):
        await oauth_svc.refresh_access_token("ga4", "stale")


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def test_supports_refresh():
    assert oauth_svc.supports_refresh("ga4") is True
    assert oauth_svc.supports_refresh("search_console") is True
    assert oauth_svc.supports_refresh("hubspot") is False
    assert oauth_svc.supports_refresh("shopify") is False


def test_expires_at_from():
    assert oauth_svc.expires_at_from({}) is None
    assert oauth_svc.expires_at_from({"expires_in": "nope"}) is None
    dt = oauth_svc.expires_at_from({"expires_in": 3600})
    assert dt is not None and dt.tzinfo is not None


def test_provider_configured(monkeypatch):
    monkeypatch.setattr(settings, "hubspot_client_id", None)
    monkeypatch.setattr(settings, "hubspot_client_secret", None)
    assert oauth_svc.provider_configured("hubspot") is False
    monkeypatch.setattr(settings, "hubspot_client_id", "x")
    monkeypatch.setattr(settings, "hubspot_client_secret", "y")
    assert oauth_svc.provider_configured("hubspot") is True
    assert oauth_svc.provider_configured("unknown") is False


def test_redirect_uri_shape():
    uri = oauth_svc.redirect_uri("hubspot")
    assert uri.endswith("/api/v1/integrations/hubspot/oauth/callback")
