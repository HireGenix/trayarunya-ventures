"""Ads routes (M5): multi-platform ad accounts (Google / Meta / LinkedIn),
OAuth account connection, AI campaign generation, performance metrics, and an
agentic optimizer."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.ads_optimizer import optimize_campaign
from app.agents.ads_strategist import generate_campaign
from app.config import settings
from app.db import AsyncSessionLocal, get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    AdAccount,
    AdPlatform,
    BrandBrain,
    Campaign,
    CampaignStatus,
    Strategy,
)
from app.schemas import (
    AdAccountCreate,
    AdAccountOut,
    AdAccountUpdate,
    CampaignGenerateRequest,
    CampaignMetricsOut,
    CampaignOut,
    OAuthStartOut,
    PlatformOverview,
    QuickConnectRequest,
)
from app.services import ads_metrics, oauth
from app.services.ads_connectors import PLATFORM_LABELS, discover_google_accounts
from app.services.token_vault import (
    get_account_token,
    set_account_token,
    set_refresh,
)
from app.services.usage_guard import enforce_limit

router = APIRouter(prefix="/ads", tags=["ads"])

PLATFORMS = ("google_ads", "meta_ads", "linkedin_ads")


def _campaign_out(campaign: Campaign, platform: str) -> CampaignOut:
    out = CampaignOut.model_validate(campaign)
    out.platform = platform
    return out


async def _platform_for_account(db: AsyncSession, account_id: uuid.UUID) -> str:
    acct = await db.get(AdAccount, account_id)
    return acct.platform.value if acct else "google_ads"


# ---------------------------------------------------------------- providers


@router.get("/providers")
async def providers() -> dict:
    """Which ad platforms have live API credentials configured on this deployment.

    When a platform is live, connecting an account via OAuth lets the engine pull
    real performance data from the platform's reporting API. Platforms that are
    not configured can still be used to plan campaigns; performance stays empty
    until a live account is connected.
    """
    return {
        "providers": {p: settings.ads_platform_configured(p) for p in PLATFORMS},
        "labels": PLATFORM_LABELS,
    }


# ---------------------------------------------------------------- oauth connect


@router.post("/{platform}/connect", response_model=OAuthStartOut)
async def oauth_start(
    platform: str,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> OAuthStartOut:
    """Begin the OAuth flow to connect a real ad account for ``platform``.

    Returns an authorization URL the web app opens in a popup. The provider
    redirects back to ``/ads/{platform}/callback`` which stores the tokens.
    """
    if platform not in PLATFORMS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported ad platform")
    if not oauth.provider_configured(platform):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{PLATFORM_LABELS.get(platform, platform)} OAuth is not configured on this "
            "deployment. Set the platform's OAuth client id/secret to enable live connect.",
        )
    try:
        url, state = oauth.build_authorization_url(platform, str(ctx.workspace.id))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return OAuthStartOut(authorization_url=url, state=state)


@router.get("/{platform}/callback", response_class=HTMLResponse)
async def oauth_callback(
    platform: str,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> HTMLResponse:
    """OAuth redirect target — exchanges the code and connects the ad account."""

    def _page(title: str, body: str, status_code: int = 200) -> HTMLResponse:
        return HTMLResponse(
            "<html><body style='font-family:system-ui,sans-serif;padding:2.5rem;text-align:center'>"
            f"<h3>{title}</h3><p style='color:#555'>{body}</p>"
            "<script>setTimeout(()=>window.close(),1600)</script>"
            "</body></html>",
            status_code=status_code,
        )

    if platform not in PLATFORMS:
        return _page("Unsupported platform", platform, 400)
    if error:
        return _page("Authorization failed", error, 400)
    if not code or not state:
        return _page("Missing code/state", "The OAuth response was incomplete.", 400)
    state_data = oauth.pop_state(state)
    if not state_data:
        return _page("Invalid or expired state", "Please try connecting again.", 400)

    try:
        token = await oauth.exchange_code(platform, code, state_data)
    except Exception as exc:  # noqa: BLE001
        return _page("Token exchange failed", str(exc), 502)

    expires_in = token.get("expires_in")
    expires_at = None
    if isinstance(expires_in, (int, float)):
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

    workspace_id = uuid.UUID(state_data["workspace_id"])
    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(
                select(AdAccount).where(
                    AdAccount.workspace_id == workspace_id,
                    AdAccount.platform == AdPlatform(platform),
                )
            )
        ).scalars().first()
        account = existing or AdAccount(
            workspace_id=workspace_id,
            platform=AdPlatform(platform),
            name=f"{PLATFORM_LABELS.get(platform, platform)} Account",
        )
        account.connected = True
        set_account_token(account, token.get("access_token"))
        if token.get("refresh_token"):
            set_refresh(account, token.get("refresh_token"))
        account.meta = {
            **(account.meta or {}),
            "mode": "live",
            "scope": token.get("scope"),
            "token_expires_at": expires_at.isoformat() if expires_at else None,
        }

        # Discover the real account(s) this token can access so we know *which*
        # account was connected — and auto-detect Google Ad Grants (nonprofit)
        # accounts. The user confirms the selection/grant flag from the UI.
        if platform == "google_ads":
            try:
                discovered = await discover_google_accounts(token.get("access_token") or "")
            except Exception:  # noqa: BLE001
                discovered = []
            if discovered:
                primary = discovered[0]
                if not account.external_id:
                    account.external_id = primary["external_id"]
                if not account.name or account.name.endswith("Account"):
                    account.name = primary["name"]
                account.currency = primary.get("currency") or account.currency
                # Only auto-flag grant when detected and the user hasn't set it.
                if primary.get("is_grant_guess") and not account.is_grant:
                    account.is_grant = True
                account.meta = {
                    **(account.meta or {}),
                    "discovered": discovered,
                    "grant_detected": bool(primary.get("is_grant_guess")),
                    "grant_signals": primary.get("grant_signals", []),
                    "needs_confirmation": True,
                }

        if not existing:
            db.add(account)
        await db.commit()

    return _page(
        f"✅ {PLATFORM_LABELS.get(platform, platform)} connected",
        "You can close this window and return to the dashboard.",
    )


# ---------------------------------------------------------------- accounts


@router.get("/accounts", response_model=list[AdAccountOut])
async def list_accounts(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[AdAccountOut]:
    res = await db.execute(
        select(AdAccount).where(AdAccount.workspace_id == ctx.workspace.id)
    )
    return [AdAccountOut.model_validate(a) for a in res.scalars().all()]


@router.post("/accounts", response_model=AdAccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AdAccountCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AdAccountOut:
    try:
        platform = AdPlatform(data.platform)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported ad platform")
    account = AdAccount(
        workspace_id=ctx.workspace.id,
        platform=platform,
        name=data.name,
        external_id=data.external_id,
        is_grant=data.is_grant,
    )
    db.add(account)
    await db.flush()
    await db.commit()
    await db.refresh(account)
    return AdAccountOut.model_validate(account)


@router.post(
    "/accounts/quick-connect",
    response_model=AdAccountOut,
    status_code=status.HTTP_201_CREATED,
)
async def quick_connect(
    data: QuickConnectRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AdAccountOut:
    """One-click register: reuse an existing account for the platform or create one,
    then mark it connected. Use this to plan campaigns when you don't connect a live
    account via OAuth; performance data stays empty until a live account is linked."""
    try:
        platform = AdPlatform(data.platform)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported ad platform")

    existing = (
        await db.execute(
            select(AdAccount).where(
                AdAccount.workspace_id == ctx.workspace.id,
                AdAccount.platform == platform,
            )
        )
    ).scalars().first()

    live = settings.ads_platform_configured(data.platform)
    account = existing or AdAccount(
        workspace_id=ctx.workspace.id,
        platform=platform,
        name=data.name or f"{PLATFORM_LABELS.get(data.platform, data.platform)} Account",
        is_grant=data.is_grant,
    )
    account.connected = True
    account.meta = {**(account.meta or {}), "mode": "live" if live else "manual"}
    if not existing:
        db.add(account)
    await db.flush()
    await db.commit()
    await db.refresh(account)
    return AdAccountOut.model_validate(account)


@router.post("/accounts/{account_id}/connect", response_model=AdAccountOut)
async def connect_account(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AdAccountOut:
    account = await db.get(AdAccount, account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ad account not found")
    live = settings.ads_platform_configured(account.platform.value)
    account.connected = True
    account.meta = {**(account.meta or {}), "mode": "live" if live else "manual"}
    await db.flush()
    await db.commit()
    await db.refresh(account)
    return AdAccountOut.model_validate(account)


@router.post("/accounts/{account_id}/disconnect", response_model=AdAccountOut)
async def disconnect_account(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AdAccountOut:
    account = await db.get(AdAccount, account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ad account not found")
    account.connected = False
    await db.flush()
    await db.commit()
    await db.refresh(account)
    return AdAccountOut.model_validate(account)


@router.patch("/accounts/{account_id}", response_model=AdAccountOut)
async def update_account(
    account_id: uuid.UUID,
    data: AdAccountUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AdAccountOut:
    """Confirm a connected account: set the live customer id, display name and
    the Google Ad Grants (nonprofit) flag. Clears the ``needs_confirmation``
    marker so the dashboard stops prompting."""
    account = await db.get(AdAccount, account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ad account not found")
    if data.external_id is not None:
        account.external_id = data.external_id.strip() or None
        # Keep currency in sync with the chosen discovered customer.
        for cand in (account.meta or {}).get("discovered", []) or []:
            if cand.get("external_id") == account.external_id and cand.get("currency"):
                account.currency = cand["currency"]
                break
    if data.name is not None and data.name.strip():
        account.name = data.name.strip()
    if data.is_grant is not None:
        account.is_grant = data.is_grant
    account.meta = {**(account.meta or {}), "needs_confirmation": False}
    await db.flush()
    await db.commit()
    await db.refresh(account)
    return AdAccountOut.model_validate(account)


@router.post("/accounts/{account_id}/discover", response_model=AdAccountOut)
async def rediscover_account(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AdAccountOut:
    """Re-probe the connected Google token for accessible customers and refresh
    the Ad Grants detection. Useful after granting the app access to more
    accounts or after a billing change."""
    account = await db.get(AdAccount, account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ad account not found")
    if account.platform.value != "google_ads":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Discovery is only available for Google Ads accounts"
        )
    if not account.access_token:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Connect the account via OAuth before discovering"
        )
    discovered = await discover_google_accounts(get_account_token(account) or "")
    primary = discovered[0] if discovered else None
    account.meta = {
        **(account.meta or {}),
        "discovered": discovered,
        "grant_detected": bool(primary and primary.get("is_grant_guess")),
        "grant_signals": (primary or {}).get("grant_signals", []),
        "needs_confirmation": bool(discovered),
    }
    await db.flush()
    await db.commit()
    await db.refresh(account)
    return AdAccountOut.model_validate(account)


# ---------------------------------------------------------------- generate


@router.post(
    "/campaigns/generate", response_model=CampaignOut, status_code=status.HTTP_201_CREATED
)
async def generate(
    data: CampaignGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignOut:
    await enforce_limit(db, ctx.workspace.id, "ads")
    account = await db.get(AdAccount, data.ad_account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ad account not found")

    brand_row = (
        await db.execute(
            select(BrandBrain).where(BrandBrain.workspace_id == ctx.workspace.id)
        )
    ).scalar_one_or_none()
    brand = (
        {
            "value_prop": brand_row.value_prop,
            "audience": brand_row.audience,
            "keywords": brand_row.keywords,
        }
        if brand_row
        else None
    )
    strategy = None
    if data.strategy_id:
        srow = await db.get(Strategy, data.strategy_id)
        if srow and srow.workspace_id == ctx.workspace.id:
            strategy = {"positioning": srow.positioning, "funnel": srow.funnel}

    try:
        plan = await generate_campaign(
            platform=account.platform.value,
            objective=data.objective,
            product=data.product,
            is_grant=account.is_grant,
            daily_budget=data.daily_budget,
            audience=data.audience,
            locations=data.locations,
            brand=brand,
            strategy=strategy,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Campaign generation failed: {exc}")

    # Enforce Google Ad Grants policy server-side (don't just trust the LLM):
    # cap the daily budget at $329/day ($10k/mo) and restrict to eligible
    # campaign types (Search / Performance Max).
    GRANT_DAILY_CAP = 329.0
    if account.is_grant and account.platform.value == "google_ads":
        channel = str(plan.get("channel") or "Search")
        if channel.lower().replace(" ", "") not in ("search", "performancemax", "pmax"):
            channel = "Search"
        plan["channel"] = channel
        plan["bidding"] = plan.get("bidding") or "Maximize Conversions"
        plan["grant_policy"] = {
            "daily_budget_cap": GRANT_DAILY_CAP,
            "monthly_budget_cap": 10_000.0,
            "eligible_campaign_types": ["Search (RSA)", "Performance Max"],
            "bidding": "Maximize Conversions",
        }
        rec = plan.get("recommended_daily_budget")
        if isinstance(rec, (int, float)) and rec > GRANT_DAILY_CAP:
            plan["recommended_daily_budget"] = GRANT_DAILY_CAP

    resolved_budget = data.daily_budget or plan.get("recommended_daily_budget")
    if (
        account.is_grant
        and account.platform.value == "google_ads"
        and isinstance(resolved_budget, (int, float))
    ):
        resolved_budget = min(float(resolved_budget), GRANT_DAILY_CAP)

    campaign = Campaign(
        workspace_id=ctx.workspace.id,
        ad_account_id=account.id,
        name=plan.get("name", data.product)[:300],
        objective=data.objective,
        status=CampaignStatus.draft,
        daily_budget=resolved_budget,
        plan=plan,
        assets={
            "ad_groups": plan.get("ad_groups", []),
            "ad_sets": plan.get("ad_sets", []),
        },
    )
    db.add(campaign)
    await db.flush()
    # Pull an initial performance read (real data only; empty until a live
    # platform campaign is linked).
    try:
        await ads_metrics.sync_campaign_metrics(db, campaign, account.platform.value, days=30)
    except Exception:  # noqa: BLE001
        pass
    await db.commit()
    await db.refresh(campaign)
    return _campaign_out(campaign, account.platform.value)


# ---------------------------------------------------------------- list / get


@router.get("/campaigns", response_model=list[CampaignOut])
async def list_campaigns(
    platform: str | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[CampaignOut]:
    accounts = (
        await db.execute(
            select(AdAccount).where(AdAccount.workspace_id == ctx.workspace.id)
        )
    ).scalars().all()
    platform_by_account = {a.id: a.platform.value for a in accounts}

    res = await db.execute(
        select(Campaign)
        .where(Campaign.workspace_id == ctx.workspace.id)
        .order_by(Campaign.created_at.desc())
    )
    out: list[CampaignOut] = []
    for c in res.scalars().all():
        p = platform_by_account.get(c.ad_account_id, "google_ads")
        if platform and p != platform:
            continue
        out.append(_campaign_out(c, p))
    return out


@router.get("/campaigns/{campaign_id}", response_model=CampaignOut)
async def get_campaign(
    campaign_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignOut:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None or campaign.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    platform = await _platform_for_account(db, campaign.ad_account_id)
    return _campaign_out(campaign, platform)


@router.patch("/campaigns/{campaign_id}/status", response_model=CampaignOut)
async def update_status(
    campaign_id: uuid.UUID,
    new_status: str,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignOut:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None or campaign.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    try:
        campaign.status = CampaignStatus(new_status)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid status")
    await db.flush()
    await db.commit()
    await db.refresh(campaign)
    platform = await _platform_for_account(db, campaign.ad_account_id)
    return _campaign_out(campaign, platform)


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None or campaign.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    await ads_metrics.delete_campaign_metrics(db, ctx.workspace.id, campaign.id)
    await db.delete(campaign)
    await db.commit()


# ---------------------------------------------------------------- metrics


@router.get("/overview", response_model=PlatformOverview)
async def overview(
    platform: str = Query(default="google_ads"),
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> PlatformOverview:
    if platform not in PLATFORMS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported ad platform")

    accounts = (
        await db.execute(
            select(AdAccount).where(
                AdAccount.workspace_id == ctx.workspace.id,
                AdAccount.platform == AdPlatform(platform),
            )
        )
    ).scalars().all()
    account_ids = [a.id for a in accounts]

    campaigns: list[Campaign] = []
    if account_ids:
        campaigns = list(
            (
                await db.execute(
                    select(Campaign)
                    .where(
                        Campaign.workspace_id == ctx.workspace.id,
                        Campaign.ad_account_id.in_(account_ids),
                    )
                    .order_by(Campaign.created_at.desc())
                )
            ).scalars().all()
        )

    data = await ads_metrics.platform_overview(
        db, ctx.workspace.id, platform, campaigns, days=days
    )
    await db.commit()
    return PlatformOverview(
        connected=any(a.connected for a in accounts),
        live=settings.ads_platform_configured(platform),
        **data,
    )


@router.post("/campaigns/{campaign_id}/sync", response_model=CampaignMetricsOut)
async def sync_metrics(
    campaign_id: uuid.UUID,
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignMetricsOut:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None or campaign.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    platform = await _platform_for_account(db, campaign.ad_account_id)
    await ads_metrics.sync_campaign_metrics(db, campaign, platform, days=days)
    data = await ads_metrics.campaign_metrics(db, campaign, platform, days=days)
    await db.commit()
    return CampaignMetricsOut(**data)


@router.get("/campaigns/{campaign_id}/metrics", response_model=CampaignMetricsOut)
async def get_metrics(
    campaign_id: uuid.UUID,
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignMetricsOut:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None or campaign.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    platform = await _platform_for_account(db, campaign.ad_account_id)
    data = await ads_metrics.campaign_metrics(db, campaign, platform, days=days)
    await db.commit()
    return CampaignMetricsOut(**data)


# ---------------------------------------------------------------- optimizer


@router.post("/campaigns/{campaign_id}/optimize", response_model=CampaignOut)
async def optimize(
    campaign_id: uuid.UUID,
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CampaignOut:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None or campaign.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    platform = await _platform_for_account(db, campaign.ad_account_id)

    data = await ads_metrics.campaign_metrics(db, campaign, platform, days=days)
    recs = await optimize_campaign(
        platform=platform,
        campaign_name=campaign.name,
        objective=campaign.objective,
        plan=campaign.plan,
        kpis=data["kpis"],
        totals=data["totals"],
        days=days,
    )
    campaign.recommendations = recs
    await db.flush()
    await db.commit()
    await db.refresh(campaign)
    return _campaign_out(campaign, platform)
