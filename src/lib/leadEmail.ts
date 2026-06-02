/**
 * Server-only: generate a personalised lead email with Azure OpenAI GPT-5.5.
 *
 * Given the chat transcript + captured lead/ICP fields, GPT-5.5 drafts a warm,
 * specific welcome email for the prospect plus a tight briefing for our sales
 * team. The HTML is later wrapped in the branded Trayarunya email shell.
 */

import { getGpt5Env, responsesUrl } from './chatSalesConfig';

export interface LeadEmailInput {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  country?: string;
  segment?: string;
  industry?: string;
  notes?: string;
  transcript?: string;
}

export interface LeadEmailContent {
  subject: string;
  /** Inner HTML for the customer email body (no <html>/<body>/<style>). */
  customerHtml: string;
  /** Plain-ish briefing for the sales team. */
  teamSummary: string;
}

function extractOutputText(data: unknown): string {
  const d = data as Record<string, unknown>;
  if (typeof d?.output_text === 'string' && d.output_text.trim()) {
    return d.output_text as string;
  }
  const output = d?.output as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(output)) return '';
  const parts: string[] = [];
  for (const item of output) {
    if (item?.type !== 'message') continue;
    const content = item.content as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c?.type === 'output_text' && typeof c.text === 'string') parts.push(c.text);
    }
  }
  return parts.join('');
}

function parseJsonLoose(text: string): Record<string, unknown> | null {
  if (!text) return null;
  let t = text.trim();
  // strip ```json ... ``` fences if present
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

const INSTRUCTIONS = `You are the senior B2B growth strategist at Trayarunya Ventures — a partner-first marketing agency ("we don't take clients, we take partners"). Specialty: B2B growth and LinkedIn-led high-ticket pipeline (also B2C & D2C). Tone: warm, sharp, confident, human — never generic or robotic.

You are writing the follow-up email a prospect receives right after chatting with our AI Sales Partner. Use the actual conversation to make it specific to THEM — reference their company, segment, industry, and the exact pain points or goals they mentioned. Do not invent facts not supported by the context.

Return STRICT JSON only (no markdown, no code fences) with exactly these keys:
{
  "subject": "compelling, personalised subject line (max ~70 chars, no emojis spam)",
  "customer_html": "the email body as clean inline HTML",
  "team_summary": "a 4-7 line briefing for our internal sales team"
}

Rules for customer_html:
- 110-180 words. Use ONLY these tags: <p>, <strong>, <em>, <ul>, <li>, <br>, <a>.
- NO <html>, <head>, <body>, <style>, <div>, no inline style attributes, no images.
- Open with a personalised greeting using their first name if known.
- Reference their specific situation and 1-2 pain points/goals from the chat.
- Briefly state how Trayarunya would approach it as their growth partner (1-2 concrete ideas).
- One clear next step (a short discovery call). Sign off as "— The Trayarunya Ventures Growth Team".
- Warm, partner-first, zero fluff.

Rules for team_summary:
- Tight internal notes: who they are, segment/industry/country, their core problem, opportunity, and the recommended next move. Plain sentences separated by \n.`;

/** Generate a personalised lead email via GPT-5.5. Returns null if unavailable. */
export async function generateLeadEmail(input: LeadEmailInput): Promise<LeadEmailContent | null> {
  const env = getGpt5Env();
  if (!env) return null;

  const contextLines = [
    input.name ? `Name: ${input.name}` : '',
    input.email ? `Email: ${input.email}` : '',
    input.company ? `Company: ${input.company}` : '',
    input.phone ? `Phone: ${input.phone}` : '',
    input.country ? `Country: ${input.country}` : '',
    input.segment ? `Segment: ${input.segment}` : '',
    input.industry ? `Industry: ${input.industry}` : '',
    input.notes ? `Notes: ${input.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const userContent = [
    'LEAD DETAILS:',
    contextLines || '(none captured)',
    '',
    'CHAT TRANSCRIPT:',
    input.transcript?.slice(0, 6000) || '(no transcript)',
  ].join('\n');

  try {
    const res = await fetch(responsesUrl(env), {
      method: 'POST',
      headers: { 'api-key': env.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.deployment,
        instructions: INSTRUCTIONS,
        input: [
          {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: userContent }],
          },
        ],
        stream: false,
        store: false,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error('[leadEmail] responses error', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return null;
    }

    const data = await res.json();
    const parsed = parseJsonLoose(extractOutputText(data));
    if (!parsed) return null;

    const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
    const customerHtml = typeof parsed.customer_html === 'string' ? parsed.customer_html.trim() : '';
    const teamSummary = typeof parsed.team_summary === 'string' ? parsed.team_summary.trim() : '';

    if (!customerHtml) return null;

    return {
      subject: subject || 'Your growth plan with Trayarunya Ventures',
      customerHtml,
      teamSummary,
    };
  } catch (err) {
    console.error('[leadEmail] generation failed', err);
    return null;
  }
}
