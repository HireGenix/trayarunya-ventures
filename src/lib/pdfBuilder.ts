/**
 * Client-side PDF proposal generator using jsPDF.
 * Renders a Gamma-style, design-led Trayarunya Ventures proposal from a
 * ProposalSpec: bold cover with geometric accents, numbered section badges,
 * card-styled blocks, an accent timeline and premium pricing cards.
 *
 * Import dynamically from a client component:
 *   const { buildProposalPdf } = await import('@/lib/pdfBuilder');
 */
import { BRAND, rgb } from '@/lib/brandKit';
import { lightenHex } from '@/lib/brandColors';
import type { ProposalSpec, BrandTheme } from '@/lib/proposalTypes';
import { pickIcon, ICONS, type IconDef } from '@/lib/deckIcons';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Brand accents are reassigned per-build when the client's colors are scraped.
let GOLD = rgb(BRAND.colors.gold);
let GOLD_L = rgb(BRAND.colors.goldLight);
const DARK = rgb(BRAND.colors.dark);
const DARK_ALT = rgb(BRAND.colors.darkAlt);
let GREEN = rgb(BRAND.colors.green);
const INK = rgb(BRAND.colors.ink);
const MUTED = rgb(BRAND.colors.muted);
const LINE = rgb(BRAND.colors.line);
const PAPER = rgb(BRAND.colors.paper);
const WHITE: [number, number, number] = [255, 255, 255];

/** Apply scraped client brand colors to the accent palette for one build. */
function applyBrand(brand?: BrandTheme) {
  GOLD = rgb(BRAND.colors.gold);
  GOLD_L = rgb(BRAND.colors.goldLight);
  GREEN = rgb(BRAND.colors.green);
  if (brand?.primary) {
    GOLD = rgb(brand.primary);
    GOLD_L = rgb(lightenHex(brand.primary, 0.32));
  }
  if (brand?.accent) {
    GREEN = rgb(brand.accent);
  }
}

function resetBrand() {
  GOLD = rgb(BRAND.colors.gold);
  GOLD_L = rgb(BRAND.colors.goldLight);
  GREEN = rgb(BRAND.colors.green);
}

/** Mix a color toward white to get a soft background tint. */
function tint(c: [number, number, number], amt = 0.86): [number, number, number] {
  return [
    Math.round(c[0] + (255 - c[0]) * amt),
    Math.round(c[1] + (255 - c[1]) * amt),
    Math.round(c[2] + (255 - c[2]) * amt),
  ];
}

function safeName(s: string): string {
  return (s || 'proposal').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'proposal';
}

