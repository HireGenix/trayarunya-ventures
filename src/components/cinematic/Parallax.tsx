'use client';

import React, { useRef } from 'react';
import { Box, BoxProps } from '@mui/material';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface ParallaxProps extends Omit<BoxProps, 'component'> {
  children: React.ReactNode;
  /** Pixels of vertical travel across the viewport. Positive = moves up on scroll. */
  speed?: number;
  /** Optional subtle scale travel, e.g. 0.06 */
  scaleRange?: number;
}

/**
 * Scroll-linked parallax wrapper. Translates (and optionally scales) its child
 * as it passes through the viewport for depth and cinematic motion.
 */
export default function Parallax({
  children,
  speed = 80,
  scaleRange = 0,
  sx,
  ...rest
}: ParallaxProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1 - scaleRange, 1, 1 - scaleRange]);

  return (
    <Box ref={ref} sx={{ position: 'relative', ...sx }} {...rest}>
      <Box
        component={motion.div}
        style={reduce ? undefined : { y, scale: scaleRange ? scale : undefined }}
      >
        {children}
      </Box>
    </Box>
  );
}
