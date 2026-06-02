/**
 * Client-side PowerPoint (.pptx) generator using pptxgenjs.
 * Renders a Gamma-style, design-led Trayarunya Ventures deck from a DeckSpec:
 * full-bleed color blocks, oversized typography, bento card grids, big stat
 * numbers and decorative geometric accents.
 *
 * Import dynamically from a client component:
 *   const { buildDeckPptx } = await import('@/lib/pptxBuilder');
 */
import { BRAND } from '@/lib/brandKit';
import type { DeckSpec, DeckSlide, DeckCard, DeckPhase, SlideAccent } from '@/lib/proposalTypes';

const C = BRAND.colors;
const FONT = BRAND.fontFamily;

// 16:9 canvas in inches.
const W = 13.333;
const H = 7.5;

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Resolve an accent theme into a palette for one slide. */
function theme(accent: SlideAccent | undefined, fallback: SlideAccent) {
  const a = accent || fallback;
  switch (a) {
    case 'green':
      return { bg: C.dark, panel: C.darkAlt, accent: C.green, accentSoft: C.greenLight, text: C.white, sub: C.greenLight, onLight: false };
    case 'dark':
      return { bg: C.dark, panel: C.darkAlt, accent: C.gold, accentSoft: C.goldLight, text: C.white, sub: C.greenLight, onLight: false };
    case 'light':
      return { bg: C.white, panel: C.paper, accent: C.gold, accentSoft: C.goldLight, text: C.dark, sub: C.muted, onLight: true };
    case 'gold':
    default:
      return { bg: C.white, panel: C.paper, accent: C.gold, accentSoft: C.goldLight, text: C.dark, sub: C.muted, onLight: true };
  }
}

/** Big soft decorative circle (low-opacity) for depth. */
function blob(slide: any, pptx: any, x: number, y: number, d: number, color: string, transparency = 88) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x, y, w: d, h: d, fill: { color, transparency }, line: { type: 'none' },
  });
}

function footer(slide: any, t: ReturnType<typeof theme>) {
  slide.addText(
    [
      { text: `${BRAND.wordmark.primary} `, options: { color: t.accent, bold: true } },
      { text: BRAND.wordmark.secondary, options: { color: t.onLight ? C.muted : C.white } },
    ],
    { x: 0.55, y: H - 0.48, w: 6, h: 0.3, fontFace: FONT, fontSize: 9, align: 'left' }
  );
  slide.addText(BRAND.contact.website, {
    x: W - 4.55, y: H - 0.48, w: 4, h: 0.3, fontFace: FONT, fontSize: 9,
    color: t.onLight ? C.muted : C.white, align: 'right',
  });
}

/** Eyebrow kicker + big heading + accent underline, shared header. */
function header(slide: any, pptx: any, t: ReturnType<typeof theme>, s: DeckSlide, opts?: { large?: boolean }) {
  let y = 0.6;
  if (s.kicker) {
    slide.addText(s.kicker.toUpperCase(), {
      x: 0.6, y, w: 12, h: 0.35, fontFace: FONT, fontSize: 12, color: t.accent, bold: true, charSpacing: 3,
    });
    y += 0.42;
  }
  if (s.heading) {
    slide.addText(s.heading, {
      x: 0.58, y, w: 12.2, h: opts?.large ? 1.3 : 0.95, fontFace: FONT,
      fontSize: opts?.large ? 34 : 28, color: t.text, bold: true, valign: 'top',
    });
    y += opts?.large ? 1.2 : 0.9;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.62, y: y - 0.12, w: 1.4, h: 0.09, rectRadius: 0.05, fill: { color: t.accent }, line: { type: 'none' },
    });
    y += 0.12;
  }
  if (s.subheading) {
    slide.addText(s.subheading, {
      x: 0.6, y: y + 0.05, w: 12, h: 0.6, fontFace: FONT, fontSize: 14, color: t.sub, valign: 'top',
    });
    y += 0.7;
  }
  return y;
}

/* ----------------------------- Slide templates ---------------------------- */

