"""Pydantic request/response schemas."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    org_name: str = Field(min_length=1, max_length=200)
    org_type: str = Field(default="company")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupCheckoutRequest(SignupRequest):
    interval: str = Field(default="monthly")


class SignupCheckoutResponse(BaseModel):
    url: str


class CompleteSignupRequest(BaseModel):
    session_id: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    is_superuser: bool = False


# ---------- Tenancy ----------
class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    org_type: str
    plan: str
    client_limit: int | None = None


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    website: str | None = None


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    slug: str
    website: str | None = None


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    organization_id: uuid.UUID
    workspace_id: uuid.UUID | None
    role: str


class MeResponse(BaseModel):
    user: UserOut
    organizations: list[OrganizationOut]
    workspaces: list[WorkspaceOut]


# ---------- Research ----------
class ResearchCreate(BaseModel):
    topic: str = Field(min_length=2, max_length=500)
    target_url: str | None = None
    competitors: list[str] = Field(default_factory=list)
    countries: list[str] = Field(default_factory=list)
    platforms: list[str] = Field(default_factory=list)
    self_handle: str | None = Field(default=None, max_length=300)


class ResearchUpdate(BaseModel):
    topic: str | None = Field(default=None, min_length=2, max_length=500)
    target_url: str | None = None
    summary: str | None = None


class ResearchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    topic: str
    target_url: str | None
    status: str
    error: str | None = None
    summary: str | None = None
    findings: dict[str, Any] | None = None
    sources: list[Any] | None = None
    reasoning: list[Any] | None = None
    confidence: float | None = None
    countries: list[str] | None = None
    platforms: list[str] | None = None
    created_at: datetime
    updated_at: datetime


class SocialAuditRequest(BaseModel):
    url: str = Field(min_length=2, max_length=500)


class SocialBenchmarkRequest(BaseModel):
    urls: list[str] = Field(min_length=1, max_length=6)


class SocialPostOut(BaseModel):
    thumbnail: str | None = None
    likes: int | None = None
    comments: int | None = None
    is_video: bool = False
    media_type: str | None = None
    taken_at: int | None = None
    caption: str | None = None
    permalink: str | None = None


class FormatMixOut(BaseModel):
    format: str
    label: str
    count: int


class ContentInsightsOut(BaseModel):
    format_mix: list[FormatMixOut] = Field(default_factory=list)
    posts_per_week: float | None = None
    last_post_days: int | None = None
    avg_likes: int | None = None
    avg_comments: int | None = None
    top_post_index: int | None = None
    best_format: str | None = None
    best_format_label: str | None = None
    sample_size: int | None = None


class SocialAuditOut(BaseModel):
    platform: str
    found: bool
    username: str | None = None
    full_name: str | None = None
    biography: str | None = None
    is_verified: bool = False
    is_business: bool = False
    private: bool = False
    limited: bool = False
    category: str | None = None
    profile_pic_url: str | None = None
    external_url: str | None = None
    followers: int | None = None
    following: int | None = None
    posts: int | None = None
    engagement_rate: float | None = None
    recent_posts: list[SocialPostOut] = Field(default_factory=list)
    content_insights: ContentInsightsOut | None = None
    query: str | None = None
    is_primary: bool = False
    source: str | None = None
    note: str | None = None
    error: str | None = None


class InsightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    kind: str
    text: str
    intent: str | None
    score: float
    meta: dict[str, Any] | None = None

class CompetitorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    website: str | None
    positioning: str | None
    strengths: list[Any] | None
    weaknesses: list[Any] | None
    content_themes: list[Any] | None
    country: str | None = None
    social_handles: dict[str, Any] | None = None


class AuditSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    research_job_id: uuid.UUID | None
    competitor_id: uuid.UUID | None
    platform: str
    handle: str | None
    is_primary: bool
    country: str | None
    profile: dict[str, Any] | None
    created_at: datetime


# ---------- Strategy ----------
class StrategyCreate(BaseModel):
    research_job_id: uuid.UUID
    objective: str | None = None


class StrategyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    research_job_id: uuid.UUID | None
    title: str
    objective: str | None
    positioning: str | None
    pillars: list[Any] | None
    channel_plan: dict[str, Any] | None
    funnel: dict[str, Any] | None
    lead_magnets: list[Any] | None
    content_calendar: list[Any] | None
    kpis: list[Any] | None
    created_at: datetime


class StrategyUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=300)
    objective: str | None = None
    positioning: str | None = None
    pillars: list[Any] | None = None
    lead_magnets: list[Any] | None = None
    kpis: list[Any] | None = None


TokenResponse.model_rebuild()


# ---------- Brand Brain (M1) ----------
class BrandBuildRequest(BaseModel):
    website: str = Field(min_length=3, max_length=500)


class BrandUpdate(BaseModel):
    primary_color: str | None = None
    accent_color: str | None = None
    logo_url: str | None = None
    mission: str | None = None
    value_prop: str | None = None


class BrandOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    website: str | None
    primary_color: str | None
    accent_color: str | None
    logo_url: str | None
    mission: str | None
    value_prop: str | None
    voice: dict[str, Any] | None
    audience: dict[str, Any] | None
    pillars: list[Any] | None
    keywords: list[Any] | None
    profile: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


# ---------- Insights explorer (M1) ----------
class InsightExplorerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    research_job_id: uuid.UUID | None
    kind: str
    text: str
    intent: str | None
    score: float
    created_at: datetime


# ---------- Content Studio (M2) ----------
class ContentGenerateRequest(BaseModel):
    content_type: str = Field(default="social_post")
    topic: str = Field(min_length=2, max_length=500)
    platform: str | None = None
    strategy_id: uuid.UUID | None = None
    count: int = Field(default=1, ge=1, le=10)
    notes: str | None = None
    provider: str | None = None
    scheduled_date: str | None = None
    # Deliverable format + assets. When ``format`` is an asset format (single,
    # carousel, pdf, article, newsletter) the server also builds the graphics so
    # one call yields complete, ready-to-publish content.
    format: str | None = None
    slides: int | None = Field(default=None, ge=2, le=10)
    with_image: bool = False
    image_style: str | None = None
    image_provider: str | None = None
    # Newsletter/email delivery format: "normal" (markdown) or "html" (branded email).
    email_format: str | None = None


class ContentAssetsRequest(BaseModel):
    """(Re)build the branded asset set for an existing content item."""

    format: str = Field(default="single")
    slides: int | None = Field(default=None, ge=2, le=10)
    image_style: str | None = None
    image_provider: str | None = None
    provider: str | None = None
    email_format: str | None = None


class ContentUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    status: str | None = None
    platform: str | None = None
    variants: dict[str, Any] | None = None
    meta: dict[str, Any] | None = None


class ContentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    strategy_id: uuid.UUID | None
    content_type: str
    status: str
    platform: str | None
    title: str | None
    body: str
    variants: dict[str, Any] | None
    meta: dict[str, Any] | None
    image_url: str | None = None
    image_id: uuid.UUID | None = None
    asset_urls: list[str] | None = None
    asset_kind: str | None = None
    email_html: str | None = None
    email_format: str | None = None
    scheduled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ---------- Social / Publishing (M3-M4) ----------
class SocialAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    platform: str
    external_id: str | None
    display_name: str | None
    scopes: list[Any] | None
    is_active: bool
    created_at: datetime


class OAuthStartOut(BaseModel):
    authorization_url: str
    state: str


class ManualConnectRequest(BaseModel):
    platform: str
    display_name: str | None = None
    access_token: str
    external_id: str | None = None


class ScheduleCreate(BaseModel):
    content_item_id: uuid.UUID
    social_account_id: uuid.UUID
    scheduled_at: datetime


class ScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    content_item_id: uuid.UUID
    social_account_id: uuid.UUID
    scheduled_at: datetime
    status: str
    external_post_id: str | None
    permalink: str | None = None
    error: str | None
    created_at: datetime


class PublishNowRequest(BaseModel):
    content_item_id: uuid.UUID
    social_account_id: uuid.UUID


# ---------- Ads (M5) ----------
class AdAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    platform: str
    external_id: str | None
    name: str | None
    is_grant: bool
    connected: bool = False
    currency: str = "USD"
    meta: dict[str, Any] | None = None
    created_at: datetime


class AdAccountCreate(BaseModel):
    platform: str = Field(default="google_ads")
    name: str
    external_id: str | None = None
    is_grant: bool = False


class AdAccountUpdate(BaseModel):
    """User confirmation of a connected account: which customer id is in use and
    whether it is a Google Ad Grants (nonprofit) account."""
    external_id: str | None = None
    name: str | None = None
    is_grant: bool | None = None


class QuickConnectRequest(BaseModel):
    platform: str = Field(default="google_ads")
    name: str | None = None
    is_grant: bool = False


class CampaignGenerateRequest(BaseModel):
    ad_account_id: uuid.UUID
    objective: str = Field(min_length=2, max_length=300)
    product: str = Field(min_length=2, max_length=300)
    daily_budget: float | None = None
    audience: str | None = None
    locations: list[str] | None = None
    strategy_id: uuid.UUID | None = None


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    ad_account_id: uuid.UUID
    platform: str | None = None
    name: str
    objective: str | None
    status: str
    daily_budget: float | None
    external_id: str | None = None
    plan: dict[str, Any] | None
    assets: dict[str, Any] | None
    recommendations: dict[str, Any] | None = None
    metrics_synced_at: datetime | None = None
    launch_error: str | None = None
    platform_status: str | None = None
    launched_at: datetime | None = None
    created_at: datetime


class CampaignRollup(BaseModel):
    id: str
    name: str
    status: str
    daily_budget: float | None
    totals: dict[str, float]
    kpis: dict[str, float]


class PlatformOverview(BaseModel):
    platform: str
    days: int
    connected: bool
    live: bool
    totals: dict[str, float]
    kpis: dict[str, float]
    series: list[dict[str, Any]]
    campaigns: list[CampaignRollup]
    campaign_count: int
    active_count: int


class CampaignMetricsOut(BaseModel):
    campaign_id: str
    days: int
    totals: dict[str, float]
    kpis: dict[str, float]
    series: list[dict[str, Any]]


class AdsProviders(BaseModel):
    providers: dict[str, bool]


class ConnectionStatusOut(BaseModel):
    connected: bool
    platform: str | None = None
    status: str
    message: str
    has_credentials: bool = False
    can_launch: bool = False
    external_id: str | None = None
    is_grant: bool | None = None


class ValidationErrorItem(BaseModel):
    field: str
    message: str
    severity: str = "error"


class CampaignValidateOut(BaseModel):
    valid: bool
    errors: list[ValidationErrorItem] = []
    warnings: list[ValidationErrorItem] = []


class CampaignLaunchOut(BaseModel):
    success: bool
    external_id: str | None = None
    platform_status: str | None = None
    error: str | None = None
    detail: str | None = None
    validation_errors: list[ValidationErrorItem] = []
    warnings: list[ValidationErrorItem] = []
    campaign: CampaignOut | None = None


class CampaignStatusSyncOut(BaseModel):
    synced: bool
    status: str
    name: str | None = None
    detail: str | None = None


class CampaignDraftUpdateRequest(BaseModel):
    name: str | None = None
    objective: str | None = None
    daily_budget: float | None = None
    plan: dict[str, Any] | None = None
    assets: dict[str, Any] | None = None


# ---------- Analytics / Learning (M6) ----------
class MetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    source: str
    ref_id: uuid.UUID | None
    metric_date: date
    impressions: int
    clicks: int
    engagements: int
    conversions: int
    spend: float


class AnalyticsSummary(BaseModel):
    totals: dict[str, float]
    by_source: dict[str, dict[str, float]]
    series: list[dict[str, Any]]
    content_count: int
    published_count: int
    scheduled_count: int


# ---------- Billing (M6) ----------
class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    price_monthly: int
    limits: dict[str, Any] | None
    features: list[Any] | None


class UsageOut(BaseModel):
    metric: str
    quantity: int
    period: date


class BillingSummary(BaseModel):
    plan: PlanOut | None
    usage: list[UsageOut]


# ---------- Content Calendar (date-aware planning) ----------
class CalendarGenerateRequest(BaseModel):
    client_name: str | None = None
    title: str | None = None
    strategy_id: uuid.UUID | None = None
    start_date: date | None = None  # defaults to today on the server
    end_date: date | None = None  # defaults to end of the start month
    platforms: list[str] | None = None
    goal: str | None = None
    provider: str | None = None


class CalendarEntryGenerateRequest(BaseModel):
    provider: str | None = None
    notes: str | None = None
    with_image: bool = True
    image_style: str | None = None
    image_provider: str | None = None
    email_format: str | None = None


class CalendarDayGenerateRequest(BaseModel):
    date: date
    provider: str | None = None
    with_image: bool = True
    image_style: str | None = None
    image_provider: str | None = None
    email_format: str | None = None


class CalendarOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    strategy_id: uuid.UUID | None
    title: str
    client_name: str | None
    start_date: date
    end_date: date
    platforms: list[Any] | None
    entries: list[Any] | None
    meta: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


# ---------- Unified Calendar Feed ----------

class CalendarFeedItem(BaseModel):
    id: str
    source_type: str  # content | social | email
    source_id: str
    title: str
    channel: str
    scheduled_at: str | None
    status: str  # draft | scheduled | published | failed
    meta: dict[str, Any] | None = None


class CalendarFeedResponse(BaseModel):
    items: list[CalendarFeedItem]
    gaps: list[str] = []


class CalendarRescheduleRequest(BaseModel):
    source_type: str  # content | social | email
    source_id: uuid.UUID
    new_scheduled_at: datetime


class CalendarQuickAddRequest(BaseModel):
    title: str = Field(min_length=1, max_length=400)
    scheduled_at: datetime
    platform: str | None = None
    content_type: str = "social_post"


# ---------- Image generation (social graphics) ----------
class ImageGenerateRequest(BaseModel):
    prompt: str | None = None  # explicit prompt overrides topic/headline
    topic: str | None = None
    headline: str | None = None
    platform: str | None = None
    style: str = "modern_gradient"
    size: str | None = None
    provider: str | None = None  # gpt-image | mai | flux
    content_item_id: uuid.UUID | None = None
    use_brand: bool = True
    extra: str | None = None


class ImageRegenerateRequest(BaseModel):
    """Re-render an existing image guided by its original prompt + a change.

    The image providers are text-to-image only, so this re-generates a fresh
    image from the source image's prompt with the requested change applied,
    keeping the same brand colours, style and size.
    """

    instruction: str = Field(min_length=2, max_length=600)
    provider: str | None = None
    replace: bool = False  # if true, swap this slide in its content item's deck


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    content_item_id: uuid.UUID | None
    prompt: str | None
    provider: str | None
    style: str | None
    size: str | None
    mime: str
    url: str
    created_at: datetime


class VideoGenerateRequest(BaseModel):
    """Generate an AI short-form video (script + b-roll + voiceover + captions)."""

    topic: str | None = None
    fmt: str = "reels"  # youtube | youtube_shorts | reels | tiktok
    platform: str | None = None
    seconds: int | None = Field(default=None, ge=5, le=180)
    voice: str | None = None  # alloy|echo|fable|onyx|nova|shimmer|coral|sage
    tone: str | None = None  # delivery instruction for gpt-4o-mini-tts
    quality: str | None = None  # 720p | 1080p | 4k (default 1080p)
    style: str | None = None  # clean | bold | dynamic (creative template)
    visuals: str | None = None  # stock | ai | hybrid (imagery source, default hybrid)
    content_item_id: uuid.UUID | None = None
    script: str | None = None  # narrate this finished script verbatim (turn post -> video)
    use_brand: bool = True
    extra: str | None = None


class VideoRegenerateRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=600)
    voice: str | None = None
    tone: str | None = None
    quality: str | None = None  # 720p | 1080p | 4k
    style: str | None = None  # clean | bold | dynamic
    visuals: str | None = None  # stock | ai | hybrid


class VideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    content_item_id: uuid.UUID | None
    topic: str | None
    platform: str | None
    fmt: str
    provider: str | None
    voice: str | None
    status: str
    duration_s: int | None
    width: int | None
    height: int | None
    mime: str
    url: str
    created_at: datetime



# ---------- Model registry ----------
class ModelPublicOut(BaseModel):
    """Safe model info for the picker — NEVER includes keys or endpoints."""
    key: str
    label: str
    kind: str
    is_default: bool


class ModelAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    key: str
    label: str
    kind: str
    endpoint: str | None
    model_name: str
    api_version: str | None
    enabled: bool
    is_default: bool
    sort_order: int
    source: str
    has_key: bool = False
    created_at: datetime
    updated_at: datetime


class ModelCreate(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    kind: str = Field(description="responses | anthropic | chat_completions")
    model_name: str = Field(min_length=1, max_length=120)
    endpoint: str | None = None
    api_key: str | None = None
    api_version: str | None = None
    enabled: bool = True
    is_default: bool = False
    sort_order: int = 100


class ModelUpdate(BaseModel):
    key: str | None = Field(default=None, max_length=80)
    label: str | None = Field(default=None, max_length=120)
    kind: str | None = None
    model_name: str | None = Field(default=None, max_length=120)
    endpoint: str | None = None
    api_key: str | None = None
    api_version: str | None = None
    enabled: bool | None = None
    is_default: bool | None = None
    sort_order: int | None = None


# ---------- ICP (Ideal Customer Profile) ----------
class ICPOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    status: str
    segment: str | None = None
    industry: str | None = None
    company_name: str | None = None
    website: str | None = None
    company_summary: str | None = None
    value_prop: str | None = None
    offer: str | None = None
    target_customer: str | None = None
    brand_voice: str | None = None
    personas: list[Any] | None = None
    pains: list[Any] | None = None
    goals: list[Any] | None = None
    geographies: list[Any] | None = None
    channels: list[Any] | None = None
    keywords: list[Any] | None = None
    competitors: list[Any] | None = None
    b2b: dict[str, Any] | None = None
    completeness: int = 0
    raw: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class ICPUpdate(BaseModel):
    """Manual edits / full upsert from the ICP panel. All fields optional."""
    status: str | None = None
    segment: str | None = None
    industry: str | None = None
    company_name: str | None = None
    website: str | None = None
    company_summary: str | None = None
    value_prop: str | None = None
    offer: str | None = None
    target_customer: str | None = None
    brand_voice: str | None = None
    personas: list[Any] | None = None
    pains: list[Any] | None = None
    goals: list[Any] | None = None
    geographies: list[Any] | None = None
    channels: list[Any] | None = None
    keywords: list[Any] | None = None
    competitors: list[Any] | None = None
    b2b: dict[str, Any] | None = None


class ICPChatMessage(BaseModel):
    role: str = Field(description="user | assistant")
    text: str = ""
    images: list[str] | None = None


class ICPChatRequest(BaseModel):
    messages: list[ICPChatMessage]
    save: bool = False


class ICPChatResponse(BaseModel):
    message: str
    icp: dict[str, Any]
    completeness: int = 0
    done: bool = False


# ---------- Team Chat ----------
class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    model_key: str | None = None
    pinned: bool = False
    archived: bool = False
    created_at: datetime
    updated_at: datetime


class ConversationWithPreview(ConversationOut):
    preview: str | None = None


class ChatAttachment(BaseModel):
    name: str = Field(max_length=200)
    kind: str = Field(pattern="^(image|document)$")
    url: str | None = None
    # Transient (images only) — base64 data URL passed to the vision model, not persisted.
    data_url: str | None = None
    # Extracted text (documents only).
    text: str | None = None


class ConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    model_key: str | None = Field(default=None, max_length=80)
    # Optional first user message to seed the conversation.
    message: str | None = None
    web_search: bool = False
    attachments: list[ChatAttachment] = []


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    model_key: str | None = Field(default=None, max_length=80)
    pinned: bool | None = None
    archived: bool | None = None


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    meta: dict | None = None
    created_at: datetime


class ConversationDetail(ConversationOut):
    messages: list[ChatMessageOut] = []


class ChatSendRequest(BaseModel):
    text: str = Field(min_length=1)
    model_key: str | None = Field(default=None, max_length=80)
    web_search: bool = False
    attachments: list[ChatAttachment] = []


class ChatAttachmentOut(BaseModel):
    name: str
    kind: str
    url: str | None = None
    data_url: str | None = None
    text: str | None = None
    chars: int | None = None


class ChatSendResponse(BaseModel):
    conversation_id: uuid.UUID
    message: ChatMessageOut
    title: str


# ---------- Decks (branded AI presentations) ----------
class DeckGenerateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=4000)
    audience: str | None = Field(default=None, max_length=300)
    tone: str | None = Field(default=None, max_length=120)
    style: str = Field(default="modern", max_length=40)
    slide_count: int | None = Field(default=None, ge=4, le=16)
    model_key: str | None = Field(default=None, max_length=80)
    image_provider: str | None = Field(default=None, max_length=40)
    image_source: str | None = Field(default=None, max_length=10)
    theme_id: str | None = Field(default=None, max_length=40)


class DeckUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    style: str | None = Field(default=None, max_length=40)
    theme_id: str | None = Field(default=None, max_length=40)


class SlideUpdateRequest(BaseModel):
    layout: str | None = Field(default=None, max_length=40)
    data: dict | None = None
    speaker_notes: str | None = None


class SlideReorderRequest(BaseModel):
    slide_ids: list[uuid.UUID]


class SlideRegenerateRequest(BaseModel):
    instruction: str | None = Field(default=None, max_length=2000)
    layout: str | None = Field(default=None, max_length=40)
    model_key: str | None = Field(default=None, max_length=80)
    with_image: bool = True
    rewrite_content: bool = True


class SlideAddRequest(BaseModel):
    after_slide_id: uuid.UUID | None = None
    layout: str = Field(default="bullets", max_length=40)
    instruction: str | None = Field(default=None, max_length=2000)
    generate: bool = True
    model_key: str | None = Field(default=None, max_length=80)


class DeckSlideOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    position: int
    layout: str
    data: dict
    speaker_notes: str | None = None


class DeckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    topic: str | None = None
    audience: str | None = None
    tone: str | None = None
    style: str
    status: str
    error: str | None = None
    theme: dict | None = None
    meta: dict | None = None
    created_at: datetime
    updated_at: datetime
    share_enabled: bool = False
    share_token: str | None = None
    require_email: bool = False
    expires_at: datetime | None = None


class DeckSummary(DeckOut):
    slide_count: int = 0


class DeckDetail(DeckOut):
    slides: list[DeckSlideOut] = []


# ---------- Deck collaboration ----------
class DeckCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    deck_id: uuid.UUID
    slide_index: int
    author: str
    body: str
    resolved: bool
    created_at: datetime


class DeckCommentCreate(BaseModel):
    slide_index: int = Field(ge=0)
    body: str = Field(min_length=1, max_length=2000)


class DeckVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    deck_id: uuid.UUID
    version_number: int
    label: str | None = None
    created_at: datetime


class DeckShareOut(BaseModel):
    share_token: str
    share_url: str
    require_email: bool = False
    has_password: bool = False
    expires_at: datetime | None = None


class DeckAsyncJobOut(BaseModel):
    job_id: str
    status: str


class DeckThemeApplyRequest(BaseModel):
    theme_id: str = Field(max_length=40)


# ---------- Deck sharing & analytics ----------
class DeckShareSettings(BaseModel):
    require_email: bool = False
    password: str | None = Field(default=None, max_length=128)
    expires_at: datetime | None = None


class DeckShareMeta(BaseModel):
    title: str
    slide_count: int
    require_email: bool = False
    require_password: bool = False
    expired: bool = False


class DeckUnlockRequest(BaseModel):
    email: str | None = Field(default=None, max_length=320)
    password: str | None = Field(default=None, max_length=128)


class DeckViewOut(BaseModel):
    session_id: str


class DeckHeartbeatRequest(BaseModel):
    session_id: str = Field(max_length=64)
    slide_index: int = Field(ge=0)
    delta_seconds: int = Field(ge=0, le=300)


class DeckSlideAnalytics(BaseModel):
    slide_index: int
    total_seconds: int
    view_count: int


class DeckViewerRow(BaseModel):
    session_id: str
    viewer_email: str | None = None
    started_at: datetime
    last_seen_at: datetime
    total_seconds: int


class DeckAnalyticsOut(BaseModel):
    unique_viewers: int = 0
    total_views: int = 0
    avg_seconds: float = 0.0
    completion_rate: float = 0.0
    per_slide: list[DeckSlideAnalytics] = []
    recent_viewers: list[DeckViewerRow] = []


class DeckOutlineSlide(BaseModel):
    title: str = Field(max_length=300)
    intent: str = Field(default="", max_length=1000)
    layout: str = Field(default="bullets", max_length=40)


class DeckOutlineRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=4000)
    audience: str | None = Field(default=None, max_length=300)
    tone: str | None = Field(default=None, max_length=120)
    slide_count: int | None = Field(default=None, ge=4, le=20)
    model_key: str | None = Field(default=None, max_length=80)


class DeckOutlineOut(BaseModel):
    slides: list[DeckOutlineSlide]


class DeckGenerateFromOutlineRequest(BaseModel):
    outline: list[DeckOutlineSlide]
    topic: str = Field(min_length=3, max_length=4000)
    audience: str | None = Field(default=None, max_length=300)
    tone: str | None = Field(default=None, max_length=120)
    style: str = Field(default="modern", max_length=40)
    model_key: str | None = Field(default=None, max_length=80)
    image_provider: str | None = Field(default=None, max_length=40)
    image_source: str | None = Field(default=None, max_length=10)
    theme_id: str | None = Field(default=None, max_length=40)


class BrandKitOut(BaseModel):
    logo_url: str | None = None
    primary_color: str | None = None
    accent_color: str | None = None
    brand_name: str | None = None
    mission: str | None = None
    fonts: dict | None = None


class DeckTemplateOut(BaseModel):
    id: str
    name: str
    description: str
    slide_count: int
    category: str
    outline: list[DeckOutlineSlide]


# ---------- Platform admin (superuser) ----------
class AdminOrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    org_type: str
    plan: str
    client_limit: int | None = None
    workspace_count: int = 0
    has_subscription: bool = False


class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    is_superuser: bool
    role: str | None = None
    created_at: datetime | None = None
    org: AdminOrgOut | None = None


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    org_name: str = Field(min_length=1, max_length=200)
    org_type: str = Field(default="company")
    plan_code: str = Field(default="free")
    client_limit: int | None = Field(default=None, ge=0)
    is_superuser: bool = False


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    is_active: bool | None = None
    is_superuser: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class AdminOrgUpdate(BaseModel):
    plan_code: str | None = None
    org_type: str | None = None
    client_limit: int | None = Field(default=None, ge=0)


class AdminPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    price_monthly: int
    limits: dict[str, Any] | None = None
    features: list[str] | None = None
    in_use: int = 0


class AdminPlanCreate(BaseModel):
    code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    price_monthly: int = Field(default=0, ge=0)
    limits: dict[str, Any] | None = None
    features: list[str] | None = None


class AdminPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    price_monthly: int | None = Field(default=None, ge=0)
    limits: dict[str, Any] | None = None
    features: list[str] | None = None
