/**
 * Central brand kit for Trayarunya Ventures — single source of truth used by the
 * PowerPoint (pptxgenjs) and PDF (jspdf) generators so every exported document
 * matches the website's look and feel.
 *
 * Safe to import on both server and client (no secrets, no fs).
 */

export interface BrandKit {
  company: string;
  wordmark: { primary: string; secondary: string };
  tagline: string;
  /** Hex colors WITHOUT the leading '#'. pptxgenjs wants bare hex; jspdf takes rgb. */
  colors: {
    gold: string;
    goldLight: string;
    dark: string;
    darkAlt: string;
    green: string;
    greenLight: string;
    red: string;
    white: string;
    ink: string;
    muted: string;
    paper: string;
    line: string;
  };
  fontFamily: string;
  logoPath: string;
  contact: {
    website: string;
    email: string;
    phone: string;
    linkedin: string;
  };
}

export const BRAND: BrandKit = {
  company: 'Trayarunya Ventures',
  wordmark: { primary: 'Trayarunya', secondary: 'VENTURES' },
  tagline: 'Your B2B growth partner — we turn LinkedIn into high-ticket pipeline.',
  colors: {
    gold: 'FFAF06',
    goldLight: 'FFC046',
    dark: '0E1726',
    darkAlt: '15223A',
    green: '14BB87',
    greenLight: '4DCCA3',
    red: 'D92C4A',
    white: 'FFFFFF',
    ink: '1A2233',
    muted: '6B7686',
    paper: 'F7F9FC',
    line: 'E3E8F0',
  },
  fontFamily: 'Poppins',
  logoPath: '/Trayarunya-ventures-logo-Transparent.png',
  contact: {
    website: 'trayarunyaventures.com',
    email: 'info@trayarunyaventures.com',
    phone: '+1 (971) 512-1701',
    linkedin: 'linkedin.com/company/trayarunya-ventures',
  },
};

/** '#RRGGBB' helper for places that need the hash. */
export const hex = (bare: string): string => `#${bare}`;

/** Convert bare hex to an {r,g,b} tuple (for jspdf setFillColor / setTextColor). */
export function rgb(bare: string): [number, number, number] {
  const v = bare.replace('#', '');
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}
