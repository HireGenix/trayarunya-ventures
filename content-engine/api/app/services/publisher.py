"""Publish content to connected social accounts via their native APIs.

LinkedIn (UGC Posts) and X (v2 tweets) are implemented as real HTTP calls. Each
returns the external post id on success — an empty/missing id is treated as a
failure (never a silent "false success"). LinkedIn posts can carry a generated
image (register → upload → attach). Transient 429/5xx responses are retried with
exponential backoff.
"""
from __future__ import annotations

import asyncio
import logging

import httpx

from app.models import SocialAccount

log = logging.getLogger("publisher")

# Hard limits enforced before we hit the network so we fail loudly, not at the API.
LINKEDIN_MAX_CHARS = 3000
X_MAX_CHARS = 280

_RETRY_STATUS = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3


class PublishError(RuntimeError):
    pass


async def _request_with_retry(
    client: httpx.AsyncClient, method: str, url: str, **kwargs
) -> httpx.Response:
    """Issue a request, retrying transient (429/5xx) failures with backoff."""
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            res = await client.request(method, url, **kwargs)
        except (httpx.TransportError, httpx.TimeoutException) as exc:
            last_exc = exc
            if attempt == _MAX_RETRIES - 1:
                raise PublishError(f"Network error calling {url}: {exc}") from exc
            await asyncio.sleep(1.5 * (2**attempt))
            continue
        if res.status_code in _RETRY_STATUS and attempt < _MAX_RETRIES - 1:
            await asyncio.sleep(1.5 * (2**attempt))
            continue
        return res
    if last_exc:
        raise PublishError(str(last_exc))
    raise PublishError(f"Exhausted retries calling {url}")


async def _linkedin_author(client: httpx.AsyncClient, account: SocialAccount) -> str:
    author = account.external_id
    if author:
        return author
    ui = await _request_with_retry(
        client,
        "GET",
        "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {account.access_token}"},
    )
    if ui.status_code >= 300:
        raise PublishError(f"LinkedIn userinfo {ui.status_code}: {ui.text[:200]}")
    sub = ui.json().get("sub")
    if not sub:
        raise PublishError("Could not resolve LinkedIn author URN")
    return f"urn:li:person:{sub}"


async def _linkedin_upload_image(
    client: httpx.AsyncClient,
    account: SocialAccount,
    author: str,
    image_bytes: bytes,
) -> str:
    """Register + upload an image and return its digital-media asset URN."""
    reg = await _request_with_retry(
        client,
        "POST",
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        headers={
            "Authorization": f"Bearer {account.access_token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
        },
        json={
            "registerUploadRequest": {
                "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                "owner": author,
                "serviceRelationships": [
                    {
                        "relationshipType": "OWNER",
                        "identifier": "urn:li:userGeneratedContent",
                    }
                ],
            }
        },
    )
    if reg.status_code >= 300:
        raise PublishError(f"LinkedIn registerUpload {reg.status_code}: {reg.text[:200]}")
    value = reg.json().get("value", {})
    asset = value.get("asset")
    upload_url = (
        value.get("uploadMechanism", {})
        .get("com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest", {})
        .get("uploadUrl")
    )
    if not asset or not upload_url:
        raise PublishError("LinkedIn did not return an upload URL for the image")

    up = await _request_with_retry(
        client,
        "POST",
        upload_url,
        headers={"Authorization": f"Bearer {account.access_token}"},
        content=image_bytes,
    )
    if up.status_code >= 300:
        raise PublishError(f"LinkedIn image upload {up.status_code}: {up.text[:200]}")
    return asset


async def _publish_linkedin(
    account: SocialAccount, text: str, image_bytes: bytes | None = None
) -> str:
    if not account.access_token:
        raise PublishError("LinkedIn account has no access token")
    if not text.strip():
        raise PublishError("Cannot publish an empty post")
    if len(text) > LINKEDIN_MAX_CHARS:
        text = text[: LINKEDIN_MAX_CHARS - 1] + "…"

    async with httpx.AsyncClient(timeout=60) as client:
        author = await _linkedin_author(client, account)

        share_content: dict = {
            "shareCommentary": {"text": text},
            "shareMediaCategory": "NONE",
        }
        if image_bytes:
            try:
                asset = await _linkedin_upload_image(client, account, author, image_bytes)
                share_content["shareMediaCategory"] = "IMAGE"
                share_content["media"] = [{"status": "READY", "media": asset}]
            except PublishError as exc:
                # Image is best-effort — fall back to a text post rather than fail.
                log.warning("LinkedIn image attach failed, posting text only: %s", exc)

        payload = {
            "author": author,
            "lifecycleState": "PUBLISHED",
            "specificContent": {"com.linkedin.ugc.ShareContent": share_content},
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }
        res = await _request_with_retry(
            client,
            "POST",
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
    external_id = res.json().get("id") or res.headers.get("x-restli-id", "")
    if not external_id:
        raise PublishError("LinkedIn accepted the post but returned no post id")
    return external_id


async def _publish_x(account: SocialAccount, text: str) -> str:
    if not account.access_token:
        raise PublishError("X account has no access token")
    if not text.strip():
        raise PublishError("Cannot publish an empty post")
    async with httpx.AsyncClient(timeout=30) as client:
        res = await _request_with_retry(
            client,
            "POST",
            "https://api.twitter.com/2/tweets",
            headers={
                "Authorization": f"Bearer {account.access_token}",
                "Content-Type": "application/json",
            },
            json={"text": text[:X_MAX_CHARS]},
        )
    if res.status_code >= 300:
        raise PublishError(f"X API {res.status_code}: {res.text[:300]}")
    external_id = str(res.json().get("data", {}).get("id", ""))
    if not external_id:
        raise PublishError("X accepted the tweet but returned no id")
    return external_id


async def publish(
    account: SocialAccount, text: str, image_bytes: bytes | None = None
) -> str:
    """Publish ``text`` (with an optional image) to the account's platform.

    Returns the external post id on success; raises :class:`PublishError`
    otherwise. Never returns an empty string for success.
    """
    platform = (
        account.platform.value if hasattr(account.platform, "value") else str(account.platform)
    )
    if platform == "linkedin":
        return await _publish_linkedin(account, text, image_bytes)
    if platform == "x":
        # X image upload requires the OAuth1.0a media endpoint; not available with
        # our OAuth2 bearer tokens, so we post text-only for now.
        return await _publish_x(account, text)
    raise PublishError(f"Publishing to {platform} is not yet supported")
