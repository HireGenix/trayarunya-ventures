'use client';

import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface RevealProps extends Omit<BoxProps, 'component'> {
  children: React.ReactNode;
  direction?: Direction;
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

/**
 * Scroll-triggered reveal used across the site for cinematic entrances.
 */
const Reveal = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.8,
  distance = 40,
  once = true,
  amount = 0.25,
  ...rest
}: RevealProps) => {
  const reduce = useReducedMotion();

  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, ...offset(direction, distance) };

  const visible = { opacity: 1, x: 0, y: 0 };

  return (
    <Box
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={{ hidden, visible }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default Reveal;
