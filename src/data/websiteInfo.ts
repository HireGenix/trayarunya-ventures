/**
 * Central content/copy hub for the Trayarunya Ventures marketing site.
 * Keep marketing copy here so pages and components stay clean and consistent.
 */

export const companyInfo = {
  name: 'Trayarunya Ventures',
  tagline: 'Your B2B Growth Partner — not just another agency.',
  promise:
    "We don't take clients. We take partners. We own your pain points as our own, strategize your marketing as if the company were ours, and execute like your in-house growth team.",
  founded: 'October 2024',
  headquarters: 'Global (USA & India)',
  specialty: 'B2B growth & LinkedIn-led high-ticket pipeline',
  segments: 'B2B (flagship), B2C & D2C',
  contact: {
    email: 'info@trayarunyaventures.com',
    phone: ['+1 (971) 512-1701 (US)', '+91-8954333390 (India)'],
    address: [
      'USA Office: Trayarunya Ventures LLC, 1621 Central Ave Ste 9876, Cheyenne, WY 82001, USA',
      'India Office: 2/1201 Behind S.A.M Inter College, Ramnagar, Saharanpur (U.P)-247001, India',
    ],
    socialMedia: {
      linkedin: 'https://www.linkedin.com/company/trayarunya-ventures',
    },
  },
};

/** The partner manifesto — three pillars of how we operate. */
export const manifesto = [
  {
    key: 'own-the-pain',
    title: 'We own your pain',
    description:
      'We sit on your side of the table. Your stalled pipeline, your missed targets, your “why isn’t this working?” — we feel it as if it were ours, because in this partnership, it is.',
  },
  {
    key: 'own-the-strategy',
    title: 'We strategize as our own',
    description:
      'No copy-paste playbooks. We build the growth strategy we’d build if it were our own company on the line — rooted in your buyers, your offer and your numbers.',
  },
  {
    key: 'own-the-execution',
    title: 'We execute like in-house',
    description:
      'Strategy is worthless without execution. We run the campaigns, write the content and book the calls — accountable to outcomes, not slide decks.',
  },
];

/** The pains we solve — used in the "Problem" explainer. */
export const painPoints = [
  {
    title: 'Feast-or-famine pipeline',
    description: 'Leads spike then vanish. You can never forecast revenue with confidence.',
  },
  {
    title: 'LinkedIn that doesn’t convert',
    description: 'A profile that reads like a resume and outreach that feels like spam.',
  },
  {
    title: 'Agencies that vanish after onboarding',
    description: 'Hand-offs, junior account managers and reports full of vanity metrics.',
  },
  {
    title: 'Marketing disconnected from revenue',
    description: 'Lots of activity, likes and traffic — but no clear line to closed high-ticket deals.',
  },
];

/** Our process — the cinematic "How We Work" pipeline. */
export const processSteps = [
  {
    number: '01',
    title: 'Understand',
    subtitle: 'Absorb the pain',
    description:
      'Deep discovery into your offer, buyers, numbers and bottlenecks. We map your ICP and the real reason deals stall — before touching a single campaign.',
    deliverable: 'Growth audit & ICP map',
  },
  {
    number: '02',
    title: 'Strategize',
    subtitle: 'Build the engine',
    description:
      'We design the full growth strategy — positioning, offer, channels and the LinkedIn-led funnel — the way we’d build it if the company were ours.',
    deliverable: 'Strategy & funnel blueprint',
  },
  {
    number: '03',
    title: 'Execute',
    subtitle: 'Run it like in-house',
    description:
      'We build profiles, produce content, run outreach and ads, and book qualified calls. You watch pipeline fill while we own the day-to-day.',
    deliverable: 'Live campaigns & booked calls',
  },
  {
    number: '04',
    title: 'Scale',
    subtitle: 'Compound the wins',
    description:
      'We double down on what converts, kill what doesn’t, and systemise the engine so growth compounds month over month.',
    deliverable: 'Optimised, compounding pipeline',
  },
];

/** The signature LinkedIn high-ticket funnel explainer. */
export const linkedinFunnel = [
  {
    stage: 'Authority Profile',
    description: 'A buyer-facing profile engineered to convert visitors into trust.',
    metric: 'Profile views → leads',
  },
  {
    stage: 'Magnetic Content',
    description: 'Hook-driven posts that warm your exact decision-makers daily.',
    metric: 'Reach the right buyers',
  },
  {
    stage: 'Human Outreach',
    description: 'Personalised conversations — never spray-and-pray automation.',
    metric: '~28% reply rate',
  },
  {
    stage: 'Qualified Calls',
    description: 'Booked meetings with economic buyers who can sign.',
    metric: '3.4x more calls',
  },
  {
    stage: 'Closed High-Ticket Deals',
    description: 'A predictable pipeline of high-value contracts.',
    metric: '$480K+ in 90 days',
  },
];

