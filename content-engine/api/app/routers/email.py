"""Email Marketing Engine API — lists, subscribers, campaigns, sequences,
sends and AI drafting. All endpoints are workspace-scoped.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models.email import EmailSendLog
from app.services import email as svc
from app.agents import email_agent as agent
from app.services.automation import emit_event
from app.services.email_compiler import compile_blocks
from app.services.email_segment_engine import preview_segment
from app.services.email_tracking import tracking_base_url

router = APIRouter(prefix="/email", tags=["email"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class ListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str | None = None
    created_at: datetime


class ListCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


class SubscriberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    list_id: uuid.UUID
    email: str
    name: str | None = None
    status: str
    tags: list | None = None
    attributes: dict | None = None
    created_at: datetime


class SubscriberCreateIn(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    name: str | None = Field(default=None, max_length=200)
    tags: list[str] | None = None
    attributes: dict | None = None


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    list_id: uuid.UUID | None = None
    segment_id: uuid.UUID | None = None
    name: str
    subject: str
    preheader: str | None = None
    from_name: str | None = None
    body_html: str | None = None
    body_blocks: dict | None = None
    status: str
    scheduled_at: datetime | None = None
    sent_at: datetime | None = None
    stats: dict | None = None
    ab_test: dict | None = None
    created_at: datetime


class CampaignCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    subject: str = Field(default="", max_length=500)
    preheader: str | None = Field(default=None, max_length=500)
    from_name: str | None = Field(default=None, max_length=200)
    body_html: str | None = None
    body_blocks: dict | None = None
    list_id: uuid.UUID | None = None
    segment_id: uuid.UUID | None = None
    scheduled_at: datetime | None = None
    ab_test: dict | None = None


class CampaignUpdateIn(BaseModel):
    name: str | None = None
    subject: str | None = None
    preheader: str | None = None
    from_name: str | None = None
    body_html: str | None = None
    body_blocks: dict | None = None
    list_id: uuid.UUID | None = None
    segment_id: uuid.UUID | None = None
    scheduled_at: datetime | None = None
    ab_test: dict | None = None


class EnrollIn(BaseModel):
    subscriber_ids: list[uuid.UUID]


class EnrollmentProgressOut(BaseModel):
    total: int
    enrolled: int
    completed: int
    cancelled: int


class ABResultsOut(BaseModel):
    enabled: bool = False
    variants: list[dict] = []
    decided_variant: str | None = None
    holdout_pct: int = 0
    winner_metric: str = "opens"
    variant_stats: list[dict] = []


class GenerateIn(BaseModel):
    brief: str = Field(min_length=1, max_length=4000)
    list_id: uuid.UUID | None = None


class SendOut(BaseModel):
    campaign_id: uuid.UUID
    status: str
    queued: int
    provider: str


class SequenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    list_id: uuid.UUID | None = None
    name: str
    trigger: str
    steps: list | None = None
    is_active: bool
    autonomy: str
    created_at: datetime


class SequenceStep(BaseModel):
    order: int = 1
    delay_hours: int = 0
    subject: str = ""
    template: str = ""


class SequenceCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    trigger: str = Field(default="subscribe", max_length=80)
    steps: list[SequenceStep] = Field(default_factory=list)
    list_id: uuid.UUID | None = None
    is_active: bool = False
    autonomy: str = Field(default="suggest")


# --------------------------------------------------------------------------- #
# Lists
# --------------------------------------------------------------------------- #
@router.get("/lists", response_model=list[ListOut])
async def get_lists(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_lists(db, ctx.workspace.id)


@router.post("/lists", response_model=ListOut, status_code=status.HTTP_201_CREATED)
async def post_list(
    body: ListCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.create_list(
        db, ctx.workspace.id, name=body.name, description=body.description
    )
    await db.commit()
    await db.refresh(obj)
    return obj


# --------------------------------------------------------------------------- #
# Subscribers
# --------------------------------------------------------------------------- #
@router.get("/lists/{list_id}/subscribers", response_model=list[SubscriberOut])
async def get_subscribers(
    list_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lst = await svc.get_list(db, ctx.workspace.id, list_id)
    if lst is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "List not found")
    return await svc.list_subscribers(db, ctx.workspace.id, list_id)


@router.post(
    "/lists/{list_id}/subscribers",
    response_model=SubscriberOut,
    status_code=status.HTTP_201_CREATED,
)
async def post_subscriber(
    list_id: uuid.UUID,
    body: SubscriberCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lst = await svc.get_list(db, ctx.workspace.id, list_id)
    if lst is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "List not found")
    sub = await svc.add_subscriber(
        db,
        ctx.workspace.id,
        list_id,
        email=body.email,
        name=body.name,
        tags=body.tags,
        attributes=body.attributes,
    )
    await emit_event(
        db,
        ctx.workspace.id,
        "email.subscriber.added",
        {"subscriber_id": str(sub.id), "list_id": str(list_id), "email": sub.email},
    )
    await db.commit()
    await db.refresh(sub)
    return sub


# --------------------------------------------------------------------------- #
# Campaigns
# --------------------------------------------------------------------------- #
@router.get("/campaigns", response_model=list[CampaignOut])
async def get_campaigns(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_campaigns(db, ctx.workspace.id)


@router.post(
    "/campaigns", response_model=CampaignOut, status_code=status.HTTP_201_CREATED
)
async def post_campaign(
    body: CampaignCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.create_campaign(
        db,
        ctx.workspace.id,
        name=body.name,
        subject=body.subject,
        preheader=body.preheader,
        from_name=body.from_name,
        body_html=body.body_html,
        body_blocks=body.body_blocks,
        list_id=body.list_id,
        segment_id=body.segment_id,
        scheduled_at=body.scheduled_at,
        ab_test=body.ab_test,
    )
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/campaigns/{campaign_id}", response_model=CampaignOut)
async def get_campaign(
    campaign_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_campaign(db, ctx.workspace.id, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    # Refresh live stats from send logs.
    obj.stats = await svc.campaign_stats(db, ctx.workspace.id, campaign_id)
    return obj


@router.patch("/campaigns/{campaign_id}", response_model=CampaignOut)
async def patch_campaign(
    campaign_id: uuid.UUID,
    body: CampaignUpdateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_campaign(db, ctx.workspace.id, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, val)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/campaigns/{campaign_id}/ab-results", response_model=ABResultsOut)
async def get_ab_results(
    campaign_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_campaign(db, ctx.workspace.id, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    ab = obj.ab_test if isinstance(obj.ab_test, dict) else {}
    if not ab.get("enabled"):
        return ABResultsOut()

    # Compute per-variant stats from real send logs
    from sqlalchemy import func, select as sa_select
    from app.models.email import EmailSendLog

    variant_stats = []
    for v in ab.get("variants", []):
        key = v.get("key", "")
        res = await db.execute(
            sa_select(
                func.count(EmailSendLog.id).label("sent"),
                func.count(EmailSendLog.opened_at).label("opens"),
                func.count(EmailSendLog.clicked_at).label("clicks"),
            ).where(
                EmailSendLog.campaign_id == campaign_id,
                EmailSendLog.variant_key == key,
            )
        )
        row = res.one()
        sent = row.sent or 0
        opens = row.opens or 0
        clicks = row.clicks or 0
        variant_stats.append({
            "key": key,
            "subject": v.get("subject", ""),
            "sent": sent,
            "opens": opens,
            "clicks": clicks,
            "open_rate": round((opens / sent) * 100, 1) if sent else 0.0,
            "click_rate": round((clicks / sent) * 100, 1) if sent else 0.0,
        })

    return ABResultsOut(
        enabled=True,
        variants=ab.get("variants", []),
        decided_variant=ab.get("decided_variant"),
        holdout_pct=ab.get("holdout_pct", 0),
        winner_metric=ab.get("winner_metric", "opens"),
        variant_stats=variant_stats,
    )


@router.post("/campaigns/{campaign_id}/send", response_model=SendOut)
async def send_campaign(
    campaign_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_campaign(db, ctx.workspace.id, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    if obj.list_id is None and obj.segment_id is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Campaign has no list or segment"
        )

    from app.services.email_worker import schedule_send_now

    await schedule_send_now(db, obj)

    acs = getattr(settings, "acs_connection_string", None)
    provider = "acs" if acs else "none"

    await emit_event(
        db,
        ctx.workspace.id,
        "email.campaign.sent",
        {
            "campaign_id": str(obj.id),
            "queued": 0,
            "provider": provider,
            "status": "scheduled",
        },
    )
    await db.commit()
    return SendOut(campaign_id=obj.id, status="scheduled", queued=0, provider=provider)


@router.post("/campaigns/generate")
async def generate_campaign(
    body: GenerateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """AI-draft a campaign (subject A/B variants, preheader, body) from a brief."""
    return await agent.draft_campaign(db, ctx.workspace.id, body.brief, body.list_id)


@router.post("/campaigns/optimize-send-time")
async def optimize_send_time(
    list_id: uuid.UUID | None = None,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Recommend the best send hour from real open telemetry."""
    return await agent.optimize_send_time(db, ctx.workspace.id, list_id)


