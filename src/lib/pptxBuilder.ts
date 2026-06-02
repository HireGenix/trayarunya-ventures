/**
 * Client-side PowerPoint (.pptx) generator using pptxgenjs.
 * Renders a branded Trayarunya Ventures deck from a DeckSpec with several
 * visual slide templates. Import dynamically from a client component:
 *   const { buildDeckPptx } = await import('@/lib/pptxBuilder');
 */
import { BRAND } from '@/lib/brandKit';
import type { DeckSpec, DeckSlide } from '@/lib/proposalTypes';

const C = BRAND.colors;
const FONT = BRAND.fontFamily;

// 16:9 canvas in inches (pptxgenjs LAYOUT_WIDE).
const W = 13.333;
const H = 7.5;

/* eslint-disable @typescript-eslint/no-explicit-any */

function footer(slide: any, pptx: any, dark: boolean) {
  slide.addText(
    [
      { text: `${BRAND.wordmark.primary} `, options: { color: dark ? C.gold : C.dark, bold: true } },
      { text: BRAND.wordmark.secondary, options: { color: dark ? C.white : C.muted } },
    ],
    { x: 0.5, y: H - 0.5, w: 6, h: 0.3, fontFace: FONT, fontSize: 9, align: 'left' }
  );
  slide.addText(BRAND.contact.website, {
    x: W - 4.5,
    y: H - 0.5,
    w: 4,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9,
    color: dark ? C.white : C.muted,
    align: 'right',
  });
  void pptx;
}

function accentBar(slide: any, pptx: any, x: number, y: number, w = 1.6) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.08, fill: { color: C.gold }, line: { type: 'none' } });
}

function titleSlide(slide: any, pptx: any, spec: DeckSpec, s: DeckSlide) {
  slide.background = { color: C.dark };
  // Decorative side band.
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: H, fill: { color: C.gold }, line: { type: 'none' } });
  slide.addText(BRAND.company.toUpperCase(), {
    x: 0.9, y: 1.3, w: 11, h: 0.4, fontFace: FONT, fontSize: 13, color: C.gold, charSpacing: 3, bold: true,
  });
  slide.addText(s.heading || spec.title, {
    x: 0.9, y: 2.0, w: 11.5, h: 2.2, fontFace: FONT, fontSize: 40, color: C.white, bold: true, valign: 'top',
  });
  accentBar(slide, pptx, 0.95, 4.15, 2);
  if (s.subheading || spec.subtitle) {
    slide.addText(s.subheading || spec.subtitle || '', {
      x: 0.9, y: 4.4, w: 11, h: 1.2, fontFace: FONT, fontSize: 18, color: C.greenLight, valign: 'top',
    });
  }
  if (spec.client) {
    slide.addText(`Prepared for ${spec.client}`, {
      x: 0.9, y: H - 1.1, w: 8, h: 0.4, fontFace: FONT, fontSize: 12, color: C.white,
    });
  }
}

function headerBlock(slide: any, pptx: any, heading?: string, sub?: string) {
  slide.background = { color: C.white };
  if (heading) {
    slide.addText(heading, {
      x: 0.6, y: 0.55, w: 12, h: 0.8, fontFace: FONT, fontSize: 28, color: C.dark, bold: true,
    });
    accentBar(slide, pptx, 0.65, 1.35, 1.6);
  }
  if (sub) {
    slide.addText(sub, { x: 0.6, y: 1.5, w: 12, h: 0.5, fontFace: FONT, fontSize: 14, color: C.muted });
  }
}

function bulletsSlide(slide: any, pptx: any, s: DeckSlide, numbered = false) {
  headerBlock(slide, pptx, s.heading, s.subheading);
  const items = (s.bullets || []).slice(0, 8);
  const startY = 2.0;
  const rowH = Math.min(0.7, (H - startY - 0.8) / Math.max(items.length, 1));
  items.forEach((b, i) => {
    const y = startY + i * rowH;
    // marker
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 0.7, y: y + rowH / 2 - 0.13, w: 0.26, h: 0.26, fill: { color: numbered ? C.dark : C.gold }, line: { type: 'none' },
    });
    if (numbered) {
      slide.addText(String(i + 1), {
        x: 0.7, y: y + rowH / 2 - 0.16, w: 0.26, h: 0.3, fontFace: FONT, fontSize: 11, color: C.gold, bold: true, align: 'center',
      });
    }
    slide.addText(b, {
      x: 1.15, y, w: 11.5, h: rowH, fontFace: FONT, fontSize: 16, color: C.ink, valign: 'middle',
    });
  });
  footer(slide, pptx, false);
}

function sectionSlide(slide: any, pptx: any, s: DeckSlide) {
  slide.background = { color: C.darkAlt };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: H / 2 - 0.04, w: 1.4, h: 0.08, fill: { color: C.gold }, line: { type: 'none' } });
  slide.addText(s.heading || '', {
    x: 1.6, y: H / 2 - 1.0, w: 10.5, h: 2, fontFace: FONT, fontSize: 34, color: C.white, bold: true, valign: 'middle',
  });
  if (s.subheading) {
    slide.addText(s.subheading, {
      x: 1.63, y: H / 2 + 0.5, w: 10.5, h: 0.8, fontFace: FONT, fontSize: 16, color: C.greenLight,
    });
  }
  footer(slide, pptx, true);
}

