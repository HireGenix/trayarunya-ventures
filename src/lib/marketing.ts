/**
 * Marketing copy for the MarketiQ AI landing site.
 * Sourced from the live platform (30+ dashboard modules), the agentic engine,
 * and the LinkedIn Copilot macOS app.
 */

export const BRAND = {
  amber: '#FFAF06',
  amberDeep: '#E89200',
  teal: '#14BB87',
  tealDeep: '#0FA874',
  pink: '#D92C4A',
  blue: '#2563EB',
  violet: '#7C3AED',
  ink: '#0E1116',
  gradient: 'linear-gradient(135deg, #FFAF06 0%, #14BB87 100%)',
  gradientText: 'linear-gradient(90deg, #FFAF06 0%, #14BB87 100%)',
};

export const hero = {
  badge: 'The Autonomous Go-To-Market Operating System',
  titleLead: 'Your entire go-to-market motion,',
  titleGradient: 'researching, strategising & shipping',
  titleTail: 'on autopilot.',
  subtitle:
    'MarketiQ AI is an Autonomous Go-To-Market Operating System powered by 45 AI agents and 26 autonomous optimization loops that continuously research, strategize, create, publish, optimize, and learn across your entire go-to-market — built for both Enterprise (B2B) and Consumer (B2C/D2C) motions.',
  primaryCta: 'Start free',
  secondaryCta: 'See how it works',
  microProof: 'No credit card · Point it at your website · Watch a real GTM strategy appear',
  audiences: ['Enterprise GTM (B2B)', 'Consumer GTM (B2C/D2C)'],
};

export const trustLine = 'One closed GTM loop · 45 AI agents under an AI CMO · 26 autonomous loops · learns from every result · built for Enterprise (B2B) and Consumer (B2C/D2C) go-to-market';

export const loop = {
  eyebrow: 'ONE CLOSED GTM LOOP',
  title: 'Five agentic stages. One compounding go-to-market system.',
  subtitle:
    'Every stage of your go-to-market feeds the next, and real performance data feeds back to the start — so each cycle is sharper than the last, whether you sell to enterprises or consumers.',
  stages: [
    {
      n: '01',
      key: 'research',
      title: 'Deep Research',
      color: BRAND.teal,
      desc: 'Autonomous agents crawl your site and the live web, map real demand, size the market and read every competitor — so your go-to-market starts from evidence, not opinions.',
    },
    {
      n: '02',
      key: 'strategy',
      title: 'GTM Strategy',
      color: BRAND.amber,
      desc: 'An AI strategist turns that evidence into positioning, ICP & segments, a full funnel, lead magnets and a date-aware calendar — tuned for B2B pipeline or B2C/D2C demand.',
    },
    {
      n: '03',
      key: 'create',
      title: 'Creation Studio',
      color: BRAND.pink,
      desc: 'On-brand posts, carousels, threads, blogs, lead magnets and decks — written in your voice and colours, QA-gated before anything ships.',
    },
    {
      n: '04',
      key: 'publish',
      title: 'Publish & Advertise',
      color: BRAND.blue,
      desc: 'Schedule and push to LinkedIn, X, Instagram, Facebook & YouTube via native OAuth. Agentic ads create and optimise campaigns — including Google Ad Grants.',
    },
    {
      n: '05',
      key: 'learn',
      title: 'Learn & Compound',
      color: BRAND.violet,
      desc: 'Every decision is measured and attributed back to real outcomes. Winning plays become a learned policy that flows into every agent automatically — so the engine doesn\'t just repeat, it gets measurably smarter for your company with each cycle.',
    },
  ],
};

