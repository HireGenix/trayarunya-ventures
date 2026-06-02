/**
 * Free, in-process brand-color extractor.
 *
 * Fetches a company's website and mines its declared brand colors from:
 *  - <meta name="theme-color"> / msapplication-TileColor
 *  - CSS custom properties (--primary, --brand, --accent, ...)
 *  - the most frequent vivid colors used across inline <style> blocks,
 *    style="" attributes and up to a few linked stylesheets.
 *
 * No API key, no headless browser — just fetch + regex + cheerio. Returns bare
 * hex (no leading '#', uppercase) to match brandKit's convention.
 */

import * as cheerio from 'cheerio';

export interface BrandColors {
  ok: boolean;
  primary?: string;
  accent?: string;
  source?: string;
  reason?: string;
}

interface RGB { r: number; g: number; b: number }

/* ---------------- color math ---------------- */

function clamp(n: number, lo = 0, hi = 255) {
  return Math.max(lo, Math.min(hi, n));
}

function rgbToHex({ r, g, b }: RGB): string {
  return [r, g, b]
    .map((v) => clamp(Math.round(v)).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/** Parse a CSS color token (#rgb/#rgba/#rrggbb/#rrggbbaa, rgb(), rgba()) to RGB. */
function parseColor(token: string): RGB | null {
  const t = token.trim().toLowerCase();
  const hex = t.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length === 8) h = h.slice(0, 6);
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = t.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(',').map((p) => p.trim());
    if (parts.length < 3) return null;
    const r = Number(parts[0]); const g = Number(parts[1]); const b = Number(parts[2]);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r: clamp(r), g: clamp(g), b: clamp(b) };
  }
  return null;
}

/** HSL (h in degrees, s/l in 0..1). */
function toHsl({ r, g, b }: RGB) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

/** A "vivid brand" color: saturated enough and neither too dark nor too light. */
function isVivid(rgb: RGB): boolean {
  const { s, l } = toHsl(rgb);
  return s >= 0.18 && l >= 0.12 && l <= 0.9;
}

/** Lighten a bare hex toward white by amt (0..1). Returns bare hex. */
export function lightenHex(bare: string, amt = 0.3): string {
  const rgb = parseColor(`#${bare.replace('#', '')}`);
  if (!rgb) return bare;
  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * amt,
    g: rgb.g + (255 - rgb.g) * amt,
    b: rgb.b + (255 - rgb.b) * amt,
  });
}

/** Darken a bare hex toward black by amt (0..1). Returns bare hex. */
export function darkenHex(bare: string, amt = 0.2): string {
  const rgb = parseColor(`#${bare.replace('#', '')}`);
  if (!rgb) return bare;
  return rgbToHex({ r: rgb.r * (1 - amt), g: rgb.g * (1 - amt), b: rgb.b * (1 - amt) });
}

/* ---------------- extraction ---------------- */

const COLOR_TOKEN = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)/g;
const BRAND_VAR =
  /--(?:color-)?(?:primary|brand|accent|main|theme|cta|link)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/gi;

function normaliseUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

async function fetchText(url: string, timeoutMs = 9000, maxBytes = 600_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,text/css,*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, maxBytes);
  } catch {
    return null;
  }
}

export async function extractBrandColors(rawUrl: string): Promise<BrandColors> {
  const url = normaliseUrl(rawUrl || '');
  if (!/^https?:\/\/[^.]+\.[^.]+/.test(url)) {
    return { ok: false, reason: 'invalid_url' };
  }

  const html = await fetchText(url);
  if (!html) return { ok: false, source: url, reason: 'fetch_failed' };

  const $ = cheerio.load(html);

  // weight map keyed by canonical bare hex
  const scores = new Map<string, number>();
  const add = (token: string, weight: number) => {
    const rgb = parseColor(token);
    if (!rgb) return;
    const hex = rgbToHex(rgb);
    // ignore pure white/black entirely
    if (hex === 'FFFFFF' || hex === '000000') return;
    const boost = isVivid(rgb) ? 1 : 0.15;
    scores.set(hex, (scores.get(hex) || 0) + weight * boost);
  };

  // 1) Declared theme colors — strongest signal.
  const themeColor = $('meta[name="theme-color"]').attr('content');
  if (themeColor) add(themeColor, 14);
  const tileColor = $('meta[name="msapplication-TileColor"]').attr('content');
  if (tileColor) add(tileColor, 10);

  // 2) Collect CSS text from inline <style> blocks + a few linked stylesheets.
  let css = '';
  $('style').each((_, el) => { css += '\n' + $(el).text(); });

  const cssLinks: string[] = [];
  $('link[rel="stylesheet"], link[as="style"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) cssLinks.push(href);
  });
  // fetch up to 3 stylesheets, resolving relative URLs
  for (const href of cssLinks.slice(0, 3)) {
    try {
      const abs = new URL(href, url).toString();
      const sheet = await fetchText(abs, 7000, 400_000);
      if (sheet) css += '\n' + sheet;
    } catch { /* ignore */ }
  }

  // 3) Brand-named CSS variables — strong signal.
  let m: RegExpExecArray | null;
  BRAND_VAR.lastIndex = 0;
  while ((m = BRAND_VAR.exec(css)) !== null) add(m[1], 9);

  // 4) Frequency of every color token in CSS + inline styles — weak but telling.
  const styleAttrs: string[] = [];
  $('[style]').each((_, el) => { const s = $(el).attr('style'); if (s) styleAttrs.push(s); });
  const haystack = css + '\n' + styleAttrs.join('\n');
  COLOR_TOKEN.lastIndex = 0;
  while ((m = COLOR_TOKEN.exec(haystack)) !== null) add(m[0], 1);

  if (!scores.size) return { ok: false, source: url, reason: 'no_colors' };

  // Rank: prefer vivid, high-scoring colors for the primary.
  const ranked = [...scores.entries()]
    .map(([hex, score]) => {
      const rgb = parseColor(`#${hex}`)!;
      const { h, s, l } = toHsl(rgb);
      const vivid = isVivid(rgb);
      // composite: score weighted up for vividness, mid lightness
      const midL = 1 - Math.abs(l - 0.5) * 1.4;
      const composite = score * (vivid ? 1 : 0.25) * (0.5 + s) * (0.6 + 0.4 * Math.max(0, midL));
      return { hex, rgb, h, s, l, vivid, composite };
    })
    .sort((a, b) => b.composite - a.composite);

  const vividRanked = ranked.filter((c) => c.vivid);
  const pool = vividRanked.length ? vividRanked : ranked;

  let primary = pool[0].hex;
  // If the chosen primary is very light, darken it a touch so it reads as an accent on white.
  if (toHsl(pool[0].rgb).l > 0.82) primary = darkenHex(primary, 0.18);

  // Accent: the next color with a clearly different hue from primary.
  const ph = toHsl(parseColor(`#${primary}`)!).h;
  let accent: string | undefined;
  for (const c of pool.slice(1)) {
    const dh = Math.abs(c.h - ph);
    const hueGap = Math.min(dh, 360 - dh);
    if (hueGap > 25) { accent = c.hex; break; }
  }

  return { ok: true, primary, accent, source: url };
}
