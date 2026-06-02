'use client';

import React from 'react';
import { Box, Container, Typography, Chip } from '@mui/material';
import Reveal from './Reveal';
import GradientMesh from './GradientMesh';
import AuroraBackground from './AuroraBackground';
import TextReveal from './TextReveal';

interface PageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  accent?: string;
}

/**
 * Shared cinematic hero for inner pages (full-bleed under the fixed header).
 */
const PageHero = ({ eyebrow, title, subtitle, children, accent = '#ffaf06' }: PageHeroProps) => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: 'radial-gradient(120% 120% at 50% 0%, #16161c 0%, #08080a 60%)',
        color: '#fff',
        pt: { xs: 18, md: 24 },
        pb: { xs: 8, md: 10 },
        overflow: 'hidden',
      }}
    >
      <AuroraBackground intensity={0.38} grid />
      <GradientMesh dark />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        {eyebrow && (
          <Reveal direction="down" distance={16}>
            <Chip
              label={eyebrow}
              sx={{
                mb: 3,
                py: 1.6,
                px: 1.5,
                borderRadius: '50px',
                letterSpacing: '0.12em',
                fontWeight: 700,
                fontSize: '0.7rem',
                color: accent,
                background: `${accent}1f`,
                border: `1px solid ${accent}44`,
              }}
            />
          </Reveal>
        )}
        <Reveal delay={0.05} variant="clip">
          <Typography
            variant="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2.4rem', md: '3.8rem' },
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              mb: subtitle ? 3 : 0,
            }}
          >
            {typeof title === 'string' ? <TextReveal text={title} /> : title}
          </Typography>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.1}>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: { xs: '1.05rem', md: '1.3rem' },
                maxWidth: 680,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              {subtitle}
            </Typography>
          </Reveal>
        )}
        {children && (
          <Reveal delay={0.18}>
            <Box sx={{ mt: 4 }}>{children}</Box>
          </Reveal>
        )}
      </Container>
    </Box>
  );
};

export default PageHero;
