'use client';

/**
 * Enterprise Analytics — GA4/Amplitude-class analytics dashboard.
 *
 * Cohort retention heatmap, funnel with drop-off, segment breakdown,
 * derived KPI cards (CAC/LTV/LTV:CAC/payback), and anomaly callouts.
 * Every number is real, derived from DB events. No emojis.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import FilterListIcon from '@mui/icons-material/FilterListOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TimelineIcon from '@mui/icons-material/TimelineOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Cell, LineChart, Line, ReferenceLine, Area,
  AreaChart, Legend,
} from 'recharts';
import { useAuth } from '@/lib/auth';
import {
  Analytics,
  type CohortRetentionResponse,
  type FunnelResponse,
  type SegmentationResponse,
  type DerivedKpisResponse,
  type AnomalyResponse,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';

const INK = '#0E1116';
const SUBTLE = '#6B7280';
const PANEL = 'rgba(255,255,255,0.82)';
const LINE = 'rgba(14,17,22,0.08)';

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function money(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '--';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function pctLabel(n: number | null): string {
  if (n == null) return '--';
  return `${(n * 100).toFixed(1)}%`;
}

function durationLabel(secs: number | null): string {
  if (secs == null) return '--';
  if (secs < 60) return `${Math.round(secs)}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  if (secs < 86400) return `${(secs / 3600).toFixed(1)}h`;
  return `${(secs / 86400).toFixed(1)}d`;
}

function LowDataBanner({ note }: { note?: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: 3, background: BRAND.amberSoft, border: `1px solid ${BRAND.amber}30`, mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <WarningAmberIcon sx={{ fontSize: 18, color: BRAND.amberDeep }} />
        <Typography sx={{ fontSize: 13, color: INK, fontWeight: 700 }}>
          Limited data available
        </Typography>
      </Stack>
      {note && <Typography sx={{ fontSize: 12, color: SUBTLE, mt: 0.5 }}>{note}</Typography>}
    </Box>
  );
}

/* ── KPI Card ── */
function KpiCard({ label, value, definition, accent, flag }: {
  label: string; value: string; definition: string; accent: string; flag?: string;
}) {
  return (
    <Card sx={{
      height: '100%', borderRadius: 4, border: `1px solid ${LINE}`,
      background: PANEL, backdropFilter: 'blur(10px)',
      boxShadow: '0 18px 45px rgba(17,21,27,0.07)', overflow: 'hidden',
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{ fontSize: 11, letterSpacing: 0.8, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase' }}>
              {label}
            </Typography>
            <Typography sx={{ mt: 0.8, fontSize: 28, lineHeight: 1, fontWeight: 900, color: INK }}>
              {value}
            </Typography>
          </Box>
          <Tooltip title={definition} arrow placement="top">
            <InfoOutlinedIcon sx={{ fontSize: 18, color: SUBTLE, cursor: 'help' }} />
          </Tooltip>
        </Stack>
        {flag && (
          <Chip label={flag} size="small" sx={{
            mt: 1.5, fontSize: 10, fontWeight: 800, height: 20,
            color: BRAND.amberDeep, bgcolor: BRAND.amberSoft,
          }} />
        )}
      </CardContent>
    </Card>
  );
}

/* ── Cohort Heatmap ── */
function CohortHeatmap({ data }: { data: CohortRetentionResponse }) {
  if (!data.cohorts.length) return <Typography color="text.secondary">No cohort data available.</Typography>;

  const retColor = (v: number | null) => {
    if (v == null) return 'transparent';
    if (v >= 0.6) return BRAND.teal;
    if (v >= 0.4) return '#14BB8799';
    if (v >= 0.2) return '#14BB8744';
    if (v > 0) return '#14BB8722';
    return 'rgba(14,17,22,0.04)';
  };

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: `140px 60px repeat(${data.periods}, 1fr)`, gap: '2px', minWidth: 600 }}>
        {/* Header */}
        <Box sx={{ p: 1, fontWeight: 800, fontSize: 11, color: SUBTLE }}>Cohort</Box>
        <Box sx={{ p: 1, fontWeight: 800, fontSize: 11, color: SUBTLE, textAlign: 'center' }}>Size</Box>
        {Array.from({ length: data.periods }, (_, i) => (
          <Box key={i} sx={{ p: 1, fontWeight: 800, fontSize: 11, color: SUBTLE, textAlign: 'center' }}>
            {data.granularity === 'week' ? `W${i}` : `M${i}`}
          </Box>
        ))}
        {/* Rows */}
        {data.cohorts.map((c) => (
          <>
            <Box key={`l-${c.cohort}`} sx={{ p: 1, fontSize: 12, fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>
              {c.cohort}
            </Box>
            <Box key={`s-${c.cohort}`} sx={{ p: 1, fontSize: 12, fontWeight: 700, color: INK, textAlign: 'center' }}>
              {c.size}
            </Box>
            {c.retention.map((r, i) => (
              <Tooltip key={`${c.cohort}-${i}`} title={r != null ? `${(r * 100).toFixed(1)}%` : 'N/A'} arrow>
                <Box sx={{
                  p: 1, textAlign: 'center', fontSize: 11, fontWeight: 700,
                  borderRadius: 1, color: r != null && r >= 0.4 ? '#fff' : INK,
                  background: retColor(r), cursor: 'default',
                }}>
                  {r != null ? `${(r * 100).toFixed(0)}%` : '-'}
                </Box>
              </Tooltip>
            ))}
          </>
        ))}
      </Box>
    </Box>
  );
}

/* ── Funnel Chart ── */
function FunnelChart({ data }: { data: FunnelResponse }) {
  if (!data.steps.length) return <Typography color="text.secondary">No funnel data available.</Typography>;

  const chartData = data.steps.map((s, i) => ({
    name: s.label,
    count: s.count,
    rate: s.rate * 100,
    dropOff: s.drop_off,
    stepConversion: s.step_conversion * 100,
    time: s.median_time_seconds,
    fill: i === 0 ? BRAND.teal : i === data.steps.length - 1 ? BRAND.amberDeep : `${BRAND.teal}${Math.round(80 + (i / data.steps.length) * 40).toString(16)}`,
  }));

  return (
    <Box>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: INK }} />
          <YAxis tick={{ fontSize: 11, fill: SUBTLE }} />
          <RTooltip
            contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }}
            formatter={(value: number, name: string) => [fmt(value), 'Visitors']}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Step details row */}
      <Stack direction="row" spacing={1} sx={{ mt: 2, overflowX: 'auto' }}>
        {data.steps.map((s, i) => (
          <Box key={s.key} sx={{
            flex: 1, minWidth: 100, p: 1.5, borderRadius: 2, border: `1px solid ${LINE}`, textAlign: 'center',
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase' }}>{s.label}</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 900, color: INK }}>{fmt(s.count)}</Typography>
            {i > 0 && (
              <>
                <Typography sx={{ fontSize: 11, color: BRAND.pink, fontWeight: 700 }}>
                  -{fmt(s.drop_off)} drop-off
                </Typography>
                <Typography sx={{ fontSize: 11, color: SUBTLE }}>
                  {durationLabel(s.median_time_seconds)} median
                </Typography>
              </>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

/* ── Segment Breakdown ── */
function SegmentBreakdown({ data }: { data: SegmentationResponse }) {
  if (!data.segments.length) return <Typography color="text.secondary">No segment data for this dimension.</Typography>;

  const chartData = data.segments.slice(0, 12).map((s) => ({
    name: s.segment || '(none)',
    events: s.events,
    visitors: s.unique_visitors,
    value: s.total_value,
    share: s.share * 100,
  }));
  const colors = [BRAND.teal, BRAND.amberDeep, BRAND.pink, '#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706'];

  return (
    <Box>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
          <XAxis type="number" tick={{ fontSize: 11, fill: SUBTLE }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fontWeight: 700, fill: INK }} width={80} />
          <RTooltip
            contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }}
            formatter={(value: number, name: string) => [fmt(value), name === 'events' ? 'Events' : 'Visitors']}
          />
          <Bar dataKey="events" radius={[0, 6, 6, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

/* ── Anomaly Timeline ── */
function AnomalyTimeline({ data }: { data: AnomalyResponse }) {
  if (!data.series.length) return <Typography color="text.secondary">No trend data.</Typography>;

  const chartData = data.series.map((p) => ({
    date: p.date.slice(5),
    value: p.value,
    baseline: p.baseline_mean,
    anomaly: p.anomaly ? p.value : null,
  }));

  return (
    <Box>
      {data.anomaly_count > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
          {data.anomaly_dates.slice(0, 5).map((d) => (
            <Chip key={d} label={d} size="small" sx={{
              fontWeight: 800, fontSize: 10, height: 22,
              color: BRAND.pink, bgcolor: BRAND.pinkSoft,
            }} />
          ))}
          {data.anomaly_count > 5 && (
            <Chip label={`+${data.anomaly_count - 5} more`} size="small" sx={{
              fontWeight: 700, fontSize: 10, height: 22, color: SUBTLE, bgcolor: '#f3f4f6',
            }} />
          )}
        </Stack>
      )}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: SUBTLE }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: SUBTLE }} />
          <RTooltip contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }} />
          <Area type="monotone" dataKey="baseline" stroke={SUBTLE} strokeDasharray="4 3" fill="none" name="Baseline" />
          <Area type="monotone" dataKey="value" stroke={BRAND.teal} fill={`${BRAND.teal}18`} strokeWidth={2} name="Actual" />
          <Line type="monotone" dataKey="anomaly" stroke={BRAND.pink} strokeWidth={0} dot={{ r: 6, fill: BRAND.pink }} name="Anomaly" />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

/* ── Detail Dialog ── */
function KpiDetailDialog({ open, onClose, kpis }: {
  open: boolean; onClose: () => void; kpis: DerivedKpisResponse | null;
}) {
  if (!kpis) return null;
  const defs = kpis.definitions || {};
  const flags = kpis.flags || {};

  return (
    <PremiumDialog open={open} onClose={onClose} maxWidth="sm">
      <DialogHero
        icon={<InsightsIcon />}
        title="KPI Definitions"
        subtitle="How each metric is computed from your real data"
        onClose={onClose}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        <Stack spacing={2.5}>
          {Object.entries(defs).map(([key, def]) => (
            <Box key={key}>
              <Typography sx={{ fontWeight: 800, fontSize: 13, color: INK, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {key.replace(/_/g, ' ')}
              </Typography>
              <Typography sx={{ fontSize: 13, color: SUBTLE, mt: 0.3 }}>{def}</Typography>
              {flags[`${key}_proxy`] || flags[`${key}_note`] ? (
                <Chip label="PROXY" size="small" sx={{
                  mt: 0.8, fontSize: 10, fontWeight: 800, height: 20,
                  color: BRAND.amberDeep, bgcolor: BRAND.amberSoft,
                }} />
              ) : null}
            </Box>
          ))}
          {Object.entries(flags).filter(([k]) => k.endsWith('_note')).map(([k, v]) => (
            <Box key={k} sx={{ p: 1.5, borderRadius: 2, bgcolor: BRAND.amberSoft, border: `1px solid ${BRAND.amber}30` }}>
              <Typography sx={{ fontSize: 12, color: INK }}>{String(v)}</Typography>
            </Box>
          ))}
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button sx={ghostPillSx} onClick={onClose}>Close</Button>
      </DialogFooter>
    </PremiumDialog>
  );
}


/* ═══════════════ Page ═══════════════ */

export default function EnterpriseAnalyticsPage() {
  const { activeWorkspace } = useAuth();

  const [cohort, setCohort] = useState<CohortRetentionResponse | null>(null);
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null);
  const [segments, setSegments] = useState<SegmentationResponse | null>(null);
  const [kpis, setKpis] = useState<DerivedKpisResponse | null>(null);
  const [anomaly, setAnomaly] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [segDim, setSegDim] = useState('channel');
  const [anomalyMetric, setAnomalyMetric] = useState('events');
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);

  const loadAll = useCallback(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.allSettled([
      Analytics.cohortRetention('week', 8, 180).then(setCohort).catch(() => setCohort(null)),
      Analytics.funnel(30).then(setFunnel).catch(() => setFunnel(null)),
      Analytics.segmentation(segDim, 30).then(setSegments).catch(() => setSegments(null)),
      Analytics.kpis(90).then(setKpis).catch(() => setKpis(null)),
      Analytics.anomaly(anomalyMetric, 60, 7).then(setAnomaly).catch(() => setAnomaly(null)),
    ]).finally(() => setLoading(false));
  }, [activeWorkspace, segDim, anomalyMetric]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Reload segmentation when dimension changes
  useEffect(() => {
    if (!activeWorkspace) return;
    Analytics.segmentation(segDim, 30).then(setSegments).catch(() => setSegments(null));
  }, [segDim, activeWorkspace]);

  // Reload anomaly when metric changes
  useEffect(() => {
    if (!activeWorkspace) return;
    Analytics.anomaly(anomalyMetric, 60, 7).then(setAnomaly).catch(() => setAnomaly(null));
  }, [anomalyMetric, activeWorkspace]);

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 360 }}><CircularProgress /></Box>;

  return (
    <Stack spacing={3}>
      {/* ── Hero ── */}
      <Box sx={{
        p: { xs: 3, md: 4 }, borderRadius: 5, color: '#fff', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(125deg, #11151B 0%, #1B2330 56%, #0E1A18 100%)',
        boxShadow: '0 24px 70px rgba(17,21,27,0.18)',
      }}>
        <Box sx={{ position: 'absolute', top: -100, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.34), transparent 65%)', filter: 'blur(8px)' }} />
        <Box sx={{ position: 'absolute', bottom: -120, left: '28%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,175,6,0.30), transparent 65%)', filter: 'blur(10px)' }} />
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ position: 'relative' }}>
          <Box maxWidth={700}>
            <Chip icon={<InsightsIcon />} label="Enterprise analytics"
              sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Cohorts, funnels, and the metrics that matter.
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 600 }}>
              GA4/Amplitude-class analytics derived from your real event data. Every number is computed, never fabricated.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ── Derived KPIs ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="CAC"
            value={money(kpis?.cac ?? null)}
            definition={kpis?.definitions?.cac || 'Customer acquisition cost'}
            accent={BRAND.amberDeep}
            flag={kpis?.flags?.spend_data_missing ? 'SPEND DATA MISSING' : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="LTV"
            value={money(kpis?.ltv ?? null)}
            definition={kpis?.definitions?.ltv || 'Customer lifetime value'}
            accent={BRAND.teal}
            flag={kpis?.flags?.ltv_proxy ? 'PROXY' : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="LTV : CAC"
            value={kpis?.ltv_cac_ratio != null ? `${kpis.ltv_cac_ratio}x` : '--'}
            definition={kpis?.definitions?.ltv_cac_ratio || 'LTV to CAC ratio'}
            accent="#7C3AED"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Payback"
            value={kpis?.payback_months != null ? `${kpis.payback_months}mo` : '--'}
            definition={kpis?.definitions?.payback_months || 'Months to repay CAC'}
            accent={BRAND.pink}
          />
        </Grid>
      </Grid>

      {/* Extra KPI row */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <KpiCard
            label="Conversion velocity"
            value={durationLabel(kpis?.conversion_velocity_seconds ?? null)}
            definition={kpis?.definitions?.conversion_velocity || 'Median time from first visit to purchase'}
            accent="#2563EB"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <KpiCard label="New customers" value={fmt(kpis?.new_customers ?? 0)}
            definition="Distinct visitors with signup or purchase events in period." accent={BRAND.teal} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
            <Card sx={{
              flex: 1, borderRadius: 4, border: `1px solid ${LINE}`, background: PANEL,
              boxShadow: '0 18px 45px rgba(17,21,27,0.07)', overflow: 'hidden',
            }}>
              <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                <Typography sx={{ fontSize: 11, letterSpacing: 0.8, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase' }}>
                  Revenue / Spend
                </Typography>
                <Typography sx={{ mt: 0.8, fontSize: 20, fontWeight: 900, color: INK }}>
                  {money(kpis?.total_revenue ?? null)} / {money(kpis?.total_spend ?? null)}
                </Typography>
                <Button size="small" onClick={() => setKpiDialogOpen(true)}
                  sx={{ mt: 1, alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700, fontSize: 12, color: BRAND.tealDeep }}>
                  View definitions
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {kpis?.low_data && <LowDataBanner note="Fewer than 5 new customers or 3 paying customers in the period. KPIs may be unreliable." />}

      {/* ── Funnel Analysis ── */}
      <Card sx={{ borderRadius: 4, border: `1px solid ${LINE}`, boxShadow: '0 18px 45px rgba(17,21,27,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography fontWeight={950} variant="h6">Conversion funnel</Typography>
              <Typography variant="body2" color="text.secondary">
                Ordered steps with drop-off and time-between-steps from real events.
              </Typography>
            </Box>
            {funnel && funnel.steps.length > 0 && (
              <Chip label={`${(funnel.overall_conversion * 100).toFixed(1)}% overall`}
                sx={{ fontWeight: 800, color: INK, bgcolor: BRAND.tealSoft }} />
            )}
          </Stack>
          {funnel?.low_data && <LowDataBanner note={funnel.note} />}
          {funnel ? <FunnelChart data={funnel} /> : <Typography color="text.secondary">Loading funnel data...</Typography>}
        </CardContent>
      </Card>

      {/* ── Cohort Retention ── */}
      <Card sx={{ borderRadius: 4, border: `1px solid ${LINE}`, boxShadow: '0 18px 45px rgba(17,21,27,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography fontWeight={950} variant="h6">Cohort retention</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Weekly cohorts by first-touch date. Retention = fraction of cohort returning in each subsequent period.
          </Typography>
          {cohort?.low_data && <LowDataBanner note={cohort.note} />}
          {cohort ? <CohortHeatmap data={cohort} /> : <Typography color="text.secondary">Loading cohort data...</Typography>}
        </CardContent>
      </Card>

      {/* ── Segmentation + Anomaly row ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${LINE}`, boxShadow: '0 18px 45px rgba(17,21,27,0.06)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography fontWeight={950} variant="h6">Segmentation</Typography>
                  <Typography variant="body2" color="text.secondary">KPIs broken by a real dimension.</Typography>
                </Box>
                <Select size="small" value={segDim} onChange={(e) => setSegDim(e.target.value)}
                  sx={{ minWidth: 130, borderRadius: 2, fontSize: 13, fontWeight: 700 }}>
                  <MenuItem value="channel">Channel</MenuItem>
                  <MenuItem value="campaign">Campaign</MenuItem>
                  <MenuItem value="utm_medium">Medium</MenuItem>
                  <MenuItem value="device">Device</MenuItem>
                  <MenuItem value="source">Source</MenuItem>
                  <MenuItem value="event_type">Event type</MenuItem>
                </Select>
              </Stack>
              {segments?.low_data && <LowDataBanner note={segments.note} />}
              {segments?.insufficient_data && <LowDataBanner note={segments.note} />}
              {segments ? <SegmentBreakdown data={segments} /> : <Typography color="text.secondary">Loading segments...</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${LINE}`, boxShadow: '0 18px 45px rgba(17,21,27,0.06)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography fontWeight={950} variant="h6">Trend / Anomaly detection</Typography>
                  <Typography variant="body2" color="text.secondary">Rolling z-score anomaly flags on daily series.</Typography>
                </Box>
                <Select size="small" value={anomalyMetric} onChange={(e) => setAnomalyMetric(e.target.value)}
                  sx={{ minWidth: 120, borderRadius: 2, fontSize: 13, fontWeight: 700 }}>
                  <MenuItem value="events">Events</MenuItem>
                  <MenuItem value="revenue">Revenue</MenuItem>
                  <MenuItem value="email_sends">Email sends</MenuItem>
                  <MenuItem value="spend">Spend</MenuItem>
                </Select>
              </Stack>
              {anomaly?.low_data && <LowDataBanner note={anomaly.note} />}
              {anomaly ? <AnomalyTimeline data={anomaly} /> : <Typography color="text.secondary">Loading anomaly data...</Typography>}
              {anomaly && anomaly.anomaly_count > 0 && (
                <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: BRAND.pinkSoft, border: `1px solid ${BRAND.pink}30` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.pink }}>
                    {anomaly.anomaly_count} anomal{anomaly.anomaly_count === 1 ? 'y' : 'ies'} detected
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: SUBTLE, mt: 0.3 }}>
                    Days where the {anomaly.metric} value deviated more than 2 standard deviations from the rolling {anomaly.window}-day baseline.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* KPI detail dialog */}
      <KpiDetailDialog open={kpiDialogOpen} onClose={() => setKpiDialogOpen(false)} kpis={kpis} />
    </Stack>
  );
}
