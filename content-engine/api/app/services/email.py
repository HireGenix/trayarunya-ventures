"""Email marketing service layer.

All numbers are computed from real DB rows this module writes. Aggregate
engagement metrics (open rate, click rate, list growth) are derived from
``EmailSendLog`` and ``EmailSubscriber`` rows — never fabricated.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email import (
    EmailCampaign,
    EmailList,
    EmailSegment,
    EmailSendLog,
    EmailSequence,
    EmailSubscriber,
    EmailSuppression,
    EmailTemplate,
)


# --------------------------------------------------------------------------- #
# Lists
# --------------------------------------------------------------------------- #
async def list_lists(db: AsyncSession, ws_id: uuid.UUID) -> list[EmailList]:
    res = await db.execute(
        select(EmailList)
        .where(EmailList.workspace_id == ws_id)
        .order_by(EmailList.created_at.desc())
    )
    return list(res.scalars().all())


async def create_list(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    description: str | None = None,
    settings: dict | None = None,
) -> EmailList:
    obj = EmailList(
        workspace_id=ws_id,
        name=name,
        description=description,
        settings=settings,
    )
    db.add(obj)
    await db.flush()
    return obj


async def get_list(
    db: AsyncSession, ws_id: uuid.UUID, list_id: uuid.UUID
) -> EmailList | None:
    res = await db.execute(
        select(EmailList).where(
            EmailList.workspace_id == ws_id, EmailList.id == list_id
        )
    )
    return res.scalar_one_or_none()


async def subscriber_count(
    db: AsyncSession, ws_id: uuid.UUID, list_id: uuid.UUID
) -> int:
    res = await db.execute(
        select(func.count(EmailSubscriber.id)).where(
            EmailSubscriber.workspace_id == ws_id,
            EmailSubscriber.list_id == list_id,
            EmailSubscriber.status == "subscribed",
        )
    )
    return int(res.scalar_one() or 0)


# --------------------------------------------------------------------------- #
# Subscribers
# --------------------------------------------------------------------------- #
async def list_subscribers(
    db: AsyncSession,
    ws_id: uuid.UUID,
    list_id: uuid.UUID,
    *,
    limit: int = 500,
) -> list[EmailSubscriber]:
    res = await db.execute(
        select(EmailSubscriber)
        .where(
            EmailSubscriber.workspace_id == ws_id,
            EmailSubscriber.list_id == list_id,
        )
        .order_by(EmailSubscriber.created_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


async def add_subscriber(
    db: AsyncSession,
    ws_id: uuid.UUID,
    list_id: uuid.UUID,
    *,
    email: str,
    name: str | None = None,
    tags: list | None = None,
    attributes: dict | None = None,
    status: str = "subscribed",
) -> EmailSubscriber:
    """Add a subscriber; update in place if the email already exists on the list."""
    email = email.strip().lower()
    existing = await db.execute(
        select(EmailSubscriber).where(
            EmailSubscriber.workspace_id == ws_id,
            EmailSubscriber.list_id == list_id,
            EmailSubscriber.email == email,
        )
    )
    sub = existing.scalar_one_or_none()
    if sub is not None:
        if name:
            sub.name = name
        if tags is not None:
            sub.tags = tags
        if attributes is not None:
            sub.attributes = attributes
        sub.status = status
        await db.flush()
        return sub

    sub = EmailSubscriber(
        workspace_id=ws_id,
        list_id=list_id,
        email=email,
        name=name,
        tags=tags,
        attributes=attributes,
        status=status,
    )
    db.add(sub)
    await db.flush()
    return sub


async def import_subscribers(
    db: AsyncSession,
    ws_id: uuid.UUID,
    list_id: uuid.UUID,
    rows: list[dict],
) -> int:
    """Bulk import; returns count of subscribers added/updated."""
    n = 0
    for row in rows:
        email = (row.get("email") or "").strip()
        if not email:
            continue
        await add_subscriber(
            db,
            ws_id,
            list_id,
            email=email,
            name=row.get("name"),
            tags=row.get("tags"),
            attributes=row.get("attributes"),
        )
        n += 1
    return n


async def segment_subscribers(
    db: AsyncSession,
    ws_id: uuid.UUID,
    list_id: uuid.UUID,
    *,
    tag: str | None = None,
    attribute_key: str | None = None,
    attribute_value: str | None = None,
) -> list[EmailSubscriber]:
    """Filter subscribers by tag and/or attribute (computed in Python over JSONB)."""
    subs = await list_subscribers(db, ws_id, list_id, limit=5000)
    out: list[EmailSubscriber] = []
    for s in subs:
        if s.status != "subscribed":
            continue
        if tag is not None:
            tags = s.tags if isinstance(s.tags, list) else []
            if tag not in tags:
                continue
        if attribute_key is not None:
            attrs = s.attributes if isinstance(s.attributes, dict) else {}
            val = attrs.get(attribute_key)
            if attribute_value is not None and str(val) != str(attribute_value):
                continue
            if attribute_value is None and val in (None, ""):
                continue
        out.append(s)
    return out


# --------------------------------------------------------------------------- #
# Campaigns
# --------------------------------------------------------------------------- #
async def list_campaigns(db: AsyncSession, ws_id: uuid.UUID) -> list[EmailCampaign]:
    res = await db.execute(
        select(EmailCampaign)
        .where(EmailCampaign.workspace_id == ws_id)
        .order_by(EmailCampaign.created_at.desc())
    )
    return list(res.scalars().all())


async def get_campaign(
    db: AsyncSession, ws_id: uuid.UUID, campaign_id: uuid.UUID
) -> EmailCampaign | None:
    res = await db.execute(
        select(EmailCampaign).where(
            EmailCampaign.workspace_id == ws_id, EmailCampaign.id == campaign_id
        )
    )
    return res.scalar_one_or_none()


async def create_campaign(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    subject: str = "",
    preheader: str | None = None,
    from_name: str | None = None,
    body_html: str | None = None,
    body_blocks: dict | None = None,
    list_id: uuid.UUID | None = None,
    segment_id: uuid.UUID | None = None,
    scheduled_at: datetime | None = None,
    ab_test: dict | None = None,
) -> EmailCampaign:
    obj = EmailCampaign(
        workspace_id=ws_id,
        name=name,
        subject=subject,
        preheader=preheader,
        from_name=from_name,
        body_html=body_html,
        body_blocks=body_blocks,
        list_id=list_id,
        segment_id=segment_id,
        scheduled_at=scheduled_at,
        status="scheduled" if scheduled_at else "draft",
        stats={"sent": 0, "opens": 0, "clicks": 0, "bounces": 0},
        ab_test=ab_test,
    )
    db.add(obj)
    await db.flush()
    return obj


# --------------------------------------------------------------------------- #
# Sequences
# --------------------------------------------------------------------------- #
async def list_sequences(db: AsyncSession, ws_id: uuid.UUID) -> list[EmailSequence]:
    res = await db.execute(
        select(EmailSequence)
        .where(EmailSequence.workspace_id == ws_id)
        .order_by(EmailSequence.created_at.desc())
    )
    return list(res.scalars().all())


async def create_sequence(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    trigger: str = "subscribe",
    steps: list | None = None,
    list_id: uuid.UUID | None = None,
    is_active: bool = False,
    autonomy: str = "suggest",
) -> EmailSequence:
    obj = EmailSequence(
        workspace_id=ws_id,
        name=name,
        trigger=trigger,
        steps=steps or [],
        list_id=list_id,
        is_active=is_active,
        autonomy=autonomy,
    )
    db.add(obj)
    await db.flush()
    return obj


# --------------------------------------------------------------------------- #
# Real aggregate analytics (computed from EmailSendLog rows)
# --------------------------------------------------------------------------- #
async def campaign_stats(
    db: AsyncSession, ws_id: uuid.UUID, campaign_id: uuid.UUID
) -> dict:
    """Recompute live engagement stats for a campaign from send logs."""
    from sqlalchemy import case

    res = await db.execute(
        select(
            func.count(EmailSendLog.id).label("total"),
            func.count(case((EmailSendLog.status.in_(["sent", "opened", "clicked", "bounced"]), 1))).label("sent"),
            func.count(EmailSendLog.opened_at).label("opens"),
            func.count(EmailSendLog.clicked_at).label("clicks"),
            func.count(case((EmailSendLog.status == "bounced", 1))).label("bounces"),
            func.count(case((EmailSendLog.status == "queued", 1))).label("queued"),
        ).where(
            EmailSendLog.workspace_id == ws_id,
            EmailSendLog.campaign_id == campaign_id,
        )
    )
    row = res.one()
    sent = row.sent or 0
    opens = row.opens or 0
    clicks = row.clicks or 0
    bounces = row.bounces or 0
    queued = row.queued or 0
    open_rate = round((opens / sent) * 100, 1) if sent else 0.0
    click_rate = round((clicks / sent) * 100, 1) if sent else 0.0
    return {
        "sent": sent,
        "opens": opens,
        "clicks": clicks,
        "bounces": bounces,
        "queued": queued,
        "open_rate": open_rate,
        "click_rate": click_rate,
    }


async def list_growth(
    db: AsyncSession, ws_id: uuid.UUID, *, days: int = 30
) -> dict:
    """Real subscriber growth over the trailing window."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    total = int(
        (
            await db.execute(
                select(func.count(EmailSubscriber.id)).where(
                    EmailSubscriber.workspace_id == ws_id,
                    EmailSubscriber.status == "subscribed",
                )
            )
        ).scalar_one()
        or 0
    )
    new = int(
        (
            await db.execute(
                select(func.count(EmailSubscriber.id)).where(
                    EmailSubscriber.workspace_id == ws_id,
                    EmailSubscriber.created_at >= since,
                )
            )
        ).scalar_one()
        or 0
    )
    growth_rate = round((new / (total - new)) * 100, 1) if (total - new) > 0 else 0.0
    return {"total_subscribers": total, "new_subscribers": new, "growth_rate": growth_rate}


