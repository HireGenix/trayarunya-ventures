"""Ads launcher service: draft validation, real platform writes, status sync.

Implements the graceful-degradation pattern:
- When ad account has valid credentials → real Google Ads / Meta Ads API writes
- When credentials are missing → honest ``not_connected`` / ``awaiting_credentials``
  status (NEVER fabricated campaign IDs or mock success)

Google Ad Grants (nonprofit) constraints are enforced at validation time:
- Budget cap: $329/day ($10,000/month)
- Campaign types: Search (RSA) or Performance Max only
- Bidding: Maximize Conversions required
- RSA: 3-15 headlines (<=30 chars each), 2-4 descriptions (<=90 chars each)
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings
from app.models import AdAccount, Campaign, CampaignStatus
from app.services.ads_connectors import _google_headers, _GOOGLE_API_VERSION
from app.services.token_vault import get_account_token

logger = logging.getLogger(__name__)

_HTTP_TIMEOUT = 45.0

GRANT_DAILY_CAP = 329.0


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class ValidationError:
    def __init__(self, field: str, message: str, severity: str = "error"):
        self.field = field
        self.message = message
        self.severity = severity  # "error" or "warning"

    def dict(self) -> dict[str, str]:
        return {"field": self.field, "message": self.message, "severity": self.severity}


def validate_campaign_draft(
    campaign: Campaign, account: AdAccount
) -> list[ValidationError]:
    """Validate a campaign draft against platform rules. Returns errors/warnings."""
    errors: list[ValidationError] = []
    platform = account.platform.value

    # Budget checks
    budget = campaign.daily_budget
    if budget is not None and budget <= 0:
        errors.append(ValidationError("daily_budget", "Daily budget must be positive."))

    if account.is_grant and platform == "google_ads":
        if budget is not None and budget > GRANT_DAILY_CAP:
            errors.append(ValidationError(
                "daily_budget",
                f"Ad Grants accounts are capped at ${GRANT_DAILY_CAP}/day ($10,000/month).",
            ))

    # Plan structure
    plan = campaign.plan or {}
    assets = campaign.assets or {}

    if platform == "google_ads":
        _validate_google_ads(campaign, account, plan, assets, errors)
    elif platform == "meta_ads":
        _validate_meta_ads(campaign, account, plan, assets, errors)

    if not campaign.name or len(campaign.name.strip()) < 2:
        errors.append(ValidationError("name", "Campaign name is required (min 2 characters)."))

    return errors


def _validate_google_ads(
    campaign: Campaign,
    account: AdAccount,
    plan: dict,
    assets: dict,
    errors: list[ValidationError],
) -> None:
    channel = str(plan.get("channel", "Search")).lower().replace(" ", "")

    if account.is_grant:
        if channel not in ("search", "performancemax", "pmax"):
            errors.append(ValidationError(
                "channel",
                "Ad Grants accounts may only use Search (RSA) or Performance Max campaigns.",
            ))
        bidding = plan.get("bidding", "")
        if bidding and "maximize conversions" not in bidding.lower():
            errors.append(ValidationError(
                "bidding",
                "Ad Grants accounts must use 'Maximize Conversions' bidding.",
                "warning",
            ))

    # RSA asset validation
    ad_groups = assets.get("ad_groups") or plan.get("ad_groups") or []
    for i, ag in enumerate(ad_groups):
        if not isinstance(ag, dict):
            continue
        headlines = ag.get("headlines", [])
        descriptions = ag.get("descriptions", [])
        group_label = ag.get("name", f"Ad group {i + 1}")

        if len(headlines) < 3:
            errors.append(ValidationError(
                f"ad_groups[{i}].headlines",
                f"{group_label}: RSA requires at least 3 headlines (have {len(headlines)}).",
            ))
        if len(headlines) > 15:
            errors.append(ValidationError(
                f"ad_groups[{i}].headlines",
                f"{group_label}: RSA allows at most 15 headlines (have {len(headlines)}).",
            ))
        for j, h in enumerate(headlines):
            if isinstance(h, str) and len(h) > 30:
                errors.append(ValidationError(
                    f"ad_groups[{i}].headlines[{j}]",
                    f"{group_label}: Headline '{h[:25]}...' exceeds 30-char limit ({len(h)} chars).",
                ))
        if len(descriptions) < 2:
            errors.append(ValidationError(
                f"ad_groups[{i}].descriptions",
                f"{group_label}: RSA requires at least 2 descriptions (have {len(descriptions)}).",
            ))
        if len(descriptions) > 4:
            errors.append(ValidationError(
                f"ad_groups[{i}].descriptions",
                f"{group_label}: RSA allows at most 4 descriptions (have {len(descriptions)}).",
            ))
        for j, d in enumerate(descriptions):
            if isinstance(d, str) and len(d) > 90:
                errors.append(ValidationError(
                    f"ad_groups[{i}].descriptions[{j}]",
                    f"{group_label}: Description exceeds 90-char limit ({len(d)} chars).",
                ))


def _validate_meta_ads(
    campaign: Campaign,
    account: AdAccount,
    plan: dict,
    assets: dict,
    errors: list[ValidationError],
) -> None:
    ad_sets = assets.get("ad_sets") or plan.get("ad_sets") or []
    if not ad_sets:
        errors.append(ValidationError(
            "ad_sets",
            "Meta campaigns require at least one ad set.",
            "warning",
        ))
    for i, ad_set in enumerate(ad_sets):
        if not isinstance(ad_set, dict):
            continue
        primary_texts = ad_set.get("primary_texts", [])
        for j, t in enumerate(primary_texts):
            if isinstance(t, str) and len(t) > 125:
                errors.append(ValidationError(
                    f"ad_sets[{i}].primary_texts[{j}]",
                    f"Primary text exceeds 125-char limit ({len(t)} chars).",
                ))
        headlines = ad_set.get("headlines", [])
        for j, h in enumerate(headlines):
            if isinstance(h, str) and len(h) > 40:
                errors.append(ValidationError(
                    f"ad_sets[{i}].headlines[{j}]",
                    f"Headline exceeds 40-char limit ({len(h)} chars).",
                ))


# ---------------------------------------------------------------------------
# Connection check
# ---------------------------------------------------------------------------

def check_connection(account: AdAccount | None) -> dict[str, Any]:
    """Return a connection-status dict for a workspace's ad account."""
    if account is None:
        return {
            "connected": False,
            "platform": None,
            "status": "not_connected",
            "message": "No ad account configured for this platform. Create or connect one to get started.",
            "has_credentials": False,
            "can_launch": False,
        }

    platform = account.platform.value
    has_token = bool(get_account_token(account))
    platform_configured = settings.ads_platform_configured(platform)

    if not account.connected:
        return {
            "connected": False,
            "platform": platform,
            "status": "not_connected",
            "message": "Ad account exists but is not connected. Connect via OAuth to enable live operations.",
            "has_credentials": False,
            "can_launch": False,
        }

    if not has_token:
        return {
            "connected": True,
            "platform": platform,
            "status": "awaiting_credentials",
            "message": "Ad account is connected but OAuth token is missing or expired. Re-authenticate to restore live access.",
            "has_credentials": False,
            "can_launch": False,
        }

    if not platform_configured:
        return {
            "connected": True,
            "platform": platform,
            "status": "platform_not_configured",
            "message": f"OAuth credentials for {platform} are not configured on this deployment. Contact your admin.",
            "has_credentials": True,
            "can_launch": False,
        }

    return {
        "connected": True,
        "platform": platform,
        "status": "ready",
        "message": f"Connected to {platform} and ready for live operations.",
        "has_credentials": True,
        "can_launch": True,
        "external_id": account.external_id,
        "is_grant": account.is_grant,
    }


