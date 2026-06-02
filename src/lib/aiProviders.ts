/**
 * Server-only unified streaming layer for the internal admin assistant.
 * Supports two providers via Azure:
 *   - 'gpt-5.5'      → Azure OpenAI Responses API
 *   - 'claude-opus'  → Azure Anthropic Messages API
 *
 * Both expose the same async generator of text deltas via streamChat().
 * NEVER import into a client component — reads secret env vars.
 */
import { getGpt5Env, responsesUrl } from '@/lib/chatSalesConfig';

export type Provider = 'gpt-5.5' | 'claude-opus';

export interface ChatImage {
  /** Full data URL, e.g. data:image/png;base64,xxxx */
  dataUrl: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Optional image attachments (only meaningful on user messages). */
  images?: ChatImage[];
}

function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mediaType: m[1], base64: m[2] };
}

export interface AnthropicEnv {
  endpoint: string; // full messages URL
  apiKey: string;
  model: string;
}

export function getAnthropicEnv(): AnthropicEnv | null {
  const endpoint =
    process.env.AZURE_ANTHROPIC_ENDPOINT?.trim() ||
    'https://hiregenix-resource.services.ai.azure.com/anthropic/v1/messages';
  const apiKey =
    process.env.AZURE_ANTHROPIC_KEY?.trim() ||
    process.env.AZURE_GPT5_KEY?.trim() ||
    process.env.AZURE_OPENAI_REALTIME_KEY?.trim();
  const model = process.env.AZURE_ANTHROPIC_MODEL?.trim() || 'claude-opus-4-7';
  if (!endpoint || !apiKey) return null;
  return { endpoint, apiKey, model };
}

export function providerConfigured(provider: Provider): boolean {
  return provider === 'gpt-5.5' ? Boolean(getGpt5Env()) : Boolean(getAnthropicEnv());
}

const SYSTEM_PROMPT = `You are the internal AI assistant for the Trayarunya Ventures team — a sharp, helpful copilot for a B2B/B2C/D2C digital-marketing agency. Help staff with marketing strategy, copywriting, campaign planning, lead research, content, analysis, and general work tasks. Be concise, practical, and format answers in clean Markdown when helpful.`;

/**
 * Maximum output tokens for Claude Opus. Anthropic's Messages API *requires*
 * a max_tokens value (it cannot be omitted), so "uncapped" means using the
 * model's full supported output window so long answers are never truncated.
 */
const CLAUDE_MAX_OUTPUT_TOKENS = 32000;

/** Stream GPT-5.5 (Azure Responses API) text deltas. */
async function* streamGpt(
  messages: ChatMessage[],
  system: string
): AsyncGenerator<string> {
  const env = getGpt5Env();
  if (!env) throw new Error('GPT-5.5 is not configured');

  const input = messages.map((m) => {
    const parts: Array<Record<string, unknown>> = [
      {
        type: m.role === 'assistant' ? 'output_text' : 'input_text',
        text: m.content,
      },
    ];
    if (m.role === 'user' && m.images?.length) {
      for (const img of m.images) {
        parts.push({ type: 'input_image', image_url: img.dataUrl });
      }
    }
    return { type: 'message', role: m.role, content: parts };
  });

  const res = await fetch(responsesUrl(env), {
    method: 'POST',
    headers: { 'api-key': env.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.deployment,
      instructions: system,
      input,
      stream: true,
      store: false,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`GPT-5.5 error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const block of events) {
      const line = block.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let evt: Record<string, unknown>;
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      if (evt.type === 'response.output_text.delta') {
        const delta = (evt.delta as string) || '';
        if (delta) yield delta;
      }
    }
  }
}

/** Stream Claude Opus (Azure Anthropic Messages API) text deltas. */
async function* streamClaude(
  messages: ChatMessage[],
  system: string
): AsyncGenerator<string> {
  const env = getAnthropicEnv();
  if (!env) throw new Error('Claude Opus is not configured');

  const res = await fetch(env.endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': env.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.model,
      max_tokens: CLAUDE_MAX_OUTPUT_TOKENS,
      system,
      messages: messages.map((m) => {
        if (m.role === 'user' && m.images?.length) {
          const content: Array<Record<string, unknown>> = [];
          for (const img of m.images) {
            const parsed = parseDataUrl(img.dataUrl);
            if (parsed) {
              content.push({
                type: 'image',
                source: { type: 'base64', media_type: parsed.mediaType, data: parsed.base64 },
              });
            }
          }
          content.push({ type: 'text', text: m.content || 'Please analyse the attached image(s).' });
          return { role: m.role, content };
        }
        return { role: m.role, content: m.content };
      }),
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Claude error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const block of events) {
      const line = block.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let evt: Record<string, unknown>;
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      if (evt.type === 'content_block_delta') {
        const delta = evt.delta as Record<string, unknown> | undefined;
        const text = (delta?.text as string) || '';
        if (text) yield text;
      }
    }
  }
}

export function streamChat(opts: {
  provider: Provider;
  messages: ChatMessage[];
  system?: string;
}): AsyncGenerator<string> {
  const system = opts.system || SYSTEM_PROMPT;
  return opts.provider === 'claude-opus'
    ? streamClaude(opts.messages, system)
    : streamGpt(opts.messages, system);
}

/** Non-streaming GPT-5.5 completion (Azure Responses API). Returns full text. */
async function completeGpt(messages: ChatMessage[], system: string): Promise<string> {
  const env = getGpt5Env();
  if (!env) throw new Error('GPT-5.5 is not configured');

  const input = messages.map((m) => ({
    type: 'message',
    role: m.role,
    content: [{ type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.content }],
  }));

  const res = await fetch(responsesUrl(env), {
    method: 'POST',
    headers: { 'api-key': env.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.deployment,
      instructions: system,
      input,
      stream: false,
      store: false,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`GPT-5.5 error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  // Fallback: walk the output array for output_text parts.
  const output = data.output as Array<Record<string, unknown>> | undefined;
  let text = '';
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = item.content as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === 'output_text' && typeof part.text === 'string') text += part.text;
        }
      }
    }
  }
  return text;
}

/** Non-streaming Claude Opus completion (Azure Anthropic Messages API). */
async function completeClaude(messages: ChatMessage[], system: string): Promise<string> {
  const env = getAnthropicEnv();
  if (!env) throw new Error('Claude Opus is not configured');

  const res = await fetch(env.endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': env.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.model,
      max_tokens: CLAUDE_MAX_OUTPUT_TOKENS,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Claude error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  return (data.content || [])
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('');
}

/** Non-streaming completion across providers. */
export function completeText(opts: {
  provider: Provider;
  messages: ChatMessage[];
  system?: string;
}): Promise<string> {
  const system = opts.system || SYSTEM_PROMPT;
  return opts.provider === 'claude-opus'
    ? completeClaude(opts.messages, system)
    : completeGpt(opts.messages, system);
}
