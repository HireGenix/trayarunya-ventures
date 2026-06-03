"""Pydantic request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
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


TokenResponse.model_rebuild()
