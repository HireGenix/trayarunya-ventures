'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useAuth } from '@/lib/auth';
import {
  Strategies,
  Calendar,
  ALL_PLATFORMS,
  AI_MODELS,
  type Strategy,
  type ContentCalendar,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function CalendarGenerator({
  strategies,
  defaultStrategyId,
  defaultClient,
}: {
  strategies: Strategy[];
  defaultStrategyId?: string;
  defaultClient?: string;
}) {
  const [client, setClient] = useState(defaultClient || '');
  const [goal, setGoal] = useState('');
  const [provider, setProvider] = useState<string>(AI_MODELS[0].id);
  const [strategyId, setStrategyId] = useState<string>(defaultStrategyId || '');
  const [platforms, setPlatforms] = useState<string[]>([...ALL_PLATFORMS]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<ContentCalendar | null>(null);

  useEffect(() => {
    if (defaultClient) setClient((c) => c || defaultClient);
  }, [defaultClient]);

  useEffect(() => {
    if (defaultStrategyId) setStrategyId((s) => s || defaultStrategyId);
  }, [defaultStrategyId]);

  const toggle = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const run = async () => {
    setBusy(true);
    setError('');
    setDone(null);
    try {
      const cal = await Calendar.generate({
        client_name: client.trim() || undefined,
        goal: goal.trim() || undefined,
        strategy_id: strategyId || undefined,
        platforms,
        start_date: todayISO(),
        provider,
      });
      setDone(cal);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calendar generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800}>
          Generate content calendar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Date-aware plan from today ({new Date().toLocaleDateString()}) through end of month,
          across every channel. Pick a strategy to ground the plan, then generate the actual posts
          per entry in Content Studio.
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              label="Base strategy"
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              fullWidth
              helperText={
                strategies.length ? 'Calendar is built on this strategy' : 'No strategies yet — optional'
              }
            >
              <MenuItem value="">No strategy (brand only)</MenuItem>
              {strategies.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.title}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Client / brand name"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              label="AI model"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              fullWidth
            >
              {AI_MODELS.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Primary goal (optional)"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Book 20 B2B demos / drive newsletter signups"
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              PLATFORMS
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {ALL_PLATFORMS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  onClick={() => toggle(p)}
                  color={platforms.includes(p) ? 'primary' : 'default'}
                  variant={platforms.includes(p) ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
          <Button variant="contained" onClick={run} disabled={busy || platforms.length === 0}>
            {busy ? <CircularProgress size={22} /> : 'Generate calendar'}
          </Button>
          {busy && (
            <Typography variant="body2" color="text.secondary">
              Planning across {platforms.length} platforms… this can take up to 2 minutes.
            </Typography>
          )}
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {done && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Created “{done.title}” with {done.entries.length} entries ({done.start_date} →{' '}
            {done.end_date}). Open Content Studio to generate each piece.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

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
  const confirm = useConfirm();
  const [list, setList] = useState<Strategy[]>([]);
  const [selected, setSelected] = useState<Strategy | null>(null);
  const [error, setError] = useState('');
  const [editStrat, setEditStrat] = useState<Strategy | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editObjective, setEditObjective] = useState('');

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

  const deleteStrategy = async (s: Strategy) => {
    const ok = await confirm({
      title: 'Delete strategy?',
      message: (
        <>
          Delete strategy <b>“{s.title}”</b>? Calendars built from it will remain but lose their
          link.
        </>
      ),
    });
    if (!ok) return;
    try {
      await Strategies.remove(s.id);
      setList((prev) => prev.filter((x) => x.id !== s.id));
      if (selected?.id === s.id) setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const openEdit = (s: Strategy) => {
    setEditStrat(s);
    setEditTitle(s.title);
    setEditObjective(s.objective || '');
  };

  const saveEdit = async () => {
    if (!editStrat || !editTitle.trim()) return;
    try {
      const updated = await Strategies.update(editStrat.id, {
        title: editTitle.trim(),
        objective: editObjective.trim() || undefined,
      });
      setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      if (selected?.id === updated.id) setSelected(updated);
      setEditStrat(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <CalendarGenerator
        strategies={list}
        defaultStrategyId={selected?.id}
        defaultClient={activeWorkspace?.name}
      />
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
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={0.5}
                  sx={{ px: 1, pb: 0.5 }}
                >
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(s)} aria-label="edit">
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => deleteStrategy(s)} aria-label="delete">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
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

      <Dialog open={!!editStrat} onClose={() => setEditStrat(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit strategy</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Objective"
              value={editObjective}
              onChange={(e) => setEditObjective(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditStrat(null)} color="inherit">
            Cancel
          </Button>
          <Button onClick={saveEdit} variant="contained" disabled={!editTitle.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 4 }}>Loading…</Box>}>
      <StrategyInner />
    </Suspense>
  );
}
