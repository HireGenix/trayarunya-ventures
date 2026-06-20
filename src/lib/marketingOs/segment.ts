/**
 * Real segment engine. Evaluates a SegmentDefinition against the agency's
 * actual data in Postgres (leads + first-party analytics) and returns true
 * member counts, breakdowns and an estimated visitor reach.
 *
 * Server-only (imports prisma). Never import into a client component.
 */
import { prisma } from '@/lib/prisma';
import type {
  PropertyDef,
  SegmentCondition,
  SegmentDefinition,
  SegmentResult,
  SegmentSubFilter,
} from './types';

/* --------------------- Real property registry -------------------------- */
/**
 * Every property maps to a real column on the leads table (or, for `visitor`
 * sourced properties, to the analytics event log). Operators are constrained
 * per property so both the UI and the AI generator stay grounded.
 */
export const PROPERTY_REGISTRY: PropertyDef[] = [
  {
    key: 'status',
    label: 'Lead status',
    source: 'lead',
    type: 'enum',
    operators: ['equals', 'not_equals', 'is_any_of'],
    options: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'],
    icon: 'flag',
  },
  {
    key: 'source',
    label: 'Lead source',
    source: 'lead',
    type: 'enum',
    operators: ['equals', 'not_equals', 'is_any_of'],
    options: [
      'Website Contact Form',
      'Newsletter Signup',
      'Demo Request',
      'Webinar Registration',
      'Event',
      'Referral',
      'Social Media',
      'Email Campaign',
      'Other',
    ],
    icon: 'hub',
  },
  {
    key: 'priority',
    label: 'Priority',
    source: 'lead',
    type: 'enum',
    operators: ['equals', 'not_equals', 'is_any_of'],
    options: ['Low', 'Medium', 'High'],
    icon: 'priority',
  },
  {
    key: 'company',
    label: 'Company',
    source: 'lead',
    type: 'text',
    operators: ['contains', 'is_set', 'is_not_set'],
    icon: 'business',
  },
  {
    key: 'position',
    label: 'Job title',
    source: 'lead',
    type: 'text',
    operators: ['contains', 'is_set', 'is_not_set'],
    icon: 'badge',
  },
  {
    key: 'emailDomain',
    label: 'Email domain',
    source: 'lead',
    type: 'text',
    operators: ['contains', 'equals'],
    icon: 'mail',
  },
  {
    key: 'tag',
    label: 'Tag',
    source: 'lead',
    type: 'text',
    operators: ['contains', 'is_any_of'],
    icon: 'tag',
  },
  {
    key: 'createdWithinDays',
    label: 'Created',
    source: 'lead',
    type: 'days',
    operators: ['within_past_days'],
    unit: 'days',
    icon: 'clock',
  },
  {
    key: 'contacted',
    label: 'Has been contacted',
    source: 'lead',
    type: 'boolean',
    operators: ['is_set', 'is_not_set'],
    icon: 'check',
  },
  {
    key: 'country',
    label: 'Country',
    source: 'visitor',
    type: 'text',
    operators: ['equals', 'is_any_of', 'contains'],
    icon: 'public',
  },
  {
    key: 'device',
    label: 'Device',
    source: 'visitor',
    type: 'enum',
    operators: ['equals', 'is_any_of'],
    options: ['desktop', 'mobile', 'tablet'],
    icon: 'devices',
  },
  {
    key: 'trafficSource',
    label: 'Traffic source',
    source: 'visitor',
    type: 'text',
    operators: ['equals', 'is_any_of', 'contains'],
    icon: 'route',
  },
];

export function getProperty(key: string): PropertyDef | undefined {
  return PROPERTY_REGISTRY.find((p) => p.key === key);
}

/* ----------------------------- Lead shape ------------------------------ */
interface LeadRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  position: string | null;
  status: string;
  source: string;
  priority: string;
  tags: string[];
  date: string;
  lastContactedDate: string | null;
  country?: string | null;
}

function asArray(v: SegmentCondition['value']): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).toLowerCase());
  if (v === null || v === undefined) return [];
  return [String(v).toLowerCase()];
}

function leadFieldValue(lead: LeadRow, key: string): string | string[] | number | boolean | null {
  switch (key) {
    case 'status':
      return lead.status;
    case 'source':
      return lead.source;
    case 'priority':
      return lead.priority;
    case 'company':
      return lead.company ?? null;
    case 'position':
      return lead.position ?? null;
    case 'emailDomain':
      return lead.email.includes('@') ? lead.email.split('@')[1] : null;
    case 'tag':
      return lead.tags ?? [];
    case 'contacted':
      return lead.lastContactedDate ? true : null;
    case 'createdWithinDays': {
      const ms = Date.now() - new Date(lead.date).getTime();
      return Math.floor(ms / (24 * 60 * 60 * 1000));
    }
    default:
      return null;
  }
}

