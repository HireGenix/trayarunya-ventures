'use client';

import React, { useRef } from 'react';
import { Box, BoxProps } from '@mui/material';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface TiltCardProps extends Omit<BoxProps, 'component'> {
  children: React.ReactNode;
  /** Max tilt in degrees. Default 10 */
  max?: number;
  /** Add a moving glare highlight */
  glare?: boolean;
}

/**
 * 3D tilt-on-hover card. Tracks the pointer and rotates in perspective with a
 * springy feel, plus an optional moving glare. A high-impact "interactive,
 * premium" signal for service / feature cards.
 */
export default function TiltCard({
  children,
  max = 10,
  glare = true,
  sx,
  ...rest
}: TiltCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx_ = useSpring(px, { stiffness: 200, damping: 20 });
  const sy_ = useSpring(py, { stiffness: 200, damping: 20 });

  const rotateX = useTransform(sy_, [0, 1], [max, -max]);
  const rotateY = useTransform(sx_, [0, 1], [-max, max]);
  const glareX = useTransform(sx_, [0, 1], ['0%', '100%']);
  const glareY = useTransform(sy_, [0, 1], ['0%', '100%']);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  if (reduce) {
    return (
      <Box sx={sx} {...rest}>
        {children}
      </Box>
    );
  }

  return (
    <Box
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      sx={{ perspective: 1000, ...sx }}
      {...rest}
    >
      <Box
        component={motion.div}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18 }}
        sx={{ position: 'relative', height: '100%', borderRadius: 'inherit' }}
      >
        {children}
        {glare && (
          <Box
            component={motion.div}
            aria-hidden
            style={{
              // @ts-expect-error framer motion template literal for CSS var
              '--gx': glareX,
              '--gy': glareY,
            }}
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at var(--gx) var(--gy), rgba(255,255,255,0.16), transparent 42%)',
            }}
          />
        )}
      </Box>
    </Box>
  );
}
