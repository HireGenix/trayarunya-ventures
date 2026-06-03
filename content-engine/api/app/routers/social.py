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
from app.services import oauth
from app.services.publisher import PublishError, publish

router = APIRouter(prefix="/social", tags=["social"])

SUPPORTED = {"linkedin", "x", "facebook", "youtube"}


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
        access_token=data.access_token,
        is_active=True,
    )
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
) -> HTMLResponse:
    """OAuth redirect target. Exchanges the code and stores the account, then
    shows a small page that closes the popup."""
    if error:
        return HTMLResponse(f"<p>Authorization failed: {error}</p>", status_code=400)
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
            access_token=token.get("access_token"),
            refresh_token=token.get("refresh_token"),
            token_expires_at=expires_at,
            scopes=(token.get("scope") or "").split() if token.get("scope") else None,
            display_name=f"{platform} account",
            is_active=True,
        )
        db.add(account)
        await db.commit()

    return HTMLResponse(
        "<html><body style='font-family:sans-serif;padding:2rem'>"
        f"<h3>✅ {platform.title()} connected</h3>"
        "<p>You can close this window and return to the dashboard.</p>"
        "<script>setTimeout(()=>window.close(),1500)</script>"
        "</body></html>"
    )


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
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
    sched = Schedule(
        workspace_id=ctx.workspace.id,
        content_item_id=data.content_item_id,
        social_account_id=data.social_account_id,
        scheduled_at=data.scheduled_at,
        status=ScheduleStatus.pending,
    )
    db.add(sched)
    await db.flush()
    await db.commit()
    await db.refresh(sched)
    return ScheduleOut.model_validate(sched)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
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

    sched = Schedule(
        workspace_id=ctx.workspace.id,
        content_item_id=item.id,
        social_account_id=account.id,
        scheduled_at=datetime.now(timezone.utc),
        status=ScheduleStatus.publishing,
    )
    db.add(sched)
    await db.flush()

    # Compose the outgoing post: prefer the crafted caption, then append hashtags.
    variants = item.variants or {}
    text = variants.get("caption") or item.body
    if account.platform == SocialPlatform.x and variants.get("x"):
        text = variants.get("x")
    tags = variants.get("hashtags")
    if isinstance(tags, list) and tags:
        tag_line = " ".join(t if str(t).startswith("#") else f"#{t}" for t in tags)
        if tag_line and tag_line not in text:
            text = f"{text}\n\n{tag_line}"
    try:
        external_id = await publish(account, text)
        from app.models import ContentStatus

        sched.status = ScheduleStatus.published
        sched.external_post_id = external_id
        item.status = ContentStatus.published
    except PublishError as exc:
        sched.status = ScheduleStatus.failed
        sched.error = str(exc)[:1000]
    await db.flush()
    await db.commit()
    await db.refresh(sched)
    return ScheduleOut.model_validate(sched)
