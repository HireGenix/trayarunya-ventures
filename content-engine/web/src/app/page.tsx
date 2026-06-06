'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AppleIcon from '@mui/icons-material/Apple';
import EastRoundedIcon from '@mui/icons-material/EastRounded';

import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { BrandMark } from '@/components/marketing/Logo';
import { Reveal, GradientText, SectionHeading, Eyebrow, MotionBox } from '@/components/marketing/primitives';
import {
  hero,
  trustLine,
  loop,
  deepDives,
  modules,
  decks,
  desktop,
  segments,
  stack,
  stats,
  pricing,
  faqs,
  finalCta,
  BRAND,
} from '@/lib/marketing';

const GRADIENT_BTN = {
  px: 3.4,
  py: 1.3,
  fontWeight: 700,
  borderRadius: '999px',
  color: '#0a0a0a',
  background: 'linear-gradient(135deg,#FFAF06,#14BB87)',
  boxShadow: '0 16px 36px -16px rgba(255,175,6,0.7)',
  '&:hover': { filter: 'brightness(1.05)', background: 'linear-gradient(135deg,#FFAF06,#14BB87)' },
};

export default function Landing() {
  return (
    <Box sx={{ bgcolor: '#FFFFFF', overflowX: 'hidden' }}>
      <MarketingNav />
      <HeroSection />
      <TrustStrip />
      <LoopSection />
      <DeepDiveSections />
      <ModulesSection />
      <DecksSection />
      <DesktopSection />
      <SegmentsSection />
      <StackSection />
      <StatsBand />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <MarketingFooter />
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* Hero                                                                     */
/* ----------------------------------------------------------------------- */
function HeroSection() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        pt: { xs: 14, md: 20 },
        pb: { xs: 8, md: 12 },
        background:
          'radial-gradient(1100px 520px at 80% -8%, rgba(20,187,135,0.12), transparent 60%), radial-gradient(900px 480px at 5% 0%, rgba(255,175,6,0.14), transparent 58%)',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' }, gap: { xs: 6, md: 5 }, alignItems: 'center' }}>
          <Box>
            <Reveal>
              <Chip
                label={hero.badge}
                sx={{
                  mb: 3,
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: '#0E1116',
                  border: '1px solid rgba(20,187,135,0.3)',
                  bgcolor: 'rgba(20,187,135,0.08)',
                }}
              />
            </Reveal>
            <Reveal delay={0.06}>
              <Typography
                component="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2.4rem', sm: '3rem', md: '3.6rem' },
                  lineHeight: 1.05,
                  letterSpacing: '-0.035em',
                  color: '#0E1116',
                }}
              >
                {hero.titleLead} <GradientText>{hero.titleGradient}</GradientText> {hero.titleTail}
              </Typography>
            </Reveal>
            <Reveal delay={0.12}>
              <Typography sx={{ mt: 3, fontSize: { xs: '1.05rem', md: '1.18rem' }, lineHeight: 1.65, color: '#46505F', maxWidth: 600 }}>
                {hero.subtitle}
              </Typography>
            </Reveal>
            <Reveal delay={0.18}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75} sx={{ mt: 4.5 }}>
                <Button component={Link} href="/signup" size="large" sx={GRADIENT_BTN} endIcon={<ArrowForwardRoundedIcon />}>
                  {hero.primaryCta}
                </Button>
                <Button
                  component="a"
                  href="#how"
                  size="large"
                  variant="outlined"
                  sx={{ px: 3.4, py: 1.3, fontWeight: 700, borderRadius: 999, color: '#0E1116', borderColor: 'rgba(14,17,22,0.2)', '&:hover': { borderColor: '#14BB87', bgcolor: 'rgba(20,187,135,0.05)' } }}
                >
                  {hero.secondaryCta}
                </Button>
              </Stack>
            </Reveal>
            <Reveal delay={0.24}>
              <Typography sx={{ mt: 2.5, fontSize: 13.5, color: '#7A8493' }}>{hero.microProof}</Typography>
            </Reveal>
            <Reveal delay={0.3}>
              <Stack direction="row" spacing={1} sx={{ mt: 3.5, flexWrap: 'wrap', gap: 1 }}>
                {hero.audiences.map((a) => (
                  <Chip key={a} label={a} variant="outlined" size="small" sx={{ fontWeight: 600, color: '#46505F', borderColor: 'rgba(14,17,22,0.14)' }} />
                ))}
              </Stack>
            </Reveal>
          </Box>

          <Reveal delay={0.18} y={36}>
            <HeroVisual />
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

