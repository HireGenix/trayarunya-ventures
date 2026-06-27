'use client';

/**
 * BrowserMock — a lightweight browser-chrome wrapper around a screenshot.
 *
 * Used by the marketing site to show real product screenshots in their
 * relevant sections (Revenue Brain, GTM OS, Studio, Publishing, AI Team,
 * Frontier). Pure CSS — three traffic-light dots, an address bar, and the
 * image rendered with object-fit so it stays sharp on every display.
 */

import { Box, Stack, Typography } from '@mui/material';
import { DAY } from './primitives';

export default function BrowserMock({
  src,
  alt,
  url = 'app.mymarketiq.online',
  accent = DAY.teal,
}: {
  src: string;
  alt: string;
  url?: string;
  accent?: string;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        border: `1px solid ${DAY.line}`,
        background: '#fff',
        boxShadow: `0 36px 80px -32px rgba(12,20,36,0.25), 0 0 60px -30px ${accent}33`,
      }}
    >
      {/* Browser chrome */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{
          px: 1.75, py: 1.25,
          bgcolor: '#F4F6F8',
          borderBottom: `1px solid ${DAY.lineSoft}`,
        }}
      >
        <Stack direction="row" spacing={0.6}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <Box key={c} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: c }} />
          ))}
        </Stack>
        <Box
          sx={{
            ml: 1,
            flex: 1,
            maxWidth: 360,
            height: 22,
            borderRadius: 999,
            border: `1px solid ${DAY.line}`,
            bgcolor: '#fff',
            display: 'flex',
            alignItems: 'center',
            px: 1.25,
            gap: 0.6,
          }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent }} />
          <Typography sx={{ fontSize: 11, color: DAY.faint, fontWeight: 600, letterSpacing: '0.01em' }}>
            {url}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
      </Stack>

      {/* Screenshot */}
      <Box sx={{ position: 'relative', aspectRatio: '16 / 10', bgcolor: '#fff' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          draggable={false}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      </Box>
    </Box>
  );
}
