import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { evaluateSegment, PROPERTY_REGISTRY } from '@/lib/marketingOs/segment';
import type { SegmentDefinition } from '@/lib/marketingOs/types';

export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Live, un-saved evaluation of a segment definition against real data. */
export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body: { definition?: SegmentDefinition };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const definition = body.definition ?? { joiner: 'AND', rows: [] };
  try {
    const result = await evaluateSegment(definition);
    return json({ result });
  } catch (err) {
    console.error('[audiences/evaluate]', err);
    return json({ error: 'evaluate_failed' }, 500);
  }
}

/** The grounded property registry that powers both the UI and the AI agent. */
export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  return json({ properties: PROPERTY_REGISTRY });
}
