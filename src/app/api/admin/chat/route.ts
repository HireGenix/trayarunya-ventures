import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { streamChat, providerConfigured, type Provider, type ChatMessage } from '@/lib/aiProviders';
import { webSearch, scrapeUrl, detectToolIntent } from '@/lib/webTools';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface IncomingMessage {
  role?: string;
  content?: string;
  images?: { dataUrl?: string }[];
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body: { provider?: Provider; messages?: IncomingMessage[]; webSearch?: boolean };
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
    .filter((m) => m && (typeof m.content === 'string' || (m.images && m.images.length)))
    .slice(-30)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : '',
      images:
        m.role !== 'assistant' && Array.isArray(m.images)
          ? m.images
              .filter((im) => im && typeof im.dataUrl === 'string' && im.dataUrl.startsWith('data:'))
              .map((im) => ({ dataUrl: im.dataUrl as string }))
              .slice(0, 4)
          : undefined,
    }));

  if (messages.length === 0) return json({ error: 'no_messages' }, 400);

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const lastText = lastUser?.content || '';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // ---- Tool phase: web search + scraping ----
        const intent = detectToolIntent(lastText);
        const forceSearch = body.webSearch === true && lastText.trim().length > 0;
        const contextBlocks: string[] = [];

        if (intent.search || forceSearch) {
          const query = intent.search || lastText;
          emit('tool', { tool: 'web_search', status: 'running', label: `Searching the web for "${query.slice(0, 80)}"...` });
          const sr = await webSearch(query);
          if (sr.ok) {
            const lines = sr.results.map((r, i) => `[${i + 1}] ${r.title} - ${r.url}\n${r.content}`);
            contextBlocks.push(
              `WEB SEARCH RESULTS for "${query}":\n${sr.answer ? `Summary: ${sr.answer}\n\n` : ''}${lines.join('\n\n')}`
            );
            emit('tool', { tool: 'web_search', status: 'done', label: `Found ${sr.results.length} web results`, results: sr.results });
          } else {
            emit('tool', {
              tool: 'web_search',
              status: 'error',
              label:
                sr.reason === 'tavily_not_configured'
                  ? 'Web search is not configured (set TAVILY_API_KEY).'
                  : 'Web search failed.',
            });
          }
        }

        if (intent.scrape?.length) {
          for (const url of intent.scrape) {
            emit('tool', { tool: 'scrape_url', status: 'running', label: `Reading ${url}...` });
            const out = await scrapeUrl(url);
            if (out.ok && out.content) {
              contextBlocks.push(
                `PAGE CONTENT from ${url}${out.title ? ` (${out.title})` : ''}:\n${out.content}`
              );
              emit('tool', { tool: 'scrape_url', status: 'done', label: `Read ${url}` });
            } else {
              emit('tool', { tool: 'scrape_url', status: 'error', label: `Could not read ${url}` });
            }
          }
        }

        // Build the system prompt, injecting any tool findings as grounding.
        let system =
          "You are the internal AI assistant for the Trayarunya Ventures team - a sharp, helpful copilot for a B2B/B2C/D2C digital-marketing agency. Help staff with marketing strategy, copywriting, campaign planning, lead research, content, analysis, and general work tasks. Be concise, practical, and format answers in clean Markdown when helpful.";
        if (contextBlocks.length) {
          system +=
            '\n\nYou have been given fresh, real-time information gathered from the web/tools below. Use it to answer the user accurately and cite sources inline (e.g. [1], [2]) when relevant. If it does not contain the answer, say so.\n\n=== TOOL CONTEXT ===\n' +
            contextBlocks.join('\n\n---\n\n') +
            '\n=== END TOOL CONTEXT ===';
        }

        // ---- Generation phase ----
        for await (const delta of streamChat({ provider, messages, system })) {
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
