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
    'radial-gradient(120% 120% at 50% 0%, #fff4e0 0%, #f3fbf8 48%, #eef5ff 100%)',
  /** Bold final-CTA accent (gold -> green). White text on this. */
  ctaBold: 'linear-gradient(135deg,#ffaf06 0%,#14bb87 100%)',
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
  shadow: '0 12px 34px rgba(15,23,42,0.08)',
  shadowHover: '0 20px 50px rgba(15,23,42,0.12)',
} as const;

export const LINE = {
  soft: 'rgba(15,23,42,0.08)',
  softer: 'rgba(15,23,42,0.06)',
  strong: 'rgba(15,23,42,0.12)',
} as const;

/** Vibrant accents that pop on light surfaces. */
export const ACCENTS = ['#ffaf06', '#14bb87', '#0A66C2', '#ff5a5f', '#7c5cff'] as const;

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
