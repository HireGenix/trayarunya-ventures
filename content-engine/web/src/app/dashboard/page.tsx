'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '@/lib/auth';
import { Research, Strategies, type ResearchJob, type Strategy } from '@/lib/api';
import { BRAND } from '@/theme/theme';

export default function OverviewPage() {
  const { activeWorkspace } = useAuth();
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  useEffect(() => {
    if (!activeWorkspace) return;
    Research.list().then(setJobs).catch(() => setJobs([]));
    Strategies.list().then(setStrategies).catch(() => setStrategies([]));
  }, [activeWorkspace]);

  const succeeded = jobs.filter((j) => j.status === 'succeeded').length;

  const stats = [
    { label: 'Research jobs', value: jobs.length, color: BRAND.amber, grad: `linear-gradient(135deg,${BRAND.amber},#FF7A59)` },
    { label: 'Completed research', value: succeeded, color: BRAND.teal, grad: `linear-gradient(135deg,${BRAND.teal},#4DCCA3)` },
    { label: 'Strategies', value: strategies.length, color: BRAND.pink, grad: `linear-gradient(135deg,${BRAND.pink},#E35A72)` },
  ];

  const steps = [
    {
      icon: <ScienceIcon fontSize="small" />,
      title: 'Research',
      body: 'Agents crawl your site and the live web to map demand, keywords and competitors.',
      href: '/dashboard/research',
      cta: 'Start research',
      color: BRAND.teal,
    },
    {
      icon: <InsightsIcon fontSize="small" />,
      title: 'Strategy',
      body: 'Turn a research brief into pillars, a funnel and a dated content calendar.',
      href: '/dashboard/strategy',
      cta: 'Build strategy',
      color: BRAND.amber,
    },
    {
      icon: <AutoAwesomeIcon fontSize="small" />,
      title: 'Studio',
      body: 'Generate on-brand posts, carousels and PDFs for every platform in one click.',
      href: '/dashboard/studio',
      cta: 'Open studio',
      color: BRAND.pink,
    },
    {
      icon: <SendIcon fontSize="small" />,
      title: 'Publishing',
      body: 'Review captions and hashtags, then publish to each channel from one place.',
      href: '/dashboard/publishing',
      cta: 'Go to publishing',
      color: '#2563EB',
    },
  ];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              background: BRAND.gradientText,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'inline-block',
            }}
          >
            {activeWorkspace?.name || 'Workspace'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Research, strategise, create and publish — one closed loop.
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/dashboard/research"
          variant="contained"
          color="primary"
          endIcon={<ArrowForwardIcon />}
        >
          New research
        </Button>
      </Stack>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 4 }}>
            <Card sx={{ overflow: 'hidden', position: 'relative' }}>
              <Box sx={{ height: 5, background: s.grad }} />
              <CardContent sx={{ py: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography
                      variant="overline"
                      color="text.disabled"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      {s.label}
                    </Typography>
                    <Typography variant="h3" fontWeight={800} sx={{ color: s.color }}>
                      {s.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 3,
                      background: s.grad,
                      opacity: 0.16,
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="overline" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
        The pipeline
      </Typography>
      <Grid container spacing={2.5}>
        {steps.map((step, i) => (
          <Grid key={step.title} size={{ xs: 12, sm: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2.5,
                      display: 'grid',
                      placeItems: 'center',
                      background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
                      color: '#fff',
                      boxShadow: `0 6px 16px ${step.color}40`,
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Chip
                    label={`Step ${i + 1}`}
                    size="small"
                    sx={{
                      bgcolor: `${step.color}1A`,
                      color: step.color,
                      border: `1px solid ${step.color}33`,
                      fontWeight: 700,
                    }}
                  />
                </Stack>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2.5, flexGrow: 1 }}>
                  {step.body}
                </Typography>
                <Button
                  component={Link}
                  href={step.href}
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    alignSelf: 'flex-start',
                    borderColor: `${step.color}55`,
                    color: step.color,
                    '&:hover': { borderColor: step.color, background: `${step.color}12`, color: step.color },
                  }}
                >
                  {step.cta}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
