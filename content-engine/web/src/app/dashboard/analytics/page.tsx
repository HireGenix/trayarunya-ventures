'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import FavoriteIcon from '@mui/icons-material/FavoriteBorderOutlined';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import PaidIcon from '@mui/icons-material/PaidOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunchOutlined';
import TouchAppIcon from '@mui/icons-material/TouchAppOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import { useAuth } from '@/lib/auth';
import { Analytics, api, type AnalyticsSummary } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const PANEL = 'rgba(255,255,255,0.82)';

type NextMove = { title: string; rationale: string; impact: string; category: string };
type NextMovesResponse = { moves: NextMove[]; generated: boolean };

const IMPACT_COLOR: Record<string, string> = {
  high: '#2BD9A4',
  medium: BRAND.amber,
  low: 'rgba(255,255,255,0.55)',
};

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function money(n: number): string {
  if (!n) return '$0';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function pct(n: number): string {
  return `${Number.isFinite(n) ? n.toFixed(2) : '0.00'}%`;
}

function metricValue(summary: AnalyticsSummary, key: string) {
  return summary.totals?.[key] || 0;
}

function PremiumMetric({
  label, value, helper, icon, accent,
}: {
  label: string; value: string | number; helper: string; icon: React.ReactNode; accent: string;
}) {
  return (
    <Card
      sx={{
        height: '100%', borderRadius: 4, border: '1px solid rgba(17,21,27,0.08)',
        background: PANEL, backdropFilter: 'blur(10px)',
        boxShadow: '0 18px 45px rgba(17,21,27,0.07)', overflow: 'hidden', position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'absolute', inset: 'auto -40px -70px auto', width: 130, height: 130,
          borderRadius: '50%', background: `radial-gradient(circle, ${accent}2e, transparent 66%)`,
        }}
      />
      <CardContent sx={{ p: 2.5, position: 'relative' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{ fontSize: 11, letterSpacing: 0.8, fontWeight: 800, color: '#667085', textTransform: 'uppercase' }}>
              {label}
            </Typography>
            <Typography sx={{ mt: 0.8, fontSize: { xs: 26, md: 32 }, lineHeight: 1, fontWeight: 900, color: INK }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', background: `${accent}18`, color: accent }}>
            {icon}
          </Box>
        </Stack>
        <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: 12.5, lineHeight: 1.45 }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}

function ChannelCard({ source, metrics, maxImpressions }: { source: string; metrics: Record<string, number>; maxImpressions: number }) {
  const impressions = metrics.impressions || 0;
  const clicks = metrics.clicks || 0;
  const conversions = metrics.conversions || 0;
  const engagements = metrics.engagements || 0;
  const share = maxImpressions > 0 ? (impressions / maxImpressions) * 100 : 0;
  const channelCtr = impressions ? (clicks / impressions) * 100 : 0;
  const color: Record<string, string> = {
    linkedin: '#0A66C2', instagram: '#E1306C', facebook: '#1877F2', youtube: '#FF0000',
    x: '#111827', twitter: '#1DA1F2', tiktok: '#010101', reddit: '#FF4500', pinterest: '#E60023',
  };
  const c = color[source.toLowerCase()] || BRAND.teal;

  return (
    <Box sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(17,21,27,0.08)', background: '#fff' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
        <Stack direction="row" spacing={1.2} alignItems="center" minWidth={0}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c, boxShadow: `0 0 0 5px ${c}16` }} />
          <Box minWidth={0}>
            <Typography fontWeight={900} textTransform="capitalize" noWrap>{source}</Typography>
            <Typography variant="caption" color="text.secondary">{fmt(engagements)} engagements · {fmt(conversions)} conversions</Typography>
          </Box>
        </Stack>
        <Stack alignItems="flex-end">
          <Typography fontWeight={900}>{fmt(impressions)}</Typography>
          <Typography variant="caption" color="text.secondary">{pct(channelCtr)} CTR</Typography>
        </Stack>
      </Stack>
      <LinearProgress variant="determinate" value={Math.min(100, share)}
        sx={{ mt: 1.6, height: 8, borderRadius: 99, bgcolor: `${c}14`, '& .MuiLinearProgress-bar': { bgcolor: c, borderRadius: 99 } }}
      />
    </Box>
  );
}

function TrendStrip({ series }: { series: AnalyticsSummary['series'] }) {
  const recent = series.slice(-14);
  const max = Math.max(...recent.map((s) => s.impressions || 0), 1);
  return (
    <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ height: 170, px: 0.5 }}>
      {recent.map((s) => {
        const height = Math.max(8, ((s.impressions || 0) / max) * 132);
        return (
          <Stack key={s.date} alignItems="center" spacing={0.8} sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: '100%', maxWidth: 34, height, borderRadius: '12px 12px 6px 6px',
                background: `linear-gradient(180deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)`,
                boxShadow: '0 10px 20px rgba(20,187,135,0.18)',
              }}
              title={`${s.date}: ${fmt(s.impressions)} impressions`}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              {new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}

function AiNextMoves({ workspaceKey }: { workspaceKey: string }) {
  const [moves, setMoves] = useState<NextMove[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchMoves = (refresh = false) => {
    if (refresh) setRegenerating(true); else setLoading(true);
    Analytics.nextMoves(30, refresh)
      .then((res: NextMovesResponse) => setMoves(res.moves || []))
      .catch(() => setMoves([]))
      .finally(() => { setLoading(false); setRegenerating(false); });
  };

  useEffect(() => { fetchMoves(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [workspaceKey]);

  return (
    <Card sx={{ height: '100%', borderRadius: 4, color: '#fff', overflow: 'hidden', background: 'linear-gradient(145deg,#11151B 0%,#1B2330 60%,#10231E 100%)', boxShadow: '0 22px 60px rgba(17,21,27,0.18)' }}>
      <CardContent sx={{ p: 3, position: 'relative' }}>
        <Box sx={{ position: 'absolute', right: -70, top: -70, width: 230, height: 230, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.34), transparent 65%)' }} />
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ position: 'relative' }}>
          <Box>
            <RocketLaunchIcon sx={{ color: BRAND.amber, mb: 1 }} />
            <Typography variant="h6" fontWeight={950}>AI marketing next moves</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.3 }}>
              Generated from your live metrics.
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => fetchMoves(true)}
            disabled={regenerating || loading}
            startIcon={regenerating ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
            sx={{ textTransform: 'none', fontWeight: 800, color: INK, borderRadius: 2.5, px: 1.6, background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)`, '&:hover': { opacity: 0.92 }, '&.Mui-disabled': { color: 'rgba(17,21,27,0.5)' } }}
          >
            {regenerating ? 'Generating…' : 'Regenerate'}
          </Button>
        </Stack>

        <Stack spacing={1.5} sx={{ mt: 2.2, position: 'relative' }}>
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 160 }}>
              <CircularProgress size={28} sx={{ color: BRAND.amber }} />
            </Box>
          ) : !moves || moves.length === 0 ? (
            <Box sx={{ p: 1.7, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Publish content or ingest metrics to unlock AI-generated recommendations.
              </Typography>
            </Box>
          ) : (
            moves.map((m, i) => {
              const accent = IMPACT_COLOR[m.impact?.toLowerCase()] || BRAND.amber;
              return (
                <Box key={`${m.title}-${i}`} sx={{ p: 1.7, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Typography fontWeight={900}>{m.title}</Typography>
                    <Chip
                      label={m.impact}
                      size="small"
                      sx={{ textTransform: 'capitalize', fontWeight: 800, fontSize: 10.5, height: 22, color: INK, bgcolor: accent }}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.68)', mt: 0.4 }}>{m.rationale}</Typography>
                  <Chip
                    label={m.category}
                    size="small"
                    sx={{ mt: 1, textTransform: 'capitalize', fontWeight: 700, fontSize: 10, height: 20, color: 'rgba(255,255,255,0.78)', bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)' }}
                  />
                </Box>
              );
            })
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { activeWorkspace } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importForm, setImportForm] = useState({ source: 'manual', metric_date: '', impressions: '0', clicks: '0', engagements: '0', conversions: '0', spend: '0' });
  const [importToast, setImportToast] = useState<string | null>(null);

  const submitImport = async () => {
    setImportBusy(true);
    try {
      await api('/analytics/metrics', {
        method: 'POST',
        workspace: true,
        body: {
          source: importForm.source || 'manual',
          metric_date: importForm.metric_date || null,
          impressions: Number(importForm.impressions) || 0,
          clicks: Number(importForm.clicks) || 0,
          engagements: Number(importForm.engagements) || 0,
          conversions: Number(importForm.conversions) || 0,
          spend: Number(importForm.spend) || 0,
        },
      });
      setImportToast('Metrics imported');
      setImportOpen(false);
      setImportForm({ source: 'manual', metric_date: '', impressions: '0', clicks: '0', engagements: '0', conversions: '0', spend: '0' });
      if (activeWorkspace) {
        Analytics.summary().then(setData).catch(() => {});
      }
    } catch (e) {
      setImportToast(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImportBusy(false);
    }
  };

  const load = (sync = false) => {
    if (!activeWorkspace) return;
    if (sync) setRefreshing(true); else setLoading(true);
    const request = sync ? Analytics.refresh(30).then(() => Analytics.summary()) : Analytics.summary();
    request.then(setData).catch(() => setData(null)).finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeWorkspace]);

  const derived = useMemo(() => {
    if (!data) return null;
    const impressions = metricValue(data, 'impressions');
    const clicks = metricValue(data, 'clicks');
    const engagements = metricValue(data, 'engagements');
    const conversions = metricValue(data, 'conversions');
    const spend = metricValue(data, 'spend');
    const ctr = impressions ? (clicks / impressions) * 100 : 0;
    const engagementRate = impressions ? (engagements / impressions) * 100 : 0;
    const cpa = conversions ? spend / conversions : 0;
    const topSource = Object.entries(data.by_source || {}).sort((a, b) => (b[1].impressions || 0) - (a[1].impressions || 0))[0]?.[0];
    const maxImpressions = Math.max(...Object.values(data.by_source || {}).map((m) => m.impressions || 0), 1);
    return { impressions, clicks, engagements, conversions, spend, ctr, engagementRate, cpa, topSource, maxImpressions };
  }, [data]);

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 360 }}><CircularProgress /></Box>;

  if (!data || !derived) {
    return (
      <Card sx={{ borderRadius: 4, p: 4, textAlign: 'center', border: '1px dashed rgba(17,21,27,0.18)' }}>
        <InsightsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" fontWeight={900}>No analytics available yet</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.6 }}>Publish content or connect analytics sources to activate the performance cockpit.</Typography>
      </Card>
    );
  }

  const channelEntries = Object.entries(data.by_source || {}).sort((a, b) => (b[1].impressions || 0) - (a[1].impressions || 0));

  return (
    <Stack spacing={3}>
      {/* ── Cinematic hero ── */}
      <Box
        sx={{
          p: { xs: 3, md: 4 }, borderRadius: 5, color: '#fff', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(125deg, #11151B 0%, #1B2330 56%, #0E1A18 100%)',
          boxShadow: '0 24px 70px rgba(17,21,27,0.18)',
        }}
      >
        <Box sx={{ position: 'absolute', top: -100, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,175,6,0.34), transparent 65%)', filter: 'blur(8px)' }} />
        <Box sx={{ position: 'absolute', bottom: -120, left: '28%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.30), transparent 65%)', filter: 'blur(10px)' }} />
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3} sx={{ position: 'relative' }}>
          <Box maxWidth={700}>
            <Chip icon={<BoltIcon />} label="Real-time growth cockpit"
              sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Analytics that show what is actually moving revenue.
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 620 }}>
              Track content output, audience pull, channel quality, and conversion signals in one cinematic board designed for marketing decisions.
            </Typography>
          </Box>
          <Stack spacing={1.2} sx={{ minWidth: { md: 260 } }}>
            <Button startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              variant="contained" onClick={() => load(true)} disabled={refreshing}
              sx={{ borderRadius: 3, py: 1.2, textTransform: 'none', fontWeight: 900, color: INK, background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)` }}>
              {refreshing ? 'Refreshing metrics…' : 'Refresh results'}
            </Button>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: 0.8 }}>Winning channel</Typography>
              <Typography fontWeight={950} textTransform="capitalize">{derived.topSource || 'Awaiting data'}</Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {/* ── KPI grid ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><PremiumMetric label="Impressions" value={fmt(derived.impressions)} helper="Total market reach created by your content and campaigns." icon={<VisibilityIcon />} accent="#2563EB" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><PremiumMetric label="Engagement rate" value={pct(derived.engagementRate)} helper="Quality signal: how strongly the audience reacts." icon={<FavoriteIcon />} accent={BRAND.teal} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><PremiumMetric label="CTR" value={pct(derived.ctr)} helper="How effectively hooks and CTAs turn attention into action." icon={<TouchAppIcon />} accent="#7C3AED" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><PremiumMetric label="Spend / CPA" value={`${money(derived.spend)} · ${money(derived.cpa)}`} helper="Paid efficiency snapshot across all tracked channels." icon={<PaidIcon />} accent={BRAND.amberDeep} /></Grid>
      </Grid>

      {/* ── Content pulse + 14-day trend ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid rgba(17,21,27,0.08)', boxShadow: '0 18px 45px rgba(17,21,27,0.06)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography fontWeight={950} variant="h6">Content engine pulse</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>Creation, scheduling, and publishing momentum.</Typography>
              {([['Created', data.content_count, '#2563EB'], ['Scheduled', data.scheduled_count, BRAND.amberDeep], ['Published', data.published_count, BRAND.teal]] as [string, number, string][]).map(([label, value, color]) => (
                <Box key={label} sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between"><Typography fontWeight={800}>{label}</Typography><Typography fontWeight={950}>{fmt(value)}</Typography></Stack>
                  <LinearProgress variant="determinate" value={Math.min(100, (value / Math.max(data.content_count, 1)) * 100)}
                    sx={{ mt: 0.8, height: 9, borderRadius: 99, bgcolor: 'rgba(17,21,27,0.07)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 } }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid rgba(17,21,27,0.08)', boxShadow: '0 18px 45px rgba(17,21,27,0.06)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                <Box>
                  <Typography fontWeight={950} variant="h6">14-day attention curve</Typography>
                  <Typography variant="body2" color="text.secondary">Visual trend of audience reach from the latest tracked metric series.</Typography>
                </Box>
                <Chip icon={<TrendingUpIcon />} label={`${fmt(derived.clicks)} clicks`} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 800 }} />
              </Stack>
              {data.series.length > 0 ? <TrendStrip series={data.series} /> : (
                <Box sx={{ minHeight: 170, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>Daily trend will appear once metrics are ingested.</Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Channel map + AI next moves ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid rgba(17,21,27,0.08)', boxShadow: '0 18px 45px rgba(17,21,27,0.06)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography fontWeight={950} variant="h6">Channel performance map</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>See which channels create reach, action, and conversion density.</Typography>
              <Stack spacing={1.4}>
                {channelEntries.length === 0
                  ? <Typography color="text.secondary">No metrics ingested yet. Publish content or connect analytics to populate this.</Typography>
                  : channelEntries.map(([src, m]) => <ChannelCard key={src} source={src} metrics={m} maxImpressions={derived.maxImpressions} />)}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <AiNextMoves workspaceKey={activeWorkspace?.id ?? 'none'} />
        </Grid>
      </Grid>

      {/* ── Import metrics ── */}
      <Card sx={{ borderRadius: 4, border: '1px solid rgba(17,21,27,0.08)', background: PANEL, backdropFilter: 'blur(10px)', boxShadow: '0 18px 45px rgba(17,21,27,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Box>
              <Typography fontWeight={950} variant="h6">Import metrics</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>Manually add a metric snapshot to feed the cockpit.</Typography>
            </Box>
            <Button onClick={() => setImportOpen((o) => !o)}
              sx={{ textTransform: 'none', fontWeight: 800, color: INK, borderRadius: 2.5, px: 2, border: '1px solid rgba(17,21,27,0.14)' }}>
              {importOpen ? 'Close' : 'Import metrics'}
            </Button>
          </Stack>
          <Collapse in={importOpen} timeout="auto" unmountOnExit>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth size="small" label="Source" value={importForm.source}
                  onChange={(e) => setImportForm((f) => ({ ...f, source: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={importForm.metric_date}
                  onChange={(e) => setImportForm((f) => ({ ...f, metric_date: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth size="small" type="number" label="Impressions" value={importForm.impressions}
                  onChange={(e) => setImportForm((f) => ({ ...f, impressions: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth size="small" type="number" label="Clicks" value={importForm.clicks}
                  onChange={(e) => setImportForm((f) => ({ ...f, clicks: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth size="small" type="number" label="Engagements" value={importForm.engagements}
                  onChange={(e) => setImportForm((f) => ({ ...f, engagements: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth size="small" type="number" label="Conversions" value={importForm.conversions}
                  onChange={(e) => setImportForm((f) => ({ ...f, conversions: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth size="small" type="number" label="Spend" value={importForm.spend}
                  onChange={(e) => setImportForm((f) => ({ ...f, spend: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button fullWidth onClick={submitImport} disabled={importBusy}
                  startIcon={importBusy ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ height: '100%', textTransform: 'none', fontWeight: 900, color: INK, borderRadius: 2.5, background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)`, '&.Mui-disabled': { color: 'rgba(17,21,27,0.5)' } }}>
                  {importBusy ? 'Importing…' : 'Submit'}
                </Button>
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      <Snackbar open={!!importToast} autoHideDuration={4000} onClose={() => setImportToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="info" onClose={() => setImportToast(null)} sx={{ width: '100%' }}>{importToast}</Alert>
      </Snackbar>
    </Stack>
  );
}
