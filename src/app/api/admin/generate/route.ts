import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { completeText, providerConfigured, type Provider, type ChatMessage } from '@/lib/aiProviders';
import { db } from '@/lib/db';
import { proposalStore } from '@/lib/proposalStore';
import { BRAND } from '@/lib/brandKit';
import type { ArtifactType, DeckSpec, ProposalSpec } from '@/lib/proposalTypes';
import { companyInfo } from '@/data/websiteInfo';
import { services } from '@/data/servicesData';

export const runtime = 'nodejs';
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface Body {
  type?: ArtifactType;
  provider?: Provider;
  prompt?: string;
  leadId?: string;
  conversation?: { role?: string; content?: string }[];
}

const DECK_SHAPE = `{
  "title": "string (punchy deck title)",
  "subtitle": "string (one-line value prop)",
  "client": "string (client/company name, or '' if generic)",
  "slides": [
    { "layout": "title", "heading": "string", "subheading": "string", "accent": "dark" },
    { "layout": "agenda", "kicker": "Agenda", "heading": "What we'll cover", "bullets": ["...", "..."] },
    { "layout": "section", "heading": "Section title", "subheading": "optional", "accent": "green" },
    { "layout": "content", "kicker": "optional eyebrow", "heading": "string", "bullets": ["concise point", "..."], "note": "speaker note" },
    { "layout": "cards", "kicker": "optional", "heading": "string", "cards": [ { "title": "Card title", "body": "1-2 line desc", "badge": "01" } ] },
    { "layout": "stats", "heading": "string", "stats": [ { "value": "3x", "label": "pipeline growth" } ] },
    { "layout": "twoColumn", "heading": "string", "leftHeading": "The problem", "left": ["..."], "rightHeading": "Our fix", "right": ["..."] },
    { "layout": "timeline", "heading": "How we'll roll out", "phases": [ { "phase": "Phase 1 — Foundations", "detail": "..." } ] },
    { "layout": "quote", "quote": "string", "attribution": "string", "accent": "green" },
    { "layout": "closing", "kicker": "Let's partner up", "heading": "Let's build your pipeline", "subheading": "optional CTA" }
  ]
}`;

