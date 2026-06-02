/**
 * Shared spec types for AI-generated decks & proposals.
 * Client- and server-safe (no fs, no secrets).
 */

export type ArtifactType = 'deck' | 'proposal';

export type SlideLayout =
  | 'title'
  | 'agenda'
  | 'section'
  | 'content'
  | 'cards'
  | 'stats'
  | 'twoColumn'
  | 'timeline'
  | 'quote'
  | 'closing';

/** Accent theme for a slide — drives the Gamma-style color system. */
export type SlideAccent = 'gold' | 'green' | 'dark' | 'light';

export interface DeckStat {
  value: string;
  label: string;
}

export interface DeckCard {
  /** Short title for the card. */
  title: string;
  /** 1-2 line description. */
  body?: string;
  /** Optional short tag shown as a badge (e.g. a number, %, or emoji). */
  badge?: string;
}

export interface DeckPhase {
  phase: string;
  detail?: string;
}

export interface DeckSlide {
  layout: SlideLayout;
  /** Small eyebrow/kicker label above the heading. */
  kicker?: string;
  heading?: string;
  subheading?: string;
  bullets?: string[];
  /** For 'stats' layout. */
  stats?: DeckStat[];
  /** For 'cards'/'bento' layout. */
  cards?: DeckCard[];
  /** For 'timeline' layout. */
  phases?: DeckPhase[];
  /** For 'twoColumn' layout. */
  left?: string[];
  right?: string[];
  leftHeading?: string;
  rightHeading?: string;
  /** For 'quote' layout. */
  quote?: string;
  attribution?: string;
  /** Optional accent theme override. */
  accent?: SlideAccent;
  /** Speaker note. */
  note?: string;
}

export interface DeckSpec {
  title: string;
  subtitle?: string;
  client?: string;
  slides: DeckSlide[];
}

export interface ProposalSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface ProposalPricing {
  item: string;
  detail?: string;
  price: string;
}

export interface ProposalSpec {
  client: string;
  title: string;
  preparedBy?: string;
  intro?: string;
  sections: ProposalSection[];
  pricing?: ProposalPricing[];
  timeline?: { phase: string; detail: string }[];
  cta?: string;
}

export interface Proposal {
  id: string;
  type: ArtifactType;
  title: string;
  client: string;
  /** The generated spec — DeckSpec or ProposalSpec depending on `type`. */
  spec: DeckSpec | ProposalSpec;
  createdAt: string;
  createdBy: string;
  leadId?: string;
}

export type ProposalSummary = Pick<
  Proposal,
  'id' | 'type' | 'title' | 'client' | 'createdAt' | 'createdBy' | 'leadId'
>;
