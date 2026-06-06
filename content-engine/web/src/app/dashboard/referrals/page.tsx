'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  FieldGrid,
  FullSpan,
  AiAssist,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

const AMBER = '#FFAF06';
const TEAL = '#14BB87';

type TabKey = 'programs' | 'advocates' | 'conversions' | 'overview' | 'viral' | 'rewards' | 'fraud';

type Program = {
  id: string;
  name: string;
  type: string;
  reward_type: string;
  reward_value: number;
  status: string;
  description: string | null;
  created_at: string;
};

type Advocate = {
  id: string;
  program_id: string;
  name: string;
  email: string | null;
  code: string;
  clicks: number;
  signups: number;
  conversions: number;
  earnings: number;
  status: string;
};

type Conversion = {
  id: string;
  advocate_id: string;
  referred_email: string | null;
  value: number;
  reward: number;
  status: string;
  occurred_at: string;
};

type Overview = {
  active_advocates: number;
  active_programs: number;
  conversions: number;
  pending_conversions: number;
  revenue_referred: number;
  payouts_due: number;
};

type Design = {
  name?: string;
  type?: string;
  reward_type?: string;
  reward_value?: number;
  messaging?: { headline?: string; subhead?: string };
  share_copy?: string[];
  rationale?: string;
};

type ViralMetrics = {
  k_factor: number;
  viral_cycle_time_hours: number | null;
  funnel: { clicks: number; signups: number; conversions: number };
  time_series: { date: string; conversions: number; value: number }[];
  advocate_count: number;
  low_data: boolean;
};

type RewardTier = {
  id: string;
  program_id: string;
  name: string;
  milestone: number;
  reward_type: string;
  reward_value: number;
  status: string;
  description: string | null;
  created_at: string;
};

type AdvocateRewardItem = {
  id: string;
  advocate_id: string;
  tier_id: string | null;
  reward_type: string;
  reward_value: number;
  status: string;
  note: string | null;
  created_at: string;
};

type FraudFlagItem = {
  id: string;
  advocate_id: string | null;
  conversion_id: string | null;
  flag_type: string;
  risk_score: number;
  details: Record<string, unknown> | null;
  resolved: boolean;
  resolved_by: string | null;
  created_at: string;
};

type LeaderboardEntry = {
  id: string;
  name: string;
  code: string;
  conversions: number;
  earnings: number;
  conversion_rate: number;
  fraud_score: number;
  total_value: number;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'programs', label: 'Programs' },
  { key: 'advocates', label: 'Advocates' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'overview', label: 'Overview' },
  { key: 'viral', label: 'Viral metrics' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'fraud', label: 'Fraud' },
];

const PROGRAM_TYPES = ['referral', 'affiliate', 'loyalty'];
const REWARD_TYPES = ['cash', 'credit', 'points', 'discount'];

function statusChip(status: string): { bg: string; color: string } {
  switch (status) {
    case 'active':
    case 'approved':
    case 'paid':
      return { bg: BRAND.tealSoft, color: BRAND.tealDeep };
    case 'paused':
    case 'pending':
      return { bg: BRAND.amberSoft, color: BRAND.amberDeep };
    default:
      return { bg: 'rgba(14,17,22,0.05)', color: INK };
  }
}

function rewardStatusChip(status: string): { bg: string; color: string } {
  switch (status) {
    case 'paid':
      return { bg: 'rgba(14,17,22,0.07)', color: INK };
    case 'approved':
      return { bg: BRAND.tealSoft, color: BRAND.tealDeep };
    case 'pending':
    default:
      return { bg: BRAND.amberSoft, color: BRAND.amberDeep };
  }
}

function nextRewardStatus(status: string): { next: string; label: string } | null {
  if (status === 'pending') return { next: 'approved', label: 'Approve' };
  if (status === 'approved') return { next: 'paid', label: 'Mark paid' };
  return null;
}

