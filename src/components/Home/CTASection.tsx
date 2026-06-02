'use client';

import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { Reveal, GradientMesh, GradientText, GlowButton } from '@/components/cinematic';
import { companyInfo } from '@/data/websiteInfo';

const CTASection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: 'radial-gradient(120% 120% at 50% 100%, #16161c 0%, #08080a 60%)',
        color: '#fff',
        py: { xs: 12, md: 18 },
        overflow: 'hidden',
      }}
    >
      <GradientMesh dark intensity={1.2} grid={false} />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <Reveal>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2.2rem', md: '3.6rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              mb: 3,
            }}
          >
            Let’s build your <GradientText>growth engine</GradientText> — together.
          </Typography>
        </Reveal>
        <Reveal delay={0.1}>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: '1.05rem', md: '1.25rem' }, maxWidth: 620, mx: 'auto', mb: 5, lineHeight: 1.6 }}>
            Book a strategy call. We’ll audit your growth, map the opportunity, and show you exactly how
            the partnership turns LinkedIn into high-ticket pipeline.
          </Typography>
        </Reveal>
        <Reveal delay={0.2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center">
            <GlowButton component={Link} href="/contact" size="large">
              Book a Strategy Call
            </GlowButton>
            <Box
              component={motion.a}
              href={companyInfo.contact.socialMedia.linkedin}
              target="_blank"
              rel="noopener noreferrer"
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
                border: '1px solid rgba(255,255,255,0.18)',
                '&:hover': { borderColor: '#0A66C2' },
              }}
            >
              <LinkedInIcon sx={{ color: '#0A66C2' }} /> Connect on LinkedIn
            </Box>
          </Stack>
        </Reveal>
        <Reveal delay={0.3}>
          <Typography sx={{ mt: 4, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            No pressure. No fluff. Just a clear plan for your pipeline.
          </Typography>
        </Reveal>
      </Container>
    </Box>
  );
};

export default CTASection;
