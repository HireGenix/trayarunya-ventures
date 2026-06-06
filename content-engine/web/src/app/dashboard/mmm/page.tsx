'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SyncIcon from '@mui/icons-material/Sync';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Tooltip as RTooltip, Legend,
} from 'recharts';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  FieldGrid,
  FullSpan,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

const BAR_COLORS = [BRAND.amberDeep, BRAND.teal, BRAND.pink, '#7C3AED', '#2563EB', BRAND.amber, BRAND.tealDeep];

type TabKey = 'models' | 'spend' | 'roi' | 'saturation' | 'optimizer' | 'incrementality' | 'overview';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'models', label: 'Models' },
  { key: 'spend', label: 'Spend data' },
  { key: 'roi', label: 'Channel ROI' },
  { key: 'saturation', label: 'Saturation' },
  { key: 'optimizer', label: 'Budget optimizer' },
  { key: 'incrementality', label: 'Incrementality' },
  { key: 'overview', label: 'Overview' },
];

interface MmmModel {
  id: string;
  name: string;
  period_start: string | null;
  period_end: string | null;
  channels: string[] | null;
  status: string;
  results: Record<string, any> | null;
  r_squared: number | null;
  created_at: string;
}

interface IncTest {
  id: string;
  channel: string;
  method: string;
  lift_pct: number | null;
  confidence: number | null;
  status: string;
  detail: Record<string, any> | null;
  created_at: string;
}

interface Overview {
  has_model: boolean;
  models: number;
  observations: number;
  best_roi_channel: string | null;
  best_roi: number | null;
  base_pct: number | null;
  incremental_pct: number | null;
  r_squared: number | null;
  contributions?: Record<string, number>;
  roi_by_channel?: Record<string, number>;
}

function statusChip(status: string): { bg: string; fg: string; label: string } {
  switch (status) {
    case 'ready':
      return { bg: BRAND.tealSoft, fg: BRAND.tealDeep, label: 'Ready' };
    case 'running':
      return { bg: BRAND.amberSoft, fg: BRAND.amberDeep, label: 'Running' };
    case 'failed':
      return { bg: BRAND.pinkSoft, fg: BRAND.pink, label: 'Failed' };
    case 'awaiting_data':
      return { bg: BRAND.amberSoft, fg: BRAND.amberDeep, label: 'Awaiting data' };
    default:
      return { bg: 'rgba(14,17,22,0.05)', fg: INK, label: status };
  }
}

function fmtPct(v: number | null | undefined): string {
  return v === null || v === undefined ? '\u2014' : `${v}%`;
}
function fmtRoi(v: number | null | undefined): string {
  return v === null || v === undefined ? '\u2014' : `${v.toFixed(2)}x`;
}

