/**
 * Shared light-theme design tokens. Single source of truth for the colorful
 * marketing-agency look. Import these instead of hardcoding dark hex values.
 */

export const SURFACE = {
  white: '#ffffff',
  cream: 'linear-gradient(180deg,#ffffff 0%,#fff8ec 100%)',
  mint: 'linear-gradient(180deg,#f3fbf8 0%,#eaf7f1 100%)',
  sky: 'linear-gradient(180deg,#eef5ff 0%,#f6f9ff 100%)',
  peach: 'linear-gradient(180deg,#fff5f2 0%,#fdeee9 100%)',
  lavender: 'linear-gradient(180deg,#f6f3ff 0%,#efeaff 100%)',
  heroLight:
    'radial-gradient(80% 70% at 10% 0%, #ffe9c2 0%, transparent 60%), radial-gradient(70% 60% at 95% 10%, #ffd6e7 0%, transparent 60%), radial-gradient(90% 80% at 50% 100%, #e4ddff 0%, transparent 65%), linear-gradient(180deg,#fffaf2 0%,#f6f3ff 100%)',
  /** Bold final-CTA accent (gold -> pink -> violet). White text on this. */
  ctaBold: 'linear-gradient(125deg,#ff9f1c 0%,#ff4d8d 45%,#7c5cff 100%)',
} as const;

/** Solid fallbacks (use where a gradient string isn't accepted). */
export const SURFACE_SOLID = {
  white: '#ffffff',
  cream: '#fff8ec',
  mint: '#eaf7f1',
  sky: '#f1f6ff',
  peach: '#fdeee9',
  lavender: '#efeaff',
} as const;

export const TEXT = {
  heading: '#0f1320',
  body: '#475569',
  muted: '#64748b',
  faint: '#94a3b8',
} as const;

export const CARD = {
  bg: '#ffffff',
  bgSoft: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(15,23,42,0.08)',
  borderStrong: '1px solid rgba(15,23,42,0.12)',
  shadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 12px 34px rgba(15,23,42,0.08), 0 2px 0 rgba(124,92,255,0.12)',
  shadowHover: '0 1px 0 rgba(255,255,255,0.9) inset, 0 28px 60px -12px rgba(124,92,255,0.28), 0 14px 30px rgba(15,23,42,0.1)',
} as const;

export const LINE = {
  soft: 'rgba(15,23,42,0.08)',
  softer: 'rgba(15,23,42,0.06)',
  strong: 'rgba(15,23,42,0.12)',
} as const;

/** Vibrant accents that pop on light surfaces. */
export const ACCENTS = ['#ffaf06', '#14bb87', '#0A66C2', '#ff4d8d', '#7c5cff'] as const;

/** Signature creative-agency gradient (gold -> hot pink -> violet -> green). */
export const CREATIVE_GRADIENT =
  'linear-gradient(90deg,#ff9f1c 0%,#ff4d8d 35%,#7c5cff 68%,#14bb87 100%)';

/** 3D depth helpers — stacked "extruded" shadows for a tactile, clay-like feel. */
export const DEPTH = {
  perspective: 1200,
  button: '0 6px 0 #b86f00, 0 14px 28px rgba(255,77,141,0.35)',
  buttonHover: '0 8px 0 #b86f00, 0 22px 40px rgba(124,92,255,0.4)',
  buttonActive: '0 2px 0 #b86f00, 0 6px 14px rgba(255,77,141,0.3)',
  card: '0 2px 0 rgba(124,92,255,0.14), 0 18px 40px -12px rgba(15,23,42,0.18)',
  textExtrude:
    '1px 1px 0 #ffaf06, 2px 2px 0 #ff4d8d, 3px 3px 0 #7c5cff, 4px 4px 12px rgba(124,92,255,0.25)',
} as const;

/**
 * Build a soft pastel tint card style for a given accent colour on light bg.
 * Replaces the old `${color}1f` on black pattern.
 */
export const tintCard = (color: string) => ({
  background: `${color}14`,
  border: `1px solid ${color}33`,
});

/** Section background helper — alternate these down a page for rhythm. */
export const sectionRhythm = [
  SURFACE.white,
  SURFACE.cream,
  SURFACE.mint,
  SURFACE.sky,
  SURFACE.peach,
] as const;