/** Evaluate a single predicate (condition or sub-filter) against a lead. */
function matchPredicate(
  lead: LeadRow,
  pred: SegmentCondition | SegmentSubFilter,
): boolean {
  const prop = getProperty(pred.property);
  // Visitor-sourced properties cannot be evaluated against a lead record;
  // they contribute only to reach estimation, so treat as pass-through here.
  if (!prop || prop.source === 'visitor') return true;

  const raw = leadFieldValue(lead, pred.property);
  const op = pred.operator;
  const wanted = asArray(pred.value);

  switch (op) {
    case 'is_set':
      return raw !== null && raw !== '' && !(Array.isArray(raw) && raw.length === 0);
    case 'is_not_set':
      return raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
    case 'equals':
      return Array.isArray(raw)
        ? raw.map((x) => x.toLowerCase()).includes(wanted[0])
        : String(raw ?? '').toLowerCase() === wanted[0];
    case 'not_equals':
      return String(raw ?? '').toLowerCase() !== wanted[0];
    case 'is_any_of':
      return Array.isArray(raw)
        ? raw.some((x) => wanted.includes(x.toLowerCase()))
        : wanted.includes(String(raw ?? '').toLowerCase());
    case 'contains':
      return Array.isArray(raw)
        ? raw.some((x) => x.toLowerCase().includes(wanted[0] ?? ''))
        : String(raw ?? '').toLowerCase().includes(wanted[0] ?? '');
    case 'within_past_days': {
      const days = Number(pred.value);
      return typeof raw === 'number' && Number.isFinite(days) ? raw <= days : false;
    }
    case 'gte':
      return typeof raw === 'number' ? raw >= Number(pred.value) : false;
    case 'lte':
      return typeof raw === 'number' ? raw <= Number(pred.value) : false;
    default:
      return false;
  }
}

function matchRow(lead: LeadRow, row: SegmentDefinition['rows'][number]): boolean {
  const base = matchPredicate(lead, row.condition);
  if (!row.sub) return base;
  return base && matchPredicate(lead, row.sub);
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function breakdown(leads: LeadRow[], key: keyof LeadRow): { label: string; count: number; pct: number }[] {
  const map = new Map<string, number>();
  for (const l of leads) {
    const v = (l[key] as string) || 'Unknown';
    map.set(v, (map.get(v) || 0) + 1);
  }
  const total = leads.length;
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count, pct: pct(count, total) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

/**
 * Evaluate a segment against real data. Returns true matched-lead counts plus
 * breakdowns, a 14-day trend, and an estimated visitor reach from analytics.
 */
export async function evaluateSegment(def: SegmentDefinition): Promise<SegmentResult> {
  const rows = (await prisma.lead.findMany()) as unknown as LeadRow[];
  const universe = rows.length;

  const activeRows = (def.rows || []).filter((r) => r.condition && r.condition.property);

  const matched =
    activeRows.length === 0
      ? rows
      : rows.filter((lead) =>
          def.joiner === 'OR'
            ? activeRows.some((r) => matchRow(lead, r))
            : activeRows.every((r) => matchRow(lead, r)),
        );

  // Visitor reach: if any visitor-sourced property is used, scope analytics by it.
  const visitorReach = await estimateVisitorReach(activeRows);

  // 14-day trend of matched leads.
  const trendMap = new Map<string, number>();
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    trendMap.set(d.toISOString().split('T')[0], 0);
  }
  for (const l of matched) {
    const d = new Date(l.date).toISOString().split('T')[0];
    if (trendMap.has(d)) trendMap.set(d, (trendMap.get(d) || 0) + 1);
  }

  return {
    total: matched.length,
    universe,
    byStatus: breakdown(matched, 'status'),
    bySource: breakdown(matched, 'source'),
    byPriority: breakdown(matched, 'priority'),
    byCountry: [],
    trend: Array.from(trendMap.entries()).map(([date, count]) => ({ date, count })),
    visitorReach,
    sample: matched.slice(0, 8).map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company || '—',
      status: l.status,
    })),
  };
}

async function estimateVisitorReach(
  rows: SegmentDefinition['rows'],
): Promise<number> {
  try {
    const visitorPreds = rows
      .map((r) => r.condition)
      .filter((c) => getProperty(c.property)?.source === 'visitor');

    // Pull last-30-day visitor events.
    const since = BigInt(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = (await prisma.analyticsEvent.findMany({
      where: { ts: { gte: since } },
      select: { visitorId: true, country: true, device: true, source: true },
    })) as { visitorId: string; country: string; device: string; source: string }[];

    const filtered = events.filter((e) =>
      visitorPreds.every((p) => {
        const wanted = asArray(p.value);
        const field =
          p.property === 'country' ? e.country : p.property === 'device' ? e.device : e.source;
        const val = (field || '').toLowerCase();
        switch (p.operator) {
          case 'equals':
            return val === wanted[0];
          case 'is_any_of':
            return wanted.includes(val);
          case 'contains':
            return val.includes(wanted[0] ?? '');
          default:
            return true;
        }
      }),
    );

    return new Set(filtered.map((e) => e.visitorId)).size;
  } catch {
    return 0;
  }
}
