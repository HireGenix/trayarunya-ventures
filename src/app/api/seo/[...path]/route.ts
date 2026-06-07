import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAuth } from '@/lib/authToken';
import {
  readSnapshot,
  runAudit,
  overviewFrom,
  type SEOSnapshot,
} from '@/lib/seoStore';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function baseUrl(): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get('host') || 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

async function ensureSnapshot(): Promise<SEOSnapshot> {
  const existing = await readSnapshot();
  if (existing) return existing;
  return runAudit(await baseUrl());
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!getAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { path } = await params;
    const [section] = path || [];
    const snap = await ensureSnapshot();

    switch (section) {
      case 'overview':
        return NextResponse.json(overviewFrom(snap));
      case 'pages':
        return NextResponse.json(snap.pages);
      case 'keywords':
        return NextResponse.json(snap.keywords);
      case 'issues':
        return NextResponse.json(snap.issues);
      default:
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } catch (err) {
    console.error('[seo][GET] error', err);
    return NextResponse.json(
      { error: 'seo_failed', message: (err as Error)?.message || 'SEO analysis failed' },
      { status: 500 }
    );
  }
}

// POST /refresh or /audit — re-crawl the site.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!getAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { path } = await params;
    const [section] = path || [];

    if (section === 'refresh' || section === 'audit') {
      const snap = await runAudit(await baseUrl());
      return NextResponse.json({
        success: true,
        message: `Audited ${snap.pages.length} pages, found ${snap.issues.length} issues.`,
        overview: overviewFrom(snap),
      });
    }

    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  } catch (err) {
    console.error('[seo][POST] error', err);
    return NextResponse.json(
      { error: 'seo_failed', message: (err as Error)?.message || 'SEO audit failed' },
      { status: 500 }
    );
  }
}
