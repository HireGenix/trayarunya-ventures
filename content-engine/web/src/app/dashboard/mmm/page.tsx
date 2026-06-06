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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SyncIcon from '@mui/icons-material/Sync';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
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

type TabKey = 'models' | 'roi' | 'incrementality' | 'overview';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'models', label: 'Models' },
  { key: 'roi', label: 'Channel ROI' },
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
  return v === null || v === undefined ? '—' : `${v}%`;
}
function fmtRoi(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${v.toFixed(2)}x`;
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

  const readyModel = useMemo(() => models.find((m) => m.status === 'ready') || null, [models]);

  const roiRows = useMemo(() => {
    const src = overview?.roi_by_channel || readyModel?.results?.roi_by_channel || {};
    const contrib = overview?.contributions || readyModel?.results?.contributions || {};
    return Object.keys(src)
      .map((c) => ({ channel: c, roi: src[c] as number, contribution: (contrib[c] as number) ?? 0 }))
      .sort((a, b) => b.roi - a.roi);
  }, [overview, readyModel]);

  const maxContribution = useMemo(
    () => roiRows.reduce((mx, r) => Math.max(mx, Math.abs(r.contribution)), 0) || 1,
    [roiRows],
  );

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
            Real regression on your spend &amp; revenue — channel ROI, incrementality and saturation.
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
        <KpiCard label="Best ROI channel" value={overview?.best_roi_channel || '—'} sub={overview?.best_roi != null ? fmtRoi(overview.best_roi) : 'No fit yet'} color={BRAND.tealDeep} />
        <KpiCard label="Incremental revenue" value={fmtPct(overview?.incremental_pct)} sub="from media" color={BRAND.amberDeep} />
        <KpiCard label="Base sales" value={fmtPct(overview?.base_pct)} sub="organic demand" color={BRAND.pink} />
        <KpiCard label="Model fit R²" value={overview?.r_squared != null ? overview.r_squared.toFixed(3) : '—'} sub={`${overview?.observations ?? 0} observations`} color={INK} />
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
                            <Chip label={`R² ${m.r_squared.toFixed(3)}`} size="small" sx={{ bgcolor: 'rgba(14,17,22,0.05)', color: INK, fontWeight: 700, fontSize: 11.5 }} />
                          )}
                        </Stack>
                        <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.5 }}>
                          {(m.channels && m.channels.length ? m.channels.join(', ') : 'No channels set')}
                          {m.period_start ? ` · ${m.period_start} → ${m.period_end || 'now'}` : ''}
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

          {/* CHANNEL ROI */}
          {tab === 'roi' && (
            <Stack spacing={2.5}>
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
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: SUBTLE }}>{r.contribution.toLocaleString()} · {fmtRoi(r.roi)}</Typography>
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

              <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: INK, mb: 2 }}>ROI by channel</Typography>
                {roiRows.length === 0 ? (
                  <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>No fitted ROI yet.</Typography>
                ) : (
                  <Box>
                    <Stack direction="row" sx={{ pb: 1, borderBottom: `1px solid ${LINE}` }}>
                      <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 12, color: SUBTLE }}>CHANNEL</Typography>
                      <Typography sx={{ width: 140, fontWeight: 700, fontSize: 12, color: SUBTLE, textAlign: 'right' }}>CONTRIBUTION</Typography>
                      <Typography sx={{ width: 90, fontWeight: 700, fontSize: 12, color: SUBTLE, textAlign: 'right' }}>ROI</Typography>
                    </Stack>
                    {roiRows.map((r) => (
                      <Stack key={r.channel} direction="row" alignItems="center" sx={{ py: 1.25, borderBottom: `1px solid ${LINE}` }}>
                        <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: INK }}>{r.channel}</Typography>
                        <Typography sx={{ width: 140, fontSize: 13.5, color: INK, textAlign: 'right' }}>{r.contribution.toLocaleString()}</Typography>
                        <Box sx={{ width: 90, textAlign: 'right' }}>
                          <Chip label={fmtRoi(r.roi)} size="small" sx={{ bgcolor: r.roi >= 1 ? BRAND.tealSoft : BRAND.pinkSoft, color: r.roi >= 1 ? BRAND.tealDeep : BRAND.pink, fontWeight: 700, fontSize: 11.5 }} />
                        </Box>
                      </Stack>
                    ))}
                  </Box>
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
                        Lift {t.lift_pct != null ? `${t.lift_pct}%` : '—'} · Confidence {t.confidence != null ? `${t.confidence}%` : '—'}
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
                    <MiniStat label="Best ROI channel" value={overview.best_roi_channel || '—'} />
                    <MiniStat label="Best ROI" value={fmtRoi(overview.best_roi)} />
                    <MiniStat label="Model fit R²" value={overview.r_squared != null ? overview.r_squared.toFixed(3) : '—'} />
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
            {busy === 'create' ? 'Creating…' : 'Create'}
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
            {busy === 'inc' ? 'Recording…' : 'Record'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* AI interpretation dialog */}
      <PremiumDialog open={aiOpen} onClose={() => setAiOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<AutoAwesomeRoundedIcon />}
          title={`AI interpretation${aiModel ? ` · ${aiModel}` : ''}`}
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