export const deepDives = [
  {
    key: 'research',
    eyebrow: 'AGENTIC RESEARCH',
    title: 'Research that reads the whole market — not a survey of three blogs.',
    body: 'Point MarketiQ at your domain. Autonomous agents crawl your site and the open web, cluster real audience questions, and benchmark every competitor so your strategy starts from evidence.',
    points: [
      'Live web + competitor crawl with resilient, always-on coverage',
      'Demand and audience-question mining surfaced in Insights',
      'Competitor teardown and positioning gaps',
      'Ideal Customer Profile (ICP) builder with firmographics & pains',
    ],
    color: BRAND.teal,
  },
  {
    key: 'strategy',
    eyebrow: 'MASTER STRATEGIST',
    title: 'A strategist that turns evidence into a plan you could ship today.',
    body: 'An AI strategist converts research into positioning, content pillars, a full funnel, lead-magnet ideas and a date-aware calendar — with a rationale for every choice.',
    points: [
      'Positioning, messaging pillars & a complete funnel',
      'Date-aware content calendar (seasonality + your cadence)',
      'Lead-magnet and offer ideation tied to pipeline',
      'Forecast & scenario planning for reach and pipeline',
    ],
    color: BRAND.amber,
  },
  {
    key: 'studio',
    eyebrow: 'CREATION STUDIO + AI DECKS',
    title: 'On-brand content and investor-grade decks, generated in your voice.',
    body: 'Generate posts, carousels, threads, blogs and lead magnets — then open the Decks studio for Gamma-style presentations with structured layouts, AI imagery and per-slide editing. Everything stays in your brand colours and is QA-gated before it ships.',
    points: [
      'Posts, carousels, threads, blogs & lead magnets in your voice',
      'Gamma-style AI decks: cards, process flows & comparison tables',
      'AI-generated imagery or curated stock — always on-brand',
      'Brand Brain keeps colours, tone and logo consistent everywhere',
    ],
    color: BRAND.pink,
  },
  {
    key: 'publish',
    eyebrow: 'PUBLISHING & AGENTIC ADS',
    title: 'One click to every channel — and ads that optimise themselves.',
    body: 'Connect your accounts with native OAuth and schedule once. MarketiQ writes per-channel captions and trending hashtags, then agentic ad campaigns launch, watch performance and reallocate budget on their own.',
    points: [
      'Native OAuth: LinkedIn, X, Instagram, Facebook, YouTube',
      'Per-channel captions, hashtags & scheduling in one calendar',
      'Agentic Google Ads — incl. Ad Grants detection for nonprofits',
      'Revenue attribution that ties content & ads back to pipeline',
    ],
    color: BRAND.blue,
  },
  {
    key: 'brain',
    eyebrow: 'THE GTM BRAIN · AI CMO',
    title: 'A self-learning brain that runs the team — and gets smarter every cycle.',
    body: 'An AI CMO sets direction and guides all 41 agents like a real marketing team. Every decision is attributed to real outcomes, winning plays become a learned policy, and a private in-tenant memory compounds your company\'s edge — so the system improves itself without you in the loop.',
    points: [
      'AI CMO orchestrates and guides the full 40-agent roster',
      'Closed-loop learning: every result re-trains the next play',
      'Private per-workspace semantic memory that compounds over time',
      'Real ML & econometrics — lead scoring, attribution, forecasting',
    ],
    color: BRAND.violet,
  },
  {
    key: 'frontier',
    eyebrow: 'FRONTIER GTM',
    title: 'Four cutting-edge channels most marketers haven\'t touched yet.',
    body: 'MarketiQ ships dedicated agents for the four fastest-growing GTM channels: AI answer-engine optimization (AEO/GEO), retail & commerce media, zero-party data capture, and disclosed synthetic UGC — all evidence-backed and guardrailed.',
    points: [
      'AEO/GEO: measure and win citations inside ChatGPT, Perplexity & AI Overviews',
      'Retail media: Amazon Ads, Walmart Connect, Instacart & TikTok Shop planning',
      'Zero-party data: preference capture feeding lead score, email & lifecycle',
      'Synthetic UGC: disclosed AI creators with no-impersonation guardrails',
    ],
    color: BRAND.tealDeep,
  },
];

