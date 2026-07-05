import { NextRequest, NextResponse } from 'next/server';
import { verifyIngestRequest } from '@marketiq/nextjs/ingest';
import { blogStore } from '@/lib/blogStore';

export const runtime = 'nodejs';

/**
 * MarketIQ PUSH ingest — the engine POSTs a signed article here on publish.
 * We verify the HMAC signature, then upsert into our own Prisma blog store with
 * the full on-page SEO bundle.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.MARKETIQ_INGEST_SECRET || '';
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 });
  }

  const payload = await verifyIngestRequest(req, secret);
  if (!payload?.article) {
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 });
  }

  const a = payload.article;
  const seo = a.seo || ({} as typeof a.seo);
  try {
    const post = await blogStore.upsertFromEngine({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      content: a.html,
      author: a.author,
      category: a.category || undefined,
      tags: a.tags,
      coverImage: a.cover_image_url ?? null,
      status: a.status === 'published' ? 'Published' : 'Draft',
      publishedAt: a.published_at ?? undefined,
      sourceId: a.id,
      metaTitle: seo.meta_title,
      metaDescription: seo.meta_description,
      canonical: seo.canonical_url ?? undefined,
      focusKeyword: seo.focus_keyword,
      ogImage: seo.og?.image ?? null,
      readingTime: seo.reading_time_min,
      seo,
    });
    return NextResponse.json({ ok: true, slug: post.slug });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'ingest_failed', detail: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
