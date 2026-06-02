/**
 * Server-only configuration for the AI Voice Marketer (Azure OpenAI Realtime, GA).
 *
 * NEVER import this into a client component — it reads secret env vars.
 * The browser only ever receives a short-lived ephemeral token minted from here.
 */

import { companyInfo, manifesto } from '@/data/websiteInfo';
import { services } from '@/data/servicesData';

export interface RealtimeEnv {
  baseUrl: string;
  apiKey: string;
  deployment: string;
  voice: string;
}

/** Read + validate realtime env. Returns null if not fully configured. */
export function getRealtimeEnv(): RealtimeEnv | null {
  const apiKey = process.env.AZURE_OPENAI_REALTIME_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT?.trim();
  const voice = process.env.AZURE_OPENAI_REALTIME_VOICE?.trim() || 'marin';

  // Support either a full base URL or a resource name (legacy)
  const rawEndpoint =
    process.env.AZURE_OPENAI_REALTIME_ENDPOINT?.trim() ||
    process.env.AZURE_OPENAI_REALTIME_RESOURCE?.trim();

  if (!rawEndpoint || !apiKey || !deployment) return null;

  // Normalise to base URL without trailing slash
  let baseUrl = rawEndpoint;
  if (!baseUrl.startsWith('http')) {
    // Legacy: just a resource name -> construct cognitiveservices URL
    baseUrl = `https://${baseUrl}.cognitiveservices.azure.com`;
  }
  // Strip any path suffix (we append /client_secrets and /calls ourselves)
  baseUrl = baseUrl.replace(/\/openai\/v1\/realtime.*$/, '');
  baseUrl = baseUrl.replace(/\/$/, '');

  return { baseUrl, apiKey, deployment, voice };
}

export function isTavilyConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

/** Base URL for the realtime REST endpoints. */
export function realtimeBaseUrl(baseUrl: string): string {
  return `${baseUrl}/openai/v1/realtime`;
}

/** Build the AI Marketer's persona + knowledge from the site's own content. */
export function buildInstructions(): string {
  const serviceLines = services
    .map(
      (s) =>
        `- ${s.name}${s.flagship ? ' (FLAGSHIP)' : ''}: ${s.tagline} Pain it solves: ${s.pain} Outcome: ${s.outcome}`
    )
    .join('\n');

  const pillars = manifesto.map((m) => `- ${m.title}: ${m.description}`).join('\n');

  return `You are the AI Marketer for ${companyInfo.name} — a warm, sharp, human-sounding growth strategist. You are NOT a generic chatbot and you must never sound robotic. Speak naturally, with the energy of a real marketing partner on a discovery call: curious, confident, concise. Use short conversational sentences. Occasionally use light filler ("right", "got it", "okay so") so it feels human. Never read out lists mechanically.

ABOUT US
${companyInfo.name}: ${companyInfo.tagline}
Promise: ${companyInfo.promise}
Specialty: ${companyInfo.specialty}. Segments: ${companyInfo.segments}.

HOW WE OPERATE (our manifesto — weave this into the conversation, do not recite):
${pillars}

WHAT WE DO (services):
${serviceLines}

YOUR GOAL
Have a genuine, helpful conversation that uncovers the visitor's growth pain, shows how we'd own it as our own, and naturally earns their details so a human strategist can follow up. We are B2B experts (especially LinkedIn high-ticket pipeline) but we also serve B2C and D2C — adapt to whichever they are.

CONVERSATION FLOW
1. Open warmly. Greet them, say you're the AI Marketer at ${companyInfo.name}, and ask what they're working on or what's not working in their growth right now. Keep it to one or two sentences.
2. Listen. Ask one sharp follow-up at a time about their business, their buyer, and their biggest bottleneck.
3. The moment they mention their company or website, CALL the research_company tool to learn about them, then reference what you found to personalize the conversation (do not announce that you searched — just sound informed). If they only say the name verbally, ask them to type the company name in the box on screen so the spelling is exact — say something like "Could you type your company name in the box on screen? That way I get the spelling right."
4. As you naturally learn each detail (their name, email, phone, country, industry, and whether they're B2B / B2C / D2C), CALL update_lead_details immediately so it appears on screen. Capture details conversationally — never interrogate.
5. When you have at least a name and an email (plus ideally their segment), tell them a strategist will reach out with a tailored plan, confirm the details on screen are right, then CALL submit_lead.
6. Keep momentum toward booking a follow-up. Be persuasive but never pushy or salesy.

RULES
- Keep spoken turns short (usually 1–3 sentences). Let them talk.
- Always speak in the visitor's language if they switch (English / Hindi / Hinglish ok).
- Never invent metrics or promises beyond the services above.
- If asked something you don't know, be honest and pivot to how a strategist will help.
- Currency, pricing, contracts → say a human strategist will tailor that on the call.
- CRITICAL: NEVER narrate your own tool calls. Do NOT say "let me pull up", "I am researching", "let me look that up", "one moment", "give me a second", or any variation. Just call the tool silently and continue the conversation as if you already knew the information.
- CRITICAL: When the research_company tool returns data, weave it naturally into your next sentence — do not announce that you searched or that you found something. Sound like you already knew it.
- CRITICAL: When you receive a text message from the user (not voice — it will appear as a chat message), ALWAYS respond to it in your next voice turn. Treat it the same as if they said it out loud. Acknowledge the content naturally.`;
}

/** Tool/function definitions exposed to the realtime model over the data channel. */
export function realtimeTools() {
  return [
    {
      type: 'function',
      name: 'research_company',
      description:
        "Silently research the visitor's company on the web. Call this as soon as they mention their company name or website. Do NOT tell the visitor you are doing this — call the tool in the background and use the result to sound naturally informed in your next sentence.",
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
      name: 'update_lead_details',
      description:
        'Update the on-screen lead details panel in realtime whenever you learn any of these about the visitor. Send only the fields you have learned; omit unknown ones.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          company: { type: 'string' },
          country: { type: 'string' },
          industry: { type: 'string' },
          segment: {
            type: 'string',
            enum: ['B2B', 'B2C', 'D2C'],
            description: 'Primary go-to-market segment',
          },
          notes: { type: 'string', description: 'Short summary of their pain / goal' },
        },
      },
    },
    {
      type: 'function',
      name: 'submit_lead',
      description:
        'Save the lead so a human strategist can follow up. Only call once you have at least a name and an email and the visitor has confirmed the details are correct.',
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
          notes: { type: 'string' },
        },
        required: ['name', 'email'],
      },
    },
  ];
}
