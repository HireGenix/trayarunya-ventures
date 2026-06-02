'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export const OPENER_PROMPTS = [
  'Audit my LinkedIn',
  'I need more B2B leads',
  'Scale my D2C ads',
  'Fix my cold outreach',
];

export const LIVE_PROMPTS = [
  "We're B2B",
  "We're B2C",
  "We're D2C",
  'How do you work?',
  'Show me results',
];

interface QuickRepliesProps {
  prompts: string[];
  onSelect: (text: string) => void;
  label?: string;
}

export default function QuickReplies({ prompts, onSelect, label }: QuickRepliesProps) {
  return (
    <Box>
      {label && (
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', mb: 0.8, letterSpacing: 0.3 }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, justifyContent: 'center' }}>
        {prompts.map((p, i) => (
          <Box
            key={p}
            component={motion.button}
            type="button"
            onClick={() => onSelect(p)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            sx={{
              cursor: 'pointer',
              px: 1.6,
              py: 0.8,
              borderRadius: 99,
              fontSize: '0.8rem',
              fontWeight: 700,
              fontFamily: 'inherit',
              color: '#475569',
              background: '#ffffff',
              border: '1px solid rgba(15,23,42,0.12)',
              boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
              transition: 'border-color .2s ease, color .2s ease',
              '&:hover': { borderColor: '#ffaf06', color: '#b8730a' },
            }}
          >
            {p}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
