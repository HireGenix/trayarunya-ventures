'use client';

import React from 'react';
import { Box, Container, Typography, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StarIcon from '@mui/icons-material/Star';
import { Reveal, SectionHeading, GlowButton, ServiceIcon } from '@/components/cinematic';
import { services } from '@/data/servicesData';

const ServicesSection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: '#0a0a0f',
        color: '#fff',
        py: { xs: 10, md: 16 },
      }}
    >
      <Container maxWidth="lg">
        <SectionHeading
          dark
          eyebrow="WHAT WE OWN FOR YOU"
          title="A full-stack B2B growth engine"
          subtitle="Every service is built around one outcome: qualified, high-ticket pipeline. LinkedIn is the engine — these are the systems around it."
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {services.map((s, i) => (
            <Reveal key={s.slug} delay={(i % 3) * 0.1}>
              <Box
                component={motion.div}
                whileHover={{ y: -8 }}
                sx={{
                  position: 'relative',
                  height: '100%',
                  p: 3.5,
                  borderRadius: 4,
                  background: 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  transition: 'border-color 0.3s ease',
                  '&:hover': { borderColor: `${s.color}55` },
                }}
              >
                {/* glow corner */}
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${s.color}33, transparent 70%)`,
                    filter: 'blur(10px)',
                  }}
                />
                {s.flagship && (
                  <Chip
                    icon={<StarIcon sx={{ fontSize: '14px !important', color: '#0a0a0a !important' }} />}
                    label="FLAGSHIP"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      height: 22,
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      color: '#0a0a0a',
                      background: 'linear-gradient(90deg,#ffaf06,#ffc046)',
                    }}
                  />
                )}

                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    mb: 2.5,
                    color: s.color,
                    background: `${s.color}1f`,
                    border: `1px solid ${s.color}40`,
                  }}
                >
                  <ServiceIcon name={s.icon} />
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, position: 'relative' }}>
                  {s.shortName}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.9rem', lineHeight: 1.65, mb: 2.5, minHeight: 66 }}>
                  {s.tagline}
                </Typography>

                <Box
                  component={Link}
                  href={`/services/${s.slug}`}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: s.color,
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    '&:hover': { gap: 1 },
                    transition: 'gap 0.2s ease',
                  }}
                >
                  Explore service <ArrowForwardIcon sx={{ fontSize: 16 }} />
                </Box>
              </Box>
            </Reveal>
          ))}
        </Box>

        <Box sx={{ textAlign: 'center', mt: { xs: 6, md: 8 } }}>
          <Reveal>
            <GlowButton component={Link} href="/services" size="large">
              View all services
            </GlowButton>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
};

export default ServicesSection;
