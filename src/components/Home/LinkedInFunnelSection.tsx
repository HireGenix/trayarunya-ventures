'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { Reveal, GradientText, GlowButton } from '@/components/cinematic';
import { linkedinFunnel } from '@/data/websiteInfo';

const widths = [100, 86, 70, 54, 40];

const LinkedInFunnelSection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: 'radial-gradient(100% 100% at 50% 0%, #0a1622 0%, #07090d 60%)',
        color: '#fff',
        py: { xs: 10, md: 16 },
        overflow: 'hidden',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(50% 60% at 50% 30%, rgba(10,102,194,0.18), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' },
            gap: { xs: 5, md: 8 },
            alignItems: 'center',
          }}
        >
          {/* Left: narrative */}
          <Box>
            <Reveal>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  mb: 3,
                  borderRadius: '50px',
                  background: 'rgba(10,102,194,0.15)',
                  border: '1px solid rgba(10,102,194,0.4)',
                }}
              >
                <LinkedInIcon sx={{ color: '#0A66C2' }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.1em' }}>
                  THE SIGNATURE ENGINE
                </Typography>
              </Box>
            </Reveal>
            <Reveal delay={0.05}>
              <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.9rem' }, lineHeight: 1.12, mb: 2.5, letterSpacing: '-0.02em' }}>
                From LinkedIn profile to <GradientText gradient="linear-gradient(90deg,#0A66C2,#14bb87)">closed high-ticket deals</GradientText>
              </Typography>
            </Reveal>
            <Reveal delay={0.1}>
              <Typography sx={{ color: 'rgba(255,255,255,0.68)', fontSize: '1.05rem', lineHeight: 1.7, mb: 4 }}>
                Most “LinkedIn marketing” stops at posting. We engineer the entire funnel — turning quiet
                profiles into a system that books calls with buyers who can actually sign.
              </Typography>
            </Reveal>
            <Reveal delay={0.15}>
              <GlowButton component={Link} href="/services/linkedin-lead-generation" size="large">
                See the LinkedIn engine
              </GlowButton>
            </Reveal>
          </Box>

          {/* Right: animated funnel */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            {linkedinFunnel.map((stage, i) => (
              <Box
                key={stage.stage}
                component={motion.div}
                initial={{ opacity: 0, y: 24, scaleX: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scaleX: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, delay: i * 0.14, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.02 }}
                sx={{
                  width: { xs: '100%', sm: `${widths[i]}%` },
                  minWidth: { xs: 'auto', sm: 240 },
                  p: { xs: 2, md: 2.4 },
                  borderRadius: 2.5,
                  background:
                    i === linkedinFunnel.length - 1
                      ? 'linear-gradient(95deg, #ffaf06, #14bb87)'
                      : 'linear-gradient(95deg, rgba(10,102,194,0.9), rgba(10,102,194,0.55))',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                  textAlign: 'center',
                  color: i === linkedinFunnel.length - 1 ? '#0a0a0a' : '#fff',
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.05rem' }, lineHeight: 1.2 }}>
                  {stage.stage}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    opacity: i === linkedinFunnel.length - 1 ? 0.8 : 0.85,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  {stage.description}
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mt: 0.5 }}>
                  {stage.metric}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default LinkedInFunnelSection;
