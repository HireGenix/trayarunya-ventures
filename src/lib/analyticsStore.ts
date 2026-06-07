/**
 * First-party analytics store — append-only event log in Azure Postgres (Prisma).
 * Every pageview on the live site is recorded via POST /api/track and aggregated
 * on demand for the admin Analytics page.
 */
import { prisma } from '@/lib/prisma';

export interface AnalyticsEvent {
  id: string;
  type: 'pageview' | 'event';
  path: string;
  title?: string;
  referrer?: string;
  source: string; // direct | google | linkedin | ... | referral
  device: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  country: string;
  countryCode: string;
  sessionId: string;
  visitorId: string;
  name?: string; // for custom events
  category?: string;
  durationMs?: number;
  ts: number;
}

export type Timeframe = 'today' | 'yesterday' | 'week' | 'month' | 'year';

interface Row {
  id: string;
  type: string;
  path: string;
  title: string | null;
  referrer: string | null;
  source: string;
  device: string;
  browser: string;
  os: string;
  country: string;
  countryCode: string;
  sessionId: string;
  visitorId: string;
  name: string | null;
  category: string | null;
  durationMs: number | null;
  ts: bigint;
}

function toEvent(row: Row): AnalyticsEvent {
  return {
    id: row.id,
    type: row.type === 'event' ? 'event' : 'pageview',
    path: row.path,
    title: row.title ?? undefined,
    referrer: row.referrer ?? undefined,
    source: row.source,
    device: (row.device as AnalyticsEvent['device']) || 'desktop',
    browser: row.browser,
    os: row.os,
    country: row.country,
    countryCode: row.countryCode,
    sessionId: row.sessionId,
    visitorId: row.visitorId,
    name: row.name ?? undefined,
    category: row.category ?? undefined,
    durationMs: row.durationMs ?? undefined,
    ts: Number(row.ts),
  };
}

export function parseDevice(ua: string): 'desktop' | 'mobile' | 'tablet' {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(s)) return 'mobile';
  if (/android/.test(s)) return 'tablet';
  return 'desktop';
}

export function parseBrowser(ua: string): string {
  const s = ua;
  if (/Edg\//.test(s)) return 'Edge';
  if (/OPR\/|Opera/.test(s)) return 'Opera';
  if (/Chrome\//.test(s) && !/Chromium/.test(s)) return 'Chrome';
  if (/Firefox\//.test(s)) return 'Firefox';
  if (/Safari\//.test(s) && /Version\//.test(s)) return 'Safari';
  if (/MSIE|Trident/.test(s)) return 'Internet Explorer';
  return 'Other';
}

export function parseOS(ua: string): string {
  const s = ua;
  if (/Windows NT/.test(s)) return 'Windows';
  if (/Mac OS X/.test(s) && !/iPhone|iPad/.test(s)) return 'macOS';
  if (/Android/.test(s)) return 'Android';
  if (/iPhone|iPad|iPod/.test(s)) return 'iOS';
  if (/Linux/.test(s)) return 'Linux';
  return 'Other';
}

export function sourceFromReferrer(referrer: string, host: string): string {
  if (!referrer) return 'direct';
  let ref: URL;
  try {
    ref = new URL(referrer);
  } catch {
    return 'direct';
  }
  const h = ref.hostname.replace(/^www\./, '');
  if (host && h === host.replace(/^www\./, '')) return 'direct';
  if (/google\./.test(h)) return 'google';
  if (/bing\./.test(h)) return 'bing';
  if (/duckduckgo\./.test(h)) return 'duckduckgo';
  if (/linkedin\./.test(h)) return 'linkedin';
  if (/facebook\.|fb\.com/.test(h)) return 'facebook';
  if (/instagram\./.test(h)) return 'instagram';
  if (/t\.co|twitter\.|x\.com/.test(h)) return 'twitter';
  if (/youtube\./.test(h)) return 'youtube';
  if (/reddit\./.test(h)) return 'reddit';
  return 'referral';
}

export interface RecordInput {
  type?: 'pageview' | 'event';
  path: string;
  title?: string;
  referrer?: string;
  sessionId?: string;
  visitorId?: string;
  name?: string;
  category?: string;
  durationMs?: number;
  ua: string;
  host: string;
  country?: string;
  countryCode?: string;
}

export const analyticsStore = {
  async record(input: RecordInput): Promise<AnalyticsEvent> {
    const ev: AnalyticsEvent = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      type: input.type || 'pageview',
      path: (input.path || '/').slice(0, 300),
      title: input.title?.slice(0, 200),
      referrer: input.referrer?.slice(0, 300),
      source: sourceFromReferrer(input.referrer || '', input.host),
      device: parseDevice(input.ua),
      browser: parseBrowser(input.ua),
      os: parseOS(input.ua),
      country: input.country || 'Unknown',
      countryCode: input.countryCode || 'XX',
      sessionId: (input.sessionId || 'anon').slice(0, 64),
      visitorId: (input.visitorId || input.sessionId || 'anon').slice(0, 64),
      name: input.name?.slice(0, 80),
      category: input.category?.slice(0, 40),
      durationMs: typeof input.durationMs === 'number' ? input.durationMs : undefined,
      ts: Date.now(),
    };
    await prisma.analyticsEvent.create({
      data: {
        id: ev.id,
        type: ev.type,
        path: ev.path,
        title: ev.title,
        referrer: ev.referrer,
        source: ev.source,
        device: ev.device,
        browser: ev.browser,
        os: ev.os,
        country: ev.country,
        countryCode: ev.countryCode,
        sessionId: ev.sessionId,
        visitorId: ev.visitorId,
        name: ev.name,
        category: ev.category,
        durationMs: ev.durationMs,
        ts: BigInt(ev.ts),
      },
    });
    return ev;
  },

  async all(): Promise<AnalyticsEvent[]> {
    const rows = await prisma.analyticsEvent.findMany({ orderBy: { ts: 'asc' } });
    return rows.map(toEvent);
  },

  async since(ms: number): Promise<AnalyticsEvent[]> {
    const cutoff = BigInt(Date.now() - ms);
    const rows = await prisma.analyticsEvent.findMany({
      where: { ts: { gte: cutoff } },
      orderBy: { ts: 'asc' },
    });
    return rows.map(toEvent);
  },
};

export function timeframeMs(tf: Timeframe): number {
  const day = 24 * 60 * 60 * 1000;
  switch (tf) {
    case 'today':
      return day;
    case 'yesterday':
      return 2 * day;
    case 'week':
      return 7 * day;
    case 'month':
      return 30 * day;
    case 'year':
      return 365 * day;
    default:
      return 30 * day;
  }
}

export function timeframeDays(tf: Timeframe): number {
  switch (tf) {
    case 'today':
    case 'yesterday':
      return 1;
    case 'week':
      return 7;
    case 'month':
      return 30;
    case 'year':
      return 365;
    default:
      return 30;
  }
}
