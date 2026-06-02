'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const platforms = [
  { label: 'in', x: 300, y: 70, color: '#0A66C2' },
  { label: 'IG', x: 320, y: 150, color: '#ffaf06' },
  { label: 'X', x: 300, y: 230, color: '#14bb87' },
];

/**
 * A content card publishes to multiple platforms at the optimal time;
 * engagement bars rise on each.
 */
const ContentPostingAnimation = () => {
  const reduce = useReducedMotion();
  const loop = (extra: object = {}) =>
    reduce ? {} : { repeat: Infinity, repeatType: 'loop' as const, ...extra };

  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: 'block' }} role="img" aria-label="Smart multi-platform posting">
      {/* source content card */}
      <rect x="28" y="110" width="92" height="80" rx="10" fill="rgba(15,23,42,0.06)" stroke="rgba(255,175,6,0.4)" strokeWidth="1.2" />
      <rect x="40" y="122" width="68" height="30" rx="6" fill="rgba(255,175,6,0.18)" />
      <rect x="40" y="158" width="68" height="5" rx="2" fill="rgba(15,23,42,0.2)" />
      <rect x="40" y="168" width="44" height="5" rx="2" fill="rgba(15,23,42,0.15)" />
      <text x="74" y="205" textAnchor="middle" fontSize="9" fill="rgba(15,23,42,0.5)" fontFamily="inherit">CONTENT</text>

      {/* clock badge (optimal timing) */}
      <motion.g animate={reduce ? {} : { scale: [1, 1.12, 1] }} transition={loop({ duration: 2 })} style={{ transformOrigin: '180px 150px' }}>
        <circle cx="180" cy="150" r="16" fill="rgba(15,23,42,0.06)" stroke="#ffaf06" strokeWidth="1.2" />
        <line x1="180" y1="150" x2="180" y2="141" stroke="#ffaf06" strokeWidth="1.6" />
        <line x1="180" y1="150" x2="187" y2="150" stroke="#ffaf06" strokeWidth="1.6" />
      </motion.g>

      {platforms.map((p, i) => (
        <g key={i}>
          <line x1="122" y1="150" x2={p.x - 18} y2={p.y} stroke="rgba(15,23,42,0.12)" strokeWidth="1.2" />
          {/* traveling post */}
          <motion.rect width="12" height="9" rx="2" fill={p.color}
            initial={{ x: 120, y: 145, opacity: 0 }}
            animate={reduce ? {} : { x: [120, p.x - 24], y: [145, p.y - 4], opacity: [0, 1, 1, 0] }}
            transition={loop({ duration: 1.8, delay: i * 0.45, ease: 'easeInOut' })}
          />
          {/* platform node */}
          <circle cx={p.x} cy={p.y} r="18" fill="rgba(15,23,42,0.06)" stroke={p.color} strokeWidth="1.5" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={p.color} fontFamily="inherit">{p.label}</text>
          {/* engagement bars */}
          {[0, 1, 2].map((b) => (
            <motion.rect key={b} x={p.x + 24 + b * 9} width="6" rx="2" fill={p.color}
              initial={{ height: 0, y: p.y + 12 }}
              animate={reduce ? { height: 8 + b * 7, y: p.y + 12 - (8 + b * 7) } : { height: [0, 8 + b * 7], y: [p.y + 12, p.y + 12 - (8 + b * 7)] }}
              transition={loop({ duration: 0.6, delay: 1 + i * 0.45 + b * 0.15, repeatDelay: 1.6 })}
            />
          ))}
        </g>
      ))}
    </svg>
  );
};

export default ContentPostingAnimation;