/** Build and download a Gamma-style branded PDF proposal from a ProposalSpec. */
export async function buildProposalPdf(spec: ProposalSpec): Promise<void> {
  applyBrand(spec.brand);
  try {
  const mod = await import('jspdf');
  const JsPDF = (mod as unknown as { jsPDF: new (o?: any) => any }).jsPDF;
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  /** Render a normalized vector icon at (x,y) within a size box. */
  const drawIcon = (icon: IconDef, x: number, y: number, size: number, color: [number, number, number], strokeW = 1.3) => {
    const px = (v: number) => x + v * size;
    const py = (v: number) => y + v * size;
    setDraw(color);
    setFill(color);
    doc.setLineWidth(strokeW);
    doc.setLineCap('round');
    doc.setLineJoin('round');
    for (const p of icon) {
      if (p.k === 'circle') doc.circle(px(p.cx), py(p.cy), p.r * size, 'S');
      else if (p.k === 'dot') doc.circle(px(p.cx), py(p.cy), p.r * size, 'F');
      else if (p.k === 'line') doc.line(px(p.x1), py(p.y1), px(p.x2), py(p.y2));
      else if (p.k === 'rrect') doc.roundedRect(px(p.x), py(p.y), p.w * size, p.h * size, p.r * size, p.r * size, 'S');
      else if (p.k === 'poly') {
        for (let i = 0; i < p.pts.length - 1; i++) {
          doc.line(px(p.pts[i][0]), py(p.pts[i][1]), px(p.pts[i + 1][0]), py(p.pts[i + 1][1]));
        }
        if (p.close && p.pts.length > 2) {
          const a = p.pts[p.pts.length - 1];
          const b = p.pts[0];
          doc.line(px(a[0]), py(a[1]), px(b[0]), py(b[1]));
        }
      }
    }
    doc.setLineCap('butt');
    doc.setLineJoin('miter');
  };

  /** Soft tinted rounded square with a line icon — the Gamma card glyph. */
  const iconChip = (icon: IconDef, x: number, y: number, box: number, accent: [number, number, number], tint: [number, number, number]) => {
    setFill(tint);
    doc.roundedRect(x, y, box, box, box * 0.26, box * 0.26, 'F');
    const pad = box * 0.24;
    drawIcon(icon, x + pad, y + pad, box - pad * 2, accent, Math.max(1, box * 0.07));
  };

  let pageNum = 0;

  const addFooter = () => {
    pageNum += 1;
    setDraw(LINE);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    setFill(GOLD);
    doc.circle(margin + 3, pageH - 24, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(INK);
    doc.text(BRAND.company, margin + 12, pageH - 21);
    doc.setFont('helvetica', 'normal');
    setText(MUTED);
    doc.text(BRAND.contact.website, pageW / 2, pageH - 21, { align: 'center' });
    doc.text(`${pageNum}`, pageW - margin, pageH - 21, { align: 'right' });
  };

  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 56) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  };

  /* ------------------------------- Cover ------------------------------- */
  setFill(DARK);
  doc.rect(0, 0, pageW, pageH, 'F');
  // Decorative geometry.
  setFill(DARK_ALT);
  doc.circle(pageW + 30, 80, 150, 'F');
  setFill(GOLD);
  doc.circle(pageW - 70, pageH - 90, 80, 'F');
  setFill(GREEN);
  doc.circle(pageW - 150, pageH - 40, 36, 'F');
  // Top accent bar.
  setFill(GOLD);
  doc.rect(0, 0, pageW, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setText(GOLD);
  doc.text(BRAND.company.toUpperCase(), margin, 130);

  setFill(GOLD);
  doc.rect(margin, 150, 64, 5, 'F');

  doc.setFontSize(34);
  setText(WHITE);
  const titleLines = doc.splitTextToSize(spec.title || 'Marketing Partnership Proposal', contentW - 40);
  doc.text(titleLines, margin, 210);

  let coverY = 210 + titleLines.length * 38 + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(15);
  setText(rgb(BRAND.colors.greenLight));
  doc.text(`Prepared for ${spec.client || 'your team'}`, margin, coverY);

  coverY += 30;
  doc.setFontSize(11);
  setText([220, 226, 236]);
  doc.text(`Prepared by ${spec.preparedBy || BRAND.company}`, margin, coverY);
  doc.text(
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    margin,
    coverY + 18
  );

  // Cover contact pill row.
  const contactY = pageH - 70;
  doc.setFontSize(9.5);
  setText(WHITE);
  const chips = [BRAND.contact.email, BRAND.contact.phone, BRAND.contact.website];
  let chipX = margin;
  chips.forEach((txt) => {
    const w = doc.getTextWidth(txt) + 24;
    setFill(DARK_ALT);
    doc.roundedRect(chipX, contactY - 13, w, 22, 11, 11, 'F');
    setText(WHITE);
    doc.text(txt, chipX + 12, contactY + 1.5);
    chipX += w + 10;
  });

  /* -------------------------------- Body ------------------------------- */
  doc.addPage();
  y = margin + 6;

  let sectionIndex = 0;

  const sectionHeading = (text: string, numbered = true) => {
    ensureSpace(54);
    let tx = margin;
    if (numbered) {
      sectionIndex += 1;
      iconChip(pickIcon(text, sectionIndex - 1), margin, y - 16, 30, GOLD, tint(GOLD, 0.84));
      tx = margin + 42;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    setText(DARK);
    doc.text(text, tx, y + 4);
    y += 26;
    setFill(GOLD);
    doc.rect(tx, y - 4, 40, 3, 'F');
    y += 16;
  };

  const paragraph = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    setText(INK);
    const lines = doc.splitTextToSize(text, contentW);
    lines.forEach((ln: string) => {
      ensureSpace(16);
      doc.text(ln, margin, y);
      y += 16;
    });
    y += 8;
  };

  const bullet = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    setText(INK);
    const lines = doc.splitTextToSize(text, contentW - 28);
    ensureSpace(lines.length * 15 + 6);
    drawIcon(ICONS.check, margin, y - 11, 13, GREEN, 1.1);
    lines.forEach((ln: string, i: number) => {
      doc.text(ln, margin + 22, y);
      if (i < lines.length - 1) y += 15;
    });
    y += 17;
  };

  /* Intro — premium callout card. */
  if (spec.intro) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    const introLines = doc.splitTextToSize(spec.intro, contentW - 44);
    const boxH = introLines.length * 17 + 34;
    ensureSpace(boxH + 12);
    setFill(PAPER);
    doc.roundedRect(margin, y - 4, contentW, boxH, 10, 10, 'F');
    setFill(GOLD);
    doc.roundedRect(margin, y - 4, 6, boxH, 3, 3, 'F');
    setText(INK);
    let iy = y + 22;
    introLines.forEach((ln: string) => {
      doc.text(ln, margin + 22, iy);
      iy += 17;
    });
    y += boxH + 22;
  }

  /* Sections. */
  (spec.sections || []).forEach((sec) => {
    sectionHeading(sec.heading || 'Section');
    if (sec.body) paragraph(sec.body);
    (sec.bullets || []).forEach((b) => bullet(b));
    y += 6;
  });

  /* Timeline — accent cards with connector. */
  if (spec.timeline && spec.timeline.length) {
    sectionHeading('Engagement Timeline');
    const accents: [number, number, number][] = [GOLD, GREEN, GOLD_L, DARK_ALT];
    spec.timeline.forEach((t, i) => {
      const ac = accents[i % accents.length];
      const detailLines = doc.splitTextToSize(t.detail || '', contentW - 70);
      const cardH = Math.max(46, detailLines.length * 14 + 34);
      ensureSpace(cardH + 10);
      setFill(PAPER);
      doc.roundedRect(margin, y - 6, contentW, cardH, 8, 8, 'F');
      setFill(ac);
      doc.roundedRect(margin, y - 6, 6, cardH, 3, 3, 'F');
      // phase number circle with icon
      setFill(ac);
      doc.circle(margin + 32, y + cardH / 2 - 6, 13, 'F');
      drawIcon(pickIcon(`${t.phase} ${t.detail || ''}`, i), margin + 32 - 7.5, y + cardH / 2 - 6 - 7.5, 15, WHITE, 1.1);
      // phase title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      setText(DARK);
      doc.text(t.phase || `Phase ${i + 1}`, margin + 56, y + 14);
      // detail
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      setText(MUTED);
      let ty = y + 30;
      detailLines.forEach((ln: string) => {
        doc.text(ln, margin + 56, ty);
        ty += 14;
      });
      y += cardH + 12;
    });
    y += 4;
  }

  /* Pricing — premium cards. */
  if (spec.pricing && spec.pricing.length) {
    sectionHeading('Investment');
    spec.pricing.forEach((p, i) => {
      const accent = i === spec.pricing!.length - 1 ? GREEN : GOLD;
      const detailLines = doc.splitTextToSize(p.detail || '', contentW * 0.46);
      const cardH = Math.max(58, detailLines.length * 13 + 44);
      ensureSpace(cardH + 10);
      // card
      setFill(WHITE);
      setDraw(LINE);
      doc.setLineWidth(1);
      doc.roundedRect(margin, y - 6, contentW, cardH, 10, 10, 'FD');
      setFill(accent);
      doc.roundedRect(margin, y - 6, contentW, 6, 3, 3, 'F');
      // accent icon chip
      iconChip(pickIcon(`${p.item} ${p.detail || ''}`, i), margin + 16, y + 8, 30, accent, tint(accent, 0.84));
      // package name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      setText(DARK);
      doc.text(doc.splitTextToSize(p.item || '', contentW * 0.4), margin + 56, y + 20);
      // detail
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      setText(MUTED);
      let dy = y + 38;
      detailLines.forEach((ln: string) => {
        doc.text(ln, margin + 56, dy);
        dy += 13;
      });
      // price pill
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      const priceTxt = p.price || '';
      const pw = doc.getTextWidth(priceTxt) + 28;
      setFill(accent);
      doc.roundedRect(pageW - margin - pw - 14, y + 8, pw, 30, 15, 15, 'F');
      setText(accent === GREEN ? WHITE : DARK);
      doc.text(priceTxt, pageW - margin - 14 - pw / 2, y + 27, { align: 'center' });
      y += cardH + 12;
    });
    y += 6;
  }

  /* CTA — bold gold banner. */
  if (spec.cta) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const ctaLines = doc.splitTextToSize(spec.cta, contentW - 48);
    const boxH = ctaLines.length * 19 + 40;
    ensureSpace(boxH + 12);
    setFill(DARK);
    doc.roundedRect(margin, y, contentW, boxH, 12, 12, 'F');
    setFill(GOLD);
    doc.circle(margin + contentW - 34, y + 26, 42, 'F');
    setFill(GOLD);
    doc.rect(margin, y, 8, boxH, 'F');
    setText(WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setText(GOLD);
    doc.text('NEXT STEP', margin + 24, y + 26);
    doc.setFontSize(14);
    setText(WHITE);
    let cy = y + 48;
    ctaLines.forEach((ln: string) => {
      doc.text(ln, margin + 24, cy);
      cy += 19;
    });
    y += boxH + 14;
  }

  addFooter();
  doc.save(`${safeName(spec.title || spec.client)}-trayarunya.pdf`);
  } finally {
    resetBrand();
  }
}
