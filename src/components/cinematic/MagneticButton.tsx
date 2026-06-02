'use client';

import React, { useRef } from 'react';
import { Box } from '@mui/material';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

interface MagneticProps {
  children: React.ReactNode;
  /** Pull strength 0..1. Default 0.35 */
  strength?: number;
  className?: string;
}

/**
 * Magnetic wrapper: the child is gently pulled toward the cursor while hovered,
 * springing back on leave. Wrap CTAs / icons for a tactile, premium feel.
 * No-op on reduced motion.
 */
export default function MagneticButton({ children, strength = 0.35, className }: MagneticProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 15, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 250, damping: 15, mass: 0.3 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  if (reduce) return <>{children}</>;

  return (
    <Box
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={className}
      sx={{ display: 'inline-flex' }}
    >
      <Box component={motion.div} style={{ x: sx, y: sy }} sx={{ display: 'inline-flex' }}>
        {children}
      </Box>
    </Box>
  );
}
