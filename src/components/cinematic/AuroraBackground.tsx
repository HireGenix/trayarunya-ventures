'use client';

import React from 'react';
import { Box } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

interface AuroraBackgroundProps {
  /** Lower = more subtle. Default 0.5 */
  intensity?: number;
  /** Show a faint moving grid overlay */
  grid?: boolean;
  /** Colour scheme of the grid lines / overlay. Light = for light surfaces. */
  variant?: 'dark' | 'light';
}

const blobs = [
  { color: '#ffaf06', size: 520, top: '-10%', left: '-8%', dur: 18, x: [0, 60, -20, 0], y: [0, 40, 80, 0] },
  { color: '#14bb87', size: 460, top: '30%', left: '60%', dur: 22, x: [0, -50, 30, 0], y: [0, 60, -30, 0] },
  { color: '#0A66C2', size: 420, top: '60%', left: '10%', dur: 26, x: [0, 40, -40, 0], y: [0, -40, 30, 0] },
];

/**
 * Ambient, always-moving aurora background for dark sections. Soft gradient
 * blobs drift slowly behind content + an optional faint grid. Purely
 * decorative; frozen when the user prefers reduced motion.
 */
export default function AuroraBackground({ intensity = 0.5, grid = false, variant = 'dark' }: AuroraBackgroundProps) {
  const reduce = useReducedMotion();
  const gridLine = variant === 'light' ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.04)';

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {blobs.map((b, i) => (
        <Box
          key={i}
          component={motion.div}
          animate={reduce ? {} : { x: b.x, y: b.y }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
          sx={{
            position: 'absolute',
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            background: `radial-gradient(circle at center, ${b.color}, transparent 68%)`,
            filter: 'blur(60px)',
            opacity: intensity,
          }}
        />
      ))}

      {grid && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              `linear-gradient(${gridLine} 1px, transparent 1px), linear-gradient(90deg, ${gridLine} 1px, transparent 1px)`,
            backgroundSize: '54px 54px',
            maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
          }}
        />
      )}
    </Box>
  );
}
