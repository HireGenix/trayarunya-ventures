'use client';

import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Reveal, GradientMesh, GradientText, GlowButton, Scene3D, SURFACE } from '@/components/cinematic';

const MotionLink = motion.create(Link);

const CTASection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: SURFACE.ctaBold,
        color: '#fff',
        py: { xs: 12, md: 18 },
        overflow: 'hidden',
      }}
    >
      <GradientMesh dark={false} intensity={1.2} grid={false} />
      <Scene3D variant="cta" opacity={0.85} />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <Reveal variant="flip">
          <Typography
            variant="h2"
            sx={{
              textShadow: '2px 2px 0 rgba(90,30,160,0.55), 4px 4px 0 rgba(90,30,160,0.35), 6px 6px 24px rgba(0,0,0,0.25)',
              fontWeight: 800,
              fontSize: { xs: '2.2rem', md: '3.6rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              mb: 3,
            }}
          >
            Let’s build your <GradientText gradient="linear-gradient(90deg,#ffffff,rgba(255,255,255,0.88))">growth engine</GradientText> — together.
          </Typography>
        </Reveal>
        <Reveal delay={0.1}>
          <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: { xs: '1.05rem', md: '1.25rem' }, maxWidth: 620, mx: 'auto', mb: 5, lineHeight: 1.6 }}>
            Book a strategy call. We’ll run a free AI-powered marketing audit, map your growth opportunities
            and show you exactly how MarketiQ AI and our team will scale your brand.
          </Typography>
        </Reveal>
        <Reveal delay={0.2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center">
            <GlowButton component={Link} href="/contact" size="large">
              Book a Strategy Call
            </GlowButton>
            <Box
              component={MotionLink}
              href="/marketiq"
              whileHover={{ y: -3 }}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 3,
                py: 1.6,
                borderRadius: '50px',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.45)',
                background: 'rgba(255,255,255,0.12)',
                boxShadow: '0 5px 0 rgba(60,20,130,0.35)',
                backdropFilter: 'blur(8px)',
                '&:hover': { borderColor: '#ffffff', background: 'rgba(255,255,255,0.2)' },
              }}
            >
              <AutoAwesomeIcon sx={{ color: '#ffe08a' }} /> Explore MarketiQ AI
            </Box>
          </Stack>
        </Reveal>
        <Reveal delay={0.3}>
          <Typography sx={{ mt: 4, color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
            No pressure. No fluff. Just a clear, data-backed plan for your growth.
          </Typography>
        </Reveal>
      </Container>
    </Box>
  );
};

export default CTASection;
