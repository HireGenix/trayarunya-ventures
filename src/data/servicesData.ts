/**
 * Single source of truth for Trayarunya Ventures' B2B marketing services.
 * `icon` is a string key mapped to a MUI icon inside components (keeps data serialisable).
 */

export interface ServiceMetric {
  label: string;
  value: string;
}

export interface ServiceData {
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  tagline: string;
  summary: string;
  flagship?: boolean;
  pain: string;
  outcome: string;
  whatWeDo: string[];
  deliverables: string[];
  metrics: ServiceMetric[];
}

export const services: ServiceData[] = [
  {
    slug: 'linkedin-lead-generation',
    name: 'LinkedIn Lead Generation & Social Selling',
    shortName: 'LinkedIn Lead Gen',
    icon: 'linkedin',
    color: '#0A66C2',
    flagship: true,
    tagline: 'Turn LinkedIn into a predictable high-ticket pipeline.',
    summary:
      'A done-for-you LinkedIn growth engine — optimised profiles, magnetic content and human outreach that books qualified calls with decision-makers who can actually sign high-ticket deals.',
    pain: 'Your LinkedIn is a digital resume, not a revenue channel. Outreach feels spammy, replies are silent, and the few leads you get are unqualified tyre-kickers.',
    outcome: 'A full calendar of qualified calls with economic buyers — built on trust, not spam.',
    whatWeDo: [
      'Authority-positioned profile and offer engineering',
      'Hook-driven content that warms your ideal buyers',
      'Personalised, human outreach sequences (no spray-and-pray)',
      'Reply handling and call-booking playbooks',
      'Weekly pipeline and conversation reporting',
    ],
    deliverables: [
      'Optimised founder + company profile',
      '12–16 content pieces / month',
      'Targeted outreach to your ICP',
      'Booked qualified sales calls',
    ],
    metrics: [
      { label: 'More booked calls', value: '3.4x' },
      { label: 'Avg. reply rate', value: '28%' },
      { label: 'Pipeline in 90 days', value: '$480K' },
    ],
  },
  {
    slug: 'b2b-demand-generation',
    name: 'B2B Demand Generation',
    shortName: 'Demand Gen',
    icon: 'demand',
    color: '#14bb87',
    tagline: 'Multi-channel demand that fills the top of your funnel.',
    summary:
      'Account-based, multi-channel campaigns that create and capture demand across LinkedIn, search, email and content — so the right accounts know you, trust you and come to you.',
    pain: 'Leads are inconsistent. Some months are feast, most are famine, and you can never forecast pipeline with confidence.',
    outcome: 'A repeatable demand system that produces pipeline you can forecast.',
    whatWeDo: [
      'Ideal Customer Profile and account list building',
      'Account-based multi-touch campaigns',
      'Lead magnets and conversion assets',
      'Intent and signal-based targeting',
      'Pipeline attribution and reporting',
    ],
    deliverables: [
      'ABM target account list',
      'Multi-channel campaign build',
      'Conversion assets & landing pages',
      'Monthly pipeline reporting',
    ],
    metrics: [
      { label: 'Pipeline lift', value: '+212%' },
      { label: 'Cost per lead', value: '-41%' },
      { label: 'MQL → SQL rate', value: '38%' },
    ],
  },
  {
    slug: 'personal-branding',
    name: 'Personal Branding & Thought Leadership',
    shortName: 'Personal Branding',
    icon: 'branding',
    color: '#ffaf06',
    tagline: 'Make the founder the most trusted voice in the category.',
    summary:
      'Founder-led content and ghostwriting that builds undeniable authority — so buyers arrive pre-sold, inbound requests climb, and your name becomes the category default.',
    pain: 'You know you should be posting, but you have no time, no system and no idea what actually moves buyers to act.',
    outcome: 'A recognised authority brand that pulls in inbound, talent and trust.',
    whatWeDo: [
      'Founder narrative and content pillars',
      'Ghostwritten posts in your authentic voice',
      'Engagement and community strategy',
      'Repurposing across formats and channels',
      'Inbound and DM conversion playbook',
    ],
    deliverables: [
      'Personal brand strategy',
      'Ghostwritten content calendar',
      'Profile & banner assets',
      'Monthly performance review',
    ],
    metrics: [
      { label: 'Avg. impressions', value: '5.1x' },
      { label: 'Inbound leads', value: '+180%' },
      { label: 'Follower growth', value: '12K/qtr' },
    ],
  },
  {
    slug: 'content-performance-creative',
    name: 'Content & Performance Creative',
    shortName: 'Content & Creative',
    icon: 'creative',
    color: '#8E44AD',
    tagline: 'Story-driven creative engineered to convert, not just look good.',
    summary:
      'Copy, video and design built on buyer psychology — every asset is created to move a prospect one decisive step closer to a signed deal.',
    pain: 'Your content gets likes but no leads. It looks fine, but it doesn’t sell, and you can’t tell what’s actually working.',
    outcome: 'Creative that earns attention and converts it into revenue.',
    whatWeDo: [
      'Conversion copywriting and messaging',
      'Short-form video and motion creative',
      'Sales and pitch collateral design',
      'Landing pages and offer pages',
      'Creative testing and iteration',
    ],
    deliverables: [
      'Messaging & copy system',
      'Video + static creative sets',
      'Landing page design & build',
      'Performance creative reports',
    ],
    metrics: [
      { label: 'Conversion lift', value: '+64%' },
      { label: 'Content output', value: '4x' },
      { label: 'Engagement rate', value: '7.2%' },
    ],
  },
  {
    slug: 'paid-advertising',
    name: 'Paid Advertising — LinkedIn & Google',
    shortName: 'Paid Ads',
    icon: 'ads',
    color: '#d92c4a',
    tagline: 'Profitable paid pipeline — not vanity clicks.',
    summary:
      'Full-funnel LinkedIn and Google campaigns managed to revenue, not impressions — every dollar tied to qualified pipeline and tracked to closed deals.',
    pain: 'You’ve burned budget on ads that drove traffic but no pipeline, with no clear line from spend to revenue.',
    outcome: 'A paid channel that reliably returns more than it costs.',
    whatWeDo: [
      'Full-funnel paid strategy and structure',
      'LinkedIn Ads (ABM, retargeting, lead gen)',
      'Google Search and demand campaigns',
      'Tracking, attribution and dashboards',
      'Continuous optimisation to CPA / ROAS',
    ],
    deliverables: [
      'Campaign strategy & build',
      'Ad creative & copy',
      'Conversion tracking setup',
      'Weekly optimisation & reporting',
    ],
    metrics: [
      { label: 'Avg. ROAS', value: '4.7x' },
      { label: 'Cost per SQL', value: '-37%' },
      { label: 'Qualified leads', value: '+158%' },
    ],
  },
  {
    slug: 'funnels-automation-fractional-cmo',
    name: 'Funnels, Automation & Fractional CMO',
    shortName: 'Strategy & Funnels',
    icon: 'strategy',
    color: '#1f6feb',
    tagline: 'The strategy and systems that tie every channel to revenue.',
    summary:
      'Sales funnels, CRM and marketing automation backed by senior strategic leadership — your fractional CMO building the engine and owning the number with you.',
    pain: 'You have tactics but no system. Leads fall through cracks, follow-up is manual, and no one owns the marketing number.',
    outcome: 'A connected revenue engine with senior ownership of the outcome.',
    whatWeDo: [
      'Marketing strategy and roadmap',
      'Sales funnel and offer architecture',
      'CRM and marketing automation build',
      'Lead nurturing and follow-up sequences',
      'Fractional CMO leadership and reporting',
    ],
    deliverables: [
      'Growth strategy & roadmap',
      'Funnel & automation build',
      'CRM workflows & nurture',
      'Monthly leadership reviews',
    ],
    metrics: [
      { label: 'Lead-to-deal speed', value: '2.3x' },
      { label: 'Revenue per lead', value: '+47%' },
      { label: 'Manual work cut', value: '-60%' },
    ],
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
