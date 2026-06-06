'use client';

import { Box, Typography } from '@mui/material';
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

/** Full logo lockup: pinwheel mark + "MarketiQ" wordmark with an AI accent. */
export function Logo({
  size = 30,
  href = '/',
  light = false,
}: {
  size?: number;
  href?: string | null;
  light?: boolean;
}) {
  const ink = light ? '#FFFFFF' : '#0E1116';
  const content = (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.1, textDecoration: 'none' }}>
      <BrandMark size={size * 1.18} />
      <Box sx={{ display: 'inline-flex', alignItems: 'flex-start' }}>
        <Typography
          component="span"
          sx={{
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: ink,
          }}
        >
          Market
          <Box
            component="span"
            sx={{
              background: 'linear-gradient(135deg,#FFAF06 0%,#14BB87 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            iQ
          </Box>
        </Typography>
        <Typography
          component="span"
          sx={{
            ml: 0.5,
            mt: '0.1em',
            fontWeight: 800,
            fontSize: size * 0.42,
            letterSpacing: '0.04em',
            color: '#14BB87',
          }}
        >
          AI
        </Typography>
      </Box>
    </Box>
  );

  if (!href) return content;
  return (
    <Box component={Link} href={href} sx={{ textDecoration: 'none' }}>
      {content}
    </Box>
  );
}