function titleSlide(slide: any, pptx: any, spec: DeckSpec, s: DeckSlide) {
  const t = theme(s.accent, 'dark');
  slide.background = { color: t.bg };
  blob(slide, pptx, W - 4.6, -2.2, 6.5, t.accent, 86);
  blob(slide, pptx, W - 2.6, H - 3.2, 4.2, C.green, 90);
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.32, h: H, fill: { color: t.accent }, line: { type: 'none' } });

  slide.addText(BRAND.company.toUpperCase(), {
    x: 0.95, y: 1.15, w: 11, h: 0.4, fontFace: FONT, fontSize: 13, color: t.accent, charSpacing: 4, bold: true,
  });
  slide.addText(s.heading || spec.title, {
    x: 0.92, y: 1.85, w: 10.6, h: 2.6, fontFace: FONT, fontSize: 46, color: C.white, bold: true, valign: 'top', lineSpacingMultiple: 0.95,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.97, y: 4.55, w: 2.1, h: 0.1, rectRadius: 0.05, fill: { color: t.accent }, line: { type: 'none' },
  });
  if (s.subheading || spec.subtitle) {
    slide.addText(s.subheading || spec.subtitle || '', {
      x: 0.95, y: 4.85, w: 9.8, h: 1.2, fontFace: FONT, fontSize: 18, color: C.greenLight, valign: 'top',
    });
  }
  if (spec.client) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.95, y: H - 1.25, w: 4.6, h: 0.55, rectRadius: 0.27, fill: { color: C.white, transparency: 88 }, line: { type: 'none' },
    });
    slide.addText(`Prepared for  ${spec.client}`, {
      x: 1.15, y: H - 1.25, w: 4.4, h: 0.55, fontFace: FONT, fontSize: 12, color: C.white, valign: 'middle',
    });
  }
}

function sectionSlide(slide: any, pptx: any, s: DeckSlide, index: number) {
  const t = theme(s.accent, 'green');
  slide.background = { color: t.bg };
  blob(slide, pptx, -1.8, H - 4.6, 6, t.accent, 88);
  blob(slide, pptx, W - 3.2, -1.6, 4.4, C.gold, 90);
  slide.addText(String(index).padStart(2, '0'), {
    x: 0.7, y: 0.4, w: 5, h: 3.4, fontFace: FONT, fontSize: 150, color: t.accent, bold: true, transparency: 78 as any,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.78, y: 4.0, w: 1.5, h: 0.1, rectRadius: 0.05, fill: { color: t.accent }, line: { type: 'none' },
  });
  slide.addText(s.heading || '', {
    x: 0.75, y: 4.2, w: 11.6, h: 1.8, fontFace: FONT, fontSize: 40, color: C.white, bold: true, valign: 'top',
  });
  if (s.subheading) {
    slide.addText(s.subheading, {
      x: 0.78, y: 5.9, w: 11, h: 0.8, fontFace: FONT, fontSize: 16, color: t.accentSoft,
    });
  }
  footer(slide, t);
}

function bulletsSlide(slide: any, pptx: any, s: DeckSlide, numbered = false) {
  const t = theme(s.accent, 'light');
  slide.background = { color: t.bg };
  blob(slide, pptx, W - 3.0, -1.8, 4.5, t.accent, 92);
  const startY = header(slide, pptx, t, s) + 0.15;
  const items = (s.bullets || []).slice(0, 7);
  const avail = H - startY - 0.75;
  const rowH = Math.min(0.78, avail / Math.max(items.length, 1));
  items.forEach((b, i) => {
    const y = startY + i * rowH;
    if (numbered) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.65, y: y + rowH / 2 - 0.22, w: 0.44, h: 0.44, rectRadius: 0.1, fill: { color: t.accent }, line: { type: 'none' },
      });
      slide.addText(String(i + 1), {
        x: 0.65, y: y + rowH / 2 - 0.24, w: 0.44, h: 0.46, fontFace: FONT, fontSize: 16, color: C.dark, bold: true, align: 'center', valign: 'middle',
      });
    } else {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 0.72, y: y + rowH / 2 - 0.1, w: 0.2, h: 0.2, fill: { color: t.accent }, line: { type: 'none' },
      });
    }
    slide.addText(b, {
      x: 1.3, y, w: 11.3, h: rowH, fontFace: FONT, fontSize: 17, color: t.onLight ? C.ink : C.white, valign: 'middle',
    });
  });
  footer(slide, t);
}

