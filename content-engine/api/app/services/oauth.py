"""Native OAuth helpers for social networks.

Builds authorization URLs and exchanges authorization codes for tokens. Each
provider is configured from environment (you create the developer apps). When a
provider is not configured, ``provider_configured`` returns False so the API can
return a clear, actionable error instead of a broken redirect.

Implements OAuth 2.0 Authorization Code (LinkedIn, X w/ PKCE, Google) and the
Meta flow. Tokens are returned to the caller, which persists them on a
SocialAccount row (encrypted at rest in production).
"""
from __future__ import annotations

import base64
import hashlib
import json
import logging
import secrets
import time
from dataclasses import dataclass

import httpx

from app.config import settings

log = logging.getLogger("oauth")

_STATE_TTL = 600  # seconds (~10 min); stale states are never usable.
_STATE_PREFIX = "oauth:state:"


class _StateStore:
    """Short-lived OAuth ``state`` store.

    Prefers Redis (so the authorization + callback can be served by different
    API instances) and falls back to an in-process dict when Redis is not
    configured or unreachable. The fallback keeps single-instance deployments
    and local dev working without Redis. Entries expire after ``_STATE_TTL``.

    A synchronous Redis client is used deliberately so the public helpers stay
    synchronous and existing callers (which call them without ``await``) keep
    working unchanged.
    """

    def __init__(self) -> None:
        self._mem: dict[str, dict] = {}
        self._redis = None
        self._redis_ready = False

    def _client(self):
        if self._redis_ready:
            return self._redis
        self._redis_ready = True
        url = getattr(settings, "redis_url", None)
        if not url:
            return None
        try:
            import redis  # type: ignore

            client = redis.Redis.from_url(
                url,
                socket_connect_timeout=0.5,
                socket_timeout=0.5,
                decode_responses=True,
            )
            client.ping()
            self._redis = client
            return client
        except Exception as exc:  # noqa: BLE001
            log.warning("OAuth state store: Redis unavailable, using in-memory fallback (%s)", exc)
            self._redis = None
            return None

    def _prune_mem(self) -> None:
        now = time.time()
        expired = [k for k, v in self._mem.items() if now - v.get("_created_at", 0) > _STATE_TTL]
        for k in expired:
            self._mem.pop(k, None)

    def set(self, state: str, payload: dict) -> None:
        client = self._client()
        if client is not None:
            try:
                client.setex(_STATE_PREFIX + state, _STATE_TTL, json.dumps(payload))
                return
            except Exception as exc:  # noqa: BLE001
                log.warning("OAuth state store: Redis set failed, falling back to memory (%s)", exc)
                self._redis = None
        self._prune_mem()
        self._mem[state] = payload

    def pop(self, state: str) -> dict | None:
        client = self._client()
        if client is not None:
            try:
                key = _STATE_PREFIX + state
                raw = client.get(key)
                client.delete(key)
                if raw is None:
                    return None
                entry = json.loads(raw)
                if time.time() - entry.get("_created_at", 0) > _STATE_TTL:
                    return None
                return entry
            except Exception as exc:  # noqa: BLE001
                log.warning("OAuth state store: Redis pop failed, falling back to memory (%s)", exc)
                self._redis = None
        self._prune_mem()
        entry = self._mem.pop(state, None)
        if entry is None:
            return None
        if time.time() - entry.get("_created_at", 0) > _STATE_TTL:
            return None
        return entry


_store = _StateStore()


@dataclass
class ProviderConfig:
    name: str
    auth_url: str
    token_url: str
    scopes: list[str]
    client_id: str | None
    client_secret: str | None
    use_pkce: bool = False


