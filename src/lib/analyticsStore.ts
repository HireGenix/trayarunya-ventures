/**
 * First-party analytics store.
 * Append-only event log persisted to data/analytics-events.json.
 * No third-party services — every pageview on the live site is recorded via
 * POST /api/track and aggregated on demand for the admin Analytics page.
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'analytics-events.json');

// Keep the log bounded so the JSON file never grows without limit.
const MAX_EVENTS = 50000;

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

function ensure() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '[]');
  } catch (err) {
    console.error('[analyticsStore] ensure error', err);
  }
}

function readAll(): AnalyticsEvent[] {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8')) as AnalyticsEvent[];
  } catch {
    return [];
  }
}

function writeAll(events: AnalyticsEvent[]) {
  ensure();
  try {
    const trimmed = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(trimmed));
  } catch (err) {
    console.error('[analyticsStore] write error', err);
  }
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
  record(input: RecordInput): AnalyticsEvent {
    const events = readAll();
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
    events.push(ev);
    writeAll(events);
    return ev;
  },

  all(): AnalyticsEvent[] {
    return readAll();
  },

  since(ms: number): AnalyticsEvent[] {
    const cutoff = Date.now() - ms;
    return readAll().filter((e) => e.ts >= cutoff);
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
