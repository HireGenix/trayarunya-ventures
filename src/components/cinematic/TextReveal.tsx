'use client';

import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

interface TextRevealProps extends Omit<BoxProps, 'component'> {
  text: string;
  delay?: number;
  stagger?: number;
  /** 'word' (default) or 'char' granularity */
  by?: 'word' | 'char';
  once?: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Kinetic, cinematic heading reveal. Each word (or char) rises out of a mask
 * with a blur-clear, staggered for a film-title feel. Falls back to a simple
 * fade for reduced motion.
 */
export default function TextReveal({
  text,
  delay = 0,
  stagger = 0.05,
  by = 'word',
  once = true,
  sx,
  ...rest
}: TextRevealProps) {
  const reduce = useReducedMotion();
  const tokens = by === 'char' ? text.split('') : text.split(' ');

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  const item = reduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : {
        hidden: { y: '110%', opacity: 0, filter: 'blur(6px)' },
        visible: {
          y: '0%',
          opacity: 1,
          filter: 'blur(0px)',
          transition: { duration: 0.8, ease: EASE },
        },
      };

  return (
    <Box
      component={motion.span}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.4 }}
      sx={{ display: 'inline', ...sx }}
      {...rest}
    >
      {tokens.map((tok, i) => (
        <Box
          key={i}
          component="span"
          sx={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}
        >
          <Box component={motion.span} variants={item} sx={{ display: 'inline-block' }}>
            {tok}
            {by === 'word' && i < tokens.length - 1 ? '\u00A0' : ''}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