function money(n: number): string {
  return `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function riskChip(score: number): { bg: string; color: string } {
  if (score > 0.7) return { bg: BRAND.pinkSoft, color: BRAND.pink };
  if (score > 0.4) return { bg: BRAND.amberSoft, color: BRAND.amberDeep };
  return { bg: BRAND.tealSoft, color: BRAND.tealDeep };
}

function shortDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function summarizeDetails(details: Record<string, unknown> | null): string {
  if (!details) return '—';
  const entries = Object.entries(details);
  if (entries.length === 0) return '—';
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

function Card({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: `1px solid ${LINE}`,
        borderRadius: CARD_RADIUS,
        boxShadow: CARD_SHADOW,
        p: 2.5,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Card sx={{ flex: 1, minWidth: 180 }}>
      <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 13 }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, fontWeight: 800, fontSize: 30, color: accent, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
    </Card>
  );
}

export default function ReferralsPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<TabKey>('overview');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [progOpen, setProgOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [designing, setDesigning] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);
  const [progForm, setProgForm] = useState({
    name: '',
    type: 'referral',
    reward_type: 'cash',
    reward_value: 25,
    brief: '',
  });

  const [advOpen, setAdvOpen] = useState(false);
  const [advForm, setAdvForm] = useState({ program_id: '', name: '', email: '' });

  const [viral, setViral] = useState<ViralMetrics | null>(null);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [fraudFlags, setFraudFlags] = useState<FraudFlagItem[]>([]);
  const [extLeaderboard, setExtLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tierOpen, setTierOpen] = useState(false);
  const [tierForm, setTierForm] = useState({
    program_id: '',
    name: '',
    milestone: 5,
    reward_type: 'cash',
    reward_value: 50,
  });
  const [scanning, setScanning] = useState(false);

  const [rewardLedgers, setRewardLedgers] = useState<Record<string, AdvocateRewardItem[]>>({});
  const [computingRewards, setComputingRewards] = useState<string | null>(null);
  const [rewardBusy, setRewardBusy] = useState<string | null>(null);
  const [outreachBusy, setOutreachBusy] = useState<string | null>(null);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [outreachResult, setOutreachResult] = useState<Record<string, unknown> | null>(null);
  const [outreachName, setOutreachName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, progs, leaders, convs, vm, tiers, flags, extLb] = await Promise.all([
        api<Overview>('/referrals/overview', { workspace: true }),
        api<Program[]>('/referrals/programs', { workspace: true }),
        api<Advocate[]>('/referrals/leaderboard', { workspace: true }),
        api<Conversion[]>('/referrals/conversions', { workspace: true }),
        api<ViralMetrics>('/referrals/viral-metrics', { workspace: true }).catch(() => null),
        api<RewardTier[]>('/referrals/reward-tiers', { workspace: true }).catch(() => []),
        api<FraudFlagItem[]>('/referrals/fraud/flags?resolved=false', { workspace: true }).catch(() => []),
        api<LeaderboardEntry[]>('/referrals/leaderboard/extended', { workspace: true }).catch(() => []),
      ]);
      setOverview(ov);
      setPrograms(progs);
      setAdvocates(leaders);
      setConversions(convs);
      setViral(vm);
      setRewardTiers(tiers);
      setFraudFlags(flags);
      setExtLeaderboard(extLb);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const advocateName = useMemo(() => {
    const m: Record<string, string> = {};
    advocates.forEach((a) => (m[a.id] = a.code));
    return m;
  }, [advocates]);

  const programName = useMemo(() => {
    const m: Record<string, string> = {};
    programs.forEach((p) => (m[p.id] = p.name));
    return m;
  }, [programs]);

  async function runDesign() {
    if (!progForm.brief.trim()) {
      setError('Add a brief for the AI to design a program');
      return;
    }
    setDesigning(true);
    setError(null);
    try {
      const res = await api<{ design: Design }>('/referrals/programs/design', {
        method: 'POST',
        body: { brief: progForm.brief.trim(), save: false },
        workspace: true,
      });
      setDesign(res.design);
      setProgForm((f) => ({
        ...f,
        name: res.design.name || f.name,
        type: PROGRAM_TYPES.includes(res.design.type || '') ? (res.design.type as string) : f.type,
        reward_type: REWARD_TYPES.includes(res.design.reward_type || '')
          ? (res.design.reward_type as string)
          : f.reward_type,
        reward_value: Number(res.design.reward_value ?? f.reward_value),
      }));
      setToast('AI program design ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI design failed');
    } finally {
      setDesigning(false);
    }
  }

  async function createProgram() {
    if (!progForm.name.trim()) {
      setError('Program name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api('/referrals/programs', {
        method: 'POST',
        body: {
          name: progForm.name.trim(),
          type: progForm.type,
          reward_type: progForm.reward_type,
          reward_value: Number(progForm.reward_value) || 0,
          status: 'active',
        },
        workspace: true,
      });
      setProgOpen(false);
      setDesign(null);
      setProgForm({ name: '', type: 'referral', reward_type: 'cash', reward_value: 25, brief: '' });
      setToast('Program created');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create program');
    } finally {
      setSaving(false);
    }
  }

  async function createAdvocate() {
    if (!advForm.program_id || !advForm.name.trim()) {
      setError('Pick a program and enter an advocate name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api('/referrals/advocates', {
        method: 'POST',
        body: {
          program_id: advForm.program_id,
          name: advForm.name.trim(),
          email: advForm.email.trim() || null,
          status: 'active',
        },
        workspace: true,
      });
      setAdvOpen(false);
      setAdvForm({ program_id: '', name: '', email: '' });
      setToast('Advocate added');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add advocate');
    } finally {
      setSaving(false);
    }
  }

  async function approve(c: Conversion) {
    try {
      await api(`/referrals/conversions/${c.id}/approve`, { method: 'POST', workspace: true });
      setToast('Conversion approved');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    }
  }

  async function createTier() {
    if (!tierForm.program_id || !tierForm.name.trim()) {
      setError('Pick a program and enter a tier name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api('/referrals/reward-tiers', {
        method: 'POST',
        body: {
          program_id: tierForm.program_id,
          name: tierForm.name.trim(),
          milestone: Number(tierForm.milestone) || 0,
          reward_type: tierForm.reward_type,
          reward_value: Number(tierForm.reward_value) || 0,
        },
        workspace: true,
      });
      setTierOpen(false);
      setTierForm({ program_id: '', name: '', milestone: 5, reward_type: 'cash', reward_value: 50 });
      setToast('Reward tier created');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create reward tier');
    } finally {
      setSaving(false);
    }
  }

  async function runFraudScan() {
    setScanning(true);
    setError(null);
    try {
      const res = await api<{ flags_created?: number; scanned?: number }>('/referrals/fraud/scan', {
        method: 'POST',
        workspace: true,
      });
      const created = res?.flags_created ?? 0;
      setToast(`Fraud scan complete — ${created} new flag${created === 1 ? '' : 's'}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fraud scan failed');
    } finally {
      setScanning(false);
    }
  }

  async function resolveFlag(flag: FraudFlagItem) {
    try {
      await api(`/referrals/fraud/flags/${flag.id}/resolve`, {
        method: 'POST',
        body: { resolved_by: 'admin' },
        workspace: true,
      });
      setToast('Fraud flag resolved');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve flag');
    }
  }

  async function computeRewards(advocateId: string) {
    setComputingRewards(advocateId);
    setError(null);
    try {
      await api('/referrals/advocates/' + advocateId + '/compute-rewards', { method: 'POST', workspace: true });
      const rewards = await api<AdvocateRewardItem[]>(
        '/referrals/advocates/' + advocateId + '/rewards',
        { workspace: true },
      );
      setRewardLedgers((m) => ({ ...m, [advocateId]: rewards }));
      setToast('Rewards computed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compute rewards');
    } finally {
      setComputingRewards(null);
    }
  }

  async function changeRewardStatus(reward: AdvocateRewardItem, status: string) {
    setRewardBusy(reward.id);
    setError(null);
    try {
      const updated = await api<AdvocateRewardItem>(`/referrals/rewards/${reward.id}/status`, {
        method: 'PATCH',
        body: { status },
        workspace: true,
      });
      setRewardLedgers((m) => ({
        ...m,
        [reward.advocate_id]: (m[reward.advocate_id] || []).map((r) => (r.id === updated.id ? updated : r)),
      }));
      setToast(`Reward marked ${status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update reward');
    } finally {
      setRewardBusy(null);
    }
  }

  async function runOutreach(advocate: Advocate) {
    setOutreachBusy(advocate.id);
    setError(null);
    try {
      const res = await api<Record<string, unknown>>(
        '/referrals/advocates/' + advocate.id + '/outreach',
        { method: 'POST', workspace: true },
      );
      setOutreachResult(res);
      setOutreachName(advocate.name);
      setOutreachOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate outreach');
    } finally {
      setOutreachBusy(null);
    }
  }

  async function runAgent() {
    setBusy(true);
    setError(null);
    try {
      await api('/referrals/agent/run', { method: 'POST', workspace: true });
      setToast('Referrals agent completed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Referrals agent failed');
    } finally {
      setBusy(false);
    }
  }

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info">Select a workspace to manage referral programs.</Alert>
      </Box>
    );
  }

  const funnelData = viral
    ? [
        { name: 'Clicks', value: viral.funnel.clicks, fill: INK },
        { name: 'Signups', value: viral.funnel.signups, fill: AMBER },
        { name: 'Conversions', value: viral.funnel.conversions, fill: TEAL },
      ]
    : [];

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
            sx={{ fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12, fontSize: { xs: 28, md: 38 }, color: INK }}
          >
            Referrals &amp;{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 800,
              }}
            >
              loyalty
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Turn customers into advocates — referral, affiliate and loyalty programs in one place.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<BoltIcon />}
            disabled={busy}
            onClick={runAgent}
            sx={{
              px: 2.5, py: 1.1, borderRadius: '999px', fontWeight: 700, textTransform: 'none',
              color: INK, background: '#fff', backgroundImage: 'none', border: `1px solid ${LINE}`,
              '&:hover': { background: BRAND.amberSoft, borderColor: BRAND.amber },
            }}
          >
            Run agent
          </Button>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setAdvOpen(true)}
            variant="outlined"
            sx={{ px: 2.25, py: 1.1, borderRadius: '999px', fontWeight: 700, textTransform: 'none', borderColor: LINE, color: INK }}
          >
            New advocate
          </Button>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setProgOpen(true)}
            sx={{
              px: 2.5,
              py: 1.25,
              borderRadius: '999px',
              fontWeight: 700,
              textTransform: 'none',
              color: '#fff',
              background: INK,
              backgroundImage: 'none',
              boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
              '&:hover': { background: '#1B2330' },
            }}
          >
            New program
          </Button>
        </Stack>
      </Stack>

      {/* Pill tabs */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, px: 0.5 }} flexWrap="wrap" rowGap={1}>
        {TABS.map((t) => (
          <Button
            key={t.key}
            disableRipple
            onClick={() => setTab(t.key)}
            sx={{
              px: 2.25,
              py: 0.85,
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: 13.5,
              textTransform: 'none',
              color: tab === t.key ? '#fff' : 'text.secondary',
              bgcolor: tab === t.key ? INK : 'transparent',
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPI cards (always visible) */}
          <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2} sx={{ mb: 2.5 }}>
            <Kpi label="Active advocates" value={String(overview?.active_advocates ?? 0)} accent={INK} />
            <Kpi label="Conversions" value={String(overview?.conversions ?? 0)} accent={BRAND.tealDeep} />
            <Kpi label="Revenue referred" value={money(overview?.revenue_referred ?? 0)} accent={BRAND.amberDeep} />
            <Kpi label="Payouts due" value={money(overview?.payouts_due ?? 0)} accent={BRAND.pink} />
          </Stack>

          {/* Overview tab */}
          {tab === 'overview' && (
            <Card>
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK, mb: 1.5 }}>Advocate leaderboard</Typography>
              {extLeaderboard.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Rank</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Advocate</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Code</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Conversions</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Conv. rate</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Earnings</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Total value</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Risk</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {extLeaderboard.map((a, i) => {
                      const rc = riskChip(a.fraud_score);
                      return (
                        <TableRow key={a.id}>
                          <TableCell sx={{ fontWeight: 800, color: INK }}>{i + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: INK }}>{a.name}</TableCell>
                          <TableCell>
                            <Chip label={a.code} size="small" sx={{ fontWeight: 700, bgcolor: 'rgba(14,17,22,0.05)', color: INK }} />
                          </TableCell>
                          <TableCell align="right" sx={{ color: INK, fontWeight: 600 }}>{a.conversions}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{(a.conversion_rate * 100).toFixed(1)}%</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: BRAND.tealDeep }}>{money(a.earnings)}</TableCell>
                          <TableCell align="right" sx={{ color: INK, fontWeight: 600 }}>{money(a.total_value)}</TableCell>
                          <TableCell>
                            <Chip
                              label={a.fraud_score.toFixed(2)}
                              size="small"
                              sx={{ fontWeight: 700, bgcolor: rc.bg, color: rc.color }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : advocates.length === 0 ? (
                <Typography sx={{ color: SUBTLE, py: 2 }}>No advocates yet. Add one to start tracking referrals.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Advocate</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Code</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">
                        Clicks &rarr; Signups &rarr; Conversions
                      </TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">
                        Earnings
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {advocates.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell sx={{ fontWeight: 700, color: INK }}>{a.name}</TableCell>
                        <TableCell>
                          <Chip label={a.code} size="small" sx={{ fontWeight: 700, bgcolor: 'rgba(14,17,22,0.05)', color: INK }} />
                        </TableCell>
                        <TableCell align="right" sx={{ color: INK, fontWeight: 600 }}>
                          {a.clicks} &rarr; {a.signups} &rarr; {a.conversions}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: BRAND.tealDeep }}>
                          {money(a.earnings)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}

          {/* Programs tab */}
          {tab === 'programs' && (
            <Stack spacing={2}>
              {programs.length === 0 ? (
                <Card>
                  <Typography sx={{ color: SUBTLE }}>No programs yet. Create one to get started.</Typography>
                </Card>
              ) : (
                programs.map((p) => {
                  const sc = statusChip(p.status);
                  return (
                    <Card key={p.id}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1}>
                        <Box>
                          <Typography sx={{ fontWeight: 800, fontSize: 17, color: INK }}>{p.name}</Typography>
                          <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.25 }}>
                            {p.type} · {p.reward_type} reward ·{' '}
                            {p.reward_type === 'discount' ? `${p.reward_value}%` : money(p.reward_value)}
                          </Typography>
                          {p.description && (
                            <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.5 }}>{p.description}</Typography>
                          )}
                        </Box>
                        <Chip label={p.status} sx={{ fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
                      </Stack>
                    </Card>
                  );
                })
              )}
            </Stack>
          )}

          {/* Advocates tab */}
          {tab === 'advocates' && (
            <Card>
              {advocates.length === 0 ? (
                <Typography sx={{ color: SUBTLE, py: 2 }}>No advocates yet.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Advocate</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Code</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Clicks</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Signups</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Conversions</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Earnings</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {advocates.map((a) => {
                      const sc = statusChip(a.status);
                      return (
                        <TableRow key={a.id}>
                          <TableCell sx={{ fontWeight: 700, color: INK }}>
                            {a.name}
                            {a.email && <Typography sx={{ color: SUBTLE, fontSize: 12 }}>{a.email}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip label={a.code} size="small" sx={{ fontWeight: 700, bgcolor: 'rgba(14,17,22,0.05)', color: INK }} />
                          </TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{a.clicks}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{a.signups}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{a.conversions}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: BRAND.tealDeep }}>{money(a.earnings)}</TableCell>
                          <TableCell>
                            <Chip label={a.status} size="small" sx={{ fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              disabled={outreachBusy === a.id}
                              onClick={() => runOutreach(a)}
                              startIcon={outreachBusy === a.id ? <CircularProgress size={14} color="inherit" /> : undefined}
                              sx={{
                                borderRadius: '999px',
                                textTransform: 'none',
                                fontWeight: 700,
                                color: INK,
                                border: `1px solid ${LINE}`,
                                '&:hover': { bgcolor: 'rgba(14,17,22,0.05)' },
                              }}
                            >
                              Outreach
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}

          {/* Conversions tab */}
          {tab === 'conversions' && (
            <Card>
              {conversions.length === 0 ? (
                <Typography sx={{ color: SUBTLE, py: 2 }}>No conversions recorded yet.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Referred</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Advocate code</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Value</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Reward</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conversions.map((c) => {
                      const sc = statusChip(c.status);
                      return (
                        <TableRow key={c.id}>
                          <TableCell sx={{ color: INK }}>{c.referred_email || '—'}</TableCell>
                          <TableCell sx={{ color: INK }}>{advocateName[c.advocate_id] || '—'}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{money(c.value)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: BRAND.amberDeep }}>{money(c.reward)}</TableCell>
                          <TableCell>
                            <Chip label={c.status} size="small" sx={{ fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
                          </TableCell>
                          <TableCell align="right">
                            {c.status === 'pending' ? (
                              <Button
                                size="small"
                                onClick={() => approve(c)}
                                sx={{
                                  borderRadius: '999px',
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  color: '#fff',
                                  background: INK,
                                  backgroundImage: 'none',
                                  '&:hover': { background: '#1B2330' },
                                }}
                              >
                                Approve
                              </Button>
                            ) : (
                              <Typography sx={{ color: SUBTLE, fontSize: 12 }}>—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}

          {/* Viral metrics tab */}
          {tab === 'viral' && (
            <Stack spacing={2.5}>
              {!viral ? (
                <Card>
                  <Typography sx={{ color: SUBTLE, py: 2 }}>Viral metrics are not available yet.</Typography>
                </Card>
              ) : (
                <>
                  <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2}>
                    <Kpi label="K-factor" value={viral.k_factor.toFixed(2)} accent={BRAND.tealDeep} />
                    <Kpi
                      label="Viral cycle time"
                      value={viral.viral_cycle_time_hours == null ? '—' : `${Math.round(viral.viral_cycle_time_hours)}h`}
                      accent={BRAND.amberDeep}
                    />
                    <Kpi label="Advocate count" value={String(viral.advocate_count)} accent={INK} />
                  </Stack>

                  {viral.low_data && (
                    <Alert severity="info" sx={{ borderRadius: 3 }}>
                      Limited data available. Metrics will become more accurate as referral activity grows.
                    </Alert>
                  )}

                  <Card>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK, mb: 1.5 }}>Conversion funnel</Typography>
                    <Box sx={{ width: '100%', height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={funnelData} layout="vertical" margin={{ left: 24, right: 24 }}>
                          <XAxis type="number" tick={{ fill: SUBTLE, fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fill: INK, fontSize: 13, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            width={90}
                          />
                          <Tooltip cursor={{ fill: 'rgba(14,17,22,0.04)' }} />
                          <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                            {funnelData.map((d) => (
                              <Cell key={d.name} fill={d.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Card>

                  <Card>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK, mb: 1.5 }}>Conversions over time</Typography>
                    {viral.time_series.length === 0 ? (
                      <Typography sx={{ color: SUBTLE, py: 2 }}>No time series data yet.</Typography>
                    ) : (
                      <Box sx={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={viral.time_series} margin={{ left: 8, right: 8, top: 8 }}>
                            <XAxis
                              dataKey="date"
                              tickFormatter={shortDate}
                              tick={{ fill: SUBTLE, fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fill: SUBTLE, fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip labelFormatter={(v) => shortDate(String(v))} />
                            <Area
                              type="monotone"
                              dataKey="conversions"
                              stroke={TEAL}
                              strokeWidth={2}
                              fill={TEAL}
                              fillOpacity={0.15}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                  </Card>
                </>
              )}
            </Stack>
          )}

          {/* Rewards tab */}
          {tab === 'rewards' && (
            <Stack spacing={2.5}>
            <Card>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" rowGap={1}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK }}>Reward tiers</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setTierOpen(true)}
                  sx={{
                    px: 2.25,
                    py: 1,
                    borderRadius: '999px',
                    fontWeight: 700,
                    textTransform: 'none',
                    color: '#fff',
                    background: INK,
                    backgroundImage: 'none',
                    '&:hover': { background: '#1B2330' },
                  }}
                >
                  New reward tier
                </Button>
              </Stack>
              {rewardTiers.length === 0 ? (
                <Typography sx={{ color: SUBTLE, py: 2 }}>No reward tiers yet. Create one to reward milestones.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Program</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Milestone</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Reward</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rewardTiers.map((t) => {
                      const sc = statusChip(t.status);
                      return (
                        <TableRow key={t.id}>
                          <TableCell sx={{ fontWeight: 700, color: INK }}>{t.name}</TableCell>
                          <TableCell sx={{ color: INK }}>{programName[t.program_id] || '—'}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{t.milestone}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: BRAND.amberDeep }}>
                            {t.reward_type === 'discount' ? `${t.reward_value}%` : money(t.reward_value)}
                          </TableCell>
                          <TableCell>
                            <Chip label={t.status} size="small" sx={{ fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Card>
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK, mb: 0.5 }}>Advocate reward ledger</Typography>
              <Typography sx={{ color: SUBTLE, fontSize: 13, mb: 1.5 }}>
                Compute milestone rewards per advocate, then approve and mark them paid.
              </Typography>
              {advocates.length === 0 ? (
                <Typography sx={{ color: SUBTLE, py: 2 }}>No advocates yet.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {advocates.map((a) => {
                    const ledger = rewardLedgers[a.id];
                    return (
                      <Box key={a.id} sx={{ border: `1px solid ${LINE}`, borderRadius: '16px', p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1}>
                          <Box>
                            <Typography sx={{ fontWeight: 700, color: INK }}>{a.name}</Typography>
                            <Typography sx={{ color: SUBTLE, fontSize: 12.5 }}>
                              {a.conversions} conversions · {money(a.earnings)} earned
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            disabled={computingRewards === a.id}
                            onClick={() => computeRewards(a.id)}
                            startIcon={computingRewards === a.id ? <CircularProgress size={14} color="inherit" /> : undefined}
                            sx={{
                              borderRadius: '999px',
                              textTransform: 'none',
                              fontWeight: 700,
                              color: '#fff',
                              background: INK,
                              backgroundImage: 'none',
                              '&:hover': { background: '#1B2330' },
                            }}
                          >
                            Compute rewards
                          </Button>
                        </Stack>
                        {ledger && (
                          ledger.length === 0 ? (
                            <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 1.5 }}>
                              No rewards for this advocate yet.
                            </Typography>
                          ) : (
                            <Table size="small" sx={{ mt: 1.5 }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Reward type</TableCell>
                                  <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Value</TableCell>
                                  <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Status</TableCell>
                                  <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Created</TableCell>
                                  <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Action</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {ledger.map((r) => {
                                  const rc = rewardStatusChip(r.status);
                                  const next = nextRewardStatus(r.status);
                                  return (
                                    <TableRow key={r.id}>
                                      <TableCell sx={{ color: INK, fontWeight: 600 }}>{r.reward_type}</TableCell>
                                      <TableCell align="right" sx={{ fontWeight: 700, color: BRAND.amberDeep }}>
                                        {r.reward_type === 'discount' ? `${r.reward_value}%` : money(r.reward_value)}
                                      </TableCell>
                                      <TableCell>
                                        <Chip label={r.status} size="small" sx={{ fontWeight: 700, bgcolor: rc.bg, color: rc.color }} />
                                      </TableCell>
                                      <TableCell sx={{ color: INK }}>{shortDate(r.created_at)}</TableCell>
                                      <TableCell align="right">
                                        {next ? (
                                          <Button
                                            size="small"
                                            disabled={rewardBusy === r.id}
                                            onClick={() => changeRewardStatus(r, next.next)}
                                            startIcon={rewardBusy === r.id ? <CircularProgress size={14} color="inherit" /> : undefined}
                                            sx={{
                                              borderRadius: '999px',
                                              textTransform: 'none',
                                              fontWeight: 700,
                                              color: INK,
                                              border: `1px solid ${LINE}`,
                                              '&:hover': { bgcolor: 'rgba(14,17,22,0.05)' },
                                            }}
                                          >
                                            {next.label}
                                          </Button>
                                        ) : (
                                          <Typography sx={{ color: SUBTLE, fontSize: 12 }}>—</Typography>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Card>
            </Stack>
          )}

          {/* Fraud tab */}
          {tab === 'fraud' && (
            <Card>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" rowGap={1}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK }}>Fraud flags</Typography>
                <Button
                  onClick={runFraudScan}
                  disabled={scanning}
                  startIcon={scanning ? <CircularProgress size={15} color="inherit" /> : undefined}
                  sx={{
                    px: 2.25,
                    py: 1,
                    borderRadius: '999px',
                    fontWeight: 700,
                    textTransform: 'none',
                    color: '#fff',
                    background: INK,
                    backgroundImage: 'none',
                    '&:hover': { background: '#1B2330' },
                  }}
                >
                  {scanning ? 'Scanning…' : 'Run fraud scan'}
                </Button>
              </Stack>
              {fraudFlags.length === 0 ? (
                <Typography sx={{ color: SUBTLE, py: 2 }}>No unresolved fraud flags. Run a scan to check for suspicious activity.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Flag type</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Risk score</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Details</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Created</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }} align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fraudFlags.map((f) => {
                      const rc = riskChip(f.risk_score);
                      return (
                        <TableRow key={f.id}>
                          <TableCell sx={{ fontWeight: 700, color: INK }}>{f.flag_type}</TableCell>
                          <TableCell>
                            <Chip
                              label={f.risk_score.toFixed(2)}
                              size="small"
                              sx={{ fontWeight: 700, bgcolor: rc.bg, color: rc.color }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: SUBTLE, fontSize: 12.5, maxWidth: 320 }}>{summarizeDetails(f.details)}</TableCell>
                          <TableCell sx={{ color: INK }}>{shortDate(f.created_at)}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => resolveFlag(f)}
                              sx={{
                                borderRadius: '999px',
                                textTransform: 'none',
                                fontWeight: 700,
                                color: INK,
                                border: `1px solid ${LINE}`,
                                '&:hover': { bgcolor: 'rgba(14,17,22,0.05)' },
                              }}
                            >
                              Resolve
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}
        </>
      )}

      {/* New program dialog */}
      <PremiumDialog open={progOpen} onClose={() => setProgOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<CardGiftcardRoundedIcon />}
          title="New program"
          subtitle="Describe the goal and let AI design a referral program"
          onClose={() => setProgOpen(false)}
        />
        <DialogBody>
          <Stack spacing={2.25}>
            <Box>
              <SectionLabel>Design with AI</SectionLabel>
              <AiAssist
                brief={progForm.brief}
                setBrief={(v) => setProgForm((f) => ({ ...f, brief: v }))}
                loading={designing}
                onGenerate={runDesign}
                label="What's the program for? Describe the audience, reward and outcome you want."
                placeholder="e.g. Reward existing customers with cash for referring new paid signups"
                buttonText="AI design program"
              />
              {design && (
                <Box sx={{ mt: 1.5, p: 2, borderRadius: '16px', border: `1px solid ${LINE}`, bgcolor: 'rgba(14,17,22,0.025)' }}>
                  {design.messaging?.headline && (
                    <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13 }}>{design.messaging.headline}</Typography>
                  )}
                  {design.rationale && <Typography sx={{ color: SUBTLE, fontSize: 12.5, mt: 0.5 }}>{design.rationale}</Typography>}
                  {Array.isArray(design.share_copy) && design.share_copy.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {design.share_copy.slice(0, 3).map((s, i) => (
                        <Typography key={i} sx={{ color: INK, fontSize: 12.5, fontStyle: 'italic' }}>
                          &ldquo;{s}&rdquo;
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            </Box>

            <Box>
              <SectionLabel>Program details</SectionLabel>
              <FieldGrid>
                <FullSpan>
                  <TextField
                    label="Program name"
                    value={progForm.name}
                    onChange={(e) => setProgForm((f) => ({ ...f, name: e.target.value }))}
                    fullWidth
                    size="small"
                  />
                </FullSpan>
                <TextField
                  select
                  label="Type"
                  value={progForm.type}
                  onChange={(e) => setProgForm((f) => ({ ...f, type: e.target.value }))}
                  fullWidth
                  size="small"
                >
                  {PROGRAM_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Reward type"
                  value={progForm.reward_type}
                  onChange={(e) => setProgForm((f) => ({ ...f, reward_type: e.target.value }))}
                  fullWidth
                  size="small"
                >
                  {REWARD_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
                <FullSpan>
                  <TextField
                    label="Reward value"
                    type="number"
                    value={progForm.reward_value}
                    onChange={(e) => setProgForm((f) => ({ ...f, reward_value: Number(e.target.value) }))}
                    fullWidth
                    size="small"
                  />
                </FullSpan>
              </FieldGrid>
            </Box>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setProgOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={createProgram}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            {saving ? 'Saving…' : 'Create program'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* New advocate dialog */}
      <PremiumDialog open={advOpen} onClose={() => setAdvOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<GroupsRoundedIcon />}
          title="New advocate"
          subtitle="Add a referrer to a program"
          onClose={() => setAdvOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <SectionLabel>Advocate details</SectionLabel>
          <Stack spacing={1.75}>
            <TextField
              select
              label="Program"
              value={advForm.program_id}
              onChange={(e) => setAdvForm((f) => ({ ...f, program_id: e.target.value }))}
              fullWidth
              size="small"
            >
              {programs.length === 0 ? (
                <MenuItem value="" disabled>
                  Create a program first
                </MenuItem>
              ) : (
                programs.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              label="Name"
              value={advForm.name}
              onChange={(e) => setAdvForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Email (optional)"
              value={advForm.email}
              onChange={(e) => setAdvForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setAdvOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={createAdvocate}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            {saving ? 'Saving…' : 'Add advocate'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* New reward tier dialog */}
      <PremiumDialog open={tierOpen} onClose={() => setTierOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<CardGiftcardRoundedIcon />}
          title="New reward tier"
          subtitle="Reward advocates when they hit a milestone"
          onClose={() => setTierOpen(false)}
          tint={BRAND.amberDeep}
          tintSoft={BRAND.amberSoft}
        />
        <DialogBody>
          <SectionLabel>Tier details</SectionLabel>
          <Stack spacing={1.75}>
            <TextField
              select
              label="Program"
              value={tierForm.program_id}
              onChange={(e) => setTierForm((f) => ({ ...f, program_id: e.target.value }))}
              fullWidth
              size="small"
            >
              {programs.length === 0 ? (
                <MenuItem value="" disabled>
                  Create a program first
                </MenuItem>
              ) : (
                programs.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              label="Name"
              value={tierForm.name}
              onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Milestone (conversions)"
              type="number"
              value={tierForm.milestone}
              onChange={(e) => setTierForm((f) => ({ ...f, milestone: Number(e.target.value) }))}
              fullWidth
              size="small"
            />
            <TextField
              select
              label="Reward type"
              value={tierForm.reward_type}
              onChange={(e) => setTierForm((f) => ({ ...f, reward_type: e.target.value }))}
              fullWidth
              size="small"
            >
              {REWARD_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Reward value"
              type="number"
              value={tierForm.reward_value}
              onChange={(e) => setTierForm((f) => ({ ...f, reward_value: Number(e.target.value) }))}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setTierOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={createTier}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            {saving ? 'Saving…' : 'Create tier'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Outreach result dialog */}
      <PremiumDialog open={outreachOpen} onClose={() => setOutreachOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<GroupsRoundedIcon />}
          title="Advocate outreach"
          subtitle={outreachName ? `AI-generated outreach for ${outreachName}` : 'AI-generated outreach'}
          onClose={() => setOutreachOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          {!outreachResult ? (
            <Typography sx={{ color: SUBTLE }}>No outreach generated.</Typography>
          ) : (
            <Stack spacing={1.75}>
              {Object.entries(outreachResult).map(([key, value]) => (
                <Box key={key}>
                  <SectionLabel>{key.replace(/_/g, ' ')}</SectionLabel>
                  {Array.isArray(value) ? (
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {value.map((v, i) => (
                        <Typography key={i} sx={{ color: INK, fontSize: 13.5 }}>
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </Typography>
                      ))}
                    </Stack>
                  ) : typeof value === 'object' && value !== null ? (
                    <Typography
                      sx={{ color: INK, fontSize: 12.5, mt: 0.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                    >
                      {JSON.stringify(value, null, 2)}
                    </Typography>
                  ) : (
                    <Typography sx={{ color: INK, fontSize: 13.5, mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {String(value)}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOutreachOpen(false)} sx={ghostPillSx}>
            Close
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast || ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