function statsSlide(slide: any, pptx: any, s: DeckSlide) {
  headerBlock(slide, pptx, s.heading, s.subheading);
  const stats = (s.stats || []).slice(0, 4);
  const n = Math.max(stats.length, 1);
  const gap = 0.4;
  const cardW = (W - 1.2 - gap * (n - 1)) / n;
  stats.forEach((st, i) => {
    const x = 0.6 + i * (cardW + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.4, w: cardW, h: 2.8, rectRadius: 0.12, fill: { color: C.paper }, line: { color: C.line, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, { x, y: 2.4, w: cardW, h: 0.12, fill: { color: C.gold }, line: { type: 'none' } });
    slide.addText(st.value || '', {
      x, y: 2.9, w: cardW, h: 1.2, fontFace: FONT, fontSize: 40, color: C.dark, bold: true, align: 'center',
    });
    slide.addText(st.label || '', {
      x: x + 0.15, y: 4.15, w: cardW - 0.3, h: 0.9, fontFace: FONT, fontSize: 14, color: C.muted, align: 'center', valign: 'top',
    });
  });
  footer(slide, pptx, false);
}

function twoColumnSlide(slide: any, pptx: any, s: DeckSlide) {
  headerBlock(slide, pptx, s.heading, s.subheading);
  const colW = 5.9;
  const cols: Array<{ items: string[]; x: number; accent: string }> = [
    { items: s.left || [], x: 0.6, accent: C.gold },
    { items: s.right || [], x: 0.6 + colW + 0.6, accent: C.green },
  ];
  cols.forEach((col) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: col.x, y: 2.1, w: colW, h: 4.4, rectRadius: 0.1, fill: { color: C.paper }, line: { color: C.line, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, { x: col.x, y: 2.1, w: 0.12, h: 4.4, fill: { color: col.accent }, line: { type: 'none' } });
    col.items.slice(0, 7).forEach((it, i) => {
      slide.addText(it, {
        x: col.x + 0.35, y: 2.35 + i * 0.58, w: colW - 0.6, h: 0.55, fontFace: FONT, fontSize: 14, color: C.ink, valign: 'middle',
        bullet: { code: '2022', indent: 12 },
      });
    });
  });
  footer(slide, pptx, false);
}

function quoteSlide(slide: any, pptx: any, s: DeckSlide) {
  slide.background = { color: C.dark };
  slide.addText('\u201C', {
    x: 0.7, y: 0.6, w: 2, h: 1.6, fontFace: 'Georgia', fontSize: 120, color: C.gold, bold: true,
  });
  slide.addText(s.quote || '', {
    x: 1.2, y: 2.2, w: 11, h: 3, fontFace: FONT, fontSize: 26, color: C.white, italic: true, valign: 'middle',
  });
  if (s.attribution) {
    slide.addText(`— ${s.attribution}`, {
      x: 1.25, y: 5.4, w: 10, h: 0.6, fontFace: FONT, fontSize: 15, color: C.greenLight,
    });
  }
  footer(slide, pptx, true);
}

function closingSlide(slide: any, pptx: any, s: DeckSlide) {
  slide.background = { color: C.dark };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.35, fill: { color: C.gold }, line: { type: 'none' } });
  slide.addText(s.heading || "Let's build your pipeline", {
    x: 0.8, y: 2.2, w: 11.5, h: 1.4, fontFace: FONT, fontSize: 36, color: C.white, bold: true,
  });
  if (s.subheading) {
    slide.addText(s.subheading, { x: 0.83, y: 3.6, w: 11, h: 0.8, fontFace: FONT, fontSize: 16, color: C.greenLight });
  }
  slide.addText(
    [
      { text: `${BRAND.contact.email}   `, options: { color: C.white } },
      { text: `${BRAND.contact.phone}`, options: { color: C.white } },
    ],
    { x: 0.83, y: 4.8, w: 11, h: 0.4, fontFace: FONT, fontSize: 14 }
  );
  slide.addText(`${BRAND.contact.website}  ·  ${BRAND.contact.linkedin}`, {
    x: 0.83, y: 5.3, w: 11, h: 0.4, fontFace: FONT, fontSize: 12, color: C.gold,
  });
}

function renderSlide(slide: any, pptx: any, spec: DeckSpec, s: DeckSlide) {
  switch (s.layout) {
    case 'title':
      return titleSlide(slide, pptx, spec, s);
    case 'agenda':
      return bulletsSlide(slide, pptx, s, true);
    case 'section':
      return sectionSlide(slide, pptx, s);
    case 'stats':
      return statsSlide(slide, pptx, s);
    case 'twoColumn':
      return twoColumnSlide(slide, pptx, s);
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

/** Build and download a branded .pptx from a DeckSpec. */
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

  slides.forEach((s) => {
    const slide = pptx.addSlide();
    renderSlide(slide, pptx, spec, s);
    if (s.note) slide.addNotes(s.note);
  });

  await pptx.writeFile({ fileName: `${safeName(spec.title)}-trayarunya.pptx` });
}