function cardsSlide(slide: any, pptx: any, s: DeckSlide) {
  const t = theme(s.accent, 'light');
  slide.background = { color: t.bg };
  const startY = header(slide, pptx, t, s) + 0.1;
  const cards = (s.cards && s.cards.length
    ? s.cards
    : (s.bullets || []).map((b): DeckCard => ({ title: b }))
  ).slice(0, 6);
  const n = cards.length;
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const gap = 0.35;
  const gridY = startY;
  const gridH = H - gridY - 0.7;
  const cardW = (W - 1.2 - gap * (cols - 1)) / cols;
  const cardH = (gridH - gap * (rows - 1)) / rows;
  const accents = [C.gold, C.green, C.red, C.goldLight, C.greenLight, C.gold];
  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.6 + col * (cardW + gap);
    const y = gridY + row * (cardH + gap);
    const ac = accents[i % accents.length];
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: cardW, h: cardH, rectRadius: 0.14,
      fill: { color: t.onLight ? C.white : C.darkAlt },
      line: { color: t.onLight ? C.line : C.darkAlt, width: 1 },
      shadow: { type: 'outer', color: '8899AA', blur: 8, offset: 3, angle: 90, opacity: 0.18 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: cardW, h: 0.13, rectRadius: 0.05, fill: { color: ac }, line: { type: 'none' },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.28, y: y + 0.32, w: 0.6, h: 0.6, rectRadius: 0.12, fill: { color: ac, transparency: 82 }, line: { type: 'none' },
    });
    slide.addText(card.badge || String(i + 1), {
      x: x + 0.28, y: y + 0.32, w: 0.6, h: 0.6, fontFace: FONT, fontSize: 18, color: ac, bold: true, align: 'center', valign: 'middle',
    });
    slide.addText(card.title || '', {
      x: x + 0.28, y: y + 1.05, w: cardW - 0.56, h: 0.6, fontFace: FONT, fontSize: 16, color: t.onLight ? C.dark : C.white, bold: true, valign: 'top',
    });
    if (card.body) {
      slide.addText(card.body, {
        x: x + 0.28, y: y + 1.6, w: cardW - 0.56, h: cardH - 1.75, fontFace: FONT, fontSize: 12, color: t.onLight ? C.muted : C.greenLight, valign: 'top',
      });
    }
  });
  footer(slide, t);
}

function statsSlide(slide: any, pptx: any, s: DeckSlide) {
  const t = theme(s.accent, 'dark');
  slide.background = { color: t.bg };
  blob(slide, pptx, -1.6, -1.6, 4.6, t.accent, 88);
  blob(slide, pptx, W - 3.0, H - 3.2, 4.6, C.green, 90);
  const startY = header(slide, pptx, t, s) + 0.2;
  const stats = (s.stats || []).slice(0, 4);
  const n = Math.max(stats.length, 1);
  const gap = 0.4;
  const cardW = (W - 1.2 - gap * (n - 1)) / n;
  const cardH = 3.0;
  const y = Math.max(startY, 2.6);
  const accents = [C.gold, C.green, C.goldLight, C.greenLight];
  stats.forEach((st, i) => {
    const x = 0.6 + i * (cardW + gap);
    const ac = accents[i % accents.length];
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: cardW, h: cardH, rectRadius: 0.16, fill: { color: C.white, transparency: 6 }, line: { type: 'none' },
    });
    slide.addText(st.value || '', {
      x, y: y + 0.45, w: cardW, h: 1.5, fontFace: FONT, fontSize: 52, color: ac, bold: true, align: 'center', valign: 'middle',
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + cardW / 2 - 0.4, y: y + 1.95, w: 0.8, h: 0.07, rectRadius: 0.03, fill: { color: ac }, line: { type: 'none' },
    });
    slide.addText(st.label || '', {
      x: x + 0.2, y: y + 2.15, w: cardW - 0.4, h: 0.75, fontFace: FONT, fontSize: 13, color: C.white, align: 'center', valign: 'top',
    });
  });
  footer(slide, t);
}

