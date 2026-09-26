'use client';

import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Thin gradient progress bar fixed to the top of the viewport, tied to overall
 * page scroll. A small but premium cinematic signal.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{
        scaleX,
        transformOrigin: '0%',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 2000,
        background: 'linear-gradient(90deg,#ff9f1c,#ff4d8d,#7c5cff,#14bb87)',
        boxShadow: '0 0 12px rgba(255,77,141,0.5)',
      }}
    />
  );
}
