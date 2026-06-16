'use client';

import { useRef } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { useReducedMotion, useScroll, useTransform } from 'framer-motion';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { deepDives } from '@/lib/marketing';
import { DISPLAY } from '../fonts';
import { Eyebrow, Glow, MotionBox, DAY, Reveal, Tilt3D } from '../primitives';

const CONSOLE_ROWS: string[][] = [
  ['Crawling acme.com — 214 pages', 'Mapping 1,240 demand signals', 'Reading 18 competitors', 'Clustering 96 audience questions'],
  ['Positioning locked', '5 content pillars defined', 'Funnel: TOFU → BOFU mapped', '4-week calendar generated'],
  ['Draft: “The 7-figure playbook”', 'Carousel · 8 slides rendered', 'Deck · 14 slides (Gamma-style)', 'QA gate: brand & tone passed'],
  ['Scheduled · LinkedIn + X', 'Ad set live · CPA down 32%', 'Budget reallocated to winners', 'Attribution: 12 MQLs this week'],
  ['AI CMO · directives dispatched', 'Outcome ledger updated · 1,284 events', 'Learned: carousels +38% reply rate', 'Policy synced to all 41 agents'],
  ['AEO scan · cited #2 on "best B2B tools"', 'Retail media · Amazon ROAS 4.2× planned', 'Zero-party form · 340 preferences captured', 'Synthetic UGC · 6 disclosed AI creatives approved'],
];

/** Light "agent console" card with typed rows, scanning beam and live status. */
function AgentConsole({ index, color }: { index: number; color: string }) {
  const reduced = useReducedMotion();
  const rows = CONSOLE_ROWS[index];
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: '22px',
        p: 2.5,
        background: 'linear-gradient(180deg, #FFFFFF, #F8FBFE)',
        border: `1px solid ${DAY.line}`,
        boxShadow: `0 40px 90px -44px rgba(12,20,36,0.28), 0 0 80px -40px ${color}33`,
        overflow: 'hidden',
      }}
    >
      {/* scanning beam */}
      {!reduced && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 90,
            background: `linear-gradient(180deg, transparent, ${color}14, transparent)`,
            animation: 'console-scan 4.4s ease-in-out infinite',
            '@keyframes console-scan': {
              '0%': { top: '-30%' },
              '60%': { top: '110%' },
              '100%': { top: '110%' },
            },
          }}
        />
      )}

      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2, position: 'relative' }}>
        <Stack direction="row" spacing={0.6}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c, opacity: 0.9 }} />
          ))}
        </Stack>
        <Typography sx={{ color: DAY.faint, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
          AGENT · LIVE
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: color,
            boxShadow: `0 0 0 4px ${color}26, 0 0 12px ${color}`,
            animation: reduced ? 'none' : 'live-blink 1.8s ease-in-out infinite',
            '@keyframes live-blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
          }}
        />
      </Stack>

      <Stack spacing={1.1} sx={{ position: 'relative' }}>
        {rows.map((r, j) => (
          <MotionBox
            key={r}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: j * 0.16, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            sx={{
              px: 1.75,
              py: 1.3,
              borderRadius: '12px',
              bgcolor: '#F3F7FB',
              border: `1px solid ${DAY.lineSoft}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 16, color }} />
            <Typography sx={{ fontSize: 13.2, color: 'rgba(20,30,50,0.85)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              {r}
            </Typography>
          </MotionBox>
        ))}
        {/* typing cursor row */}
        <Box sx={{ px: 1.75, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 12.5, color, fontWeight: 700 }}>▸</Typography>
          <Box
            sx={{
              width: 9,
              height: 16,
              bgcolor: color,
              borderRadius: 0.5,
              animation: reduced ? 'none' : 'caret-blink 1s steps(1) infinite',
              '@keyframes caret-blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
}

function DivePanel({ dive, index }: { dive: (typeof deepDives)[number]; index: number }) {
  const flip = index % 2 === 1;
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [60, -60]);

  return (
    <Box ref={ref} component="section" sx={{ position: 'relative', py: { xs: 7, md: 10 } }}>
      <Glow color={dive.color} size={560} opacity={0.09} sx={{ top: '10%', [flip ? 'left' : 'right']: '-14%' }} />
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
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
                    <Box sx={{ width: 7, height: 7, borderRadius: '2px', background: dive.color, boxShadow: `0 0 8px ${dive.color}66` }} />
                  </Box>
                  <Typography sx={{ fontSize: 14.5, color: DAY.sub, lineHeight: 1.6 }}>{p}</Typography>
                </MotionBox>
              ))}
            </Stack>
          </Box>

          <MotionBox style={{ y }} sx={{ order: { xs: 2, md: flip ? 1 : 2 } }}>
            <Reveal delay={0.1} y={36}>
              <Tilt3D max={7}>
                <AgentConsole index={index} color={dive.color} />
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