/** Why partners choose only Trayarunya — us vs a typical agency. */
export const differentiators = [
  {
    title: 'Partner, not vendor',
    us: 'We own your number with you and act like your team.',
    them: 'Treats you as a ticket and a monthly retainer.',
  },
  {
    title: 'Senior operators on your account',
    us: 'Strategists who’ve built B2B pipelines do the work.',
    them: 'Hands you to a junior account manager after the pitch.',
  },
  {
    title: 'Revenue-obsessed',
    us: 'Every action tied to pipeline and closed deals.',
    them: 'Reports impressions, likes and other vanity metrics.',
  },
  {
    title: 'B2B & LinkedIn specialists',
    us: 'Deep focus on high-ticket B2B and LinkedIn.',
    them: 'Generalists spread thin across every industry.',
  },
  {
    title: 'Strategy + execution',
    us: 'We build the plan and run it end-to-end.',
    them: 'Sells you a strategy deck, then disappears.',
  },
];

/** Headline proof stats. */
export const stats = [
  { value: 3.4, suffix: 'x', label: 'More qualified calls booked' },
  { value: 212, prefix: '+', suffix: '%', label: 'Average pipeline growth' },
  { value: 480, prefix: '$', suffix: 'K+', label: 'Pipeline generated in 90 days' },
  { value: 28, suffix: '%', label: 'Average LinkedIn reply rate' },
];

export const testimonials = [
  {
    name: 'Amit S.',
    position: 'Founder & CEO',
    company: 'TechNova',
    quote:
      'They didn’t act like an agency — they acted like our growth team. Within 90 days our LinkedIn went from silent to our #1 source of high-ticket calls.',
  },
  {
    name: 'Priya R.',
    position: 'CMO',
    company: 'MarketLeap',
    quote:
      'Finally, a partner that ties everything back to pipeline. The strategy was sharp and, more importantly, they actually executed it.',
  },
  {
    name: 'Rohit P.',
    position: 'Founder',
    company: 'InsightEdge',
    quote:
      'The personal branding work made me the go-to voice in our niche. Inbound leads now come to us pre-sold.',
  },
  {
    name: 'Sonal T.',
    position: 'VP Sales',
    company: 'BrightHire',
    quote:
      'Their LinkedIn outreach books calls with real decision-makers — not tyre-kickers. It feels like having an SDR team that never sleeps.',
  },
];

export const faqInfo = [
  {
    question: 'How are you different from a typical marketing agency?',
    answer:
      'We operate as your partner, not a vendor. We absorb your pain points, build the strategy as if the business were ours, and execute it like an in-house team — accountable to pipeline and revenue, not vanity metrics.',
  },
  {
    question: 'Why do you focus so heavily on LinkedIn?',
    answer:
      'For B2B and high-ticket sales, LinkedIn is where decision-makers actually are. Done right, it’s the most reliable channel to build trust at scale and book qualified calls with economic buyers.',
  },
  {
    question: 'What kind of companies do you partner with?',
    answer:
      'B2B founders, consultants and companies selling high-ticket offers who want predictable pipeline — not one-off campaigns.',
  },
  {
    question: 'Do you only do LinkedIn?',
    answer:
      'No. LinkedIn is our signature engine, but we run full-funnel demand generation, paid ads, content, funnels and fractional CMO leadership around it.',
  },
  {
    question: 'How quickly will we see results?',
    answer:
      'Foundations go live in the first weeks; most partners see qualified conversations within 30–45 days and meaningful pipeline within 90 days.',
  },
  {
    question: 'How do we get started?',
    answer:
      'Book a strategy call. We’ll audit your current growth, map the opportunity, and show you exactly how the partnership would work — no obligation.',
  },
];

/**
 * The "Growth Engine" — the AI-orchestrated execution machine.
 * Powers the animated process explainer on the homepage.
 * Each stage maps to a dedicated animated SVG component.
 */
