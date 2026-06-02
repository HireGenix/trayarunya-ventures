/**
 * Lightweight vector icon library shared by the PPTX (pptxgenjs) and PDF
 * (jsPDF) generators. Each icon is a list of stroke primitives in a normalised
 * 0..1 box, so the same definition renders crisply at any size in either
 * format — the "small line icon on every card" look that makes Gamma decks feel
 * designed. No external assets, no fonts, no network.
 */

export type IconPrim =
  | { k: 'circle'; cx: number; cy: number; r: number }
  | { k: 'dot'; cx: number; cy: number; r: number }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { k: 'rrect'; x: number; y: number; w: number; h: number; r: number }
  | { k: 'poly'; pts: [number, number][]; close?: boolean };

export type IconDef = IconPrim[];

const c = (cx: number, cy: number, r: number): IconPrim => ({ k: 'circle', cx, cy, r });
const dot = (cx: number, cy: number, r: number): IconPrim => ({ k: 'dot', cx, cy, r });
const l = (x1: number, y1: number, x2: number, y2: number): IconPrim => ({ k: 'line', x1, y1, x2, y2 });
const rr = (x: number, y: number, w: number, h: number, r: number): IconPrim => ({ k: 'rrect', x, y, w, h, r });
const poly = (pts: [number, number][], close = false): IconPrim => ({ k: 'poly', pts, close });

