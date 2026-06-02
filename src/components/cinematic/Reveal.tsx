'use client';

import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';
type RevealVariant = 'rise' | 'fade' | 'scale' | 'blur' | 'clip';

interface RevealProps extends Omit<BoxProps, 'component'> {
  children: React.ReactNode;
  direction?: Direction;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  amount?: number;
}

const offset = (direction: Direction, distance: number) => {
  switch (direction) {
    case 'up':
      return { y: distance };
    case 'down':
      return { y: -distance };
    case 'left':
      return { x: distance };
    case 'right':
      return { x: -distance };
    default:
      return {};
  }
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Scroll-triggered cinematic reveal. Default `rise` variant combines a soft
 * upward drift with a subtle scale + blur-clear for a richer, more dramatic
 * entrance than a plain fade. Other variants: fade, scale, blur, clip (mask wipe).
 */
const Reveal = ({
  children,
  direction = 'up',
  variant = 'rise',
  delay = 0,
  duration = 0.8,
  distance = 48,
  once = true,
  amount = 0.25,
  ...rest
}: RevealProps) => {
  const reduce = useReducedMotion();

  let variants: Variants;

  if (reduce) {
    variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  } else {
    switch (variant) {
      case 'fade':
        variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
        break;
      case 'scale':
        variants = {
          hidden: { opacity: 0, scale: 0.9, ...offset(direction, distance / 2) },
          visible: { opacity: 1, scale: 1, x: 0, y: 0 },
        };
        break;
      case 'blur':
        variants = {
          hidden: { opacity: 0, filter: 'blur(14px)', ...offset(direction, distance) },
          visible: { opacity: 1, filter: 'blur(0px)', x: 0, y: 0 },
        };
        break;
      case 'clip':
        variants = {
          hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)', y: distance / 2 },
          visible: { opacity: 1, clipPath: 'inset(0 0 0% 0)', y: 0 },
        };
        break;
      case 'rise':
      default:
        variants = {
          hidden: {
            opacity: 0,
            scale: 0.97,
            filter: 'blur(8px)',
            ...offset(direction, distance),
          },
          visible: { opacity: 1, scale: 1, filter: 'blur(0px)', x: 0, y: 0 },
        };
        break;
    }
  }

  return (
    <Box
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default Reveal;
