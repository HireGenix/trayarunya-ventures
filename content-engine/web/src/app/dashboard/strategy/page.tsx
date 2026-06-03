'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/lib/auth';
import { Strategies, type Strategy } from '@/lib/api';

function StrategyDetail({ strategy }: { strategy: Strategy }) {
  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          {strategy.title}
        </Typography>
        {strategy.positioning && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              POSITIONING
            </Typography>
            <Typography>{strategy.positioning}</Typography>
          </Box>
        )}

        {strategy.pillars && strategy.pillars.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Content pillars
            </Typography>
            <Grid container spacing={2}>
              {strategy.pillars.map((p, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography fontWeight={700}>{p.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {p.why}
                      </Typography>
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {(p.angles || []).map((a, j) => (
                          <Chip key={j} label={a} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {strategy.funnel && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Funnel
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(strategy.funnel).map(([stage, items]) => (
                <Grid key={stage} size={{ xs: 12, sm: 4 }}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                    {stage}
                  </Typography>
                  <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
                    {(items as string[]).map((it, i) => (
                      <li key={i}>
                        <Typography variant="body2" color="text.secondary">
                          {it}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {strategy.lead_magnets && strategy.lead_magnets.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Lead magnets
            </Typography>
            {strategy.lead_magnets.map((lm, i) => (
              <Box key={i} sx={{ mb: 1.5 }}>
                <Typography fontWeight={600}>
                  {lm.title} <Chip label={lm.format} size="small" sx={{ ml: 1 }} />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {lm.promise}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {strategy.content_calendar && strategy.content_calendar.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              4-week calendar
            </Typography>
            {strategy.content_calendar.map((wk, i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Typography fontWeight={700}>
                  Week {wk.week}: {wk.theme}
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {(wk.items || []).map((it, j) => (
                    <Stack key={j} direction="row" spacing={1} alignItems="center">
                      <Chip label={it.platform} size="small" color="primary" variant="outlined" />
                      <Chip label={it.type} size="small" variant="outlined" />
                      <Typography variant="body2">{it.hook}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        )}

        {strategy.kpis && strategy.kpis.length > 0 && (
          <Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              KPIs
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {strategy.kpis.map((k, i) => (
                <Chip key={i} label={`${k.metric}: ${k.target}`} color="secondary" />
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function StrategyInner() {
  const { activeWorkspace } = useAuth();
  const params = useSearchParams();
  const focus = params.get('focus');
  const [list, setList] = useState<Strategy[]>([]);
  const [selected, setSelected] = useState<Strategy | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    Strategies.list()
      .then((items) => {
        setList(items);
        const target = items.find((s) => s.id === focus) || items[0] || null;
        setSelected(target);
      })
      .catch(() => setList([]));
  }, [activeWorkspace, focus]);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          STRATEGIES
        </Typography>
        <Stack spacing={1.5}>
          {list.length === 0 && (
            <Typography color="text.secondary">
              No strategies yet. Generate one from a completed research job.
            </Typography>
          )}
          {list.map((s) => (
            <Card key={s.id} variant="outlined">
              <CardActionArea onClick={() => setSelected(s)} sx={{ p: 2 }}>
                <Typography fontWeight={600}>{s.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(s.created_at).toLocaleDateString()}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        {selected ? (
          <StrategyDetail strategy={selected} />
        ) : (
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>Select a strategy to view the full plan.</Typography>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 4 }}>Loading…</Box>}>
      <StrategyInner />
    </Suspense>
  );
}
