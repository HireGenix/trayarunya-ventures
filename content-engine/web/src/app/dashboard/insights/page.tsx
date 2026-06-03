'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/lib/auth';
import { Insights, type ExplorerInsight } from '@/lib/api';

const INTENT_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning'> = {
  informational: 'primary',
  commercial: 'success',
  navigational: 'secondary',
  transactional: 'warning',
};

export default function InsightsPage() {
  const { activeWorkspace } = useAuth();
  const [items, setItems] = useState<ExplorerInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [intent, setIntent] = useState('');

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Insights.list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeWorkspace]);

  const intents = useMemo(
    () => Array.from(new Set(items.map((i) => i.intent).filter(Boolean))) as string[],
    [items],
  );

  const filtered = items.filter((i) => {
    if (intent && i.intent !== intent) return false;
    if (q && !i.text.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const g: Record<string, ExplorerInsight[]> = {};
    for (const it of filtered) (g[it.kind] ||= []).push(it);
    return g;
  }, [filtered]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Insight Explorer
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            AnswerThePublic-style questions, topics and angles mined from your research — the raw
            material for high-intent content.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Search insights"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All intents</MenuItem>
              {intents.map((it) => (
                <MenuItem key={it} value={it}>
                  {it}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Typography color="text.secondary">
          No insights yet. Run a research job to populate the explorer.
        </Typography>
      ) : (
        Object.entries(grouped).map(([kind, list]) => (
          <Box key={kind}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase' }}>
              {kind} · {list.length}
            </Typography>
            <Grid container spacing={2}>
              {list.map((i) => (
                <Grid key={i.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography sx={{ mb: 1 }}>{i.text}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {i.intent && (
                          <Chip
                            size="small"
                            label={i.intent}
                            color={INTENT_COLORS[i.intent] || 'default'}
                            variant="outlined"
                          />
                        )}
                        <Chip size="small" label={`score ${i.score.toFixed(2)}`} />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}
    </Stack>
  );
}
