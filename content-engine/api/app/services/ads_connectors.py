"""Ad-platform connectors for Google, Meta and LinkedIn Ads.

Each connector exposes the same async interface so the rest of the app can stay
platform-agnostic::

    connector = get_connector("google_ads")
    rows = await connector.fetch_metrics(campaign, account, days=30)

These connectors talk to the **live** platform reporting APIs using the OAuth
access token stored on the campaign's ad account plus the deployment-level
credentials in :class:`app.config.Settings`. There is no simulated / mock data:
when a campaign has no real platform campaign id (``external_id``) or the
platform credentials are missing, ``fetch_metrics`` returns an empty list and the
dashboard renders honest "no performance data yet" empty states.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import httpx

from app.config import settings
from app.models import AdAccount, Campaign

PLATFORM_LABELS = {
    "google_ads": "Google Ads",
    "meta_ads": "Meta Ads",
    "linkedin_ads": "LinkedIn Ads",
}

# Per-platform performance baselines (industry-typical ranges). These are *not*
# used to fabricate metrics — they remain available as sane priors for the
# optimizer's benchmark comparisons.
PLATFORM_BASELINES: dict[str, dict[str, float]] = {
    "google_ads": {"ctr": 0.052, "cpc": 2.4, "cvr": 0.061, "eng_rate": 0.0, "default_budget": 60.0},
    "meta_ads": {"ctr": 0.018, "cpc": 1.1, "cvr": 0.034, "eng_rate": 0.022, "default_budget": 40.0},
    "linkedin_ads": {"ctr": 0.0085, "cpc": 7.8, "cvr": 0.072, "eng_rate": 0.012, "default_budget": 80.0},
}

_HTTP_TIMEOUT = 30.0


@dataclass
class MetricRow:
    metric_date: date
    impressions: int
    clicks: int
    engagements: int
    conversions: int
    spend: float


class BaseAdsConnector:
    platform: str = ""

    @property
    def configured(self) -> bool:
        """Whether this deployment has the platform's OAuth app configured."""
        return settings.ads_platform_configured(self.platform)

    async def fetch_metrics(
        self, campaign: Campaign, account: AdAccount | None = None, days: int = 30
    ) -> list[MetricRow]:
        """Fetch real daily metrics from the live platform reporting API.

        Returns an empty list (never fabricated data) when the campaign is not
        linked to a real platform campaign or credentials are unavailable.
        """
        access_token = getattr(account, "access_token", None) if account else None
        external_id = getattr(campaign, "external_id", None)
        if not access_token or not external_id:
            return []
        try:
            return await self._fetch_live(
                campaign=campaign,
                account=account,
                access_token=str(access_token),
                external_id=str(external_id),
                days=days,
            )
        except Exception:  # noqa: BLE001 — a reporting outage must never break the UI
            return []

    async def _fetch_live(
        self,
        *,
        campaign: Campaign,
        account: AdAccount,
        access_token: str,
        external_id: str,
        days: int,
    ) -> list[MetricRow]:
        raise NotImplementedError


class GoogleAdsConnector(BaseAdsConnector):
    platform = "google_ads"

    async def _fetch_live(self, *, campaign, account, access_token, external_id, days):
        developer_token = settings.google_ads_developer_token
        customer_id: Any = (
            getattr(account, "external_id", None) or settings.google_ads_login_customer_id
        )
        if not developer_token or not customer_id:
            return []
        customer_id = str(customer_id).replace("-", "")

        since = (date.today() - timedelta(days=days - 1)).isoformat()
        until = date.today().isoformat()
        query = (
            "SELECT segments.date, metrics.impressions, metrics.clicks, "
            "metrics.conversions, metrics.cost_micros, metrics.interactions "
            "FROM campaign "
            f"WHERE campaign.id = {external_id} "
            f"AND segments.date BETWEEN '{since}' AND '{until}'"
        )
        headers = {
            "Authorization": f"Bearer {access_token}",
            "developer-token": developer_token,
            "Content-Type": "application/json",
        }
        login_cid = settings.google_ads_login_customer_id
        if login_cid:
            headers["login-customer-id"] = str(login_cid).replace("-", "")

        url = f"https://googleads.googleapis.com/v17/customers/{customer_id}/googleAds:searchStream"
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            res = await client.post(url, headers=headers, json={"query": query})
        res.raise_for_status()
        payload = res.json()

        rows: list[MetricRow] = []
        batches = payload if isinstance(payload, list) else [payload]
        for batch in batches:
            for item in batch.get("results", []):
                segs = item.get("segments", {})
                m = item.get("metrics", {})
                d = segs.get("date")
                if not d:
                    continue
                clicks = int(m.get("clicks", 0) or 0)
                interactions = int(m.get("interactions", 0) or 0)
                cost_micros = int(m.get("costMicros", m.get("cost_micros", 0)) or 0)
                rows.append(
                    MetricRow(
                        metric_date=date.fromisoformat(d),
                        impressions=int(m.get("impressions", 0) or 0),
                        clicks=clicks,
                        engagements=max(0, interactions - clicks),
                        conversions=int(float(m.get("conversions", 0) or 0)),
                        spend=round(cost_micros / 1_000_000, 2),
                    )
                )
        return rows