function twoColumnSlide(slide: any, pptx: any, s: DeckSlide) {
  const t = theme(s.accent, 'light');
  slide.background = { color: t.bg };
  const startY = header(slide, pptx, t, s) + 0.1;
  const colW = (W - 1.2 - 0.5) / 2;
  const colH = H - startY - 0.7;
  const cols: Array<{ items: string[]; x: number; accent: string; heading?: string }> = [
    { items: s.left || [], x: 0.6, accent: C.red, heading: s.leftHeading },
    { items: s.right || [], x: 0.6 + colW + 0.5, accent: C.green, heading: s.rightHeading },
  ];
  cols.forEach((col) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: col.x, y: startY, w: colW, h: colH, rectRadius: 0.14,
      fill: { color: t.onLight ? C.white : C.darkAlt }, line: { color: t.onLight ? C.line : C.darkAlt, width: 1 },
      shadow: { type: 'outer', color: '8899AA', blur: 8, offset: 3, angle: 90, opacity: 0.15 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: col.x, y: startY, w: colW, h: 0.13, rectRadius: 0.05, fill: { color: col.accent }, line: { type: 'none' },
    });
    let iy = startY + 0.4;
    if (col.heading) {
      slide.addText(col.heading, {
        x: col.x + 0.4, y: iy, w: colW - 0.8, h: 0.5, fontFace: FONT, fontSize: 17, color: col.accent, bold: true,
      });
      iy += 0.65;
    }
    col.items.slice(0, 7).forEach((it) => {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: col.x + 0.42, y: iy + 0.12, w: 0.16, h: 0.16, fill: { color: col.accent }, line: { type: 'none' },
      });
      slide.addText(it, {
        x: col.x + 0.74, y: iy - 0.05, w: colW - 1.1, h: 0.55, fontFace: FONT, fontSize: 13.5, color: t.onLight ? C.ink : C.white, valign: 'top',
      });
      iy += 0.62;
    });
  });
  footer(slide, t);
}

function timelineSlide(slide: any, pptx: any, s: DeckSlide) {
  const t = theme(s.accent, 'light');
  slide.background = { color: t.bg };
  const startY = header(slide, pptx, t, s) + 0.2;
  const phases = (s.phases && s.phases.length
    ? s.phases
    : (s.bullets || []).map((b, i): DeckPhase => ({ phase: `Phase ${i + 1}`, detail: b }))
  ).slice(0, 4);
  const n = Math.max(phases.length, 1);
  const gap = 0.35;
  const cardW = (W - 1.2 - gap * (n - 1)) / n;
  const y = Math.max(startY, 2.7);
  const lineY = y - 0.45;
  slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: lineY, w: W - 1.6, h: 0.04, fill: { color: t.accent, transparency: 50 }, line: { type: 'none' } });
  const accents = [C.gold, C.green, C.red, C.goldLight];
  phases.forEach((p, i) => {
    const x = 0.6 + i * (cardW + gap);
    const ac = accents[i % accents.length];
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + cardW / 2 - 0.16, y: lineY - 0.13, w: 0.32, h: 0.32, fill: { color: ac }, line: { color: t.bg, width: 2 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: cardW, h: H - y - 0.75, rectRadius: 0.14,
      fill: { color: t.onLight ? C.white : C.darkAlt }, line: { color: t.onLight ? C.line : C.darkAlt, width: 1 },
    });
    slide.addText(p.phase || `Phase ${i + 1}`, {
      x: x + 0.3, y: y + 0.35, w: cardW - 0.6, h: 0.8, fontFace: FONT, fontSize: 16, color: ac, bold: true, valign: 'top',
    });
    if (p.detail) {
      slide.addText(p.detail, {
        x: x + 0.3, y: y + 1.15, w: cardW - 0.6, h: H - y - 2.0, fontFace: FONT, fontSize: 12.5, color: t.onLight ? C.muted : C.greenLight, valign: 'top',
      });
    }
  });
  footer(slide, t);
}

