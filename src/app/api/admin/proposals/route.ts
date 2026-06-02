import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { proposalStore } from '@/lib/proposalStore';
import type { ArtifactType, DeckSpec, ProposalSpec } from '@/lib/proposalTypes';

export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' },
  });
}

/** GET /api/admin/proposals            → list summaries
 *  GET /api/admin/proposals?id=xxx     → full proposal (with spec) */
export async function GET(req: NextRequest) {
  if (!getAuth(req)) return json({ error: 'Unauthorized' }, 401);
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
      const proposal = await proposalStore.get(id);
      if (!proposal) return json({ error: 'not_found' }, 404);
      return json({ proposal });
    }
    return json({ proposals: await proposalStore.list() });
  } catch (err) {
    return json({ error: 'proposals_failed', message: (err as Error)?.message }, 500);
  }
}

/** POST /api/admin/proposals → manually save a deck/proposal spec. */
export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = (await req.json()) as {
      id?: string;
      type?: ArtifactType;
      title?: string;
      client?: string;
      spec?: DeckSpec | ProposalSpec;
      leadId?: string;
    };
    if (!body.spec || (body.type !== 'deck' && body.type !== 'proposal')) {
      return json({ error: 'bad_request', message: 'type and spec are required' }, 400);
    }
    const saved = await proposalStore.save({
      id: body.id,
      type: body.type,
      title: body.title || 'Untitled',
      client: body.client || '',
      spec: body.spec,
      createdBy: auth.name || auth.email,
      leadId: body.leadId,
    });
    return json({ ok: true, proposal: saved });
  } catch (err) {
    return json({ error: 'save_failed', message: (err as Error)?.message }, 500);
  }
}

/** DELETE /api/admin/proposals?id=xxx */
export async function DELETE(req: NextRequest) {
  if (!getAuth(req)) return json({ error: 'Unauthorized' }, 401);
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'bad_request', message: 'id required' }, 400);
    const ok = await proposalStore.delete(id);
    return json({ ok });
  } catch (err) {
    return json({ error: 'delete_failed', message: (err as Error)?.message }, 500);
  }
}
