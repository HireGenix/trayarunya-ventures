import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { journeyStore } from '@/lib/marketingOs/journeyStore';
import type { Journey, JourneyDefinition, JourneyMetrics } from '@/lib/marketingOs/types';

export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const { id } = await ctx.params;

  let body: {
    name?: string;
    goal?: string;
    status?: Journey['status'];
    audienceId?: string | null;
    definition?: JourneyDefinition;
    metrics?: JourneyMetrics | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  try {
    const patch: Parameters<typeof journeyStore.update>[1] = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.goal !== undefined) patch.goal = body.goal;
    if (body.status !== undefined) patch.status = body.status;
    if (body.audienceId !== undefined) patch.audienceId = body.audienceId;
    if (body.definition !== undefined) patch.definition = body.definition;
    if (body.metrics !== undefined) patch.metrics = body.metrics;
    const journey = await journeyStore.update(id, patch);
    return json({ journey });
  } catch (err) {
    console.error('[journeys/[id]:PATCH]', err);
    return json({ error: 'update_failed' }, 500);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const { id } = await ctx.params;
  try {
    await journeyStore.remove(id);
    return json({ ok: true });
  } catch (err) {
    console.error('[journeys/[id]:DELETE]', err);
    return json({ error: 'delete_failed' }, 500);
  }
}
