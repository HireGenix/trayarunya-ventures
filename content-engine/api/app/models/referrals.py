"""Referrals module: referral / affiliate / loyalty program data model.

Four workspace-scoped tables:

* ``ReferralProgram``    — a program definition (referral / affiliate / loyalty)
* ``Advocate``          — a person promoting a program via a unique code
* ``ReferralConversion`` — a recorded referred signup/sale and its reward
* ``LoyaltyLedger``     — points accrual / redemption with a running balance

Every table carries ``workspace_id`` (FK CASCADE + index) so tenant data is
isolated and removed with its workspace.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

PROGRAM_TYPES = ("referral", "affiliate", "loyalty")
REWARD_TYPES = ("cash", "credit", "points", "discount")
PROGRAM_STATUSES = ("active", "paused")
ADVOCATE_STATUSES = ("active", "pending")
CONVERSION_STATUSES = ("pending", "approved", "paid")
REWARD_STATUSES = ("pending", "approved", "paid")
FRAUD_FLAG_TYPES = ("self_referral", "velocity_spike", "conversion_anomaly", "duplicate_identity", "suspicious_pattern")


class ReferralProgram(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "referral_programs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(40), default="referral", nullable=False)
    reward_type: Mapped[str] = mapped_column(String(40), default="cash", nullable=False)
    reward_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="active", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Advocate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "referral_advocates"

    program_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("referral_programs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    clicks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    signups: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    conversions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    earnings: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="active", nullable=False)
    fraud_score: Mapped[float | None] = mapped_column(Float, nullable=True)


class ReferralConversion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "referral_conversions"

    advocate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("referral_advocates.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    referred_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reward: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="pending", nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    fraud_flags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)


class LoyaltyLedger(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "referral_loyalty_ledger"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    advocate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("referral_advocates.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    contact: Mapped[str | None] = mapped_column(String(320), nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(280), nullable=True)
    balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class RewardTier(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "referral_reward_tiers"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("referral_programs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    milestone: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reward_type: Mapped[str] = mapped_column(String(40), default="cash", nullable=False)
    reward_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="active", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class AdvocateReward(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "referral_advocate_rewards"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    advocate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("referral_advocates.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    tier_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("referral_reward_tiers.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    reward_type: Mapped[str] = mapped_column(String(40), default="cash", nullable=False)
    reward_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="pending", nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class FraudFlag(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "referral_fraud_flags"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    advocate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("referral_advocates.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    conversion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("referral_conversions.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    flag_type: Mapped[str] = mapped_column(String(60), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
