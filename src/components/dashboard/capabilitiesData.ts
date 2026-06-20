import type { PastelKey } from './tokens';

/**
 * Capability cards for the dashboard "Capabilities" page, mirroring the
 * reference Lifecycle / Paid / Experimentation switcher — but mapped to
 * MarketiQ's real modules with an honest coverage status:
 *   live    = shipped today
 *   partial = exists but not the full reference scope
 *   soon    = on the roadmap / gap vs. reference
 */

export type CapStatus = 'live' | 'partial' | 'soon';

/** Icon keys mapped to MUI icons inside the page (keeps data serialisable). */
export type CapIcon =
  | 'loyalty'
  | 'offer'
  | 'campaign'
  | 'personalize'
  | 'suppress'
  | 'conversionApi'
  | 'remarket'
  | 'reach'
  | 'holdout'
  | 'omniExperiment'
  | 'aiDecision'
  | 'campaignData';

export interface CapabilityCard {
  icon: CapIcon;
  tone: PastelKey;
  title: string;
  body: string;
  status: CapStatus;
  module: string;
}

export interface CapabilityTab {
  key: string;
  label: string;
  cards: CapabilityCard[];
}

export const capabilities: CapabilityTab[] = [
  {
    key: 'lifecycle',
    label: 'Lifecycle marketing',
    cards: [
      {
        icon: 'loyalty',
        tone: 'coral',
        title: 'Retain users with data-driven loyalty programs',
        body: 'Use first-party data to power loyalty and rewards that send the best offer and most relevant message to every customer.',
        status: 'soon',
        module: 'Loyalty (roadmap)',
      },
      {
        icon: 'offer',
        tone: 'peach',
        title: 'Increase LTV with 1-1 personalized product offers',
        body: 'The AI CMO recommends the next-best action by leveraging research, product catalog and outcome history — partial today, deepening with catalog sync.',
        status: 'partial',
        module: 'AI CMO · Strategy',
      },
      {
        icon: 'campaign',
        tone: 'sky',
        title: 'Drive more revenue with high-converting campaigns',
        body: 'Spin up triggered campaigns — reminders, nudges and product recommendations — straight from the Campaign Builder and Workflows.',
        status: 'live',
        module: 'Campaign Builder · Workflows',
      },
      {
        icon: 'personalize',
        tone: 'lavender',
        title: 'Drive higher engagement with omni-channel personalization',
        body: 'Make sure customers get the right message on the right channel at the right time by centrally managing your audience logic.',
        status: 'live',
        module: 'Publishing · AI CMO',
      },
    ],
  },
  {
    key: 'paid',
    label: 'Paid marketing',
    cards: [
      {
        icon: 'suppress',
        tone: 'lavender',
        title: 'Reduce wasted spend with better suppression',
        body: 'Build custom suppression audiences and sync them into ad platforms to stop paying to reach people you already converted.',
        status: 'soon',
        module: 'Audiences (suppression — roadmap)',
      },
      {
        icon: 'conversionApi',
        tone: 'mint',
        title: 'Increase ROAS by switching from pixels to conversion APIs',
        body: 'Enrich conversion events with first-party data through server-side conversion APIs for higher match rates and accuracy.',
        status: 'soon',
        module: 'Conversion API (roadmap)',
      },
      {
        icon: 'remarket',
        tone: 'peach',
        title: 'Re-engage churned customers with hyper-targeted remarketing',
        body: 'Unlock personalized, triggered remarketing — abandon-cart nudges, win-backs and ABM retargeting from agentic Ads.',
        status: 'partial',
        module: 'Ads · ABM Accounts',
      },
      {
        icon: 'reach',
        tone: 'coral',
        title: 'Increase revenue driven from ads by increasing reach',
        body: 'Forecast reach and centrally manage audience logic so every channel pulls from one source of truth.',
        status: 'partial',
        module: 'Forecast · ICP',
      },
    ],
  },
  {
    key: 'experimentation',
    label: 'Experimentation',
    cards: [
      {
        icon: 'holdout',
        tone: 'sky',
        title: 'Understand the true lift of every channel with holdout testing',
        body: 'Measure incremental lift of email and advertising programs with audience-level hold-out groups.',
        status: 'partial',
        module: 'Experiments',
      },
      {
        icon: 'omniExperiment',
        tone: 'peach',
        title: 'Drive higher ROI with omni-channel experimentation',
        body: 'Unlock audience-level testing across multiple channels and measure user-level ROI across treatments.',
        status: 'live',
        module: 'Experiments',
      },
      {
        icon: 'aiDecision',
        tone: 'lavender',
        title: 'Automate experimentation with AI Decisioning',
        body: 'Move away from manual testing and one-off insights — the AI CMO runs closed-loop, 1-1 experimentation at user level.',
        status: 'live',
        module: 'AI CMO',
      },
      {
        icon: 'campaignData',
        tone: 'mint',
        title: 'Move more confidently with complete campaign data',
        body: 'Understand test direction with campaign and performance data unified in Analytics and Revenue Attribution.',
        status: 'live',
        module: 'Analytics · Attribution',
      },
    ],
  },
];
