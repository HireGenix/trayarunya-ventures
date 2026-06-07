import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { analyticsStore } from '@/lib/analyticsStore';

export const runtime = 'nodejs';

// Public endpoint — records a pageview/event from the live site.
export async function POST(req: NextRequest) {
  let body: {
    type?: 'pageview' | 'event';
    path?: string;
    title?: string;
    referrer?: string;
    sessionId?: string;
    visitorId?: string;
    name?: string;
    category?: string;
    durationMs?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.path) return NextResponse.json({ ok: false }, { status: 400 });

  const hdrs = await headers();
  const ua = hdrs.get('user-agent') || '';
  const host = hdrs.get('host') || '';
  // Vercel provides geo headers; fall back to Unknown.
  const country = hdrs.get('x-vercel-ip-country') || 'Unknown';
  const countryCode = hdrs.get('x-vercel-ip-country') || 'XX';

  try {
    await analyticsStore.record({
      type: body.type,
      path: body.path,
      title: body.title,
      referrer: body.referrer,
      sessionId: body.sessionId,
      visitorId: body.visitorId,
      name: body.name,
      category: body.category,
      durationMs: body.durationMs,
      ua,
      host,
      country,
      countryCode,
    });
  } catch (err) {
    console.error('[track] record error', err);
  }

  return NextResponse.json({ ok: true });
}
