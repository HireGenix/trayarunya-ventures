import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/authToken';
import { runStructured, anyProviderConfigured } from '@/lib/marketingOs/agentKit';
import type { JourneyAgentMode, JourneyDefinition } from '@/lib/marketingOs/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const NODE_KINDS = [
  'start',
  'split',
  'offer',
  'holdout',
  'send',
  'wait',
  'condition',
  'upsell',
  'remarketing',
  'exit',
] as const;
const CHANNELS = ['Email', 'SMS', 'Ads', 'Push', 'In-app'] as const;

const configSchema = z
  .object({
    splitPercent: z.number().optional(),
    holdoutPercent: z.number().optional(),
    waitValue: z.number().optional(),
    waitUnit: z.enum(['minutes', 'hours', 'days']).optional(),
    businessHoursOnly: z.boolean().optional(),
    frequencyCap: z.number().optional(),
    adPlatform: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .partial();

const designSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(NODE_KINDS),
        label: z.string(),
        channel: z.enum(CHANNELS).optional(),
        branch: z.enum(['a', 'b']).nullable().optional(),
        config: configSchema.optional(),
      }),
    )
    .min(3)
    .max(14),
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        kind: z.enum(['solid', 'dashed']),
        label: z.string().optional(),
      }),
    )
    .max(20),
});

const copySchema = z.object({
  subject: z.string(),
  body: z.string(),
  cta: z.string(),
});

const optimizeSchema = z.object({
  score: z.number(),
  summary: z.string(),
  improvements: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        impact: z.enum(['high', 'medium', 'low']),
      }),
    )
    .max(8),
  missingChannels: z.array(z.string()).max(6),
});

function normalizeDefinition(def: z.infer<typeof designSchema>): JourneyDefinition {
  return {
    nodes: def.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      channel: n.channel,
      branch: n.branch ?? null,
      config: { enabled: true, ...(n.config ?? {}) },
    })),
    edges: def.edges.map((e, i) => ({
      id: `e_${i}_${Math.random().toString(36).slice(2, 6)}`,
      from: e.from,
      to: e.to,
      kind: e.kind,
      label: e.label,
    })),
  };
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  if (!anyProviderConfigured()) {
    return json({ error: 'not_configured', message: 'No AI provider configured.' }, 503);
  }

  let body: {
    mode?: JourneyAgentMode;
    goal?: string;
    audienceName?: string;
    persona?: string;
    node?: { kind?: string; channel?: string; label?: string };
    definition?: JourneyDefinition;
    metrics?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const mode = body.mode ?? 'design';

  try {
    /* -------------------- design: goal -> graph ----------------------- */
    if (mode === 'design') {
      const goal = (body.goal || '').trim();
      if (!goal) return json({ error: 'goal_required' }, 400);

      const result = await runStructured({
        schema: designSchema,
        system: `You are a lifecycle-marketing journey architect. Design a real, omni-channel journey as a node graph.
Allowed node kinds: ${NODE_KINDS.join(', ')}. Allowed channels: ${CHANNELS.join(', ')}.
Rules:
- The first node MUST be kind "start".
- Use "split" for A/B tests (set config.splitPercent) and pair branch nodes with branch "a"/"b".
- Use "holdout" (set config.holdoutPercent) to measure incremental lift.
- "send", "upsell", "remarketing" nodes MUST have a channel.
- "wait" nodes set config.waitValue + config.waitUnit.
- Give every node a short stable id (e.g. "n1") and connect them with edges (dashed for branch/secondary paths).
- 6-10 nodes is ideal. Make it production-realistic.`,
        user: `Goal: ${goal}\nAudience: ${body.audienceName || 'general B2B leads'}\nPersona: ${body.persona || 'unknown'}`,
      });

      if (!result.ok || !result.data) return json({ error: result.error || 'design_failed' }, 502);
      return json({ definition: normalizeDefinition(result.data), provider: result.provider });
    }

    /* ----------------------- copy: per-node --------------------------- */
    if (mode === 'copy') {
      const node = body.node || {};
      const result = await runStructured({
        schema: copySchema,
        system:
          'You are a senior conversion copywriter. Write tight, on-brand copy for a single journey step. Match the channel\'s norms (SMS = short, Email = subject + body, Ads = punchy). No placeholders.',
        user: `Channel: ${node.channel || 'Email'}\nStep: ${node.label || 'Send message'}\nStep type: ${node.kind || 'send'}\nJourney goal: ${body.goal || 'drive conversions'}\nAudience: ${body.audienceName || 'B2B leads'}\nPersona: ${body.persona || 'unknown'}\n\nReturn subject, body and cta.`,
      });
      if (!result.ok || !result.data) return json({ error: result.error || 'copy_failed' }, 502);
      return json({ copy: result.data, provider: result.provider });
    }

    /* ---------------------- optimize: AI review ----------------------- */
    if (mode === 'optimize') {
      const def = body.definition ?? { nodes: [], edges: [] };
      const channels = Array.from(new Set(def.nodes.map((n) => n.channel).filter(Boolean)));
      const kinds = def.nodes.map((n) => n.kind);
      const result = await runStructured({
        schema: optimizeSchema,
        system:
          'You are a lifecycle-optimization expert. Critique a journey for conversion, deliverability, measurement (holdouts) and omni-channel coverage. Score 0-100. Be specific and actionable.',
        user: `Goal: ${body.goal || 'conversion'}\nNodes (${def.nodes.length}): ${kinds.join(
          ', ',
        )}\nChannels used: ${channels.join(', ') || 'none'}\nHas holdout: ${kinds.includes(
          'holdout',
        )}\nHas A/B split: ${kinds.includes('split')}\nMetrics: ${JSON.stringify(
          body.metrics || {},
        )}\n\nReturn score, summary, improvements (title/detail/impact) and missingChannels.`,
      });
      if (!result.ok || !result.data) return json({ error: result.error || 'optimize_failed' }, 502);
      return json({ optimization: result.data, provider: result.provider });
    }

    return json({ error: 'unknown_mode' }, 400);
  } catch (err) {
    console.error('[journeys/agent]', err);
    return json({ error: 'agent_error' }, 500);
  }
}
