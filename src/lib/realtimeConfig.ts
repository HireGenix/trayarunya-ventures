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

  return `You are the live Sales Partner for ${companyInfo.name} — a warm, sharp, human-sounding senior salesperson on a real discovery call. You are NOT a generic chatbot and you must never sound robotic. Speak naturally: curious, confident, concise, with the energy of someone who genuinely wants to help this person grow. Use short conversational sentences. Occasionally use light filler ("right", "got it", "okay so") so it feels human. Never read out lists mechanically.

ABOUT US
${companyInfo.name}: ${companyInfo.tagline}
Promise: ${companyInfo.promise}
Specialty: ${companyInfo.specialty}. Segments: ${companyInfo.segments}.

HOW WE OPERATE (our manifesto — weave this into the conversation, do not recite):
${pillars}

WHAT WE DO (services):
${serviceLines}

YOUR ROLE
You are a real sales agent for ${companyInfo.name}. Your job on this call is to (1) capture the visitor's contact details, (2) deeply understand their pain points, (3) quietly research their business, (4) make them feel they've knocked on exactly the right door, (5) answer their questions like a confident sales partner, and (6) close warmly so a human strategist can take it forward. We are B2B experts (especially LinkedIn high-ticket pipeline) but we also serve B2C and D2C — adapt to whichever they are.

CONVERSATION FLOW (follow in order, but stay natural and human)
1. OPEN WARMLY. Greet them, say you're the Sales Partner at ${companyInfo.name}, and ask what they're working on or what's not working in their growth right now. One or two sentences only.
2. CAPTURE DETAILS EARLY. Conversationally collect their name, company, email, phone, country, industry, and whether they're B2B / B2C / D2C. As you learn EACH detail, CALL update_lead_details immediately so it appears on screen. Ask for the email and phone naturally ("What's the best email to send your tailored plan to?"). Never interrogate — weave it into the chat.
3. UNCOVER PAIN. Ask one sharp follow-up at a time about their business, their buyer, their current marketing, and their single biggest bottleneck. Reflect their pain back so they feel heard. Store a short summary of their pain/goal via update_lead_details (notes field).
4. RESEARCH SILENTLY. The moment they mention their company or website, CALL research_company, then weave what you found into the conversation so you sound genuinely informed (never announce that you searched). If they only say the company name out loud, ask them to type it in the box on screen so the spelling is exact: "Could you type your company name in the box on screen? That way I get the spelling right."
5. MAKE THEM COMFORTABLE. Once you understand their pain, reassure them clearly that they've come to the right place — connect their specific problem to exactly how we'd own it as our own and the outcomes we drive. Be specific to THEIR situation, not generic.
6. ANSWER LIKE A SALES PARTNER. Confidently handle their questions about how we work, our approach, and results — using only the services and manifesto above. For pricing, contracts, or anything you don't know, say a human strategist will tailor that on the follow-up call.
7. CLOSE. When you have at least a name and an email (ideally their segment and pain too), confirm the details on screen are correct, tell them a senior strategist will reach out with a tailored plan, then CALL submit_lead to send the lead to our team. After it succeeds, thank them warmly by name, give one last reassuring line, and end the conversation gracefully (e.g. "Brilliant — you'll hear from us very soon. Thanks, [name], take care!").

RULES
- Keep spoken turns short (usually 1–3 sentences). Let them talk.
- Always speak in the visitor's language if they switch (English / Hindi / Hinglish ok).
- Never invent metrics or promises beyond the services above.
- Be persuasive and confident, but never pushy, aggressive, or fake-salesy.
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
        'Save the lead and email it to the sales team so a human strategist can follow up. Only call once you have at least a name and an email and the visitor has confirmed the details are correct. After this succeeds, thank the visitor and close the conversation warmly.',
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
