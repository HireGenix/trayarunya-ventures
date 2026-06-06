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
  badge: 'The agentic marketing operating system',
  titleLead: 'Your entire marketing team,',
  titleGradient: 'researching, strategising & shipping',
  titleTail: 'on autopilot.',
  subtitle:
    'MarketiQ AI runs one closed loop — research → strategy → creation → publishing → learning — across 30+ connected modules. The same agentic engine Trayarunya Ventures runs for its own clients, now yours.',
  primaryCta: 'Start free',
  secondaryCta: 'See how it works',
  microProof: 'No credit card · Point it at your website · Watch a real strategy appear',
  audiences: ['Individuals', 'Freelancers', 'Companies', 'Agencies'],
};

export const trustLine = 'One closed loop · 30+ connected modules · trusted by founders, marketers and agencies';

export const loop = {
  eyebrow: 'ONE CLOSED LOOP',
  title: 'Five agentic stages. One compounding system.',
  subtitle:
    'Every stage feeds the next, and real performance data feeds back to the start — so each cycle is sharper than the last.',
  stages: [
    {
      n: '01',
      key: 'research',
      title: 'Deep Research',
      color: BRAND.teal,
      desc: 'Autonomous agents crawl your site and the live web, map real demand, and read every competitor — so you start from evidence, not opinions.',
    },
    {
      n: '02',
      key: 'strategy',
      title: 'Master Strategy',
      color: BRAND.amber,
      desc: 'An AI strategist turns that evidence into positioning, pillars, a funnel, lead magnets and a date-aware content calendar in minutes.',
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
      desc: 'Real metrics flow into a learning loop that sharpens every future strategy automatically. Your engine gets smarter while you sleep.',
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
];

export const modules = {
  eyebrow: 'EVERYTHING IN ONE COCKPIT',
  title: '30+ connected modules, not a folder of disconnected tools.',
  subtitle: 'Each module shares the same research, brand and data layer — so insight in one place sharpens every other.',
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
  eyebrow: 'BUILT FOR HOW YOU GROW',
  title: 'One engine, tuned to your scale.',
  items: [
    { title: 'Individuals', desc: 'Build authority and a personal brand without a marketing team behind you.', color: BRAND.amber },
    { title: 'Freelancers', desc: 'Deliver agency-grade strategy and content to every client, solo.', color: BRAND.teal },
    { title: 'Companies', desc: 'Run an always-on growth engine that turns demand into pipeline.', color: BRAND.blue },
    { title: 'Agencies', desc: 'Scale across clients with white-label portals, approvals and reporting.', color: BRAND.pink },
  ],
};

export const stack = {
  eyebrow: 'WHY MARKETIQ',
  title: 'An unfair advantage, built in.',
  subtitle: 'Enterprise-grade intelligence and a single cockpit your whole team can run growth from.',
  items: [
    { k: 'Agentic, not assistive', v: 'Agents that take action, not just suggest' },
    { k: 'One closed loop', v: 'Research to revenue, fully connected' },
    { k: 'On-brand by default', v: 'Your voice, colours and logo everywhere' },
    { k: 'Multi-workspace', v: 'Run every client or brand in one place' },
    { k: 'Always-on', v: 'Research and optimisation around the clock' },
    { k: 'Enterprise-ready', v: 'Roles, approvals & white-label portals' },
  ],
};

export const stats = [
  { value: '30+', label: 'connected modules' },
  { value: '5', label: 'agentic stages, one closed loop' },
  { value: '10×', label: 'faster content production' },
  { value: '24/7', label: 'always-on research & optimisation' },
];

export const pricing = {
  eyebrow: 'PRICING',
  title: 'One plan. The entire engine.',
  subtitle:
    'Everything MarketiQ AI does, for a single seat. Need seats for a team? Talk to us.',
  monthly: 499,
  yearlyPerMonth: Math.round(499 * 0.75),
  yearlyTotal: Math.round(499 * 12 * 0.75),
  saveLabel: 'Save 25%',
  // Introductory launch offer — 50% off the list price
  intro: true,
  introLabel: 'Launch offer · 50% off',
  introMonthly: Math.round(499 * 0.5),
  introYearlyPerMonth: Math.round(499 * 0.75 * 0.5),
  introYearlyTotal: Math.round(499 * 12 * 0.75 * 0.5),
  taperNote: '50% off year 1 · 25% off years 2-3 · then standard price',
  freeNote: 'Or start free — no card needed (1 workspace, 2 research runs, 1 strategy, 1 calendar, 5 posts)',
  pro: {
    name: 'Pro',
    tagline: 'For founders, creators & solo marketers',
    features: [
      'The full closed loop: research → strategy → studio → publish → learn',
      'All 30+ modules and Gamma-style AI Decks',
      'Native OAuth publishing & scheduling to every channel',
      'Agentic ads, analytics, reports & forecasting',
      'macOS LinkedIn Copilot included',
    ],
    cta: 'Get started',
    href: '/signup',
  },
  teams: {
    name: 'Teams',
    price: 'Contact sales',
    tagline: 'For companies & agencies with multiple users',
    features: [
      'Everything in Pro, for your whole team',
      'Multiple seats & workspaces',
      'White-label client portals, approvals & reporting',
      'Priority onboarding & support',
    ],
    cta: 'Contact sales',
    href: 'mailto:info@trayarunyaventures.com?subject=MarketiQ%20AI%20Teams',
  },
};

export const faqs = [
  {
    q: 'What exactly is MarketiQ AI?',
    a: 'An agentic marketing operating system. It runs a closed loop — research, strategy, creation, publishing and learning — across 30+ connected modules, plus a native macOS LinkedIn Copilot. It’s the same engine Trayarunya Ventures runs for its own clients.',
  },
  {
    q: 'How is this different from ChatGPT or a content tool?',
    a: 'Single tools give you a chat box. MarketiQ gives you autonomous agents that research the live web, an AI strategist that plans, a brand-aware studio that creates, native publishing, agentic ads, and a learning loop that compounds — all sharing one data layer.',
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
    q: 'Can agencies use it for multiple clients?',
    a: 'Absolutely. It’s multi-tenant by design — organisations, workspaces and roles — with white-label client portals, approvals and on-brand reporting on the Agency plan.',
  },
];

export const finalCta = {
  title: 'Become the master of your category.',
  subtitle: 'Spin up a workspace, point it at your website, and watch a real strategy appear in minutes.',
  primary: 'Start free',
  secondary: 'Book a demo',
};

export const nav = [
  { label: 'How it works', href: '#how' },
  { label: 'Features', href: '#features' },
  { label: 'AI Decks', href: '#decks' },
  { label: 'Desktop app', href: '#desktop' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];
