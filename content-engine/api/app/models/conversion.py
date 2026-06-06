"""Conversion telemetry model (CRO foundation).

A single ``ConversionEvent`` table captures granular, event-level funnel signals
emitted by the on-site pixel (``/public/cro.js``), server ingest, or mapped from
analytics/ecommerce integration syncs (GA4, Shopify…). These power the CRO
funnel, leak detection and scorecard — every number reported downstream is
derived from these real rows, never fabricated.

Canonical event types map onto an ordered conversion funnel:

    page_view (visit) -> cta_click (engage) -> form_start (lead)
        -> form_submit / signup / add_to_cart / checkout -> purchase (convert)

``anon_id`` is the device/cookie identifier from the pixel; ``contact_ref`` is the
known identity (email / CRM id) when available, so anonymous journeys can later
be stitched to real people and to :class:`RevenueEvent` rows.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin

# Canonical event types we understand. ``custom`` is a catch-all.
EVENT_TYPES = (
    "page_view",
    "cta_click",
    "form_start",
    "form_submit",
    "signup",
    "add_to_cart",
    "checkout",
    "purchase",
    "custom",
)

# Ordered conversion funnel. Each stage has a friendly label and the set of
# event types that count a unique visitor as having reached that stage.
FUNNEL_STAGES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("visit", "Visitors", ("page_view",)),
    ("engage", "Engaged", ("cta_click",)),
    ("lead", "Leads", ("form_start", "add_to_cart")),
    ("convert", "Converted", ("form_submit", "signup", "checkout", "purchase")),
)

# Event types that carry monetary value (used for AOV / revenue-left-on-table).
VALUE_EVENTS = ("purchase", "checkout")


class ConversionEvent(Base, UUIDMixin):
    """One conversion-funnel signal for one visitor at one moment."""

    __tablename__ = "conversion_events"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # Device/cookie id from the pixel; the unit we count for funnel CVR.
    anon_id: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    # Known identity (email/CRM id) when the visitor is resolved.
    contact_ref: Mapped[str | None] = mapped_column(String(200), index=True, nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)

    event_type: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    # Optional explicit funnel step / named goal override.
    step: Mapped[str | None] = mapped_column(String(60), nullable=True)

    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    device: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # Experiment attribution (Phase 2): which variant the visitor saw.
    experiment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    variant_id: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)

    # Marketing attribution.
    campaign: Mapped[str | None] = mapped_column(String(200), index=True, nullable=True)
    utm_source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Monetary value for purchase/checkout events.
    value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)

    source: Mapped[str | None] = mapped_column(String(60), nullable=True)  # pixel/api/ga4/shopify
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
