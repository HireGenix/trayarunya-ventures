import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import {
  getGpt5Env,
  responsesUrl,
  buildChatInstructions,
  chatTools,
} from '@/lib/chatSalesConfig';
import { generateLeadEmail } from '@/lib/leadEmail';

export const runtime = 'nodejs';
export const maxDuration = 60;

const WINDOW = 60 * 1000;
const MAX = 20;
const hits = new Map<string, { count: number; ts: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.ts > WINDOW) {
    hits.set(ip, { count: 1, ts: now });
    return false;
  }
  if (rec.count >= MAX) return true;
  rec.count += 1;
  return false;
}

type ClientMsg = { role: 'user' | 'assistant'; text: string };
type InputItem = Record<string, unknown>;

function toInput(messages: ClientMsg[]): InputItem[] {
  return messages
    .filter((m) => m.text?.trim())
    .map((m) => ({
      type: 'message',
      role: m.role,
      content: [
        {
          type: m.role === 'assistant' ? 'output_text' : 'input_text',
          text: m.text,
        },
      ],
    }));
}

/** Execute a single tool call server-side. Returns the output string for the model. */
async function runTool(
  name: string,
  args: Record<string, unknown>,
  origin: string,
  transcript: string,
  emit: (event: string, data: unknown) => void
): Promise<string> {
  if (name === 'update_icp') {
    emit('icp', args);
    return JSON.stringify({ ok: true });
  }

  if (name === 'search_company') {
    emit('tool', { tool: 'search_company', state: 'start', label: 'Researching their business' });
    try {
      const res = await fetch(`${origin}/api/ai-marketer/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: args.name, website: args.website }),
      });
      const data = await res.json().catch(() => ({}));
      emit('tool', { tool: 'search_company', state: 'done' });
      return JSON.stringify(
        data?.ok ? { brief: data.brief } : { brief: '', note: 'No research available.' }
      );
    } catch {
      emit('tool', { tool: 'search_company', state: 'done' });
      return JSON.stringify({ brief: '', note: 'Research failed; continue naturally.' });
    }
  }

  if (name === 'scrape_website') {
    emit('tool', { tool: 'scrape_website', state: 'start', label: 'Reading their website' });
    try {
      const res = await fetch(`${origin}/api/ai-marketer/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: args.url }),
      });
      const data = await res.json().catch(() => ({}));
      emit('tool', { tool: 'scrape_website', state: 'done' });
      return JSON.stringify(
        data?.ok ? { content: data.content } : { content: '', note: 'Could not read site.' }
      );
    } catch {
      emit('tool', { tool: 'scrape_website', state: 'done' });
      return JSON.stringify({ content: '', note: 'Scrape failed; continue naturally.' });
    }
  }

  if (name === 'submit_lead') {
    emit('tool', { tool: 'submit_lead', state: 'start', label: 'Sending to our team' });
    const summary = [
      args.notes ? `Notes: ${args.notes}` : '',
      args.segment ? `Segment: ${args.segment}` : '',
      args.industry ? `Industry: ${args.industry}` : '',
      args.country ? `Country: ${args.country}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Draft a personalised, on-brand email with GPT-5.5 from the chat so far.
    let aiEmail: Awaited<ReturnType<typeof generateLeadEmail>> = null;
    try {
      aiEmail = await generateLeadEmail({
        name: args.name as string | undefined,
        email: args.email as string | undefined,
        company: args.company as string | undefined,
        phone: args.phone as string | undefined,
        country: args.country as string | undefined,
        segment: args.segment as string | undefined,
        industry: args.industry as string | undefined,
        notes: args.notes as string | undefined,
        transcript,
      });
    } catch {
      /* personalised email is best-effort; fall back to branded default */
    }

    try {
      const res = await fetch(`${origin}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: args.name || 'AI Chat Lead',
          email: args.email,
          subject: 'AI Sales Partner — new lead',
          message: summary || 'Lead captured via the AI Sales Partner chat.',
          company: args.company,
          phone: args.phone,
          country: args.country,
          source: 'ai-chat',
          formType: 'ai-chat',
          aiCustomerHtml: aiEmail?.customerHtml,
          aiEmailSubject: aiEmail?.subject,
          aiTeamSummary: aiEmail?.teamSummary,
        }),
      });
      const ok = res.ok;
      emit('tool', { tool: 'submit_lead', state: 'done' });
      if (ok) emit('lead', { submitted: true, fields: args });
      return JSON.stringify({ ok, saved: ok });
    } catch {
      emit('tool', { tool: 'submit_lead', state: 'done' });
      return JSON.stringify({ ok: false, error: 'save_failed' });
    }
  }

  return JSON.stringify({ ok: false, error: 'unknown_tool' });
}

