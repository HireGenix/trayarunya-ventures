'use client';

import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { decks } from '@/lib/marketing';
import { DISPLAY } from '../fonts';
import { Eyebrow, Glow, MotionBox, DAY, Reveal } from '../primitives';

const SLIDES = [
  {
    kicker: 'WHY MARKETIQ',
    title: 'The category-of-one playbook',
    blocks: [
      ['#FF9D00', 'Research'],
      ['#0EA47A', 'Strategy'],
      ['#F43F5E', 'Studio'],
      ['#8B5CF6', 'Learn'],
    ],
  },
  {
    kicker: 'PROCESS',
    title: 'Five stages, one loop',
    blocks: [
      ['#0EA47A', '01 · Research'],
      ['#FF9D00', '02 · Strategy'],
      ['#2E7CF6', '03 · Publish'],
      ['#8B5CF6', '04 · Learn'],
    ],
  },
  {
    kicker: 'RESULTS',
    title: 'Pipeline, not vanity metrics',
    blocks: [
      ['#FF9D00', '+218% reach'],
      ['#0EA47A', '+47 pipeline'],
      ['#2E7CF6', '120h saved'],
      ['#F43F5E', 'CPA −32%'],
    ],
  },
] as const;

/** A miniature on-brand slide. */
function Slide({ slide }: { slide: (typeof SLIDES)[number] }) {
  return (
    <Box
      sx={{
        width: { xs: 250, md: 320 },
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#FFFFFF',
        color: '#0E1116',
        p: 2.5,
        boxShadow: '0 40px 80px -36px rgba(12,20,36,0.35)',
        border: '1px solid rgba(13,23,44,0.10)',
      }}
    >
      <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#0FA874', mb: 0.5 }}>
        {slide.kicker}
      </Typography>
      <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, mb: 1.75, color: '#0E1116' }}>
        {slide.title}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        {slide.blocks.map(([c, label]) => (
          <Box key={label} sx={{ borderRadius: '10px', p: 1.25, bgcolor: `${c}12`, border: `1px solid ${c}30` }}>
            <Box sx={{ width: 20, height: 20, borderRadius: '7px', mb: 0.75, background: `linear-gradient(135deg, ${c}, ${c}aa)` }} />
            <Typography sx={{ fontWeight: 700, fontSize: 11.5, color: '#0E1116' }}>{label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Fanned 3D stack of slides that spreads on hover. */
function DeckFan() {
  const reduced = useReducedMotion();
  const base = {
    position: 'absolute' as const,
    top: 0,
    left: '50%',
    transition: 'transform .55s cubic-bezier(.22,1,.36,1)',
  };
  return (
    <Box
      sx={{
        position: 'relative',
        height: { xs: 320, md: 380 },
        perspective: '1400px',
        '&:hover .fan-0': { transform: 'translateX(-50%) translateX(-46%) rotate(-10deg) rotateY(10deg) translateY(6px)' },
        '&:hover .fan-1': { transform: 'translateX(-50%) translateY(-16px) scale(1.04)' },
        '&:hover .fan-2': { transform: 'translateX(-50%) translateX(46%) rotate(10deg) rotateY(-10deg) translateY(6px)' },
      }}
    >
      <Box className="fan-0" sx={{ ...base, transform: 'translateX(-50%) translateX(-26%) rotate(-7deg)', zIndex: 1, ...(reduced ? {} : { animation: 'fan-bob-a 7s ease-in-out infinite' }) }}>
        <Slide slide={SLIDES[1]} />
      </Box>
      <Box className="fan-2" sx={{ ...base, transform: 'translateX(-50%) translateX(26%) rotate(7deg)', zIndex: 1, ...(reduced ? {} : { animation: 'fan-bob-b 8s ease-in-out infinite' }) }}>
        <Slide slide={SLIDES[2]} />
      </Box>
      <Box className="fan-1" sx={{ ...base, transform: 'translateX(-50%)', zIndex: 2, ...(reduced ? {} : { animation: 'fan-bob-c 6s ease-in-out infinite' }) }}>
        <Slide slide={SLIDES[0]} />
      </Box>
      <Box
        component="style"
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes fan-bob-a { 0%,100% { margin-top: 0 } 50% { margin-top: -10px } }
          @keyframes fan-bob-b { 0%,100% { margin-top: 0 } 50% { margin-top: -14px } }
          @keyframes fan-bob-c { 0%,100% { margin-top: 0 } 50% { margin-top: -7px } }`,
        }}
      />
    </Box>
  );
}

export default function Decks() {
  return (
    <Box
      id="decks"
      component="section"
      sx={{ position: 'relative', py: { xs: 10, md: 15 }, scrollMarginTop: 80, bgcolor: DAY.bg2, overflow: 'hidden' }}
    >
      <Glow color={DAY.amber} size={620} sx={{ top: '-14%', left: '-10%' }} opacity={0.1} />
      <Glow color={DAY.violet} size={560} sx={{ bottom: '-16%', right: '-8%' }} opacity={0.1} />

      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 6, md: 8 }, alignItems: 'center' }}>
          <Box>
            <Reveal>
              <Eyebrow color={DAY.amber}>{decks.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: { xs: '1.7rem', md: '2.25rem' },
                  lineHeight: 1.16,
                  letterSpacing: '-0.025em',
                  color: DAY.text,
                }}
              >
                {decks.title}
              </Typography>
            </Reveal>
            <Reveal delay={0.12}>
              <Typography sx={{ mt: 2, fontSize: '1.04rem', lineHeight: 1.72, color: DAY.sub }}>{decks.subtitle}</Typography>
            </Reveal>
            <Stack spacing={1.5} sx={{ mt: 3.25 }}>
              {decks.features.map((f, j) => (
                <MotionBox
                  key={f}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: 0.15 + j * 0.08, duration: 0.45 }}
                  sx={{ display: 'flex', gap: 1.4, alignItems: 'flex-start' }}
                >
                  <CheckCircleRoundedIcon sx={{ fontSize: 20, color: DAY.teal, mt: '2px', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 14.5, color: DAY.sub, lineHeight: 1.6 }}>{f}</Typography>
                </MotionBox>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 3.5, flexWrap: 'wrap', gap: 1 }}>
              {['Regenerate design', 'Edit with AI', 'Generate image', 'Export PPTX'].map((t) => (
                <Chip
                  key={t}
                  label={t}
                  size="small"
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: DAY.text,
                    bgcolor: '#FFFFFF',
                    border: `1px solid ${DAY.line}`,
                    '&:hover': { borderColor: DAY.amber, color: DAY.amber },
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Reveal delay={0.15} y={40}>
            <DeckFan />
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}
