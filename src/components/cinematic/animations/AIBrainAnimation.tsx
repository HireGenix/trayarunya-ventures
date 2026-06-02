'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const signals = ['Intent', 'Engage', 'ICP fit', 'Signals'];
const decisions = ['Target', 'Message', 'Timing', 'Spend'];

/**
 * Central AI core: signals flow in from the left, decisions flow out to the right.
 */
const AIBrainAnimation = () => {
  const reduce = useReducedMotion();
  const loop = (extra: object = {}) =>
    reduce ? {} : { repeat: Infinity, repeatType: 'loop' as const, ...extra };

  return (
    <svg viewBox="0 0 400 300" width="100%" style={{ display: 'block' }} role="img" aria-label="AI decision engine">
      <defs>
        <radialGradient id="brainCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd874" />
          <stop offset="55%" stopColor="#ffaf06" />
          <stop offset="100%" stopColor="#14bb87" />
        </radialGradient>
        <filter id="brainGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* input + output connectors */}
      {signals.map((_, i) => {
        const y = 60 + i * 60;
        return <line key={`li${i}`} x1="78" y1={y} x2="170" y2="150" stroke="rgba(255,175,6,0.25)" strokeWidth="1.5" />;
      })}
      {decisions.map((_, i) => {
        const y = 60 + i * 60;
        return <line key={`lo${i}`} x1="230" y1="150" x2="322" y2={y} stroke="rgba(20,187,135,0.25)" strokeWidth="1.5" />;
      })}

      {/* signal labels (left) */}
      {signals.map((s, i) => {
        const y = 60 + i * 60;
        return (
          <g key={`s${i}`}>
            <rect x="6" y={y - 14} width="72" height="28" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,175,6,0.4)" />
            <text x="42" y={y + 4} textAnchor="middle" fontSize="12" fill="#ffd874" fontFamily="inherit">{s}</text>
          </g>
        );
      })}

      {/* decision labels (right) */}
      {decisions.map((d, i) => {
        const y = 60 + i * 60;
        return (
          <g key={`d${i}`}>
            <rect x="322" y={y - 14} width="72" height="28" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(20,187,135,0.45)" />
            <text x="358" y={y + 4} textAnchor="middle" fontSize="12" fill="#5fe3bf" fontFamily="inherit">{d}</text>
          </g>
        );
      })}

      {/* flowing input dots */}
      {signals.map((_, i) => {
        const y = 60 + i * 60;
        return (
          <motion.circle
            key={`pi${i}`}
            r="4"
            fill="#ffaf06"
            initial={{ cx: 80, cy: y, opacity: 0 }}
            animate={reduce ? {} : { cx: [80, 170], cy: [y, 150], opacity: [0, 1, 0] }}
            transition={loop({ duration: 1.6, delay: i * 0.3, ease: 'easeIn' })}
          />
        );
      })}

      {/* flowing output dots */}
      {decisions.map((_, i) => {
        const y = 60 + i * 60;
        return (
          <motion.circle
            key={`po${i}`}
            r="4"
            fill="#14bb87"
            initial={{ cx: 230, cy: 150, opacity: 0 }}
            animate={reduce ? {} : { cx: [230, 320], cy: [150, y], opacity: [0, 1, 0] }}
            transition={loop({ duration: 1.6, delay: 0.8 + i * 0.3, ease: 'easeOut' })}
          />
        );
      })}

      {/* core */}
      <motion.circle
        cx="200"
        cy="150"
        r="40"
        fill="url(#brainCore)"
        filter="url(#brainGlow)"
        animate={reduce ? {} : { scale: [1, 1.08, 1] }}
        transition={loop({ duration: 2.2, ease: 'easeInOut' })}
        style={{ transformOrigin: '200px 150px' }}
      />
      <motion.circle
        cx="200"
        cy="150"
        r="40"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        animate={reduce ? {} : { r: [40, 58], opacity: [0.6, 0] }}
        transition={loop({ duration: 2.2, ease: 'easeOut' })}
      />
      <text x="200" y="146" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0a0a0a" fontFamily="inherit">AI</text>
      <text x="200" y="162" textAnchor="middle" fontSize="9" fontWeight="600" fill="#0a0a0a" fontFamily="inherit">ENGINE</text>
    </svg>
  );
};

export default AIBrainAnimation;
