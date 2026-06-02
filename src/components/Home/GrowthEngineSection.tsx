'use client';

import React from 'react';
import { Box, Container, Typography, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { Reveal, SectionHeading, AnimatedCounter, SURFACE, TEXT, CARD, LINE } from '@/components/cinematic';
import { AIBrainAnimation, StageAnimation } from '@/components/cinematic/animations';
import { growthEngine } from '@/data/websiteInfo';

const GrowthEngineSection = () => {
  const { brain, stages } = growthEngine;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: SURFACE.white,
        color: TEXT.heading,
        py: { xs: 10, md: 16 },
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <SectionHeading
          eyebrow="THE GROWTH ENGINE"
          title={
            <>
              Watch how the machine
              <br /> actually works
            </>
          }
          subtitle="No black box. This is the AI-orchestrated system we run every day — from filtering leads to scaling ads. Every decision driven by data, every step executed by us."
        />

        {/* AI Brain */}
        <Reveal>
          <Box
            sx={{
              maxWidth: 720,
              mx: 'auto',
              mt: { xs: 4, md: 7 },
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              background: CARD.bg,
              border: CARD.border,
              boxShadow: CARD.shadow,
            }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: 3, alignItems: 'center' }}>
              <Box sx={{ order: { xs: 2, md: 1 } }}>
                <Chip
                  label={brain.label}
                  size="small"
                  sx={{ mb: 1.5, fontWeight: 700, fontSize: '0.7rem', color: '#0a0a0a', background: 'linear-gradient(135deg,#ffaf06,#14bb87)' }}
                />
                <Typography sx={{ color: TEXT.body, fontSize: '0.95rem', lineHeight: 1.7 }}>
                  {brain.description}
                </Typography>
              </Box>
              <Box sx={{ order: { xs: 1, md: 2 } }}>
                <AIBrainAnimation />
              </Box>
            </Box>
          </Box>
        </Reveal>

        {/* Vertical pipeline of stages */}
        <Box sx={{ position: 'relative', mt: { xs: 6, md: 10 } }}>
          {/* central line (desktop) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              width: 2,
              transform: 'translateX(-50%)',
              background: LINE.soft,
              overflow: 'hidden',
            }}
          >
            <Box
              component={motion.div}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
              sx={{
                width: '100%',
                height: '100%',
                transformOrigin: 'top',
                background: 'linear-gradient(180deg, #ffaf06, #14bb87, #0A66C2)',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 8 } }}>
            {stages.map((stage, i) => {
              const animLeft = i % 2 === 0;
              return (
                <Reveal key={stage.key} amount={0.3}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
                      gap: { xs: 2, md: 4 },
                      alignItems: 'center',
                    }}
                  >
                    {/* Animation cell */}
                    <Box sx={{ order: { xs: 2, md: animLeft ? 1 : 3 } }}>
                      <Box
                        component={motion.div}
                        whileHover={{ y: -4 }}
                        sx={{
                          p: { xs: 2, md: 2.5 },
                          borderRadius: 3,
                          background: CARD.bg,
                          border: `1px solid ${stage.accent}33`,
                          boxShadow: `0 20px 50px -20px ${stage.accent}40`,
                        }}
                      >
                        <StageAnimation name={stage.animation} />
                      </Box>
                    </Box>

                    {/* Node (desktop center) */}
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'grid' },
                        order: 2,
                        placeItems: 'center',
                      }}
                    >
                      <Box
                        component={motion.div}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true, amount: 0.6 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                        sx={{
                          width: 54,
                          height: 54,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 800,
                          color: '#0a0a0a',
                          background: `linear-gradient(135deg, ${stage.accent}, #e2e8f0)`,
                          border: '4px solid #ffffff',
                          boxShadow: `0 0 0 4px ${stage.accent}33`,
                        }}
                      >
                        {stage.step}
                      </Box>
                    </Box>

                    {/* Text cell */}
                    <Box sx={{ order: { xs: 1, md: animLeft ? 3 : 1 }, textAlign: { xs: 'left', md: animLeft ? 'left' : 'right' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: { xs: 'flex-start', md: animLeft ? 'flex-start' : 'flex-end' } }}>
                        <Chip
                          label={`STEP ${stage.step}`}
                          size="small"
                          sx={{ display: { xs: 'inline-flex', md: 'none' }, fontWeight: 700, fontSize: '0.65rem', color: stage.accent, background: `${stage.accent}14`, border: `1px solid ${stage.accent}33` }}
                        />
                        <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, color: TEXT.heading }}>
                          {stage.title}
                        </Typography>
                      </Box>
                      <Typography sx={{ color: TEXT.body, fontSize: '0.95rem', lineHeight: 1.7, mb: 2, maxWidth: 380, ml: { xs: 0, md: animLeft ? 0 : 'auto' } }}>
                        {stage.description}
                      </Typography>
                      <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 1 }}>
                        <AnimatedCounter
                          value={stage.metricValue}
                          suffix={stage.metricSuffix}
                          decimals={stage.metricDecimals ?? 0}
                          sx={{
                            fontWeight: 800,
                            fontSize: { xs: '1.8rem', md: '2.2rem' },
                            lineHeight: 1,
                            color: stage.accent,
                          }}
                        />
                        <Typography sx={{ color: TEXT.muted, fontSize: '0.85rem' }}>
                          {stage.metricLabel}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Reveal>
              );
            })}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default GrowthEngineSection;