export const ICONS: Record<string, IconDef> = {
  target: [c(0.5, 0.5, 0.45), c(0.5, 0.5, 0.27), dot(0.5, 0.5, 0.08)],
  rocket: [
    poly([[0.5, 0.06], [0.68, 0.46], [0.6, 0.72], [0.4, 0.72], [0.32, 0.46]], true),
    c(0.5, 0.4, 0.09),
    poly([[0.4, 0.72], [0.3, 0.92], [0.42, 0.82]]),
    poly([[0.6, 0.72], [0.7, 0.92], [0.58, 0.82]]),
  ],
  trendingUp: [
    poly([[0.07, 0.72], [0.37, 0.44], [0.54, 0.6], [0.93, 0.2]]),
    poly([[0.68, 0.2], [0.93, 0.2], [0.93, 0.45]]),
  ],
  megaphone: [
    poly([[0.14, 0.42], [0.6, 0.24], [0.6, 0.76], [0.14, 0.58]], true),
    l(0.14, 0.42, 0.14, 0.58),
    poly([[0.24, 0.62], [0.24, 0.82], [0.36, 0.82], [0.34, 0.66]]),
    l(0.6, 0.4, 0.76, 0.34),
    l(0.6, 0.6, 0.76, 0.66),
  ],
  users: [
    c(0.36, 0.34, 0.15),
    c(0.68, 0.36, 0.12),
    poly([[0.14, 0.84], [0.18, 0.62], [0.54, 0.62], [0.58, 0.84]]),
    poly([[0.62, 0.84], [0.64, 0.64], [0.86, 0.64], [0.88, 0.84]]),
  ],
  bulb: [
    c(0.5, 0.36, 0.26),
    l(0.4, 0.66, 0.6, 0.66),
    l(0.42, 0.74, 0.58, 0.74),
    l(0.45, 0.82, 0.55, 0.82),
  ],
  check: [c(0.5, 0.5, 0.45), poly([[0.3, 0.52], [0.45, 0.66], [0.72, 0.36]])],
  gear: [
    c(0.5, 0.5, 0.19),
    l(0.5, 0.06, 0.5, 0.26),
    l(0.5, 0.74, 0.5, 0.94),
    l(0.06, 0.5, 0.26, 0.5),
    l(0.74, 0.5, 0.94, 0.5),
    l(0.2, 0.2, 0.34, 0.34),
    l(0.66, 0.66, 0.8, 0.8),
    l(0.8, 0.2, 0.66, 0.34),
    l(0.34, 0.66, 0.2, 0.8),
  ],
  magnet: [
    poly([[0.24, 0.86], [0.24, 0.46], [0.29, 0.31], [0.4, 0.23], [0.5, 0.21], [0.6, 0.23], [0.71, 0.31], [0.76, 0.46], [0.76, 0.86]]),
    poly([[0.4, 0.86], [0.4, 0.5], [0.45, 0.4], [0.5, 0.37], [0.55, 0.4], [0.6, 0.5], [0.6, 0.86]]),
    l(0.24, 0.84, 0.4, 0.84),
    l(0.6, 0.84, 0.76, 0.84),
  ],
  mail: [rr(0.1, 0.26, 0.8, 0.48, 0.06), poly([[0.1, 0.3], [0.5, 0.56], [0.9, 0.3]])],
  search: [c(0.42, 0.42, 0.3), l(0.63, 0.63, 0.88, 0.88)],
  trophy: [
    poly([[0.32, 0.16], [0.68, 0.16], [0.66, 0.44], [0.5, 0.56], [0.34, 0.44]], true),
    poly([[0.32, 0.2], [0.18, 0.2], [0.2, 0.38], [0.32, 0.42]]),
    poly([[0.68, 0.2], [0.82, 0.2], [0.8, 0.38], [0.68, 0.42]]),
    l(0.5, 0.56, 0.5, 0.72),
    l(0.36, 0.84, 0.64, 0.84),
    l(0.42, 0.72, 0.58, 0.72),
  ],
  barChart: [
    l(0.12, 0.86, 0.92, 0.86),
    rr(0.2, 0.54, 0.13, 0.32, 0.02),
    rr(0.44, 0.38, 0.13, 0.48, 0.02),
    rr(0.68, 0.24, 0.13, 0.62, 0.02),
  ],
  calendar: [
    rr(0.12, 0.2, 0.76, 0.68, 0.06),
    l(0.12, 0.38, 0.88, 0.38),
    l(0.32, 0.1, 0.32, 0.26),
    l(0.68, 0.1, 0.68, 0.26),
  ],
  shield: [poly([[0.5, 0.08], [0.85, 0.22], [0.85, 0.5], [0.5, 0.92], [0.15, 0.5], [0.15, 0.22]], true)],
  star: [
    poly(
      [
        [0.5, 0.05], [0.61, 0.36], [0.94, 0.38], [0.68, 0.58],
        [0.78, 0.92], [0.5, 0.71], [0.22, 0.92], [0.32, 0.58],
        [0.06, 0.38], [0.39, 0.36],
      ],
      true
    ),
  ],
  zap: [poly([[0.56, 0.05], [0.27, 0.55], [0.47, 0.55], [0.42, 0.95], [0.73, 0.42], [0.5, 0.42]], true)],
  globe: [c(0.5, 0.5, 0.44), l(0.06, 0.5, 0.94, 0.5), l(0.5, 0.06, 0.5, 0.94), poly([[0.5, 0.06], [0.7, 0.3], [0.7, 0.7], [0.5, 0.94], [0.3, 0.7], [0.3, 0.3]], true)],
  clock: [c(0.5, 0.5, 0.44), l(0.5, 0.5, 0.5, 0.24), l(0.5, 0.5, 0.68, 0.58)],
  pen: [poly([[0.22, 0.78], [0.66, 0.34], [0.78, 0.46], [0.34, 0.9], [0.18, 0.94]], false), l(0.18, 0.94, 0.34, 0.9), l(0.6, 0.4, 0.72, 0.52)],
  funnel: [poly([[0.12, 0.2], [0.88, 0.2], [0.58, 0.54], [0.58, 0.86], [0.42, 0.78], [0.42, 0.54]], true)],
  handshake: [poly([[0.1, 0.4], [0.3, 0.34], [0.5, 0.5], [0.4, 0.62], [0.28, 0.5]]), poly([[0.9, 0.4], [0.7, 0.34], [0.5, 0.5]]), l(0.4, 0.62, 0.56, 0.74), l(0.5, 0.5, 0.66, 0.66)],
  link: [poly([[0.4, 0.6], [0.3, 0.7], [0.22, 0.62], [0.32, 0.52]]), poly([[0.6, 0.4], [0.7, 0.3], [0.78, 0.38], [0.68, 0.48]]), l(0.42, 0.58, 0.58, 0.42)],
  layers: [poly([[0.5, 0.12], [0.88, 0.34], [0.5, 0.56], [0.12, 0.34]], true), poly([[0.12, 0.54], [0.5, 0.76], [0.88, 0.54]]), poly([[0.12, 0.7], [0.5, 0.92], [0.88, 0.7]])],
  compass: [c(0.5, 0.5, 0.44), poly([[0.64, 0.36], [0.54, 0.54], [0.36, 0.64], [0.46, 0.46]], true)],
  heart: [poly([[0.5, 0.82], [0.16, 0.46], [0.16, 0.3], [0.32, 0.22], [0.5, 0.34], [0.68, 0.22], [0.84, 0.3], [0.84, 0.46]], true)],
};

