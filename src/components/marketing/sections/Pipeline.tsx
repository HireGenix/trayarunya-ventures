'use client';

import { Box, Button, Container, Typography } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { DISPLAY } from '../fonts';
import { DAY, GradientText, Glow, GridBg, MotionBox, Reveal, SectionHeading } from '../primitives';

/* ------------------------------------------------------------------ */
/* Data                                                                  */
/* ------------------------------------------------------------------ */

const RING_COUNT = 8;

const STEPS = [
  {
    num: '01',
    title: 'Connect Your Workspace',
    desc: 'Upload brand docs, set your ICP, and connect ad accounts, CRMs and social platforms — no coding needed.',
    bgColor: '#E4F8F0',
    ringColor: '#0EA47A44',
    numColor: '#0EA47A',
    blobColor: '#0EA47A',
  },
  {
    num: '02',
    title: 'AI Crafts Your Strategy',
    desc: "MarketiQ's agentic AI generates campaigns, content briefs, ad copy, SEO keywords and email sequences aligned to your ICP.",
    bgColor: '#F3EEFF',
    ringColor: '#8B5CF644',
    numColor: '#8B5CF6',
    blobColor: '#8B5CF6',
  },
  {
    num: '03',
    title: 'Execute & Optimize on Autopilot',
    desc: 'Publish across channels, track performance in real-time, and let the AI retarget, reallocate budget and A/B test continuously.',
    bgColor: '#FFF6E0',
    ringColor: '#FF9D0044',
    numColor: '#FF9D00',
    blobColor: '#FF9D00',
  },
] as const;

/* ------------------------------------------------------------------ */
/* Mini UI illustrations per step                                        */
/* ------------------------------------------------------------------ */

