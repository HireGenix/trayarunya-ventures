'use client';

import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

export interface TranscriptLine {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function LiveTranscript({ lines }: { lines: TranscriptLine[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <Box
      sx={{
        height: { xs: 220, md: 280 },
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        pr: 1,
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 3,
        },
      }}
    >
      <AnimatePresence initial={false}>
        {lines.map((l) => {
          const isAi = l.role === 'assistant';
          return (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', justifyContent: isAi ? 'flex-start' : 'flex-end' }}
            >
              <Box
                sx={{
                  maxWidth: '85%',
                  px: 1.75,
                  py: 1.1,
                  borderRadius: 2.5,
                  background: isAi
                    ? 'rgba(255,175,6,0.10)'
                    : 'rgba(20,187,135,0.12)',
                  border: `1px solid ${isAi ? 'rgba(255,175,6,0.3)' : 'rgba(20,187,135,0.3)'}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color: isAi ? '#ffaf06' : '#14bb87',
                    mb: 0.3,
                  }}
                >
                  {isAi ? 'AI MARKETER' : 'YOU'}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {l.text || '…'}
                </Typography>
              </Box>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={endRef} />
    </Box>
  );
}
