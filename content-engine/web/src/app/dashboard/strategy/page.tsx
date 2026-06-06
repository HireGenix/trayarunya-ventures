'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
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
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded';
import { useAuth } from '@/lib/auth';
import {
  Strategies,
  Research,
  Calendar,
  Learning,
  ALL_PLATFORMS,
  AI_MODELS,
  type Strategy,
  type ResearchJob,
  type ContentCalendar,
} from '@/lib/api';
import { useAIModels } from '@/lib/useAIModels';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
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

const HERO_BG = 'linear-gradient(135deg, #11151B 0%, #1B2330 55%, #0E1A18 100%)';

/* ── StrategyMaker (generate strategy from research) ─────── */

function StrategyMaker({
  defaultObjective,
  onCreated,
}: {
  defaultObjective?: string;
  onCreated: (s: Strategy) => void;
}) {
  const router = useRouter();
  const { models: aiModels } = useAIModels();
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobId, setJobId] = useState('');
  const [objective, setObjective] = useState('');
  const [provider, setProvider] = useState<string>(AI_MODELS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Research.list()
      .then((items) => {
        const done = items.filter((j) => j.status === 'succeeded');
        setJobs(done);
        if (done[0]) setJobId((cur) => cur || done[0].id);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoadingJobs(false));
  }, []);

  useEffect(() => {
    if (defaultObjective) setObjective((o) => o || defaultObjective);
  }, [defaultObjective]);

  const run = async () => {
    if (!jobId) return;
    setBusy(true);
    setError('');
    try {
      const s = await Strategies.create({
        research_job_id: jobId,
        objective: objective.trim() || undefined,
      });
      onCreated(s);
      setObjective('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Strategy generation failed');
    } finally {
      setBusy(false);
    }
  };

  const noResearch = !loadingJobs && jobs.length === 0;

  return (
    <Card sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 16px 40px rgba(14,17,22,0.10)' }}>
      {/* dark gradient header */}
      <Box sx={{ position: 'relative', overflow: 'hidden', px: { xs: 2.5, md: 3.5 }, py: 2.75, background: HERO_BG }}>
        <Box sx={{ position: 'absolute', top: -70, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.30), transparent 65%)' }} />
        <Stack direction="row" spacing={1.75} alignItems="center" sx={{ position: 'relative' }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', background: BRAND.gradient, color: '#062019', flexShrink: 0 }}>
            <ScienceOutlinedIcon />
          </Box>
          <Box>
            <Typography sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 900, lineHeight: 1.15, color: '#fff' }}>
              Build a new strategy
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.62)' }}>
              Turn a completed research job into a full positioning, pillars, funnel &amp; calendar plan.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        {noResearch ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <InsightsOutlinedIcon sx={{ fontSize: 38, color: 'text.disabled', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              No completed research yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 380, mx: 'auto' }}>
              Strategies are grounded in real research. Run a deep-research job first, then come back to
              generate a data-backed strategy.
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/dashboard/research')}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{ background: BRAND.gradient, fontWeight: 700, textTransform: 'none', px: 3 }}
            >
              Go to Research
            </Button>
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  label="Research foundation"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  fullWidth
                  disabled={loadingJobs}
                  helperText={loadingJobs ? 'Loading research…' : 'Strategy is grounded in this research'}
                >
                  {jobs.map((j) => (
                    <MenuItem key={j.id} value={j.id}>
                      {j.topic}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  label="AI model"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  fullWidth
                >
                  {aiModels.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Primary objective (optional)"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="e.g. Grow to 50k followers and book 30 demos / quarter"
                  fullWidth
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2.5 }}>
              <Button
                variant="contained"
                onClick={run}
                disabled={busy || !jobId}
                startIcon={busy ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <RocketLaunchRoundedIcon />}
                sx={{
                  background: BRAND.gradient,
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 3.5,
                  py: 1.1,
                  fontSize: '0.9rem',
                  '&:hover': { boxShadow: '0 8px 24px rgba(20,187,135,0.28)' },
                }}
              >
                {busy ? 'Designing strategy…' : 'Generate strategy'}
              </Button>
              {busy && (
                <Typography variant="body2" color="text.secondary">
                  Synthesising positioning, pillars, funnel &amp; KPIs…
                </Typography>
              )}
            </Stack>

            {error && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: `${R}px` }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
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
  const { models: aiModels } = useAIModels();
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
              {aiModels.map((m) => (
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

/* ── Learning loop ──────────────────────────────────────── */

type LearnSignal = {
  id: string;
  kind: 'top_performer' | 'underperformer' | 'pattern' | string;
  title: string;
  detail: string | null;
  recommendation: string | null;
  metric: Record<string, unknown> | null;
  applied: boolean;
  created_at: string | null;
};

type Refinement = {
  summary: string;
  keep: string[];
  stop: string[];
  double_down: string[];
  pillar_changes: string[];
  updated_pillars: Strategy['pillars'];
};

const SIGNAL_STYLE: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  top_performer: { color: BRAND.tealDeep, bg: '#E4F8F0', border: '#BFEBDC', label: 'Top performer' },
  underperformer: { color: BRAND.pink, bg: '#FDE8EC', border: '#F7C6D0', label: 'Underperformer' },
  pattern: { color: BRAND.amberDeep, bg: BRAND.amberSoft, border: '#FFE2A6', label: 'Pattern' },
};

function signalStyle(kind: string) {
  return SIGNAL_STYLE[kind] || SIGNAL_STYLE.pattern;
}

function LearningLoopPanel({
  strategy,
  onApplied,
}: {
  strategy: Strategy;
  onApplied: () => void;
}) {
  const [signals, setSignals] = useState<LearnSignal[]>([]);
  const [refinement, setRefinement] = useState<Refinement | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [refining, setRefining] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSignals([]);
    setRefinement(null);
    setLoaded(false);
    Learning.signals()
      .then((s) => setSignals(s as LearnSignal[]))
      .catch(() => setSignals([]))
      .finally(() => setLoaded(true));
  }, [strategy.id]);

  const analyze = async () => {
    setAnalyzing(true);
    setError('');
    setRefinement(null);
    try {
      const s = await Learning.analyze();
      setSignals(s as LearnSignal[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const refine = async () => {
    setRefining(true);
    setError('');
    try {
      const r = await Learning.refineStrategy(strategy.id);
      setRefinement(r as Refinement);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refinement failed');
    } finally {
      setRefining(false);
    }
  };

  const apply = async () => {
    if (!refinement) return;
    setApplying(true);
    setError('');
    try {
      await Learning.applyStrategy(strategy.id, refinement.updated_pillars);
      setRefinement(null);
      onApplied();
      const s = await Learning.signals();
      setSignals(s as LearnSignal[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Divider sx={{ mb: 2.5 }} />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <InsightsOutlinedIcon sx={{ color: BRAND.tealDeep }} />
          <Typography sx={{ ...sectionLabel, mb: 0 }}>Learning loop</Typography>
        </Stack>
        <Button
          variant="outlined"
          size="small"
          startIcon={
            analyzing ? <CircularProgress size={16} color="inherit" /> : <TrendingUpOutlinedIcon />
          }
          onClick={analyze}
          disabled={analyzing}
          sx={{ borderRadius: `${R}px`, textTransform: 'none', fontWeight: 700 }}
        >
          {analyzing ? 'Analyzing…' : 'Analyze performance'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: `${R - 4}px` }}>
          {error}
        </Alert>
      )}

      {loaded && signals.length === 0 && !analyzing && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No signals yet. Run “Analyze performance” to learn from your published posts.
        </Typography>
      )}

      {signals.length > 0 && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {signals.map((s) => {
            const st = signalStyle(s.kind);
            return (
              <Box
                key={s.id}
                sx={{
                  p: 2,
                  borderRadius: `${R}px`,
                  border: `1px solid ${st.border}`,
                  background: '#fff',
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.75 }}>
                  <Chip
                    label={st.label}
                    size="small"
                    sx={{
                      bgcolor: st.bg,
                      color: st.color,
                      fontWeight: 700,
                      borderRadius: '8px',
                    }}
                  />
                  {s.applied && (
                    <Chip
                      label="Applied"
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: '8px', fontWeight: 600 }}
                    />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {s.title}
                  </Typography>
                </Stack>
                {s.detail && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {s.detail}
                  </Typography>
                )}
                {s.recommendation && (
                  <Typography variant="body2" sx={{ color: st.color, fontWeight: 600 }}>
                    → {s.recommendation}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      {signals.length > 0 && (
        <Button
          variant="contained"
          size="small"
          startIcon={refining ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeOutlinedIcon />}
          onClick={refine}
          disabled={refining}
          sx={{ borderRadius: `${R}px`, textTransform: 'none', fontWeight: 700 }}
        >
          {refining ? 'Refining…' : 'Refine this strategy'}
        </Button>
      )}

      {refinement && (
        <Box
          sx={{
            mt: 2,
            p: 2.5,
            borderRadius: `${R}px`,
            border: '1px solid',
            borderColor: 'divider',
            background: BRAND.amberSoft,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Proposed refinement
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {refinement.summary}
          </Typography>

          {([
            ['Keep', refinement.keep, BRAND.tealDeep],
            ['Stop', refinement.stop, BRAND.pink],
            ['Double down', refinement.double_down, BRAND.amberDeep],
            ['Pillar changes', refinement.pillar_changes, BRAND.ink],
          ] as [string, string[], string][])
            .filter(([, items]) => items && items.length > 0)
            .map(([label, items, color]) => (
              <Box key={label} sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  {label}
                </Typography>
                <Stack component="ul" sx={{ m: 0, pl: 2.5, mt: 0.5 }} spacing={0.25}>
                  {items.map((it, i) => (
                    <Typography key={i} component="li" variant="body2" color="text.secondary">
                      {it}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ))}

          <Button
            variant="contained"
            size="small"
            color="secondary"
            startIcon={applying ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={apply}
            disabled={applying}
            sx={{ mt: 1, borderRadius: `${R}px`, textTransform: 'none', fontWeight: 700 }}
          >
            {applying ? 'Applying…' : 'Apply changes'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

/* ── StrategyDetail ─────────────────────────────────────── */

function StrategyDetail({
  strategy,
  onApplied,
}: {
  strategy: Strategy;
  onApplied: () => void;
}) {
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

        <LearningLoopPanel strategy={strategy} onApplied={onApplied} />
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

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const updated = await Strategies.get(selected.id);
      setSelected(updated);
      setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      /* keep current view on refresh failure */
    }
  };

  const onStrategyCreated = (s: Strategy) => {
    setList((prev) => [s, ...prev.filter((x) => x.id !== s.id)]);
    setSelected(s);
  };

  const stats = useMemo(() => {
    const pillars = list.reduce((n, s) => n + (s.pillars?.length || 0), 0);
    const grounded = list.filter((s) => s.research_job_id).length;
    return { count: list.length, pillars, grounded };
  }, [list]);

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
    <Stack spacing={3.5}>
      {/* ── hero header ── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          p: { xs: 2.5, md: 3.5 },
          color: '#fff',
          background: HERO_BG,
          boxShadow: '0 16px 40px rgba(14,17,22,0.25)',
        }}
      >
        <Box sx={{ position: 'absolute', top: -80, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.30), transparent 65%)' }} />
        <Box sx={{ position: 'absolute', bottom: -90, left: '34%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,175,6,0.20), transparent 65%)' }} />
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.5}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          sx={{ position: 'relative' }}
        >
          <Stack direction="row" spacing={1.75} alignItems="center">
            <Box sx={{ width: 46, height: 46, borderRadius: 2.75, display: 'grid', placeItems: 'center', background: BRAND.gradient, color: '#062019', flexShrink: 0 }}>
              <AutoGraphRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontSize: { xs: 22, md: 27 }, fontWeight: 900, lineHeight: 1.1, background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Strategy Engine
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', maxWidth: 460 }}>
                Turn research into a complete content strategy — positioning, pillars, funnel &amp;
                date-aware calendars across every channel.
              </Typography>
            </Box>
          </Stack>

          {/* stat strip */}
          <Stack direction="row" spacing={1.25}>
            {[
              { icon: <LayersOutlinedIcon sx={{ fontSize: 16 }} />, value: stats.count, label: 'Strategies' },
              { icon: <FlagOutlinedIcon sx={{ fontSize: 16 }} />, value: stats.pillars, label: 'Pillars' },
              { icon: <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />, value: stats.grounded, label: 'Grounded' },
            ].map((s) => (
              <Box
                key={s.label}
                sx={{
                  px: 1.75,
                  py: 1,
                  borderRadius: 2.5,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  minWidth: 78,
                  textAlign: 'center',
                }}
              >
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ color: BRAND.teal }}>
                  {s.icon}
                  <Typography sx={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', mt: 0.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Box>

      {/* ── error ── */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: `${R}px` }}>
          {error}
        </Alert>
      )}

      {/* ── strategy maker ── */}
      <StrategyMaker defaultObjective={undefined} onCreated={onStrategyCreated} />

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
            <StrategyDetail strategy={selected} onApplied={refreshSelected} />
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
      <PremiumDialog open={!!editStrat} onClose={() => setEditStrat(null)} maxWidth="sm">
        <DialogHero
          icon={<EditOutlinedIcon />}
          title="Edit strategy"
          subtitle="Refine the title and objective of your plan"
          onClose={() => setEditStrat(null)}
        />
        <DialogBody>
          <SectionLabel>Strategy details</SectionLabel>
          <Stack spacing={2.5}>
            <TextField
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
              size="small"
              autoFocus
            />
            <TextField
              label="Objective"
              value={editObjective}
              onChange={(e) => setEditObjective(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setEditStrat(null)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={saveEdit} disabled={!editTitle.trim()} sx={inkPillSx}>
            Save
          </Button>
        </DialogFooter>
      </PremiumDialog>
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