function quoteSlide(slide: any, pptx: any, s: DeckSlide) {
  const t = theme(s.accent, 'dark');
  slide.background = { color: t.bg };
  blob(slide, pptx, W - 4.4, H - 4.4, 6.4, t.accent, 88);
  slide.addText('\u201C', {
    x: 0.6, y: 0.3, w: 3, h: 2.4, fontFace: 'Georgia', fontSize: 170, color: t.accent, bold: true,
  });
  slide.addText(s.quote || '', {
    x: 1.2, y: 2.3, w: 10.9, h: 3.0, fontFace: FONT, fontSize: 28, color: C.white, italic: true, valign: 'middle', lineSpacingMultiple: 1.1,
  });
  if (s.attribution) {
    slide.addText(`— ${s.attribution}`, {
      x: 1.25, y: 5.5, w: 10, h: 0.6, fontFace: FONT, fontSize: 15, color: t.accentSoft, bold: true,
    });
  }
  footer(slide, t);
}

function closingSlide(slide: any, pptx: any, s: DeckSlide) {
  const t = theme(s.accent, 'dark');
  slide.background = { color: t.bg };
  blob(slide, pptx, -2.0, -2.0, 6, t.accent, 86);
  blob(slide, pptx, W - 3.4, H - 3.4, 5, C.green, 90);
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.3, fill: { color: t.accent }, line: { type: 'none' } });
  slide.addText((s.kicker || "Let's partner up").toUpperCase(), {
    x: 0.85, y: 1.9, w: 11, h: 0.4, fontFace: FONT, fontSize: 13, color: t.accent, bold: true, charSpacing: 3,
  });
  slide.addText(s.heading || "Let's build your pipeline", {
    x: 0.82, y: 2.4, w: 11.6, h: 1.5, fontFace: FONT, fontSize: 42, color: C.white, bold: true,
  });
  if (s.subheading) {
    slide.addText(s.subheading, { x: 0.85, y: 3.95, w: 11, h: 0.8, fontFace: FONT, fontSize: 17, color: t.accentSoft });
  }
  const chips = [BRAND.contact.email, BRAND.contact.phone, BRAND.contact.website];
  let cx = 0.85;
  chips.forEach((txt) => {
    const w = Math.min(4.6, 0.5 + txt.length * 0.11);
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 5.15, w, h: 0.6, rectRadius: 0.3, fill: { color: C.white, transparency: 86 }, line: { type: 'none' },
    });
    slide.addText(txt, { x: cx + 0.05, y: 5.15, w, h: 0.6, fontFace: FONT, fontSize: 12, color: C.white, align: 'center', valign: 'middle' });
    cx += w + 0.25;
  });
}

function renderSlide(slide: any, pptx: any, spec: DeckSpec, s: DeckSlide, index: number) {
  switch (s.layout) {
    case 'title':
      return titleSlide(slide, pptx, spec, s);
    case 'agenda':
      return bulletsSlide(slide, pptx, s, true);
    case 'section':
      return sectionSlide(slide, pptx, s, index);
    case 'cards':
      return cardsSlide(slide, pptx, s);
    case 'stats':
      return statsSlide(slide, pptx, s);
    case 'twoColumn':
      return twoColumnSlide(slide, pptx, s);
    case 'timeline':
      return timelineSlide(slide, pptx, s);
    case 'quote':
      return quoteSlide(slide, pptx, s);
    case 'closing':
      return closingSlide(slide, pptx, s);
    case 'content':
    default:
      return bulletsSlide(slide, pptx, s, false);
  }
}

function safeName(s: string): string {
  return (s || 'deck').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'deck';
}

/** Build and download a Gamma-style branded .pptx from a DeckSpec. */
export async function buildDeckPptx(spec: DeckSpec): Promise<void> {
  const mod = await import('pptxgenjs');
  const PptxGenJS = (mod as unknown as { default: new () => any }).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'TV_WIDE', width: W, height: H });
  pptx.layout = 'TV_WIDE';
  pptx.author = BRAND.company;
  pptx.company = BRAND.company;
  pptx.title = spec.title || 'Deck';

  const slides = Array.isArray(spec.slides) && spec.slides.length ? spec.slides : [
    { layout: 'title' as const, heading: spec.title, subheading: spec.subtitle },
  ];

  let sectionCount = 0;
  slides.forEach((s) => {
    if (s.layout === 'section') sectionCount += 1;
    const slide = pptx.addSlide();
    renderSlide(slide, pptx, spec, s, sectionCount || 1);
    if (s.note) slide.addNotes(s.note);
  });

  await pptx.writeFile({ fileName: `${safeName(spec.title)}-trayarunya.pptx` });
}
