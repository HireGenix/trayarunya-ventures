'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  alpha,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import SegmentRoundedIcon from '@mui/icons-material/SegmentRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import { useAuth } from '@/lib/auth';
import { CRO, API_URL, type CROScorecard, type CROStage } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import { ExperimentsTab, SegmentsTab, AgentTab, PredictWidget } from '@/components/cro/CroAdvanced';

/* ----------------------------- tokens ----------------------------- */

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

const cardSx = {
  borderRadius: CARD_RADIUS,
  border: `1px solid ${LINE}`,
  boxShadow: CARD_SHADOW,
  bgcolor: '#fff',
} as const;

const TABS = [
  { label: 'Scorecard', icon: <DashboardRoundedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Experiments', icon: <ScienceRoundedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Segments', icon: <SegmentRoundedIcon sx={{ fontSize: 18 }} /> },
  { label: 'CRO Agent', icon: <SmartToyRoundedIcon sx={{ fontSize: 18 }} /> },
];

const RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

const STAGE_COLORS = [BRAND.amberDeep, '#2563EB', BRAND.tealDeep, BRAND.pink];

function scoreColor(score: number): string {
  if (score >= 80) return BRAND.tealDeep;
  if (score >= 50) return BRAND.amberDeep;
  return BRAND.pink;
}

