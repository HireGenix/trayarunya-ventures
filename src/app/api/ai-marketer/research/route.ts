import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isTavilyConfigured } from '@/lib/realtimeConfig';

export const runtime = 'nodejs';

const WINDOW = 60 * 1000;
const MAX = 12;
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

export async function POST(req: NextRequest) {
  if (!isTavilyConfigured()) {
    // Soft-fail: the AI can continue without research.
    return NextResponse.json(
      { ok: false, brief: '', reason: 'research_unavailable' },
      { status: 200 }
    );
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    'unknown';
  if (limited(ip)) {
    return NextResponse.json(
      { ok: false, brief: '', reason: 'rate_limited' },
      { status: 200 }
    );
  }

  let body: { name?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, brief: '', reason: 'bad_request' }, { status: 400 });
  }

  const name = (body.name || '').toString().trim().slice(0, 120);
  const website = (body.website || '').toString().trim().slice(0, 200);
  if (!name && !website) {
    return NextResponse.json({ ok: false, brief: '', reason: 'no_query' }, { status: 200 });
  }

  const query = website
    ? `Company overview, industry, products and target customers of ${name || website} (${website})`
    : `Company overview, industry, products and target customers of ${name}`;

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5,
      }),
    });

    if (!res.ok) {
      console.error('[ai-marketer/research] tavily error', res.status);
      return NextResponse.json({ ok: false, brief: '', reason: 'search_failed' }, { status: 200 });
    }

    const data = await res.json();
    const answer: string = (data?.answer || '').toString();
    const sources = (Array.isArray(data?.results) ? data.results : [])
      .slice(0, 3)
      .map((r: { title?: string; content?: string }) =>
        `${r.title || ''}: ${(r.content || '').slice(0, 220)}`
      )
      .join('\n');

    const brief = [answer, sources].filter(Boolean).join('\n').slice(0, 1500);
    return NextResponse.json({
      ok: true,
      brief: brief || `No detailed public info found for ${name || website}.`,
    });
  } catch (err) {
    console.error('[ai-marketer/research] error', err);
    return NextResponse.json({ ok: false, brief: '', reason: 'server_error' }, { status: 200 });
  }
}
