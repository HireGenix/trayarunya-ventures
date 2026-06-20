/**
 * Hightouch-style dashboard design tokens.
 *
 * Clean white base + soft sage/teal/peach/lavender gradients, black pill tabs
 * with a neon-green active ring, pastel circular icon badges and rounded glass
 * cards. Import these instead of hardcoding hex values across dashboard pages.
 */

/** Core surfaces. */
export const DASH = {
  bg: '#f7f9f8',
  bgSoft: '#f1f5f3',
  panel: '#ffffff',
  ink: '#0f1320',
  body: '#475569',
  muted: '#64748b',
  faint: '#94a3b8',
  line: 'rgba(15,23,42,0.08)',
  lineStrong: 'rgba(15,23,42,0.12)',
  /** Black pill + neon-green active ring (reference active tab). */
  pillActive: '#0b0f14',
  neon: '#34d07f',
  neonGlow: 'rgba(52,208,127,0.45)',
} as const;

/** Pastel icon-badge tints (background + line-icon colour). */
export const PASTEL = {
  lavender: { bg: '#ece9ff', fg: '#6d5cf0' },
  mint: { bg: '#d8f6e6', fg: '#16a06a' },
  peach: { bg: '#ffe7d0', fg: '#e8853a' },
  coral: { bg: '#ffe1e1', fg: '#e7564f' },
  sky: { bg: '#d8ecff', fg: '#2e7cf6' },
  sage: { bg: '#e3efe6', fg: '#4a8c6a' },
} as const;

export type PastelKey = keyof typeof PASTEL;

/** Soft section gradients pulled from the reference product mockups. */
export const SOFT = {
  sage: 'linear-gradient(135deg,#eef5ef 0%,#dfeee3 100%)',
  teal: 'linear-gradient(135deg,#e9f4f1 0%,#d6ece6 100%)',
  peachWarm: 'linear-gradient(135deg,#fff4e8 0%,#ffe7cf 100%)',
  lavender: 'linear-gradient(135deg,#f3f0ff 0%,#e7e0ff 100%)',
  hero: 'radial-gradient(120% 120% at 50% 0%,#f1f8f3 0%,#eef5ff 55%,#fff6ee 100%)',
} as const;

export const CARD = {
  radius: 20,
  bg: '#ffffff',
  border: '1px solid rgba(15,23,42,0.08)',
  shadow: '0 14px 40px -18px rgba(15,23,42,0.18)',
  shadowHover: '0 22px 60px -22px rgba(15,23,42,0.26)',
} as const;

/** Ordered pastel palette for cycling through card grids. */
export const PASTEL_CYCLE: PastelKey[] = ['lavender', 'mint', 'peach', 'coral', 'sky', 'sage'];
