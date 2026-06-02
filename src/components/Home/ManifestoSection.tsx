'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Reveal, GradientText } from '@/components/cinematic';
import { manifesto } from '@/data/websiteInfo';

const ManifestoSection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: '#050507',
        color: '#fff',
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
              Most agencies see a <Box component="span" sx={{ color: 'rgba(255,255,255,0.4)' }}>client</Box>.
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
                  background: 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  transition: 'border-color 0.3s ease',
                  '&:hover': { borderColor: 'rgba(255,175,6,0.3)' },
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
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
                  {m.title}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
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
