"""seo god tier: SERP features, backlinks, referring domains, link graph, topic clusters.

Adds five new workspace-scoped SEO tables (``seo_serp_features``,
``seo_backlinks``, ``seo_referring_domains``, ``seo_link_graphs``,
``seo_topic_clusters``) and a ``serp_features`` JSONB column on
``seo_keywords``. All data stored here is derived from real SERP/crawl/GSC
exports — never fabricated provider metrics.

Revision ID: 0020_seo_god_tier
Revises: 0019_seo_upgrade
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0020_seo_god_tier"
down_revision: Union[str, None] = "0019_seo_upgrade"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    op.create_table(
        "seo_serp_features",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("keyword_id", UUID(as_uuid=True), nullable=False),
        sa.Column("features", JSONB(), nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["keyword_id"], ["seo_keywords.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_seo_serp_features_workspace_id", "seo_serp_features", ["workspace_id"])
    op.create_index("ix_seo_serp_features_keyword_id", "seo_serp_features", ["keyword_id"])

    op.create_table(
        "seo_backlinks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("source_url", sa.String(length=1000), nullable=False),
        sa.Column("target_url", sa.String(length=1000), nullable=False),
        sa.Column("anchor_text", sa.String(length=500), nullable=True),
        sa.Column("referring_domain", sa.String(length=300), nullable=False),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_file", sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_seo_backlinks_workspace_id", "seo_backlinks", ["workspace_id"])

    op.create_table(
        "seo_referring_domains",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("domain", sa.String(length=300), nullable=False),
        sa.Column("backlink_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_seo_referring_domains_workspace_id", "seo_referring_domains", ["workspace_id"])

    op.create_table(
        "seo_link_graphs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("site_audit_id", UUID(as_uuid=True), nullable=True),
        sa.Column("base_url", sa.String(length=1000), nullable=False),
        sa.Column("graph", JSONB(), nullable=True),
        sa.Column("orphan_pages", JSONB(), nullable=True),
        sa.Column("suggestions", JSONB(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="running"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["site_audit_id"], ["seo_site_crawl_audits.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_seo_link_graphs_workspace_id", "seo_link_graphs", ["workspace_id"])
    op.create_index("ix_seo_link_graphs_site_audit_id", "seo_link_graphs", ["site_audit_id"])

    op.create_table(
        "seo_topic_clusters",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("topic", sa.String(length=200), nullable=False),
        sa.Column("keywords", JSONB(), nullable=True),
        sa.Column("keyword_ids", JSONB(), nullable=True),
        sa.Column("coverage_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("authority_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pillar_gaps", JSONB(), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_seo_topic_clusters_workspace_id", "seo_topic_clusters", ["workspace_id"])

    if not _has_column(bind, "seo_keywords", "serp_features"):
        op.add_column("seo_keywords", sa.Column("serp_features", JSONB(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()

    if _has_column(bind, "seo_keywords", "serp_features"):
        op.drop_column("seo_keywords", "serp_features")

    op.drop_index("ix_seo_topic_clusters_workspace_id", table_name="seo_topic_clusters")
    op.drop_table("seo_topic_clusters")

    op.drop_index("ix_seo_link_graphs_site_audit_id", table_name="seo_link_graphs")
    op.drop_index("ix_seo_link_graphs_workspace_id", table_name="seo_link_graphs")
    op.drop_table("seo_link_graphs")

    op.drop_index("ix_seo_referring_domains_workspace_id", table_name="seo_referring_domains")
    op.drop_table("seo_referring_domains")

    op.drop_index("ix_seo_backlinks_workspace_id", table_name="seo_backlinks")
    op.drop_table("seo_backlinks")

    op.drop_index("ix_seo_serp_features_keyword_id", table_name="seo_serp_features")
    op.drop_index("ix_seo_serp_features_workspace_id", table_name="seo_serp_features")
    op.drop_table("seo_serp_features")
