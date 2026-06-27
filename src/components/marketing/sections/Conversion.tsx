'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Box, Button, Chip, Container, Stack, Typography } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { faqs, finalCta, pricing, segments, stats } from '@/lib/marketing';
import { PRODUCT_HUNT, ProductHuntLaunchCard } from '../ProductHunt';
import { DISPLAY } from '../fonts';
import {
  BeamBorder,
  CountUp,
  Glow,
  GridBg,
  Magnetic,
  MotionBox,
  DAY,
  MotionSpan,
  SectionHeading,
  SpotlightCard,
  ghostBtnSx,
  shineBtnSx,
} from '../primitives';

/* ------------------------------------------------------------------------ */
/* Segments                                                                  */
/* ------------------------------------------------------------------------ */
export function Segments() {
  return (
    <Box component="section" sx={{ position: 'relative', py: { xs: 10, md: 14 }, bgcolor: DAY.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.25} />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <SectionHeading eyebrow={segments.eyebrow} title={segments.title} subtitle={segments.subtitle} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {segments.items.map((s, i) => (
            <MotionBox
              key={s.title}
              initial={{ opacity: 0, y: 30, rotateY: -8 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              sx={{ height: '100%', perspective: '800px' }}
            >
              <SpotlightCard color={s.color}>
                <Box sx={{ p: 3.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 8,
                      borderRadius: 4,
                      mb: 2.25,
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}55)`,
                      boxShadow: `0 0 16px ${s.color}66`,
                    }}
                  />
                  <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, color: DAY.text, mb: 1 }}>
                    {s.title}
                  </Typography>
                  <Typography sx={{ fontSize: 14.5, lineHeight: 1.7, color: DAY.sub }}>{s.desc}</Typography>
                </Box>
              </SpotlightCard>
            </MotionBox>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ------------------------------------------------------------------------ */
/* Stats band — animated counters                                            */
/* ------------------------------------------------------------------------ */
export function StatsBand() {
  return (
    <Box component="section" sx={{ position: 'relative', py: { xs: 7, md: 9 }, bgcolor: DAY.bg2, overflow: 'hidden', borderTop: `1px solid ${DAY.lineSoft}`, borderBottom: `1px solid ${DAY.lineSoft}` }}>
      <Glow color={DAY.teal} size={500} sx={{ top: '-60%', left: '8%' }} opacity={0.12} />
      <Glow color={DAY.amber} size={500} sx={{ bottom: '-60%', right: '8%' }} opacity={0.12} />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 4, md: 3 } }}>
          {stats.map((s, i) => (
            <MotionBox
              key={s.label}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              sx={{ textAlign: 'center' }}
            >
              <Typography
                component="div"
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: { xs: '2.3rem', md: '3.1rem' },
                  lineHeight: 1,
                  background: DAY.gradientText,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <CountUp value={s.value} />
              </Typography>
              <Typography sx={{ mt: 1.25, fontSize: 13.5, fontWeight: 600, color: DAY.sub }}>{s.label}</Typography>
            </MotionBox>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ------------------------------------------------------------------------ */
/* Pricing                                                                   */
/* ------------------------------------------------------------------------ */
export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <Box id="pricing" component="section" sx={{ position: 'relative', py: { xs: 10, md: 15 }, scrollMarginTop: 80, bgcolor: DAY.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.3} />
      <Glow color={DAY.amber} size={640} sx={{ top: '6%', left: '-14%' }} opacity={0.1} />
      <Glow color={DAY.teal} size={640} sx={{ bottom: '-10%', right: '-14%' }} opacity={0.1} />

      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <SectionHeading eyebrow={pricing.eyebrow} title={pricing.title} subtitle={pricing.subtitle} />

        <Stack alignItems="center" spacing={1.5} sx={{ mb: 6 }}>
          <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
            <Box sx={{ position: 'relative', display: 'inline-flex', p: 0.5, borderRadius: 999, bgcolor: '#FFFFFF', border: `1px solid ${DAY.line}`, boxShadow: '0 8px 20px -14px rgba(12,20,36,0.2)' }}>
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
                    sx={{ position: 'relative', cursor: 'pointer', border: 'none', px: 2.75, py: 1, borderRadius: 999, fontWeight: 700, fontSize: 14, fontFamily: 'inherit', color: active ? '#0E1422' : DAY.sub, background: 'transparent', zIndex: 1, transition: 'color .25s ease' }}
                  >
                    {active && (
                      <MotionBox
                        layoutId="price-pill"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        sx={{ position: 'absolute', inset: 0, borderRadius: 999, background: DAY.gradient, zIndex: -1 }}
                      />
                    )}
                    {opt.label}
                  </Box>
                );
              })}
            </Box>
            <Chip label={`${pricing.annualLabel}`} size="small" sx={{ fontWeight: 700, fontSize: 11.5, color: DAY.teal, bgcolor: 'rgba(14,164,122,0.1)', border: '1px solid rgba(14,164,122,0.35)' }} />
          </Stack>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, alignItems: 'stretch' }}>
          {pricing.plans.map((plan, idx) => {
            const perMonth = yearly ? plan.yearlyPerMonth : plan.monthly;
            const inner = (
              <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', p: 3.5, ...(plan.popular ? {} : { borderRadius: '26px', background: DAY.panel, border: `1px solid ${DAY.line}`, boxShadow: '0 1px 2px rgba(12,20,36,0.04), 0 16px 40px -28px rgba(12,20,36,0.14)', transition: 'border-color .3s ease, box-shadow .3s ease', '&:hover': { borderColor: 'rgba(13,23,44,0.22)', boxShadow: '0 40px 80px -44px rgba(12,20,36,0.28)' } }) }}>
                {plan.popular && (
                  <Chip label="Most popular" size="small" sx={{ position: 'absolute', top: 20, right: 20, fontWeight: 700, fontSize: 11, color: '#0E1422', background: DAY.gradient }} />
                )}
                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19, color: DAY.text }}>{plan.name}</Typography>
                <Typography sx={{ mt: 0.75, fontSize: 13.5, color: DAY.sub, minHeight: 40 }}>{plan.tagline}</Typography>
                <Stack direction="row" alignItems="baseline" spacing={1.2} sx={{ mt: 1.5 }}>
                  {yearly && (
                    <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.15rem', color: DAY.faint, textDecoration: 'line-through', textDecorationThickness: 2 }}>
                      ${plan.monthly.toLocaleString()}
                    </Typography>
                  )}
                  <AnimatePresence mode="popLayout" initial={false}>
                    <MotionSpan
                      key={`${plan.code}-${String(yearly)}`}
                      initial={{ y: 16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -16, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '2.5rem', color: DAY.text, lineHeight: 1 }}
                    >
                      ${perMonth.toLocaleString()}
                    </MotionSpan>
                  </AnimatePresence>
                  <Typography sx={{ fontSize: 14, color: DAY.sub }}>/mo</Typography>
                </Stack>
                <Typography sx={{ mt: 0.75, fontSize: 12.5, color: DAY.sub, minHeight: 20 }}>
                  {yearly
                    ? `Billed yearly at $${plan.yearlyTotal.toLocaleString()} · save 25%`
                    : 'Billed monthly'}
                </Typography>
                <Stack spacing={1.25} sx={{ mt: 2.5, flexGrow: 1 }}>
                  {plan.features.map((f) => (
                    <Stack key={f} direction="row" spacing={1.25} alignItems="flex-start">
                      <CheckCircleRoundedIcon sx={{ fontSize: 18, color: DAY.teal, mt: '1px', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13.5, color: 'rgba(20,30,50,0.85)' }}>{f}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Magnetic strength={0.18}>
                  <Button
                    component={Link}
                    href={`https://mymarketiq.online?plan=${plan.code}${yearly ? '&interval=yearly' : ''}`}
                    fullWidth
                    size="large"
                    sx={{ mt: 3, ...(plan.popular ? shineBtnSx() : ghostBtnSx) }}
                    endIcon={plan.popular ? <ArrowForwardRoundedIcon /> : undefined}
                  >
                    {plan.cta}
                  </Button>
                </Magnetic>
              </Box>
            );
            return (
              <MotionBox
                key={plan.code}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.65, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                sx={{ height: '100%' }}
              >
                {plan.popular ? (
                  <BeamBorder colors={[DAY.amber, DAY.teal]} radius={26} speed={5} sx={{ height: '100%' }}>
                    {inner}
                  </BeamBorder>
                ) : (
                  inner
                )}
              </MotionBox>
            );
          })}
        </Box>

        <Stack alignItems="center" spacing={1} sx={{ mt: 5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: DAY.sub }}>{pricing.seatNote}</Typography>
        </Stack>

        {/* Add-ons strip */}
        <MotionBox
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          sx={{ mt: 5 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
            <AddRoundedIcon sx={{ fontSize: 20, color: DAY.teal }} />
            <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: { xs: 18, md: 20 }, color: DAY.text }}>
              {pricing.addonsHeading}
            </Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            {pricing.addons.map((a) => (
              <Box
                key={a.kind}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                  p: 3,
                  borderRadius: '22px',
                  border: `1px solid ${DAY.line}`,
                  background: DAY.panel,
                  boxShadow: '0 1px 2px rgba(12,20,36,0.04), 0 16px 40px -28px rgba(12,20,36,0.14)',
                }}
              >
                <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap">
                  <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, color: DAY.text }}>
                    {a.name}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: DAY.teal }}>{a.price}</Typography>
                  <Typography sx={{ fontSize: 13, color: DAY.sub }}>{a.unit}</Typography>
                </Stack>
                <Typography sx={{ fontSize: 13.5, color: 'rgba(20,30,50,0.82)' }}>{a.blurb}</Typography>
              </Box>
            ))}
          </Box>
          <Typography sx={{ mt: 1.75, fontSize: 12.5, color: DAY.sub, textAlign: 'center' }}>
            {pricing.addonsNote}
          </Typography>
        </MotionBox>

        {/* Enterprise strip */}
        <MotionBox
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          sx={{ mt: 3 }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2.5,
              p: 3,
              borderRadius: '22px',
              border: `1px solid ${DAY.line}`,
              background: DAY.panel,
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="baseline">
                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, color: DAY.text }}>
                  {pricing.enterprise.name}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: DAY.teal }}>{pricing.enterprise.price}</Typography>
              </Stack>
              <Typography sx={{ mt: 0.5, fontSize: 13.5, color: DAY.sub }}>{pricing.enterprise.tagline}</Typography>
              <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 1.5 }}>
                {pricing.enterprise.features.map((f) => (
                  <Stack key={f} direction="row" spacing={0.75} alignItems="center">
                    <CheckCircleRoundedIcon sx={{ fontSize: 15, color: DAY.teal }} />
                    <Typography sx={{ fontSize: 12.5, color: 'rgba(20,30,50,0.8)' }}>{f}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Button component="a" href={pricing.enterprise.href} size="large" sx={{ flexShrink: 0, ...ghostBtnSx }}>
              {pricing.enterprise.cta}
            </Button>
          </Box>
        </MotionBox>

        <Stack alignItems="center" spacing={1} sx={{ mt: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13.5, color: DAY.sub, maxWidth: 640 }}>
            {pricing.agencyNote}{' '}
            <Box component="a" href={pricing.contactEmail} sx={{ color: DAY.teal, fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              Email us →
            </Box>
          </Typography>
          <Typography
            component={Link}
            href="https://mymarketiq.online"
            sx={{ fontSize: 12.5, color: DAY.sub, textDecoration: 'none', '&:hover': { color: DAY.text, textDecoration: 'underline' } }}
          >
            {pricing.freeNote}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}

/* ------------------------------------------------------------------------ */
/* FAQ — motion accordion                                                    */
/* ------------------------------------------------------------------------ */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Box id="faq" component="section" sx={{ position: 'relative', py: { xs: 10, md: 15 }, scrollMarginTop: 80, bgcolor: DAY.bg2, overflow: 'hidden' }}>
      <Glow color={DAY.violet} size={560} sx={{ top: '-8%', right: '-12%' }} opacity={0.08} />
      <Container maxWidth="md" sx={{ position: 'relative' }}>
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        <Stack spacing={1.5}>
          {faqs.map((f, i) => {
            const expanded = open === i;
            return (
              <MotionBox
                key={f.q}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
              >
                <Box
                  sx={{
                    borderRadius: '16px',
                    border: `1px solid ${expanded ? 'rgba(14,164,122,0.4)' : DAY.line}`,
                    background: expanded ? 'rgba(14,164,122,0.05)' : DAY.panel,
                    boxShadow: '0 1px 2px rgba(12,20,36,0.03)',
                    overflow: 'hidden',
                    transition: 'border-color .3s ease, background .3s ease',
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setOpen(expanded ? null : i)}
                    aria-expanded={expanded}
                    sx={{
                      all: 'unset',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      px: 3,
                      py: 2.25,
                      gap: 2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: 15.5, color: DAY.text, flexGrow: 1 }}>{f.q}</Typography>
                    <MotionBox
                      animate={{ rotate: expanded ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      sx={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `1px solid ${DAY.line}`, flexShrink: 0 }}
                    >
                      <AddRoundedIcon sx={{ fontSize: 17, color: expanded ? DAY.teal : DAY.sub }} />
                    </MotionBox>
                  </Box>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <MotionBox
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        sx={{ overflow: 'hidden' }}
                      >
                        <Typography sx={{ px: 3, pb: 2.75, fontSize: 14.5, lineHeight: 1.75, color: DAY.sub }}>{f.a}</Typography>
                      </MotionBox>
                    )}
                  </AnimatePresence>
                </Box>
              </MotionBox>
            );
          })}
        </Stack>
      </Container>
    </Box>
  );
}

/* ------------------------------------------------------------------------ */
/* Final CTA                                                                 */
/* ------------------------------------------------------------------------ */
export function FinalCta() {
  return (
    <Box component="section" sx={{ position: 'relative', py: { xs: 12, md: 18 }, bgcolor: DAY.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.35} />
      {/* orbital rings */}
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
        {[520, 760, 1020].map((d, i) => (
          <Box
            key={d}
            sx={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: '50%',
              border: `1px solid rgba(13,23,44,${0.1 - i * 0.025})`,
              animation: `cta-spin ${36 + i * 18}s linear infinite${i % 2 ? ' reverse' : ''}`,
              '@keyframes cta-spin': { to: { transform: 'rotate(360deg)' } },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -4,
                left: '50%',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: [DAY.amber, DAY.teal, DAY.violet][i],
                boxShadow: `0 0 14px ${[DAY.amber, DAY.teal, DAY.violet][i]}88`,
              },
            }}
          />
        ))}
      </Box>
      <Glow color={DAY.teal} size={800} sx={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} opacity={0.1} />

      <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }}>
        <MotionBox
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <Typography
            sx={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: { xs: '2.2rem', md: '3.4rem' },
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: DAY.text,
            }}
          >
            Become the{' '}
            <Box component="span" sx={{ background: DAY.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              master of your category
            </Box>
            .
          </Typography>
          <Typography sx={{ mt: 2.5, fontSize: { xs: '1rem', md: '1.18rem' }, color: DAY.sub, maxWidth: 560, mx: 'auto', lineHeight: 1.65 }}>
            {finalCta.subtitle}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mt: 5 }}>
            <Magnetic>
              <Button component={Link} href="https://mymarketiq.online" size="large" sx={shineBtnSx()} endIcon={<ArrowForwardRoundedIcon />}>
                {finalCta.primary}
              </Button>
            </Magnetic>
            <Magnetic strength={0.22}>
              <Button component="a" href="mailto:info@trayarunyaventures.com?subject=MarketiQ%20AI%20demo" size="large" sx={ghostBtnSx}>
                {finalCta.secondary}
              </Button>
            </Magnetic>
          </Stack>

          {/* Product Hunt launch announcement */}
          <Box sx={{ mt: { xs: 7, md: 9 } }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FF6154', mb: 2 }}>
              🚀 Launching on Product Hunt · {PRODUCT_HUNT.launchDate}
            </Typography>
            <ProductHuntLaunchCard />
          </Box>
        </MotionBox>
      </Container>
    </Box>
  );
}