export default function MmmPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<TabKey>('models');
  const [models, setModels] = useState<MmmModel[]>([]);
  const [inc, setInc] = useState<IncTest[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', period_start: '', period_end: '', channels: '' });

  const [incOpen, setIncOpen] = useState(false);
  const [incForm, setIncForm] = useState({ channel: '', method: 'holdout', lift_pct: '', confidence: '' });

  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);

  // Optimizer state
  const [optBudget, setOptBudget] = useState('10000');
  const [optResult, setOptResult] = useState<any | null>(null);
  const [optLoading, setOptLoading] = useState(false);

  // Spend ingest state
  const [spendForm, setSpendForm] = useState({ channel: '', date: '', spend: '', revenue: '', source: '' });
  const [spendDone, setSpendDone] = useState(false);

  // What-if state
  const [wifOpen, setWifOpen] = useState(false);
  const [wifSpend, setWifSpend] = useState<Record<string, string>>({});
  const [wifResult, setWifResult] = useState<any | null>(null);
  const [wifLoading, setWifLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, i, o] = await Promise.all([
        api<MmmModel[]>('/mmm/models', { workspace: true }),
        api<IncTest[]>('/mmm/incrementality', { workspace: true }),
        api<Overview>('/mmm/overview', { workspace: true }),
      ]);
      setModels(m);
      setInc(i);
      setOverview(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const createModel = async () => {
    if (!form.name.trim()) return;
    setBusy('create');
    try {
      await api('/mmm/models', {
        method: 'POST',
        workspace: true,
        body: {
          name: form.name.trim(),
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          channels: form.channels
            ? form.channels.split(',').map((c) => c.trim()).filter(Boolean)
            : null,
        },
      });
      setCreateOpen(false);
      setForm({ name: '', period_start: '', period_end: '', channels: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(null);
    }
  };

  const runModel = async (id: string) => {
    setBusy(`run-${id}`);
    try {
      await api(`/mmm/models/${id}/run`, { method: 'POST', workspace: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Run failed');
    } finally {
      setBusy(null);
    }
  };

  const syncModel = async (id: string) => {
    setBusy(`sync-${id}`);
    try {
      await api(`/mmm/models/${id}/sync`, { method: 'POST', workspace: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(null);
    }
  };

  const interpret = async (id: string, name: string) => {
    setBusy(`ai-${id}`);
    setAiModel(name);
    setAiResult(null);
    setAiOpen(true);
    try {
      const res = await api<any>(`/mmm/models/${id}/interpret`, { method: 'POST', workspace: true });
      setAiResult(res);
    } catch (e) {
      setAiResult({ summary: e instanceof Error ? e.message : 'Interpret failed', recommendations: [] });
    } finally {
      setBusy(null);
    }
  };

  const createInc = async () => {
    if (!incForm.channel.trim()) return;
    setBusy('inc');
    try {
      await api('/mmm/incrementality', {
        method: 'POST',
        workspace: true,
        body: {
          channel: incForm.channel.trim(),
          method: incForm.method,
          lift_pct: incForm.lift_pct ? Number(incForm.lift_pct) : null,
          confidence: incForm.confidence ? Number(incForm.confidence) : null,
        },
      });
      setIncOpen(false);
      setIncForm({ channel: '', method: 'holdout', lift_pct: '', confidence: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Record failed');
    } finally {
      setBusy(null);
    }
  };

  const ingestSpend = async () => {
    if (!spendForm.channel.trim() || !spendForm.date || !spendForm.spend) return;
    setBusy('spend');
    try {
      await api('/mmm/spend', {
        method: 'POST',
        workspace: true,
        body: {
          rows: [{
            channel: spendForm.channel.trim(),
            date: spendForm.date,
            spend: Number(spendForm.spend),
            revenue: spendForm.revenue ? Number(spendForm.revenue) : null,
            source: spendForm.source.trim() || null,
          }],
        },
      });
      setSpendForm({ channel: '', date: '', spend: '', revenue: '', source: '' });
      setSpendDone(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ingest failed');
    } finally {
      setBusy(null);
    }
  };

  const runOptimizer = async () => {
    if (!readyModel || !optBudget) return;
    setOptLoading(true);
    setOptResult(null);
    try {
      const res = await api<any>('/mmm/optimize', {
        method: 'POST',
        workspace: true,
        body: { model_id: readyModel.id, total_budget: Number(optBudget) },
      });
      setOptResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimizer failed');
    } finally {
      setOptLoading(false);
    }
  };

  const runWhatIf = async () => {
    if (!readyModel) return;
    setWifLoading(true);
    setWifResult(null);
    try {
      const spend: Record<string, number> = {};
      for (const [ch, val] of Object.entries(wifSpend)) {
        if (val) spend[ch] = Number(val);
      }
      const res = await api<any>('/mmm/what-if', {
        method: 'POST',
        workspace: true,
        body: { model_id: readyModel.id, spend },
      });
      setWifResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'What-if failed');
    } finally {
      setWifLoading(false);
    }
  };

  const readyModel = useMemo(() => models.find((m) => m.status === 'ready') || null, [models]);
  const channels = useMemo(() => readyModel?.channels || [], [readyModel]);

  // Initialise what-if spend from current
  useEffect(() => {
    if (readyModel?.results?.total_spend_by_channel) {
      const cur = readyModel.results.total_spend_by_channel as Record<string, number>;
      const n = readyModel.results.observations || 1;
      const init: Record<string, string> = {};
      for (const ch of Object.keys(cur)) {
        init[ch] = String(Math.round(cur[ch] / n));
      }
      setWifSpend(init);
    }
  }, [readyModel]);

  const roiRows = useMemo(() => {
    const src = overview?.roi_by_channel || readyModel?.results?.roi_by_channel || {};
    const contrib = overview?.contributions || readyModel?.results?.contributions || {};
    const sig = readyModel?.results?.coefficient_significance || {};
    const mRoi = readyModel?.results?.marginal_roi || {};
    return Object.keys(src)
      .map((c) => ({
        channel: c,
        roi: src[c] as number,
        contribution: (contrib[c] as number) ?? 0,
        p_value: sig[c]?.p_value as number | undefined,
        ci_lower: sig[c]?.ci_lower as number | undefined,
        ci_upper: sig[c]?.ci_upper as number | undefined,
        se: sig[c]?.se as number | undefined,
        t_stat: sig[c]?.t_stat as number | undefined,
        marginal_roi: mRoi[c] as number | undefined,
      }))
      .sort((a, b) => b.roi - a.roi);
  }, [overview, readyModel]);

  const maxContribution = useMemo(
    () => roiRows.reduce((mx, r) => Math.max(mx, Math.abs(r.contribution)), 0) || 1,
    [roiRows],
  );

  // Decomposition data for stacked bar
  const decompositionData = useMemo(() => {
    if (!readyModel?.results) return [];
    const contribs = readyModel.results.contributions || {};
    const base = readyModel.results.base_sales || 0;
    const row: Record<string, number> = { base };
    for (const [ch, v] of Object.entries(contribs)) row[ch] = v as number;
    return [row];
  }, [readyModel]);

  // Response curves per channel
  const responseCurves = useMemo(() => {
    return readyModel?.results?.response_curves || {};
  }, [readyModel]);

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          Select a workspace to view Marketing Mix Modeling.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2.5 }} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, fontSize: 30, color: INK, letterSpacing: '-0.02em' }}>
            Marketing{' '}
            <Box component="span" sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Mix
            </Box>{' '}
            Modeling
          </Typography>
          <Typography sx={{ color: SUBTLE, fontSize: 14.5, mt: 0.5 }}>
            Adstock, Hill saturation, coefficient significance, budget optimiser and what-if simulator.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<AddIcon />}
            onClick={() => (tab === 'incrementality' ? setIncOpen(true) : setCreateOpen(true))}
            sx={{ background: INK, backgroundImage: 'none', color: '#fff', borderRadius: '999px', textTransform: 'none', fontWeight: 700, px: 2.25, '&:hover': { background: '#000' } }}
          >
            {tab === 'incrementality' ? 'Record test' : 'New model'}
          </Button>
        </Stack>
      </Stack>

      {/* Pill tabs */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        {TABS.map((t) => (
          <Button
            key={t.key}
            onClick={() => setTab(t.key)}
            sx={{
              borderRadius: '999px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 13.5,
              px: 2,
              py: 0.75,
              color: tab === t.key ? '#fff' : 'text.secondary',
              bgcolor: tab === t.key ? INK : 'transparent',
              backgroundImage: 'none',
              border: tab === t.key ? 'none' : `1px solid ${LINE}`,
              '&:hover': { bgcolor: tab === t.key ? '#1B2330' : 'rgba(14,17,22,0.05)', color: tab === t.key ? '#fff' : INK },
            }}
          >
            {t.label}
          </Button>
        ))}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* KPI cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <KpiCard label="Best ROI channel" value={overview?.best_roi_channel || '\u2014'} sub={overview?.best_roi != null ? fmtRoi(overview.best_roi) : 'No fit yet'} color={BRAND.tealDeep} />
        <KpiCard label="Incremental revenue" value={fmtPct(overview?.incremental_pct)} sub="from media" color={BRAND.amberDeep} />
        <KpiCard label="Base sales" value={fmtPct(overview?.base_pct)} sub="organic demand" color={BRAND.pink} />
        <KpiCard label="Model fit R\u00B2" value={overview?.r_squared != null ? overview.r_squared.toFixed(3) : '\u2014'} sub={`${overview?.observations ?? 0} observations`} color={INK} />
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* MODELS */}
          {tab === 'models' && (
            <Stack spacing={1.5}>
              {models.length === 0 && <EmptyCard text="No models yet. Create one, sync data, then run the regression." />}
              {models.map((m) => {
                const sc = statusChip(m.status);
                return (
                  <Box key={m.id} sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>{m.name}</Typography>
                          <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.fg, fontWeight: 700, fontSize: 11.5 }} />
                          {m.r_squared != null && (
                            <Chip label={`R\u00B2 ${m.r_squared.toFixed(3)}`} size="small" sx={{ bgcolor: 'rgba(14,17,22,0.05)', color: INK, fontWeight: 700, fontSize: 11.5 }} />
                          )}
                          {m.results?.adj_r_squared != null && (
                            <Chip label={`Adj ${m.results.adj_r_squared.toFixed(3)}`} size="small" sx={{ bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE, fontWeight: 700, fontSize: 11.5 }} />
                          )}
                          {m.results?.low_data && (
                            <Chip label="Low data" size="small" sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700, fontSize: 11.5 }} />
                          )}
                        </Stack>
                        <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.5 }}>
                          {(m.channels && m.channels.length ? m.channels.join(', ') : 'No channels set')}
                          {m.period_start ? ` \u00B7 ${m.period_start} \u2192 ${m.period_end || 'now'}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" startIcon={<SyncIcon sx={{ fontSize: 16 }} />} disabled={busy === `sync-${m.id}`} onClick={() => syncModel(m.id)}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', border: `1px solid ${LINE}`, color: INK, backgroundImage: 'none' }}>
                          Sync
                        </Button>
                        <Button size="small" startIcon={busy === `run-${m.id}` ? <CircularProgress size={14} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />} disabled={busy === `run-${m.id}`} onClick={() => runModel(m.id)}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', background: INK, backgroundImage: 'none', color: '#fff', '&:hover': { background: '#000' } }}>
                          Run
                        </Button>
                        <Button size="small" startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />} disabled={m.status !== 'ready' || busy === `ai-${m.id}`} onClick={() => interpret(m.id, m.name)}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', border: `1px solid ${LINE}`, color: BRAND.tealDeep, backgroundImage: 'none' }}>
                          Interpret with AI
                        </Button>
                      </Stack>
                    </Stack>
                    {m.status === 'awaiting_data' && m.results?.reason && (
                      <Typography sx={{ color: BRAND.amberDeep, fontSize: 12.5, mt: 1.5 }}>{m.results.reason}</Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          {/* SPEND DATA ingest */}
          {tab === 'spend' && (
            <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Ingest channel spend</Typography>
              <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.5, mb: 2.5 }}>
                Feed channel spend to power the MMM optimizer and what-if simulator.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Channel" value={spendForm.channel}
                    onChange={(e) => setSpendForm((f) => ({ ...f, channel: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Date" type="date" InputLabelProps={{ shrink: true }} value={spendForm.date}
                    onChange={(e) => setSpendForm((f) => ({ ...f, date: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Spend" type="number" value={spendForm.spend}
                    onChange={(e) => setSpendForm((f) => ({ ...f, spend: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Revenue (optional)" type="number" value={spendForm.revenue}
                    onChange={(e) => setSpendForm((f) => ({ ...f, revenue: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Source (optional)" placeholder="manual" value={spendForm.source}
                    onChange={(e) => setSpendForm((f) => ({ ...f, source: e.target.value }))} />
                </Grid>
              </Grid>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2.5 }}>
                <Button
                  startIcon={busy === 'spend' ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AddIcon sx={{ fontSize: 18 }} />}
                  disabled={busy === 'spend' || !spendForm.channel.trim() || !spendForm.date || !spendForm.spend}
                  onClick={ingestSpend}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', background: INK, backgroundImage: 'none', color: '#fff', '&:hover': { background: '#000' } }}>
                  Add spend row
                </Button>
                {spendDone && (
                  <Chip label="Spend ingested" size="small" sx={{ bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, fontWeight: 700, fontSize: 11.5 }} />
                )}
              </Stack>
            </Box>
          )}

          {/* CHANNEL ROI with significance table */}
          {tab === 'roi' && (
            <Stack spacing={2.5}>
              {/* Decomposition stacked bar */}
              {decompositionData.length > 0 && (
                <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 15, color: INK, mb: 2 }}>Revenue decomposition</Typography>
                  <ResponsiveContainer width="100%" height={64}>
                    <BarChart data={decompositionData} layout="vertical" barCategoryGap={0}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" hide />
                      <RTooltip formatter={(v: number) => v.toLocaleString()} />
                      <Bar dataKey="base" stackId="a" fill={INK} name="Base" radius={[4, 0, 0, 4]} />
                      {Object.keys(decompositionData[0] || {}).filter((k) => k !== 'base').map((ch, i) => (
                        <Bar key={ch} dataKey={ch} stackId="a" fill={BAR_COLORS[i % BAR_COLORS.length]} name={ch}
                          radius={i === Object.keys(decompositionData[0] || {}).length - 2 ? [0, 4, 4, 0] : undefined} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}

              {/* Contribution bar */}
              <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: INK, mb: 2 }}>Channel contribution</Typography>
                {roiRows.length === 0 ? (
                  <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>Run a model to see channel contributions.</Typography>
                ) : (
                  <Stack spacing={1.75}>
                    {roiRows.map((r, idx) => {
                      const pct = Math.max(2, (Math.abs(r.contribution) / maxContribution) * 100);
                      const color = BAR_COLORS[idx % BAR_COLORS.length];
                      return (
                        <Box key={r.channel}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: INK }}>{r.channel}</Typography>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: SUBTLE }}>{r.contribution.toLocaleString()} \u00B7 {fmtRoi(r.roi)}</Typography>
                          </Stack>
                          <Box sx={{ height: 6, borderRadius: 999, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
                            <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 999, bgcolor: color, transition: 'width .3s' }} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {/* Coefficient significance table */}
              <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: INK, mb: 2 }}>Coefficient significance</Typography>
                {roiRows.length === 0 ? (
                  <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>No fitted coefficients yet.</Typography>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <Box component="thead">
                        <Box component="tr" sx={{ borderBottom: `1px solid ${LINE}` }}>
                          {['Channel', 'Coeff', 'SE', 't-stat', 'p-value', '95% CI', 'ROI', 'Marginal ROI'].map((h) => (
                            <Box component="th" key={h} sx={{ textAlign: 'left', py: 1, px: 1, fontWeight: 700, fontSize: 11.5, color: SUBTLE, textTransform: 'uppercase' }}>{h}</Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {roiRows.map((r) => {
                          const coef = readyModel?.results?.coefficients?.[r.channel];
                          const sig = r.p_value != null && r.p_value < 0.05;
                          return (
                            <Box component="tr" key={r.channel} sx={{ borderBottom: `1px solid ${LINE}` }}>
                              <Box component="td" sx={{ py: 1.25, px: 1, fontWeight: 700, color: INK }}>{r.channel}</Box>
                              <Box component="td" sx={{ py: 1.25, px: 1, fontFamily: 'monospace', color: INK }}>{coef != null ? coef.toFixed(4) : '\u2014'}</Box>
                              <Box component="td" sx={{ py: 1.25, px: 1, fontFamily: 'monospace', color: SUBTLE }}>{r.se != null ? r.se.toFixed(4) : '\u2014'}</Box>
                              <Box component="td" sx={{ py: 1.25, px: 1, fontFamily: 'monospace', color: SUBTLE }}>{r.t_stat != null ? r.t_stat.toFixed(2) : '\u2014'}</Box>
                              <Box component="td" sx={{ py: 1.25, px: 1 }}>
                                {r.p_value != null ? (
                                  <Chip label={r.p_value.toFixed(3)} size="small"
                                    sx={{ bgcolor: sig ? BRAND.tealSoft : BRAND.amberSoft, color: sig ? BRAND.tealDeep : BRAND.amberDeep, fontWeight: 700, fontSize: 11 }} />
                                ) : '\u2014'}
                              </Box>
                              <Box component="td" sx={{ py: 1.25, px: 1, fontFamily: 'monospace', fontSize: 12, color: SUBTLE }}>
                                {r.ci_lower != null && r.ci_upper != null ? `[${r.ci_lower.toFixed(3)}, ${r.ci_upper.toFixed(3)}]` : '\u2014'}
                              </Box>
                              <Box component="td" sx={{ py: 1.25, px: 1 }}>
                                <Chip label={fmtRoi(r.roi)} size="small" sx={{ bgcolor: r.roi >= 1 ? BRAND.tealSoft : BRAND.pinkSoft, color: r.roi >= 1 ? BRAND.tealDeep : BRAND.pink, fontWeight: 700, fontSize: 11 }} />
                              </Box>
                              <Box component="td" sx={{ py: 1.25, px: 1, fontFamily: 'monospace', color: INK }}>{r.marginal_roi != null ? r.marginal_roi.toFixed(4) : '\u2014'}</Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </Stack>
          )}

          {/* SATURATION CURVES */}
          {tab === 'saturation' && (
            <Stack spacing={2.5}>
              {Object.keys(responseCurves).length === 0 ? (
                <EmptyCard text="Run a model to see saturation / response curves per channel." />
              ) : (
                <Grid container spacing={2.5}>
                  {(Object.entries(responseCurves) as [string, any[]][]).map(([ch, points], idx) => {
                    const sat = readyModel?.results?.saturation?.[ch] || {};
                    const hp = readyModel?.results?.channel_params?.[ch] || {};
                    return (
                      <Grid key={ch} size={{ xs: 12, md: 6 }}>
                        <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: 15, color: INK }}>{ch}</Typography>
                            {sat.saturated && <Chip label="Saturated" size="small" sx={{ bgcolor: BRAND.pinkSoft, color: BRAND.pink, fontWeight: 700, fontSize: 11 }} />}
                          </Stack>
                          <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                            <MiniStat label="Theta" value={hp.theta?.toFixed(1) ?? '\u2014'} />
                            <MiniStat label="Alpha" value={hp.alpha?.toFixed(1) ?? '\u2014'} />
                            <MiniStat label="Gamma" value={hp.gamma?.toFixed(1) ?? '\u2014'} />
                            <MiniStat label="Sat %" value={sat.saturation_fraction != null ? `${(sat.saturation_fraction * 100).toFixed(0)}%` : '\u2014'} />
                          </Stack>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={points}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,17,22,0.08)" />
                              <XAxis dataKey="spend" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <RTooltip />
                              <Line type="monotone" dataKey="response" stroke={BAR_COLORS[idx % BAR_COLORS.length]} strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Stack>
          )}

          {/* BUDGET OPTIMIZER */}
          {tab === 'optimizer' && (
            <Stack spacing={2.5}>
              <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <TuneRoundedIcon sx={{ color: BRAND.tealDeep, fontSize: 22 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Budget optimizer</Typography>
                </Stack>
                {!readyModel ? (
                  <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>Run a model first to enable budget optimisation.</Typography>
                ) : (
                  <>
                    <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ mb: 2 }}>
                      <TextField label="Total budget" type="number" value={optBudget} onChange={(e) => setOptBudget(e.target.value)}
                        size="small" sx={{ width: 200 }} />
                      <Button onClick={runOptimizer} disabled={optLoading || !optBudget}
                        startIcon={optLoading ? <CircularProgress size={15} color="inherit" /> : <TuneRoundedIcon />}
                        sx={inkPillSx}>
                        {optLoading ? 'Optimising...' : 'Optimise'}
                      </Button>
                      <Button onClick={() => setWifOpen(true)} startIcon={<ScienceRoundedIcon />} sx={ghostPillSx}>
                        What-if simulator
                      </Button>
                    </Stack>

                    {optResult && (
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={3} flexWrap="wrap" gap={2}>
                          <MiniStat label="Predicted response" value={optResult.predicted_response?.toLocaleString() ?? '\u2014'} />
                          <MiniStat label="Current response" value={optResult.current_response?.toLocaleString() ?? '\u2014'} />
                          <MiniStat label="Predicted lift" value={`${optResult.lift_pct ?? 0}%`} />
                        </Stack>
                        <Divider />
                        <Typography sx={{ fontWeight: 800, fontSize: 13, color: INK }}>Recommended allocation</Typography>
                        <ResponsiveContainer width="100%" height={Math.max(200, Object.keys(optResult.allocated || {}).length * 40)}>
                          <BarChart data={Object.entries(optResult.allocated || {}).map(([ch, v]) => ({ channel: ch, spend: v }))} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,17,22,0.08)" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="channel" tick={{ fontSize: 12, fontWeight: 700 }} width={120} />
                            <RTooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                            <Bar dataKey="spend" fill={BRAND.teal} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>

                        {/* Per-channel detail */}
                        {optResult.per_channel && (
                          <Box sx={{ overflowX: 'auto' }}>
                            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <Box component="thead">
                                <Box component="tr" sx={{ borderBottom: `1px solid ${LINE}` }}>
                                  {['Channel', 'Allocated', 'Predicted response', 'Marginal ROI'].map((h) => (
                                    <Box component="th" key={h} sx={{ textAlign: 'left', py: 1, px: 1, fontWeight: 700, fontSize: 11.5, color: SUBTLE, textTransform: 'uppercase' }}>{h}</Box>
                                  ))}
                                </Box>
                              </Box>
                              <Box component="tbody">
                                {Object.entries(optResult.per_channel).map(([ch, d]: [string, any]) => (
                                  <Box component="tr" key={ch} sx={{ borderBottom: `1px solid ${LINE}` }}>
                                    <Box component="td" sx={{ py: 1, px: 1, fontWeight: 700, color: INK }}>{ch}</Box>
                                    <Box component="td" sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>${d.spend?.toLocaleString()}</Box>
                                    <Box component="td" sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>{d.predicted_response?.toFixed(2)}</Box>
                                    <Box component="td" sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>{d.marginal_roi_at_allocation?.toFixed(4)}</Box>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          </Box>
                        )}
                      </Stack>
                    )}
                  </>
                )}
              </Box>
            </Stack>
          )}

          {/* INCREMENTALITY */}
          {tab === 'incrementality' && (
            <Stack spacing={1.5}>
              {inc.length === 0 && <EmptyCard text="No incrementality tests yet. Record a holdout, geo or ghost experiment." />}
              {inc.map((t) => (
                <Box key={t.id} sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ fontWeight: 800, fontSize: 15, color: INK }}>{t.channel}</Typography>
                        <Chip label={t.method} size="small" sx={{ bgcolor: 'rgba(14,17,22,0.05)', color: INK, fontWeight: 700, fontSize: 11.5 }} />
                      </Stack>
                      <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.5 }}>
                        Lift {t.lift_pct != null ? `${t.lift_pct}%` : '\u2014'} \u00B7 Confidence {t.confidence != null ? `${t.confidence}%` : '\u2014'}
                      </Typography>
                    </Box>
                    <Chip label={t.status} size="small" sx={{ bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, fontWeight: 700, fontSize: 11.5 }} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
              {!overview?.has_model ? (
                <Typography sx={{ color: SUBTLE, fontSize: 14 }}>
                  No fitted model yet. Create a model, sync or ingest spend &amp; revenue, then run it to see the mix.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Base vs incremental</Typography>
                  <Box sx={{ height: 6, borderRadius: 999, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden', display: 'flex' }}>
                    <Box sx={{ width: `${overview.base_pct ?? 0}%`, height: '100%', bgcolor: INK }} />
                    <Box sx={{ width: `${overview.incremental_pct ?? 0}%`, height: '100%', bgcolor: BRAND.teal }} />
                  </Box>
                  <Stack direction="row" spacing={2}>
                    <LegendDot color={INK} label={`Base ${fmtPct(overview.base_pct)}`} />
                    <LegendDot color={BRAND.teal} label={`Incremental ${fmtPct(overview.incremental_pct)}`} />
                  </Stack>
                  <Divider />
                  <Stack direction="row" spacing={3} flexWrap="wrap" gap={2}>
                    <MiniStat label="Best ROI channel" value={overview.best_roi_channel || '\u2014'} />
                    <MiniStat label="Best ROI" value={fmtRoi(overview.best_roi)} />
                    <MiniStat label="Model fit R\u00B2" value={overview.r_squared != null ? overview.r_squared.toFixed(3) : '\u2014'} />
                    <MiniStat label="Models" value={String(overview.models)} />
                    <MiniStat label="Observations" value={String(overview.observations)} />
                  </Stack>
                </Stack>
              )}
            </Box>
          )}
        </>
      )}

      {/* Create model dialog */}
      <PremiumDialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<AddRoundedIcon />}
          title="New MMM model"
          subtitle="Define the period and channels to model marketing mix"
          onClose={() => setCreateOpen(false)}
        />
        <DialogBody>
          <SectionLabel>Model details</SectionLabel>
          <FieldGrid>
            <FullSpan>
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth size="small" />
            </FullSpan>
            <TextField label="Period start" type="date" InputLabelProps={{ shrink: true }} value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} fullWidth size="small" />
            <TextField label="Period end" type="date" InputLabelProps={{ shrink: true }} value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} fullWidth size="small" />
            <FullSpan>
              <TextField label="Channels (comma-separated, optional)" placeholder="google_ads, meta_ads, content" value={form.channels} onChange={(e) => setForm({ ...form, channels: e.target.value })} fullWidth size="small" />
            </FullSpan>
          </FieldGrid>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setCreateOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={createModel} disabled={busy === 'create' || !form.name.trim()} startIcon={busy === 'create' ? <CircularProgress size={15} color="inherit" /> : undefined} sx={inkPillSx}>
            {busy === 'create' ? 'Creating\u2026' : 'Create'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Record incrementality dialog */}
      <PremiumDialog open={incOpen} onClose={() => setIncOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<AssessmentRoundedIcon />}
          title="Record incrementality test"
          subtitle="Log a measured lift result for a channel"
          onClose={() => setIncOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <SectionLabel>Test setup</SectionLabel>
          <FieldGrid>
            <TextField label="Channel" value={incForm.channel} onChange={(e) => setIncForm({ ...incForm, channel: e.target.value })} fullWidth size="small" />
            <TextField label="Method" select value={incForm.method} onChange={(e) => setIncForm({ ...incForm, method: e.target.value })} fullWidth size="small">
              <MenuItem value="holdout">Holdout</MenuItem>
              <MenuItem value="geo">Geo</MenuItem>
              <MenuItem value="ghost">Ghost</MenuItem>
            </TextField>
            <TextField label="Lift %" type="number" value={incForm.lift_pct} onChange={(e) => setIncForm({ ...incForm, lift_pct: e.target.value })} fullWidth size="small" />
            <TextField label="Confidence %" type="number" value={incForm.confidence} onChange={(e) => setIncForm({ ...incForm, confidence: e.target.value })} fullWidth size="small" />
          </FieldGrid>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setIncOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={createInc} disabled={busy === 'inc' || !incForm.channel.trim()} startIcon={busy === 'inc' ? <CircularProgress size={15} color="inherit" /> : undefined} sx={inkPillSx}>
            {busy === 'inc' ? 'Recording\u2026' : 'Record'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* AI interpretation dialog */}
      <PremiumDialog open={aiOpen} onClose={() => setAiOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<AutoAwesomeRoundedIcon />}
          title={`AI interpretation${aiModel ? ` \u00B7 ${aiModel}` : ''}`}
          subtitle="Model insights and budget recommendations"
          onClose={() => setAiOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          {!aiResult ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Box>
                <SectionLabel>Summary</SectionLabel>
                <Typography sx={{ fontSize: 14, color: INK, lineHeight: 1.6 }}>{aiResult.summary}</Typography>
              </Box>
              {Array.isArray(aiResult.recommendations) && aiResult.recommendations.length > 0 && (
                <Box>
                  <SectionLabel>Recommendations</SectionLabel>
                  <Stack spacing={1}>
                    {aiResult.recommendations.map((r: any, i: number) => (
                      <Box key={i} sx={{ border: `1px solid ${LINE}`, borderRadius: '14px', p: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip label={r.action} size="small" sx={{ bgcolor: r.action === 'scale' ? BRAND.tealSoft : r.action === 'cut' ? BRAND.pinkSoft : BRAND.amberSoft, color: r.action === 'scale' ? BRAND.tealDeep : r.action === 'cut' ? BRAND.pink : BRAND.amberDeep, fontWeight: 700, fontSize: 11.5, textTransform: 'capitalize' }} />
                          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: INK }}>{r.channel}</Typography>
                        </Stack>
                        <Typography sx={{ fontSize: 13, color: SUBTLE, mt: 0.5 }}>{r.reason}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              {aiResult.source && (
                <Typography sx={{ fontSize: 11.5, color: SUBTLE }}>Source: {aiResult.source}</Typography>
              )}
            </Stack>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setAiOpen(false)} sx={inkPillSx}>Close</Button>
        </DialogFooter>
      </PremiumDialog>

      {/* What-if simulator dialog */}
      <PremiumDialog open={wifOpen} onClose={() => setWifOpen(false)} maxWidth="md">
        <DialogHero
          icon={<ScienceRoundedIcon />}
          title="What-if simulator"
          subtitle="Set per-channel spend to see predicted response with confidence interval"
          onClose={() => setWifOpen(false)}
          tint={BRAND.amberDeep}
          tintSoft={BRAND.amberSoft}
        />
        <DialogBody>
          <SectionLabel>Per-channel spend</SectionLabel>
          <FieldGrid>
            {channels.map((ch) => (
              <TextField key={ch} label={ch} type="number" size="small" value={wifSpend[ch] || ''} onChange={(e) => setWifSpend({ ...wifSpend, [ch]: e.target.value })} fullWidth />
            ))}
          </FieldGrid>
          <Box sx={{ mt: 2 }}>
            <Button onClick={runWhatIf} disabled={wifLoading}
              startIcon={wifLoading ? <CircularProgress size={15} color="inherit" /> : <ScienceRoundedIcon />}
              sx={inkPillSx}>
              {wifLoading ? 'Simulating\u2026' : 'Simulate'}
            </Button>
          </Box>
          {wifResult && (
            <Box sx={{ mt: 2.5 }}>
              <SectionLabel>Results</SectionLabel>
              <Stack direction="row" spacing={3} flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
                <MiniStat label="Predicted response" value={wifResult.predicted_response?.toLocaleString() ?? '\u2014'} />
                <MiniStat label="95% CI lower" value={wifResult.ci_lower?.toLocaleString() ?? '\u2014'} />
                <MiniStat label="95% CI upper" value={wifResult.ci_upper?.toLocaleString() ?? '\u2014'} />
                <MiniStat label="Base" value={wifResult.base?.toLocaleString() ?? '\u2014'} />
              </Stack>
              {wifResult.channels && (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <Box component="thead">
                      <Box component="tr" sx={{ borderBottom: `1px solid ${LINE}` }}>
                        {['Channel', 'Spend', 'Response', 'Hill output', 'Marginal ROI'].map((h) => (
                          <Box component="th" key={h} sx={{ textAlign: 'left', py: 1, px: 1, fontWeight: 700, fontSize: 11.5, color: SUBTLE, textTransform: 'uppercase' }}>{h}</Box>
                        ))}
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {Object.entries(wifResult.channels).map(([ch, d]: [string, any]) => (
                        <Box component="tr" key={ch} sx={{ borderBottom: `1px solid ${LINE}` }}>
                          <Box component="td" sx={{ py: 1, px: 1, fontWeight: 700, color: INK }}>{ch}</Box>
                          <Box component="td" sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>${d.spend?.toLocaleString()}</Box>
                          <Box component="td" sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>{d.response?.toFixed(2)}</Box>
                          <Box component="td" sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>{d.hill_output?.toFixed(4)}</Box>
                          <Box component="td" sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>{d.marginal_roi?.toFixed(4)}</Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setWifOpen(false)} sx={inkPillSx}>Close</Button>
        </DialogFooter>
      </PremiumDialog>
    </Box>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <Box sx={{ flex: '1 1 200px', minWidth: 180, bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
      <Typography sx={{ fontSize: 24, fontWeight: 800, color, mt: 0.5, lineHeight: 1.2 }}>{value}</Typography>
      <Typography sx={{ fontSize: 12.5, color: SUBTLE, mt: 0.25 }}>{sub}</Typography>
    </Box>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: INK, mt: 0.25 }}>{value}</Typography>
    </Box>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK }}>{label}</Typography>
    </Stack>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px dashed ${LINE}`, borderRadius: CARD_RADIUS, p: 4, textAlign: 'center' }}>
      <Typography sx={{ color: SUBTLE, fontSize: 14 }}>{text}</Typography>
    </Box>
  );
}
