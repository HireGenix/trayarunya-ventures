'use client';

import React from 'react';
import { Box, Container, Typography, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { Reveal, SectionHeading, SURFACE, TEXT, LINE } from '@/components/cinematic';
import { processSteps } from '@/data/websiteInfo';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const stepColors = ['#ffaf06', '#14bb87', '#0A66C2', '#8E44AD'];

const HowWeWorkSection = () => {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: SURFACE.sky,
        color: TEXT.heading,
        py: { xs: 10, md: 16 },
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <SectionHeading
          eyebrow="HOW WE WORK"
          title={
            <>
              Your in-house growth team,
              <br /> in four moves
            </>
          }
          subtitle="A proven operating system that takes us from understanding your pain to compounding your pipeline — owned end-to-end."
        />

        {/* Pipeline */}
        <Box sx={{ position: 'relative', mt: { xs: 4, md: 8 } }}>
          {/* Animated connecting line (desktop) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: 34,
              left: '12.5%',
              right: '12.5%',
              height: 2,
              background: LINE.soft,
              overflow: 'hidden',
            }}
          >
            <Box
              component={motion.div}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              sx={{
                height: '100%',
                transformOrigin: 'left',
                background: 'linear-gradient(90deg, #ffaf06, #14bb87, #0A66C2, #8E44AD)',
              }}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
              gap: { xs: 3, md: 2 },
            }}
          >
            {processSteps.map((step, i) => (
              <Reveal key={step.number} delay={i * 0.15} amount={0.3}>
                <Box sx={{ textAlign: { xs: 'left', md: 'center' }, position: 'relative' }}>
                  <Box
                    component={motion.div}
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.15, type: 'spring', stiffness: 180 }}
                    sx={{
                      width: 68,
                      height: 68,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      mx: { xs: 0, md: 'auto' },
                      mb: 2.5,
                      fontWeight: 800,
                      fontSize: '1.5rem',
                      color: '#0a0a0a',
                      background: `linear-gradient(135deg, ${stepColors[i]}, ${stepColors[(i + 1) % 4]})`,
                      boxShadow: `0 10px 30px ${stepColors[i]}55`,
                      border: '4px solid #f6f9ff',
                    }}
                  >
                    {step.number}
                  </Box>
                  <Chip
                    label={step.subtitle}
                    size="small"
                    sx={{
                      mb: 1.5,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: stepColors[i],
                      background: `${stepColors[i]}14`,
                      border: `1px solid ${stepColors[i]}33`,
                    }}
                  />
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: TEXT.heading }}>
                    {step.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: TEXT.body,
                      fontSize: '0.9rem',
                      lineHeight: 1.65,
                      mb: 2,
                      maxWidth: 260,
                      mx: { xs: 0, md: 'auto' },
                    }}
                  >
                    {step.description}
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.7,
                      color: stepColors[i],
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                    {step.deliverable}
                  </Box>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default HowWeWorkSection;