async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Top-line KPIs for the dashboard, all from real rows."""
    subscribers = int(
        (
            await db.execute(
                select(func.count(EmailSubscriber.id)).where(
                    EmailSubscriber.workspace_id == ws_id,
                    EmailSubscriber.status == "subscribed",
                )
            )
        ).scalar_one()
        or 0
    )
    lists_total = int(
        (
            await db.execute(
                select(func.count(EmailList.id)).where(
                    EmailList.workspace_id == ws_id
                )
            )
        ).scalar_one()
        or 0
    )
    campaigns_sent = int(
        (
            await db.execute(
                select(func.count(EmailCampaign.id)).where(
                    EmailCampaign.workspace_id == ws_id,
                    EmailCampaign.status == "sent",
                )
            )
        ).scalar_one()
        or 0
    )
    active_sequences = int(
        (
            await db.execute(
                select(func.count(EmailSequence.id)).where(
                    EmailSequence.workspace_id == ws_id,
                    EmailSequence.is_active.is_(True),
                )
            )
        ).scalar_one()
        or 0
    )

    # Aggregate engagement across all send logs in the workspace.
    from sqlalchemy import case

    agg = await db.execute(
        select(
            func.count(case((EmailSendLog.status.in_(["sent", "opened", "clicked", "bounced"]), 1))).label("sent"),
            func.count(EmailSendLog.opened_at).label("opens"),
            func.count(EmailSendLog.clicked_at).label("clicks"),
        ).where(EmailSendLog.workspace_id == ws_id)
    )
    agg_row = agg.one()
    sent = agg_row.sent or 0
    opens = agg_row.opens or 0
    clicks = agg_row.clicks or 0
    avg_open_rate = round((opens / sent) * 100, 1) if sent else 0.0
    avg_click_rate = round((clicks / sent) * 100, 1) if sent else 0.0

    growth = await list_growth(db, ws_id)
    return {
        "subscribers": subscribers,
        "lists": lists_total,
        "campaigns_sent": campaigns_sent,
        "active_sequences": active_sequences,
        "total_sent": sent,
        "avg_open_rate": avg_open_rate,
        "avg_click_rate": avg_click_rate,
        "growth_rate": growth["growth_rate"],
        "new_subscribers": growth["new_subscribers"],
    }


async def open_timestamps(
    db: AsyncSession, ws_id: uuid.UUID, *, list_id: uuid.UUID | None = None
) -> list[datetime]:
    """Return all real open timestamps (used by the agent's send-time model)."""
    stmt = select(EmailSendLog.opened_at).where(
        EmailSendLog.workspace_id == ws_id,
        EmailSendLog.opened_at.is_not(None),
    )
    res = await db.execute(stmt)
    return [row[0] for row in res.all() if row[0] is not None]


# --------------------------------------------------------------------------- #
# Templates
# --------------------------------------------------------------------------- #
async def list_templates(db: AsyncSession, ws_id: uuid.UUID) -> list[EmailTemplate]:
    res = await db.execute(
        select(EmailTemplate)
        .where(EmailTemplate.workspace_id == ws_id)
        .order_by(EmailTemplate.created_at.desc())
    )
    return list(res.scalars().all())


async def get_template(
    db: AsyncSession, ws_id: uuid.UUID, template_id: uuid.UUID
) -> EmailTemplate | None:
    res = await db.execute(
        select(EmailTemplate).where(
            EmailTemplate.workspace_id == ws_id, EmailTemplate.id == template_id
        )
    )
    return res.scalar_one_or_none()


async def create_template(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    subject: str = "",
    preheader: str | None = None,
    body_blocks: list | None = None,
    description: str | None = None,
    category: str | None = None,
    thumbnail: str | None = None,
) -> EmailTemplate:
    obj = EmailTemplate(
        workspace_id=ws_id,
        name=name,
        subject=subject,
        preheader=preheader,
        body_blocks=body_blocks or [],
        description=description,
        category=category,
        thumbnail=thumbnail,
        is_starter=False,
    )
    db.add(obj)
    await db.flush()
    return obj


async def update_template(
    db: AsyncSession, template: EmailTemplate, **fields
) -> EmailTemplate:
    for key, val in fields.items():
        if val is not None:
            setattr(template, key, val)
    await db.flush()
    return template


async def delete_template(db: AsyncSession, template: EmailTemplate) -> None:
    await db.delete(template)
    await db.flush()


# --------------------------------------------------------------------------- #
# Segments
# --------------------------------------------------------------------------- #
async def list_segments(db: AsyncSession, ws_id: uuid.UUID) -> list[EmailSegment]:
    res = await db.execute(
        select(EmailSegment)
        .where(EmailSegment.workspace_id == ws_id)
        .order_by(EmailSegment.created_at.desc())
    )
    return list(res.scalars().all())


async def get_segment(
    db: AsyncSession, ws_id: uuid.UUID, segment_id: uuid.UUID
) -> EmailSegment | None:
    res = await db.execute(
        select(EmailSegment).where(
            EmailSegment.workspace_id == ws_id, EmailSegment.id == segment_id
        )
    )
    return res.scalar_one_or_none()


async def create_segment(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    rules: dict | None = None,
    list_id: uuid.UUID | None = None,
) -> EmailSegment:
    obj = EmailSegment(
        workspace_id=ws_id,
        name=name,
        rules=rules or {},
        list_id=list_id,
    )
    db.add(obj)
    await db.flush()
    return obj


async def update_segment(db: AsyncSession, segment: EmailSegment, **fields) -> EmailSegment:
    for key, val in fields.items():
        if val is not None:
            setattr(segment, key, val)
    await db.flush()
    return segment


async def delete_segment(db: AsyncSession, segment: EmailSegment) -> None:
    await db.delete(segment)
    await db.flush()


# --------------------------------------------------------------------------- #
# Suppressions
# --------------------------------------------------------------------------- #
async def list_suppressions(db: AsyncSession, ws_id: uuid.UUID) -> list[EmailSuppression]:
    res = await db.execute(
        select(EmailSuppression)
        .where(EmailSuppression.workspace_id == ws_id)
        .order_by(EmailSuppression.created_at.desc())
    )
    return list(res.scalars().all())


async def get_suppression(
    db: AsyncSession, ws_id: uuid.UUID, suppression_id: uuid.UUID
) -> EmailSuppression | None:
    res = await db.execute(
        select(EmailSuppression).where(
            EmailSuppression.workspace_id == ws_id,
            EmailSuppression.id == suppression_id,
        )
    )
    return res.scalar_one_or_none()


async def create_suppression(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    email: str,
    reason: str | None = None,
) -> EmailSuppression:
    email = (email or "").strip().lower()
    existing = await db.execute(
        select(EmailSuppression).where(
            EmailSuppression.workspace_id == ws_id,
            EmailSuppression.email == email,
        )
    )
    obj = existing.scalar_one_or_none()
    if obj is not None:
        if reason:
            obj.reason = reason
        await db.flush()
        return obj
    obj = EmailSuppression(workspace_id=ws_id, email=email, reason=reason)
    db.add(obj)
    await db.flush()
    return obj


async def delete_suppression(db: AsyncSession, suppression: EmailSuppression) -> None:
    await db.delete(suppression)
    await db.flush()


async def is_suppressed(db: AsyncSession, ws_id: uuid.UUID, email: str) -> bool:
    email = (email or "").strip().lower()
    if not email:
        return False
    res = await db.execute(
        select(EmailSuppression.id).where(
            EmailSuppression.workspace_id == ws_id,
            EmailSuppression.email == email,
        )
    )
    return res.scalar_one_or_none() is not None


async def suppression_count(db: AsyncSession, ws_id: uuid.UUID) -> int:
    res = await db.execute(
        select(func.count(EmailSuppression.id)).where(
            EmailSuppression.workspace_id == ws_id
        )
    )
    return int(res.scalar_one() or 0)


# --------------------------------------------------------------------------- #
# List management
# --------------------------------------------------------------------------- #
async def update_list(db: AsyncSession, lst: EmailList, **fields) -> EmailList:
    for key, val in fields.items():
        if val is not None:
            setattr(lst, key, val)
    await db.flush()
    return lst


async def delete_list(db: AsyncSession, lst: EmailList) -> None:
    await db.delete(lst)
    await db.flush()


# --------------------------------------------------------------------------- #
# Subscriber management
# --------------------------------------------------------------------------- #
async def get_subscriber(
    db: AsyncSession,
    ws_id: uuid.UUID,
    list_id: uuid.UUID,
    subscriber_id: uuid.UUID,
) -> EmailSubscriber | None:
    res = await db.execute(
        select(EmailSubscriber).where(
            EmailSubscriber.workspace_id == ws_id,
            EmailSubscriber.list_id == list_id,
            EmailSubscriber.id == subscriber_id,
        )
    )
    return res.scalar_one_or_none()


async def update_subscriber(
    db: AsyncSession, subscriber: EmailSubscriber, **fields
) -> EmailSubscriber:
    for key, val in fields.items():
        if val is not None:
            setattr(subscriber, key, val)
    await db.flush()
    return subscriber


async def delete_subscriber(db: AsyncSession, subscriber: EmailSubscriber) -> None:
    await db.delete(subscriber)
    await db.flush()


# --------------------------------------------------------------------------- #
# Comprehensive campaign analytics (all from real send logs)
# --------------------------------------------------------------------------- #
async def campaign_analytics(
    db: AsyncSession, ws_id: uuid.UUID, campaign_id: uuid.UUID
) -> dict:
    """Comprehensive analytics computed entirely from real EmailSendLog rows."""
    from sqlalchemy import case

    base = (
        EmailSendLog.workspace_id == ws_id,
        EmailSendLog.campaign_id == campaign_id,
    )

    # Headline counts.
    res = await db.execute(
        select(
            func.count(EmailSendLog.id).label("total"),
            func.count(
                case(
                    (EmailSendLog.status.in_(["sent", "opened", "clicked", "bounced"]), 1)
                )
            ).label("delivered"),
            func.count(EmailSendLog.opened_at).label("opens"),
            func.count(EmailSendLog.clicked_at).label("clicks"),
            func.count(case((EmailSendLog.status == "bounced", 1))).label("bounces"),
        ).where(*base)
    )
    row = res.one()
    delivered = row.delivered or 0
    opens = row.opens or 0
    clicks = row.clicks or 0
    bounces = row.bounces or 0

    def _rate(n: int) -> float:
        return round((n / delivered) * 100, 1) if delivered else 0.0

    # Opens over time (grouped by day).
    opens_res = await db.execute(
        select(
            func.date(EmailSendLog.opened_at).label("day"),
            func.count(EmailSendLog.id).label("count"),
        )
        .where(*base, EmailSendLog.opened_at.is_not(None))
        .group_by(func.date(EmailSendLog.opened_at))
        .order_by(func.date(EmailSendLog.opened_at))
    )
    opens_over_time = [
        {"date": str(day), "count": int(count)} for day, count in opens_res.all()
    ]

    # Clicks over time (grouped by day).
    clicks_res = await db.execute(
        select(
            func.date(EmailSendLog.clicked_at).label("day"),
            func.count(EmailSendLog.id).label("count"),
        )
        .where(*base, EmailSendLog.clicked_at.is_not(None))
        .group_by(func.date(EmailSendLog.clicked_at))
        .order_by(func.date(EmailSendLog.clicked_at))
    )
    clicks_over_time = [
        {"date": str(day), "count": int(count)} for day, count in clicks_res.all()
    ]

    # Link clicks by URL.
    links_res = await db.execute(
        select(
            EmailSendLog.clicked_url,
            func.count(EmailSendLog.id).label("count"),
        )
        .where(*base, EmailSendLog.clicked_url.is_not(None))
        .group_by(EmailSendLog.clicked_url)
        .order_by(func.count(EmailSendLog.id).desc())
    )
    link_clicks = [
        {"url": url, "count": int(count)}
        for url, count in links_res.all()
        if url
    ]

    # Per-variant comparison (only when this is an A/B campaign).
    campaign = await get_campaign(db, ws_id, campaign_id)
    variant_comparison: list[dict] = []
    ab = campaign.ab_test if (campaign and isinstance(campaign.ab_test, dict)) else {}
    if ab.get("enabled"):
        for v in ab.get("variants", []):
            key = v.get("key", "")
            vres = await db.execute(
                select(
                    func.count(EmailSendLog.id).label("sent"),
                    func.count(EmailSendLog.opened_at).label("opens"),
                    func.count(EmailSendLog.clicked_at).label("clicks"),
                ).where(*base, EmailSendLog.variant_key == key)
            )
            vrow = vres.one()
            vsent = vrow.sent or 0
            vopens = vrow.opens or 0
            vclicks = vrow.clicks or 0
            variant_comparison.append(
                {
                    "key": key,
                    "subject": v.get("subject", ""),
                    "sent": vsent,
                    "opens": vopens,
                    "clicks": vclicks,
                    "open_rate": round((vopens / vsent) * 100, 1) if vsent else 0.0,
                    "click_rate": round((vclicks / vsent) * 100, 1) if vsent else 0.0,
                }
            )

    return {
        "delivered": delivered,
        "opens": opens,
        "clicks": clicks,
        "bounces": bounces,
        "open_rate": _rate(opens),
        "click_rate": _rate(clicks),
        "bounce_rate": _rate(bounces),
        "opens_over_time": opens_over_time,
        "clicks_over_time": clicks_over_time,
        "link_clicks": link_clicks,
        "variant_comparison": variant_comparison,
    }
