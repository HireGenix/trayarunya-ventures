'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  AIBrainAnimation,
  LeadFilterAnimation,
  OutreachAnimation,
  ContentCreationAnimation,
  ContentPostingAnimation,
  AdsAnimation,
} from '@/components/cinematic/animations';
import { CARD, TEXT } from '@/components/cinematic';

const slides = [
  { key: 'ai', label: 'AI Decision Engine', caption: 'Data decides every move', Cmp: AIBrainAnimation, accent: '#ffaf06' },
  { key: 'lead', label: 'Lead Filtering', caption: 'Only qualified buyers get through', Cmp: LeadFilterAnimation, accent: '#ffaf06' },
  { key: 'out', label: 'Personalized Outreach', caption: 'Conversations that get replies', Cmp: OutreachAnimation, accent: '#14bb87' },
  { key: 'create', label: 'Content Creation', caption: 'Authority content, built fast', Cmp: ContentCreationAnimation, accent: '#0A66C2' },
  { key: 'post', label: 'Smart Posting', caption: 'Right channel, right moment', Cmp: ContentPostingAnimation, accent: '#ffaf06' },
  { key: 'ads', label: 'Paid Amplification', caption: 'Scale only what converts', Cmp: AdsAnimation, accent: '#14bb87' },
];

const HeroShowcase = () => {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 3800);
    return () => clearInterval(t);
  }, [reduce]);

  const active = slides[i];

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 4,
        p: { xs: 2, md: 3 },
        background: CARD.bg,
        border: CARD.border,
        boxShadow: `0 30px 80px -30px ${active.accent}55`,
        transition: 'box-shadow 0.6s ease',
      }}
    >
      {/* window dots + live label */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 0.7 }}>
          {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
            <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box
            component={motion.span}
            animate={reduce ? {} : { opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            sx={{ width: 7, height: 7, borderRadius: '50%', background: '#14bb87' }}
          />
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: TEXT.muted }}>
            LIVE ENGINE
          </Typography>
        </Box>
      </Box>

      {/* animation stage */}
      <Box sx={{ position: 'relative', minHeight: { xs: 230, md: 270 } }}>
        <AnimatePresence mode="wait">
          <Box
            key={active.key}
            component={motion.div}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <active.Cmp />
          </Box>
        </AnimatePresence>
      </Box>

      {/* caption */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Chip
            label={active.label}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              color: active.accent,
              background: `${active.accent}14`,
              border: `1px solid ${active.accent}33`,
              mb: 0.5,
            }}
          />
          <Typography sx={{ color: TEXT.body, fontSize: '0.82rem' }}>
            {active.caption}
          </Typography>
        </Box>

        {/* progress dots */}
        <Box sx={{ display: 'flex', gap: 0.6 }}>
          {slides.map((s, idx) => (
            <Box
              key={s.key}
              onClick={() => setI(idx)}
              sx={{
                width: idx === i ? 22 : 8,
                height: 8,
                borderRadius: '50px',
                cursor: 'pointer',
                background: idx === i ? active.accent : 'rgba(15,23,42,0.12)',
                transition: 'all 0.4s ease',
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HeroShowcase;
