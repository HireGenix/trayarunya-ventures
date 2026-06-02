'use client';

import React from 'react';
import { Box, Container, Typography, Stack, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowForward as ArrowForwardIcon,
  LinkedIn as LinkedInIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { GradientMesh, GradientText, GlowButton } from '@/components/cinematic';
import { stats } from '@/data/websiteInfo';
import AnimatedCounter from '@/components/cinematic/AnimatedCounter';
import HeroShowcase from './HeroShowcase';

const headline = ['We don’t take clients.', 'We take partners.'];

const wordContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const wordItem = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const HeroSection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        minHeight: { xs: 'auto', md: '100vh' },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: 'radial-gradient(120% 120% at 50% 0%, #16161c 0%, #08080a 55%, #050507 100%)',
        color: '#fff',
        pt: { xs: 13, md: 16 },
        pb: { xs: 8, md: 10 },
      }}
    >
      <GradientMesh dark />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
            gap: { xs: 5, md: 6 },
            alignItems: 'center',
          }}
        >
          {/* LEFT: copy */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Chip
                icon={<LinkedInIcon sx={{ color: '#0A66C2 !important' }} />}
                label="B2B · B2C · D2C GROWTH PARTNER"
                sx={{
                  mb: 3,
                  py: 2,
                  px: 1,
                  borderRadius: '50px',
                  letterSpacing: '0.1em',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.85)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                }}
              />
            </motion.div>

            <Box
              component={motion.h1}
              variants={wordContainer}
              initial="hidden"
              animate="visible"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2.5rem', sm: '3.4rem', md: '4.2rem' },
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                m: 0,
                mb: 3,
              }}
            >
              {headline.map((line, li) => (
                <Box key={li} sx={{ display: 'block' }}>
                  {line.split(' ').map((word, wi) => (
                    <Box
                      key={wi}
                      component={motion.span}
                      variants={wordItem}
                      sx={{ display: 'inline-block', mr: '0.25em' }}
                    >
                      {li === 1 ? <GradientText>{word}</GradientText> : word}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: { xs: '1.02rem', md: '1.2rem' },
                  maxWidth: 560,
                  mx: { xs: 'auto', md: 0 },
                  mb: 4,
                  lineHeight: 1.6,
                }}
              >
                We own your pain as our own and run an AI-powered growth engine — filtering leads,
                outreach, content and ads — that turns attention into a predictable
                <GradientText sx={{ fontWeight: 700 }}> high-ticket pipeline.</GradientText>
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.85 }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent={{ xs: 'center', md: 'flex-start' }}
                alignItems="center"
              >
                <GlowButton component={Link} href="/contact" size="large">
                  Book a Strategy Call
                </GlowButton>
                <Box
                  component={Link}
                  href="/how-we-work"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'rgba(255,255,255,0.85)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    px: 2,
                    py: 1.5,
                    borderRadius: '50px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    transition: 'all 0.3s ease',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.4)', color: '#fff' },
                  }}
                >
                  See how we work <ArrowForwardIcon fontSize="small" />
                </Box>
              </Stack>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              <Stack
                direction="row"
                spacing={1}
                justifyContent={{ xs: 'center', md: 'flex-start' }}
                alignItems="center"
                sx={{ mt: 3, color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}
              >
                <VerifiedIcon sx={{ fontSize: 18, color: '#14bb87' }} />
                B2B is our flagship — trusted by founders to own their growth
              </Stack>
            </motion.div>
          </Box>

          {/* RIGHT: live animated showcase */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroShowcase />
          </Box>
        </Box>

        {/* Stats strip (full width) */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          sx={{
            mt: { xs: 6, md: 8 },
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 2, md: 1 },
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {stats.map((s) => (
            <Box key={s.label} sx={{ textAlign: 'center', px: 1 }}>
              <AnimatedCounter
                value={s.value}
                prefix={s.prefix}
                suffix={s.suffix}
                decimals={s.value % 1 !== 0 ? 1 : 0}
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.8rem', md: '2.4rem' },
                  background: 'linear-gradient(90deg, #ffaf06, #14bb87)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1,
                }}
              />
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', mt: 0.5 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default HeroSection;