class MetaAdsConnector(BaseAdsConnector):
    platform = "meta_ads"

    async def _fetch_live(self, *, campaign, account, access_token, external_id, days):
        since = (date.today() - timedelta(days=days - 1)).isoformat()
        until = date.today().isoformat()
        params = {
            "level": "campaign",
            "time_increment": 1,
            "time_range": f'{{"since":"{since}","until":"{until}"}}',
            "fields": "impressions,clicks,spend,actions,inline_post_engagement",
            "access_token": access_token,
        }
        url = f"https://graph.facebook.com/v19.0/{external_id}/insights"
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            res = await client.get(url, params=params)
        res.raise_for_status()
        payload = res.json()

        conversion_actions = {
            "offsite_conversion.fb_pixel_purchase",
            "lead",
            "purchase",
            "complete_registration",
            "onsite_conversion.lead_grouped",
        }
        rows: list[MetricRow] = []
        for item in payload.get("data", []):
            d = item.get("date_start")
            if not d:
                continue
            conversions = 0
            for action in item.get("actions", []) or []:
                if action.get("action_type") in conversion_actions:
                    conversions += int(float(action.get("value", 0) or 0))
            rows.append(
                MetricRow(
                    metric_date=date.fromisoformat(d),
                    impressions=int(item.get("impressions", 0) or 0),
                    clicks=int(item.get("clicks", 0) or 0),
                    engagements=int(item.get("inline_post_engagement", 0) or 0),
                    conversions=conversions,
                    spend=round(float(item.get("spend", 0) or 0), 2),
                )
            )
        return rows


class LinkedInAdsConnector(BaseAdsConnector):
    platform = "linkedin_ads"

    async def _fetch_live(self, *, campaign, account, access_token, external_id, days):
        start = date.today() - timedelta(days=days - 1)
        end = date.today()
        params = {
            "q": "analytics",
            "pivot": "CAMPAIGN",
            "timeGranularity": "DAILY",
            "campaigns[0]": f"urn:li:sponsoredCampaign:{external_id}",
            "dateRange.start.day": start.day,
            "dateRange.start.month": start.month,
            "dateRange.start.year": start.year,
            "dateRange.end.day": end.day,
            "dateRange.end.month": end.month,
            "dateRange.end.year": end.year,
            "fields": (
                "dateRange,impressions,clicks,costInLocalCurrency,"
                "externalWebsiteConversions,likes,comments,shares"
            ),
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "LinkedIn-Version": "202401",
            "X-Restli-Protocol-Version": "2.0.0",
        }
        url = "https://api.linkedin.com/rest/adAnalytics"
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            res = await client.get(url, params=params, headers=headers)
        res.raise_for_status()
        payload = res.json()

        rows: list[MetricRow] = []
        for item in payload.get("elements", []):
            dr = (item.get("dateRange") or {}).get("start") or {}
            try:
                d = date(int(dr["year"]), int(dr["month"]), int(dr["day"]))
            except (KeyError, ValueError, TypeError):
                continue
            engagements = (
                int(item.get("likes", 0) or 0)
                + int(item.get("comments", 0) or 0)
                + int(item.get("shares", 0) or 0)
            )
            rows.append(
                MetricRow(
                    metric_date=d,
                    impressions=int(item.get("impressions", 0) or 0),
                    clicks=int(item.get("clicks", 0) or 0),
                    engagements=engagements,
                    conversions=int(float(item.get("externalWebsiteConversions", 0) or 0)),
                    spend=round(float(item.get("costInLocalCurrency", 0) or 0), 2),
                )
            )
        return rows


_CONNECTORS: dict[str, BaseAdsConnector] = {
    "google_ads": GoogleAdsConnector(),
    "meta_ads": MetaAdsConnector(),
    "linkedin_ads": LinkedInAdsConnector(),
}


def get_connector(platform: str) -> BaseAdsConnector:
    return _CONNECTORS.get(platform, _CONNECTORS["google_ads"])


def platform_live(platform: str) -> bool:
    return settings.ads_platform_configured(platform)
