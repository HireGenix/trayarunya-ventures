/**
 * Client-side PDF proposal generator using jsPDF.
 * Renders a branded Trayarunya Ventures proposal from a ProposalSpec.
 * Import dynamically from a client component:
 *   const { buildProposalPdf } = await import('@/lib/pdfBuilder');
 */
import { BRAND, rgb } from '@/lib/brandKit';
import type { ProposalSpec } from '@/lib/proposalTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */

const GOLD = rgb(BRAND.colors.gold);
const DARK = rgb(BRAND.colors.dark);
const GREEN = rgb(BRAND.colors.green);
const INK = rgb(BRAND.colors.ink);
const MUTED = rgb(BRAND.colors.muted);
const LINE = rgb(BRAND.colors.line);
const PAPER = rgb(BRAND.colors.paper);

function safeName(s: string): string {
  return (s || 'proposal').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'proposal';
}

/** Build and download a branded PDF proposal from a ProposalSpec. */
export async function buildProposalPdf(spec: ProposalSpec): Promise<void> {
  const mod = await import('jspdf');
  const JsPDF = (mod as unknown as { jsPDF: new (o?: any) => any }).jsPDF;
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  let pageNum = 0;

  const addFooter = () => {
    pageNum += 1;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`${BRAND.company} · ${BRAND.contact.website}`, margin, pageH - 22);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 22, { align: 'right' });
  };

  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 56) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  };

  // ---- Cover page ----
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, 0, pageW, 8, 'F');
  doc.rect(margin, 150, 70, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.text(BRAND.company.toUpperCase(), margin, 120);

  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(spec.title || 'Marketing Partnership Proposal', contentW);
  doc.text(titleLines, margin, 200);

  let coverY = 200 + titleLines.length * 34 + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.text(`Prepared for ${spec.client || 'your team'}`, margin, coverY);

  coverY += 26;
  doc.setFontSize(11);
  doc.setTextColor(220, 226, 236);
  doc.text(`Prepared by ${spec.preparedBy || BRAND.company}`, margin, coverY);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), margin, coverY + 18);

  // Cover contact block
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setFontSize(10);
  doc.text(
    `${BRAND.contact.email}   ·   ${BRAND.contact.phone}   ·   ${BRAND.contact.website}`,
    margin,
    pageH - 60
  );

  // ---- Body ----
  doc.addPage();
  y = margin;

  const heading = (text: string) => {
    ensureSpace(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text(text, margin, y);
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.rect(margin, y + 6, 36, 3, 'F');
    y += 28;
  };

  const paragraph = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    const lines = doc.splitTextToSize(text, contentW);
    lines.forEach((ln: string) => {
      ensureSpace(16);
      doc.text(ln, margin, y);
      y += 16;
    });
    y += 6;
  };

  const bullet = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize?.(11);
    doc.setFontSize(11);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    const lines = doc.splitTextToSize(text, contentW - 18);
    ensureSpace(lines.length * 15 + 2);
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.circle(margin + 3, y - 3.5, 2.2, 'F');
    lines.forEach((ln: string, i: number) => {
      doc.text(ln, margin + 16, y);
      if (i < lines.length - 1) y += 15;
    });
    y += 16;
  };

  // Intro
  if (spec.intro) {
    doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
    const introLines = doc.splitTextToSize(spec.intro, contentW - 28);
    const boxH = introLines.length * 15 + 28;
    ensureSpace(boxH + 10);
    doc.roundedRect(margin, y - 4, contentW, boxH, 6, 6, 'F');
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.rect(margin, y - 4, 4, boxH, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    let iy = y + 16;
    introLines.forEach((ln: string) => {
      doc.text(ln, margin + 16, iy);
      iy += 15;
    });
    y += boxH + 16;
  }

  // Sections
  (spec.sections || []).forEach((sec) => {
    heading(sec.heading || 'Section');
    if (sec.body) paragraph(sec.body);
    (sec.bullets || []).forEach((b) => bullet(b));
    y += 4;
  });

  // Timeline
  if (spec.timeline && spec.timeline.length) {
    heading('Engagement Timeline');
    spec.timeline.forEach((t) => {
      ensureSpace(40);
      doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.circle(margin + 3, y - 3.5, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text(t.phase || '', margin + 16, y);
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      const lines = doc.splitTextToSize(t.detail || '', contentW - 18);
      lines.forEach((ln: string) => {
        ensureSpace(14);
        doc.text(ln, margin + 16, y);
        y += 14;
      });
      y += 8;
    });
  }

  // Pricing table
  if (spec.pricing && spec.pricing.length) {
    heading('Investment');
    const rowH = 30;
    // header row
    ensureSpace(rowH + 8);
    doc.setFillColor(DARK[0], DARK[1], DARK[2]);
    doc.rect(margin, y - 14, contentW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('PACKAGE', margin + 12, y + 4);
    doc.text('INCLUDES', margin + contentW * 0.34, y + 4);
    doc.text('INVESTMENT', pageW - margin - 12, y + 4, { align: 'right' });
    y += rowH + 2;

    spec.pricing.forEach((p, i) => {
      const detailLines = doc.splitTextToSize(p.detail || '', contentW * 0.42);
      const thisH = Math.max(rowH, detailLines.length * 13 + 14);
      ensureSpace(thisH + 4);
      if (i % 2 === 0) {
        doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
        doc.rect(margin, y - 14, contentW, thisH, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(doc.splitTextToSize(p.item || '', contentW * 0.3), margin + 12, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text(detailLines, margin + contentW * 0.34, y + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.text(p.price || '', pageW - margin - 12, y + 2, { align: 'right' });
      y += thisH;
    });
    y += 16;
  }

  // CTA
  if (spec.cta) {
    ensureSpace(80);
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    const ctaLines = doc.splitTextToSize(spec.cta, contentW - 32);
    const boxH = ctaLines.length * 16 + 30;
    doc.roundedRect(margin, y, contentW, boxH, 8, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    let cy = y + 24;
    ctaLines.forEach((ln: string) => {
      doc.text(ln, margin + 16, cy);
      cy += 16;
    });
    y += boxH + 12;
  }

  addFooter();
  doc.save(`${safeName(spec.title || spec.client)}-trayarunya.pdf`);
}
