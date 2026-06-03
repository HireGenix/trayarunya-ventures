"""Publish content to connected social accounts via their native APIs.

LinkedIn (UGC Posts) and X (v2 tweets) are implemented as real HTTP calls. Each
returns the external post id on success. The account must hold a valid access
token (from the OAuth flow or a manually connected token).
"""
from __future__ import annotations

import httpx

from app.models import SocialAccount


class PublishError(RuntimeError):
    pass


async def _publish_linkedin(account: SocialAccount, text: str) -> str:
    if not account.access_token:
        raise PublishError("LinkedIn account has no access token")
    author = account.external_id
    if not author:
        # Resolve the member URN from the userinfo endpoint.
        async with httpx.AsyncClient(timeout=30) as client:
            ui = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {account.access_token}"},
            )
        ui.raise_for_status()
        sub = ui.json().get("sub")
        author = f"urn:li:person:{sub}" if sub else None
    if not author:
        raise PublishError("Could not resolve LinkedIn author URN")

    payload = {
        "author": author,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            "https://api.linkedin.com/v2/ugcPosts",
            headers={
                "Authorization": f"Bearer {account.access_token}",
                "X-Restli-Protocol-Version": "2.0.0",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    if res.status_code >= 300:
        raise PublishError(f"LinkedIn API {res.status_code}: {res.text[:300]}")
    return res.json().get("id") or res.headers.get("x-restli-id", "")


async def _publish_x(account: SocialAccount, text: str) -> str:
    if not account.access_token:
        raise PublishError("X account has no access token")
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            "https://api.twitter.com/2/tweets",
            headers={
                "Authorization": f"Bearer {account.access_token}",
                "Content-Type": "application/json",
            },
            json={"text": text[:280]},
        )
    if res.status_code >= 300:
        raise PublishError(f"X API {res.status_code}: {res.text[:300]}")
    return str(res.json().get("data", {}).get("id", ""))


async def publish(account: SocialAccount, text: str) -> str:
    platform = account.platform.value if hasattr(account.platform, "value") else str(account.platform)
    if platform == "linkedin":
        return await _publish_linkedin(account, text)
    if platform == "x":
        return await _publish_x(account, text)
    raise PublishError(f"Publishing to {platform} is not yet supported")
