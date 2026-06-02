'use client';

import React from 'react';
import { Box, Container, Typography, Avatar } from '@mui/material';
import { motion } from 'framer-motion';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { Reveal, SectionHeading, SURFACE, TEXT, CARD } from '@/components/cinematic';
import { testimonials } from '@/data/websiteInfo';

const ProofSection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: SURFACE.mint,
        color: TEXT.heading,
        py: { xs: 10, md: 16 },
      }}
    >
      <Container maxWidth="lg">
        <SectionHeading
          eyebrow="PARTNER RESULTS"
          title="Growth our partners can feel"
          subtitle="We measure success the way you do — in qualified calls, pipeline and closed high-ticket deals."
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 3,
            maxWidth: 980,
            mx: 'auto',
          }}
        >
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={(i % 2) * 0.1}>
              <Box
                component={motion.div}
                whileHover={{ y: -6 }}
                sx={{
                  position: 'relative',
                  height: '100%',
                  p: { xs: 3, md: 4 },
                  borderRadius: 4,
                  background: CARD.bg,
                  border: CARD.border,
                  boxShadow: CARD.shadow,
                  overflow: 'hidden',
                }}
              >
                <FormatQuoteIcon
                  sx={{
                    position: 'absolute',
                    top: 18,
                    right: 20,
                    fontSize: 60,
                    color: 'rgba(255,175,6,0.22)',
                    transform: 'scaleX(-1)',
                  }}
                />
                <Typography sx={{ fontSize: '1.02rem', lineHeight: 1.7, color: TEXT.body, mb: 3, position: 'relative' }}>
                  “{t.quote}”
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      fontWeight: 700,
                      color: '#0a0a0a',
                      background: 'linear-gradient(135deg, #ffaf06, #14bb87)',
                    }}
                  >
                    {t.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: TEXT.heading }}>{t.name}</Typography>
                    <Typography sx={{ color: TEXT.muted, fontSize: '0.82rem' }}>
                      {t.position}, {t.company}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default ProofSection;