# ---------------------------------------------------------------------------
# Google Ads: real campaign creation
# ---------------------------------------------------------------------------

async def _create_google_campaign(
    account: AdAccount,
    campaign: Campaign,
) -> dict[str, Any]:
    """Create a real Google Ads campaign via the REST API.

    Returns ``{success, external_id, platform_status, detail}`` or
    ``{success: False, error, detail}``.
    """
    access_token = get_account_token(account)
    if not access_token:
        return {"success": False, "error": "no_credentials", "detail": "OAuth token missing."}

    developer_token = settings.google_ads_developer_token
    customer_id = account.external_id or settings.google_ads_login_customer_id
    if not developer_token or not customer_id:
        return {
            "success": False,
            "error": "platform_not_configured",
            "detail": "Google Ads developer token or customer ID not configured.",
        }
    customer_id = str(customer_id).replace("-", "")

    plan = campaign.plan or {}
    budget_micros = int((campaign.daily_budget or 10.0) * 1_000_000)

    login_cid = settings.google_ads_login_customer_id
    headers = _google_headers(access_token, login_cid=login_cid)

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            # 1. Create a campaign budget
            budget_body = {
                "operations": [{
                    "create": {
                        "name": f"Budget-{campaign.name[:60]}-{uuid.uuid4().hex[:6]}",
                        "amountMicros": str(budget_micros),
                        "deliveryMethod": "STANDARD",
                        "explicitlyShared": False,
                    }
                }]
            }
            budget_url = (
                f"https://googleads.googleapis.com/{_GOOGLE_API_VERSION}/"
                f"customers/{customer_id}/campaignBudgets:mutate"
            )
            res = await client.post(budget_url, headers=headers, json=budget_body)
            res.raise_for_status()
            budget_resource = res.json()["results"][0]["resourceName"]

            # 2. Create the campaign
            channel = str(plan.get("channel", "SEARCH")).upper().replace(" ", "_")
            ad_type = "SEARCH" if channel in ("SEARCH", "RSA") else "PERFORMANCE_MAX"
            bidding = {}
            if account.is_grant or "maximize conversions" in str(plan.get("bidding", "")).lower():
                bidding = {"maximizeConversions": {}}
            else:
                bidding = {"maximizeClicks": {}}

            campaign_body = {
                "operations": [{
                    "create": {
                        "name": campaign.name[:250],
                        "status": "PAUSED",
                        "advertisingChannelType": ad_type,
                        "campaignBudget": budget_resource,
                        **bidding,
                    }
                }]
            }
            campaign_url = (
                f"https://googleads.googleapis.com/{_GOOGLE_API_VERSION}/"
                f"customers/{customer_id}/campaigns:mutate"
            )
            res = await client.post(campaign_url, headers=headers, json=campaign_body)
            res.raise_for_status()
            campaign_resource = res.json()["results"][0]["resourceName"]
            # Extract numeric campaign ID from resource name
            external_id = campaign_resource.split("/")[-1]

            return {
                "success": True,
                "external_id": external_id,
                "platform_status": "PAUSED",
                "detail": f"Campaign created on Google Ads (ID: {external_id}). Status: PAUSED.",
                "resource_name": campaign_resource,
                "budget_resource": budget_resource,
            }

    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:500] if exc.response else "No response"
        logger.error("Google Ads campaign create failed: %s %s", exc.response.status_code, body)
        return {
            "success": False,
            "error": "api_error",
            "detail": f"Google Ads API error ({exc.response.status_code}): {body}",
        }
    except Exception as exc:
        logger.error("Google Ads campaign create unexpected error: %s", exc)
        return {
            "success": False,
            "error": "unexpected",
            "detail": f"Unexpected error creating Google Ads campaign: {str(exc)[:300]}",
        }


