import { faqs } from '@/lib/marketing';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://mymarketiq.online'
).replace(/\/$/, '');

export const SITE_NAME = 'MarketiQ AI';

export const SITE_TAGLINE = 'The Agentic Marketing Operating System';

export const SITE_DESCRIPTION =
  'MarketiQ AI runs one closed loop — research, strategy, creation, publishing and learning — across 30+ connected modules, plus a native macOS LinkedIn Copilot. Point it at your website and watch a real marketing strategy ship on autopilot.';

export const SITE_KEYWORDS = [
  'AI marketing platform',
  'agentic marketing',
  'marketing automation',
  'AI content creation',
  'AI marketing strategy',
  'social media scheduling',
  'AI SEO',
  'content calendar generator',
  'AI ad campaigns',
  'Google Ad Grants',
  'LinkedIn automation',
  'marketing operating system',
  'AI marketing agents',
  'B2B marketing software',
  'agency marketing platform',
];

/** Organization + WebSite + SoftwareApplication + FAQ structured data. */
export function structuredData() {
  const org = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/marketiq-icon.jpg`,
    description: SITE_DESCRIPTION,
    sameAs: ['https://www.linkedin.com/company/trayarunya-ventures'],
    parentOrganization: { '@type': 'Organization', name: 'Trayarunya Ventures' },
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en',
  };

  const software = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, macOS',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free workspace with limited usage. No card required.',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '499',
        priceCurrency: 'USD',
        description:
          'The full agentic engine for one seat, billed monthly. Launch offer: 50% off year 1.',
        category: 'subscription',
      },
    ],
  };

  const faqPage = {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [org, website, software, faqPage],
  };
}
