/**
 * Aggregations over the first-party analytics event log.
 * Produces the exact shapes the admin Analytics page expects.
 */
import {
  analyticsStore,
  timeframeMs,
  timeframeDays,
  type AnalyticsEvent,
  type Timeframe,
} from './analyticsStore';

function eventsFor(tf: Timeframe): AnalyticsEvent[] {
  if (tf === 'yesterday') {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return analyticsStore.all().filter((e) => e.ts >= now - 2 * day && e.ts < now - day);
  }
  return analyticsStore.since(timeframeMs(tf));
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export function overview(tf: Timeframe) {
  const events = eventsFor(tf).filter((e) => e.type === 'pageview');
  const pageViews = events.length;
  const sessions = new Set(events.map((e) => e.sessionId));
  const visitors = new Set(events.map((e) => e.visitorId));

  // Bounce = sessions with exactly one pageview.
  const perSession = new Map<string, number>();
  for (const e of events) perSession.set(e.sessionId, (perSession.get(e.sessionId) || 0) + 1);
  const bounced = [...perSession.values()].filter((c) => c === 1).length;

  // Avg session duration from spread of timestamps within a session.
  const sessionTimes = new Map<string, { min: number; max: number }>();
  for (const e of events) {
    const cur = sessionTimes.get(e.sessionId);
    if (!cur) sessionTimes.set(e.sessionId, { min: e.ts, max: e.ts });
    else {
      cur.min = Math.min(cur.min, e.ts);
      cur.max = Math.max(cur.max, e.ts);
    }
  }
  const durations = [...sessionTimes.values()].map((s) => (s.max - s.min) / 1000);
  const avgSessionDuration =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Conversion = sessions that hit /contact or a custom "lead" event.
  const converted = new Set(
    events.filter((e) => /\/contact/.test(e.path)).map((e) => e.sessionId)
  );

  return {
    totalVisitors: sessions.size,
    uniqueVisitors: visitors.size,
    pageViews,
    bounceRate: pct(bounced, perSession.size),
    avgSessionDuration,
    conversionRate: pct(converted.size, sessions.size),
    timeframe: tf,
  };
}

export function trafficSources(tf: Timeframe) {
  const events = eventsFor(tf).filter((e) => e.type === 'pageview');
  const bySource = new Map<string, Set<string>>();
  for (const e of events) {
    if (!bySource.has(e.source)) bySource.set(e.source, new Set());
    bySource.get(e.source)!.add(e.sessionId);
  }
  const total = new Set(events.map((e) => e.sessionId)).size;
  return [...bySource.entries()]
    .map(([source, set]) => ({
      source,
      visitors: set.size,
      percentage: pct(set.size, total),
      change: 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);
}

export function pagePerformance(tf: Timeframe) {
  const events = eventsFor(tf).filter((e) => e.type === 'pageview');
  const byPath = new Map<
    string,
    { views: number; visitors: Set<string>; title: string; durations: number[]; bounces: number }
  >();
  const perSession = new Map<string, number>();
  for (const e of events) perSession.set(e.sessionId, (perSession.get(e.sessionId) || 0) + 1);

  for (const e of events) {
    if (!byPath.has(e.path))
      byPath.set(e.path, { views: 0, visitors: new Set(), title: e.title || e.path, durations: [], bounces: 0 });
    const rec = byPath.get(e.path)!;
    rec.views += 1;
    rec.visitors.add(e.visitorId);
    if (e.title) rec.title = e.title;
    if (e.durationMs) rec.durations.push(e.durationMs / 1000);
    if (perSession.get(e.sessionId) === 1) rec.bounces += 1;
  }

  return [...byPath.entries()]
    .map(([path, r]) => ({
      path,
      title: r.title,
      views: r.views,
      uniqueViews: r.visitors.size,
      avgTimeOnPage: r.durations.length
        ? Math.round(r.durations.reduce((a, b) => a + b, 0) / r.durations.length)
        : 0,
      bounceRate: pct(r.bounces, r.views),
      exitRate: pct(r.bounces, r.views),
    }))
    .sort((a, b) => b.views - a.views);
}

function breakdown<T extends string>(events: AnalyticsEvent[], key: (e: AnalyticsEvent) => T) {
  const map = new Map<T, Set<string>>();
  for (const e of events) {
    const k = key(e);
    if (!map.has(k)) map.set(k, new Set());
    map.get(k)!.add(e.sessionId);
  }
  const total = new Set(events.map((e) => e.sessionId)).size;
  return [...map.entries()]
    .map(([k, set]) => ({ key: k, sessions: set.size, percentage: pct(set.size, total) }))
    .sort((a, b) => b.sessions - a.sessions);
}

export function devices(tf: Timeframe) {
  return breakdown(eventsFor(tf), (e) => e.device).map((d) => ({
    device: d.key as 'desktop' | 'mobile' | 'tablet',
    sessions: d.sessions,
    percentage: d.percentage,
  }));
}

export function browsers(tf: Timeframe) {
  return breakdown(eventsFor(tf), (e) => e.browser).map((d) => ({
    browser: d.key,
    sessions: d.sessions,
    percentage: d.percentage,
  }));
}

const COUNTRY_CODES: Record<string, string> = {
  India: 'IN',
  'United States': 'US',
  'United Kingdom': 'GB',
  Canada: 'CA',
  Australia: 'AU',
  Germany: 'DE',
  Unknown: 'XX',
};

export function countries(tf: Timeframe) {
  return breakdown(eventsFor(tf), (e) => e.country).map((d) => ({
    country: d.key,
    code: COUNTRY_CODES[d.key] || 'XX',
    sessions: d.sessions,
    percentage: d.percentage,
  }));
}

export function timeSeries(tf: Timeframe) {
  const days = timeframeDays(tf);
  const events = eventsFor(tf).filter((e) => e.type === 'pageview');
  const byDay = new Map<string, { visitors: Set<string>; views: number }>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    byDay.set(d.toISOString().split('T')[0], { visitors: new Set(), views: 0 });
  }
  for (const e of events) {
    const day = new Date(e.ts).toISOString().split('T')[0];
    const rec = byDay.get(day);
    if (rec) {
      rec.views += 1;
      rec.visitors.add(e.visitorId);
    }
  }
  return [...byDay.entries()].map(([date, r]) => ({
    date,
    visitors: r.visitors.size,
    pageViews: r.views,
  }));
}

export function events(tf: Timeframe) {
  const evs = eventsFor(tf).filter((e) => e.type === 'event');
  const byName = new Map<string, { count: number; users: Set<string>; category: string }>();
  for (const e of evs) {
    const name = e.name || 'event';
    if (!byName.has(name)) byName.set(name, { count: 0, users: new Set(), category: e.category || 'general' });
    const rec = byName.get(name)!;
    rec.count += 1;
    rec.users.add(e.visitorId);
  }
  return [...byName.entries()].map(([name, r]) => ({
    name,
    count: r.count,
    uniqueUsers: r.users.size,
    category: r.category,
  }));
}

export function conversions(tf: Timeframe) {
  const events = eventsFor(tf).filter((e) => e.type === 'pageview');
  const totalSessions = new Set(events.map((e) => e.sessionId)).size;
  const contact = new Set(events.filter((e) => /\/contact/.test(e.path)).map((e) => e.sessionId)).size;
  return [
    {
      goal: 'Contact page visit',
      completions: contact,
      conversionRate: pct(contact, totalSessions),
      value: contact * 100,
    },
  ];
}