export async function POST(req: NextRequest) {
  const env = getGpt5Env();
  if (!env) {
    return new Response(
      JSON.stringify({ error: 'not_configured', message: 'AI chat is not configured.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  if (limited(ip)) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', message: 'Too many messages. Please slow down.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { messages?: ClientMsg[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
  const origin = new URL(req.url).origin;
  const input = toInput(messages);
  const transcript = messages
    .filter((m) => m.text?.trim())
    .map((m) => `${m.role === 'assistant' ? 'AI' : 'Prospect'}: ${m.text.trim()}`)
    .join('\n');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const MAX_ROUNDS = 6;
        for (let round = 0; round < MAX_ROUNDS; round++) {
          const res = await fetch(responsesUrl(env), {
            method: 'POST',
            headers: { 'api-key': env.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: env.deployment,
              instructions: buildChatInstructions(),
              input,
              tools: chatTools(),
              tool_choice: 'auto',
              parallel_tool_calls: true,
              stream: true,
              store: false,
            }),
          });

          if (!res.ok || !res.body) {
            const detail = await res.text().catch(() => '');
            console.error('[ai-marketer/chat] responses error', res.status, detail.slice(0, 500));
            emit('error', { message: 'The AI is unavailable right now. Please try again.' });
            break;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          const functionCalls: { call_id: string; name: string; arguments: string }[] = [];

          // Parse Azure SSE stream for this round
          let sawDone = false;
          while (!sawDone) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            for (const block of events) {
              const line = block.split('\n').find((l) => l.startsWith('data:'));
              if (!line) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === '[DONE]') {
                if (payload === '[DONE]') sawDone = true;
                continue;
              }
              let evt: Record<string, unknown>;
              try {
                evt = JSON.parse(payload);
              } catch {
                continue;
              }
              const type = evt.type as string;
              if (type === 'response.output_text.delta') {
                const delta = (evt.delta as string) || '';
                if (delta) emit('delta', { text: delta });
              } else if (type === 'response.output_item.done') {
                const item = evt.item as Record<string, unknown> | undefined;
                if (item?.type === 'function_call') {
                  functionCalls.push({
                    call_id: (item.call_id as string) || (item.id as string),
                    name: item.name as string,
                    arguments: (item.arguments as string) || '{}',
                  });
                }
              } else if (type === 'response.completed' || type === 'response.done') {
                sawDone = true;
              } else if (type === 'error' || type === 'response.failed') {
                emit('error', { message: 'The AI hit an error. Please try again.' });
                sawDone = true;
              }
            }
          }

          if (functionCalls.length === 0) {
            // No tools requested — the assistant text is complete.
            emit('done', { ok: true });
            controller.close();
            return;
          }

          // Append the function calls + their outputs, then loop for the model's reply.
          for (const fc of functionCalls) {
            input.push({
              type: 'function_call',
              call_id: fc.call_id,
              name: fc.name,
              arguments: fc.arguments,
            });
          }
          for (const fc of functionCalls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(fc.arguments || '{}');
            } catch {
              /* ignore */
            }
            const output = await runTool(fc.name, args, origin, transcript, emit);
            input.push({ type: 'function_call_output', call_id: fc.call_id, output });
          }
        }

        emit('done', { ok: true });
        controller.close();
      } catch (err) {
        console.error('[ai-marketer/chat] stream error', err);
        try {
          emit('error', { message: 'Unexpected error. Please try again.' });
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
