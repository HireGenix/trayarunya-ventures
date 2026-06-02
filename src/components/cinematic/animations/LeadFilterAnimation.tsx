'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const raw = Array.from({ length: 9 });

/**
 * Many raw leads fall in from the top, pass through AI filter bars,
 * only a few qualified (green) leads drop into the "Qualified" tray.
 */
const LeadFilterAnimation = () => {
  const reduce = useReducedMotion();
  const loop = (extra: object = {}) =>
    reduce ? {} : { repeat: Infinity, repeatType: 'loop' as const, ...extra };

  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: 'block' }} role="img" aria-label="Lead filtering funnel">
      {/* funnel walls */}
      <path d="M70 60 L330 60 L250 180 L150 180 Z" fill="rgba(255,175,6,0.05)" stroke="rgba(255,175,6,0.3)" strokeWidth="1.5" />
      {/* filter bars */}
      {[100, 135].map((y, i) => (
        <line key={i} x1={92 + i * 22} y1={y} x2={308 - i * 22} y2={y} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 5" strokeWidth="2" />
      ))}
      <text x="200" y="48" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.5)" fontFamily="inherit">RAW AUDIENCE</text>

      {/* raw leads falling */}
      {raw.map((_, i) => {
        const startX = 90 + (i % 9) * 26;
        const qualified = i % 3 === 0;
        return (
          <motion.circle
            key={i}
            r="5"
            fill={qualified ? '#14bb87' : 'rgba(255,255,255,0.35)'}
            initial={{ cx: startX, cy: 65, opacity: 0 }}
            animate={
              reduce
                ? {}
                : qualified
                ? { cx: [startX, 200], cy: [65, 180, 235], opacity: [0, 1, 1, 1] }
                : { cx: [startX, startX], cy: [65, 132], opacity: [0, 1, 0] }
            }
            transition={loop({ duration: qualified ? 2.4 : 1.4, delay: i * 0.22, ease: 'easeIn' })}
          />
        );
      })}

      {/* qualified tray */}
      <rect x="150" y="232" width="100" height="40" rx="10" fill="rgba(20,187,135,0.12)" stroke="#14bb87" strokeWidth="1.5" />
      <text x="200" y="256" textAnchor="middle" fontSize="12" fontWeight="700" fill="#5fe3bf" fontFamily="inherit">QUALIFIED</text>

      {/* sparkle pulse on tray */}
      <motion.rect
        x="150" y="232" width="100" height="40" rx="10" fill="none" stroke="#14bb87" strokeWidth="2"
        animate={reduce ? {} : { opacity: [0, 0.8, 0] }}
        transition={loop({ duration: 2.4, ease: 'easeOut' })}
      />
    </svg>
  );
};

export default LeadFilterAnimation;
