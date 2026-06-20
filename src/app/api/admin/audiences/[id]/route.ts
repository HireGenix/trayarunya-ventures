import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { audienceStore } from '@/lib/marketingOs/audienceStore';
import { evaluateSegment } from '@/lib/marketingOs/segment';
import type { AudienceInsights, SegmentDefinition } from '@/lib/marketingOs/types';

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
    description?: string;
    definition?: SegmentDefinition;
    insights?: AudienceInsights | null;
    syncTargets?: string[];
    status?: string;
    reevaluate?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  try {
    const patch: Parameters<typeof audienceStore.update>[1] = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.definition !== undefined) patch.definition = body.definition;
    if (body.insights !== undefined) patch.insights = body.insights;
    if (body.syncTargets !== undefined) patch.syncTargets = body.syncTargets;
    if (body.status !== undefined) patch.status = body.status;

    // Refresh the real snapshot when the definition changes.
    if (body.definition !== undefined || body.reevaluate) {
      const def = body.definition ?? (await audienceStore.get(id))?.definition;
      if (def) patch.snapshot = await evaluateSegment(def).catch(() => null);
    }

    const audience = await audienceStore.update(id, patch);
    return json({ audience });
  } catch (err) {
    console.error('[audiences/[id]:PATCH]', err);
    return json({ error: 'update_failed' }, 500);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const { id } = await ctx.params;
  try {
    await audienceStore.remove(id);
    return json({ ok: true });
  } catch (err) {
    console.error('[audiences/[id]:DELETE]', err);
    return json({ error: 'delete_failed' }, 500);
  }
}
