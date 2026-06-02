'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Reveal, GradientText, SURFACE, TEXT, CARD } from '@/components/cinematic';
import { painPoints } from '@/data/websiteInfo';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const ProblemSection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: SURFACE.peach,
        color: TEXT.heading,
        py: { xs: 10, md: 16 },
        overflow: 'hidden',
      }}
    >
      {/* faint red wash to evoke friction */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(60% 50% at 50% 40%, rgba(217,44,74,0.06), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto', mb: { xs: 6, md: 9 } }}>
          <Reveal>
            <Typography sx={{ color: '#d92c4a', fontWeight: 700, letterSpacing: '0.18em', fontSize: '0.8rem', mb: 2 }}>
              SOUND FAMILIAR?
            </Typography>
          </Reveal>
          <Reveal delay={0.05}>
            <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '3rem' }, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              You don’t have a marketing problem.
              <br />
              You have a <GradientText gradient="linear-gradient(90deg,#d92c4a,#ffaf06)">partnership problem.</GradientText>
            </Typography>
          </Reveal>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2.5,
            maxWidth: 920,
            mx: 'auto',
          }}
        >
          {painPoints.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1} direction={i % 2 === 0 ? 'right' : 'left'}>
              <Box
                component={motion.div}
                whileHover={{ x: 4 }}
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 3,
                  height: '100%',
                  borderRadius: 3,
                  background: CARD.bg,
                  border: `1px solid rgba(217,44,74,0.18)`,
                  boxShadow: CARD.shadow,
                }}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(217,44,74,0.10)',
                    color: '#e35a72',
                  }}
                >
                  <SentimentDissatisfiedIcon />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, mb: 0.5, color: TEXT.heading }}>{p.title}</Typography>
                  <Typography sx={{ color: TEXT.body, fontSize: '0.92rem', lineHeight: 1.6 }}>
                    {p.description}
                  </Typography>
                </Box>
              </Box>
            </Reveal>
          ))}
        </Box>

        <Reveal delay={0.2}>
          <Box
            sx={{
              mt: { xs: 6, md: 8 },
              textAlign: 'center',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography sx={{ color: TEXT.body, fontSize: '1.05rem' }}>
              Every one of these traces back to a vendor who never truly owned your growth.
            </Typography>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#ffaf06', fontWeight: 700 }}>
              Here’s how we change that <ArrowForwardIcon fontSize="small" />
            </Box>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
};

export default ProblemSection;
