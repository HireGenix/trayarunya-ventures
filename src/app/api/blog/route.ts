import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { blogStore } from '@/lib/blogStore';

export const runtime = 'nodejs';

// GET /api/blog — list all posts (admin). Public listing can filter by status.
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  let posts = await blogStore.list();
  if (status === 'Published') posts = posts.filter((p) => p.status === 'Published');
  return NextResponse.json(posts);
}

// POST /api/blog — create a post (auth required).
export async function POST(req: NextRequest) {
  if (!getAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!body.title) return NextResponse.json({ error: 'title_required' }, { status: 400 });
  const post = await blogStore.create(body);
  return NextResponse.json(post, { status: 201 });
}
