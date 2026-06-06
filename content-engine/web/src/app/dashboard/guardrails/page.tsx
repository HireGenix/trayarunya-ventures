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
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import { inkPillSx, softPillSx, SectionLabel } from '@/components/PremiumDialog';

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
  { label: 'Checker', icon: <FactCheckRoundedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Policies', icon: <PolicyRoundedIcon sx={{ fontSize: 18 }} /> },
  { label: 'History', icon: <HistoryRoundedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Overview', icon: <DashboardRoundedIcon sx={{ fontSize: 18 }} /> },
];

const SEVERITY_STYLE: Record<string, { bg: string; fg: string }> = {
  low: { bg: BRAND.tealSoft, fg: BRAND.tealDeep },
  medium: { bg: BRAND.amberSoft, fg: BRAND.amberDeep },
  high: { bg: BRAND.pinkSoft, fg: BRAND.pink },
  critical: { bg: BRAND.pinkSoft, fg: BRAND.pink },
};

/* ----------------------------- types ----------------------------- */

interface Violation {
  policy: string;
  severity: string;
  span?: number[] | null;
  message: string;
  suggestion?: string | null;
}

interface Check {
  id: string;
  content_ref?: string | null;
  content_text: string;
  policies_run?: string[] | null;
  score: number;
  passed: boolean;
  violations?: Violation[] | null;
  status: string;
  created_at: string;
}

interface Policy {
  id: string;
  name: string;
  kind: string;
  config?: Record<string, unknown> | null;
  severity: string;
  is_active: boolean;
  created_at: string;
}

interface Overview {
  checks_run: number;
  passed: number;
  pass_rate: number;
  avg_brand_fit: number;
  open_violations: number;
  active_policies: number;
  top_violations: { policy: string; count: number; severity: string }[];
}

/* ----------------------------- helpers ----------------------------- */

function scoreColor(score: number): string {
  if (score >= 80) return BRAND.tealDeep;
  if (score >= 50) return BRAND.amberDeep;
  return BRAND.pink;
}

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

function SeverityChip({ severity }: { severity: string }) {
  const s = SEVERITY_STYLE[severity?.toLowerCase()] || SEVERITY_STYLE.medium;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        px: 1,
        py: 0.3,
        borderRadius: '999px',
        bgcolor: s.bg,
        color: s.fg,
        fontWeight: 700,
        fontSize: 11.5,
        textTransform: 'capitalize',
      }}
    >
      {severity || 'medium'}
    </Box>
  );
}

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card sx={{ ...cardSx, height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(14,17,22,0.05)', color: INK }}>
            {icon}
          </Box>
          <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 13 }}>{label}</Typography>
        </Stack>
        <Typography sx={{ fontWeight: 800, fontSize: 30, color: INK, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          {value}
        </Typography>
        {sub && <Typography sx={{ mt: 0.5, color: SUBTLE, fontSize: 12.5, fontWeight: 600 }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

const inkBtnSx = {
  background: INK,
  backgroundImage: 'none',
  color: '#fff',
  borderRadius: '999px',
  textTransform: 'none',
  fontWeight: 700,
  px: 2.5,
  '&:hover': { background: '#000', backgroundImage: 'none' },
} as const;

/* ----------------------------- page ----------------------------- */

export default function GuardrailsPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState(0);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Checker state
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Check | null>(null);
  const [fixing, setFixing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c, o] = await Promise.all([
        api<Policy[]>('/guardrails/policies', { workspace: true }),
        api<Check[]>('/guardrails/checks', { workspace: true }),
        api<Overview>('/guardrails/overview', { workspace: true }),
      ]);
      setPolicies(p);
      setChecks(c);
      setOverview(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load guardrails');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const runCheck = useCallback(async () => {
    if (!text.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const res = await api<Check>('/guardrails/check', {
        method: 'POST',
        body: { content_text: text },
        workspace: true,
      });
      setResult(res);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setRunning(false);
    }
  }, [text, load]);

  const applyFix = useCallback(async () => {
    if (!text.trim()) return;
    setFixing(true);
    setError(null);
    try {
      const res = await api<{ fixed_text: string; notes: string; ai_used: boolean }>('/guardrails/autofix', {
        method: 'POST',
        body: { content_text: text },
        workspace: true,
      });
      setText(res.fixed_text);
      setResult(null);
      setToast(res.notes || 'Applied on-brand fix');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Autofix failed');
    } finally {
      setFixing(false);
    }
  }, [text]);

  const togglePolicy = useCallback(async (p: Policy) => {
    try {
      const updated = await api<Policy>(`/guardrails/policies/${p.id}`, {
        method: 'PATCH',
        body: { is_active: !p.is_active },
        workspace: true,
      });
      setPolicies((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update policy');
    }
  }, []);

  const createPolicy = useCallback(async () => {
    try {
      await api<Policy>('/guardrails/policies', {
        method: 'POST',
        body: {
          name: 'New voice policy',
          kind: 'voice',
          severity: 'medium',
          config: { banned_words: [], required_disclaimers: [], reading_level: 0, tone: '' },
        },
        workspace: true,
      });
      setToast('Policy created');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create policy');
    }
  }, [load]);

  const kpis = useMemo(
    () => [
      { icon: <VerifiedRoundedIcon fontSize="small" />, label: 'Pass rate', value: overview ? `${overview.pass_rate}%` : '—', sub: overview ? `${overview.passed}/${overview.checks_run} passed` : undefined },
      { icon: <FactCheckRoundedIcon fontSize="small" />, label: 'Checks run', value: overview ? String(overview.checks_run) : '—' },
      { icon: <ShieldRoundedIcon fontSize="small" />, label: 'Avg brand-fit', value: overview ? String(overview.avg_brand_fit) : '—', sub: '/ 100' },
      { icon: <WarningAmberRoundedIcon fontSize="small" />, label: 'Open violations', value: overview ? String(overview.open_violations) : '—' },
    ],
    [overview],
  );

  if (!activeWorkspace) {
    return (
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        Select a workspace to use Guardrails.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: INK }}>
            Brand{' '}
            <Box
              component="span"
              sx={{ backgroundImage: BRAND.gradientText, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Guardrails
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Check any copy against your brand voice and compliance policies — every score from real checks.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            onClick={() => void load()}
            sx={{ width: 44, height: 44, bgcolor: '#fff', border: `1px solid ${LINE}`, color: INK, '&:hover': { bgcolor: '#fff' } }}
          >
            <RefreshRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* KPI cards */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {kpis.map((k) => (
          <Grid key={k.label} size={{ xs: 6, md: 3 }}>
            <StatTile icon={k.icon} label={k.label} value={k.value} sub={k.sub} />
          </Grid>
        ))}
      </Grid>

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
                backgroundImage: 'none',
                color: active ? '#fff' : 'text.secondary',
                '&:hover': { bgcolor: active ? '#1B2330' : 'rgba(14,17,22,0.05)', backgroundImage: 'none', color: active ? '#fff' : INK },
              }}
            >
              {t.label}
            </Button>
          );
        })}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {/* ---------------- Checker ---------------- */}
      {tab === 0 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                {/* Soft-tinted icon-chip header */}
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      width: 42, height: 42, borderRadius: '13px', flexShrink: 0,
                      display: 'grid', placeItems: 'center',
                      background: BRAND.amberSoft, color: BRAND.amberDeep,
                      '& svg': { fontSize: 22 },
                    }}
                  >
                    <FactCheckRoundedIcon />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                      Check content
                    </Typography>
                    <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.2 }}>
                      Deterministic policy scans plus an AI brand-voice review.
                    </Typography>
                  </Box>
                </Stack>
                <SectionLabel>Your content</SectionLabel>
                <TextField
                  multiline
                  minRows={9}
                  fullWidth
                  placeholder="Paste your content here…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: '#fff', fontSize: 14.5 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: LINE } }}
                />
                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} alignItems="center">
                  <Button onClick={() => void runCheck()} disabled={running || !text.trim()} startIcon={running ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <FactCheckRoundedIcon />} sx={inkPillSx}>
                    {running ? 'Checking…' : 'Run check'}
                  </Button>
                  <Typography sx={{ color: SUBTLE, fontSize: 12.5 }}>
                    {policies.filter((p) => p.is_active).length} active policies
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                {!result ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', minHeight: 240, textAlign: 'center' }} spacing={1.5}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '14px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(14,17,22,0.05)', color: INK }}>
                      <ShieldRoundedIcon />
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: INK }}>No result yet</Typography>
                    <Typography sx={{ color: SUBTLE, fontSize: 13 }}>Run a check to see the brand-fit score and any violations.</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <SectionLabel sx={{ mb: 0 }}>Scan result</SectionLabel>
                    <Stack direction="row" spacing={2.5} alignItems="center" justifyContent="space-between">
                      <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
                        <Ring pct={result.score / 100} color={scoreColor(result.score)} size={120} stroke={8} />
                        <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                          <Typography sx={{ fontWeight: 800, fontSize: 28, color: INK, lineHeight: 1 }}>{result.score}</Typography>
                          <Typography sx={{ fontSize: 11, color: SUBTLE, fontWeight: 600 }}>/ 100</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 13 }}>Brand-fit</Typography>
                        <Chip
                          icon={result.passed ? <VerifiedRoundedIcon sx={{ fontSize: 16 }} /> : <WarningAmberRoundedIcon sx={{ fontSize: 16 }} />}
                          label={result.passed ? 'Passed' : 'Needs work'}
                          sx={{
                            mt: 0.75,
                            fontWeight: 700,
                            bgcolor: result.passed ? BRAND.tealSoft : BRAND.pinkSoft,
                            color: result.passed ? BRAND.tealDeep : BRAND.pink,
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      </Box>
                    </Stack>

                    <Divider sx={{ borderColor: LINE }} />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14 }}>
                        {(result.violations?.length ?? 0)} violation{(result.violations?.length ?? 0) === 1 ? '' : 's'}
                      </Typography>
                      <Button onClick={() => void applyFix()} disabled={fixing} startIcon={fixing ? <CircularProgress size={15} color="inherit" /> : <AutoFixHighRoundedIcon />} size="small" sx={softPillSx}>
                        {fixing ? 'Fixing…' : 'Apply fix'}
                      </Button>
                    </Stack>

                    <Stack spacing={1.25} sx={{ maxHeight: 320, overflowY: 'auto' }}>
                      {(result.violations || []).map((v, idx) => (
                        <Box key={idx} sx={{ p: 1.5, borderRadius: '14px', border: `1px solid ${LINE}`, bgcolor: '#fff' }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <SeverityChip severity={v.severity} />
                            <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: INK }}>{v.policy}</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 13, color: INK }}>{v.message}</Typography>
                          {v.suggestion && (
                            <Typography sx={{ mt: 0.5, fontSize: 12.5, color: BRAND.tealDeep, fontWeight: 600 }}>
                              Suggestion: {v.suggestion}
                            </Typography>
                          )}
                        </Box>
                      ))}
                      {(result.violations?.length ?? 0) === 0 && (
                        <Typography sx={{ color: SUBTLE, fontSize: 13 }}>No violations — this copy is on-brand.</Typography>
                      )}
                    </Stack>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ---------------- Policies ---------------- */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK }}>Policies</Typography>
            <Button onClick={() => void createPolicy()} startIcon={<RuleRoundedIcon />} sx={inkBtnSx}>
              New policy
            </Button>
          </Stack>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress sx={{ color: INK }} />
            </Stack>
          ) : policies.length === 0 ? (
            <Card sx={cardSx}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ color: SUBTLE }}>No policies yet. Create one to start enforcing your brand voice.</Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2.5}>
              {policies.map((p) => (
                <Grid key={p.id} size={{ xs: 12, md: 6 }}>
                  <Card sx={cardSx}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>{p.name}</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                            <Box sx={{ px: 1, py: 0.3, borderRadius: '999px', bgcolor: 'rgba(14,17,22,0.05)', color: INK, fontWeight: 700, fontSize: 11.5, textTransform: 'capitalize' }}>
                              {p.kind}
                            </Box>
                            <SeverityChip severity={p.severity} />
                          </Stack>
                        </Box>
                        <Switch
                          checked={p.is_active}
                          onChange={() => void togglePolicy(p)}
                          sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: BRAND.tealDeep }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: BRAND.teal } }}
                        />
                      </Stack>
                      {p.config && (
                        <Typography sx={{ mt: 1.5, color: SUBTLE, fontSize: 12.5 }}>
                          {(((p.config.banned_words as string[]) || []).length)} banned terms ·{' '}
                          {(((p.config.required_disclaimers as string[]) || []).length)} disclaimers
                          {p.config.reading_level ? ` · grade ≤ ${String(p.config.reading_level)}` : ''}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ---------------- History ---------------- */}
      {tab === 2 && (
        <Box>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress sx={{ color: INK }} />
            </Stack>
          ) : checks.length === 0 ? (
            <Card sx={cardSx}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ color: SUBTLE }}>No checks yet. Run a check from the Checker tab.</Typography>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={1.5}>
              {checks.map((c) => (
                <Card key={c.id} sx={cardSx}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: scoreColor(c.score) + '22', color: scoreColor(c.score), fontWeight: 800, flexShrink: 0 }}>
                          {c.score}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontWeight: 600, color: INK, fontSize: 14, maxWidth: 480 }}>
                            {c.content_text.slice(0, 120)}
                          </Typography>
                          <Typography sx={{ color: SUBTLE, fontSize: 12 }}>
                            {new Date(c.created_at).toLocaleString()} · {(c.violations?.length ?? 0)} violations
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip
                        label={c.passed ? 'Passed' : 'Failed'}
                        size="small"
                        sx={{ fontWeight: 700, bgcolor: c.passed ? BRAND.tealSoft : BRAND.pinkSoft, color: c.passed ? BRAND.tealDeep : BRAND.pink }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ---------------- Overview ---------------- */}
      {tab === 3 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK, mb: 2 }}>Compliance summary</Typography>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: SUBTLE }}>Pass rate</Typography>
                    <Typography sx={{ fontWeight: 700, color: INK }}>{overview?.pass_rate ?? 0}%</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: SUBTLE }}>Checks run</Typography>
                    <Typography sx={{ fontWeight: 700, color: INK }}>{overview?.checks_run ?? 0}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: SUBTLE }}>Average brand-fit</Typography>
                    <Typography sx={{ fontWeight: 700, color: INK }}>{overview?.avg_brand_fit ?? 0} / 100</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: SUBTLE }}>Active policies</Typography>
                    <Typography sx={{ fontWeight: 700, color: INK }}>{overview?.active_policies ?? 0}</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK, mb: 2 }}>Top violations</Typography>
                {(overview?.top_violations?.length ?? 0) === 0 ? (
                  <Typography sx={{ color: SUBTLE }}>No violations recorded yet.</Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {overview!.top_violations.map((v, i) => (
                      <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: '12px', border: `1px solid ${LINE}` }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <SeverityChip severity={v.severity} />
                          <Typography sx={{ fontWeight: 600, color: INK, fontSize: 13.5 }}>{v.policy}</Typography>
                        </Stack>
                        <Typography sx={{ fontWeight: 800, color: INK }}>{v.count}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} message={toast || ''} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
