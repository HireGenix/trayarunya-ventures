'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Reveal, GradientText, SURFACE, TEXT, CARD } from '@/components/cinematic';
import { manifesto } from '@/data/websiteInfo';

const ManifestoSection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: SURFACE.white,
        color: TEXT.heading,
        py: { xs: 10, md: 16 },
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', maxWidth: 860, mx: 'auto', mb: { xs: 7, md: 10 } }}>
          <Reveal>
            <Typography
              sx={{
                color: '#ffaf06',
                fontWeight: 700,
                letterSpacing: '0.18em',
                fontSize: '0.8rem',
                mb: 2,
              }}
            >
              THE PARTNERSHIP DIFFERENCE
            </Typography>
          </Reveal>
          <Reveal delay={0.05}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2rem', md: '3rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              }}
            >
              Most agencies see a <Box component="span" sx={{ color: TEXT.muted }}>client</Box>.
              <br />
              We see a <GradientText>business worth fighting for.</GradientText>
            </Typography>
          </Reveal>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {manifesto.map((m, i) => (
            <Reveal key={m.key} delay={i * 0.12}>
              <Box
                component={motion.div}
                whileHover={{ y: -6 }}
                sx={{
                  position: 'relative',
                  height: '100%',
                  p: 4,
                  borderRadius: 4,
                  background: CARD.bg,
                  border: CARD.border,
                  boxShadow: CARD.shadow,
                  overflow: 'hidden',
                  transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': { borderColor: 'rgba(255,175,6,0.3)', boxShadow: CARD.shadowHover },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '3rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    background: 'linear-gradient(90deg, #ffaf06, #14bb87)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2,
                  }}
                >
                  0{i + 1}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: TEXT.heading }}>
                  {m.title}
                </Typography>
                <Typography sx={{ color: TEXT.body, lineHeight: 1.7 }}>
                  {m.description}
                </Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default ManifestoSection;
