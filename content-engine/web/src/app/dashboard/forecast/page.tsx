'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDownOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import LeaderboardIcon from '@mui/icons-material/LeaderboardOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmptyOutlined';
import WorkspacesIcon from '@mui/icons-material/WorkspacesOutlined';
import { useAuth } from '@/lib/auth';
import { Forecast, type ForecastSummary, type BenchmarksResponse } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

const HORIZONS = [7, 14, 30, 60, 90];
const LOOKBACKS = [30, 60, 90, 180, 365];

type HistPoint = { date: string; value: number };
type ProjPoint = { date: string; value: number; lower: number; upper: number };

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (abs >= 1) return `${Math.round(n)}`;
  return n.toFixed(2);
}

function prettyMetric(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Plain-SVG sparkline combining historical + projected (band + dashed) ──
function Sparkline({
  historical,
  projected,
  width = 320,
  height = 84,
}: {
  historical: HistPoint[];
  projected: ProjPoint[];
  width?: number;
  height?: number;
}) {
  const pad = 6;
  const histVals = historical.map((p) => p.value);
  const projVals = projected.flatMap((p) => [p.value, p.lower, p.upper]);
  const all = [...histVals, ...projVals];

  if (all.length < 2) {
    return (
      <Box
        sx={{
          height,
          display: 'grid',
          placeItems: 'center',
          color: SUBTLE,
          fontSize: 12,
          border: `1px dashed ${BORDER}`,
          borderRadius: 2,
        }}
      >
        Not enough points to chart
      </Box>
    );
  }

  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const total = historical.length + projected.length;
  const stepX = (width - pad * 2) / Math.max(1, total - 1);

  const xAt = (i: number) => pad + i * stepX;
  const yAt = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

  const histPts = historical.map((p, i) => `${xAt(i)},${yAt(p.value)}`);
  const boundary = historical.length - 1;

  // Projected line starts from last historical point for continuity.
  const projLine: string[] = [];
  if (historical.length > 0 && projected.length > 0) {
    projLine.push(`${xAt(boundary)},${yAt(historical[historical.length - 1].value)}`);
  }
  projected.forEach((p, i) => {
    projLine.push(`${xAt(historical.length + i)},${yAt(p.value)}`);
  });

  // Band area (lower/upper) across projected range.
  const upperPath = projected.map((p, i) => `${xAt(historical.length + i)},${yAt(p.upper)}`);
  const lowerPath = projected
    .map((p, i) => `${xAt(historical.length + i)},${yAt(p.lower)}`)
    .reverse();
  const bandPoints = [...upperPath, ...lowerPath].join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="forecast sparkline">
      {projected.length > 0 && bandPoints && (
        <polygon points={bandPoints} fill={`${BRAND.teal}1F`} stroke="none" />
      )}
      {historical.length > 1 && (
        <polyline
          points={histPts.join(' ')}
          fill="none"
          stroke={INK}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {projLine.length > 1 && (
        <polyline
          points={projLine.join(' ')}
          fill="none"
          stroke={BRAND.teal}
          strokeWidth={1.8}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {historical.length > 0 && (
        <line
          x1={xAt(boundary)}
          x2={xAt(boundary)}
          y1={pad}
          y2={height - pad}
          stroke={BORDER}
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
    </svg>
  );
}

export default function ForecastPage() {
  const { activeWorkspace } = useAuth();

  const [horizon, setHorizon] = useState(30);
  const [lookback, setLookback] = useState(90);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeSource, setNarrativeSource] = useState<'llm' | 'fallback' | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const [industry, setIndustry] = useState('');
  const [channel, setChannel] = useState('');
  const [benchmarks, setBenchmarks] = useState<BenchmarksResponse | null>(null);
  const [benchLoading, setBenchLoading] = useState(false);

  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  const loadSummary = useCallback(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    setNarrative(null);
    setNarrativeSource(null);
    Forecast.summary(horizon, lookback)
      .then(setSummary)
      .catch(() => {
        setSummary(null);
        setToast({ msg: 'Failed to load forecast', sev: 'error' });
      })
      .finally(() => setLoading(false));
  }, [activeWorkspace, horizon, lookback]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleNarrative = async () => {
    if (!summary) return;
    setNarrativeLoading(true);
    try {
      const res = await Forecast.narrative({ summary });
      setNarrative(res.narrative);
      setNarrativeSource(res.source);
    } catch {
      setToast({ msg: 'Failed to generate narrative', sev: 'error' });
    } finally {
      setNarrativeLoading(false);
    }
  };

  const handleBenchmarks = async () => {
    if (!activeWorkspace) return;
    setBenchLoading(true);
    try {
      const res = await Forecast.benchmarks(industry.trim() || undefined, channel.trim() || undefined);
      setBenchmarks(res);
    } catch {
      setBenchmarks(null);
      setToast({ msg: 'Failed to load benchmarks', sev: 'error' });
    } finally {
      setBenchLoading(false);
    }
  };

  const metricKeys = useMemo(
    () => (summary ? Object.keys(summary.projected_totals) : []),
    [summary],
  );

  if (!activeWorkspace) {
    return (
      <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, bgcolor: '#fff' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
            <WorkspacesIcon sx={{ fontSize: 36, color: BRAND.teal }} />
          </Box>
          <Typography fontWeight={900} variant="h6" sx={{ color: INK }}>No workspace selected</Typography>
          <Typography variant="body2" sx={{ color: SUBTLE, textAlign: 'center', maxWidth: 380 }}>
            Choose or create a workspace to project your metrics and compare against industry benchmarks.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* ── Header ── */}
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', background: BRAND.gradient }}>
            <InsightsIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={950} sx={{ color: INK, letterSpacing: -0.5 }}>
              Forecast &amp; Benchmarks
            </Typography>
            <Typography variant="body2" sx={{ color: SUBTLE }}>
              Project where your metrics are heading and see how you stack up against industry benchmarks.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ── Controls ── */}
      <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField
              select
              size="small"
              label="Horizon"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              sx={{ minWidth: 180 }}
            >
              {HORIZONS.map((h) => (
                <MenuItem key={h} value={h}>Next {h} days</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Lookback"
              value={lookback}
              onChange={(e) => setLookback(Number(e.target.value))}
              sx={{ minWidth: 180 }}
            >
              {LOOKBACKS.map((l) => (
                <MenuItem key={l} value={l}>Last {l} days</MenuItem>
              ))}
            </TextField>
            {summary && !summary.low_data && (
              <Chip
                size="small"
                label={`${summary.days_with_data} days of data · ${summary.range.start} → ${summary.range.end}`}
                sx={{ bgcolor: CANVAS, color: SUBTLE, fontWeight: 700, border: `1px solid ${BORDER}` }}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* ── Forecast body ── */}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
          <CircularProgress size={28} />
        </Box>
      ) : !summary ? (
        <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, bgcolor: '#fff' }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography fontWeight={800} sx={{ color: INK }}>No forecast available</Typography>
            <Typography variant="body2" sx={{ color: SUBTLE, mt: 0.5 }}>
              We couldn&apos;t load forecast data for this workspace.
            </Typography>
          </CardContent>
        </Card>
      ) : summary.low_data ? (
        <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', background: BRAND.amberSoft }}>
              <HourglassEmptyIcon sx={{ fontSize: 32, color: BRAND.amberDeep }} />
            </Box>
            <Typography fontWeight={900} variant="h6" sx={{ color: INK }}>Not enough data yet</Typography>
            <Typography variant="body2" sx={{ color: SUBTLE, textAlign: 'center', maxWidth: 440 }}>
              Forecasting needs at least <b>{summary.min_points}</b> days of history. You currently have{' '}
              <b>{summary.days_with_data}</b>. Keep collecting metrics and check back soon.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Metric cards ── */}
          <Grid container spacing={2}>
            {metricKeys.map((key) => {
              const totals = summary.projected_totals[key];
              const hist = summary.historical[key] ?? [];
              const proj = summary.projected[key] ?? [];
              const positive = totals.slope_per_day >= 0;
              return (
                <Grid key={key} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      border: `1px solid ${BORDER}`,
                      bgcolor: '#fff',
                      boxShadow: '0 10px 30px rgba(17,21,27,0.05)',
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="overline" sx={{ color: SUBTLE, fontWeight: 800, letterSpacing: 0.6 }}>
                            {prettyMetric(key)}
                          </Typography>
                          <Typography variant="h5" fontWeight={950} sx={{ color: INK, lineHeight: 1.1 }}>
                            {fmt(totals.total)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: SUBTLE }}>
                            projected total · next {summary.horizon_days}d
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          icon={positive ? <TrendingUpIcon /> : <TrendingDownIcon />}
                          label={`${positive ? '+' : ''}${fmt(totals.slope_per_day)}/day`}
                          sx={{
                            fontWeight: 800,
                            color: positive ? BRAND.tealDeep : BRAND.pink,
                            bgcolor: positive ? BRAND.tealSoft : BRAND.pinkSoft,
                            '& .MuiChip-icon': { color: positive ? BRAND.tealDeep : BRAND.pink },
                          }}
                        />
                      </Stack>
                      <Box sx={{ mt: 1.5 }}>
                        <Sparkline historical={hist} projected={proj} />
                      </Box>
                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Box sx={{ width: 14, height: 2, bgcolor: INK }} />
                          <Typography variant="caption" sx={{ color: SUBTLE }}>Historical</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Box sx={{ width: 14, height: 0, borderTop: `2px dashed ${BRAND.teal}` }} />
                          <Typography variant="caption" sx={{ color: SUBTLE }}>Projected</Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* ── AI narrative ── */}
          <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AutoAwesomeIcon sx={{ color: BRAND.amberDeep }} />
                  <Typography fontWeight={900} sx={{ color: INK }}>AI narrative</Typography>
                </Stack>
                <Button
                  variant="contained"
                  onClick={handleNarrative}
                  disabled={narrativeLoading}
                  startIcon={narrativeLoading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                  sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 900, color: INK, background: BRAND.gradient }}
                >
                  {narrativeLoading ? 'Generating…' : narrative ? 'Regenerate' : 'Generate narrative'}
                </Button>
              </Stack>
              {narrative && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2.5,
                    borderRadius: 3,
                    border: `1px solid ${BRAND.amber}55`,
                    background: BRAND.amberSoft,
                  }}
                >
                  <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                    <Chip
                      size="small"
                      label={narrativeSource === 'llm' ? 'AI generated' : 'Heuristic'}
                      sx={{ fontWeight: 800, bgcolor: '#fff', color: narrativeSource === 'llm' ? BRAND.tealDeep : SUBTLE, border: `1px solid ${BORDER}` }}
                    />
                  </Stack>
                  <Typography sx={{ color: INK, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {narrative}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Benchmarks ── */}
      <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff' }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <LeaderboardIcon sx={{ color: BRAND.tealDeep }} />
            <Typography fontWeight={900} sx={{ color: INK }}>Industry benchmarks</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField
              size="small"
              label="Industry (optional)"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. SaaS"
              sx={{ minWidth: 200 }}
            />
            <TextField
              size="small"
              label="Channel (optional)"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="e.g. instagram"
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="outlined"
              onClick={handleBenchmarks}
              disabled={benchLoading}
              startIcon={benchLoading ? <CircularProgress size={14} color="inherit" /> : <LeaderboardIcon />}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800 }}
            >
              {benchLoading ? 'Loading…' : 'Load benchmarks'}
            </Button>
          </Stack>

          {benchmarks && (
            <Box sx={{ mt: 2.5 }}>
              {benchmarks.position && (
                <Box
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 3,
                    border: `1px solid ${BORDER}`,
                    background: CANVAS,
                  }}
                >
                  {benchmarks.position.computable ? (
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                      <Chip
                        label={`Engagement: ${benchmarks.position.engagement_rate != null ? `${(benchmarks.position.engagement_rate * 100).toFixed(2)}%` : '—'}`}
                        sx={{ fontWeight: 800, bgcolor: '#fff', border: `1px solid ${BORDER}`, color: INK }}
                      />
                      {benchmarks.position.tier && (
                        <Chip
                          label={`Tier: ${benchmarks.position.tier}`}
                          sx={{ fontWeight: 800, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }}
                        />
                      )}
                      {benchmarks.position.note && (
                        <Typography variant="body2" sx={{ color: SUBTLE }}>{benchmarks.position.note}</Typography>
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: SUBTLE }}>
                      {benchmarks.position.note || 'Not enough data to compute your position yet.'}
                    </Typography>
                  )}
                </Box>
              )}

              {benchmarks.items.length === 0 ? (
                <Typography variant="body2" sx={{ color: SUBTLE }}>
                  {benchmarks.note || 'No benchmark data for these filters.'}
                </Typography>
              ) : (
                <>
                  <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: CANVAS }}>
                          <TableCell sx={{ fontWeight: 800, color: INK }}>Metric</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: INK }}>p50</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: INK }}>p75</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: INK }}>p90</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: INK }}>Sample</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {benchmarks.items.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell sx={{ color: INK }}>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Typography variant="body2" fontWeight={700}>{prettyMetric(it.metric)}</Typography>
                                {it.industry && <Chip size="small" label={it.industry} sx={{ height: 20, fontSize: 10.5 }} />}
                                {it.channel && <Chip size="small" label={it.channel} sx={{ height: 20, fontSize: 10.5 }} />}
                              </Stack>
                            </TableCell>
                            <TableCell align="right" sx={{ color: SUBTLE }}>{it.p50 != null ? fmt(it.p50) : '—'}</TableCell>
                            <TableCell align="right" sx={{ color: SUBTLE }}>{it.p75 != null ? fmt(it.p75) : '—'}</TableCell>
                            <TableCell align="right" sx={{ color: SUBTLE }}>{it.p90 != null ? fmt(it.p90) : '—'}</TableCell>
                            <TableCell align="right" sx={{ color: SUBTLE }}>{it.sample_size}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {benchmarks.note && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography variant="caption" sx={{ color: SUBTLE }}>{benchmarks.note}</Typography>
                    </>
                  )}
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.sev} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
