'use client';

import Link from 'next/link';
import { Box, Button, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const MotionBox = motion.create(Box);

const STEPS = [
  { n: '01', t: 'Deep Research', d: 'Agents crawl your site + the live web (DuckDuckGo + crawl4ai), map the demand and read every competitor.' },
  { n: '02', t: 'Master Strategy', d: 'A DSPy-powered strategist turns evidence into pillars, a funnel, lead magnets and a 4-week calendar.' },
  { n: '03', t: 'Creation Studio', d: 'On-brand posts, threads, blogs and lead magnets — written in your voice, QA-gated before they ship.' },
  { n: '04', t: 'Publish & Optimise', d: 'Schedule to LinkedIn, X & more via native OAuth. Agentic ads create and optimise campaigns.' },
  { n: '05', t: 'Learn & Compound', d: 'Real metrics feed a learning loop that sharpens every future strategy automatically.' },
];

const AUDIENCE = ['Individuals', 'Freelancers', 'Companies', 'Agencies'];

export default function Landing() {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Nav */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={800}>
            Trayarunya <span style={{ color: '#ffaf06' }}>Content Engine</span>
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button component={Link} href="/login" color="inherit">
              Log in
            </Button>
            <Button component={Link} href="/signup" variant="contained" color="primary">
              Start free
            </Button>
          </Stack>
        </Stack>
      </Container>

      {/* Hero */}
      <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 12 }, pb: 8 }}>
        <MotionBox
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Chip
            label="Agentic • Multi-tenant • Production-grade"
            color="secondary"
            sx={{ mb: 3, fontWeight: 600 }}
          />
          <Typography variant="h1" sx={{ maxWidth: 900, lineHeight: 1.05 }}>
            Your content team that{' '}
            <span style={{ color: '#ffaf06' }}>researches, strategises</span> and{' '}
            <span style={{ color: '#14bb87' }}>ships</span> — on autopilot.
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mt: 3, maxWidth: 720, fontWeight: 400 }}>
            One closed loop from market research to published posts and optimised ads.
            We treat your growth as our own.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 5 }}>
            <Button component={Link} href="/signup" variant="contained" color="primary" size="large">
              Build my strategy
            </Button>
            <Button component={Link} href="/login" variant="outlined" color="inherit" size="large">
              See the dashboard
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 4, flexWrap: 'wrap', gap: 1 }}>
            {AUDIENCE.map((a) => (
              <Chip key={a} label={a} variant="outlined" />
            ))}
          </Stack>
        </MotionBox>
      </Container>

      {/* How it works */}
      <Box sx={{ bgcolor: '#0E1726', color: '#fff', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography variant="h2" sx={{ mb: 1 }}>
            How the engine works
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 400, mb: 6 }}>
            Five agentic stages, one compounding system.
          </Typography>
          <Grid container spacing={3}>
            {STEPS.map((s, i) => (
              <Grid key={s.n} size={{ xs: 12, md: i < 2 ? 6 : 4 }}>
                <MotionBox
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  sx={{
                    p: 4,
                    height: '100%',
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background:
                      'linear-gradient(160deg, rgba(255,175,6,0.06), rgba(20,187,135,0.04))',
                  }}
                >
                  <Typography variant="h3" sx={{ color: '#ffaf06', fontWeight: 800 }}>
                    {s.n}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1, mb: 1.5 }}>
                    {s.t}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>{s.d}</Typography>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Become the master of your category.
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, mb: 4 }}>
          Spin up a workspace, point it at your website, and watch a real strategy appear.
        </Typography>
        <Button component={Link} href="/signup" variant="contained" color="primary" size="large">
          Start free
        </Button>
      </Container>

      <Box sx={{ py: 4, borderTop: '1px solid rgba(14,23,38,0.08)', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Trayarunya Ventures — Content Engine
        </Typography>
      </Box>
    </Box>
  );
}
