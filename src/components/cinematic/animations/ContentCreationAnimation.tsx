'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * An idea spark feeds the AI core, which assembles a finished content card
 * (headline lines + image block drawing in).
 */
const ContentCreationAnimation = () => {
  const reduce = useReducedMotion();
  const loop = (extra: object = {}) =>
    reduce ? {} : { repeat: Infinity, repeatType: 'loop' as const, ...extra };

  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: 'block' }} role="img" aria-label="AI content creation">
      {/* idea spark */}
      <g>
        <motion.path
          d="M55 150 l8 -18 l-4 14 l16 -4 l-14 8 l14 8 l-16 -4 l4 14 z"
          fill="#ffaf06"
          animate={reduce ? {} : { rotate: [0, 360], scale: [1, 1.15, 1] }}
          transition={loop({ duration: 4, ease: 'linear' })}
          style={{ transformOrigin: '60px 150px' }}
        />
        <text x="60" y="195" textAnchor="middle" fontSize="10" fill="rgba(15,23,42,0.5)" fontFamily="inherit">IDEA</text>
      </g>

      {/* connector */}
      <line x1="80" y1="150" x2="140" y2="150" stroke="rgba(255,175,6,0.3)" strokeWidth="1.5" strokeDasharray="3 4" />
      <motion.circle r="3.5" fill="#ffaf06"
        animate={reduce ? {} : { cx: [80, 140], opacity: [0, 1, 0] }}
        initial={{ cx: 80, cy: 150 }}
        transition={loop({ duration: 1.3, ease: 'easeIn' })}
      />

      {/* AI core */}
      <motion.circle cx="170" cy="150" r="26" fill="rgba(255,175,6,0.12)" stroke="#ffaf06" strokeWidth="1.5"
        animate={reduce ? {} : { scale: [1, 1.06, 1] }}
        transition={loop({ duration: 2, ease: 'easeInOut' })}
        style={{ transformOrigin: '170px 150px' }}
      />
      <text x="170" y="154" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffd874" fontFamily="inherit">AI</text>

      {/* connector to card */}
      <line x1="196" y1="150" x2="240" y2="150" stroke="rgba(20,187,135,0.3)" strokeWidth="1.5" strokeDasharray="3 4" />

      {/* content card assembling */}
      <rect x="244" y="78" width="130" height="144" rx="12" fill="rgba(15,23,42,0.04)" stroke="rgba(15,23,42,0.15)" strokeWidth="1.2" />
      {/* image block */}
      <motion.rect x="258" y="92" width="102" height="50" rx="8" fill="rgba(20,187,135,0.18)" stroke="#14bb87" strokeWidth="1"
        animate={reduce ? {} : { opacity: [0, 1] }}
        transition={loop({ duration: 0.5, delay: 0.6, repeatDelay: 2.5 })}
      />
      {/* headline lines */}
      {[156, 172, 188, 204].map((y, i) => (
        <motion.rect key={i} x="258" y={y} height="6" rx="3"
          fill={i === 0 ? '#ffaf06' : 'rgba(15,23,42,0.2)'}
          initial={{ width: 0 }}
          animate={reduce ? { width: i === 3 ? 60 : 102 } : { width: [0, i === 3 ? 60 : 102] }}
          transition={loop({ duration: 0.5, delay: 0.9 + i * 0.25, repeatDelay: 2.5 - i * 0.25 })}
        />
      ))}
    </svg>
  );
};

export default ContentCreationAnimation;
