'use client';

import React from 'react';
import { Box } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

interface GradientMeshProps {
  /** When true, tuned for dark backgrounds (brighter, more saturated orbs). */
  dark?: boolean;
  /** Opacity multiplier for the whole mesh. */
  intensity?: number;
  /** Show the subtle dotted grid overlay. */
  grid?: boolean;
}

/**
 * Animated cinematic background: slowly drifting gold/green gradient orbs
 * plus an optional dotted grid. Purely decorative, pointer-events disabled.
 */
const GradientMesh = ({ dark = true, intensity = 1, grid = true }: GradientMeshProps) => {
  const reduce = useReducedMotion();

  const orb = (
    color: string,
    size: number,
    top: string,
    left: string,
    delay: number,
  ) => (
    <Box
      component={motion.div}
      aria-hidden
      initial={{ opacity: 0, scale: 0.85 }}
      animate={
        reduce
          ? { opacity: 0.35 * intensity }
          : {
              opacity: [0.25 * intensity, 0.5 * intensity, 0.25 * intensity],
              scale: [0.85, 1.1, 0.85],
              x: [0, 30, 0],
              y: [0, -25, 0],
            }
      }
      transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay }}
      sx={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 70%)`,
        filter: 'blur(60px)',
      }}
    />
  );

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
      {orb('#ffaf06', 420, '-8%', '-6%', 0)}
      {orb('#14bb87', 460, '55%', '70%', 2)}
      {orb(dark ? '#ffc046' : '#ffaf06', 320, '30%', '40%', 4)}
      {grid && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: dark ? 0.06 : 0.04,
            backgroundImage: `radial-gradient(circle, ${
              dark ? '#ffffff' : '#000000'
            } 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      )}
    </Box>
  );
};

export default GradientMesh;
