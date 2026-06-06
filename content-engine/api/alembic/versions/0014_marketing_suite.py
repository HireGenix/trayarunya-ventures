"""marketing suite: 13 agentic modules (email, messaging, social inbox, seo,
funnels, forms, lead scoring, referrals, reputation, budget pacing, influencers,
marketing mix modeling, brand guardrails).

Creates all 46 tables for the new modules straight from the SQLAlchemy model
metadata so the schema can never drift from the ORM definitions. Idempotent via
``checkfirst=True`` — safe to re-run and safe alongside the dev create_all path.

Revision ID: 0014_marketing_suite
Revises: 0013_admin_client_limit
"""
from __future__ import annotations

from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0014_marketing_suite"
down_revision: Union[str, None] = "0013_admin_client_limit"
branch_labels = None
depends_on = None

# Tables owned by the 13 marketing-suite modules.
NEW_TABLES = [
    # email
    "email_lists", "email_subscribers", "email_campaigns", "email_sequences",
    "email_send_logs",
    # messaging (sms/whatsapp)
    "messaging_contacts", "messaging_templates", "messaging_broadcasts",
    "messaging_logs",
    # social inbox + listening
    "social_inbox_items", "social_inbox_replies", "social_listening_keywords",
    "social_listening_hits",
    # seo
    "seo_keywords", "seo_rank_snapshots", "seo_audits", "seo_content_briefs",
    # funnels / landing pages
    "funnels_landing_pages", "funnels_funnels", "funnels_visits",
    # forms & surveys
    "forms_forms", "forms_submissions",
    # lead scoring & nurture
    "leadscore_leads", "leadscore_activities", "leadscore_rules",
    # referrals / affiliate / loyalty
    "referral_programs", "referral_advocates", "referral_conversions",
    "referral_loyalty_ledger",
    # reputation
    "reputation_reviews", "reputation_review_requests", "reputation_sources",
    # budget pacing
    "budgetpacing_budgets", "budgetpacing_spend_records", "budgetpacing_alerts",
    "budgetpacing_proposals",
    # influencers / ugc
    "influencer_creators", "influencer_outreach", "influencer_campaigns",
    "influencer_ugc_assets",
    # marketing mix modeling
    "mmm_models", "mmm_channel_spend_series", "mmm_incrementality_tests",
    # brand guardrails
    "guardrail_policies", "guardrail_checks", "guardrail_rules",
]


def _new_tables() -> list:
    # Import inside the function so Alembic registers every model on Base.metadata.
    import app.models  # noqa: F401  (imports all module models)
    from app.models.base import Base

    return [
        Base.metadata.tables[name]
        for name in NEW_TABLES
        if name in Base.metadata.tables
    ]


def upgrade() -> None:
    bind = op.get_bind()
    from app.models.base import Base

    Base.metadata.create_all(bind=bind, tables=_new_tables(), checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    from app.models.base import Base

    Base.metadata.drop_all(bind=bind, tables=list(reversed(_new_tables())), checkfirst=True)
