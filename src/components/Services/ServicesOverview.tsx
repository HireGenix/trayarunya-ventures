'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StarIcon from '@mui/icons-material/Star';
import { Layout } from '@/components/Layout';
import { PageHero, Reveal, GlowButton, ServiceIcon, TiltCard, SURFACE, TEXT, CARD } from '@/components/cinematic';
import { services } from '@/data/servicesData';
import { processSteps } from '@/data/websiteInfo';

const ServicesOverview = () => {
  return (
    <Layout>
      <PageHero
        eyebrow="OUR SERVICES"
        title={
          <>
            One partner. A complete
            <br /> B2B growth engine.
          </>
        }
        subtitle="LinkedIn is the engine. These are the systems we build and run around it — all owned end-to-end, all tied to high-ticket pipeline."
      >
        <GlowButton component={Link} href="/contact" size="large">
          Book a Strategy Call
        </GlowButton>
      </PageHero>

      {/* Services list */}
      <Box sx={{ background: SURFACE.white, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {services.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 2) * 0.06}>
                <Box
                  component={motion.div}
                  whileHover={{ y: -4 }}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'auto 1fr auto' },
                    gap: { xs: 2.5, md: 4 },
                    alignItems: 'center',
                    p: { xs: 3, md: 4 },
                    borderRadius: 4,
                    background: CARD.bg,
                    border: CARD.border,
                    boxShadow: CARD.shadow,
                    transition: 'border-color 0.3s ease',
                    '&:hover': { borderColor: `${s.color}55` },
                  }}
                >
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      borderRadius: 3,
                      display: 'grid',
                      placeItems: 'center',
                      color: s.color,
                      background: `${s.color}14`,
                      border: `1px solid ${s.color}44`,
                    }}
                  >
                    <ServiceIcon name={s.icon} sx={{ fontSize: 34 }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: TEXT.heading }}>
                        {s.name}
                      </Typography>
                      {s.flagship && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.2,
                            py: 0.3,
                            borderRadius: '50px',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            color: '#0a0a0a',
                            background: 'linear-gradient(90deg,#ffaf06,#ffc046)',
                          }}
                        >
                          <StarIcon sx={{ fontSize: 12 }} /> FLAGSHIP
                        </Box>
                      )}
                    </Box>
                    <Typography sx={{ color: TEXT.body, lineHeight: 1.65, maxWidth: 620 }}>
                      {s.summary}
                    </Typography>
                  </Box>
                  <Box
                    component={Link}
                    href={`/services/${s.slug}`}
                    sx={{
                      justifySelf: { xs: 'start', md: 'end' },
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.7,
                      whiteSpace: 'nowrap',
                      px: 2.5,
                      py: 1.2,
                      borderRadius: '50px',
                      color: s.color,
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      border: `1px solid ${s.color}55`,
                      transition: 'all 0.2s ease',
                      '&:hover': { background: `${s.color}14` },
                    }}
                  >
                    Explore <ArrowForwardIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Process recap */}
      <Box sx={{ background: SURFACE.cream, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Reveal>
            <Typography variant="h3" sx={{ fontWeight: 800, textAlign: 'center', mb: 1.5, fontSize: { xs: '1.8rem', md: '2.4rem' }, color: TEXT.heading }}>
              However we engage, the operating system is the same
            </Typography>
            <Typography sx={{ textAlign: 'center', color: TEXT.muted, maxWidth: 640, mx: 'auto', mb: 6 }}>
              Understand → Strategize → Execute → Scale. We own each stage like your in-house team.
            </Typography>
          </Reveal>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2 }}>
            {processSteps.map((p, i) => (
              <Reveal key={p.number} delay={i * 0.1}>
                <TiltCard max={12} sx={{ height: '100%', borderRadius: 3 }}>
                  <Box sx={{ p: 3, borderRadius: 3, background: CARD.bg, border: CARD.border, boxShadow: CARD.shadow, height: '100%' }}>
                    <Typography sx={{ fontWeight: 800, color: '#ffaf06', mb: 1 }}>{p.number}</Typography>
                    <Typography sx={{ fontWeight: 700, mb: 0.5, color: TEXT.heading }}>{p.title}</Typography>
                    <Typography sx={{ color: TEXT.muted, fontSize: '0.82rem', lineHeight: 1.5 }}>
                      {p.subtitle}
                    </Typography>
                  </Box>
                </TiltCard>
              </Reveal>
            ))}
          </Box>
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <GlowButton component={Link} href="/how-we-work" size="large">
              See how we work
            </GlowButton>
          </Box>
        </Container>
      </Box>
    </Layout>
  );
};

export default ServicesOverview;
