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
  | 'stats'
  | 'twoColumn'
  | 'quote'
  | 'closing';

export interface DeckStat {
  value: string;
  label: string;
}

export interface DeckSlide {
  layout: SlideLayout;
  heading?: string;
  subheading?: string;
  bullets?: string[];
  /** For 'stats' layout. */
  stats?: DeckStat[];
  /** For 'twoColumn' layout. */
  left?: string[];
  right?: string[];
  /** For 'quote' layout. */
  quote?: string;
  attribution?: string;
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
