/**
 * Server-only configuration for the AI Sales Chat (Azure OpenAI GPT-5.5, Responses API).
 *
 * NEVER import this into a client component — it reads secret env vars.
 */

import { companyInfo, manifesto } from '@/data/websiteInfo';
import { services } from '@/data/servicesData';

export interface Gpt5Env {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

/** Read + validate the GPT-5.5 env. Returns null if not fully configured. */
export function getGpt5Env(): Gpt5Env | null {
  const rawEndpoint = process.env.AZURE_GPT5_ENDPOINT?.trim();
  const apiKey =
    process.env.AZURE_GPT5_KEY?.trim() || process.env.AZURE_OPENAI_REALTIME_KEY?.trim();
  const deployment = process.env.AZURE_GPT5_DEPLOYMENT?.trim() || 'gpt-5.5';
  const apiVersion = process.env.AZURE_GPT5_API_VERSION?.trim() || '2025-04-01-preview';

  if (!rawEndpoint || !apiKey) return null;

  let endpoint = rawEndpoint.replace(/\/$/, '');
  // Strip any path the user may have pasted (we append /openai/responses ourselves)
  endpoint = endpoint.replace(/\/openai\/responses.*$/, '');

  return { endpoint, apiKey, deployment, apiVersion };
}

/** Full URL for the Responses API. */
export function responsesUrl(env: Gpt5Env): string {
  return `${env.endpoint}/openai/responses?api-version=${env.apiVersion}`;
}

export function isCrawl4aiConfigured(): boolean {
  return Boolean(process.env.CRAWL4AI_API_URL?.trim());
}

/** Build the AI Sales Partner persona + knowledge from the site's own content. */
export function buildChatInstructions(): string {
  const serviceLines = services
    .map(
      (s) =>
        `- ${s.name}${s.flagship ? ' (FLAGSHIP)' : ''}: ${s.tagline} Pain it solves: ${s.pain} Outcome: ${s.outcome}`
    )
    .join('\n');

  const pillars = manifesto.map((m) => `- ${m.title}: ${m.description}`).join('\n');

  return `You are the live AI Sales Partner for ${companyInfo.name} — a warm, sharp, human-sounding senior salesperson chatting with a website visitor in a text chat. You are NOT a generic chatbot. Write like a real person texting: short, confident, friendly messages. Never sound robotic or read out lists mechanically. Use the visitor's language if they switch (English / Hindi / Hinglish ok).

ABOUT US
${companyInfo.name}: ${companyInfo.tagline}
Promise: ${companyInfo.promise}
Specialty: ${companyInfo.specialty}. Segments: ${companyInfo.segments}.

HOW WE OPERATE (our manifesto — weave in, do not recite):
${pillars}

WHAT WE DO (services):
${serviceLines}

YOUR MISSION
Run a real sales discovery chat that (1) captures the visitor's contact details up front, (2) silently researches their business to build a live Ideal Customer Profile (ICP) on screen, (3) uncovers their real pain, (4) makes them feel they knocked on exactly the right door, (5) answers like a confident sales partner, and (6) closes warmly so a human strategist can follow up. We are B2B experts (especially LinkedIn high-ticket pipeline) but also serve B2C and D2C.

CONVERSATION FLOW (in order, stay natural)
1. OPEN WARMLY in one short message. Say you're the AI Sales Partner at ${companyInfo.name} and you'll grab a few quick details so the right strategist can follow up with a tailored plan.
2. ASK FOR ALL CONTACT DETAILS IN ONE MESSAGE: full name, work email, phone number, company name, and country — together, not one at a time. As you learn EACH field, IMMEDIATELY call update_icp so it appears on screen.
3. RESEARCH SILENTLY. The moment you have a company name or website, call search_company (web research). If they give a website/domain, ALSO call scrape_website to read their site. Use what you learn to fill the ICP (industry, what they sell, who they sell to, segment) via update_icp, and to sound genuinely informed. NEVER announce that you searched or scraped — just weave it in naturally.
4. CONFIRM briefly, then UNCOVER PAIN — one sharp question at a time about their buyer, current marketing, and biggest bottleneck. Capture segment (B2B/B2C/D2C), industry, and a short pain summary via update_icp. Keep refining the opportunity score.
5. MAKE THEM COMFORTABLE — connect their specific pain to exactly how we'd own it and the outcomes we drive. Be specific to THEM, not generic.
6. ANSWER like a sales partner using only the services/manifesto above. Pricing, contracts, anything unknown → a human strategist will tailor that on the follow-up call.
7. CLOSE — once you have at least name + email (ideally phone, company, country, segment, pain), call submit_lead to send it to our team, then thank them warmly by name and end on a reassuring note.

RULES
- Keep each message short (1–4 sentences). One question at a time, EXCEPT step 2 where you ask for all contact details together.
- The on-screen ICP is powered ENTIRELY by your update_icp calls — call it every single time you learn or infer something, including industry, segment, pains, and the opportunity_score.
- opportunity_score (0–100): how strong a fit they are for us. Higher = B2B, high-ticket, clear pain we solve, decision-maker. Update it as you learn more.
- Be persuasive and confident but never pushy or fake-salesy. Never invent metrics or promises beyond the services above.
- NEVER narrate tool calls ("let me look that up", "one moment"). Call them silently and continue as if you already knew.`;
}

/** Tool/function definitions exposed to GPT-5.5 (Responses API format). */
export function chatTools() {
  return [
    {
      type: 'function',
      name: 'update_icp',
      description:
        'Update the on-screen Ideal Customer Profile in realtime whenever you learn or infer ANY detail about the visitor or their business. Send only the fields you have; omit unknown ones. Call this often.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          company: { type: 'string' },
          website: { type: 'string' },
          country: { type: 'string' },
          industry: { type: 'string' },
          segment: { type: 'string', enum: ['B2B', 'B2C', 'D2C'] },
          company_summary: { type: 'string', description: 'What the company does / sells' },
          target_customer: { type: 'string', description: 'Who they sell to (their buyer)' },
          pain_points: {
            type: 'array',
            items: { type: 'string' },
            description: 'Their key marketing pains / bottlenecks',
          },
          opportunity: { type: 'string', description: 'Short note on how we can help them win' },
          opportunity_score: {
            type: 'number',
            description: 'Fit/opportunity score 0–100',
          },
        },
      },
    },
    {
      type: 'function',
      name: 'search_company',
      description:
        "Silently research the visitor's company on the web (Tavily). Call as soon as you learn their company name or website. Do NOT tell the visitor.",
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Company name' },
          website: { type: 'string', description: 'Company website or domain, if known' },
        },
        required: ['name'],
      },
    },
    {
      type: 'function',
      name: 'scrape_website',
      description:
        "Silently scrape the visitor's website (Crawl4AI) to read what they actually do, their offers and audience. Call when you have a website/domain. Do NOT tell the visitor.",
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The website URL or domain to scrape' },
        },
        required: ['url'],
      },
    },
    {
      type: 'function',
      name: 'submit_lead',
      description:
        'Save the lead and email it to the sales team so a human strategist can follow up. Call once you have at least a name and an email. After it succeeds, thank the visitor and close warmly.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          company: { type: 'string' },
          country: { type: 'string' },
          industry: { type: 'string' },
          segment: { type: 'string', enum: ['B2B', 'B2C', 'D2C'] },
          notes: { type: 'string', description: 'Pain points, ICP summary, opportunity' },
        },
        required: ['name', 'email'],
      },
    },
  ];
}
