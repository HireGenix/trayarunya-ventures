'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';

interface BrandLogoProps {
  /** 'light' = white text (for dark backgrounds), 'dark' = dark text (for light backgrounds). */
  variant?: 'light' | 'dark';
  /** Mark + wordmark height in px. */
  size?: number;
  /** Hide the "Trayarunya / VENTURES" wordmark, show only the pinwheel mark. */
  markOnly?: boolean;
}

/**
 * Theme-aware Trayarunya Ventures brand lockup.
 * The pinwheel mark is recreated as SVG (always colorful) and the wordmark
 * adapts to the background, so the logo is legible on dark OR light surfaces.
 */
const BrandLogo = ({ variant = 'light', size = 40, markOnly = false }: BrandLogoProps) => {
  const textColor = variant === 'light' ? '#ffffff' : '#0a0a0a';
  const subColor = variant === 'light' ? 'rgba(255,255,255,0.65)' : 'rgba(10,10,10,0.6)';
  const lineColor = variant === 'light' ? 'rgba(255,255,255,0.35)' : 'rgba(10,10,10,0.3)';

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.2 }}>
      {/* Pinwheel mark */}
      <Box
        component="svg"
        viewBox="0 0 100 100"
        sx={{ width: size, height: size, flexShrink: 0, display: 'block' }}
        aria-hidden="true"
      >
        {[
          { rot: 0, fill: '#ffaf06' },
          { rot: 120, fill: '#e8344e' },
          { rot: 240, fill: '#14bb87' },
        ].map((b) => (
          <path
            key={b.rot}
            d="M50,50 L44,40 L57,11 L69,33 Z"
            fill={b.fill}
            transform={`rotate(${b.rot} 50 50)`}
          />
        ))}
      </Box>

      {/* Wordmark */}
      {!markOnly && (
        <Box sx={{ lineHeight: 1 }}>
          <Typography
            component="span"
            sx={{
              display: 'block',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: textColor,
              fontSize: size * 0.62,
              lineHeight: 1,
            }}
          >
            Trayarunya
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: '2px' }}>
            <Box sx={{ flex: 1, height: '1px', background: lineColor }} />
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                letterSpacing: '0.42em',
                color: subColor,
                fontSize: size * 0.2,
                pl: '0.42em',
              }}
            >
              VENTURES
            </Typography>
            <Box sx={{ flex: 1, height: '1px', background: lineColor }} />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default BrandLogo;
