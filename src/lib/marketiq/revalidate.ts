import { revalidatePath } from 'next/cache';
import { safeEqual, verifySignature } from './signature';

interface RevalidateOptions {
  secret: string;
  /** Paths revalidated on every successful ping. */
  alwaysPaths?: string[];
}

/**
 * Create a POST handler the MarketIQ engine pings to trigger on-demand ISR.
 * Accepts either an HMAC signature (`x-marketiq-signature`) or a bearer token
 * equal to the secret. Body may include `{ slug?: string, paths?: string[] }`.
 */
export function createRevalidateRoute({ secret, alwaysPaths = [] }: RevalidateOptions) {
  async function POST(req: Request): Promise<Response> {
    if (!secret) {
      return Response.json({ ok: false, error: 'not_configured' }, { status: 500 });
    }
    const raw = await req.text().catch(() => '');
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const authorized =
      verifySignature(raw, req.headers, secret) || (bearer.length > 0 && safeEqual(bearer, secret));
    if (!authorized) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    let body: { slug?: unknown; paths?: unknown } = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }

    const paths = new Set(alwaysPaths);
    if (typeof body.slug === 'string' && /^[a-z0-9-]+$/i.test(body.slug)) {
      paths.add(`/blog/${body.slug}`);
    }
    if (Array.isArray(body.paths)) {
      for (const p of body.paths) {
        if (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//')) paths.add(p);
      }
    }

    for (const p of paths) revalidatePath(p);
    return Response.json({ ok: true, revalidated: [...paths] });
  }

  return { POST };
}
