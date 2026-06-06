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
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import { useAuth } from '@/lib/auth';
import {
  Ads,
  AD_PLATFORMS,
  type AdAccount,
  type AdMetricTotals,
  type Campaign,
  type CampaignMetrics,
  type PlatformOverview,
  type AdSeriesPoint,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
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
import { BRAND } from '@/theme/theme';

/* ── design tokens ──────────────────────────────────────── */
const R = '16px';
const INK = '#0E1116';
const LINE = 'rgba(14,17,22,0.08)';
const cardSx = {
  borderRadius: R,
  border: `1px solid ${LINE}`,
  boxShadow: '0 1px 2px rgba(14,17,22,0.04)',
  bgcolor: '#fff',
} as const;
const label = {
  fontWeight: 600,
  fontSize: '0.7rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  google_ads: <GoogleIcon fontSize="small" />,
  meta_ads: <FacebookIcon fontSize="small" />,
  linkedin_ads: <LinkedInIcon fontSize="small" />,
};

const HEALTH_COLOR: Record<string, string> = {
  excellent: BRAND.tealDeep,
  good: BRAND.teal,
  needs_attention: BRAND.amberDeep,
  underperforming: BRAND.pink,
};

/* ── formatters ─────────────────────────────────────────── */
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}
function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(n < 100 ? 2 : 0)}`;
}
function hasData(t?: AdMetricTotals | null): boolean {
  if (!t) return false;
  return (t.impressions || 0) + (t.clicks || 0) + (t.spend || 0) + (t.conversions || 0) > 0;
}
function periodDelta(series: AdSeriesPoint[], metric: keyof AdSeriesPoint): number | null {
  const vals = series.map((s) => Number(s[metric]) || 0);
  if (vals.length < 4) return null;
  const half = Math.floor(vals.length / 2);
  const prev = vals.slice(0, half).reduce((a, b) => a + b, 0);
  const curr = vals.slice(half).reduce((a, b) => a + b, 0);
  if (prev <= 0) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

/* ── sparkline ──────────────────────────────────────────── */
function Spark({
  series,
  metric,
  color,
  height = 40,
  fill = true,
}: {
  series: AdSeriesPoint[];
  metric: keyof AdSeriesPoint;
  color: string;
  height?: number;
  fill?: boolean;
}) {
  const values = series.map((s) => Number(s[metric]) || 0);
  if (values.length < 2) return <Box sx={{ height }} />;
  const W = 240;
  const H = height;
  const pad = 3;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = (W - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (H - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;
  const gid = `sp-${String(metric)}-${color.replace('#', '')}-${height}`;
  return (
    <Box component="svg" viewBox={`0 0 ${W} ${H}`} sx={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Box>
  );
}

/* ── delta pill ─────────────────────────────────────────── */
function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || !isFinite(value)) return null;
  const positive = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.5;
  const color = flat ? '#9AA4B2' : positive ? BRAND.tealDeep : BRAND.pink;
  const Icon = value >= 0 ? TrendingUpRoundedIcon : TrendingDownRoundedIcon;
  return (
    <Stack direction="row" alignItems="center" spacing={0.3} sx={{ color }}>
      {!flat && <Icon sx={{ fontSize: 15 }} />}
      <Typography variant="caption" fontWeight={700}>
        {value > 0 ? '+' : ''}
        {value.toFixed(0)}%
      </Typography>
    </Stack>
  );
}

/* ── metric card with sparkline (Stripe/Linear style) ───── */
function MetricCard({
  label: lbl,
  value,
  sub,
  delta,
  invertDelta,
  series,
  metric,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  invertDelta?: boolean;
  series?: AdSeriesPoint[];
  metric?: keyof AdSeriesPoint;
  color: string;
}) {
  return (
    <Card sx={{ ...cardSx, height: '100%', overflow: 'hidden' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: series ? 0 : 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography sx={label}>{lbl}</Typography>
          {delta !== undefined && <Delta value={delta ?? null} invert={invertDelta} />}
        </Stack>
        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.6, lineHeight: 1.1 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
        {series && metric && series.length > 1 && (
          <Box sx={{ mx: -2, mt: 1 }}>
            <Spark series={series} metric={metric} color={color} height={38} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

/* ── plan renderer ──────────────────────────────────────── */
function renderValue(v: unknown): React.ReactNode {
  if (Array.isArray(v)) {
    return (
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
        {v.map((item, i) => (
          <Chip
            key={i}
            size="small"
            variant="outlined"
            label={typeof item === 'string' || typeof item === 'number' ? String(item) : JSON.stringify(item)}
          />
        ))}
      </Stack>
    );
  }
  if (v && typeof v === 'object') {
    return (
      <Box sx={{ pl: 1.5, mt: 0.5, borderLeft: '2px solid', borderColor: 'divider' }}>
        {Object.entries(v as Record<string, unknown>).map(([k, val]) => (
          <Box key={k} sx={{ mb: 0.75 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
              {k.replace(/_/g, ' ')}
            </Typography>
            {renderValue(val)}
          </Box>
        ))}
      </Box>
    );
  }
  return <Typography variant="body2">{String(v)}</Typography>;
}

const HIDE_PLAN_KEYS = new Set(['name', 'objective', 'platform', 'recommended_daily_budget', '_raw']);

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  padding: '11px 13px',
  borderRadius: 10,
  border: '1px solid rgba(14,17,22,0.14)',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box',
};

/* ── generate dialog ────────────────────────────────────── */
function GenerateDialog({
  open,
  onClose,
  platformLabel,
  accountId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  platformLabel: string;
  accountId: string | null;
  onDone: (c: Campaign) => void;
}) {
  const [objective, setObjective] = useState('');
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [locations, setLocations] = useState('');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!accountId || !objective.trim() || !product.trim()) return;
    setBusy(true);
    setError('');
    try {
      const c = await Ads.generate({
        ad_account_id: accountId,
        objective: objective.trim(),
        product: product.trim(),
        audience: audience.trim() || undefined,
        locations: locations.trim() ? locations.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        daily_budget: budget ? Number(budget) : undefined,
      });
      onDone(c);
      setObjective('');
      setProduct('');
      setAudience('');
      setLocations('');
      setBudget('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PremiumDialog open={open} onClose={busy ? () => {} : onClose} maxWidth="sm">
      <DialogHero
        icon={<AutoAwesomeRoundedIcon />}
        title={`Generate ${platformLabel} campaign`}
        subtitle="The AI strategist drafts a full, platform-ready campaign plan from your brief."
        onClose={busy ? undefined : onClose}
        tint={BRAND.amberDeep}
        tintSoft={BRAND.amberSoft}
      />
      <DialogBody>
        {busy && (
          <Stack spacing={1} sx={{ mb: 2.5 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary">
              The strategist agent is designing your campaign…
            </Typography>
          </Stack>
        )}
        <SectionLabel>Campaign brief</SectionLabel>
        <FieldGrid>
          <FullSpan>
            <Typography sx={label}>Objective</Typography>
            <input style={inputStyle} placeholder="Drive qualified B2B demo bookings" value={objective} onChange={(e) => setObjective(e.target.value)} autoFocus />
          </FullSpan>
          <FullSpan>
            <Typography sx={label}>Product / offer</Typography>
            <input style={inputStyle} placeholder="AI hiring platform with skills assessments" value={product} onChange={(e) => setProduct(e.target.value)} />
          </FullSpan>
          <FullSpan>
            <Typography sx={label}>Target audience (optional)</Typography>
            <input style={inputStyle} placeholder="Heads of Talent at 50–500 person tech companies" value={audience} onChange={(e) => setAudience(e.target.value)} />
          </FullSpan>
          <Box>
            <Typography sx={label}>Locations</Typography>
            <input style={inputStyle} placeholder="United States, United Kingdom" value={locations} onChange={(e) => setLocations(e.target.value)} />
          </Box>
          <Box>
            <Typography sx={label}>Daily budget</Typography>
            <input style={inputStyle} type="number" placeholder="60" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Box>
          {error && (
            <FullSpan>
              <Alert severity="error">{error}</Alert>
            </FullSpan>
          )}
        </FieldGrid>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} disabled={busy} sx={ghostPillSx}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={busy || !accountId || !objective.trim() || !product.trim()}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon />}
          sx={inkPillSx}
        >
          {busy ? 'Generating…' : 'Generate with AI'}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

/* ── optimizer panel ────────────────────────────────────── */
function OptimizerPanel({ recs }: { recs: NonNullable<Campaign['recommendations']> }) {
  const color = HEALTH_COLOR[recs.health || 'good'] || BRAND.teal;
  const budget = recs.budget_recommendation;
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Chip size="small" label={(recs.health || 'good').replace(/_/g, ' ')} sx={{ bgcolor: `${color}1A`, color, fontWeight: 700, textTransform: 'capitalize' }} />
        {recs.engine && (
          <Chip
            size="small"
            variant="outlined"
            icon={recs.engine === 'ai' ? <AutoAwesomeRoundedIcon /> : <ScienceRoundedIcon />}
            label={recs.engine === 'ai' ? 'AI agent' : 'Heuristic engine'}
          />
        )}
      </Stack>
      {recs.summary && <Typography variant="body2" sx={{ mb: 1.5 }}>{recs.summary}</Typography>}
      {budget && (
        <Card sx={{ ...cardSx, borderRadius: '12px', mb: 1.5, bgcolor: 'background.default' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {budget.action === 'increase' ? (
                <TrendingUpRoundedIcon sx={{ color: BRAND.tealDeep }} />
              ) : budget.action === 'decrease' ? (
                <TrendingDownRoundedIcon sx={{ color: BRAND.pink }} />
              ) : (
                <BoltRoundedIcon sx={{ color: BRAND.amberDeep }} />
              )}
              <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                {budget.action} budget
                {budget.change_pct ? ` ${budget.change_pct > 0 ? '+' : ''}${budget.change_pct}%` : ''}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">{budget.rationale}</Typography>
          </CardContent>
        </Card>
      )}
      <Stack spacing={1}>
        {(recs.actions || []).map((a, i) => {
          const c = a.priority === 'high' ? BRAND.pink : a.priority === 'medium' ? BRAND.amberDeep : BRAND.teal;
          return (
            <Box key={i} sx={{ display: 'flex', gap: 1.2 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: 99, bgcolor: c, mt: 0.8, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>{a.action}</Typography>
                {a.expected_impact && <Typography variant="caption" color="text.secondary">{a.expected_impact}</Typography>}
              </Box>
            </Box>
          );
        })}
      </Stack>
      {recs.tests_to_run && recs.tests_to_run.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography sx={{ ...label, mb: 1 }}>Experiments to run</Typography>
          <Stack spacing={0.5}>
            {recs.tests_to_run.map((t, i) => (
              <Typography key={i} variant="caption" color="text.secondary">• {t}</Typography>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

/* ── empty-state block ──────────────────────────────────── */
function EmptyBlock({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ border: `1px dashed ${LINE}`, borderRadius: R, p: { xs: 3, md: 4 }, textAlign: 'center', bgcolor: 'rgba(14,17,22,0.012)' }}>
      <Box sx={{ color: BRAND.amber, mb: 1, '& svg': { fontSize: 34 } }}>{icon}</Box>
      <Typography fontWeight={800}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto', mt: 0.5, mb: action ? 2 : 0 }}>
        {body}
      </Typography>
      {action}
    </Box>
  );
}

/* ── account setup: confirm customer id + Ad Grants detection ── */
function AccountSetup({ account, onSaved }: { account: AdAccount; onSaved: () => void }) {
  const discovered = account.meta?.discovered ?? [];
  const [externalId, setExternalId] = useState(account.external_id ?? discovered[0]?.external_id ?? '');
  const [isGrant, setIsGrant] = useState(account.is_grant);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const detected = account.meta?.grant_detected;
  const signals = account.meta?.grant_signals ?? [];

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      await Ads.updateAccount(account.id, {
        external_id: externalId.trim() || undefined,
        is_grant: isGrant,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ ...cardSx, borderColor: BRAND.amber, bgcolor: 'rgba(255,175,6,0.04)' }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <VolunteerActivismRoundedIcon sx={{ color: BRAND.amberDeep, fontSize: 20 }} />
          <Typography fontWeight={800}>Confirm your account</Typography>
          <Chip size="small" label="Action needed" sx={{ bgcolor: BRAND.amber, color: INK, fontWeight: 700, height: 20 }} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          We connected your Google login and detected the account(s) below. Pick the account
          you advertise from, and confirm whether it&apos;s a Google Ad Grants (nonprofit) account —
          Grant accounts allow Search (RSA) &amp; Performance Max and are capped at $329/day.
        </Typography>

        {discovered.length > 0 ? (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ ...label, mb: 0.5 }}>Ad account (customer ID)</Typography>
            <Select
              fullWidth
              size="small"
              value={externalId}
              onChange={(e) => {
                const v = e.target.value as string;
                setExternalId(v);
                const c = discovered.find((d) => d.external_id === v);
                if (c) setIsGrant(c.is_grant_guess);
              }}
              sx={{ borderRadius: '10px', bgcolor: '#fff' }}
            >
              {discovered.map((d) => (
                <MenuItem key={d.external_id} value={d.external_id}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <Typography fontWeight={700} component="span">{d.name}</Typography>
                    <Typography variant="caption" color="text.secondary" component="span">
                      {d.external_id} · {d.currency}
                      {d.monthly_budget != null ? ` · $${d.monthly_budget.toLocaleString()}/mo` : ''}
                    </Typography>
                    {d.is_grant_guess && (
                      <Chip size="small" label="Grant detected" sx={{ height: 18, bgcolor: BRAND.teal, color: '#fff', fontWeight: 700 }} />
                    )}
                    {d.is_manager && <Chip size="small" label="Manager" variant="outlined" sx={{ height: 18 }} />}
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </Box>
        ) : (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ ...label, mb: 0.5 }}>Customer ID</Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="123-456-7890"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#fff' } }}
            />
            <Typography variant="caption" color="text.secondary">
              We couldn&apos;t auto-discover accounts (the Google Ads developer token may not be set).
              Enter your Google Ads customer ID manually.
            </Typography>
          </Box>
        )}

        <Box sx={{ p: 1.5, borderRadius: '12px', border: `1px solid ${LINE}`, bgcolor: '#fff' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography fontWeight={700}>Google Ad Grants (nonprofit) account</Typography>
              <Typography variant="caption" color="text.secondary">
                Enforces $329/day cap, Maximize Conversions, and Search/Performance Max only.
              </Typography>
            </Box>
            <Switch checked={isGrant} onChange={(e) => setIsGrant(e.target.checked)} />
          </Stack>
          {detected !== undefined && (
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 1, color: detected ? BRAND.tealDeep : 'text.secondary' }}>
              {detected ? <CheckCircleRoundedIcon sx={{ fontSize: 15 }} /> : <ShowChartRoundedIcon sx={{ fontSize: 15 }} />}
              <Typography variant="caption">
                {detected ? 'Auto-detected as an Ad Grants account' : 'Not detected as a Grant account'}
                {signals.length > 0 ? ` — ${signals.join(', ')}` : ''}
              </Typography>
            </Stack>
          )}
        </Box>

        {err && <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setErr('')}>{err}</Alert>}
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button onClick={onSaved} color="inherit" disabled={busy}>Later</Button>
          <Button variant="contained" onClick={save} disabled={busy} startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <CheckCircleRoundedIcon />}>
            Confirm account
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ── campaign detail ────────────────────────────────────── */
function CampaignDetail({
  campaign,
  metrics,
  platformColor,
  liveCapable,
  onToggle,
  onSync,
  onOptimize,
  onDelete,
  busy,
}: {
  campaign: Campaign;
  metrics: CampaignMetrics | null;
  platformColor: string;
  liveCapable: boolean;
  onToggle: () => void;
  onSync: () => void;
  onOptimize: () => void;
  onDelete: () => void;
  busy: { sync: boolean; optimize: boolean };
}) {
  const k = metrics?.kpis;
  const t = metrics?.totals;
  const dataPresent = hasData(t);
  const series = metrics?.series ?? [];
  const planEntries = campaign.plan ? Object.entries(campaign.plan).filter(([key]) => !HIDE_PLAN_KEYS.has(key)) : [];

  return (
    <Card sx={cardSx}>
      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Chip
                size="small"
                label={campaign.status}
                sx={{ textTransform: 'capitalize', fontWeight: 700 }}
                color={campaign.status === 'active' ? 'success' : campaign.status === 'paused' ? 'warning' : 'default'}
              />
              {campaign.daily_budget != null && <Chip size="small" variant="outlined" label={`${fmtMoney(campaign.daily_budget)}/day`} />}
              {campaign.external_id ? (
                <Chip size="small" variant="outlined" icon={<LinkRoundedIcon />} label="Linked" />
              ) : (
                <Tooltip title="Not linked to a live platform campaign yet — performance data is empty.">
                  <Chip size="small" variant="outlined" label="Not linked" />
                </Tooltip>
              )}
            </Stack>
            <Typography variant="h5" fontWeight={800}>{campaign.name}</Typography>
            {campaign.objective && <Typography color="text.secondary" variant="body2">{campaign.objective}</Typography>}
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Sync live metrics">
              <span>
                <IconButton onClick={onSync} disabled={busy.sync}>
                  {busy.sync ? <CircularProgress size={18} /> : <SyncRoundedIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={campaign.status === 'active' ? 'Pause' : 'Activate'}>
              <IconButton onClick={onToggle}>{campaign.status === 'active' ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}</IconButton>
            </Tooltip>
            <Tooltip title="Delete campaign">
              <IconButton onClick={onDelete} color="error"><DeleteOutlineRoundedIcon /></IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Box sx={{ mt: 3 }}>
          <Typography sx={{ ...label, mb: 1.5 }}>Performance · last {metrics?.days ?? 30} days</Typography>
          {dataPresent ? (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.2 }}>
                <MetricCard label="Spend" value={t ? fmtMoney(t.spend) : '—'} delta={periodDelta(series, 'spend')} series={series} metric="spend" color={platformColor} />
                <MetricCard label="Impr." value={t ? fmtNum(t.impressions) : '—'} delta={periodDelta(series, 'impressions')} series={series} metric="impressions" color={platformColor} />
                <MetricCard label="Clicks" value={t ? fmtNum(t.clicks) : '—'} delta={periodDelta(series, 'clicks')} series={series} metric="clicks" color={BRAND.tealDeep} />
                <MetricCard label="CTR" value={k ? `${k.ctr}%` : '—'} color={BRAND.tealDeep} />
                <MetricCard label="Conv." value={t ? fmtNum(t.conversions) : '—'} delta={periodDelta(series, 'conversions')} series={series} metric="conversions" color={BRAND.amberDeep} />
                <MetricCard label="CPA" value={k ? fmtMoney(k.cpa) : '—'} color={BRAND.amberDeep} />
              </Box>
            </>
          ) : (
            <EmptyBlock
              icon={<ShowChartRoundedIcon />}
              title="No performance data yet"
              body={
                liveCapable
                  ? 'Link this campaign to a live platform campaign and sync to pull real metrics from the ad network.'
                  : 'Connect this platform via OAuth and link a live campaign to stream real performance data here.'
              }
            />
          )}
        </Box>

        <Divider sx={{ my: 3 }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6" fontWeight={800}>AI optimizer</Typography>
          <Button
            size="small"
            variant="contained"
            onClick={onOptimize}
            disabled={busy.optimize}
            startIcon={busy.optimize ? <CircularProgress size={15} color="inherit" /> : <BoltRoundedIcon />}
          >
            {busy.optimize ? 'Analyzing…' : campaign.recommendations ? 'Re-run' : 'Run optimizer'}
          </Button>
        </Stack>
        {campaign.recommendations ? (
          <OptimizerPanel recs={campaign.recommendations} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Run the optimizer to get prioritized, benchmark-aware actions for this campaign.
          </Typography>
        )}

        {planEntries.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" fontWeight={800} gutterBottom>Campaign plan</Typography>
            {planEntries.map(([key, v]) => (
              <Box key={key} sx={{ mb: 1.75 }}>
                <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', fontWeight: 700 }}>{key.replace(/_/g, ' ')}</Typography>
                {renderValue(v)}
              </Box>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── campaign table row ─────────────────────────────────── */
function CampaignRow({
  c,
  roll,
  active,
  color,
  onClick,
}: {
  c: Campaign;
  roll: PlatformOverview['campaigns'][number] | undefined;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  const rollHasData = hasData(roll?.totals);
  const statusColor =
    c.status === 'active' ? BRAND.tealDeep : c.status === 'paused' ? BRAND.amberDeep : '#9AA4B2';
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 84px 70px 56px',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1.4,
        cursor: 'pointer',
        borderLeft: '3px solid',
        borderColor: active ? color : 'transparent',
        bgcolor: active ? `${color}08` : 'transparent',
        '&:hover': { bgcolor: active ? `${color}08` : 'rgba(14,17,22,0.025)' },
        transition: 'background .12s',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.2 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: 99, bgcolor: statusColor, flexShrink: 0 }} />
          <Typography fontWeight={700} fontSize={14} noWrap title={c.name}>
            {c.name}
          </Typography>
          {c.recommendations?.health && (
            <Box sx={{ width: 7, height: 7, borderRadius: 99, bgcolor: HEALTH_COLOR[c.recommendations.health] || BRAND.teal, flexShrink: 0 }} />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
          {c.status}
          {c.daily_budget != null ? ` · ${fmtMoney(c.daily_budget)}/day` : ''}
        </Typography>
      </Box>
      <Typography fontSize={13} fontWeight={600} textAlign="right" color={rollHasData ? 'text.primary' : 'text.disabled'}>
        {rollHasData && roll ? fmtMoney(roll.totals.spend) : '—'}
      </Typography>
      <Typography fontSize={13} textAlign="right" color={rollHasData ? 'text.secondary' : 'text.disabled'}>
        {rollHasData && roll ? fmtNum(roll.totals.clicks) : '—'}
      </Typography>
      <Typography fontSize={13} textAlign="right" color={rollHasData ? 'text.secondary' : 'text.disabled'}>
        {rollHasData && roll ? `${roll.kpis.ctr}%` : '—'}
      </Typography>
    </Box>
  );
}

/* ── main page ──────────────────────────────────────────── */
export default function AdsPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const [platform, setPlatform] = useState<string>('google_ads');
  const [days, setDays] = useState(30);
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);

  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [busySync, setBusySync] = useState(false);
  const [busyOpt, setBusyOpt] = useState(false);
  const [error, setError] = useState('');

  const meta = AD_PLATFORMS.find((p) => p.id === platform)!;
  const account = useMemo(() => accounts.find((a) => a.platform === platform) || null, [accounts, platform]);
  const connected = account?.connected ?? false;
  const liveCapable = !!providers[platform];

  const loadPlatform = useCallback(async (p: string, d: number) => {
    setPanelLoading(true);
    setError('');
    try {
      const [ov, cs, accs] = await Promise.all([
        Ads.overview(p, d).catch(() => null),
        Ads.campaigns(p).catch(() => []),
        Ads.accounts().catch(() => []),
      ]);
      setAccounts(accs);
      setOverview(ov);
      setCampaigns(cs);
      setSelected((cur) => {
        const next = cur && cs.find((c) => c.id === cur.id) ? cs.find((c) => c.id === cur.id)! : cs[0] || null;
        return next || null;
      });
    } finally {
      setPanelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Ads.providers().then((r) => setProviders(r.providers)).catch(() => setProviders({}));
    loadPlatform(platform, days).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  useEffect(() => {
    if (!activeWorkspace || loading) return;
    loadPlatform(platform, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, days]);

  useEffect(() => {
    if (!selected) {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    Ads.metrics(selected.id, days)
      .then((m) => !cancelled && setMetrics(m))
      .catch(() => !cancelled && setMetrics(null));
    return () => {
      cancelled = true;
    };
  }, [selected, days]);

  // Real OAuth connect only. No fake/instant connect.
  const connect = async () => {
    setError('');
    if (!liveCapable) {
      setError(
        `Live OAuth for ${meta.label} isn't configured on this deployment. Set the platform's OAuth client id & secret to connect a real ad account.`,
      );
      return;
    }
    setConnecting(true);
    try {
      const { authorization_url } = await Ads.oauthStart(platform);
      const popup = window.open(authorization_url, 'ads_oauth', 'width=620,height=720');
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer);
          setConnecting(false);
          loadPlatform(platform, days);
        }
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start OAuth');
      setConnecting(false);
    }
  };

  const onGenerated = (c: Campaign) => {
    setCampaigns((prev) => [c, ...prev]);
    setSelected(c);
    loadPlatform(platform, days);
  };

  const [discovering, setDiscovering] = useState(false);
  const rediscover = async () => {
    if (!account) return;
    setDiscovering(true);
    setError('');
    try {
      await Ads.discoverAccount(account.id);
      await loadPlatform(platform, days);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not detect accounts');
    } finally {
      setDiscovering(false);
    }
  };

  const openGenerate = () => {
    if (!account) {
      setError(
        liveCapable
          ? `Connect your ${meta.label} account via OAuth to generate campaigns.`
          : `Live OAuth for ${meta.label} isn't configured on this deployment. Set the platform's OAuth client id & secret to connect a real ad account first.`,
      );
      return;
    }
    setGenOpen(true);
  };

  const toggleStatus = async () => {
    if (!selected) return;
    const next = selected.status === 'active' ? 'paused' : 'active';
    const updated = await Ads.setStatus(selected.id, next);
    setSelected(updated);
    setCampaigns((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  const syncSelected = async () => {
    if (!selected) return;
    setBusySync(true);
    try {
      const m = await Ads.sync(selected.id, days);
      setMetrics(m);
      loadPlatform(platform, days);
    } finally {
      setBusySync(false);
    }
  };

  const optimizeSelected = async () => {
    if (!selected) return;
    setBusyOpt(true);
    try {
      const updated = await Ads.optimize(selected.id, days);
      setSelected(updated);
      setCampaigns((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } finally {
      setBusyOpt(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected) return;
    const ok = await confirm({
      title: 'Delete campaign?',
      message: `"${selected.name}" and its metrics will be permanently removed.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await Ads.deleteCampaign(selected.id);
    setCampaigns((prev) => prev.filter((x) => x.id !== selected.id));
    setSelected((prev) => {
      const remaining = campaigns.filter((x) => x.id !== prev?.id);
      return remaining[0] || null;
    });
    loadPlatform(platform, days);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  const ov = overview;
  const k = ov?.kpis;
  const t = ov?.totals;
  const series = ov?.series ?? [];
  const overviewHasData = hasData(t);

  return (
    <Stack spacing={2.5}>
      {/* toolbar */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
        <Box>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Typography variant="h4" fontWeight={800}>Ads</Typography>
            <Chip size="small" icon={<AutoAwesomeRoundedIcon />} label="AI agentic" sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700 }} />
          </Stack>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.3 }}>
            Plan, launch and optimize paid campaigns with an AI strategist and autonomous optimizer.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {/* segmented platform switcher */}
          <Stack direction="row" sx={{ p: 0.4, bgcolor: 'rgba(14,17,22,0.04)', borderRadius: 99 }}>
            {AD_PLATFORMS.map((p) => {
              const on = platform === p.id;
              return (
                <Box
                  key={p.id}
                  onClick={() => {
                    setSelected(null);
                    setPlatform(p.id);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.7,
                    px: 1.4,
                    py: 0.7,
                    borderRadius: 99,
                    cursor: 'pointer',
                    bgcolor: on ? '#fff' : 'transparent',
                    boxShadow: on ? '0 1px 2px rgba(14,17,22,0.12)' : 'none',
                    transition: 'all .15s',
                  }}
                >
                  <Box sx={{ color: p.color, display: 'flex' }}>{PLATFORM_ICON[p.id]}</Box>
                  <Typography fontWeight={700} fontSize={13.5} sx={{ display: { xs: 'none', sm: 'block' }, color: on ? 'text.primary' : 'text.secondary' }}>
                    {p.label.replace(' Ads', '')}
                  </Typography>
                  <Box sx={{ width: 6, height: 6, borderRadius: 99, bgcolor: providers[p.id] ? BRAND.tealDeep : 'rgba(14,17,22,0.2)' }} />
                </Box>
              );
            })}
          </Stack>
          {/* date range */}
          <Stack direction="row" sx={{ p: 0.4, border: `1px solid ${LINE}`, borderRadius: 99 }}>
            {[7, 14, 30].map((d) => (
              <Box
                key={d}
                onClick={() => setDays(d)}
                sx={{
                  px: 1.3,
                  py: 0.6,
                  borderRadius: 99,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: days === d ? '#fff' : 'text.secondary',
                  bgcolor: days === d ? INK : 'transparent',
                  transition: 'all .15s',
                }}
              >
                {d}d
              </Box>
            ))}
          </Stack>
          <Button variant="contained" onClick={openGenerate} startIcon={<AutoAwesomeRoundedIcon />}>
            New campaign
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {/* hero summary panel (dark, Stripe-style) */}
      <Card sx={{ borderRadius: R, border: 'none', overflow: 'hidden', bgcolor: INK, color: '#fff', position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              `radial-gradient(900px 360px at 100% 0%, ${meta.color}33, transparent 60%), radial-gradient(700px 300px at 0% 100%, rgba(20,187,135,0.18), transparent 55%)`,
          }}
        />
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, position: 'relative' }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} justifyContent="space-between">
            <Box sx={{ minWidth: 220 }}>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
                <Box sx={{ width: 38, height: 38, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: meta.color, color: '#fff' }}>
                  {PLATFORM_ICON[platform]}
                </Box>
                <Box>
                  <Typography fontWeight={800} sx={{ lineHeight: 1.1 }}>{meta.label}</Typography>
                  {connected ? (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: BRAND.teal }}>
                      <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption" fontWeight={700}>{liveCapable ? 'Connected · Live' : 'Connected'}</Typography>
                      {account?.is_grant && (
                        <Chip size="small" icon={<VolunteerActivismRoundedIcon sx={{ fontSize: 12 }} />} label="Ad Grants" sx={{ height: 18, bgcolor: 'rgba(20,187,135,0.18)', color: BRAND.teal, fontWeight: 700, '& .MuiChip-icon': { color: BRAND.teal } }} />
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>Not connected</Typography>
                  )}
                </Box>
              </Stack>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                Total spend · {days}d
              </Typography>
              <Stack direction="row" spacing={1.2} alignItems="baseline">
                <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                  {t ? fmtMoney(t.spend) : '$0'}
                </Typography>
                <Delta value={periodDelta(series, 'spend')} />
              </Stack>
              {!connected && (
                <Button
                  onClick={connect}
                  disabled={connecting || !liveCapable}
                  size="small"
                  variant="contained"
                  startIcon={connecting ? <CircularProgress size={14} color="inherit" /> : liveCapable ? <LinkRoundedIcon /> : <LockRoundedIcon />}
                  sx={{ mt: 1.5, bgcolor: '#fff', color: INK, '&:hover': { bgcolor: 'rgba(255,255,255,0.88)' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)' } }}
                >
                  {connecting ? 'Connecting…' : liveCapable ? 'Connect via OAuth' : 'OAuth not configured'}
                </Button>
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {overviewHasData && series.length > 1 ? (
                <Spark series={series} metric="spend" color={meta.color} height={120} />
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: 120, color: 'rgba(255,255,255,0.4)' }} spacing={0.5}>
                  <ShowChartRoundedIcon />
                  <Typography variant="caption">{connected ? 'No performance data yet' : 'Connect to stream live performance'}</Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={3} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                {[
                  { l: 'Impressions', v: t ? fmtNum(t.impressions) : '0' },
                  { l: 'Clicks', v: t ? fmtNum(t.clicks) : '0' },
                  { l: 'Conversions', v: t ? fmtNum(t.conversions) : '0' },
                  { l: 'Campaigns', v: ov ? `${ov.campaign_count}` : '0' },
                  { l: 'Active', v: ov ? `${ov.active_count}` : '0' },
                ].map((s) => (
                  <Box key={s.l}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>{s.l}</Typography>
                    <Typography fontWeight={800}>{s.v}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
          {!liveCapable && (
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 2, color: 'rgba(255,255,255,0.55)' }}>
              <LockRoundedIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption">
                Live reporting for {meta.label} requires OAuth credentials on this deployment.
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* confirm account + Ad Grants detection (Google, after OAuth) */}
      {account && account.platform === 'google_ads' && account.connected &&
        (account.meta?.needs_confirmation || (account.meta?.discovered?.length ?? 0) > 0) ? (
        <AccountSetup account={account} onSaved={() => loadPlatform(platform, days)} />
      ) : account && account.platform === 'google_ads' && account.connected ? (
        <Card sx={{ ...cardSx, bgcolor: 'rgba(14,17,22,0.012)' }}>
          <CardContent sx={{ p: { xs: 1.75, md: 2.25 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1.2} alignItems="center">
                <VolunteerActivismRoundedIcon sx={{ color: BRAND.amberDeep }} />
                <Box>
                  <Typography fontWeight={700}>
                    {account.is_grant ? 'Ad Grants account confirmed' : 'Detect account & Ad Grants status'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {account.external_id
                      ? `Customer ID ${account.external_id}${account.is_grant ? ' · nonprofit ($329/day cap, Search + Performance Max)' : ''}`
                      : 'Identify which Google Ads account this token manages and auto-detect nonprofit (Ad Grants) status.'}
                  </Typography>
                </Box>
              </Stack>
              <Button
                onClick={rediscover}
                disabled={discovering}
                variant="outlined"
                size="small"
                startIcon={discovering ? <CircularProgress size={14} color="inherit" /> : <SyncRoundedIcon />}
              >
                {discovering ? 'Detecting…' : account.external_id ? 'Re-detect' : 'Detect account'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {/* metric cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
          gap: 1.5,
          opacity: panelLoading ? 0.55 : 1,
          transition: 'opacity .2s',
        }}
      >
        <MetricCard label="Spend" value={t ? fmtMoney(t.spend) : '$0'} delta={periodDelta(series, 'spend')} series={series} metric="spend" color={meta.color} />
        <MetricCard label="Impressions" value={t ? fmtNum(t.impressions) : '0'} delta={periodDelta(series, 'impressions')} series={series} metric="impressions" color={meta.color} />
        <MetricCard label="Clicks" value={t ? fmtNum(t.clicks) : '0'} sub={k ? `CTR ${k.ctr}%` : undefined} delta={periodDelta(series, 'clicks')} series={series} metric="clicks" color={BRAND.tealDeep} />
        <MetricCard label="Avg CPC" value={k ? fmtMoney(k.cpc) : '$0'} invertDelta color={BRAND.tealDeep} />
        <MetricCard label="Conversions" value={t ? fmtNum(t.conversions) : '0'} sub={k ? `${k.conversion_rate}% CVR` : undefined} delta={periodDelta(series, 'conversions')} series={series} metric="conversions" color={BRAND.amberDeep} />
        <MetricCard label="CPA" value={k ? fmtMoney(k.cpa) : '$0'} invertDelta color={BRAND.amberDeep} />
      </Box>

      {/* campaigns + detail */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '380px 1fr' }, gap: 2.5, alignItems: 'start' }}>
        <Card sx={{ ...cardSx, overflow: 'hidden' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.6, borderBottom: `1px solid ${LINE}` }}>
            <Typography sx={{ ...label, mb: 0 }}>Campaigns</Typography>
            {campaigns.length > 0 && (
              <Box sx={{ px: 1, py: 0.2, borderRadius: 99, bgcolor: 'rgba(14,17,22,0.05)' }}>
                <Typography variant="caption" fontWeight={700}>{campaigns.length}</Typography>
              </Box>
            )}
          </Stack>
          {campaigns.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyBlock
                icon={<AutoAwesomeRoundedIcon />}
                title="No campaigns yet"
                body={`Generate your first ${meta.label} campaign with the AI strategist.`}
                action={
                  <Button variant="contained" onClick={openGenerate} startIcon={<AutoAwesomeRoundedIcon />}>
                    Generate campaign
                  </Button>
                }
              />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 84px 70px 56px', gap: 1, px: 2, py: 0.8, borderBottom: `1px solid ${LINE}`, bgcolor: 'rgba(14,17,22,0.015)' }}>
                <Typography sx={{ ...label, fontSize: '0.64rem' }}>Campaign</Typography>
                <Typography sx={{ ...label, fontSize: '0.64rem', textAlign: 'right' }}>Spend</Typography>
                <Typography sx={{ ...label, fontSize: '0.64rem', textAlign: 'right' }}>Clicks</Typography>
                <Typography sx={{ ...label, fontSize: '0.64rem', textAlign: 'right' }}>CTR</Typography>
              </Box>
              <Box sx={{ '& > *': { borderBottom: `1px solid ${LINE}` }, '& > *:last-child': { borderBottom: 'none' } }}>
                {campaigns.map((c) => (
                  <CampaignRow
                    key={c.id}
                    c={c}
                    roll={ov?.campaigns.find((r) => r.id === c.id)}
                    active={selected?.id === c.id}
                    color={meta.color}
                    onClick={() => setSelected(c)}
                  />
                ))}
              </Box>
            </>
          )}
        </Card>

        <Box>
          {selected ? (
            <CampaignDetail
              campaign={selected}
              metrics={metrics}
              platformColor={meta.color}
              liveCapable={liveCapable}
              onToggle={toggleStatus}
              onSync={syncSelected}
              onOptimize={optimizeSelected}
              onDelete={deleteSelected}
              busy={{ sync: busySync, optimize: busyOpt }}
            />
          ) : (
            <Card sx={cardSx}>
              <CardContent sx={{ p: 0 }}>
                <EmptyBlock
                  icon={<ArrowOutwardRoundedIcon />}
                  title="Select a campaign"
                  body="Pick a campaign to see its full plan, live metrics and AI recommendations."
                />
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      <GenerateDialog open={genOpen} onClose={() => setGenOpen(false)} platformLabel={meta.label} accountId={account?.id ?? null} onDone={onGenerated} />
    </Stack>
  );
}