def _providers() -> dict[str, ProviderConfig]:
    return {
        "linkedin": ProviderConfig(
            name="linkedin",
            auth_url="https://www.linkedin.com/oauth/v2/authorization",
            token_url="https://www.linkedin.com/oauth/v2/accessToken",
            scopes=[
                "openid",
                "profile",
                "email",
                "w_member_social",
                # Company-page (organization) posting. These require the LinkedIn app to be
                # approved for the "Community Management API" product, otherwise authorization
                # fails with unauthorized_scope_error. Gated behind LINKEDIN_ORG_POSTING.
                *(
                    ["r_organization_social", "w_organization_social", "rw_organization_admin"]
                    if settings.linkedin_org_posting
                    else []
                ),
            ],
            client_id=settings.linkedin_client_id,
            client_secret=settings.linkedin_client_secret,
        ),
        "x": ProviderConfig(
            name="x",
            auth_url="https://twitter.com/i/oauth2/authorize",
            token_url="https://api.twitter.com/2/oauth2/token",
            scopes=["tweet.read", "tweet.write", "users.read", "offline.access"],
            client_id=settings.x_client_id,
            client_secret=settings.x_client_secret,
            use_pkce=True,
        ),
        "facebook": ProviderConfig(
            name="facebook",
            auth_url="https://www.facebook.com/v19.0/dialog/oauth",
            token_url="https://graph.facebook.com/v19.0/oauth/access_token",
            scopes=[
                "pages_manage_posts",
                "pages_read_engagement",
                "pages_show_list",
                "instagram_basic",
                "instagram_content_publish",
                "business_management",
            ],
            client_id=settings.meta_app_id,
            client_secret=settings.meta_app_secret,
        ),
        "youtube": ProviderConfig(
            name="youtube",
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=[
                "https://www.googleapis.com/auth/youtube.upload",
                "https://www.googleapis.com/auth/youtube.readonly",
            ],
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
        ),
        # ----- Ads platforms (OAuth-based account connection) -----
        "google_ads": ProviderConfig(
            name="google_ads",
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=["https://www.googleapis.com/auth/adwords"],
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
        ),
        "meta_ads": ProviderConfig(
            name="meta_ads",
            auth_url="https://www.facebook.com/v19.0/dialog/oauth",
            token_url="https://graph.facebook.com/v19.0/oauth/access_token",
            scopes=["ads_management", "ads_read", "business_management"],
            client_id=settings.meta_app_id,
            client_secret=settings.meta_app_secret,
        ),
        "linkedin_ads": ProviderConfig(
            name="linkedin_ads",
            auth_url="https://www.linkedin.com/oauth/v2/authorization",
            token_url="https://www.linkedin.com/oauth/v2/accessToken",
            scopes=["r_ads", "r_ads_reporting", "rw_ads"],
            client_id=settings.linkedin_client_id,
            client_secret=settings.linkedin_client_secret,
        ),
    }


# Which OAuth service path a platform's callback lives under.
_ADS_PLATFORMS = {"google_ads", "meta_ads", "linkedin_ads"}


def _service_for(platform: str) -> str:
    return "ads" if platform in _ADS_PLATFORMS else "social"


def provider_configured(platform: str) -> bool:
    p = _providers().get(platform)
    return bool(p and p.client_id and p.client_secret)


def redirect_uri(platform: str) -> str:
    base = settings.oauth_redirect_base.rstrip("/")
    return f"{base}/api/v1/{_service_for(platform)}/{platform}/callback"


def _pkce_pair() -> tuple[str, str]:
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(48)).rstrip(b"=").decode()
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    return verifier, challenge


def build_authorization_url(platform: str, workspace_id: str) -> tuple[str, str]:
    p = _providers().get(platform)
    if not p:
        raise ValueError(f"Unsupported platform: {platform}")
    if not (p.client_id and p.client_secret):
        raise ValueError(
            f"{platform} OAuth is not configured. Set {platform.upper()} client id/secret."
        )
    state = secrets.token_urlsafe(24)
    params = {
        "response_type": "code",
        "client_id": p.client_id,
        "redirect_uri": redirect_uri(platform),
        "scope": " ".join(p.scopes),
        "state": state,
    }
    store: dict = {"workspace_id": workspace_id, "platform": platform, "_created_at": time.time()}
    if p.use_pkce:
        verifier, challenge = _pkce_pair()
        params["code_challenge"] = challenge
        params["code_challenge_method"] = "S256"
        store["code_verifier"] = verifier
    if platform in ("youtube", "google_ads"):
        params["access_type"] = "offline"
        params["prompt"] = "consent"
    _store.set(state, store)
    # httpx QueryParams handles encoding; build the URL cleanly:
    url = str(httpx.URL(p.auth_url, params=params))
    return url, state


def pop_state(state: str) -> dict | None:
    return _store.pop(state)


async def exchange_code(platform: str, code: str, state_data: dict) -> dict:
    p = _providers()[platform]
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri(platform),
        "client_id": p.client_id or "",
        "client_secret": p.client_secret or "",
    }
    if p.use_pkce and state_data.get("code_verifier"):
        data["code_verifier"] = state_data["code_verifier"]
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    auth = None
    if platform == "x":
        # X requires HTTP Basic auth for confidential clients.
        auth = (p.client_id or "", p.client_secret or "")
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(p.token_url, data=data, headers=headers, auth=auth)
    res.raise_for_status()
    return res.json()
