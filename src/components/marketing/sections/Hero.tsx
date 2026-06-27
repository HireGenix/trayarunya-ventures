'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Box, Button, Container, InputBase, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { hero, modules } from '@/lib/marketing';
import { DISPLAY } from '../fonts';
import { ProductHuntBadge } from '../ProductHunt';
import { Glow, GridBg, Marquee, MotionBox, DAY, shineBtnSx, ghostBtnSx } from '../primitives';
import MacBookHero from '../MacBookHero';

const MARQUEE_ITEMS = modules.groups.flatMap((g) => g.items.map(([name]) => ({ name, color: g.color })));

const PROOF = [
  ['41', 'AI agents'],
  ['23', 'autonomous loops'],
  ['14', 'GTM stages, one loop'],
  ['24/7', 'always-on'],
] as const;

const TRUST = ['No credit card', 'Point at your website', 'Live in minutes'];

const MQ_URL = 'https://mymarketiq.online';

export default function Hero() {
  const [siteUrl, setSiteUrl] = useState('');
  const goActivate = () => {
    const raw = siteUrl.trim();
    if (!raw) {
      window.location.href = MQ_URL;
      return;
    }
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    window.location.href = `${MQ_URL}?website=${encodeURIComponent(normalized)}`;
  };

  return (
    <Box
      component="section"
      sx={{ position: 'relative', bgcolor: DAY.bg, overflow: 'hidden', pt: { xs: 16, md: 22 }, pb: { xs: 6, md: 8 } }}
    >
      <GridBg opacity={0.4} />
      <Glow color={DAY.teal} size={680} sx={{ top: '-20%', right: '-12%' }} opacity={0.12} />
      <Glow color={DAY.amber} size={560} sx={{ bottom: '-26%', left: '-14%' }} opacity={0.1} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box
          sx={{
            // Single, centred copy column — MacBook lives below for impact
            maxWidth: 820,
            mx: 'auto',
            textAlign: 'center',
          }}
        >
          {/* ---- Copy + CTA (centred) ---- */}
          <Box>
            <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.6,
                  py: 0.7,
                  mb: 3,
                  borderRadius: 999,
                  border: `1px solid ${DAY.teal}33`,
                  background: `${DAY.teal}0d`,
                }}
              >
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: DAY.teal, boxShadow: `0 0 8px ${DAY.teal}` }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: DAY.text, letterSpacing: '0.02em' }}>
                  {hero.badge}
                </Typography>
              </Box>
            </MotionBox>

            <MotionBox initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}>
              <Typography
                component="h1"
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.2rem' },
                  lineHeight: 1.05,
                  letterSpacing: '-0.035em',
                  color: DAY.text,
                }}
              >
                {hero.titleLead}{' '}
                <Box
                  component="span"
                  sx={{
                    background: DAY.gradientText,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {hero.titleGradient}
                </Box>{' '}
                {hero.titleTail}
              </Typography>
            </MotionBox>

            <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }}>
              <Typography sx={{ mt: 2.5, fontSize: { xs: '1rem', md: '1.18rem' }, lineHeight: 1.65, color: DAY.sub, maxWidth: 640, mx: 'auto' }}>
                {hero.subtitle}
              </Typography>
            </MotionBox>

            <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.25 }}>
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  goActivate();
                }}
                sx={{
                  mt: 4,
                  mx: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  maxWidth: 540,
                  bgcolor: '#fff',
                  border: `1px solid ${DAY.line}`,
                  borderRadius: 999,
                  pl: 2.25,
                  pr: 0.6,
                  py: 0.6,
                  boxShadow: '0 12px 36px -20px rgba(12,20,36,0.22)',
                }}
              >
                <InputBase
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="yourcompany.com"
                  inputMode="url"
                  aria-label="Your company or product website"
                  sx={{ flex: 1, fontSize: 15.5, color: DAY.text }}
                />
                <Button type="submit" sx={shineBtnSx()} endIcon={<ArrowForwardRoundedIcon />}>
                  Build my GTM
                </Button>
              </Box>
            </MotionBox>

            <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.35 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" justifyContent="center" sx={{ mt: 2.5 }}>
                <Button component={Link} href="https://mymarketiq.online" sx={shineBtnSx()} endIcon={<ArrowForwardRoundedIcon />}>
                  {hero.primaryCta}
                </Button>
                <Button component="a" href="#how" sx={ghostBtnSx}>
                  {hero.secondaryCta}
                </Button>
              </Stack>

              <Stack direction="row" flexWrap="wrap" justifyContent="center" sx={{ mt: 2.5, gap: { xs: 1.25, sm: 2.5 } }}>
                {TRUST.map((t) => (
                  <Stack key={t} direction="row" alignItems="center" spacing={0.5}>
                    <CheckRoundedIcon sx={{ fontSize: 16, color: DAY.teal }} />
                    <Typography sx={{ fontSize: 13, color: DAY.sub, fontWeight: 600 }}>{t}</Typography>
                  </Stack>
                ))}
              </Stack>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <ProductHuntBadge />
              </Box>
            </MotionBox>
          </Box>
        </Box>

        {/* ---- MacBook Pro mockup — opens on scroll, real product screenshot inside ---- */}
        <Box sx={{ mt: { xs: 8, md: 12 } }}>
          <MacBookHero />
        </Box>

        {/* proof stat strip */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          sx={{
            mt: { xs: 6, md: 8 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
            gap: 2,
            p: { xs: 2.5, md: 3 },
            borderRadius: '20px',
            border: `1px solid ${DAY.lineSoft}`,
            background: DAY.bg2,
          }}
        >
          {PROOF.map(([v, l]) => (
            <Box key={l} sx={{ textAlign: 'center' }}>
              <Typography
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: { xs: '1.7rem', md: '2.1rem' },
                  lineHeight: 1,
                  background: DAY.gradientText,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {v}
              </Typography>
              <Typography sx={{ mt: 0.75, fontSize: 12.5, fontWeight: 600, color: DAY.sub }}>{l}</Typography>
            </Box>
          ))}
        </MotionBox>
      </Container>

      {/* module marquee — alive trust strip */}
      <Box sx={{ position: 'relative', zIndex: 2, mt: { xs: 5, md: 7 }, borderTop: `1px solid ${DAY.lineSoft}`, borderBottom: `1px solid ${DAY.lineSoft}`, py: 2, background: DAY.bg2 }}>
        <Typography sx={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.16em', color: DAY.faint, textTransform: 'uppercase', mb: 1.5 }}>
          One cockpit · 30+ connected modules
        </Typography>
        <Marquee duration={46} gap={42}>
          {MARQUEE_ITEMS.map(({ name, color }) => (
            <Stack key={name} direction="row" spacing={1.1} alignItems="center" sx={{ flexShrink: 0 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}66` }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: DAY.sub, whiteSpace: 'nowrap' }}>{name}</Typography>
            </Stack>
          ))}
        </Marquee>
      </Box>
    </Box>
  );
}
