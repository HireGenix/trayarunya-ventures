"""Social/publishing routes (M3-M4): OAuth connect + callback, account management,
manual token connect, scheduling, and publish-now."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import AsyncSessionLocal, get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    ContentItem,
    Schedule,
    ScheduleStatus,
    SocialAccount,
    SocialPlatform,
)
from app.schemas import (
    ManualConnectRequest,
    OAuthStartOut,
    PublishNowRequest,
    ScheduleCreate,
    ScheduleOut,
    SocialAccountOut,
)
from app.models import ContentStatus
from app.services import oauth
from app.services.token_vault import set_account_token, set_refresh
from app.services.publish_flow import (
    PUBLISHABLE_STATES,
    already_published,
    execute_publish,
    is_account_connected,
)
from pydantic import BaseModel

router = APIRouter(prefix="/social", tags=["social"])

SUPPORTED = {"linkedin", "x", "facebook", "youtube", "instagram"}


class LinkedInTargetRequest(BaseModel):
    """Select a LinkedIn posting target: org URN for a company page, or null for personal."""
    urn: str | None = None
    name: str | None = None


class ChannelStatus(BaseModel):
    platform: str
    connected: bool
    account_id: str | None = None
    display_name: str | None = None


@router.get("/accounts", response_model=list[SocialAccountOut])
async def list_accounts(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[SocialAccountOut]:
    res = await db.execute(
        select(SocialAccount)
        .where(SocialAccount.workspace_id == ctx.workspace.id)
        .order_by(SocialAccount.created_at.desc())
    )
    return [SocialAccountOut.model_validate(a) for a in res.scalars().all()]


@router.get("/providers")
async def providers() -> dict:
    """Which networks are configured for OAuth on this deployment."""
    return {p: oauth.provider_configured(p) for p in SUPPORTED}


@router.post("/{platform}/connect", response_model=OAuthStartOut)
async def connect(
    platform: str,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> OAuthStartOut:
    if platform not in SUPPORTED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported platform")
    try:
        url, state = oauth.build_authorization_url(platform, str(ctx.workspace.id))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return OAuthStartOut(authorization_url=url, state=state)


@router.post("/connect/manual", response_model=SocialAccountOut, status_code=status.HTTP_201_CREATED)
async def connect_manual(
    data: ManualConnectRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> SocialAccountOut:
    """Connect by pasting an access token (useful before full OAuth apps exist)."""
    try:
        platform = SocialPlatform(data.platform)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unsupported platform")
    account = SocialAccount(
        workspace_id=ctx.workspace.id,
        platform=platform,
        external_id=data.external_id,
        display_name=data.display_name or f"{data.platform} account",
        is_active=True,
    )
    set_account_token(account, data.access_token)
    db.add(account)
    await db.flush()
    await db.commit()
    await db.refresh(account)
    return SocialAccountOut.model_validate(account)


@router.get("/{platform}/callback", response_class=HTMLResponse)
async def oauth_callback(
    platform: str,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
) -> HTMLResponse:
    """OAuth redirect target. Exchanges the code and stores the account, then
    shows a small page that closes the popup."""
    if error:
        hint = ""
        if "scope" in (error or "").lower() or "scope" in (error_description or "").lower():
            hint = (
                "<p style='color:#475569;font-size:14px'>This usually means a requested "
                "permission isn't approved for your LinkedIn app. Company-page posting needs "
                "the <b>Community Management API</b> product approved, then set "
                "<code>LINKEDIN_ORG_POSTING=true</code>.</p>"
            )
        detail = error_description or error
        return HTMLResponse(
            "<html><body style='font-family:sans-serif;padding:2rem'>"
            f"<h3>Authorization failed</h3><p>{detail}</p>{hint}"
            "<p>You can close this window and try again.</p>"
            "<script>setTimeout(()=>window.close(),4000)</script>"
            "</body></html>",
            status_code=400,
        )
    if not code or not state:
        return HTMLResponse("<p>Missing code/state</p>", status_code=400)
    state_data = oauth.pop_state(state)
    if not state_data:
        return HTMLResponse("<p>Invalid or expired state</p>", status_code=400)

    try:
        token = await oauth.exchange_code(platform, code, state_data)
    except Exception as exc:  # noqa: BLE001
        return HTMLResponse(f"<p>Token exchange failed: {exc}</p>", status_code=502)

    expires_in = token.get("expires_in")
    expires_at = None
    if isinstance(expires_in, (int, float)):
        from datetime import timedelta

        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

    async with AsyncSessionLocal() as db:
        account = SocialAccount(
            workspace_id=uuid.UUID(state_data["workspace_id"]),
            platform=SocialPlatform(platform),
            token_expires_at=expires_at,
            scopes=(token.get("scope") or "").split() if token.get("scope") else None,
            display_name=f"{platform} account",
            is_active=True,
        )
        set_account_token(account, token.get("access_token"))
        set_refresh(account, token.get("refresh_token"))
        db.add(account)
        await db.commit()

    return HTMLResponse(
        "<html><body style='font-family:sans-serif;padding:2rem'>"
        f"<h3>✅ {platform.title()} connected</h3>"
        "<p>You can close this window and return to the dashboard.</p>"
        "<script>setTimeout(()=>window.close(),1500)</script>"
        "</body></html>"
    )


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def disconnect(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    account = await db.get(SocialAccount, account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    await db.delete(account)
    await db.commit()


# ---------------- LinkedIn company pages ----------------
@router.get("/accounts/{account_id}/linkedin/pages")
async def linkedin_pages(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List the LinkedIn company pages this connected account can administer."""
    account = await db.get(SocialAccount, account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    if account.platform != SocialPlatform.linkedin:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a LinkedIn account")
    from app.services.publisher import PublishError, list_linkedin_pages

    try:
        pages = await list_linkedin_pages(account)
    except PublishError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
    # The currently selected target (an org URN stored on external_id, else personal).
    selected = account.external_id if (account.external_id or "").startswith("urn:li:organization:") else None
    return {"pages": pages, "selected": selected}


@router.post("/accounts/{account_id}/linkedin/target", response_model=SocialAccountOut)
async def set_linkedin_target(
    account_id: uuid.UUID,
    body: LinkedInTargetRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> SocialAccountOut:
    """Choose where this LinkedIn account posts: a company page or the personal profile.

    Passing an organization URN routes posts to that page (publisher uses
    ``external_id`` as the author). Passing ``null`` resets to the personal profile.
    """
    account = await db.get(SocialAccount, account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    if account.platform != SocialPlatform.linkedin:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a LinkedIn account")

    urn = (body.urn or "").strip() or None
    if urn is not None and not urn.startswith("urn:li:organization:"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid organization URN")
    account.external_id = urn
    if urn is None:
        account.display_name = "LinkedIn (personal profile)"
    elif body.name:
        account.display_name = body.name.strip()
    await db.commit()
    await db.refresh(account)
    return SocialAccountOut.model_validate(account)


# ---------------- Scheduling ----------------
@router.get("/schedules", response_model=list[ScheduleOut])
async def list_schedules(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ScheduleOut]:
    res = await db.execute(
        select(Schedule)
        .where(Schedule.workspace_id == ctx.workspace.id)
        .order_by(Schedule.scheduled_at.asc())
    )
    return [ScheduleOut.model_validate(s) for s in res.scalars().all()]


@router.post("/schedules", response_model=ScheduleOut, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    data: ScheduleCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ScheduleOut:
    item = await db.get(ContentItem, data.content_item_id)
    if item is None or item.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Content item not found")
    account = await db.get(SocialAccount, data.social_account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Social account not found")
    if item.status not in PUBLISHABLE_STATES:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Approve this post before scheduling it.",
        )
    sched = Schedule(
        workspace_id=ctx.workspace.id,
        content_item_id=data.content_item_id,
        social_account_id=data.social_account_id,
        scheduled_at=data.scheduled_at,
        status=ScheduleStatus.pending,
    )
    db.add(sched)
    if item.status == ContentStatus.approved:
        item.status = ContentStatus.scheduled
    await db.flush()
    await db.commit()
    await db.refresh(sched)
    return ScheduleOut.model_validate(sched)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def cancel_schedule(
    schedule_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    sched = await db.get(Schedule, schedule_id)
    if sched is None or sched.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Schedule not found")
    await db.delete(sched)
    await db.commit()


@router.post("/publish", response_model=ScheduleOut)
async def publish_now(
    data: PublishNowRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ScheduleOut:
    item = await db.get(ContentItem, data.content_item_id)
    if item is None or item.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Content item not found")
    account = await db.get(SocialAccount, data.social_account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Social account not found")
    if item.status not in PUBLISHABLE_STATES:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Approve this post before publishing it.",
        )

    # Idempotency: if this exact post already went out to this account, return it
    # instead of double-posting.
    existing = await already_published(db, item, account)
    if existing is not None:
        return ScheduleOut.model_validate(existing)

    sched = Schedule(
        workspace_id=ctx.workspace.id,
        content_item_id=item.id,
        social_account_id=account.id,
        scheduled_at=datetime.now(timezone.utc),
        status=ScheduleStatus.publishing,
    )
    db.add(sched)
    await db.flush()

    await execute_publish(db, item, account, sched)
    await db.commit()
    await db.refresh(sched)
    return ScheduleOut.model_validate(sched)


# ---------------- Channel connection status ----------------
@router.get("/channels/status", response_model=list[ChannelStatus])
async def channel_status(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ChannelStatus]:
    """Return per-channel connection status for the workspace.

    Checks SocialAccount rows first, then falls back to the integrations
    catalog (provider ``meta`` covers facebook and instagram).
    """
    ALL_CHANNELS = ["instagram", "facebook", "linkedin", "x", "youtube", "tiktok"]
    res = await db.execute(
        select(SocialAccount)
        .where(
            SocialAccount.workspace_id == ctx.workspace.id,
            SocialAccount.is_active.is_(True),
        )
    )
    accs = res.scalars().all()
    acc_by_platform: dict[str, SocialAccount] = {}
    for a in accs:
        plat = a.platform.value if hasattr(a.platform, "value") else str(a.platform)
        if plat not in acc_by_platform:
            acc_by_platform[plat] = a

    # Pre-fetch whether a "meta" integration row exists in the catalog.
    from app.models import Integration as _Integration

    meta_row = (
        await db.execute(
            select(_Integration).where(
                _Integration.workspace_id == ctx.workspace.id,
                _Integration.provider == "meta",
                _Integration.status == "connected",
            )
        )
    ).scalar_one_or_none()

    _META_CHANNELS = {"facebook", "instagram"}

    out: list[ChannelStatus] = []
    for ch in ALL_CHANNELS:
        acc = acc_by_platform.get(ch)
        if acc and is_account_connected(acc):
            out.append(ChannelStatus(
                platform=ch,
                connected=True,
                account_id=str(acc.id),
                display_name=acc.display_name,
            ))
        elif ch in _META_CHANNELS and meta_row is not None:
            out.append(ChannelStatus(
                platform=ch,
                connected=True,
                display_name="Meta (catalog)",
            ))
        else:
            out.append(ChannelStatus(platform=ch, connected=False))
    return out


# ---------------- Post status sync ----------------
@router.get("/schedules/{schedule_id}/status")
async def post_status_sync(
    schedule_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the latest status for a scheduled/published post.

    When connected and published, fetches the real permalink from the platform
    and stores it. When not connected, returns the stored draft/scheduled state
    honestly.
    """
    sched = await db.get(Schedule, schedule_id)
    if sched is None or sched.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Schedule not found")

    account = await db.get(SocialAccount, sched.social_account_id)
    platform = "unknown"
    connected = False
    if account:
        platform = getattr(account.platform, "value", str(account.platform))
        connected = is_account_connected(account)

    result: dict = {
        "id": str(sched.id),
        "status": sched.status.value if hasattr(sched.status, "value") else str(sched.status),
        "external_post_id": sched.external_post_id,
        "permalink": sched.permalink,
        "error": sched.error,
        "platform": platform,
        "connected": connected,
    }

    # If published and connected, try to fetch real permalink if missing
    if (
        sched.status == ScheduleStatus.published
        and sched.external_post_id
        and connected
        and account
        and not sched.permalink
    ):
        from app.services.token_vault import get_account_token as _get_token
        token = _get_token(account)
        if token and platform == "facebook" and "_" in sched.external_post_id:
            parts = sched.external_post_id.split("_")
            sched.permalink = f"https://www.facebook.com/{parts[0]}/posts/{parts[1]}"
            result["permalink"] = sched.permalink
            await db.commit()
        elif token and platform == "instagram":
            import httpx
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    r = await client.get(
                        f"https://graph.facebook.com/v21.0/{sched.external_post_id}",
                        params={"fields": "permalink", "access_token": token},
                    )
                    if r.status_code < 300:
                        perm = r.json().get("permalink")
                        if perm:
                            sched.permalink = perm
                            result["permalink"] = perm
                            await db.commit()
            except Exception:  # noqa: BLE001
                pass

    return result
