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
import secrets
import time
from dataclasses import dataclass

import httpx

from app.config import settings

# In-memory store for OAuth state -> {workspace_id, code_verifier, _created_at}.
# Entries expire after 10 minutes so stale states are never usable and the dict
# never grows unbounded. In multi-instance production back this with Redis.
_STATE: dict[str, dict] = {}
_STATE_TTL = 600  # seconds


def _prune_state() -> None:
    """Remove expired state entries (called on every write + read)."""
    now = time.time()
    expired = [k for k, v in _STATE.items() if now - v.get("_created_at", 0) > _STATE_TTL]
    for k in expired:
        _STATE.pop(k, None)


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
            scopes=["openid", "profile", "email", "w_member_social"],
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
    _prune_state()
    _STATE[state] = store
    # httpx QueryParams handles encoding; build the URL cleanly:
    url = str(httpx.URL(p.auth_url, params=params))
    return url, state


def pop_state(state: str) -> dict | None:
    _prune_state()
    entry = _STATE.pop(state, None)
    if entry is None:
        return None
    # Reject expired states even if prune didn't catch them.
    if time.time() - entry.get("_created_at", 0) > _STATE_TTL:
        return None
    return entry


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
