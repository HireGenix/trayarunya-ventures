'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const recipients = [70, 130, 190, 250];

/**
 * A sender fires personalized messages to multiple prospects;
 * some light up and send a reply back.
 */
const OutreachAnimation = () => {
  const reduce = useReducedMotion();
  const loop = (extra: object = {}) =>
    reduce ? {} : { repeat: Infinity, repeatType: 'loop' as const, ...extra };

  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: 'block' }} role="img" aria-label="Personalized outreach">
      {/* sender */}
      <circle cx="60" cy="150" r="28" fill="rgba(20,187,135,0.12)" stroke="#14bb87" strokeWidth="1.5" />
      <text x="60" y="146" textAnchor="middle" fontSize="10" fontWeight="700" fill="#5fe3bf" fontFamily="inherit">YOU</text>
      <text x="60" y="160" textAnchor="middle" fontSize="8" fill="#5fe3bf" fontFamily="inherit">+ AI</text>

      {recipients.map((y, i) => {
        const replies = i % 2 === 0;
        return (
          <g key={i}>
            <line x1="88" y1="150" x2="300" y2={y} stroke="rgba(15,23,42,0.12)" strokeWidth="1.2" />
            {/* recipient card */}
            <rect x="300" y={y - 16} width="84" height="32" rx="8"
              fill={replies ? 'rgba(20,187,135,0.12)' : 'rgba(15,23,42,0.06)'}
              stroke={replies ? '#14bb87' : 'rgba(15,23,42,0.18)'} strokeWidth="1.2" />
            <circle cx={316} cy={y} r="7" fill={replies ? '#14bb87' : 'rgba(15,23,42,0.2)'} />
            <rect x="328" y={y - 6} width="46" height="4" rx="2" fill="rgba(15,23,42,0.2)" />
            <rect x="328" y={y + 2} width="32" height="4" rx="2" fill="rgba(15,23,42,0.15)" />

            {/* outgoing personalized message */}
            <motion.rect
              width="14" height="10" rx="2" fill="#ffaf06"
              initial={{ x: 84, y: y - 5 + (150 - y) * 0, opacity: 0 }}
              animate={reduce ? {} : { x: [84, 292], y: [145, y - 5], opacity: [0, 1, 1, 0] }}
              transition={loop({ duration: 1.8, delay: i * 0.4, ease: 'easeInOut' })}
            />

            {/* reply back */}
            {replies && (
              <motion.circle
                r="4" fill="#14bb87"
                initial={{ cx: 300, cy: y, opacity: 0 }}
                animate={reduce ? {} : { cx: [300, 90], cy: [y, 150], opacity: [0, 1, 0] }}
                transition={loop({ duration: 1.4, delay: 1.4 + i * 0.4, ease: 'easeOut' })}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default OutreachAnimation;
