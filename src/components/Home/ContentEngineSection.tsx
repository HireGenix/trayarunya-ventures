'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Container, Typography, Chip, Stack, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { Reveal, SectionHeading, SURFACE, TEXT, CARD } from '@/components/cinematic';
import { contentEngine } from '@/data/websiteInfo';

/** Where the homepage CTAs point. Swap to the live app subdomain when ready. */
const CONTENT_ENGINE_URL = '/contact';

const ContentEngineSection = () => {
  const { eyebrow, badge, title, subtitle, capabilities, stages, stats, whyLine, ctaPrimary, ctaSecondary } =
    contentEngine;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: SURFACE.lavender,
        color: TEXT.heading,
        py: { xs: 10, md: 16 },
        overflow: 'hidden',
      }}
    >
      {/* soft brand glows */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,175,6,0.18), transparent 70%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -140,
          left: -100,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,187,135,0.16), transparent 70%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />

        {/* Product frame with the 5-stage pipeline */}
        <Reveal>
          <Box
            component={motion.div}
            whileHover={{ y: -4 }}
            sx={{
              maxWidth: 980,
              mx: 'auto',
              mb: { xs: 6, md: 8 },
              borderRadius: 4,
              background: CARD.bg,
              border: CARD.border,
              boxShadow: CARD.shadow,
              overflow: 'hidden',
            }}
          >
            {/* browser chrome */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2.5,
                py: 1.5,
                borderBottom: CARD.border,
                background: 'rgba(248,250,252,0.8)',
              }}
            >
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                {['#ff5a5f', '#ffaf06', '#14bb87'].map((c) => (
                  <Box key={c} sx={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
                ))}
              </Box>
              <Chip
                label={badge}
                size="small"
                sx={{
                  ml: 1.5,
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  color: '#0a0a0a',
                  background: 'linear-gradient(90deg,#ffaf06,#14bb87)',
                }}
              />
            </Box>

            {/* pipeline */}
            <Box sx={{ p: { xs: 3, md: 5 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: { xs: 1.5, md: 2 },
                }}
              >
                {stages.map((stage, i) => (
                  <React.Fragment key={stage}>
                    <Box
                      component={motion.div}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      sx={{
                        px: { xs: 2, md: 2.5 },
                        py: { xs: 1.25, md: 1.5 },
                        borderRadius: 2.5,
                        fontWeight: 700,
                        fontSize: { xs: '0.8rem', md: '0.95rem' },
                        color: TEXT.heading,
                        background: 'linear-gradient(135deg, rgba(255,175,6,0.12), rgba(20,187,135,0.12))',
                        border: '1px solid rgba(15,23,42,0.08)',
                      }}
                    >
                      <Box component="span" sx={{ color: TEXT.muted, fontWeight: 800, mr: 0.75 }}>
                        {String(i + 1).padStart(2, '0')}
                      </Box>
                      {stage}
                    </Box>
                    {i < stages.length - 1 && (
                      <Box
                        aria-hidden
                        sx={{
                          display: { xs: 'none', md: 'block' },
                          width: 28,
                          height: 2,
                          borderRadius: 2,
                          background: 'linear-gradient(90deg,#ffaf06,#14bb87)',
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </Box>

              {/* stat row */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 2, sm: 4 }}
                justifyContent="center"
                sx={{ mt: { xs: 3, md: 4 }, textAlign: 'center' }}
              >
                {stats.map((s) => (
                  <Box key={s.label}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: '1.6rem', md: '2rem' },
                        lineHeight: 1,
                        background: 'linear-gradient(135deg,#ffaf06,#14bb87)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {s.value}
                    </Typography>
                    <Typography sx={{ color: TEXT.muted, fontSize: '0.8rem', mt: 0.5 }}>{s.label}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        </Reveal>

        {/* Capabilities grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
            gap: { xs: 2, md: 3 },
          }}
        >
          {capabilities.map((cap, i) => (
            <Reveal key={cap.key} delay={i * 0.06} amount={0.2}>
              <Box
                component={motion.div}
                whileHover={{ y: -6 }}
                sx={{
                  height: '100%',
                  p: { xs: 3, md: 3.5 },
                  borderRadius: 3,
                  background: CARD.bg,
                  border: `1px solid ${cap.accent}26`,
                  boxShadow: `0 18px 44px -24px ${cap.accent}55`,
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    mb: 2,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    color: '#fff',
                    background: `linear-gradient(135deg, ${cap.accent}, ${cap.accent}b3)`,
                    boxShadow: `0 8px 20px -8px ${cap.accent}`,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: TEXT.heading }}>
                  {cap.title}
                </Typography>
                <Typography sx={{ color: TEXT.body, fontSize: '0.92rem', lineHeight: 1.7 }}>
                  {cap.description}
                </Typography>
              </Box>
            </Reveal>
          ))}
        </Box>

        {/* Why + CTA */}
        <Reveal>
          <Box
            sx={{
              mt: { xs: 6, md: 8 },
              p: { xs: 3, md: 5 },
              borderRadius: 4,
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(255,175,6,0.08), rgba(20,187,135,0.08))',
              border: CARD.border,
            }}
          >
            <Typography
              sx={{
                maxWidth: 720,
                mx: 'auto',
                mb: 3,
                fontSize: { xs: '1.05rem', md: '1.25rem' },
                fontWeight: 600,
                color: TEXT.heading,
                lineHeight: 1.6,
              }}
            >
              {whyLine}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                component={Link}
                href={CONTENT_ENGINE_URL}
                variant="contained"
                size="large"
                sx={{
                  px: 4,
                  py: 1.4,
                  fontWeight: 700,
                  borderRadius: '50px',
                  color: '#0a0a0a',
                  background: 'linear-gradient(135deg,#ffaf06,#14bb87)',
                  boxShadow: '0 12px 30px -10px rgba(255,175,6,0.6)',
                  '&:hover': { background: 'linear-gradient(135deg,#ffaf06,#14bb87)', filter: 'brightness(1.05)' },
                }}
              >
                {ctaPrimary}
              </Button>
              <Button
                component={Link}
                href="/how-we-work"
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 1.4,
                  fontWeight: 700,
                  borderRadius: '50px',
                  color: TEXT.heading,
                  borderColor: 'rgba(15,23,42,0.18)',
                  '&:hover': { borderColor: '#14bb87', background: 'rgba(20,187,135,0.06)' },
                }}
              >
                {ctaSecondary}
              </Button>
            </Stack>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
};

export default ContentEngineSection;
