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

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';
const GRID = 'rgba(14,17,22,0.06)';

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
          border: `1px dashed ${LINE}`,
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
          stroke={GRID}
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
      <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, bgcolor: '#fff' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: BRAND.tealSoft }}>
            <WorkspacesIcon sx={{ fontSize: 36, color: BRAND.tealDeep }} />
          </Box>
          <Typography fontWeight={800} variant="h6" sx={{ color: INK }}>No workspace selected</Typography>
          <Typography variant="body2" sx={{ color: SUBTLE, textAlign: 'center', maxWidth: 380 }}>
            Choose or create a workspace to project your metrics and compare against industry benchmarks.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* ── Header ── */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        spacing={2}
        sx={{ mb: 2.5, px: 0.5 }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.12,
              fontSize: { xs: 28, md: 38 },
              color: INK,
            }}
          >
            Forecast &amp;{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Benchmarks
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Project where your metrics are heading and see how you stack up against industry benchmarks.
          </Typography>
        </Box>
        {summary && !summary.low_data && (
          <Chip
            size="small"
            label={`${summary.days_with_data} days of data · ${summary.range.start} → ${summary.range.end}`}
            sx={{
              bgcolor: 'rgba(14,17,22,0.05)',
              color: SUBTLE,
              fontWeight: 700,
              border: `1px solid ${LINE}`,
              borderRadius: '999px',
            }}
          />
        )}
      </Stack>

      {/* ── Controls: pill selectors ── */}
      <Stack spacing={2} sx={{ mb: 2.5, px: 0.5 }}>
        <Box>
          <Typography sx={{ color: SUBTLE, fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', mb: 1 }}>
            Horizon
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={1}>
            {HORIZONS.map((h) => {
              const on = horizon === h;
              return (
                <Button
                  key={h}
                  disableRipple
                  onClick={() => setHorizon(h)}
                  sx={{
                    px: 2.25,
                    py: 0.85,
                    borderRadius: '999px',
                    fontWeight: 600,
                    fontSize: 13.5,
                    textTransform: 'none',
                    color: on ? '#fff' : 'text.secondary',
                    bgcolor: on ? INK : 'transparent',
                    '&:hover': {
                      bgcolor: on ? '#1B2330' : 'rgba(14,17,22,0.05)',
                      color: on ? '#fff' : INK,
                    },
                  }}
                >
                  Next {h} days
                </Button>
              );
            })}
          </Stack>
        </Box>
        <Box>
          <Typography sx={{ color: SUBTLE, fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', mb: 1 }}>
            Lookback
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={1}>
            {LOOKBACKS.map((l) => {
              const on = lookback === l;
              return (
                <Button
                  key={l}
                  disableRipple
                  onClick={() => setLookback(l)}
                  sx={{
                    px: 2.25,
                    py: 0.85,
                    borderRadius: '999px',
                    fontWeight: 600,
                    fontSize: 13.5,
                    textTransform: 'none',
                    color: on ? '#fff' : 'text.secondary',
                    bgcolor: on ? INK : 'transparent',
                    '&:hover': {
                      bgcolor: on ? '#1B2330' : 'rgba(14,17,22,0.05)',
                      color: on ? '#fff' : INK,
                    },
                  }}
                >
                  Last {l} days
                </Button>
              );
            })}
          </Stack>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
          <CircularProgress size={28} sx={{ color: INK }} />
        </Box>
      ) : !summary ? (
        <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, bgcolor: '#fff' }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography fontWeight={800} sx={{ color: INK }}>No forecast available</Typography>
            <Typography variant="body2" sx={{ color: SUBTLE, mt: 0.5 }}>
              We couldn&apos;t load forecast data for this workspace.
            </Typography>
          </CardContent>
        </Card>
      ) : summary.low_data ? (
        <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, bgcolor: '#fff' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: BRAND.amberSoft }}>
              <HourglassEmptyIcon sx={{ fontSize: 32, color: BRAND.amberDeep }} />
            </Box>
            <Typography fontWeight={800} variant="h6" sx={{ color: INK }}>Not enough data yet</Typography>
            <Typography variant="body2" sx={{ color: SUBTLE, textAlign: 'center', maxWidth: 440 }}>
              Forecasting needs at least <b>{summary.min_points}</b> days of history. You currently have{' '}
              <b>{summary.days_with_data}</b>. Keep collecting metrics and check back soon.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Metric cards ── */}
          <Grid container spacing={2.5}>
            {metricKeys.map((key) => {
              const totals = summary.projected_totals[key];
              const hist = summary.historical[key] ?? [];
              const proj = summary.projected[key] ?? [];
              const positive = totals.slope_per_day >= 0;
              return (
                <Grid key={key} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Box
                    sx={{
                      height: '100%',
                      borderRadius: CARD_RADIUS,
                      border: `1px solid ${LINE}`,
                      bgcolor: '#fff',
                      boxShadow: CARD_SHADOW,
                      p: 2.5,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: '11px',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'rgba(14,17,22,0.05)',
                          color: INK,
                        }}
                      >
                        <InsightsIcon fontSize="small" />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1, color: INK }}>
                        {prettyMetric(key)}
                      </Typography>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{
                          px: 1,
                          py: 0.4,
                          borderRadius: '999px',
                          bgcolor: positive ? BRAND.tealSoft : BRAND.pinkSoft,
                        }}
                      >
                        {positive ? (
                          <TrendingUpIcon sx={{ fontSize: 16, color: BRAND.tealDeep }} />
                        ) : (
                          <TrendingDownIcon sx={{ fontSize: 16, color: BRAND.pink }} />
                        )}
                        <Typography sx={{ fontWeight: 700, fontSize: 12, color: positive ? BRAND.tealDeep : BRAND.pink }}>
                          {`${positive ? '+' : ''}${fmt(totals.slope_per_day)}/day`}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Stack direction="row" alignItems="flex-end" spacing={1.25} sx={{ mt: 2 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 40, lineHeight: 1, letterSpacing: '-0.02em', color: INK }}>
                        {fmt(totals.total)}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 14, pb: 0.5 }}>
                        / next {summary.horizon_days}d
                      </Typography>
                    </Stack>

                    <Box sx={{ mt: 2 }}>
                      <Sparkline historical={hist} projected={proj} />
                    </Box>
                    <Stack direction="row" spacing={2} sx={{ mt: 1.25 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Box sx={{ width: 14, height: 2, borderRadius: 999, bgcolor: INK }} />
                        <Typography variant="caption" sx={{ color: SUBTLE }}>Historical</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Box sx={{ width: 14, height: 0, borderTop: `2px dashed ${BRAND.teal}` }} />
                        <Typography variant="caption" sx={{ color: SUBTLE }}>Projected</Typography>
                      </Stack>
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {/* ── AI narrative ── */}
          <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, bgcolor: '#fff' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '11px',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(14,17,22,0.05)',
                      color: INK,
                    }}
                  >
                    <AutoAwesomeIcon fontSize="small" />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: INK }}>AI narrative</Typography>
                </Stack>
                <Button
                  variant="contained"
                  onClick={handleNarrative}
                  disabled={narrativeLoading}
                  startIcon={narrativeLoading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                  sx={{
                    px: 2.5,
                    py: 1.25,
                    borderRadius: '999px',
                    textTransform: 'none',
                    fontWeight: 700,
                    color: '#fff',
                    background: INK,
                    backgroundImage: 'none',
                    boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
                    '&:hover': { background: '#1B2330' },
                  }}
                >
                  {narrativeLoading ? 'Generating…' : narrative ? 'Regenerate' : 'Generate narrative'}
                </Button>
              </Stack>
              {narrative && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2.5,
                    borderRadius: '16px',
                    border: `1px solid ${LINE}`,
                    bgcolor: 'rgba(14,17,22,0.02)',
                  }}
                >
                  <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                    <Chip
                      size="small"
                      label={narrativeSource === 'llm' ? 'AI generated' : 'Heuristic'}
                      sx={{
                        fontWeight: 700,
                        fontSize: 12,
                        borderRadius: '999px',
                        bgcolor: narrativeSource === 'llm' ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                        color: narrativeSource === 'llm' ? BRAND.tealDeep : SUBTLE,
                      }}
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
      <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, bgcolor: '#fff' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '11px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(14,17,22,0.05)',
                color: INK,
              }}
            >
              <LeaderboardIcon fontSize="small" />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: INK }}>Industry benchmarks</Typography>
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
              onClick={handleBenchmarks}
              disabled={benchLoading}
              startIcon={benchLoading ? <CircularProgress size={14} color="inherit" /> : <LeaderboardIcon />}
              sx={{
                px: 2.5,
                py: 1.1,
                borderRadius: '999px',
                textTransform: 'none',
                fontWeight: 700,
                color: INK,
                bgcolor: 'rgba(14,17,22,0.05)',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'rgba(14,17,22,0.09)' },
              }}
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
                    borderRadius: '16px',
                    border: `1px solid ${LINE}`,
                    bgcolor: 'rgba(14,17,22,0.02)',
                  }}
                >
                  {benchmarks.position.computable ? (
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                      <Chip
                        label={`Engagement: ${benchmarks.position.engagement_rate != null ? `${(benchmarks.position.engagement_rate * 100).toFixed(2)}%` : '—'}`}
                        sx={{ fontWeight: 700, borderRadius: '999px', bgcolor: '#fff', border: `1px solid ${LINE}`, color: INK }}
                      />
                      {benchmarks.position.tier && (
                        <Chip
                          label={`Tier: ${benchmarks.position.tier}`}
                          sx={{ fontWeight: 700, borderRadius: '999px', bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }}
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
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: SUBTLE, borderColor: LINE }}>Metric</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: SUBTLE, borderColor: LINE }}>p50</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: SUBTLE, borderColor: LINE }}>p75</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: SUBTLE, borderColor: LINE }}>p90</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: SUBTLE, borderColor: LINE }}>Sample</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {benchmarks.items.map((it) => (
                          <TableRow key={it.id} sx={{ '&:hover': { bgcolor: 'rgba(14,17,22,0.02)' } }}>
                            <TableCell sx={{ color: INK, py: 1.5, borderColor: LINE }}>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Typography variant="body2" fontWeight={700}>{prettyMetric(it.metric)}</Typography>
                                {it.industry && <Chip size="small" label={it.industry} sx={{ height: 20, fontSize: 10.5, borderRadius: '999px', bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE }} />}
                                {it.channel && <Chip size="small" label={it.channel} sx={{ height: 20, fontSize: 10.5, borderRadius: '999px', bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE }} />}
                              </Stack>
                            </TableCell>
                            <TableCell align="right" sx={{ color: SUBTLE, py: 1.5, borderColor: LINE }}>{it.p50 != null ? fmt(it.p50) : '—'}</TableCell>
                            <TableCell align="right" sx={{ color: SUBTLE, py: 1.5, borderColor: LINE }}>{it.p75 != null ? fmt(it.p75) : '—'}</TableCell>
                            <TableCell align="right" sx={{ color: SUBTLE, py: 1.5, borderColor: LINE }}>{it.p90 != null ? fmt(it.p90) : '—'}</TableCell>
                            <TableCell align="right" sx={{ color: SUBTLE, py: 1.5, borderColor: LINE }}>{it.sample_size}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {benchmarks.note && (
                    <>
                      <Divider sx={{ my: 1.5, borderColor: LINE }} />
                      <Typography variant="caption" sx={{ color: SUBTLE }}>{benchmarks.note}</Typography>
                    </>
                  )}
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
      </Stack>

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
    </Box>
  );
}
