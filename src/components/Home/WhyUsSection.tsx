'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { Reveal, SectionHeading, GradientText, SURFACE, TEXT, CARD } from '@/components/cinematic';
import { differentiators } from '@/data/websiteInfo';

const WhyUsSection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: SURFACE.white,
        color: TEXT.heading,
        py: { xs: 10, md: 16 },
      }}
    >
      <Container maxWidth="lg">
        <SectionHeading
          eyebrow="WHY ONLY TRAYARUNYA"
          title={
            <>
              The difference between a vendor
              <br /> and a <GradientText>growth partner</GradientText>
            </>
          }
          subtitle="Anyone can run campaigns. Few will own your outcome. Here’s what changes when marketing is treated as a partnership."
        />

        <Box sx={{ maxWidth: 920, mx: 'auto' }}>
          {/* header row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr' },
              gap: 2,
              mb: 2,
              px: { xs: 0, md: 2 },
            }}
          >
            <Box sx={{ display: { xs: 'none', md: 'block' } }} />
            <Typography sx={{ textAlign: 'center', fontWeight: 800, color: '#ffaf06', fontSize: '0.95rem' }}>
              Trayarunya
            </Typography>
            <Typography sx={{ textAlign: 'center', fontWeight: 700, color: TEXT.muted, fontSize: '0.95rem' }}>
              Typical agency
            </Typography>
          </Box>

          {differentiators.map((d, i) => (
            <Reveal key={d.title} delay={i * 0.08}>
              <Box
                component={motion.div}
                whileHover={{ scale: 1.01 }}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr' },
                  gap: 2,
                  alignItems: 'center',
                  p: { xs: 2.5, md: 2 },
                  mb: 1.5,
                  borderRadius: 3,
                  background: CARD.bg,
                  border: CARD.border,
                  boxShadow: CARD.shadow,
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: { xs: 1, md: 0 }, color: TEXT.heading }}>
                  {d.title}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'flex-start',
                    p: 1.5,
                    borderRadius: 2,
                    background: '#14bb8714',
                    border: '1px solid #14bb8733',
                  }}
                >
                  <CheckCircleIcon sx={{ color: '#14bb87', fontSize: 20, flexShrink: 0, mt: '1px' }} />
                  <Typography sx={{ fontSize: '0.85rem', color: TEXT.body, lineHeight: 1.5 }}>
                    {d.us}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1.5 }}>
                  <CancelIcon sx={{ color: 'rgba(217,44,74,0.7)', fontSize: 20, flexShrink: 0, mt: '1px' }} />
                  <Typography sx={{ fontSize: '0.85rem', color: TEXT.muted, lineHeight: 1.5 }}>
                    {d.them}
                  </Typography>
                </Box>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default WhyUsSection;
