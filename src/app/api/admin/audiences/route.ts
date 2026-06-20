import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { audienceStore } from '@/lib/marketingOs/audienceStore';
import { evaluateSegment } from '@/lib/marketingOs/segment';
import type { SegmentDefinition } from '@/lib/marketingOs/types';

export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const EMPTY_DEF: SegmentDefinition = { joiner: 'AND', rows: [] };

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  try {
    const audiences = await audienceStore.list();
    return json({ audiences });
  } catch (err) {
    console.error('[audiences:GET]', err);
    return json({ audiences: [], error: 'db_unavailable' });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body: {
    name?: string;
    description?: string;
    definition?: SegmentDefinition;
    syncTargets?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const name = (body.name || '').trim();
  if (!name) return json({ error: 'name_required' }, 400);

  const definition = body.definition ?? EMPTY_DEF;

  try {
    // Evaluate against real data so the saved snapshot is accurate.
    const snapshot = await evaluateSegment(definition).catch(() => null);
    const audience = await audienceStore.create({
      name,
      description: body.description ?? '',
      definition,
      snapshot,
      syncTargets: body.syncTargets ?? [],
      createdBy: auth.email,
    });
    return json({ audience }, 201);
  } catch (err) {
    console.error('[audiences:POST]', err);
    return json({ error: 'create_failed' }, 500);
  }
}
