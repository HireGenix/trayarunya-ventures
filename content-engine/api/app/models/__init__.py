"""Import all ORM models so Alembic + metadata.create_all see them."""
from app.models.base import Base
from app.models.tenant import User, Organization, Workspace, Membership, OrgType, Role
from app.models.brand import BrandBrain
from app.models.research import ResearchJob, Competitor, Insight, JobStatus, AuditSnapshot
from app.models.strategy import Strategy
from app.models.content import (
    ContentItem,
    Asset,
    ContentCalendar,
    ContentImage,
    ContentStatus,
    ContentType,
)
from app.models.social import (
    SocialAccount,
    Schedule,
    SocialPlatform,
    ScheduleStatus,
)
from app.models.ads import AdAccount, Campaign, Metric, AdPlatform, CampaignStatus
from app.models.billing import Plan, UsageRecord
from app.models.report import Report
from app.models.engagement import Notification, LearningSignal
from app.models.platform import (
    Experiment,
    Integration,
    CompetitorWatch,
    WatchEvent,
    AbmAccount,
    CampaignPlan,
    Comment,
    Approval,
    ContentVersion,
    AuditLog,
    Benchmark,
)
from app.models.attribution import RevenueEvent
from app.models.portal_client import (
    ClientPortalInvite,
    ClientPortalMember,
    InviteStatus,
    PortalRole,
)

__all__ = [
    "Base",
    "User",
    "Organization",
    "Workspace",
    "Membership",
    "OrgType",
    "Role",
    "BrandBrain",
    "ResearchJob",
    "Competitor",
    "Insight",
    "JobStatus",
    "AuditSnapshot",
    "Strategy",
    "ContentItem",
    "Asset",
    "ContentCalendar",
    "ContentImage",
    "ContentStatus",
    "ContentType",
    "SocialAccount",
    "Schedule",
    "SocialPlatform",
    "ScheduleStatus",
    "AdAccount",
    "Campaign",
    "Metric",
    "AdPlatform",
    "CampaignStatus",
    "Plan",
    "UsageRecord",
    "Report",
    "Notification",
    "LearningSignal",
    "Experiment",
    "Integration",
    "CompetitorWatch",
    "WatchEvent",
    "AbmAccount",
    "CampaignPlan",
    "Comment",
    "Approval",
    "ContentVersion",
    "AuditLog",
    "Benchmark",
    "RevenueEvent",
    "ClientPortalInvite",
    "ClientPortalMember",
    "InviteStatus",
    "PortalRole",
]
