import { Space_Grotesk } from 'next/font/google';

/** Display font for the marketing site's headline typography. */
export const displayFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

export const DISPLAY = displayFont.style.fontFamily;