export const growthEngine = {
  brain: {
    label: 'AI Decision Engine',
    description:
      'Every move is decided by data, not guesswork. Our AI reads signals — intent, engagement, fit — and tells the team exactly who to target, what to say, and when to post.',
    signals: ['Intent data', 'Engagement', 'ICP fit', 'Channel signals'],
    decisions: ['Who to target', 'What to say', 'When to post', 'Where to spend'],
  },
  stages: [
    {
      key: 'lead-filtering',
      animation: 'leadFilter',
      step: '01',
      title: 'Lead Filtering',
      description:
        'Thousands of raw profiles go in. AI scores each against your ideal-customer profile and filters out the noise — only real, qualified buyers come through.',
      metricValue: 92,
      metricSuffix: '%',
      metricLabel: 'junk filtered out',
      accent: '#ffaf06',
    },
    {
      key: 'outreach',
      animation: 'outreach',
      step: '02',
      title: 'Personalized Outreach',
      description:
        'Each qualified lead gets a human-sounding, personalized sequence — written with AI, reviewed by strategists — that starts real conversations instead of getting ignored.',
      metricValue: 3.4,
      metricSuffix: 'x',
      metricDecimals: 1,
      metricLabel: 'higher reply rate',
      accent: '#14bb87',
    },
    {
      key: 'content-creation',
      animation: 'contentCreation',
      step: '03',
      title: 'Content Creation',
      description:
        'AI turns your expertise and market data into scroll-stopping posts, carousels and creatives — then our team adds the human edge that builds authority.',
      metricValue: 5,
      metricSuffix: 'x',
      metricLabel: 'faster production',
      accent: '#0A66C2',
    },
    {
      key: 'content-posting',
      animation: 'contentPosting',
      step: '04',
      title: 'Smart Posting',
      description:
        'Content ships to the right channels at the moments your buyers are actually online — timing optimized by AI across LinkedIn, Instagram and more.',
      metricValue: 2.8,
      metricSuffix: 'x',
      metricDecimals: 1,
      metricLabel: 'more engagement',
      accent: '#ffaf06',
    },
    {
      key: 'ads',
      animation: 'ads',
      step: '05',
      title: 'Paid Amplification',
      description:
        'AI finds the audiences and creatives that convert, then scales spend only where it returns — turning warm attention into booked calls and sales.',
      metricValue: 4.2,
      metricSuffix: 'x',
      metricDecimals: 1,
      metricLabel: 'return on ad spend',
      accent: '#14bb87',
    },
  ],
};

/**
 * Audience segments. B2B is the flagship; B2C and D2C are full offerings too.
 * Drives the interactive segment switcher on the homepage.
 */
export const segments = [
  {
    key: 'b2b',
    label: 'B2B',
    flagship: true,
    badge: 'Flagship Expertise',
    tagline: 'LinkedIn-led pipeline for high-ticket sales.',
    description:
      'Our home turf. We turn founder authority and precise outreach into a predictable stream of qualified calls with economic buyers — built for long cycles and big deal sizes.',
    accent: '#ffaf06',
    channels: ['LinkedIn', 'Cold + warm outreach', 'Demand gen', 'Founder branding'],
    outcomes: [
      { value: '45+', label: 'qualified calls / quarter' },
      { value: '3.4x', label: 'reply rate vs. industry' },
      { value: '90 days', label: 'to meaningful pipeline' },
    ],
  },
  {
    key: 'b2c',
    label: 'B2C',
    flagship: false,
    badge: 'Full-Funnel Growth',
    tagline: 'Demand, community and conversion at scale.',
    description:
      'For consumer brands, we build attention into loyalty — performance creative, social-first content and funnels that turn audiences into repeat customers.',
    accent: '#14bb87',
    channels: ['Meta & Google Ads', 'Social content', 'Influencer/UGC', 'Conversion funnels'],
    outcomes: [
      { value: '2.8x', label: 'engagement lift' },
      { value: '-38%', label: 'cost per acquisition' },
      { value: '4.2x', label: 'return on ad spend' },
    ],
  },
  {
    key: 'd2c',
    label: 'D2C',
    flagship: false,
    badge: 'Revenue Engine',
    tagline: 'From first click to repeat purchase.',
    description:
      'For direct-to-consumer brands, we own the full revenue engine — acquisition, retention and lifetime value — with creative and data working as one system.',
    accent: '#0A66C2',
    channels: ['Performance ads', 'Email & SMS', 'Landing/CRO', 'Retention loops'],
    outcomes: [
      { value: '+62%', label: 'repeat purchase rate' },
      { value: '3.1x', label: 'blended ROAS' },
      { value: '+47%', label: 'customer lifetime value' },
    ],
  },
];