# ---------------------------------------------------------------------------
# Meta Ads: real campaign creation
# ---------------------------------------------------------------------------

async def _create_meta_campaign(
    account: AdAccount,
    campaign: Campaign,
) -> dict[str, Any]:
    """Create a real Meta Ads campaign via the Marketing API."""
    access_token = get_account_token(account)
    if not access_token:
        return {"success": False, "error": "no_credentials", "detail": "OAuth token missing."}

    ad_account_id = account.external_id
    if not ad_account_id:
        return {
            "success": False,
            "error": "no_account_id",
            "detail": "Meta Ads account ID not configured. Set the external_id on the ad account.",
        }

    # Prefix with act_ if needed
    if not ad_account_id.startswith("act_"):
        ad_account_id = f"act_{ad_account_id}"

    plan = campaign.plan or {}
    objective_map = {
        "awareness": "OUTCOME_AWARENESS",
        "traffic": "OUTCOME_TRAFFIC",
        "engagement": "OUTCOME_ENGAGEMENT",
        "leads": "OUTCOME_LEADS",
        "sales": "OUTCOME_SALES",
    }
    raw_objective = str(plan.get("objective", campaign.objective or "LEADS")).lower()
    meta_objective = objective_map.get(raw_objective, "OUTCOME_LEADS")

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            res = await client.post(
                f"https://graph.facebook.com/v19.0/{ad_account_id}/campaigns",
                data={
                    "name": campaign.name[:250],
                    "objective": meta_objective,
                    "status": "PAUSED",
                    "special_ad_categories": "[]",
                    "access_token": access_token,
                },
            )
            res.raise_for_status()
            data = res.json()
            external_id = data.get("id")

            return {
                "success": True,
                "external_id": external_id,
                "platform_status": "PAUSED",
                "detail": f"Campaign created on Meta Ads (ID: {external_id}). Status: PAUSED.",
            }

    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:500] if exc.response else "No response"
        logger.error("Meta Ads campaign create failed: %s %s", exc.response.status_code, body)
        return {
            "success": False,
            "error": "api_error",
            "detail": f"Meta Ads API error ({exc.response.status_code}): {body}",
        }
    except Exception as exc:
        logger.error("Meta Ads campaign create unexpected error: %s", exc)
        return {
            "success": False,
            "error": "unexpected",
            "detail": f"Unexpected error creating Meta campaign: {str(exc)[:300]}",
        }


# ---------------------------------------------------------------------------
# Unified launch entrypoint
# ---------------------------------------------------------------------------