function MiniUIStep1() {
  const integrations = [
    { label: 'Google Ads', color: '#4285F4' },
    { label: 'HubSpot', color: '#FF7A59' },
    { label: 'LinkedIn', color: '#0A66C2' },
  ];
  return (
    <Box
      sx={{
        background: DAY.panel,
        borderRadius: '16px',
        border: `1px solid ${DAY.line}`,
        boxShadow: '0 2px 8px rgba(12,20,36,0.07)',
        p: 2,
      }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: DAY.sub, letterSpacing: '0.1em', mb: 1.5, textTransform: 'uppercase' }}>
        Connected Platforms
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        {integrations.map((int) => (
          <Box
            key={int.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
              px: 1.25,
              py: 0.5,
              borderRadius: '8px',
              border: `1px solid ${int.color}33`,
              background: `${int.color}0d`,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: int.color,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: DAY.text }}>{int.label}</Typography>
            <Typography sx={{ fontSize: 11, color: '#0EA47A', fontWeight: 700 }}>✓</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ borderTop: `1px solid ${DAY.line}`, pt: 1 }}>
        <Typography
          sx={{
            fontSize: 11.5,
            color: '#0EA47A',
            fontWeight: 600,
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          + Import via CSV
        </Typography>
      </Box>
    </Box>
  );
}

function MiniUIStep2() {
  const pills = [
    { label: 'CTR', value: '4.2%', color: '#8B5CF6' },
    { label: 'ROAS', value: '3.1×', color: '#0EA47A' },
    { label: 'Opens', value: '38%', color: '#FF9D00' },
  ];
  return (
    <Box
      sx={{
        background: DAY.panel,
        borderRadius: '16px',
        border: `1px solid ${DAY.line}`,
        boxShadow: '0 2px 8px rgba(12,20,36,0.07)',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: DAY.text }}>Summer Launch Campaign</Typography>
        <Box sx={{ px: 1, py: 0.3, borderRadius: 999, background: '#8B5CF614', border: '1px solid #8B5CF644' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6' }}>AI Draft</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1.75, flexWrap: 'wrap' }}>
        {pills.map((p) => (
          <Box
            key={p.label}
            sx={{
              px: 1,
              py: 0.4,
              borderRadius: '8px',
              background: `${p.color}12`,
              border: `1px solid ${p.color}33`,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Typography sx={{ fontSize: 10.5, color: DAY.sub, fontWeight: 500 }}>{p.label}</Typography>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: p.color }}>{p.value}</Typography>
          </Box>
        ))}
      </Box>
      {/* gradient progress bar */}
      <Box sx={{ height: 5, borderRadius: 999, background: DAY.bg2, overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            width: '68%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #8B5CF6, #0EA47A)',
          }}
        />
      </Box>
      <Typography sx={{ fontSize: 10, color: DAY.faint, mt: 0.6 }}>68% of campaign goal reached</Typography>
    </Box>
  );
}

function MiniUIStep3() {
  /* simple sparkline SVG path going up */
  const sparklinePath = 'M0,40 C10,38 20,32 30,28 C40,24 50,26 60,20 C70,14 80,10 90,6 C95,4 98,2 100,0';
  const stats = [
    { label: 'Leads', value: '142' },
    { label: 'Budget saved', value: '23%' },
    { label: 'Conversion', value: '+18%' },
  ];
  return (
    <Box
      sx={{
        background: DAY.panel,
        borderRadius: '16px',
        border: `1px solid ${DAY.line}`,
        boxShadow: '0 2px 8px rgba(12,20,36,0.07)',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: DAY.text }}>Performance</Typography>
        <Box sx={{ px: 1, py: 0.3, borderRadius: 999, background: '#FF9D0014', border: '1px solid #FF9D0044' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#FF9D00' }}>Live</Typography>
        </Box>
      </Box>
      {/* sparkline */}
      <Box sx={{ mb: 1.5 }}>
        <Box
          component="svg"
          viewBox="0 0 100 44"
          preserveAspectRatio="none"
          sx={{ width: '100%', height: 44, display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF9D00" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#FF9D00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${sparklinePath} L100,44 L0,44 Z`}
            fill="url(#spark-fill)"
          />
          <path
            d={sparklinePath}
            fill="none"
            stroke="#FF9D00"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Box>
      </Box>
      {/* stat numbers */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {stats.map((s) => (
          <Box key={s.label} sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: DAY.text }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 10, color: DAY.faint }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

const MINI_UIS = [<MiniUIStep1 key="s1" />, <MiniUIStep2 key="s2" />, <MiniUIStep3 key="s3" />];

/* ------------------------------------------------------------------ */
/* Notebook rings — rendered on both left and right edges               */
/* ------------------------------------------------------------------ */

function NotebookRings({ bgColor, ringColor }: { bgColor: string; ringColor: string }) {
  return (
    <>
      {/* Left rings */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: -7,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          zIndex: 2,
          py: '24px',
        }}
      >
        {Array.from({ length: RING_COUNT }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: DAY.panel,
              border: `1.5px solid ${ringColor}`,
              boxShadow: `0 0 0 2px ${bgColor}`,
              flexShrink: 0,
            }}
          />
        ))}
      </Box>
      {/* Right rings */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: -7,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          zIndex: 2,
          py: '24px',
        }}
      >
        {Array.from({ length: RING_COUNT }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: DAY.panel,
              border: `1.5px solid ${ringColor}`,
              boxShadow: `0 0 0 2px ${bgColor}`,
              flexShrink: 0,
            }}
          />
        ))}
      </Box>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Notebook card                                                         */
/* ------------------------------------------------------------------ */

function NotebookCard({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const reduced = useReducedMotion();
  return (
    <MotionBox
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      sx={{ position: 'relative', mx: '10px' /* room for rings */ }}
    >
      {/* outer container card */}
      <Box
        sx={{
          background: DAY.panel,
          borderRadius: '24px',
          border: `1px solid ${step.ringColor}`,
          boxShadow: '0 2px 4px rgba(12,20,36,0.04), 0 20px 48px -20px rgba(12,20,36,0.12)',
          position: 'relative',
          minHeight: { xs: 'auto', md: 480 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
        }}
      >
        <NotebookRings bgColor={step.bgColor} ringColor={step.ringColor} />

        {/* inner card with step bgcolor */}
        <Box
          sx={{
            bgcolor: step.bgColor,
            borderRadius: '24px',
            p: 3.5,
            position: 'relative',
            overflow: 'hidden',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* top-right blob */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${step.blobColor}14, transparent 68%)`,
              pointerEvents: 'none',
            }}
          />

          {/* watermark step number */}
          <Typography
            aria-hidden
            sx={{
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: { xs: 72, md: 88 },
              lineHeight: 1,
              color: step.numColor,
              opacity: 0.18,
              letterSpacing: '-0.04em',
              mb: -1,
              userSelect: 'none',
            }}
          >
            {step.num}
          </Typography>

          {/* title */}
          <Typography
            sx={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: { xs: 20, md: 22 },
              color: DAY.text,
              mb: 1,
              lineHeight: 1.25,
              position: 'relative',
            }}
          >
            {step.title}
          </Typography>

          {/* description */}
          <Typography
            sx={{
              fontSize: 14,
              lineHeight: 1.65,
              color: DAY.sub,
              mb: 2.5,
              position: 'relative',
            }}
          >
            {step.desc}
          </Typography>

          {/* mini UI illustration */}
          <Box sx={{ mt: 'auto', position: 'relative' }}>{MINI_UIS[index]}</Box>
        </Box>
      </Box>
    </MotionBox>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                               */
/* ------------------------------------------------------------------ */

export default function Pipeline() {
  return (
    <Box
      id="how"
      component="section"
      sx={{
        position: 'relative',
        py: { xs: 10, md: 14 },
        scrollMarginTop: 80,
        bgcolor: DAY.bg,
        overflow: 'hidden',
      }}
    >
      <GridBg opacity={0.3} />
      <Glow color={DAY.teal} size={600} sx={{ top: '-6%', left: '-12%' }} opacity={0.08} />
      <Glow color={DAY.violet} size={540} sx={{ bottom: '-10%', right: '-8%' }} opacity={0.08} />

      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <SectionHeading
          eyebrow="QUICK START"
          title={
            <>
              How MarketiQ Works{' '}
              <GradientText>in 3 Steps</GradientText>
            </>
          }
          subtitle="From onboarding to full-funnel execution in minutes — no marketing ops team required."
        />

        {/* 3-column notebook card grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
            /* allow rings to overflow */
            overflow: 'visible',
            px: '10px',
            mx: '-10px',
          }}
        >
          {STEPS.map((step, i) => (
            <NotebookCard key={step.num} step={step} index={i} />
          ))}
        </Box>

        {/* CTA */}
        <Reveal delay={0.4}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 6, md: 8 } }}>
            <Button
              component={Link}
              href="https://mymarketiq.online"
              variant="outlined"
              sx={{
                border: `1.5px solid ${DAY.line}`,
                borderRadius: 999,
                py: 1.25,
                px: 4,
                color: DAY.text,
                fontWeight: 600,
                fontSize: 15,
                textTransform: 'none',
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: DAY.teal,
                  color: DAY.teal,
                  background: `${DAY.teal}08`,
                },
              }}
            >
              See How It Works →
            </Button>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}