export const modules = {
  eyebrow: 'EVERYTHING IN ONE COCKPIT',
  title: '30+ connected modules, not a folder of disconnected tools.',
  subtitle: 'Each module shares the same research, brand and data layer — so insight in one place sharpens every other, across both your B2B and B2C go-to-market.',
  groups: [
    {
      name: 'Pipeline',
      color: BRAND.teal,
      items: [
        ['Customer Profile', 'ICP builder with firmographics & pains'],
        ['Research', 'Autonomous web + competitor research'],
        ['Insights', 'Demand & audience-question mining'],
        ['Strategy', 'Positioning, pillars, funnel & calendar'],
        ['Content Calendar', 'Date-aware, drag-and-drop planning'],
        ['Content Studio', 'Posts, threads, blogs & lead magnets'],
        ['Decks', 'Gamma-style AI presentations'],
        ['Publishing', 'Schedule & push to every network'],
      ],
    },
    {
      name: 'Brand & Growth',
      color: BRAND.amber,
      items: [
        ['Brand Brain', 'Colours, tone & logo intelligence'],
        ['Ads', 'Agentic campaign creation & optimisation'],
        ['Analytics', 'Cross-channel performance'],
        ['Reports', 'Client-ready, on-brand reporting'],
      ],
    },
    {
      name: 'Intelligence',
      color: BRAND.pink,
      items: [
        ['CRO Score', 'Conversion-rate diagnostics'],
        ['Creative Intel', 'What creative actually performs'],
        ['Experiments', 'A/B tests & lift measurement'],
        ['Forecast', 'Reach & pipeline projections'],
        ['Watchtower', 'Competitor & market monitoring'],
      ],
    },
    {
      name: 'Frontier GTM',
      color: BRAND.tealDeep,
      items: [
        ['AI Visibility', 'AEO/GEO: citations in AI answer engines'],
        ['Retail Media', 'Commerce-media plans for Amazon, Walmart & more'],
        ['Zero-Party Data', 'Preference capture → leadscore, email & lifecycle'],
        ['Synthetic UGC', 'Disclosed AI creators with guardrails'],
      ],
    },
    {
      name: 'B2B Engine',
      color: BRAND.blue,
      items: [
        ['ABM Accounts', 'Target-account orchestration'],
        ['Campaign Builder', 'Multi-touch campaign design'],
        ['Revenue Attribution', 'Content & ads → pipeline'],
      ],
    },
    {
      name: 'Automation',
      color: BRAND.violet,
      items: [
        ['Workflows', 'Trigger-based automations'],
        ['Tasks', 'AI-assigned, tracked to done'],
      ],
    },
    {
      name: 'Account',
      color: BRAND.tealDeep,
      items: [
        ['Client Portal', 'White-label approvals & reports'],
        ['Integrations', 'Native OAuth to every channel'],
        ['Billing', 'Plans, usage & invoices'],
      ],
    },
  ],
};

export const decks = {
  eyebrow: 'AI DECKS',
  title: 'Gamma-grade decks, generated and editable — right inside the engine.',
  subtitle:
    'Describe the deck; MarketiQ designs structured slides with cards, process flows and comparison tables, generates on-brand imagery, and lets you edit or regenerate any slide with AI.',
  features: [
    'Structured layouts: card grids, numbered process flows, comparison matrices',
    'Per-slide “Edit with AI” — rewrite copy, change design or regenerate the image',
    'AI-generated imagery with smart fallback, or curated stock',
    'Export to PPTX & PDF with full brand and layout parity',
  ],
};

export const chromeExtension = {
  eyebrow: 'CHROME EXTENSION',
  badge: 'MarketiQ Ai · for Chrome',
  title: 'Download our Chrome extension for LinkedIn optimization and outreach — your AI copilot.',
  subtitle:
    'MarketiQ Ai rides along on LinkedIn: audits and optimizes your profile, analyses any prospect with AI, drafts policy-safe connection notes and replies, and syncs every engagement back to your pipeline — automatically.',
  // Direct download until the Chrome Web Store listing is approved — then swap to the store detail URL.
  storeUrl: 'https://mymarketiq.online',
  cta: 'Download for Chrome — Free',
  storeNote: 'Coming soon to the Chrome Web Store — for now, install manually in under a minute.',
  features: [
    { icon: '🪞', title: 'Profile optimization', desc: 'AI audit of your own profile with copy-ready headline, about and banner suggestions.' },
    { icon: '🎯', title: 'AI prospect coach', desc: 'Open any profile — the agent analyses it and recommends connect, engage-first or nurture.' },
    { icon: '✍️', title: '280-char smart notes', desc: 'Personalized connection notes and replies, always within LinkedIn limits.' },
    { icon: '🔁', title: 'Pipeline auto-sync', desc: 'Connects, messages and follow-ups log to your MarketiQ workspace in real time.' },
  ],
  steps: [
    'Download & unzip',
    'Open chrome://extensions and turn on Developer mode',
    'Click “Load unpacked” and select the MarketiQ-Ai folder',
    'Open LinkedIn — your copilot appears',
  ],
};

