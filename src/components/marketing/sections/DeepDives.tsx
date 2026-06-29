'use client';

import { useRef } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { useReducedMotion, useScroll, useTransform } from 'framer-motion';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { deepDives } from '@/lib/marketing';
import { DISPLAY } from '../fonts';
import { Eyebrow, Glow, MotionBox, DAY, Reveal, Tilt3D } from '../primitives';
import BrowserMock from '../BrowserMock';

// Real product screenshots, mapped to each deep-dive panel.
// Keys come from src/lib/marketing.ts → deepDives[].key.
const DIVE_SHOTS: Record<string, { src: string; url: string; alt: string }> = {
  research: {
    src: '/dashboard-assets/shot-1.png',
    url: 'marketiqgpt.com/overview',
    alt: 'MarketIQ overview — plan, create and publish on autopilot',
  },
  strategy: {
    src: '/dashboard-assets/shot-3.png',
    url: 'marketiqgpt.com/gtm-os',
    alt: 'MarketIQ GTM Operating System — superhuman GTM strategy grounded in real business data',
  },
  studio: {
    src: '/dashboard-assets/shot-5.png',
    url: 'marketiqgpt.com/studio',
    alt: 'MarketIQ Content Studio — Composer, Designer, Director, Planner, Library',
  },
  publish: {
    src: '/dashboard-assets/shot-6.png',
    url: 'marketiqgpt.com/publishing',
    alt: 'MarketIQ Publishing pipeline — connect networks once, publish everywhere',
  },
  brain: {
    src: '/dashboard-assets/shot-2.png',
    url: 'marketiqgpt.com/revenue-brain',
    alt: 'MarketIQ Revenue Brain — one integrated view of the whole funnel',
  },
  frontier: {
    src: '/dashboard-assets/shot-4.png',
    url: 'marketiqgpt.com/ai-team',
    alt: 'MarketIQ AI Team — 40 specialist agents, one AI CMO orchestrating them',
  },
};

function DivePanel({ dive, index }: { dive: (typeof deepDives)[number]; index: number }) {
  const flip = index % 2 === 1;
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [60, -60]);
  const shot = DIVE_SHOTS[dive.key];

  return (
    <Box ref={ref} component="section" sx={{ position: 'relative', py: { xs: 7, md: 10 } }}>
      <Glow color={dive.color} size={560} opacity={0.09} sx={{ top: '10%', [flip ? 'left' : 'right']: '-14%' }} />
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.05fr' },
            gap: { xs: 5, md: 9 },
            alignItems: 'center',
          }}
        >
          <Box sx={{ order: { xs: 1, md: flip ? 2 : 1 } }}>
            <Reveal>
              <Eyebrow color={dive.color}>{dive.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: { xs: '1.65rem', md: '2.2rem' },
                  lineHeight: 1.16,
                  letterSpacing: '-0.025em',
                  color: DAY.text,
                }}
              >
                {dive.title}
              </Typography>
            </Reveal>
            <Reveal delay={0.12}>
              <Typography sx={{ mt: 2, fontSize: '1.04rem', lineHeight: 1.72, color: DAY.sub }}>{dive.body}</Typography>
            </Reveal>
            <Stack spacing={1.4} sx={{ mt: 3.25 }}>
              {dive.points.map((p, j) => (
                <MotionBox
                  key={p}
                  initial={{ opacity: 0, x: flip ? 18 : -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: 0.16 + j * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  sx={{ display: 'flex', gap: 1.4, alignItems: 'flex-start' }}
                >
                  <Box
                    sx={{
                      mt: '3px',
                      width: 18,
                      height: 18,
                      borderRadius: '6px',
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      background: `${dive.color}1f`,
                      border: `1px solid ${dive.color}55`,
                    }}
                  >
                    <CheckCircleRoundedIcon sx={{ fontSize: 12, color: dive.color }} />
                  </Box>
                  <Typography sx={{ fontSize: 14.5, color: DAY.sub, lineHeight: 1.6 }}>{p}</Typography>
                </MotionBox>
              ))}
            </Stack>
          </Box>

          <MotionBox style={{ y }} sx={{ order: { xs: 2, md: flip ? 1 : 2 } }}>
            <Reveal delay={0.1} y={36}>
              <Tilt3D max={6}>
                {shot ? (
                  <BrowserMock src={shot.src} alt={shot.alt} url={shot.url} accent={dive.color} />
                ) : null}
              </Tilt3D>
            </Reveal>
          </MotionBox>
        </Box>
      </Container>
    </Box>
  );
}

export default function DeepDives() {
  return (
    <Box id="features" sx={{ position: 'relative', scrollMarginTop: 80, bgcolor: DAY.bg2, overflow: 'hidden' }}>
      {deepDives.map((d, i) => (
        <DivePanel key={d.key} dive={d} index={i} />
      ))}
    </Box>
  );
}
