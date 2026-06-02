import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isCrawl4aiConfigured } from '@/lib/chatSalesConfig';
import { nativeScrape } from '@/lib/nativeScrape';

export const runtime = 'nodejs';

const WINDOW = 60 * 1000;
const MAX = 10;
const hits = new Map<string, { count: number; ts: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.ts > WINDOW) {
    hits.set(ip, { count: 1, ts: now });
    return false;
  }
  if (rec.count >= MAX) return true;
  rec.count += 1;
  return false;
}

function normaliseUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

/** Scrape a website via Crawl4AI; fall back to Tavily extract. */
export async function POST(req: NextRequest) {
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    'unknown';
  if (limited(ip)) {
    return NextResponse.json({ ok: false, content: '', reason: 'rate_limited' }, { status: 200 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, content: '', reason: 'bad_request' }, { status: 400 });
  }

  const url = (body.url || '').toString().trim().slice(0, 300);
  if (!url) {
    return NextResponse.json({ ok: false, content: '', reason: 'no_url' }, { status: 200 });
  }
  const target = normaliseUrl(url);

  // 1) Crawl4AI (preferred)
  if (isCrawl4aiConfigured()) {
    try {
      const base = process.env.CRAWL4AI_API_URL!.trim().replace(/\/$/, '');
      const token = process.env.CRAWL4AI_API_TOKEN?.trim();
      const res = await fetch(`${base}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ urls: [target] }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = await res.json();
        const first = Array.isArray(data?.results) ? data.results[0] : data?.result || data;
        const md =
          first?.markdown?.raw_markdown ||
          first?.markdown ||
          first?.cleaned_html ||
          first?.extracted_content ||
          '';
        const content = (typeof md === 'string' ? md : JSON.stringify(md)).slice(0, 2500);
        if (content) {
          return NextResponse.json({ ok: true, content, source: 'crawl4ai' });
        }
      } else {
        console.error('[scrape] crawl4ai error', res.status);
      }
    } catch (err) {
      console.error('[scrape] crawl4ai failed', err);
    }
  }

  // 2) Native in-process scraper (Next.js — no external server needed)
  try {
    const r = await nativeScrape(target);
    if (r.ok && r.content) {
      return NextResponse.json({ ok: true, content: r.content, source: 'native' });
    }
  } catch (err) {
    console.error('[scrape] native failed', err);
  }

  // 3) Tavily extract fallback
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, urls: [target] }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        const r = Array.isArray(data?.results) ? data.results[0] : null;
        const content = (r?.raw_content || r?.content || '').toString().slice(0, 2500);
        if (content) {
          return NextResponse.json({ ok: true, content, source: 'tavily' });
        }
      } else {
        console.error('[scrape] tavily extract error', res.status);
      }
    } catch (err) {
      console.error('[scrape] tavily extract failed', err);
    }
  }

  return NextResponse.json(
    { ok: false, content: '', reason: 'scrape_unavailable' },
    { status: 200 }
  );
}