export const desktop = {
  eyebrow: 'macOS DESKTOP APP',
  badge: 'LinkedIn Copilot · for macOS',
  title: 'A native LinkedIn growth cockpit that guides — while you stay in control.',
  subtitle:
    'MarketiQ also ships a macOS desktop app: LinkedIn Copilot. AI suggests the best next action and drafts every message — you perform each click, at a human pace, completely policy-safe.',
  principles: [
    { icon: '🧠', title: 'AI guides, you act', desc: 'The copilot recommends the highest-impact next move and drafts the content — you make every click.' },
    { icon: '🛡️', title: 'LinkedIn policy-safe', desc: 'No bots, no automation. Human-pace daily caps keep your account safe.' },
    { icon: '🔒', title: 'Never stores passwords', desc: 'Login happens in an isolated, embedded browser session — credentials never touch our servers.' },
    { icon: '👥', title: 'Multi-account', desc: 'Run each account in its own window with fully isolated sessions.' },
  ],
  modules: ['Profile Studio', 'Personal Brand', 'Content Studio', 'Content Calendar', 'Publishing', 'Lead Pipeline', 'Outreach Sequences', 'Live Copilot', 'AutoPilot', 'Strategy'],
};

export const segments = {
  eyebrow: 'BUILT FOR FOUNDER-LED GO-TO-MARKET',
  title: 'Replace your 12-tool GTM stack with one autonomous engine.',
  subtitle:
    'Purpose-built for seed & Series-A B2B SaaS founders and solo GTM leads — then it scales with you into full B2B and B2C/D2C motions, automatically.',
  items: [
    {
      title: 'Founders & solo GTM (1–20)',
      desc: 'No marketing team yet? Point it at your site and get research, ICP, positioning, a content calendar and investor/customer outreach in minutes — the work of a whole GTM team, on autopilot.',
      color: BRAND.amber,
    },
    {
      title: 'Enterprise GTM (B2B)',
      desc: 'Account-based orchestration, multi-touch campaigns, ICP & buying-committee research, LinkedIn outreach and revenue attribution that ties every play back to pipeline.',
      color: BRAND.blue,
    },
    {
      title: 'Consumer GTM (B2C / D2C)',
      desc: 'Demand creation at scale — social-first content, performance ads, trend-aware calendars, influencer and email/SMS plays tuned for shopping behaviour and brand love.',
      color: BRAND.pink,
    },
  ],
};

export const stack = {
  eyebrow: 'WHY MARKETIQ',
  title: 'An unfair go-to-market advantage, built in.',
  subtitle: 'Enterprise-grade intelligence and a single cockpit your whole revenue and brand team can run go-to-market from — B2B or B2C.',
  items: [
    { k: 'Agentic, not assistive', v: 'Agents that run your GTM, not just suggest' },
    { k: 'One closed loop', v: 'Research to revenue, fully connected' },
    { k: 'B2B + B2C native', v: 'Tuned for pipeline or for demand at scale' },
    { k: 'On-brand by default', v: 'Your voice, colours and logo everywhere' },
    { k: 'Always-on', v: 'Research and optimisation around the clock' },
    { k: 'Enterprise-ready', v: 'Roles, approvals, SSO & white-label portals' },
  ],
};

export const stats = [
  { value: '41', label: 'AI agents under one AI CMO' },
  { value: '23', label: 'autonomous optimization loops' },
  { value: '2', label: 'go-to-market motions: B2B & B2C' },
  { value: '24/7', label: 'always-on research & optimisation' },
];

