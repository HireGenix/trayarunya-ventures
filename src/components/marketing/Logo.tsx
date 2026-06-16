'use client';

import { Box } from '@mui/material';
import Link from 'next/link';

/** The brand pinwheel mark — three swept blades (amber, teal, pink),
 *  derived from the Trayarunya Ventures logo. */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      sx={{ width: size, height: size, display: 'block' }}
      aria-hidden
    >
      <path d="M32 32 L23 20 L38 8 L42 25 Z" fill="#FFAF06" />
      <path d="M32 32 L23 20 L38 8 L42 25 Z" fill="#14BB87" transform="rotate(120 32 32)" />
      <path d="M32 32 L23 20 L38 8 L42 25 Z" fill="#D92C4A" transform="rotate(240 32 32)" />
    </Box>
  );
}

/** Full logo lockup: official MarketiQ AI logo image.
 *  Uses the colored logo on light backgrounds and the white logo when `light` is set. */
export function Logo({
  size = 30,
  href = '/',
  light = false,
}: {
  size?: number;
  href?: string | null;
  light?: boolean;
}) {
  const src = light ? '/brand/marketiq-logo-white.png' : '/brand/marketiq-logo.png';
  const content = (
    <Box
      component="img"
      src={src}
      alt="MarketiQ AI"
      sx={{ height: size * 1.6, width: 'auto', display: 'block' }}
    />
  );

  if (!href) return content;
  return (
    <Box component={Link} href={href} sx={{ textDecoration: 'none', display: 'inline-flex' }}>
      {content}
    </Box>
  );
}
