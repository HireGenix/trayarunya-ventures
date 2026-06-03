'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import InsightsIcon from '@mui/icons-material/Insights';
import { useAuth } from '@/lib/auth';
import { Research, Strategies, type ResearchJob, type Strategy } from '@/lib/api';

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
    { label: 'Research jobs', value: jobs.length },
    { label: 'Completed research', value: succeeded },
    { label: 'Strategies', value: strategies.length },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Welcome to {activeWorkspace?.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Kick off deep research, then turn it into a master content + social strategy.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h3" fontWeight={800} color="primary.dark">
                  {s.value}
                </Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <ScienceIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
                Start deep research
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Agents crawl your site and the live web to map demand, keywords and competitors.
              </Typography>
              <Button component={Link} href="/dashboard/research" variant="contained" color="primary">
                New research
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <InsightsIcon color="secondary" sx={{ fontSize: 40 }} />
              <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
                Generate strategy
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Turn a completed research brief into pillars, a funnel and a 4-week calendar.
              </Typography>
              <Button component={Link} href="/dashboard/strategy" variant="outlined" color="inherit">
                View strategies
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
