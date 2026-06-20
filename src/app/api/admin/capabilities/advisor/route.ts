import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { streamChat, providerConfigured, type Provider, type ChatMessage } from '@/lib/aiProviders';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Agentic GTM strategist. Streams a recommendation for a given capability
 * track (lifecycle / paid / experimentation), grounded in the agency's REAL
 * lead pipeline stats from Postgres.
 */
export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  const provider: Provider = providerConfigured('gpt-5.5')
    ? 'gpt-5.5'
    : providerConfigured('claude-opus')
      ? 'claude-opus'
      : 'gpt-5.5';
  if (!providerConfigured(provider)) {
    return json({ error: 'not_configured', message: 'No AI provider configured.' }, 503);
  }

  let body: { track?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const track = (body.track || 'lifecycle').toString();
  const question = (body.question || '').toString().slice(0, 600);

  // Ground the agent in real pipeline data.
  let statsBlock = 'Pipeline stats unavailable.';
  try {
    const s = await db.leads.getStats();
    statsBlock = [
      `Total leads: ${s.total}`,
      `New: ${s.newLeads}`,
      `Qualified: ${s.qualifiedLeads}`,
      `Conversion rate: ${s.conversionRate}%`,
      `Avg response time: ${s.averageResponseTime}h`,
      `By source: ${s.leadsBySource.map((x) => `${x.source} ${x.count}`).join(', ')}`,
      `By status: ${s.leadsByStatus.map((x) => `${x.status} ${x.count}`).join(', ')}`,
    ].join('\n');
  } catch (err) {
    console.error('[capabilities/advisor] stats', err);
  }

  const system = `You are the AI CMO for the Trayarunya Ventures marketing OS. You advise on the "${track}" track (lifecycle marketing, paid marketing, or experimentation). Ground every recommendation in the REAL pipeline data provided. Be concrete: name the specific audience segments to build, journeys to launch, channels to use, and the experiment/holdout to measure lift. Output clean Markdown with short sections and a final "Next 3 actions" checklist.

=== REAL PIPELINE DATA ===
${statsBlock}
=== END DATA ===`;

  const userMsg =
    question ||
    `Given our real pipeline, what is the highest-leverage ${track} play we should run this month, and how do we measure it?`;

  const messages: ChatMessage[] = [{ role: 'user', content: userMsg }];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        emit('meta', { provider, track });
        for await (const delta of streamChat({ provider, messages, system })) {
          emit('delta', { text: delta });
        }
        emit('done', { ok: true });
      } catch (err) {
        console.error('[capabilities/advisor] stream', err);
        emit('error', { message: 'The strategist is unavailable right now. Please try again.' });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
