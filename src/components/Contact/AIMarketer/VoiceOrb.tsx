'use client';

import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';

interface VoiceOrbProps {
  /** 0..1 amplitude of the AI voice */
  aiLevel: number;
  /** 0..1 amplitude of the user's mic */
  userLevel: number;
  /** Visual state */
  state: 'idle' | 'connecting' | 'live';
}

/**
 * Cinematic voice orb that reacts to audio amplitude.
 * Gold (#ffaf06) core for the AI, green (#14bb87) ring for the listener.
 */
export default function VoiceOrb({ aiLevel, userLevel, state }: VoiceOrbProps) {
  const live = state === 'live';
  const aiScale = 1 + (live ? aiLevel * 0.45 : 0);
  const userScale = 1 + (live ? userLevel * 0.6 : 0);

  return (
    <Box
      sx={{
        position: 'relative',
        width: 220,
        height: 220,
        display: 'grid',
        placeItems: 'center',
        mx: 'auto',
      }}
    >
      {/* Outer listening ring (user) */}
      <motion.div
        animate={{ scale: userScale, opacity: live ? 0.5 + userLevel * 0.5 : 0.25 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '2px solid rgba(20,187,135,0.55)',
          boxShadow: '0 0 40px rgba(20,187,135,0.25)',
        }}
      />

      {/* Pulsing halo */}
      <motion.div
        animate={
          state === 'connecting'
            ? { scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }
            : { scale: aiScale, opacity: live ? 0.55 : 0.3 }
        }
        transition={
          state === 'connecting'
            ? { duration: 1.4, repeat: Infinity }
            : { type: 'spring', stiffness: 220, damping: 16 }
        }
        style={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 30%, rgba(255,175,6,0.9), rgba(255,120,6,0.25) 60%, transparent 72%)',
          filter: 'blur(2px)',
        }}
      />

      {/* Core */}
      <motion.div
        animate={{ scale: aiScale }}
        transition={{ type: 'spring', stiffness: 240, damping: 14 }}
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 30%, #ffd36b, #ffaf06 45%, #ff7a06 100%)',
          boxShadow: '0 0 50px rgba(255,175,6,0.6), inset 0 0 24px rgba(255,255,255,0.35)',
        }}
      />
    </Box>
  );
}