function scoreSoft(score: number): string {
  if (score >= 80) return BRAND.tealSoft;
  if (score >= 50) return BRAND.amberSoft;
  return BRAND.pinkSoft;
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Healthy';
  if (score >= 40) return 'Needs work';
  return 'Critical';
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function money(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${fmt(Math.round(n))}`;
  }
}

const PRIORITY_COLOR: Record<string, string> = {
  high: BRAND.pink,
  medium: BRAND.amber,
  low: BRAND.teal,
};

function Ring({ pct, color, size = 132, stroke = 8 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <Box component="svg" width={size} height={size} sx={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(14,17,22,0.07)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
    </Box>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
  color?: string;
}) {
  return (
    <Card sx={{ ...cardSx, height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
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
            {icon}
          </Box>
          <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 13 }}>
            {label}
          </Typography>
        </Stack>
        <Typography sx={{ fontWeight: 800, fontSize: 30, color: INK, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          {value}
        </Typography>
        {sub && <Box sx={{ mt: 0.75 }}>{sub}</Box>}
      </CardContent>
    </Card>
  );
}

function FunnelBar({ stage, index, max }: { stage: CROStage; index: number; max: number }) {
  const color = STAGE_COLORS[index % STAGE_COLORS.length];
  const widthPct = max > 0 ? Math.max((stage.count / max) * 100, 2) : 2;
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: INK }}>{stage.label}</Typography>
        </Stack>
        <Stack direction="row" spacing={1.25} alignItems="baseline">
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, letterSpacing: '-0.01em' }}>
            {fmt(stage.count)}
          </Typography>
          <Typography variant="caption" sx={{ color: SUBTLE }}>
            {stage.overall_pct}% of top
          </Typography>
        </Stack>
      </Stack>
      <Box sx={{ height: 8, borderRadius: 999, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            borderRadius: 999,
            width: `${widthPct}%`,
            bgcolor: color,
            transition: 'width .5s ease',
            minWidth: 8,
          }}
        />
      </Box>
      {index > 0 && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
          <Box
            sx={{
              px: 1,
              py: 0.3,
              borderRadius: '999px',
              fontSize: 11,
              fontWeight: 700,
              bgcolor: alpha(color, 0.1),
              color,
            }}
          >
            {stage.step_cvr}% pass-through
          </Box>
          {stage.drop > 0 && (
            <Typography variant="caption" sx={{ color: BRAND.pink, fontWeight: 600 }}>
              {fmt(stage.drop)} lost ({stage.drop_pct}%)
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}

function PixelInstall({
  snippet,
  onCopy,
  compact,
}: {
  snippet: string;
  onCopy: () => void;
  compact?: boolean;
}) {
  return (
    <Box sx={{ mt: compact ? 1.5 : 2, maxWidth: compact ? '100%' : 640, mx: compact ? 0 : 'auto' }}>
      <Box
        sx={{
          position: 'relative',
          p: 2,
          pr: 6,
          borderRadius: '12px',
          bgcolor: 'rgba(14,17,22,0.04)',
          fontFamily: 'monospace',
          fontSize: 12.5,
          color: INK,
          wordBreak: 'break-all',
          textAlign: 'left',
        }}
      >
        {snippet}
        <Tooltip title="Copy">
          <IconButton
            size="small"
            onClick={onCopy}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: INK,
              color: '#fff',
              width: 30,
              height: 30,
              '&:hover': { bgcolor: '#1B2330' },
            }}
          >
            <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      {!compact && (
        <>
          <Divider sx={{ my: 2, borderColor: LINE }} />
          <Typography variant="caption" sx={{ color: SUBTLE }}>
            Custom goals: call <code>cro(&apos;form_submit&apos;)</code> or{' '}
            <code>cro(&apos;purchase&apos;, {`{value: 99}`})</code> from your own scripts.
          </Typography>
        </>
      )}
    </Box>
  );
}

export default function CROPage() {
  const { activeWorkspace } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CROScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sc = await CRO.scorecard(days);
      setData(sc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load CRO scorecard');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const snippet = useMemo(() => {
    const key = activeWorkspace?.id || 'YOUR_WORKSPACE_ID';
    // Prefer the build-time API URL, but if it points at localhost while the app
    // is served from a real domain (e.g. production), derive the public API host
    // from the current origin so the embed code is always copy-paste correct.
    let base = API_URL;
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocalBuild = /localhost|127\.0\.0\.1/.test(base);
      const isRealHost = host !== 'localhost' && host !== '127.0.0.1';
      if (isLocalBuild && isRealHost) {
        const apex = host.replace(/^(www|app)\./, '');
        base = `https://api.${apex}`;
      }
    }
    return `<script src="${base}/api/v1/cro/pixel.js" data-api="${base}/api/v1" data-key="${key}" async></script>`;
  }, [activeWorkspace]);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  const stages = data?.stages ?? [];
  const maxCount = stages.length ? stages[0].count : 0;
  const noData = !loading && data && data.visitors === 0;

  return (
    <Box>
      {/* Header */}
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
            CRO{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Score
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Your conversion funnel, biggest leaks and revenue opportunities — from real visitor events.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            sx={{
              minWidth: 150,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fff',
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: 13.5,
              },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: LINE },
            }}
          >
            {RANGES.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="Refresh">
            <IconButton
              onClick={() => void load()}
              sx={{
                width: 44,
                height: 44,
                bgcolor: '#fff',
                border: `1px solid ${LINE}`,
                color: INK,
                '&:hover': { bgcolor: '#fff' },
              }}
            >
              <RefreshRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Hero CRO score */}
      <Card sx={{ ...cardSx, mb: 2.5 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '12px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(14,17,22,0.05)',
                  color: INK,
                  flexShrink: 0,
                }}
              >
                <SpeedRoundedIcon />
              </Box>
              <Box>
                <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 13.5 }}>
                  Overall CRO Score
                </Typography>
                <Stack direction="row" spacing={1.25} alignItems="baseline" sx={{ mt: 0.5 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: 52, md: 64 },
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      color: INK,
                    }}
                  >
                    {data?.cro_score ?? 0}
                  </Typography>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 16 }}>/ 100</Typography>
                </Stack>
                <Box
                  sx={{
                    display: 'inline-flex',
                    mt: 1.25,
                    px: 1.25,
                    py: 0.4,
                    borderRadius: '999px',
                    bgcolor: scoreSoft(data?.cro_score ?? 0),
                    color: scoreColor(data?.cro_score ?? 0),
                    fontWeight: 700,
                    fontSize: 12.5,
                  }}
                >
                  {scoreLabel(data?.cro_score ?? 0)}
                </Box>
              </Box>
            </Stack>
            <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
              {loading ? (
                <CircularProgress sx={{ color: INK }} />
              ) : (
                <>
                  <Ring pct={(data?.cro_score ?? 0) / 100} color={scoreColor(data?.cro_score ?? 0)} size={132} stroke={8} />
                  <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 26, color: INK, lineHeight: 1 }}>
                      {data?.cro_score ?? 0}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: SUBTLE, fontWeight: 600 }}>/ 100</Typography>
                  </Box>
                </>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Pill tabs */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
        {TABS.map((t, i) => {
          const active = tab === i;
          return (
            <Button
              key={t.label}
              onClick={() => setTab(i)}
              startIcon={t.icon}
              disableElevation
              sx={{
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: 13.5,
                textTransform: 'none',
                px: 2.25,
                py: 0.85,
                bgcolor: active ? INK : 'transparent',
                color: active ? '#fff' : 'text.secondary',
                '&:hover': {
                  bgcolor: active ? '#1B2330' : 'rgba(14,17,22,0.05)',
                  color: active ? '#fff' : INK,
                },
              }}
            >
              {t.label}
            </Button>
          );
        })}
      </Stack>

      {tab === 0 && (
        <>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {data?.low_data && !noData && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          Low data — fewer than {fmt(data.visitors)} visitors in this window. Numbers shown are
          directional until more events arrive.
        </Alert>
      )}

      {/* Stat tiles */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            icon={<InsightsRoundedIcon fontSize="small" />}
            label="Overall conversion rate"
            value={`${data?.overall_cvr ?? 0}%`}
            color={BRAND.teal}
            sub={
              data ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {data.cvr_delta >= 0 ? (
                    <TrendingUpRoundedIcon sx={{ fontSize: 16, color: BRAND.teal }} />
                  ) : (
                    <TrendingDownRoundedIcon sx={{ fontSize: 16, color: BRAND.pink }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{ color: data.cvr_delta >= 0 ? BRAND.teal : BRAND.pink, fontWeight: 700 }}
                  >
                    {data.cvr_delta >= 0 ? '+' : ''}
                    {data.cvr_delta}% vs prev
                  </Typography>
                </Stack>
              ) : null
            }
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            icon={<GroupsRoundedIcon fontSize="small" />}
            label="Visitors"
            value={fmt(data?.visitors ?? 0)}
            color="#2563EB"
            sub={
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                last {days} days
              </Typography>
            }
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            icon={<CheckCircleRoundedIcon fontSize="small" />}
            label="Converted"
            value={fmt(data?.converted ?? 0)}
            color={BRAND.amber}
            sub={
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                AOV {money(data?.avg_order_value ?? 0, data?.currency ?? 'USD')}
              </Typography>
            }
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            icon={<PaidRoundedIcon fontSize="small" />}
            label="Revenue left on table"
            value={money(data?.revenue_left_on_table ?? 0, data?.currency ?? 'USD')}
            color={BRAND.pink}
            sub={
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                recoverable at biggest leak
              </Typography>
            }
          />
        </Grid>
      </Grid>

      {noData ? (
        <Card sx={{ ...cardSx, border: `1px dashed ${LINE}` }}>
          <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                mx: 'auto',
                mb: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(14,17,22,0.05)',
                color: INK,
              }}
            >
              <CodeRoundedIcon />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 20, mb: 0.5, color: INK }}>
              No conversion data yet
            </Typography>
            <Typography sx={{ color: SUBTLE, mb: 3, maxWidth: 520, mx: 'auto' }}>
              Drop the Trayarunya pixel on your site (or landing pages) to start tracking the funnel.
              It auto-captures page views, CTA clicks and form submits — no extra code needed.
            </Typography>
            <PixelInstall snippet={snippet} onCopy={copySnippet} />
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {/* Funnel */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 17, mb: 0.5, color: INK }}>
                  Conversion funnel
                </Typography>
                <Typography variant="caption" sx={{ color: SUBTLE }}>
                  Unique visitors progressing through each stage
                </Typography>
                <Box sx={{ mt: 2.5 }}>
                  {loading && !stages.length ? (
                    <Stack alignItems="center" sx={{ py: 4 }}>
                      <CircularProgress sx={{ color: INK }} />
                    </Stack>
                  ) : (
                    stages.map((s, i) => (
                      <FunnelBar key={s.key} stage={s} index={i} max={maxCount} />
                    ))
                  )}
                </Box>

                {data?.biggest_leak && data.biggest_leak.drop > 0 && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      borderRadius: '12px',
                      bgcolor: BRAND.pinkSoft,
                      border: `1px solid ${alpha(BRAND.pink, 0.2)}`,
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <WaterDropRoundedIcon sx={{ color: BRAND.pink }} />
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, color: INK }}>
                          Biggest leak: {data.biggest_leak.from} → {data.biggest_leak.to}
                        </Typography>
                        <Typography variant="caption" sx={{ color: SUBTLE }}>
                          {fmt(data.biggest_leak.drop)} visitors ({data.biggest_leak.drop_pct}%) drop
                          here — only {data.biggest_leak.retained_pct}% continue.
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Opportunities + pixel */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ ...cardSx, mb: 2.5 }}>
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
                    <BoltRoundedIcon fontSize="small" />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 17, color: INK }}>Top opportunities</Typography>
                </Stack>
                {data?.opportunities?.length ? (
                  <Stack spacing={1.5}>
                    {data.opportunities.map((op, i) => (
                      <Box
                        key={i}
                        sx={{
                          p: 1.75,
                          borderRadius: '12px',
                          border: `1px solid ${LINE}`,
                          borderLeft: '3px solid',
                          borderLeftColor: PRIORITY_COLOR[op.priority] || BRAND.amberDeep,
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Box
                            sx={{
                              px: 1,
                              py: 0.3,
                              borderRadius: '999px',
                              fontSize: 10,
                              textTransform: 'uppercase',
                              fontWeight: 800,
                              letterSpacing: '0.03em',
                              bgcolor: alpha(PRIORITY_COLOR[op.priority] || BRAND.amberDeep, 0.12),
                              color: PRIORITY_COLOR[op.priority] || BRAND.amberDeep,
                            }}
                          >
                            {op.priority}
                          </Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 14, color: INK }}>{op.title}</Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: SUBTLE }}>
                          {op.detail}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: SUBTLE }}>
                    No opportunities flagged — funnel looks balanced.
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card sx={cardSx}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
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
                    <CodeRoundedIcon fontSize="small" />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Tracking pixel</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: SUBTLE }}>
                  Paste once before <code>&lt;/body&gt;</code> on every page you want to optimize.
                </Typography>
                <PixelInstall snippet={snippet} onCopy={copySnippet} compact />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {!noData && (
        <Box sx={{ mt: 2 }}>
          <PredictWidget />
        </Box>
      )}
        </>
      )}

      {tab === 1 && <ExperimentsTab />}
      {tab === 2 && <SegmentsTab />}
      {tab === 3 && <AgentTab />}

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Pixel snippet copied"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