const DEFAULT_ROTATION = ['target', 'trendingUp', 'users', 'bulb', 'gear', 'check'];

/** Keyword → icon mapping, scanned in priority order. */
const KEYWORD_MAP: [RegExp, string][] = [
  [/funnel|qualif|segment|filter/, 'funnel'],
  [/lead|prospect|pipeline/, 'magnet'],
  [/email|outreach|nurtur|newsletter|inbox|cold\s?mail/, 'mail'],
  [/audience|customer|client|people|community|follower|\busers?\b|team|partner/, 'users'],
  [/ad\b|ads\b|campaign|awareness|promot|reach|megaphone|broadcast/, 'megaphone'],
  [/research|audit|analy|discover|\bseo\b|keyword|insight|find|search/, 'search'],
  [/data|metric|report|measure|track|dashboard|stat|analytic/, 'barChart'],
  [/idea|strateg|creativ|think|innovat|concept|brand position/, 'bulb'],
  [/content|write|blog|post|copy|design|edit|creativ/, 'pen'],
  [/automat|workflow|\bai\b|tech|engine|system|optimi|setup|integrat|process|machine/, 'gear'],
  [/win|award|best|leader|champ|top\b|success|premium|result/, 'trophy'],
  [/grow|increase|revenue|\broi\b|sales|convert|conversion|scale|performance|profit/, 'trendingUp'],
  [/launch|start|kick\s?off|accelerat|rocket|boost|momentum/, 'rocket'],
  [/secure|protect|safe|risk|complian|trust|shield|guarantee/, 'shield'],
  [/schedul|timeline|month|week|phase|roadmap|plan|calendar|deadline/, 'calendar'],
  [/fast|speed|quick|instant|power|energy|real[-\s]?time/, 'zap'],
  [/global|market|worldwide|web|online|digital|world|reach/, 'globe'],
  [/time|hour|response|turnaround/, 'clock'],
  [/goal|target|objective|focus|precision|account[-\s]?based|abm/, 'target'],
  [/connect|link|channel|network|relationship/, 'link'],
  [/quality|proven|deliver|ensure|complete|done|reliab/, 'check'],
  [/love|loyal|retention|delight|advocate|engage/, 'heart'],
  [/stack|tier|package|layer|suite|bundle/, 'layers'],
  [/direction|navigat|guide|approach|compass|north\s?star/, 'compass'],
  [/deal|negotiat|close|agreement|handshake|relationship/, 'link'],
];

/** Pick the most relevant icon for a piece of text, with a stable fallback. */
export function pickIcon(text: string | undefined, fallbackIndex = 0): IconDef {
  const t = (text || '').toLowerCase();
  for (const [re, name] of KEYWORD_MAP) {
    if (re.test(t) && ICONS[name]) return ICONS[name];
  }
  return ICONS[DEFAULT_ROTATION[fallbackIndex % DEFAULT_ROTATION.length]];
}

/** Resolve an explicit icon name, else fall back to keyword/rotation. */
export function resolveIcon(name: string | undefined, text: string | undefined, fallbackIndex = 0): IconDef {
  if (name && ICONS[name]) return ICONS[name];
  return pickIcon(text, fallbackIndex);
}
