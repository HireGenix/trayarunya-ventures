'use client';

import React, { useState } from 'react';
import { Box, Container, Typography, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Reveal, SectionHeading, SURFACE, TEXT, CARD } from '@/components/cinematic';
import { segments } from '@/data/websiteInfo';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';

const SegmentsSection = () => {
  const [active, setActive] = useState(0);
  const seg = segments[active];

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: SURFACE.mint,
        color: TEXT.heading,
        py: { xs: 10, md: 16 },
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <SectionHeading
          eyebrow="WHO WE GROW"
          title={
            <>
              B2B, B2C or D2C —
              <br /> one engine, tuned to you
            </>
          }
          subtitle="Our flagship is B2B and high-ticket sales. But the same data-driven growth engine powers consumer and direct-to-consumer brands too. Pick your world."
        />

        {/* Switcher */}
        <Reveal>
          <Box
            sx={{
              display: 'inline-flex',
              gap: 0.5,
              p: 0.6,
              mx: 'auto',
              mt: { xs: 4, md: 6 },
              mb: { xs: 5, md: 7 },
              borderRadius: '50px',
              background: 'rgba(15,23,42,0.04)',
              border: '1px solid rgba(15,23,42,0.08)',
              position: 'relative',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {segments.map((s, i) => {
              const selected = i === active;
              return (
                <Box
                  key={s.key}
                  component="button"
                  onClick={() => setActive(i)}
                  sx={{
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    background: 'transparent',
                    px: { xs: 2.4, md: 4 },
                    py: 1.2,
                    borderRadius: '50px',
                    fontWeight: 700,
                    fontSize: { xs: '0.85rem', md: '1rem' },
                    color: selected ? '#0a0a0a' : TEXT.body,
                    transition: 'color 0.3s',
                    zIndex: 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {selected && (
                    <Box
                      component={motion.span}
                      layoutId="segPill"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50px',
                        zIndex: -1,
                        background: `linear-gradient(135deg, ${s.accent}, ${s.accent}cc)`,
                        boxShadow: `0 8px 24px ${s.accent}55`,
                      }}
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    />
                  )}
                  {s.label}
                </Box>
              );
            })}
          </Box>
        </Reveal>

        {/* Animated content swap */}
        <AnimatePresence mode="wait">
          <Box
            key={seg.key}
            component={motion.div}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: { xs: 4, md: 6 },
              alignItems: 'center',
              p: { xs: 3, md: 5 },
              borderRadius: 4,
              background: `linear-gradient(135deg, ${seg.accent}14, ${CARD.bg})`,
              border: `1px solid ${seg.accent}33`,
            }}
          >
            {/* Left: copy */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.4rem' }, color: TEXT.heading }}>
                  {seg.label}
                </Typography>
                <Chip
                  icon={seg.flagship ? <StarIcon sx={{ fontSize: '16px !important', color: '#0a0a0a !important' }} /> : undefined}
                  label={seg.badge}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    color: seg.flagship ? '#0a0a0a' : seg.accent,
                    background: seg.flagship ? seg.accent : `${seg.accent}14`,
                    border: `1px solid ${seg.accent}33`,
                  }}
                />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: seg.accent, mb: 1.5 }}>
                {seg.tagline}
              </Typography>
              <Typography sx={{ color: TEXT.body, fontSize: '1rem', lineHeight: 1.7, mb: 3 }}>
                {seg.description}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {seg.channels.map((c) => (
                  <Box
                    key={c}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.6,
                      px: 1.6,
                      py: 0.7,
                      borderRadius: '50px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: TEXT.body,
                      background: CARD.bg,
                      border: CARD.border,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 14, color: seg.accent }} />
                    {c}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Right: outcome stats */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {seg.outcomes.map((o, i) => (
                <Box
                  key={o.label}
                  component={motion.div}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2.5,
                    p: 2.5,
                    borderRadius: 3,
                    background: CARD.bg,
                    border: CARD.border,
                    boxShadow: CARD.shadow,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: '1.8rem', md: '2.2rem' },
                      lineHeight: 1,
                      minWidth: 90,
                      background: `linear-gradient(135deg, ${seg.accent}, ${seg.accent}99)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {o.value}
                  </Typography>
                  <Typography sx={{ color: TEXT.body, fontSize: '0.95rem' }}>
                    {o.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </AnimatePresence>
      </Container>
    </Box>
  );
};

export default SegmentsSection;
