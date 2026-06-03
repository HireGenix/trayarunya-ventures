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
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
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
import { BRAND } from '@/theme/theme';

/* ── shared style tokens ────────────────────────────────── */
const R = 16;
const softShadow = '0 1px 3px rgba(14,17,22,0.04)';
const liftShadow = '0 12px 32px rgba(14,17,22,0.08)';
const sectionLabel = {
  fontWeight: 700,
  fontSize: '0.68rem',
  letterSpacing: '0.09em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  mb: 1.5,
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── CalendarGenerator ──────────────────────────────────── */

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
    <Card
      sx={{
        borderRadius: `${R + 2}px`,
        overflow: 'hidden',
        boxShadow: softShadow,
      }}
    >
      {/* gradient header strip */}
      <Box
        sx={{
          background: BRAND.gradient,
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <CalendarMonthOutlinedIcon sx={{ color: '#fff', fontSize: 22 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
            Generate content calendar
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.82)' }}>
            Date-aware plan from today ({new Date().toLocaleDateString()}) through end of month
          </Typography>
        </Box>
      </Box>

      <CardContent sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Pick a strategy to ground the plan, then generate the actual posts per entry in Content
          Studio.
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
                strategies.length
                  ? 'Calendar is built on this strategy'
                  : 'No strategies yet — optional'
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

          {/* platform pills */}
          <Grid size={{ xs: 12 }}>
            <Typography sx={sectionLabel}>Platforms</Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {ALL_PLATFORMS.map((p) => {
                const on = platforms.includes(p);
                return (
                  <Chip
                    key={p}
                    label={p}
                    onClick={() => toggle(p)}
                    sx={{
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '999px',
                      px: 0.5,
                      ...(on
                        ? {
                            background: BRAND.gradient,
                            color: '#fff',
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(20,187,135,0.22)',
                          }
                        : {
                            background: '#fff',
                            border: '1px solid #EAECEF',
                            color: 'text.secondary',
                            '&:hover': { borderColor: BRAND.amber, background: BRAND.amberSoft },
                          }),
                    }}
                  />
                );
              })}
            </Stack>
          </Grid>
        </Grid>

        {/* CTA row */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={run}
            disabled={busy || platforms.length === 0}
            sx={{
              background: BRAND.gradient,
              fontWeight: 700,
              px: 4,
              py: 1.2,
              fontSize: '0.9rem',
              '&:hover': { boxShadow: '0 8px 24px rgba(20,187,135,0.28)' },
            }}
          >
            {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Generate calendar'}
          </Button>
          {busy && (
            <Typography variant="body2" color="text.secondary">
              Planning across {platforms.length} platforms… this can take up to 2 minutes.
            </Typography>
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: `${R}px` }}>
            {error}
          </Alert>
        )}
        {done && (
          <Alert severity="success" sx={{ mt: 2, borderRadius: `${R}px` }}>
            Created &ldquo;{done.title}&rdquo; with {done.entries.length} entries ({done.start_date}{' '}
            &rarr; {done.end_date}). Open Content Studio to generate each piece.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/* ── StrategyDetail ─────────────────────────────────────── */

function StrategyDetail({ strategy }: { strategy: Strategy }) {
  const funnelColors: Record<string, string> = {
    tofu: BRAND.amber,
    mofu: BRAND.teal,
    bofu: BRAND.pink,
    awareness: BRAND.amber,
    consideration: BRAND.teal,
    conversion: BRAND.pink,
    top: BRAND.amber,
    middle: BRAND.teal,
    bottom: BRAND.pink,
  };
  const funnelBgs: Record<string, string> = {
    tofu: BRAND.amberSoft,
    mofu: '#E4F8F0',
    bofu: '#FDE8EC',
    awareness: BRAND.amberSoft,
    consideration: '#E4F8F0',
    conversion: '#FDE8EC',
    top: BRAND.amberSoft,
    middle: '#E4F8F0',
    bottom: '#FDE8EC',
  };

  return (
    <Card sx={{ borderRadius: `${R + 2}px`, boxShadow: softShadow, overflow: 'visible' }}>
      {/* title header with gradient accent bar */}
      <Box
        sx={{
          px: { xs: 3, sm: 4 },
          pt: 4,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: `${R + 2}px ${R + 2}px 0 0`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: BRAND.gradient,
          },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            background: BRAND.gradientText,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {strategy.title}
        </Typography>
      </Box>

      <Box sx={{ px: { xs: 3, sm: 4 }, py: 3 }}>
        {/* Positioning callout */}
        {strategy.positioning && (
          <Box
            sx={{
              mb: 4,
              p: 2.5,
              borderRadius: `${R}px`,
              background: BRAND.amberSoft,
              border: '1px solid #FFE2A6',
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
            }}
          >
            <FormatQuoteRoundedIcon sx={{ color: BRAND.amberDeep, mt: 0.3, flexShrink: 0 }} />
            <Box>
              <Typography sx={sectionLabel}>Positioning</Typography>
              <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'text.primary' }}>
                {strategy.positioning}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Content pillars */}
        {strategy.pillars && strategy.pillars.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography sx={sectionLabel}>Content pillars</Typography>
            <Grid container spacing={2}>
              {strategy.pillars.map((p, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: `${R}px`,
                      border: '1px solid',
                      borderColor: 'divider',
                      background: '#fff',
                      height: '100%',
                      transition: 'box-shadow 0.2s, border-color 0.2s',
                      '&:hover': { boxShadow: liftShadow, borderColor: '#DDE0E5' },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: BRAND.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {p.name}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {p.why}
                    </Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {(p.angles || []).map((a, j) => (
                        <Chip key={j} label={a} size="small" color="secondary" />
                      ))}
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Funnel */}
        {strategy.funnel && (
          <Box sx={{ mb: 4 }}>
            <Typography sx={sectionLabel}>Funnel</Typography>
            <Grid container spacing={2}>
              {Object.entries(strategy.funnel).map(([stage, items], idx) => {
                const key = stage.toLowerCase();
                const accent = funnelColors[key] || [BRAND.amber, BRAND.teal, BRAND.pink][idx % 3];
                const bg = funnelBgs[key] || [BRAND.amberSoft, '#E4F8F0', '#FDE8EC'][idx % 3];
                return (
                  <Grid key={stage} size={{ xs: 12, sm: 4 }}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: `${R}px`,
                        background: bg,
                        border: `1px solid ${accent}22`,
                        height: '100%',
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ textTransform: 'uppercase', color: accent, fontWeight: 800, mb: 1 }}
                      >
                        {stage}
                      </Typography>
                      <Stack spacing={0.5}>
                        {(items as string[]).map((it, i) => (
                          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: accent,
                                mt: '7px',
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="body2" color="text.primary">
                              {it}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* Lead magnets */}
        {strategy.lead_magnets && strategy.lead_magnets.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography sx={sectionLabel}>Lead magnets</Typography>
            <Stack spacing={1}>
              {strategy.lead_magnets.map((lm, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 2,
                    borderRadius: `${R - 2}px`,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    background: '#fff',
                  }}
                >
                  <TipsAndUpdatesOutlinedIcon
                    sx={{ color: BRAND.amberDeep, fontSize: 22, flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {lm.title}
                      </Typography>
                      <Chip label={lm.format} size="small" color="primary" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {lm.promise}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* 4-week calendar */}
        {strategy.content_calendar && strategy.content_calendar.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography sx={sectionLabel}>4-week calendar</Typography>
            <Stack spacing={2}>
              {strategy.content_calendar.map((wk, i) => (
                <Box
                  key={i}
                  sx={{
                    borderRadius: `${R}px`,
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    background: '#fff',
                  }}
                >
                  {/* week header */}
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.2,
                      background: i % 2 === 0 ? '#F9FAFB' : BRAND.amberSoft,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        px: 1.2,
                        py: 0.25,
                        borderRadius: 2,
                        background: BRAND.gradient,
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        letterSpacing: '0.04em',
                        lineHeight: 1.6,
                      }}
                    >
                      WK {wk.week}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {wk.theme}
                    </Typography>
                  </Box>
                  {/* items */}
                  <Stack sx={{ px: 2.5, py: 1.5 }} spacing={0.75}>
                    {(wk.items || []).map((it, j) => (
                      <Stack
                        key={j}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          py: 0.5,
                          borderBottom:
                            j < (wk.items || []).length - 1 ? '1px solid #F3F4F6' : 'none',
                        }}
                      >
                        <Chip label={it.platform} size="small" color="primary" />
                        <Chip label={it.type} size="small" color="secondary" />
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                          {it.hook}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* KPIs */}
        {strategy.kpis && strategy.kpis.length > 0 && (
          <Box>
            <Divider sx={{ mb: 2.5 }} />
            <Typography sx={sectionLabel}>KPIs</Typography>
            <Grid container spacing={1.5}>
              {strategy.kpis.map((k, i) => (
                <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: `${R - 2}px`,
                      background: i % 2 === 0 ? '#E4F8F0' : BRAND.amberSoft,
                      border: `1px solid ${i % 2 === 0 ? '#BFEBDC' : '#FFE2A6'}`,
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}
                    >
                      {k.metric}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.25 }}>
                      {k.target}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>
    </Card>
  );
}

/* ── StrategyInner ──────────────────────────────────────── */

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
          Delete strategy <b>&ldquo;{s.title}&rdquo;</b>? Calendars built from it will remain but
          lose their link.
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
    <Stack spacing={4}>
      {/* ── page header ── */}
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 3,
              background: BRAND.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesomeOutlinedIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Typography variant="h3">Strategy</Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
          Build content strategies from research, then generate date-aware calendars across every
          channel.
        </Typography>
      </Box>

      {/* ── error ── */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: `${R}px` }}>
          {error}
        </Alert>
      )}

      {/* ── calendar generator ── */}
      <CalendarGenerator
        strategies={list}
        defaultStrategyId={selected?.id}
        defaultClient={activeWorkspace?.name}
      />

      {/* ── strategy list + detail ── */}
      <Grid container spacing={3}>
        {/* left column — strategy list */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography sx={{ ...sectionLabel, mb: 2 }}>Strategies</Typography>

          <Stack spacing={1.5}>
            {list.length === 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 5,
                  px: 3,
                  borderRadius: `${R}px`,
                  border: '1px dashed',
                  borderColor: 'divider',
                  background: '#FAFBFC',
                }}
              >
                <FolderOpenOutlinedIcon
                  sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }}
                />
                <Typography variant="subtitle2" color="text.secondary">
                  No strategies yet
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Generate one from a completed research job.
                </Typography>
              </Box>
            )}

            {list.map((s) => {
              const active = selected?.id === s.id;
              return (
                <Card
                  key={s.id}
                  sx={{
                    borderRadius: `${R}px`,
                    border: active ? `2px solid ${BRAND.teal}` : '1px solid',
                    borderColor: active ? BRAND.teal : 'divider',
                    background: active ? '#E4F8F0' : '#fff',
                    boxShadow: active ? `0 0 0 3px ${BRAND.teal}22` : softShadow,
                    transition: 'all 0.18s ease',
                    '&:hover': {
                      boxShadow: active ? `0 0 0 3px ${BRAND.teal}22` : liftShadow,
                      transform: active ? 'none' : 'translateY(-2px)',
                    },
                    overflow: 'hidden',
                  }}
                >
                  <CardActionArea
                    onClick={() => setSelected(s)}
                    sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}
                  >
                    {/* gradient dot / initial avatar */}
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: active ? BRAND.gradient : '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.18s',
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          color: active ? '#fff' : 'text.secondary',
                        }}
                      >
                        {s.title.charAt(0).toUpperCase()}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(s.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
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
                      <IconButton
                        size="small"
                        onClick={() => deleteStrategy(s)}
                        aria-label="delete"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* right column — detail */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selected ? (
            <StrategyDetail strategy={selected} />
          ) : (
            <Card
              sx={{
                height: '100%',
                borderRadius: `${R + 2}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 280,
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <AutoAwesomeOutlinedIcon
                  sx={{ fontSize: 48, color: BRAND.amber, opacity: 0.6, mb: 1.5 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Select a strategy
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, mx: 'auto' }}>
                  Pick one from the list to view the full plan — positioning, pillars, funnel,
                  calendar and KPIs.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* ── edit dialog ── */}
      <Dialog open={!!editStrat} onClose={() => setEditStrat(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Edit strategy</DialogTitle>
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditStrat(null)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={saveEdit}
            variant="contained"
            disabled={!editTitle.trim()}
            sx={{ background: BRAND.gradient, fontWeight: 700 }}
          >
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
