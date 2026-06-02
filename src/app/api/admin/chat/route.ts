import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { streamChat, providerConfigured, type Provider, type ChatMessage } from '@/lib/aiProviders';

export const runtime = 'nodejs';
export const maxDuration = 60;

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body: { provider?: Provider; messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const provider: Provider = body.provider === 'claude-opus' ? 'claude-opus' : 'gpt-5.5';
  if (!providerConfigured(provider)) {
    return json(
      {
        error: 'not_configured',
        message:
          provider === 'claude-opus'
            ? 'Claude Opus is not configured (set AZURE_ANTHROPIC_*).'
            : 'GPT-5.5 is not configured (set AZURE_GPT5_*).',
      },
      503
    );
  }

  const messages: ChatMessage[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-40)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

  if (messages.length === 0) return json({ error: 'no_messages' }, 400);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        for await (const delta of streamChat({ provider, messages })) {
          emit('delta', { text: delta });
        }
        emit('done', { ok: true });
      } catch (err) {
        console.error('[admin/chat] stream error', err);
        emit('error', { message: 'The AI is unavailable right now. Please try again.' });
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
