/**
 * Client-safe shared types for the Marketing OS (Audiences + Journeys).
 *
 * IMPORTANT: this module must stay free of server-only imports (no prisma,
 * no aiProviders) so both client pages and server routes can import it.
 */

/* ----------------------------- Segments -------------------------------- */

export type SegmentOperator =
  | 'equals'
  | 'not_equals'
  | 'is_any_of'
  | 'contains'
  | 'within_past_days'
  | 'gte'
  | 'lte'
  | 'is_set'
  | 'is_not_set';

export type PropertyType = 'enum' | 'text' | 'number' | 'days' | 'boolean';

export interface PropertyDef {
  key: string;
  label: string;
  /** Real data source the property is evaluated against. */
  source: 'lead' | 'visitor';
  type: PropertyType;
  operators: SegmentOperator[];
  options?: string[];
  unit?: string;
  icon?: string;
}

export interface SegmentCondition {
  id: string;
  property: string;
  operator: SegmentOperator;
  value: string | string[] | number | null;
}

export interface SegmentSubFilter {
  property: string;
  operator: SegmentOperator;
  value: string | string[] | number | null;
}

export interface SegmentRow {
  id: string;
  condition: SegmentCondition;
  sub?: SegmentSubFilter | null;
}

export interface SegmentDefinition {
  joiner: 'AND' | 'OR';
  rows: SegmentRow[];
}

export interface SegmentBreakdownItem {
  label: string;
  count: number;
  pct: number;
}

export interface SegmentSampleItem {
  id: string;
  name: string;
  company: string;
  status: string;
}

export interface SegmentResult {
  /** Real matched-lead count from Postgres. */
  total: number;
  /** Total leads in the system (denominator). */
  universe: number;
  byStatus: SegmentBreakdownItem[];
  bySource: SegmentBreakdownItem[];
  byPriority: SegmentBreakdownItem[];
  byCountry: SegmentBreakdownItem[];
  trend: { date: string; count: number }[];
  /** Estimated top-of-funnel visitor reach from analytics (labelled estimate). */
  visitorReach: number;
  sample: SegmentSampleItem[];
}

export interface AudienceInsights {
  persona: string;
  summary: string;
  recommendedChannels: string[];
  messagingAngles: string[];
  nextBestActions: string[];
  riskFlags: string[];
}

export interface Audience {
  id: string;
  name: string;
  description: string;
  definition: SegmentDefinition;
  snapshot: SegmentResult | null;
  insights: AudienceInsights | null;
  syncTargets: string[];
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ Journeys ------------------------------- */

export type JourneyChannel = 'Email' | 'SMS' | 'Ads' | 'Push' | 'In-app';

export type JourneyNodeKind =
  | 'start'
  | 'split'
  | 'offer'
  | 'holdout'
  | 'send'
  | 'wait'
  | 'condition'
  | 'upsell'
  | 'remarketing'
  | 'exit';

export interface JourneyNodeConfig {
  /** A/B split percentage to branch A (0-100). */
  splitPercent?: number;
  /** Holdout control percentage (0-100). */
  holdoutPercent?: number;
  /** Wait duration before continuing. */
  waitValue?: number;
  waitUnit?: 'minutes' | 'hours' | 'days';
  /** Quiet-hours / business-hours gating. */
  businessHoursOnly?: boolean;
  /** Frequency cap per member per N days. */
  frequencyCap?: number;
  /** Condition expression for `condition` nodes. */
  conditionProperty?: string;
  conditionOperator?: SegmentOperator;
  conditionValue?: string;
  /** Ad platform target for remarketing nodes. */
  adPlatform?: string;
  enabled?: boolean;
}

export interface JourneyNodeCopy {
  subject?: string;
  body?: string;
  cta?: string;
}

export interface JourneyNode {
  id: string;
  kind: JourneyNodeKind;
  label: string;
  channel?: JourneyChannel;
  branch?: 'a' | 'b' | null;
  config: JourneyNodeConfig;
  copy?: JourneyNodeCopy;
}

export interface JourneyEdge {
  id: string;
  from: string;
  to: string;
  kind: 'solid' | 'dashed';
  label?: string;
}

export interface JourneyDefinition {
  nodes: JourneyNode[];
  edges: JourneyEdge[];
}

export interface JourneyMetrics {
  enrolled: number;
  inJourney: number;
  converted: number;
  conversionRate: number;
  holdoutLift: number;
  byChannel: { channel: string; sent: number }[];
}

export interface Journey {
  id: string;
  name: string;
  goal: string;
  status: 'draft' | 'active' | 'paused';
  audienceId: string | null;
  definition: JourneyDefinition;
  metrics: JourneyMetrics | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------- Agent request shapes ------------------------ */

export type AudienceAgentMode = 'generate' | 'insights' | 'enrich';
export type JourneyAgentMode = 'design' | 'copy' | 'optimize';

export interface JourneyOptimizeResult {
  score: number;
  summary: string;
  improvements: { title: string; detail: string; impact: 'high' | 'medium' | 'low' }[];
  missingChannels: string[];
}
