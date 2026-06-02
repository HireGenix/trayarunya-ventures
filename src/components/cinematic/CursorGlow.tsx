'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Cinematic custom cursor: a soft glowing dot with a trailing ring that grows
 * and brightens over interactive elements. Uses mix-blend-mode so it reads on
 * any background. Auto-disabled on touch / coarse-pointer devices and when the
 * user prefers reduced motion.
 */
export default function CursorGlow() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [down, setDown] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 350, damping: 30, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 350, damping: 30, mass: 0.6 });
  const dotX = useSpring(x, { stiffness: 1000, damping: 50 });
  const dotY = useSpring(y, { stiffness: 1000, damping: 50 });

  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;
    setEnabled(true);

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = e.target as HTMLElement | null;
      const interactive = !!el?.closest('a, button, [role="button"], input, textarea, select, .cursor-hover');
      setHovering(interactive);
    };
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'none';

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* trailing ring */}
      <motion.div
        aria-hidden
        style={{
          translateX: ringX,
          translateY: ringY,
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          mixBlendMode: 'difference',
        }}
      >
        <motion.div
          animate={{
            width: hovering ? 64 : 34,
            height: hovering ? 64 : 34,
            opacity: down ? 0.5 : 1,
          }}
          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
          style={{
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '1.5px solid #fff',
            background: 'transparent',
          }}
        />
      </motion.div>

      {/* core dot */}
      <motion.div
        aria-hidden
        style={{
          translateX: dotX,
          translateY: dotY,
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <motion.div
          animate={{ scale: down ? 0.6 : hovering ? 0.4 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            width: 8,
            height: 8,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#ffaf06,#14bb87)',
            boxShadow: '0 0 14px 3px rgba(255,175,6,0.6)',
          }}
        />
      </motion.div>
    </>
  );
}
