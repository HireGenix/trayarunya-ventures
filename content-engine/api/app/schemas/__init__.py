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


# ---------- Tenancy ----------
class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    org_type: str
    plan: str


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
    created_at: datetime
    updated_at: datetime


class InsightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    kind: str
    text: str
    intent: str | None
    score: float


class CompetitorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    website: str | None
    positioning: str | None
    strengths: list[Any] | None
    weaknesses: list[Any] | None
    content_themes: list[Any] | None


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
    created_at: datetime


class AdAccountCreate(BaseModel):
    platform: str = Field(default="google_ads")
    name: str
    external_id: str | None = None
    is_grant: bool = False


class CampaignGenerateRequest(BaseModel):
    ad_account_id: uuid.UUID
    objective: str = Field(min_length=2, max_length=300)
    product: str = Field(min_length=2, max_length=300)
    daily_budget: float | None = None
    strategy_id: uuid.UUID | None = None


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    ad_account_id: uuid.UUID
    name: str
    objective: str | None
    status: str
    daily_budget: float | None
    plan: dict[str, Any] | None
    assets: dict[str, Any] | None
    created_at: datetime


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


class CalendarDayGenerateRequest(BaseModel):
    date: date
    provider: str | None = None
    with_image: bool = True
    image_style: str | None = None
    image_provider: str | None = None


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