/* ------------------------------------------------------------------------ */
/* Why MarketiQ — the differentiator section (before/after + reasons).       */
/* ------------------------------------------------------------------------ */
export const why = {
  eyebrow: 'WHY MARKETIQ',
  title: 'The old GTM stack is broken. One engine fixes it.',
  subtitle:
    'Teams duct-tape a dozen disconnected tools and still do the work by hand. MarketiQ replaces the stack with one autonomous engine that researches, plans, ships, and learns — on its own.',
  before: {
    label: 'The 12-tool GTM stack',
    points: [
      'A folder of disconnected tools that don’t share data',
      'Hours of manual copy-paste between research, docs and schedulers',
      'Generic AI output that any competitor could have written',
      'No memory — every campaign starts from a blank page',
      '$2k+/mo in subscriptions before a freelancer retainer',
    ],
  },
  after: {
    label: 'MarketiQ — one autonomous engine',
    points: [
      'One Revenue Graph — every stage reads & writes the same truth',
      '44 agents run the work end-to-end under an AI CMO',
      'On-brand, evidence-first output grounded in your real data',
      'A learning loop that compounds — it gets smarter every cycle',
      'Replaces the stack and the busywork for one predictable price',
    ],
  },
  reasons: [
    {
      k: 'Agentic, not assistive',
      v: 'A 43-agent team that actually runs your go-to-market — each agent perceives live channel signals, calls 100+ real tools, and acts — not a chat box that waits for prompts.',
      color: BRAND.teal,
    },
    {
      k: 'Tools + senses, not just text',
      v: 'Every specialist sees a live snapshot of your channels and wields 100+ workspace-scoped tools — research, forecasts, audits, and governed actuators — so it decides on what is true now, never blind.',
      color: BRAND.amberDeep,
    },
    {
      k: 'One closed loop',
      v: 'Research → strategy → content → campaigns → revenue, all connected through a single Revenue Graph so insight in one place sharpens every other.',
      color: BRAND.amber,
    },
    {
      k: 'It learns & compounds',
      v: 'Every decision is measured and attributed to real outcomes. Winning plays become a learned policy — including a win-probability model fit on your own closed deals.',
      color: BRAND.violet,
    },
    {
      k: 'Evidence-first, no fabrication',
      v: 'Every number carries its source, timestamp and confidence. Honest gaps are reported, never back-filled with fake metrics.',
      color: BRAND.blue,
    },
    {
      k: 'You govern the AI',
      v: 'Earned, risk-tiered autonomy under a kill-switch: real spend & publishing only fire for proven agents, else they wait for one-click approval. Plus model control, cost limits and a full audit trail.',
      color: BRAND.pink,
    },
    {
      k: 'B2B + B2C native',
      v: 'One engine, tuned automatically to your motion — account-based pipeline for B2B, demand-at-scale for B2C/D2C.',
      color: BRAND.tealDeep,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* ROI calculator — copy for the embedded interactive section.               */
/* ------------------------------------------------------------------------ */
export const roiCalc = {
  eyebrow: 'ROI CALCULATOR',
  title: 'See what MarketiQ pays back — in seconds.',
  subtitle:
    'Pick the tools you’d replace and your team’s GTM hours. We’ll show the stack you cut, the hours you save, and how fast a plan pays for itself. Real math, no sign-up.',
  defaultTools: ['jasper', 'hubspot', 'buffer', 'freelancer'],
};

/* ------------------------------------------------------------------------ */
/* Launch — June 30, 2026 announcement.                                      */
/* ------------------------------------------------------------------------ */
export const launch = {
  date: 'June 30, 2026',
  bannerText: 'MarketiQ AI launches June 30, 2026',
  bannerCta: 'Get early access',
  bannerHref: 'https://mymarketiq.online',
};

/* ------------------------------------------------------------------------ */
/* Security & Responsible AI — enterprise trust section.                     */
/* ------------------------------------------------------------------------ */
export const security = {
  eyebrow: 'SECURITY & RESPONSIBLE AI',
  title: 'Autonomous, but always under your control.',
  subtitle:
    'Agents run your go-to-market 24/7 — inside guardrails you set. Every action is governed, attributable and reversible, with evidence behind every number.',
  pillars: [
    {
      k: 'You govern the models',
      v: 'A superadmin model registry — pick the AI model per agent or workspace. No hard-coded models, ever.',
      color: BRAND.violet,
    },
    {
      k: 'Autonomy switchboard + kill-switch',
      v: 'Set each agent to suggest, approve or auto. Pause any agent — or the whole engine — in one click.',
      color: BRAND.teal,
    },
    {
      k: 'Brand & compliance guardrails',
      v: 'Tone, claims and policy checks gate every output before anything ships in your name.',
      color: BRAND.amber,
    },
    {
      k: 'Evidence-first, no fabrication',
      v: 'Every metric carries its source, timestamp and confidence. Honest gaps are shown, never faked.',
      color: BRAND.blue,
    },
    {
      k: 'Full audit trail',
      v: 'Every agent decision and human action is logged and attributable — defensible by design.',
      color: BRAND.pink,
    },
    {
      k: 'Enterprise access control',
      v: 'Roles & permissions, SSO, encrypted secrets, per-workspace isolation and white-label portals.',
      color: BRAND.tealDeep,
    },
  ],
  badges: ['Role-based access', 'SSO', 'Encrypted at rest', 'Audit logging', 'Cost limits', 'Data isolation'],
};

export const pricing = {
  eyebrow: 'PRICING',
  title: 'Plans that scale with your go-to-market.',
  subtitle:
    'Simple monthly credits — AI credits, images and emails — that reset every month. Start free, upgrade as your GTM engine earns it. Built for B2B and B2C teams alike.',
  // Pricing: monthly = full list price (no discount). Yearly billing = 25% off.
  annualLabel: 'Yearly · save 25%',
  saveLabel: 'Save 25%',
  plans: [
    {
      code: 'starter',
      name: 'Starter',
      tagline: 'For lean teams launching one go-to-market',
      monthly: 299,
      yearlyPerMonth: Math.round(299 * 0.75),
      yearlyTotal: Math.round(299 * 12 * 0.75),
      popular: false,
      features: [
        '250 AI credits / month',
        '50 images / month',
        '10,000 emails / month',
        '3 team members · 1 workspace',
        'All 45 AI agents & 26 autonomous loops',
        'Publishing, team chat & project management',
        'LinkedIn outreach — add $50/mo per profile',
      ],
      cta: 'Start with Starter',
    },
    {
      code: 'growth',
      name: 'Growth',
      tagline: 'For growing teams that ship every day',
      monthly: 999,
      yearlyPerMonth: Math.round(999 * 0.75),
      yearlyTotal: Math.round(999 * 12 * 0.75),
      popular: true,
      features: [
        '1,000 AI credits / month',
        '250 images / month',
        '50,000 emails / month',
        '15 team members · 1 workspace',
        'Everything in Starter',
        'LinkedIn outreach — add $50/mo per profile',
        'Premium support',
      ],
      cta: 'Choose Growth',
    },
    {
      code: 'agency',
      name: 'Agency',
      tagline: 'For agencies running many client engines',
      monthly: 2999,
      yearlyPerMonth: Math.round(2999 * 0.75),
      yearlyTotal: Math.round(2999 * 12 * 0.75),
      popular: false,
      features: [
        '3,000 AI credits / month',
        '1,000 images / month',
        '250,000 emails / month',
        'Unlimited team members',
        '5 workspaces — one per client',
        'White-label client portals',
        'API access',
        'Priority support',
      ],
      cta: 'Go Agency',
    },
  ],
  enterprise: {
    name: 'Enterprise',
    price: 'From $5,000/mo',
    tagline: 'Custom quotas and dedicated infrastructure for large teams.',
    features: ['Custom credit quotas', 'Dedicated infrastructure', 'Custom SLAs · 24×7 support', 'Dedicated success manager'],
    cta: 'Talk to sales',
    href: 'mailto:info@trayarunyaventures.com?subject=MarketIQ%20Enterprise',
  },
  seatNote: 'Credits reset monthly. You always see exactly what\u2019s left — AI credits, images and emails.',
  agencyNote: 'Need custom quotas, more seats or dedicated infrastructure?',
  contactEmail: 'mailto:info@trayarunyaventures.com?subject=MarketIQ%20Enterprise',
  freeNote: 'Or start free — no card needed (25 AI credits, 10 images, 100 emails, 1 workspace)',
  // Paid add-ons layered on top of any plan (billed separately).
  addonsHeading: 'Power-ups, when you need them',
  addons: [
    {
      kind: 'linkedin_outreach',
      name: 'LinkedIn Outreach',
      price: '$50/mo',
      unit: 'per connected profile',
      blurb: 'Unlock the LinkedIn outreach Chrome extension, desktop copilot and lead pipeline — autonomous activity tracking with you in control. Available on any paid plan.',
    },
    {
      kind: 'managed_marketing',
      name: 'Fully Managed Marketing',
      price: '$1,499/mo',
      unit: 'per workspace',
      blurb: 'Our team runs that workspace’s marketing end-to-end — strategy, content, campaigns and human-delivered off-page SEO. Request it from any plan.',
    },
  ],
  addonsNote: 'Add or remove add-ons anytime from your billing settings.',
};

export const faqs = [
  {
    q: 'What exactly is MarketiQ AI?',
    a: 'An Autonomous Go-To-Market Operating System. It runs one closed loop — research, GTM strategy, creation, publishing and learning — across 30+ connected modules, plus a native macOS LinkedIn Copilot. One engine powers both Enterprise (B2B) and Consumer (B2C/D2C) go-to-market motions. It’s the same engine Trayarunya Ventures runs for its own clients.',
  },
  {
    q: 'How is this different from ChatGPT or a content tool?',
    a: 'Single tools give you a chat box. MarketiQ gives you a 43-agent team under an AI CMO — each agent perceives your live channel signals and calls 100+ real tools to research, decide and act. An AI strategist plans your go-to-market, a brand-aware studio creates, native publishing + agentic ads ship it, and a learning loop compounds — all sharing one data layer.',
  },
  {
    q: 'Does it work for both B2B and B2C go-to-market?',
    a: 'Yes — that’s the whole point. MarketiQ detects your motion and tunes everything to it. Enterprise (B2B): ICP & buying-committee research, account-based orchestration, multi-touch campaigns, LinkedIn outreach and revenue attribution to pipeline. Consumer (B2C/D2C): demand creation at scale — social-first content, performance ads, trend-aware calendars, influencer and email/SMS plays tuned for shopping behaviour.',
  },
  {
    q: 'Which channels can it publish to?',
    a: 'LinkedIn, X, Instagram, Facebook and YouTube via native OAuth — you stay in full control of your own developer apps and tokens. It writes per-channel captions and hashtags and schedules everything from one calendar.',
  },
  {
    q: 'Is the LinkedIn Copilot desktop app safe?',
    a: 'Yes. It’s AI-guided but human-operated — you perform every click at a human pace with daily caps, so there’s no automation that violates LinkedIn’s policies. It never stores your password; login happens in an isolated embedded browser.',
  },
  {
    q: 'Do I need my own AI keys?',
    a: 'No. MarketiQ runs on our own managed, enterprise-grade AI — no setup or keys required. You just point it at your website and connect the channels you want to publish to.',
  },
  {
    q: 'What is AEO/GEO and Frontier GTM?',
    a: 'AEO (Answer-Engine Optimization) and GEO (Generative Engine Optimization) measure whether your brand is cited when buyers ask ChatGPT, Perplexity or Google AI Overviews. Frontier GTM also includes retail/commerce media planning for Amazon and Walmart, zero-party data capture that feeds your lead scoring and lifecycle loops, and disclosed synthetic UGC — AI-generated creator content with built-in no-impersonation guardrails.',
  },
  {
    q: 'Can agencies use it for multiple clients?',
    a: 'Absolutely. It’s multi-tenant by design — the Agency plan gives you 5 workspaces (one per client) and unlimited team members, with white-label client portals, approvals and on-brand reporting, plus API access. Need more workspaces, custom quotas or dedicated infrastructure? Enterprise starts at $5,000/month.',
  },
];

export const finalCta = {
  title: 'Own your go-to-market.',
  subtitle: 'Spin up a workspace, point it at your website, and watch a real go-to-market strategy appear in minutes — for B2B or B2C.',
  primary: 'Start free',
  secondary: 'Book a demo',
};

export const nav = [
  { label: 'How it works', href: '#how' },
  { label: 'Why MarketiQ', href: '#why' },
  { label: 'Features', href: '#features' },
  { label: 'ROI', href: '#roi' },
  { label: 'Compare', href: 'https://mymarketiq.online' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];
