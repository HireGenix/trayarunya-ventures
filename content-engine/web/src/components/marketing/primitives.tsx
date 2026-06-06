'use client';

import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export const MotionBox = motion.create(Box);

export function Reveal({
  children,
  delay = 0,
  y = 26,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
}) {
  return (
    <MotionBox
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionBox>
  );
}

export function GradientText({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        background: 'linear-gradient(100deg,#FFAF06 0%,#FF7A59 45%,#14BB87 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {children}
    </Box>
  );
}

export function Eyebrow({ children, color = '#0FA874' }: { children: ReactNode; color?: string }) {
  return (
    <Typography
      sx={{
        fontWeight: 800,
        fontSize: 12.5,
        letterSpacing: '0.14em',
        color,
        mb: 1.5,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  eyebrowColor,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  eyebrowColor?: string;
}) {
  return (
    <Box sx={{ textAlign: align, maxWidth: align === 'center' ? 760 : 640, mx: align === 'center' ? 'auto' : 0, mb: { xs: 5, md: 7 } }}>
      {eyebrow && <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>}
      <Typography
        variant="h2"
        sx={{
          fontWeight: 800,
          fontSize: { xs: '1.85rem', md: '2.5rem' },
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          color: '#0E1116',
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          sx={{
            mt: 2,
            fontSize: { xs: '1rem', md: '1.12rem' },
            lineHeight: 1.65,
            color: '#5A6472',
            maxWidth: 680,
            mx: align === 'center' ? 'auto' : 0,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
