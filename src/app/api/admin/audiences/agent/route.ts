import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/authToken';
import { runStructured, anyProviderConfigured } from '@/lib/marketingOs/agentKit';
import { evaluateSegment, PROPERTY_REGISTRY } from '@/lib/marketingOs/segment';
import { webSearch } from '@/lib/webTools';
import type { AudienceAgentMode, SegmentDefinition, SegmentResult } from '@/lib/marketingOs/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const OPERATORS = [
  'equals',
  'not_equals',
  'is_any_of',
  'contains',
  'within_past_days',
  'gte',
  'lte',
  'is_set',
  'is_not_set',
] as const;

const valueSchema = z.union([z.string(), z.array(z.string()), z.number(), z.null()]);

const conditionSchema = z.object({
  property: z.string(),
  operator: z.enum(OPERATORS),
  value: valueSchema,
});

const definitionSchema = z.object({
  joiner: z.enum(['AND', 'OR']),
  rows: z
    .array(
      z.object({
        condition: conditionSchema,
        sub: conditionSchema.nullable().optional(),
      }),
    )
    .max(8),
});

const insightsSchema = z.object({
  persona: z.string(),
  summary: z.string(),
  recommendedChannels: z.array(z.string()).max(6),
  messagingAngles: z.array(z.string()).max(6),
  nextBestActions: z.array(z.string()).max(6),
  riskFlags: z.array(z.string()).max(6),
});

function propertyCatalog(): string {
  return PROPERTY_REGISTRY.map((p) => {
    const opts = p.options ? ` options=[${p.options.join(', ')}]` : '';
    return `- ${p.key} (${p.type}, source=${p.source}) operators=[${p.operators.join(', ')}]${opts}`;
  }).join('\n');
}

function withIds(def: z.infer<typeof definitionSchema>): SegmentDefinition {
  return {
    joiner: def.joiner,
    rows: def.rows.map((r, i) => ({
      id: `r_${Date.now()}_${i}`,
      condition: { id: `c_${Date.now()}_${i}`, ...r.condition },
      sub: r.sub ? { ...r.sub } : null,
    })),
  };
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  if (!anyProviderConfigured()) {
    return json({ error: 'not_configured', message: 'No AI provider configured (set AZURE_GPT5_* or AZURE_ANTHROPIC_*).' }, 503);
  }

  let body: {
    mode?: AudienceAgentMode;
    prompt?: string;
    definition?: SegmentDefinition;
    snapshot?: SegmentResult | null;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const mode = body.mode ?? 'generate';

  try {
    /* -------------------- generate: NL -> segment --------------------- */
    if (mode === 'generate') {
      const prompt = (body.prompt || '').trim();
      if (!prompt) return json({ error: 'prompt_required' }, 400);

      const result = await runStructured({
        schema: definitionSchema,
        system: `You are a B2B audience-segmentation engine for a marketing agency CRM. Convert the user's description into a precise segment definition using ONLY these grounded properties:\n\n${propertyCatalog()}\n\nRules: pick the smallest set of conditions that captures intent; use enum option values verbatim; for "is_any_of" use an array value; for "within_past_days" use a number value; "is_set"/"is_not_set" take a null value. Prefer AND unless the user clearly wants OR.`,
        user: prompt,
      });

      if (!result.ok || !result.data) {
        return json({ error: result.error || 'generation_failed' }, 502);
      }

      const definition = withIds(result.data);
      const snapshot = await evaluateSegment(definition).catch(() => null);
      return json({ definition, snapshot, provider: result.provider });
    }

    /* ----------------- insights: persona + strategy ------------------- */
    if (mode === 'insights') {
      const def = body.definition ?? { joiner: 'AND', rows: [] };
      const snapshot = body.snapshot ?? (await evaluateSegment(def).catch(() => null));
      const statsLine = snapshot
        ? `Matched members: ${snapshot.total} of ${snapshot.universe} leads. Top statuses: ${snapshot.byStatus
            .slice(0, 3)
            .map((s) => `${s.label} ${s.count}`)
            .join(', ')}. Top sources: ${snapshot.bySource
            .slice(0, 3)
            .map((s) => `${s.label} ${s.count}`)
            .join(', ')}. Estimated visitor reach: ${snapshot.visitorReach}.`
        : 'No snapshot available.';

      const result = await runStructured({
        schema: insightsSchema,
        system:
          'You are a senior B2B growth strategist. Given a CRM audience segment and its real composition, produce a concise, production-ready activation brief.',
        user: `Audience name: ${body.name || 'Untitled segment'}\nSegment definition: ${JSON.stringify(
          def,
        )}\nReal composition: ${statsLine}\n\nReturn persona, summary, recommendedChannels, messagingAngles, nextBestActions and riskFlags.`,
      });

      if (!result.ok || !result.data) return json({ error: result.error || 'insights_failed' }, 502);
      return json({ insights: result.data, provider: result.provider });
    }

    /* ------------------- enrich: live web research -------------------- */
    if (mode === 'enrich') {
      const prompt = (body.prompt || body.name || '').trim();
      if (!prompt) return json({ error: 'prompt_required' }, 400);

      const search = await webSearch(`${prompt} B2B buyer persona pains channels 2026`, 5);
      const evidence = search.ok
        ? `${search.answer ? `Summary: ${search.answer}\n` : ''}${search.results
            .slice(0, 4)
            .map((r, i) => `[${i + 1}] ${r.title}: ${(r.content || '').slice(0, 240)}`)
            .join('\n')}`
        : 'No external evidence available.';

      const result = await runStructured({
        schema: insightsSchema,
        system:
          'You are a market researcher. Using the supplied live web evidence, build an evidence-backed buyer persona and activation brief. Be specific and avoid generic filler.',
        user: `Segment focus: ${prompt}\n\n=== LIVE WEB EVIDENCE ===\n${evidence}\n=== END EVIDENCE ===\n\nReturn persona, summary, recommendedChannels, messagingAngles, nextBestActions and riskFlags.`,
      });

      if (!result.ok || !result.data) return json({ error: result.error || 'enrich_failed' }, 502);
      return json({ insights: result.data, sources: search.ok ? search.results.slice(0, 4) : [], provider: result.provider });
    }

    return json({ error: 'unknown_mode' }, 400);
  } catch (err) {
    console.error('[audiences/agent]', err);
    return json({ error: 'agent_error' }, 500);
  }
}
