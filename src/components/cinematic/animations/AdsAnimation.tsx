'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Targeting rings converge on the ideal audience, the winning creative fires,
 * and a conversion / ROAS counter ticks up.
 */
const AdsAnimation = () => {
  const reduce = useReducedMotion();
  const loop = (extra: object = {}) =>
    reduce ? {} : { repeat: Infinity, repeatType: 'loop' as const, ...extra };

  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: 'block' }} role="img" aria-label="Paid amplification">
      {/* targeting rings */}
      {[58, 42, 26].map((r, i) => (
        <motion.circle key={i} cx="110" cy="150" r={r} fill="none"
          stroke={i === 2 ? '#14bb87' : 'rgba(255,175,6,0.45)'} strokeWidth="1.5"
          animate={reduce ? {} : { opacity: [0.3, 1, 0.3], scale: [1, 0.96, 1] }}
          transition={loop({ duration: 2, delay: i * 0.2, ease: 'easeInOut' })}
          style={{ transformOrigin: '110px 150px' }}
        />
      ))}
      {/* bullseye */}
      <circle cx="110" cy="150" r="7" fill="#14bb87" />
      <text x="110" y="225" textAnchor="middle" fontSize="9" fill="rgba(15,23,42,0.5)" fontFamily="inherit">TARGET</text>

      {/* creative card fires toward conversion */}
      <motion.g
        initial={{ x: 0, opacity: 0 }}
        animate={reduce ? { opacity: 1 } : { x: [0, 150], opacity: [0, 1, 1, 0] }}
        transition={loop({ duration: 2, delay: 0.6, ease: 'easeInOut' })}
      >
        <rect x="150" y="128" width="44" height="44" rx="8" fill="rgba(255,175,6,0.18)" stroke="#ffaf06" strokeWidth="1.2" />
        <rect x="158" y="136" width="28" height="14" rx="3" fill="rgba(255,175,6,0.5)" />
        <rect x="158" y="154" width="28" height="4" rx="2" fill="rgba(15,23,42,0.2)" />
        <rect x="158" y="161" width="18" height="4" rx="2" fill="rgba(15,23,42,0.15)" />
      </motion.g>

      {/* conversion panel */}
      <rect x="300" y="96" width="86" height="108" rx="12" fill="rgba(20,187,135,0.08)" stroke="#14bb87" strokeWidth="1.2" />
      <text x="343" y="120" textAnchor="middle" fontSize="9" fill="rgba(15,23,42,0.5)" fontFamily="inherit">CONVERSIONS</text>
      {/* rising bars */}
      {[0, 1, 2, 3].map((b) => (
        <motion.rect key={b} x={312 + b * 18} width="12" rx="2" fill="#14bb87"
          initial={{ height: 0, y: 188 }}
          animate={reduce ? { height: 14 + b * 12, y: 188 - (14 + b * 12) } : { height: [0, 14 + b * 12], y: [188, 188 - (14 + b * 12)] }}
          transition={loop({ duration: 0.7, delay: 1.2 + b * 0.18, repeatDelay: 1.4 })}
        />
      ))}
      <text x="343" y="162" textAnchor="middle" fontSize="13" fontWeight="700" fill="#5fe3bf" fontFamily="inherit">4.2x</text>
      <text x="343" y="176" textAnchor="middle" fontSize="8" fill="rgba(15,23,42,0.5)" fontFamily="inherit">ROAS</text>
    </svg>
  );
};

export default AdsAnimation;
