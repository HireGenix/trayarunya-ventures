"""linkedin platform — accounts, leads, pipeline, observations, outreach

Revision ID: 0006_linkedin_platform
Revises: 0005_linkedin_growth
Create Date: 2026-06-04
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006_linkedin_platform"
down_revision: Union[str, None] = "0005_linkedin_growth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _ts_cols() -> list:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "linkedin_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("profile_url", sa.String(length=600), nullable=True),
        sa.Column("objective", sa.String(length=120), nullable=False, server_default="high_ticket_leads"),
        sa.Column("icp", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("offer", sa.Text(), nullable=True),
        sa.Column("voice", sa.Text(), nullable=True),
        sa.Column("session_partition", sa.String(length=120), nullable=True),
        sa.Column("proxy_url", sa.String(length=400), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("daily_connect_cap", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("daily_message_cap", sa.Integer(), nullable=False, server_default="25"),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_linkedin_accounts_workspace_id", "linkedin_accounts", ["workspace_id"])
    op.create_index("ix_linkedin_accounts_status", "linkedin_accounts", ["status"])

    op.create_table(
        "linkedin_leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("full_name", sa.String(length=240), nullable=False),
        sa.Column("headline", sa.String(length=600), nullable=True),
        sa.Column("company", sa.String(length=240), nullable=True),
        sa.Column("role_title", sa.String(length=240), nullable=True),
        sa.Column("location", sa.String(length=240), nullable=True),
        sa.Column("profile_url", sa.String(length=600), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("stage", sa.String(length=30), nullable=False, server_default="new"),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="medium"),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("enrichment", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=80), nullable=True),
        sa.Column("connect_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_action_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_action_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["linkedin_accounts.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_linkedin_leads_workspace_id", "linkedin_leads", ["workspace_id"])
    op.create_index("ix_linkedin_leads_account_id", "linkedin_leads", ["account_id"])
    op.create_index("ix_linkedin_leads_profile_url", "linkedin_leads", ["profile_url"])
    op.create_index("ix_linkedin_leads_stage", "linkedin_leads", ["stage"])
    op.create_index("ix_linkedin_leads_priority", "linkedin_leads", ["priority"])
    op.create_index("ix_linkedin_leads_next_action_at", "linkedin_leads", ["next_action_at"])

    op.create_table(
        "linkedin_lead_stage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_stage", sa.String(length=30), nullable=True),
        sa.Column("to_stage", sa.String(length=30), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_name", sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["linkedin_leads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_linkedin_lead_stage_events_workspace_id", "linkedin_lead_stage_events", ["workspace_id"])
    op.create_index("ix_linkedin_lead_stage_events_lead_id", "linkedin_lead_stage_events", ["lead_id"])

    op.create_table(
        "linkedin_lead_observations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source", sa.String(length=40), nullable=False, server_default="vision"),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("signals", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("recommended_action", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["linkedin_leads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["linkedin_accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_linkedin_lead_observations_workspace_id", "linkedin_lead_observations", ["workspace_id"])
    op.create_index("ix_linkedin_lead_observations_lead_id", "linkedin_lead_observations", ["lead_id"])

    op.create_table(
        "linkedin_outreach_sequences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("objective", sa.String(length=120), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["linkedin_accounts.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_linkedin_outreach_sequences_workspace_id", "linkedin_outreach_sequences", ["workspace_id"])

    op.create_table(
        "linkedin_outreach_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sequence_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("step_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("channel", sa.String(length=40), nullable=False, server_default="linkedin"),
        sa.Column("action_type", sa.String(length=40), nullable=False, server_default="message"),
        sa.Column("day_offset", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("template", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sequence_id"], ["linkedin_outreach_sequences.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_linkedin_outreach_steps_workspace_id", "linkedin_outreach_steps", ["workspace_id"])
    op.create_index("ix_linkedin_outreach_steps_sequence_id", "linkedin_outreach_steps", ["sequence_id"])

    op.create_table(
        "linkedin_lead_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sequence_step_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("task_type", sa.String(length=40), nullable=False, server_default="research"),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("suggested_copy", sa.Text(), nullable=True),
        sa.Column("policy_note", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["linkedin_leads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["linkedin_accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["sequence_step_id"], ["linkedin_outreach_steps.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("lead_id", "task_type", "sequence_step_id", name="uq_lead_task_step"),
    )
    op.create_index("ix_linkedin_lead_tasks_workspace_id", "linkedin_lead_tasks", ["workspace_id"])
    op.create_index("ix_linkedin_lead_tasks_lead_id", "linkedin_lead_tasks", ["lead_id"])
    op.create_index("ix_linkedin_lead_tasks_account_id", "linkedin_lead_tasks", ["account_id"])
    op.create_index("ix_linkedin_lead_tasks_task_type", "linkedin_lead_tasks", ["task_type"])
    op.create_index("ix_linkedin_lead_tasks_priority", "linkedin_lead_tasks", ["priority"])
    op.create_index("ix_linkedin_lead_tasks_status", "linkedin_lead_tasks", ["status"])
    op.create_index("ix_linkedin_lead_tasks_due_date", "linkedin_lead_tasks", ["due_date"])


def downgrade() -> None:
    op.drop_table("linkedin_lead_tasks")
    op.drop_table("linkedin_outreach_steps")
    op.drop_table("linkedin_outreach_sequences")
    op.drop_table("linkedin_lead_observations")
    op.drop_table("linkedin_lead_stage_events")
    op.drop_table("linkedin_leads")
    op.drop_table("linkedin_accounts")