const PROPOSAL_SHAPE = `{
  "client": "string (client/company name)",
  "title": "string (proposal title)",
  "preparedBy": "${BRAND.company}",
  "intro": "string (2-3 sentence opening that shows we own their pain)",
  "sections": [ { "heading": "string", "body": "1-2 paragraphs", "bullets": ["optional", "..."] } ],
  "pricing": [ { "item": "Engagement / package", "detail": "what's included", "price": "$X / mo" } ],
  "timeline": [ { "phase": "Phase 1 — ...", "detail": "..." } ],
  "cta": "string (clear next step)"
}`;

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const type: ArtifactType = body.type === 'proposal' ? 'proposal' : 'deck';
  let provider: Provider = body.provider === 'claude-opus' ? 'claude-opus' : 'gpt-5.5';
  if (!providerConfigured(provider)) {
    // Fall back to whichever provider is configured.
    provider = provider === 'gpt-5.5' ? 'claude-opus' : 'gpt-5.5';
    if (!providerConfigured(provider)) {
      return json({ error: 'not_configured', message: 'No AI provider is configured.' }, 503);
    }
  }

  // Optional lead grounding.
  let leadBlock = '';
  if (body.leadId) {
    try {
      const lead = await db.leads.findUnique({ where: { id: body.leadId } });
      if (lead) {
        leadBlock = `\n\nTARGET LEAD/CLIENT CONTEXT:\n${JSON.stringify(
          {
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            source: lead.source,
            status: lead.status,
            priority: lead.priority,
            message: lead.message,
            formType: lead.formType,
            notes: lead.notes,
          },
          null,
          2
        )}`;
      }
    } catch {
      /* ignore */
    }
  }

  // Conversation grounding (recent turns).
  let convoBlock = '';
  if (Array.isArray(body.conversation) && body.conversation.length) {
    const lines = body.conversation
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(-20)
      .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`);
    if (lines.length) convoBlock = `\n\nCONVERSATION SO FAR (use as source material):\n${lines.join('\n')}`;
  }

  const serviceLines = services
    .map((s) => `- ${s.name}: ${s.tagline} (solves: ${s.pain}; outcome: ${s.outcome})`)
    .join('\n');

  const system = `You are a senior brand strategist and deck/proposal writer for ${BRAND.company}, a B2B/B2C/D2C digital-marketing agency. ${companyInfo.tagline}

You produce sales collateral that positions ${BRAND.company} as the client's marketing PARTNER who owns their pain points and drives high-ticket pipeline (especially via LinkedIn).

OUR SERVICES (draw on these, do not invent others):
${serviceLines}

OUTPUT RULES — CRITICAL:
- Respond with a SINGLE valid JSON object and NOTHING else. No markdown, no code fences, no commentary.
- Match EXACTLY this ${type === 'deck' ? 'DeckSpec' : 'ProposalSpec'} shape:
${type === 'deck' ? DECK_SHAPE : PROPOSAL_SHAPE}
- For a deck: produce 8-12 slides for a Gamma-style, visually rich narrative. ALWAYS start with a "title" slide and end with a "closing" slide. Use a VARIETY of layouts — favour "cards", "stats", "timeline", "twoColumn", "section" and "quote" over plain bullet "content" slides (use at most 2-3 content slides). Use "cards" to break ideas into 3-6 punchy concept cards (each with a short title + 1-line body). Use "stats" for credible metrics (3x pipeline, 40% reply rate, etc.). Use "timeline" for rollout phases. Use "twoColumn" for problem/solution or before/after with leftHeading + rightHeading. Add a short "kicker" eyebrow to most slides. You may set "accent" to "gold", "green", "dark" or "light" to vary the mood. Keep all text tight (headings <8 words, bullets/card bodies <14 words). Make stats punchy and credible.
- For a proposal: 4-7 sections (e.g. Understanding Your Challenge, Our Approach, What We'll Do, Why ${BRAND.company}, Expected Outcomes). Write persuasive, specific, confident copy. Include realistic pricing tiers and a 3-phase timeline.
- Be specific to the client/context provided. If little context is given, craft a strong, generic-but-premium ${BRAND.company} ${type}.`;

  const userPrompt = `Create a ${type === 'deck' ? 'PowerPoint pitch deck' : 'PDF proposal'} now.${
    body.prompt ? `\n\nBrief from the team: ${body.prompt}` : ''
  }${leadBlock}${convoBlock}\n\nReturn ONLY the JSON object.`;

  const messages: ChatMessage[] = [{ role: 'user', content: userPrompt }];

  let raw = '';
  try {
    raw = await completeText({ provider, messages, system });
  } catch (err) {
    return json(
      { error: 'generation_failed', message: (err as Error)?.message || 'AI generation failed' },
      502
    );
  }

  const spec = extractJson(raw);
  if (!spec) {
    return json({ error: 'parse_failed', message: 'AI did not return valid JSON.' }, 502);
  }

  const title =
    (typeof (spec as { title?: string }).title === 'string' && (spec as { title?: string }).title) ||
    (type === 'deck' ? 'Untitled Deck' : 'Untitled Proposal');
  const client =
    (typeof (spec as { client?: string }).client === 'string' && (spec as { client?: string }).client) ||
    '';

  const saved = proposalStore.save({
    type,
    title,
    client,
    spec: spec as DeckSpec | ProposalSpec,
    createdBy: auth.name || auth.email,
    leadId: body.leadId,
  });

  return json({ ok: true, proposal: saved });
}

/** Best-effort extraction of a JSON object from a model response. */
function extractJson(text: string): unknown | null {
  if (!text) return null;
  let t = text.trim();
  // Strip code fences if present.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // Direct parse.
  try {
    return JSON.parse(t);
  } catch {
    /* try to find the outermost object */
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}