function HeroVisual() {
  const chips = ['Research', 'Strategy', 'Studio', 'Decks', 'Publish', 'Ads', 'Learn'];
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 5,
        p: { xs: 2, md: 2.5 },
        background: '#0E1726',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 40px 90px -40px rgba(14,23,38,0.6)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, pb: 1.75 }}>
        <Stack direction="row" spacing={0.6}>
          {['#ff5a5f', '#FFAF06', '#14BB87'].map((c) => (
            <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
          ))}
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          label="MarketiQ AI · workspace"
          size="small"
          sx={{ height: 22, fontSize: 11, fontWeight: 700, color: '#0a0a0a', background: 'linear-gradient(90deg,#FFAF06,#14BB87)' }}
        />
      </Stack>

      <Box sx={{ borderRadius: 4, bgcolor: '#0B1220', p: { xs: 2.25, md: 3 }, border: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', mb: 2 }}>
          THE CLOSED LOOP
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {chips.map((c, i) => (
            <MotionBox
              key={c}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09, duration: 0.4 }}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Box
                sx={{
                  px: 1.6,
                  py: 0.9,
                  borderRadius: 2,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'linear-gradient(135deg, rgba(255,175,6,0.18), rgba(20,187,135,0.18))',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {c}
              </Box>
              {i < chips.length - 1 && <EastRoundedIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }} />}
            </MotionBox>
          ))}
        </Box>

        <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {[
            ['Strategy', BRAND.amber],
            ['Decks', BRAND.violet],
            ['Ads', BRAND.pink],
            ['Forecast', BRAND.teal],
            ['ABM', BRAND.blue],
            ['CRO', BRAND.pink],
            ['Calendar', BRAND.blue],
            ['Attribution', BRAND.teal],
          ].map(([label, color], i) => (
            <MotionBox
              key={label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}
              sx={{
                borderRadius: 2,
                p: 1.25,
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Box sx={{ width: 18, height: 18, borderRadius: '6px', mb: 0.75, background: color as string }} />
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>{label}</Typography>
            </MotionBox>
          ))}
        </Box>

        <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
          {[
            ['Reach', '+218%'],
            ['Pipeline', '+47'],
            ['Hours saved', '120/mo'],
          ].map(([k, v]) => (
            <Box key={k}>
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>{v}</Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{k}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* Trust strip                                                              */
/* ----------------------------------------------------------------------- */
function TrustStrip() {
  return (
    <Box sx={{ py: 3, borderTop: '1px solid #F0F1F3', borderBottom: '1px solid #F0F1F3', bgcolor: '#FAFBFC' }}>
      <Container maxWidth="lg">
        <Typography sx={{ textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: '#7A8493', letterSpacing: '0.02em' }}>
          {trustLine}
        </Typography>
      </Container>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* The closed loop                                                          */
/* ----------------------------------------------------------------------- */
function LoopSection() {
  return (
    <Box id="how" component="section" sx={{ py: { xs: 9, md: 14 }, scrollMarginTop: 80 }}>
      <Container maxWidth="lg">
        <SectionHeading eyebrow={loop.eyebrow} title={loop.title} subtitle={loop.subtitle} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, 1fr)' }, gap: 2.5 }}>
          {loop.stages.map((s, i) => (
            <Reveal key={s.key} delay={i * 0.06}>
              <Box
                sx={{
                  height: '100%',
                  p: 3,
                  borderRadius: 3.5,
                  bgcolor: '#fff',
                  border: '1px solid #ECEEF1',
                  position: 'relative',
                  transition: 'transform .25s ease, box-shadow .25s ease',
                  '&:hover': { transform: 'translateY(-6px)', boxShadow: `0 24px 48px -28px ${s.color}88` },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    color: '#fff',
                    mb: 2,
                    background: `linear-gradient(135deg, ${s.color}, ${s.color}b3)`,
                    boxShadow: `0 10px 22px -10px ${s.color}`,
                  }}
                >
                  {s.n}
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: 17, color: '#0E1116', mb: 1 }}>{s.title}</Typography>
                <Typography sx={{ fontSize: 13.8, lineHeight: 1.65, color: '#5A6472' }}>{s.desc}</Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* Deep-dive feature sections (alternating)                                 */
/* ----------------------------------------------------------------------- */
function DeepDiveSections() {
  return (
    <Box id="features" sx={{ scrollMarginTop: 80 }}>
      {deepDives.map((d, i) => {
        const flip = i % 2 === 1;
        return (
          <Box key={d.key} component="section" sx={{ py: { xs: 7, md: 11 }, bgcolor: flip ? '#FAFBFC' : '#fff' }}>
            <Container maxWidth="lg">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 4, md: 7 }, alignItems: 'center' }}>
                <Reveal>
                  <Box sx={{ order: { xs: 1, md: flip ? 2 : 1 } }}>
                    <Eyebrow color={d.color}>{d.eyebrow}</Eyebrow>
                    <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '2.05rem' }, lineHeight: 1.18, letterSpacing: '-0.025em', color: '#0E1116' }}>
                      {d.title}
                    </Typography>
                    <Typography sx={{ mt: 2, fontSize: '1.05rem', lineHeight: 1.7, color: '#5A6472' }}>{d.body}</Typography>
                    <Stack spacing={1.5} sx={{ mt: 3 }}>
                      {d.points.map((p) => (
                        <Stack key={p} direction="row" spacing={1.4} alignItems="flex-start">
                          <CheckCircleRoundedIcon sx={{ fontSize: 21, color: d.color, mt: '1px', flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 15, color: '#374151', lineHeight: 1.55 }}>{p}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Reveal>
                <Reveal delay={0.1} y={30}>
                  <Box sx={{ order: { xs: 2, md: flip ? 1 : 2 } }}>
                    <DeepDiveVisual index={i} color={d.color} />
                  </Box>
                </Reveal>
              </Box>
            </Container>
          </Box>
        );
      })}
    </Box>
  );
}

function DeepDiveVisual({ index, color }: { index: number; color: string }) {
  const rows = [
    ['Crawling acme.com', 'Mapping 1,240 demand signals', 'Reading 18 competitors', 'Clustering 96 questions'],
    ['Positioning locked', '5 content pillars', 'Funnel: TOFU to BOFU', '4-week calendar generated'],
    ['Draft: The 7-figure playbook', 'Carousel · 8 slides', 'Deck · 14 slides (Gamma-style)', 'QA gate: passed'],
    ['Scheduled · LinkedIn + X', 'Ad set live · CPA down 32%', 'Budget reallocated', 'Attribution: 12 MQLs'],
  ][index];

  return (
    <Box sx={{ borderRadius: 4, p: 2.5, bgcolor: '#0E1726', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 34px 70px -40px rgba(14,23,38,0.55)' }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
        <Box sx={{ width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
          <BrandMark size={18} />
        </Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em' }}>
          AGENT · LIVE
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#14BB87', boxShadow: '0 0 0 4px rgba(20,187,135,0.2)' }} />
      </Stack>
      <Stack spacing={1.1}>
        {rows.map((r, j) => (
          <MotionBox
            key={r}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: j * 0.12, duration: 0.4 }}
            sx={{
              px: 1.75,
              py: 1.25,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 16, color }} />
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>{r}</Typography>
          </MotionBox>
        ))}
      </Stack>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* Modules grid                                                             */
/* ----------------------------------------------------------------------- */
function ModulesSection() {
  return (
    <Box component="section" sx={{ py: { xs: 9, md: 14 }, bgcolor: '#fff' }}>
      <Container maxWidth="lg">
        <SectionHeading eyebrow={modules.eyebrow} title={modules.title} subtitle={modules.subtitle} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {modules.groups.map((g, gi) => (
            <Reveal key={g.name} delay={gi * 0.05}>
              <Box sx={{ height: '100%', p: 3, borderRadius: 3.5, bgcolor: '#fff', border: '1px solid #ECEEF1' }}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: g.color }} />
                  <Typography sx={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0E1116' }}>
                    {g.name}
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {g.items.map(([name, desc]) => (
                    <Box key={name}>
                      <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#1F2733' }}>{name}</Typography>
                      <Typography sx={{ fontSize: 13, color: '#6B7480', lineHeight: 1.5 }}>{desc}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* AI Decks spotlight                                                       */
/* ----------------------------------------------------------------------- */
function DecksSection() {
  return (
    <Box id="decks" component="section" sx={{ py: { xs: 9, md: 14 }, scrollMarginTop: 80, bgcolor: '#0E1726', color: '#fff' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 5, md: 7 }, alignItems: 'center' }}>
          <Reveal>
            <Box>
              <Eyebrow color="#FFC65C">{decks.eyebrow}</Eyebrow>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.7rem', md: '2.2rem' }, lineHeight: 1.18, letterSpacing: '-0.025em', color: '#fff' }}>
                {decks.title}
              </Typography>
              <Typography sx={{ mt: 2, fontSize: '1.05rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.7)' }}>{decks.subtitle}</Typography>
              <Stack spacing={1.5} sx={{ mt: 3 }}>
                {decks.features.map((f) => (
                  <Stack key={f} direction="row" spacing={1.4} alignItems="flex-start">
                    <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#14BB87', mt: '2px', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 14.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>{f}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Reveal>
          <Reveal delay={0.1} y={30}>
            <DeckMock />
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

function DeckMock() {
  return (
    <Box sx={{ borderRadius: 4, p: 2.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Box sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: '#fff', color: '#0E1116', p: 3 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: '#0FA874', mb: 0.5 }}>WHY MARKETIQ</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: 20, mb: 2, color: '#0E1116' }}>The category-of-one playbook</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          {[
            ['#FFAF06', 'Research', 'Live web evidence'],
            ['#14BB87', 'Strategy', 'AI planning'],
            ['#D92C4A', 'Studio', 'On-brand content'],
            ['#7C3AED', 'Learn', 'Compounding loop'],
          ].map(([c, h, b]) => (
            <Box key={h} sx={{ borderRadius: 2, p: 1.5, bgcolor: `${c}12`, border: `1px solid ${c}28` }}>
              <Box sx={{ width: 26, height: 26, borderRadius: '8px', mb: 1, background: `linear-gradient(135deg, ${c}, ${c}aa)` }} />
              <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: '#0E1116' }}>{h}</Typography>
              <Typography sx={{ fontSize: 11.5, color: '#6B7480' }}>{b}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ mt: 2, px: 1.5, py: 1.1, borderRadius: 2, bgcolor: 'rgba(20,187,135,0.1)', border: '1px solid rgba(20,187,135,0.25)' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#0E1116' }}>Trusted by teams that ship 10x more content</Typography>
        </Box>
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        {['Regenerate design', 'Edit with AI', 'Generate image'].map((t) => (
          <Chip key={t} label={t} size="small" sx={{ fontSize: 11, fontWeight: 600, color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)' }} />
        ))}
      </Stack>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* Desktop app                                                              */
/* ----------------------------------------------------------------------- */
function DesktopSection() {
  return (
    <Box id="desktop" component="section" sx={{ py: { xs: 9, md: 14 }, scrollMarginTop: 80 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' }, gap: { xs: 5, md: 7 }, alignItems: 'center' }}>
          <Reveal y={30}>
            <DesktopMock />
          </Reveal>
          <Reveal delay={0.1}>
            <Box>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
                <AppleIcon sx={{ fontSize: 20, color: '#0E1116' }} />
                <Chip label={desktop.badge} size="small" sx={{ fontWeight: 700, fontSize: 12, color: '#0E1116', bgcolor: 'rgba(10,102,194,0.08)', border: '1px solid rgba(10,102,194,0.25)' }} />
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '2.05rem' }, lineHeight: 1.18, letterSpacing: '-0.025em', color: '#0E1116' }}>
                {desktop.title}
              </Typography>
              <Typography sx={{ mt: 2, fontSize: '1.05rem', lineHeight: 1.7, color: '#5A6472' }}>{desktop.subtitle}</Typography>
              <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {desktop.principles.map((p) => (
                  <Box key={p.title} sx={{ p: 2, borderRadius: 3, border: '1px solid #ECEEF1', bgcolor: '#fff' }}>
                    <Typography sx={{ fontSize: 20, mb: 0.5 }}>{p.icon}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: '#0E1116' }}>{p.title}</Typography>
                    <Typography sx={{ fontSize: 12.8, color: '#6B7480', lineHeight: 1.5, mt: 0.5 }}>{p.desc}</Typography>
                  </Box>
                ))}
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
                {desktop.modules.map((m) => (
                  <Chip key={m} label={m} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: 12, color: '#46505F', borderColor: 'rgba(14,17,22,0.14)' }} />
                ))}
              </Stack>
            </Box>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

function DesktopMock() {
  return (
    <Box sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: '#0E1726', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 90px -44px rgba(14,23,38,0.6)' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.4, bgcolor: 'rgba(255,255,255,0.04)' }}>
        <Stack direction="row" spacing={0.6}>
          {['#ff5a5f', '#FFAF06', '#14BB87'].map((c) => (
            <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
          ))}
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>LinkedIn Copilot</Typography>
      </Stack>
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ borderRadius: 3, p: 2.25, bgcolor: 'rgba(10,102,194,0.12)', border: '1px solid rgba(10,102,194,0.3)', mb: 1.75 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#5BA3F5', mb: 0.75 }}>NEXT BEST ACTION</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#fff', mb: 0.5 }}>Comment on Priya&apos;s post about RevOps</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55 }}>
            High intent · warm lead · draft ready. You make the click — at a human pace.
          </Typography>
        </Box>
        <Stack spacing={1}>
          {[
            ['Profile strength', '92 / 100', '#14BB87'],
            ['Leads in pipeline', '34 active', '#FFAF06'],
            ['Daily actions', '6 / 10 safe cap', '#0A66C2'],
          ].map(([k, v, c]) => (
            <Stack key={k} direction="row" alignItems="center" sx={{ px: 1.75, py: 1.1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c as string, mr: 1.25 }} />
              <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', flexGrow: 1 }}>{k}</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{v}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* Segments                                                                 */
/* ----------------------------------------------------------------------- */
function SegmentsSection() {
  return (
    <Box component="section" sx={{ py: { xs: 9, md: 13 }, bgcolor: '#FAFBFC' }}>
      <Container maxWidth="lg">
        <SectionHeading eyebrow={segments.eyebrow} title={segments.title} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>
          {segments.items.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <Box sx={{ height: '100%', p: 3, borderRadius: 3.5, bgcolor: '#fff', border: `1px solid ${s.color}24`, boxShadow: `0 18px 40px -28px ${s.color}55` }}>
                <Box sx={{ width: 40, height: 6, borderRadius: 3, mb: 2, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)` }} />
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#0E1116', mb: 1 }}>{s.title}</Typography>
                <Typography sx={{ fontSize: 14, lineHeight: 1.6, color: '#5A6472' }}>{s.desc}</Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* AI stack                                                                 */
/* ----------------------------------------------------------------------- */
function StackSection() {
  return (
    <Box component="section" sx={{ py: { xs: 9, md: 13 } }}>
      <Container maxWidth="lg">
        <SectionHeading eyebrow={stack.eyebrow} title={stack.title} subtitle={stack.subtitle} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
          {stack.items.map((it, i) => (
            <Reveal key={it.k} delay={i * 0.05}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#fff', border: '1px solid #ECEEF1' }}>
                <Box sx={{ width: 38, height: 38, borderRadius: '11px', display: 'grid', placeItems: 'center', background: BRAND.gradient, flexShrink: 0 }}>
                  <BrandMark size={22} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0E1116' }}>{it.k}</Typography>
                  <Typography sx={{ fontSize: 12.8, color: '#6B7480' }}>{it.v}</Typography>
                </Box>
              </Stack>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* Stats band                                                               */
/* ----------------------------------------------------------------------- */
function StatsBand() {
  return (
    <Box component="section" sx={{ py: { xs: 6, md: 8 }, background: BRAND.gradient }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
          {stats.map((s) => (
            <Box key={s.label} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.6rem' }, lineHeight: 1, color: '#0a0a0a' }}>{s.value}</Typography>
              <Typography sx={{ mt: 1, fontSize: 13.5, fontWeight: 600, color: 'rgba(10,10,10,0.7)' }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* Pricing                                                                  */
/* ----------------------------------------------------------------------- */
function PricingSection() {
  const [yearly, setYearly] = useState(false);
  return (
    <Box id="pricing" component="section" sx={{ py: { xs: 9, md: 14 }, scrollMarginTop: 80, bgcolor: '#FAFBFC' }}>
      <Container maxWidth="md">
        <SectionHeading eyebrow={pricing.eyebrow} title={pricing.title} subtitle={pricing.subtitle} />

        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 5 }}>
          <Box
            role="group"
            sx={{ display: 'inline-flex', p: 0.5, borderRadius: 999, bgcolor: '#fff', border: '1px solid #ECEEF1' }}
          >
            {[
              { key: false, label: 'Monthly' },
              { key: true, label: 'Yearly' },
            ].map((opt) => {
              const active = yearly === opt.key;
              return (
                <Box
                  key={opt.label}
                  component="button"
                  type="button"
                  onClick={() => setYearly(opt.key)}
                  sx={{
                    cursor: 'pointer',
                    border: 'none',
                    px: 2.5,
                    py: 1,
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 14,
                    color: active ? '#0a0a0a' : '#5A6472',
                    background: active ? 'linear-gradient(135deg,#FFAF06,#14BB87)' : 'transparent',
                    transition: 'all .2s ease',
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Box>
          <Chip label={pricing.saveLabel} size="small" sx={{ fontWeight: 700, fontSize: 11.5, color: '#0FA874', bgcolor: 'rgba(20,187,135,0.1)', border: '1px solid rgba(20,187,135,0.3)' }} />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, alignItems: 'stretch' }}>
          {/* Pro */}
          <Reveal>
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: 3.5,
                borderRadius: 4,
                bgcolor: '#0E1726',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 40px 80px -40px rgba(14,23,38,0.6)',
                position: 'relative',
              }}
            >
              <Chip label="For one seat" size="small" sx={{ position: 'absolute', top: 18, right: 18, fontWeight: 700, fontSize: 11, color: '#0a0a0a', background: 'linear-gradient(90deg,#FFAF06,#14BB87)' }} />
              <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{pricing.pro.name}</Typography>
              <Chip
                label={pricing.introLabel}
                size="small"
                sx={{ mt: 1.5, fontWeight: 800, fontSize: 11, color: '#0a0a0a', background: 'linear-gradient(90deg,#FFAF06,#14BB87)' }}
              />
              <Stack direction="row" alignItems="baseline" spacing={1.2} sx={{ mt: 1.5 }}>
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.35rem',
                    color: 'rgba(255,255,255,0.45)',
                    textDecoration: 'line-through',
                    textDecorationThickness: 2,
                  }}
                >
                  ${yearly ? pricing.yearlyPerMonth : pricing.monthly}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '2.4rem' }}>
                  ${yearly ? pricing.introYearlyPerMonth : pricing.introMonthly}
                </Typography>
                <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>/mo</Typography>
              </Stack>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', minHeight: 20 }}>
                {yearly
                  ? `Intro: billed annually at $${pricing.introYearlyTotal.toLocaleString()} (then $${pricing.yearlyTotal.toLocaleString()})`
                  : `Intro price · then $${pricing.monthly}/mo`}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 12, fontWeight: 600, color: '#14BB87' }}>
                {pricing.taperNote}
              </Typography>
              <Typography sx={{ mt: 1.5, fontSize: 13.5, color: 'rgba(255,255,255,0.7)' }}>{pricing.pro.tagline}</Typography>
              <Stack spacing={1.25} sx={{ mt: 2.5, flexGrow: 1 }}>
                {pricing.pro.features.map((f) => (
                  <Stack key={f} direction="row" spacing={1.25} alignItems="flex-start">
                    <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#14BB87', mt: '1px', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 13.8, color: 'rgba(255,255,255,0.85)' }}>{f}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Button
                component={Link}
                href={`${pricing.pro.href}${yearly ? '?interval=yearly' : ''}`}
                fullWidth
                size="large"
                sx={{ mt: 3, ...GRADIENT_BTN }}
                endIcon={<ArrowForwardRoundedIcon />}
              >
                {pricing.pro.cta}
              </Button>
              <Typography
                component={Link}
                href="/signup?plan=free"
                sx={{
                  display: 'block',
                  mt: 1.5,
                  textAlign: 'center',
                  fontSize: 12.5,
                  color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  '&:hover': { color: '#fff', textDecoration: 'underline' },
                }}
              >
                {pricing.freeNote}
              </Typography>
            </Box>
          </Reveal>

          {/* Teams */}
          <Reveal delay={0.08}>
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: 3.5,
                borderRadius: 4,
                bgcolor: '#fff',
                color: '#0E1116',
                border: '1px solid #ECEEF1',
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{pricing.teams.name}</Typography>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '2.4rem' }}>{pricing.teams.price}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 13, color: '#7A8493', minHeight: 20 }}>Custom seats & workspaces</Typography>
              <Typography sx={{ mt: 1.5, fontSize: 13.5, color: '#5A6472' }}>{pricing.teams.tagline}</Typography>
              <Stack spacing={1.25} sx={{ mt: 2.5, flexGrow: 1 }}>
                {pricing.teams.features.map((f) => (
                  <Stack key={f} direction="row" spacing={1.25} alignItems="flex-start">
                    <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#14BB87', mt: '1px', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 13.8, color: '#374151' }}>{f}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Button
                component="a"
                href={pricing.teams.href}
                fullWidth
                size="large"
                variant="outlined"
                sx={{ mt: 3, fontWeight: 700, borderRadius: 999, color: '#0E1116', borderColor: 'rgba(14,17,22,0.2)', '&:hover': { borderColor: '#14BB87', bgcolor: 'rgba(20,187,135,0.05)' } }}
              >
                {pricing.teams.cta}
              </Button>
            </Box>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* FAQ                                                                      */
/* ----------------------------------------------------------------------- */
function FaqSection() {
  const [expanded, setExpanded] = useState<number | false>(0);
  return (
    <Box id="faq" component="section" sx={{ py: { xs: 9, md: 14 }, scrollMarginTop: 80 }}>
      <Container maxWidth="md">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        {faqs.map((f, i) => (
          <Accordion
            key={f.q}
            expanded={expanded === i}
            onChange={() => setExpanded(expanded === i ? false : i)}
            disableGutters
            elevation={0}
            sx={{
              border: '1px solid #ECEEF1',
              borderRadius: '14px !important',
              mb: 1.5,
              '&:before': { display: 'none' },
              overflow: 'hidden',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 0.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#0E1116' }}>{f.q}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
              <Typography sx={{ fontSize: 14.5, lineHeight: 1.7, color: '#5A6472' }}>{f.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
    </Box>
  );
}

/* ----------------------------------------------------------------------- */
/* Final CTA                                                                */
/* ----------------------------------------------------------------------- */
function FinalCta() {
  return (
    <Box component="section" sx={{ py: { xs: 10, md: 15 } }}>
      <Container maxWidth="md">
        <Box
          sx={{
            position: 'relative',
            borderRadius: 5,
            px: { xs: 3, md: 8 },
            py: { xs: 6, md: 9 },
            textAlign: 'center',
            overflow: 'hidden',
            bgcolor: '#0E1726',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Box aria-hidden sx={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,175,6,0.25), transparent 70%)' }} />
          <Box aria-hidden sx={{ position: 'absolute', bottom: -100, left: -70, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.22), transparent 70%)' }} />
          <Box sx={{ position: 'relative' }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.6rem' }, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#fff' }}>
              {finalCta.title}
            </Typography>
            <Typography sx={{ mt: 2, fontSize: { xs: '1rem', md: '1.15rem' }, color: 'rgba(255,255,255,0.72)', maxWidth: 560, mx: 'auto', lineHeight: 1.6 }}>
              {finalCta.subtitle}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75} justifyContent="center" sx={{ mt: 4 }}>
              <Button component={Link} href="/signup" size="large" sx={GRADIENT_BTN} endIcon={<ArrowForwardRoundedIcon />}>
                {finalCta.primary}
              </Button>
              <Button
                component="a"
                href="mailto:info@trayarunyaventures.com?subject=MarketiQ%20AI%20demo"
                size="large"
                variant="outlined"
                sx={{ px: 3.4, py: 1.3, fontWeight: 700, borderRadius: 999, color: '#fff', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}
              >
                {finalCta.secondary}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
