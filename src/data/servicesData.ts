/**
 * Single source of truth for Trayarunya Ventures' digital marketing services.
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
    slug: 'ai-gtm-marketiq',
    name: 'AI-Powered GTM Strategy with MarketiQ AI',
    shortName: 'AI GTM (MarketiQ AI)',
    icon: 'ai',
    color: '#ffaf06',
    flagship: true,
    tagline: 'Go to market faster and smarter with our own agentic AI platform.',
    summary:
      'Our flagship offering: senior strategists plus MarketiQ AI — our proprietary Go-To-Market agentic platform — researching your market, building your GTM strategy and orchestrating every channel in one closed, self-learning loop.',
    pain: 'Your go-to-market is slow, fragmented and based on guesswork. Research takes weeks, channels run in silos and no one can say what is really driving growth.',
    outcome: 'A data-driven GTM engine that launches in days and gets smarter with every result.',
    whatWeDo: [
      'Agentic market, competitor and audience research',
      'Positioning, messaging and ICP / persona definition',
      'Channel mix, funnel and media planning',
      'AI-orchestrated content calendar and campaign roll-out',
      'Real-time dashboards and autonomous optimisation loops',
    ],
    deliverables: [
      'Market intelligence report',
      'GTM strategy & channel blueprint',
      'MarketiQ AI workspace for your brand',
      'Monthly growth & ROI reviews',
    ],
    metrics: [
      { label: 'Faster time-to-market', value: '5x' },
      { label: 'AI agents working for you', value: '45' },
      { label: 'Always-on optimisation', value: '24/7' },
    ],
  },
  {
    slug: 'performance-marketing',
    name: 'Performance Marketing & Paid Media',
    shortName: 'Performance Marketing',
    icon: 'ads',
    color: '#d92c4a',
    tagline: 'Profitable growth from every ad dollar — not vanity clicks.',
    summary:
      'Full-funnel campaigns across Google, Meta, LinkedIn, YouTube and programmatic — with AI-driven audience targeting, creative testing and budget allocation managed to revenue and ROAS.',
    pain: 'You’ve burned budget on ads that drove traffic but no sales, with no clear line from spend to revenue.',
    outcome: 'A paid channel that reliably returns more than it costs — and scales.',
    whatWeDo: [
      'Full-funnel paid media strategy and structure',
      'Google Search, Shopping, Performance Max & YouTube',
      'Meta, LinkedIn and programmatic campaigns',
      'Tracking, attribution and conversion APIs',
      'AI-driven creative testing and bid optimisation',
    ],
    deliverables: [
      'Media plan & campaign build',
      'Ad creative & copy sets',
      'Conversion tracking setup',
      'Weekly optimisation & reporting',
    ],
    metrics: [
      { label: 'Avg. ROAS', value: '4.2x' },
      { label: 'Cost per acquisition', value: '-38%' },
      { label: 'Qualified leads', value: '+158%' },
    ],
  },
  {
    slug: 'seo-ai-search',
    name: 'SEO & AI Search Optimisation (AEO / GEO)',
    shortName: 'SEO & AI Search',
    icon: 'seo',
    color: '#14bb87',
    tagline: 'Rank on Google — and get recommended by ChatGPT, Gemini & Perplexity.',
    summary:
      'Technical, on-page and content SEO combined with Answer & Generative Engine Optimisation, so your brand shows up wherever customers search — from Google to AI assistants.',
    pain: 'Your competitors outrank you, organic traffic has plateaued, and AI search engines don’t mention your brand at all.',
    outcome: 'Compounding organic visibility and demand you don’t pay for per click.',
    whatWeDo: [
      'Technical SEO audits and site health fixes',
      'AI-powered keyword and topic cluster research',
      'SEO content strategy and production at scale',
      'AEO / GEO for AI assistants and answer engines',
      'Digital PR, link building and local SEO',
    ],
    deliverables: [
      'Technical & content SEO audit',
      'Keyword & topic roadmap',
      'Optimised content every month',
      'Rankings & AI visibility reports',
    ],
    metrics: [
      { label: 'Organic traffic', value: '+185%' },
      { label: 'Page-1 keywords', value: '3.6x' },
      { label: 'AI search mentions', value: '+120%' },
    ],
  },
  {
    slug: 'social-media-content',
    name: 'Social Media & Content Marketing',
    shortName: 'Social & Content',
    icon: 'social',
    color: '#0A66C2',
    tagline: 'Scroll-stopping content that builds brand and drives demand.',
    summary:
      'Always-on social media management, content marketing, influencer and community programs across Instagram, LinkedIn, YouTube, X and Facebook — produced at scale with MarketiQ AI and refined by our creative team.',
    pain: 'You know you should be publishing consistently, but you have no time, no system and no idea what actually moves your audience to act.',
    outcome: 'A consistent, recognisable brand presence that grows audience, engagement and demand.',
    whatWeDo: [
      'Social strategy, content pillars and calendars',
      'Posts, reels, carousels, videos and blogs',
      'Community management and engagement',
      'Influencer, UGC and founder-led content',
      'Repurposing across formats and channels',
    ],
    deliverables: [
      'Social & content strategy',
      'Monthly content calendar',
      '20–40 content pieces / month',
      'Monthly performance review',
    ],
    metrics: [
      { label: 'Engagement lift', value: '2.8x' },
      { label: 'Content output', value: '10x' },
      { label: 'Follower growth', value: '+240%' },
    ],
  },
  {
    slug: 'brand-creative-web',
    name: 'Brand, Creative & Web Experiences',
    shortName: 'Brand & Web',
    icon: 'creative',
    color: '#8E44AD',
    tagline: 'Brands, creatives and websites engineered to convert.',
    summary:
      'Brand strategy, identity, performance creative, video and high-converting websites and landing pages — every asset built on customer psychology to move people to act.',
    pain: 'Your brand looks dated, your creative gets ignored and your website leaks visitors instead of converting them.',
    outcome: 'A premium brand and web experience that earns trust and converts it into revenue.',
    whatWeDo: [
      'Brand strategy, positioning and identity',
      'Performance creative, motion and video',
      'Website and landing page design & build',
      'Conversion copywriting and messaging',
      'Sales and pitch collateral design',
    ],
    deliverables: [
      'Brand & messaging system',
      'Video + static creative sets',
      'Website / landing page build',
      'Creative performance reports',
    ],
    metrics: [
      { label: 'Conversion lift', value: '+64%' },
      { label: 'Creative output', value: '4x' },
      { label: 'Bounce rate', value: '-35%' },
    ],
  },
  {
    slug: 'marketing-automation-cro',
    name: 'Marketing Automation, CRO & Analytics',
    shortName: 'Automation & CRO',
    icon: 'strategy',
    color: '#1f6feb',
    tagline: 'The systems and data that tie every channel to revenue.',
    summary:
      'CRM, email & SMS automation, conversion rate optimisation and analytics — connected by MarketiQ AI so every lead is nurtured, every visit is optimised and every dollar is attributed.',
    pain: 'Leads fall through the cracks, follow-up is manual, and you can’t see which channels actually drive revenue.',
    outcome: 'A connected, measurable revenue engine that converts more of the demand you already have.',
    whatWeDo: [
      'CRM and marketing automation build',
      'Email, SMS and WhatsApp lifecycle journeys',
      'Conversion rate optimisation and A/B testing',
      'Analytics, attribution and real-time dashboards',
      'Customer segmentation and personalisation',
    ],
    deliverables: [
      'Automation & lifecycle build',
      'CRO test roadmap',
      'Attribution & analytics dashboards',
      'Monthly growth reviews',
    ],
    metrics: [
      { label: 'Lead-to-customer speed', value: '2.3x' },
      { label: 'Revenue per lead', value: '+47%' },
      { label: 'Manual work cut', value: '-60%' },
    ],
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