# --------------------------------------------------------------------------- #
# Sequences
# --------------------------------------------------------------------------- #
@router.get("/sequences", response_model=list[SequenceOut])
async def get_sequences(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_sequences(db, ctx.workspace.id)


@router.post(
    "/sequences", response_model=SequenceOut, status_code=status.HTTP_201_CREATED
)
async def post_sequence(
    body: SequenceCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    autonomy = body.autonomy if body.autonomy in ("suggest", "approve", "auto") else "suggest"
    obj = await svc.create_sequence(
        db,
        ctx.workspace.id,
        name=body.name,
        trigger=body.trigger,
        steps=[s.model_dump() for s in body.steps],
        list_id=body.list_id,
        is_active=body.is_active,
        autonomy=autonomy,
    )
    await db.commit()
    await db.refresh(obj)
    return obj


@router.post("/sequences/run")
async def run_sequences(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Run one autonomy cycle: surface sequences due to fire."""
    return await agent.run_cycle(db, ctx.workspace.id)


@router.post("/sequences/{sequence_id}/enroll")
async def enroll_into_sequence(
    sequence_id: uuid.UUID,
    body: EnrollIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    from app.services.email_worker import enroll_subscribers
    count = await enroll_subscribers(db, ctx.workspace.id, sequence_id, body.subscriber_ids)
    await db.commit()
    return {"enrolled": count, "sequence_id": str(sequence_id)}


@router.get("/sequences/{sequence_id}/progress", response_model=EnrollmentProgressOut)
async def sequence_progress(
    sequence_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    from app.services.email_worker import enrollment_progress
    return await enrollment_progress(db, ctx.workspace.id, sequence_id)


# --------------------------------------------------------------------------- #
# Overview
# --------------------------------------------------------------------------- #
@router.get("/overview")
async def get_overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.overview(db, ctx.workspace.id)


# --------------------------------------------------------------------------- #
# Templates
# --------------------------------------------------------------------------- #
class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID | None = None
    name: str
    subject: str = ""
    preheader: str | None = None
    body_blocks: list | None = None
    thumbnail: str | None = None
    description: str | None = None
    category: str | None = None
    is_starter: bool = False
    created_at: datetime | None = None


class TemplateCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    subject: str = Field(default="", max_length=500)
    preheader: str | None = Field(default=None, max_length=500)
    body_blocks: list | None = None
    description: str | None = Field(default=None, max_length=2000)
    category: str | None = Field(default=None, max_length=80)
    thumbnail: str | None = None


class TemplateUpdateIn(BaseModel):
    name: str | None = None
    subject: str | None = None
    preheader: str | None = None
    body_blocks: list | None = None
    description: str | None = None
    category: str | None = None
    thumbnail: str | None = None


def _starter_templates() -> list[dict]:
    """Built-in starter templates surfaced even when the DB has none."""
    templates = [
        {
            "id": None,
            "name": "Welcome Email",
            "category": "onboarding",
            "subject": "Welcome to {{company_name|our community}}!",
            "preheader": "We're glad you're here.",
            "is_starter": True,
            "description": "Greet new subscribers and point them to a first action.",
            "thumbnail": None,
            "created_at": None,
            "body_blocks": [
                {"type": "heading", "level": 1, "text": "Welcome!", "align": "left"},
                {
                    "type": "text",
                    "content": "Hi {{first_name|there}}, thanks for joining "
                    "{{company_name|us}}. We're excited to have you on board.",
                },
                {
                    "type": "button",
                    "text": "Get Started",
                    "url": "https://example.com/start",
                    "align": "left",
                },
            ],
        },
        {
            "id": None,
            "name": "Newsletter",
            "category": "newsletter",
            "subject": "This week's update",
            "preheader": "The latest news and highlights.",
            "is_starter": True,
            "description": "A clean weekly digest layout.",
            "thumbnail": None,
            "created_at": None,
            "body_blocks": [
                {"type": "heading", "level": 2, "text": "This Week's Update"},
                {
                    "type": "text",
                    "content": "Here's what's new since we last spoke.",
                },
                {"type": "divider"},
                {
                    "type": "text",
                    "content": "Catch up on the stories our team is reading.",
                },
                {
                    "type": "button",
                    "text": "Read More",
                    "url": "https://example.com/blog",
                },
            ],
        },
        {
            "id": None,
            "name": "Promotional",
            "category": "promotion",
            "subject": "Special offer just for you",
            "preheader": "A limited-time deal you won't want to miss.",
            "is_starter": True,
            "description": "Drive sales with a bold, image-led promo.",
            "thumbnail": None,
            "created_at": None,
            "body_blocks": [
                {
                    "type": "image",
                    "src": "https://via.placeholder.com/600x240?text=Your+Offer",
                    "alt": "Promotional banner",
                },
                {"type": "heading", "level": 1, "text": "Special offer just for you"},
                {
                    "type": "text",
                    "content": "For a limited time, enjoy an exclusive discount "
                    "on your next purchase.",
                },
                {
                    "type": "button",
                    "text": "Shop Now",
                    "url": "https://example.com/shop",
                },
            ],
        },
        {
            "id": None,
            "name": "Re-engagement",
            "category": "retention",
            "subject": "We miss you, {{first_name|friend}}!",
            "preheader": "Come back and see what's new.",
            "is_starter": True,
            "description": "Win back inactive subscribers.",
            "thumbnail": None,
            "created_at": None,
            "body_blocks": [
                {
                    "type": "heading",
                    "level": 1,
                    "text": "We miss you, {{first_name|friend}}!",
                },
                {
                    "type": "text",
                    "content": "It's been a while. We've added new things we think "
                    "you'll love.",
                },
                {
                    "type": "button",
                    "text": "Come Back",
                    "url": "https://example.com/welcome-back",
                },
            ],
        },
    ]
    # Assign deterministic ids so the listing and the /use endpoint agree.
    for t in templates:
        t["id"] = uuid.uuid5(uuid.NAMESPACE_URL, f"email-starter:{t['name']}")
    return templates


@router.get("/templates", response_model=list[TemplateOut])
async def get_templates(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    rows = await svc.list_templates(db, ctx.workspace.id)
    out: list[TemplateOut] = [TemplateOut.model_validate(r) for r in rows]
    out.extend(TemplateOut.model_validate(t) for t in _starter_templates())
    return out


@router.post(
    "/templates", response_model=TemplateOut, status_code=status.HTTP_201_CREATED
)
async def post_template(
    body: TemplateCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.create_template(
        db,
        ctx.workspace.id,
        name=body.name,
        subject=body.subject,
        preheader=body.preheader,
        body_blocks=body.body_blocks,
        description=body.description,
        category=body.category,
        thumbnail=body.thumbnail,
    )
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/templates/{template_id}", response_model=TemplateOut)
async def put_template(
    template_id: uuid.UUID,
    body: TemplateUpdateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_template(db, ctx.workspace.id, template_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    await svc.update_template(db, obj, **body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_template(
    template_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_template(db, ctx.workspace.id, template_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    await svc.delete_template(db, obj)
    await db.commit()


@router.post("/templates/{template_id}/use", response_model=CampaignOut)
async def use_template(
    template_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Clone a template (DB or built-in starter) into a new campaign draft."""
    name = subject = preheader = None
    blocks: list | None = None

    obj = await svc.get_template(db, ctx.workspace.id, template_id)
    if obj is not None:
        name, subject, preheader = obj.name, obj.subject, obj.preheader
        blocks = obj.body_blocks if isinstance(obj.body_blocks, list) else []
    else:
        # Allow cloning a built-in starter referenced by a deterministic UUID5.
        for t in _starter_templates():
            sid = uuid.uuid5(uuid.NAMESPACE_URL, f"email-starter:{t['name']}")
            if sid == template_id:
                name, subject, preheader = t["name"], t["subject"], t["preheader"]
                blocks = t["body_blocks"]
                break
    if name is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")

    campaign = await svc.create_campaign(
        db,
        ctx.workspace.id,
        name=name,
        subject=subject or "",
        preheader=preheader,
        body_blocks={"blocks": blocks or []},
    )
    await db.commit()
    await db.refresh(campaign)
    return campaign


# --------------------------------------------------------------------------- #
# Segments
# --------------------------------------------------------------------------- #
class SegmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    list_id: uuid.UUID | None = None
    name: str
    rules: dict | None = None
    created_at: datetime


class SegmentCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    rules: dict | None = None
    list_id: uuid.UUID | None = None


class SegmentUpdateIn(BaseModel):
    name: str | None = None
    rules: dict | None = None
    list_id: uuid.UUID | None = None


@router.get("/segments", response_model=list[SegmentOut])
async def get_segments(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_segments(db, ctx.workspace.id)


@router.post(
    "/segments", response_model=SegmentOut, status_code=status.HTTP_201_CREATED
)
async def post_segment(
    body: SegmentCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.create_segment(
        db, ctx.workspace.id, name=body.name, rules=body.rules, list_id=body.list_id
    )
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/segments/{segment_id}", response_model=SegmentOut)
async def put_segment(
    segment_id: uuid.UUID,
    body: SegmentUpdateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_segment(db, ctx.workspace.id, segment_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Segment not found")
    await svc.update_segment(db, obj, **body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/segments/{segment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_segment(
    segment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_segment(db, ctx.workspace.id, segment_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Segment not found")
    await svc.delete_segment(db, obj)
    await db.commit()


@router.get("/segments/{segment_id}/preview")
async def get_segment_preview(
    segment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_segment(db, ctx.workspace.id, segment_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Segment not found")
    return await preview_segment(db, ctx.workspace.id, segment_id)


# --------------------------------------------------------------------------- #
# Campaign render + analytics
# --------------------------------------------------------------------------- #
def _campaign_block_list(body_blocks) -> list:
    """Normalise a campaign's body_blocks into a flat list of blocks."""
    if isinstance(body_blocks, list):
        return body_blocks
    if isinstance(body_blocks, dict):
        blocks = body_blocks.get("blocks")
        if isinstance(blocks, list):
            return blocks
    return []


@router.post("/campaigns/{campaign_id}/render")
async def render_campaign(
    campaign_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_campaign(db, ctx.workspace.id, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    blocks = _campaign_block_list(obj.body_blocks)
    brand = None
    if isinstance(obj.body_blocks, dict):
        brand = obj.body_blocks.get("brand")
    html = compile_blocks(blocks, brand)
    return {"html": html}


@router.get("/campaigns/{campaign_id}/analytics")
async def get_campaign_analytics(
    campaign_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_campaign(db, ctx.workspace.id, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return await svc.campaign_analytics(db, ctx.workspace.id, campaign_id)


# --------------------------------------------------------------------------- #
# List management
# --------------------------------------------------------------------------- #
class ListUpdateIn(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


@router.patch("/lists/{list_id}", response_model=ListOut)
async def patch_list(
    list_id: uuid.UUID,
    body: ListUpdateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lst = await svc.get_list(db, ctx.workspace.id, list_id)
    if lst is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "List not found")
    await svc.update_list(db, lst, **body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(lst)
    return lst


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_list(
    list_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lst = await svc.get_list(db, ctx.workspace.id, list_id)
    if lst is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "List not found")
    await svc.delete_list(db, lst)
    await db.commit()


# --------------------------------------------------------------------------- #
# Subscriber management
# --------------------------------------------------------------------------- #
class SubscriberUpdateIn(BaseModel):
    name: str | None = None
    tags: list[str] | None = None
    attributes: dict | None = None
    status: str | None = None


class ImportIn(BaseModel):
    rows: list[dict] = Field(default_factory=list)
    double_opt_in: bool = False


@router.patch(
    "/lists/{list_id}/subscribers/{subscriber_id}", response_model=SubscriberOut
)
async def patch_subscriber(
    list_id: uuid.UUID,
    subscriber_id: uuid.UUID,
    body: SubscriberUpdateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    sub = await svc.get_subscriber(db, ctx.workspace.id, list_id, subscriber_id)
    if sub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscriber not found")
    await svc.update_subscriber(db, sub, **body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(sub)
    return sub


@router.delete(
    "/lists/{list_id}/subscribers/{subscriber_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_subscriber(
    list_id: uuid.UUID,
    subscriber_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    sub = await svc.get_subscriber(db, ctx.workspace.id, list_id, subscriber_id)
    if sub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscriber not found")
    await svc.delete_subscriber(db, sub)
    await db.commit()


@router.post("/lists/{list_id}/import")
async def import_list_subscribers(
    list_id: uuid.UUID,
    body: ImportIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lst = await svc.get_list(db, ctx.workspace.id, list_id)
    if lst is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "List not found")
    count = await svc.import_subscribers(db, ctx.workspace.id, list_id, body.rows)
    await db.commit()
    return {"imported": count}


# --------------------------------------------------------------------------- #
# Suppression management
# --------------------------------------------------------------------------- #
class SuppressionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    reason: str | None = None
    created_at: datetime


class SuppressionCreateIn(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    reason: str | None = Field(default=None, max_length=200)


@router.get("/suppressions", response_model=list[SuppressionOut])
async def get_suppressions(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_suppressions(db, ctx.workspace.id)


@router.post(
    "/suppressions", response_model=SuppressionOut, status_code=status.HTTP_201_CREATED
)
async def post_suppression(
    body: SuppressionCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.create_suppression(
        db, ctx.workspace.id, email=body.email, reason=body.reason
    )
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/suppressions/{suppression_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_suppression(
    suppression_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    obj = await svc.get_suppression(db, ctx.workspace.id, suppression_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suppression not found")
    await svc.delete_suppression(db, obj)
    await db.commit()


# --------------------------------------------------------------------------- #
# Compliance info
# --------------------------------------------------------------------------- #
@router.get("/compliance")
async def get_compliance(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    base = tracking_base_url()
    count = await svc.suppression_count(db, ctx.workspace.id)
    return {
        "suppression_count": count,
        "unsubscribe_url_template": f"{base}/email/t/unsubscribe/{{token}}",
        "preference_url_template": f"{base}/email/t/preferences/{{token}}",
        "confirm_url_template": f"{base}/email/t/confirm/{{token}}",
    }


# --------------------------------------------------------------------------- #
# Sequence update
# --------------------------------------------------------------------------- #
class SequenceUpdateIn(BaseModel):
    name: str | None = None
    trigger: str | None = None
    steps: list | None = None
    is_active: bool | None = None
    autonomy: str | None = None
    list_id: uuid.UUID | None = None


@router.patch("/sequences/{sequence_id}", response_model=SequenceOut)
async def patch_sequence(
    sequence_id: uuid.UUID,
    body: SequenceUpdateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    res = await svc.list_sequences(db, ctx.workspace.id)
    obj = next((s for s in res if s.id == sequence_id), None)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sequence not found")
    data = body.model_dump(exclude_unset=True)
    if "autonomy" in data and data["autonomy"] not in ("suggest", "approve", "auto"):
        data.pop("autonomy")
    for field, val in data.items():
        setattr(obj, field, val)
    await db.commit()
    await db.refresh(obj)
    return obj