async def launch_campaign(
    campaign: Campaign,
    account: AdAccount,
) -> dict[str, Any]:
    """Attempt to create the campaign on the real ad platform.

    Returns a result dict with ``success``, ``external_id`` (on success),
    ``error`` and ``detail``. NEVER fabricates a campaign ID.
    """
    conn = check_connection(account)
    if not conn["can_launch"]:
        return {
            "success": False,
            "error": conn["status"],
            "detail": conn["message"],
        }

    # Validate first
    validation_errors = validate_campaign_draft(campaign, account)
    blocking = [e for e in validation_errors if e.severity == "error"]
    if blocking:
        return {
            "success": False,
            "error": "validation_failed",
            "detail": "Campaign has validation errors that must be fixed before launch.",
            "validation_errors": [e.dict() for e in validation_errors],
        }

    platform = account.platform.value
    if platform == "google_ads":
        result = await _create_google_campaign(account, campaign)
    elif platform == "meta_ads":
        result = await _create_meta_campaign(account, campaign)
    else:
        return {
            "success": False,
            "error": "unsupported_platform",
            "detail": f"Campaign launch is not yet supported for {platform}.",
        }

    # Attach warnings to the result
    warnings = [e.dict() for e in validation_errors if e.severity == "warning"]
    if warnings:
        result["warnings"] = warnings

    return result


# ---------------------------------------------------------------------------
# Sync campaign status from platform
# ---------------------------------------------------------------------------

async def sync_campaign_status(
    campaign: Campaign,
    account: AdAccount,
) -> dict[str, Any]:
    """Pull real campaign status from the ad platform.

    Returns the current status or an honest error when not connected.
    """
    if not campaign.external_id:
        return {
            "synced": False,
            "status": "draft",
            "detail": "Campaign is a local draft, not yet launched to any platform.",
        }

    conn = check_connection(account)
    if not conn["can_launch"]:
        return {
            "synced": False,
            "status": campaign.plan.get("platform_status", "unknown") if campaign.plan else "unknown",
            "detail": conn["message"],
        }

    platform = account.platform.value
    if platform == "google_ads":
        return await _sync_google_status(campaign, account)
    elif platform == "meta_ads":
        return await _sync_meta_status(campaign, account)

    return {"synced": False, "status": "unknown", "detail": f"Status sync not supported for {platform}."}


async def _sync_google_status(
    campaign: Campaign,
    account: AdAccount,
) -> dict[str, Any]:
    access_token = get_account_token(account)
    if not access_token:
        return {"synced": False, "status": "unknown", "detail": "No access token."}

    developer_token = settings.google_ads_developer_token
    customer_id = str(account.external_id or "").replace("-", "")
    if not developer_token or not customer_id:
        return {"synced": False, "status": "unknown", "detail": "Missing developer token or customer ID."}

    headers = _google_headers(access_token, login_cid=settings.google_ads_login_customer_id)
    query = (
        "SELECT campaign.id, campaign.name, campaign.status "
        "FROM campaign "
        f"WHERE campaign.id = {campaign.external_id}"
    )
    url = (
        f"https://googleads.googleapis.com/{_GOOGLE_API_VERSION}/"
        f"customers/{customer_id}/googleAds:searchStream"
    )
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            res = await client.post(url, headers=headers, json={"query": query})
            res.raise_for_status()
            payload = res.json()
            batches = payload if isinstance(payload, list) else [payload]
            for batch in batches:
                for row in batch.get("results", []):
                    c = row.get("campaign", {})
                    return {
                        "synced": True,
                        "status": c.get("status", "UNKNOWN"),
                        "name": c.get("name"),
                        "detail": f"Live status: {c.get('status', 'UNKNOWN')}",
                    }
        return {"synced": False, "status": "unknown", "detail": "Campaign not found on Google Ads."}
    except Exception as exc:
        return {"synced": False, "status": "unknown", "detail": f"Error querying Google Ads: {str(exc)[:200]}"}


async def _sync_meta_status(
    campaign: Campaign,
    account: AdAccount,
) -> dict[str, Any]:
    access_token = get_account_token(account)
    if not access_token:
        return {"synced": False, "status": "unknown", "detail": "No access token."}

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            res = await client.get(
                f"https://graph.facebook.com/v19.0/{campaign.external_id}",
                params={"fields": "id,name,status,effective_status", "access_token": access_token},
            )
            res.raise_for_status()
            data = res.json()
            return {
                "synced": True,
                "status": data.get("effective_status", data.get("status", "UNKNOWN")),
                "name": data.get("name"),
                "detail": f"Live status: {data.get('effective_status', 'UNKNOWN')}",
            }
    except Exception as exc:
        return {"synced": False, "status": "unknown", "detail": f"Error querying Meta Ads: {str(exc)[:200]}"}
