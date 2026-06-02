'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { useInView } from 'react-intersection-observer';
import { animate, useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps extends Omit<TypographyProps, 'children'> {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

/**
 * Counts up to `value` the first time it scrolls into view.
 */
const AnimatedCounter = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.8,
  ...rest
}: AnimatedCounterProps) => {
  const reduce = useReducedMotion();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 });
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    if (reduce) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return (
    <Typography ref={ref} {...rest}>
      {prefix}
      {display.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </Typography>
  );
};

export default AnimatedCounter;
