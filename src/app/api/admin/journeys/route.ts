import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { journeyStore } from '@/lib/marketingOs/journeyStore';
import type { Journey, JourneyDefinition } from '@/lib/marketingOs/types';

export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  try {
    const journeys = await journeyStore.list();
    return json({ journeys });
  } catch (err) {
    console.error('[journeys:GET]', err);
    return json({ journeys: [], error: 'db_unavailable' });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body: {
    name?: string;
    goal?: string;
    status?: Journey['status'];
    audienceId?: string | null;
    definition?: JourneyDefinition;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const name = (body.name || '').trim();
  if (!name) return json({ error: 'name_required' }, 400);

  try {
    const journey = await journeyStore.create({
      name,
      goal: body.goal ?? '',
      status: body.status ?? 'draft',
      audienceId: body.audienceId ?? null,
      definition: body.definition ?? { nodes: [], edges: [] },
      createdBy: auth.email,
    });
    return json({ journey }, 201);
  } catch (err) {
    console.error('[journeys:POST]', err);
    return json({ error: 'create_failed' }, 500);
  }
}
