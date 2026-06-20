/**
 * Agent kit — the agentic core for the Marketing OS. Wraps the Azure AI
 * providers (GPT-5.5 / Claude Opus) with structured JSON output, robust
 * extraction and zod validation, plus a graceful fallback so production
 * endpoints never hard-fail when a provider is momentarily unavailable.
 *
 * Server-only (imports aiProviders). Never import into a client component.
 */
import { z } from 'zod';
import {
  completeText,
  providerConfigured,
  type ChatMessage,
  type Provider,
} from '@/lib/aiProviders';

/** Pick whichever provider is configured, preferring the requested one. */
export function pickProvider(preferred: Provider = 'gpt-5.5'): Provider | null {
  if (providerConfigured(preferred)) return preferred;
  const other: Provider = preferred === 'gpt-5.5' ? 'claude-opus' : 'gpt-5.5';
  if (providerConfigured(other)) return other;
  return null;
}

export function anyProviderConfigured(): boolean {
  return providerConfigured('gpt-5.5') || providerConfigured('claude-opus');
}

/** Extract the first balanced JSON object/array from a model response. */
export function extractJson(raw: string): string | null {
  if (!raw) return null;
  // Prefer fenced ```json blocks.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : raw;
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  const open = candidate[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return candidate.slice(start, i + 1);
    }
  }
  return null;
}

export interface StructuredResult<T> {
  ok: boolean;
  data: T | null;
  provider: Provider | null;
  error?: string;
  raw?: string;
}

/**
 * Run a structured generation: send a system + user prompt, demand strict
 * JSON, then validate it against a zod schema. Retries once if the first
 * response fails to parse.
 */
export async function runStructured<T>(opts: {
  schema: z.ZodType<T>;
  system: string;
  user: string;
  preferred?: Provider;
}): Promise<StructuredResult<T>> {
  const provider = pickProvider(opts.preferred ?? 'gpt-5.5');
  if (!provider) {
    return { ok: false, data: null, provider: null, error: 'no_provider_configured' };
  }

  const system =
    opts.system +
    '\n\nRespond with ONLY a single valid JSON value that satisfies the requested schema. No prose, no markdown fences, no commentary.';

  const attempt = async (extra?: string): Promise<StructuredResult<T>> => {
    const messages: ChatMessage[] = [
      { role: 'user', content: extra ? `${opts.user}\n\n${extra}` : opts.user },
    ];
    let raw = '';
    try {
      raw = await completeText({ provider, messages, system });
    } catch (err) {
      return {
        ok: false,
        data: null,
        provider,
        error: err instanceof Error ? err.message : 'provider_error',
      };
    }
    const jsonStr = extractJson(raw) ?? raw.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return { ok: false, data: null, provider, error: 'invalid_json', raw };
    }
    const result = opts.schema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, data: null, provider, error: 'schema_mismatch', raw };
    }
    return { ok: true, data: result.data, provider };
  };

  const first = await attempt();
  if (first.ok) return first;
  if (first.error === 'invalid_json' || first.error === 'schema_mismatch') {
    return attempt('Your previous reply could not be parsed. Return STRICT JSON only.');
  }
  return first;
}

/** Free-form completion (e.g. copywriting) returning plain text. */
export async function runText(opts: {
  system: string;
  user: string;
  preferred?: Provider;
}): Promise<{ ok: boolean; text: string; provider: Provider | null; error?: string }> {
  const provider = pickProvider(opts.preferred ?? 'gpt-5.5');
  if (!provider) return { ok: false, text: '', provider: null, error: 'no_provider_configured' };
  try {
    const text = await completeText({
      provider,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    });
    return { ok: true, text, provider };
  } catch (err) {
    return { ok: false, text: '', provider, error: err instanceof Error ? err.message : 'provider_error' };
  }
}
