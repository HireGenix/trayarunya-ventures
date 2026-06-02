'use client';

import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import Reveal from './Reveal';
import TextReveal from './TextReveal';

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'center' | 'left';
  dark?: boolean;
  maxWidth?: number;
}

/**
 * Shared eyebrow + title + subtitle block used at the top of sections.
 */
const SectionHeading = ({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  dark = false,
  maxWidth = 720,
}: SectionHeadingProps) => {
  const isCenter = align === 'center';
  return (
    <Box
      sx={{
        textAlign: align,
        mb: { xs: 6, md: 8 },
        ...(isCenter ? { mx: 'auto' } : {}),
        maxWidth,
      }}
    >
      {eyebrow && (
        <Reveal direction="down" distance={16}>
          <Chip
            label={eyebrow}
            sx={{
              mb: 2.5,
              py: 1.6,
              px: 1.5,
              borderRadius: '50px',
              letterSpacing: '0.12em',
              fontWeight: 700,
              fontSize: '0.7rem',
              color: dark ? '#ffaf06' : '#0a0a0a',
              background: dark
                ? 'rgba(255, 175, 6, 0.12)'
                : 'linear-gradient(90deg, #ffaf06, #14bb87)',
              border: dark ? '1px solid rgba(255,175,6,0.3)' : 'none',
            }}
          />
        </Reveal>
      )}
      <Reveal delay={0.05} variant="clip">
        <Typography
          variant="h2"
          component="h2"
          sx={{
            fontWeight: 800,
            mb: subtitle ? 2.5 : 0,
            fontSize: { xs: '2.1rem', sm: '2.6rem', md: '3.2rem' },
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: dark ? '#ffffff' : '#0a0a0a',
          }}
        >
          {typeof title === 'string' ? <TextReveal text={title} /> : title}
        </Typography>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.1}>
          <Typography
            variant="h6"
            component="p"
            sx={{
              fontWeight: 400,
              maxWidth,
              ...(isCenter ? { mx: 'auto' } : {}),
              color: dark ? 'rgba(255,255,255,0.72)' : 'text.secondary',
              fontSize: { xs: '1rem', md: '1.2rem' },
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </Typography>
        </Reveal>
      )}
    </Box>
  );
};

export default SectionHeading;
