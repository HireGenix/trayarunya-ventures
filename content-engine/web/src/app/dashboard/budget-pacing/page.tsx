'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
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
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';

import dynamic from 'next/dynamic';
const RechartsLine = dynamic(() => import('recharts').then((m) => m.LineChart), { ssr: false });
const RechartsXAxis = dynamic(() => import('recharts').then((m) => m.XAxis as unknown as ComponentType<any>), { ssr: false });
const RechartsYAxis = dynamic(() => import('recharts').then((m) => m.YAxis as unknown as ComponentType<any>), { ssr: false });
const RechartsTooltipC = dynamic(() => import('recharts').then((m) => m.Tooltip as unknown as ComponentType<any>), { ssr: false });
const RechartsLegend = dynamic(() => import('recharts').then((m) => m.Legend as unknown as ComponentType<any>), { ssr: false });
const RechartsLineSeries = dynamic(() => import('recharts').then((m) => m.Line as unknown as ComponentType<any>), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });
const RechartsBar = dynamic(() => import('recharts').then((m) => m.BarChart), { ssr: false });
const RechartsBarSeries = dynamic(() => import('recharts').then((m) => m.Bar as unknown as ComponentType<any>), { ssr: false });

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type Budget = {
  id: string;
  name: string;
  period: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  channels: Record<string, number> | null;
  status: string;
};

type ChannelPace = {
  channel: string;
  allocated: number;
  spent: number;
  ideal_to_date: number;
  pace_ratio: number;
};

type PacingPoint = {
  date: string;
  actual: number;
  seasonal_target: number;
  linear_target: number;
};

type Pacing = {
  budget_id: string;
  total_amount: number;
  spent_to_date: number;
  ideal_to_date: number;
  pace_ratio: number;
  spend_fraction: number;
  elapsed_fraction: number;
  status: string;
  projected_total: number;
  projected_variance: number;
  channels: ChannelPace[];
  pacing_series?: PacingPoint[];
  dow_weights?: number[];
};

type ChannelEff = {
  roas: number;
  roas_type?: string;
  cpa: number | null;
  spend: number;
  revenue?: number | null;
  conversions?: number;
};

type BudgetDetail = {
  budget: Budget;
  pacing: Pacing;
  efficiency: Record<string, ChannelEff>;
};

type Proposal = {
  id: string;
  budget_id: string | null;
  moves: { from: string; to: string; amount: number; reason: string }[] | null;
  projected_lift: number | null;
  status: string;
  rationale: string | null;
};

type PacingAlert = {
  id: string;
  budget_id: string | null;
  kind: string;
  detail: string | null;
  severity: string;
  status: string;
};

type Overview = {
  total_budget: number;
  spent_to_date: number;
  pace_pct: number;
  projected_total: number;
  projected_variance: number;
  active_budgets: number;
  budgets: {
    id: string;
    name: string;
    status: string;
    pace_ratio: number;
    spent_to_date: number;
    total_amount: number;
    projected_variance: number;
  }[];
};

const TABS = ['Budgets', 'Reallocation', 'Alerts', 'Overview'] as const;
type Tab = (typeof TABS)[number];

const CHANNELS = ['google', 'meta', 'linkedin', 'other'];

function money(n: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function paceColor(status: string): { c: string; soft: string; label: string } {
  if (status === 'overspend') return { c: BRAND.pink, soft: BRAND.pinkSoft, label: 'Overspend' };
  if (status === 'underspend') return { c: BRAND.amberDeep, soft: BRAND.amberSoft, label: 'Underspend' };
  return { c: BRAND.tealDeep, soft: BRAND.tealSoft, label: 'On pace' };
}

function StatusChip({ status }: { status: string }) {
  const p = paceColor(status);
  return <Chip label={p.label} sx={{ fontWeight: 700, fontSize: 12.5, bgcolor: p.soft, color: p.c }} />;
}

function PaceBar({ pacing }: { pacing: Pacing }) {
  const p = paceColor(pacing.status);
  const fill = Math.min(Math.max(pacing.spend_fraction * 100, 0), 100);
  const idealMark = Math.min(Math.max(pacing.elapsed_fraction * 100, 0), 100);
  return (
    <Box sx={{ position: 'relative', height: 6, borderRadius: 999, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden', mt: 1.25, mb: 1.25 }}>
      <Box sx={{ width: `${fill}%`, height: '100%', bgcolor: p.c, transition: 'width .3s', borderRadius: 999 }} />
      <Box sx={{ position: 'absolute', top: -2, left: `${idealMark}%`, width: 2, height: 10, bgcolor: INK, opacity: 0.4 }} />
    </Box>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 180, bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 800, color: accent || INK, mt: 0.5, lineHeight: 1.1 }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 13, fontWeight: 600, color: SUBTLE, mt: 0.5 }}>{sub}</Typography>}
    </Box>
  );
}

function PacingChart({ series }: { series: PacingPoint[] }) {
  if (!series || series.length < 2) return null;
  const fmt = (d: string) => d.slice(5);
  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color: INK, mb: 1 }}>Pacing: Actual vs Seasonal Target</Typography>
      <ResponsiveContainer width="100%" height={220}>
        <RechartsLine data={series}>
          <RechartsXAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11, fill: SUBTLE }} />
          <RechartsYAxis tick={{ fontSize: 11, fill: SUBTLE }} />
          <RechartsTooltipC />
          <RechartsLegend wrapperStyle={{ fontSize: 12 }} />
          <RechartsLineSeries type="monotone" dataKey="actual" stroke={BRAND.tealDeep} strokeWidth={2.5} dot={false} name="Actual spend" />
          <RechartsLineSeries type="monotone" dataKey="seasonal_target" stroke={BRAND.amberDeep} strokeWidth={2} strokeDasharray="6 3" dot={false} name="Seasonal target" />
          <RechartsLineSeries type="monotone" dataKey="linear_target" stroke={SUBTLE} strokeWidth={1} strokeDasharray="3 3" dot={false} name="Linear target" />
        </RechartsLine>
      </ResponsiveContainer>
    </Box>
  );
}

function RoasChart({ efficiency }: { efficiency: Record<string, ChannelEff> }) {
  const data = Object.entries(efficiency).map(([ch, e]) => ({
    channel: ch.charAt(0).toUpperCase() + ch.slice(1),
    roas: e.roas,
    roas_type: e.roas_type || 'conversion_proxy',
  }));
  if (data.length === 0) return null;
  const isProxy = data.some((d) => d.roas_type === 'conversion_proxy');
  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: INK }}>ROAS by Channel</Typography>
        <Chip
          label={isProxy ? 'Conversion proxy' : 'Revenue-based'}
          sx={{ fontWeight: 700, fontSize: 11, bgcolor: isProxy ? BRAND.amberSoft : BRAND.tealSoft, color: isProxy ? BRAND.amberDeep : BRAND.tealDeep }}
        />
      </Stack>
      <ResponsiveContainer width="100%" height={180}>
        <RechartsBar data={data}>
          <RechartsXAxis dataKey="channel" tick={{ fontSize: 11, fill: SUBTLE }} />
          <RechartsYAxis tick={{ fontSize: 11, fill: SUBTLE }} />
          <RechartsTooltipC />
          <RechartsBarSeries dataKey="roas" fill={BRAND.tealDeep} radius={[6, 6, 0, 0]} name="ROAS" />
        </RechartsBar>
      </ResponsiveContainer>
      {isProxy && (
        <Typography sx={{ fontSize: 11.5, color: SUBTLE, fontWeight: 600, mt: 0.5 }}>
          ROAS shown as conversions/spend (no revenue data available). Label: conversion proxy.
        </Typography>
      )}
    </Box>
  );
}

export default function BudgetPacingPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<Tab>('Budgets');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [details, setDetails] = useState<Record<string, BudgetDetail>>({});
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [alerts, setAlerts] = useState<PacingAlert[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [openSpend, setOpenSpend] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [form, setForm] = useState({ name: '', period: 'monthly', total_amount: '', start_date: '', end_date: '', google: '', meta: '', linkedin: '', other: '' });
  const [spendForm, setSpendForm] = useState({ budget_id: '', channel: 'google', amount: '', date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, p, a, o] = await Promise.all([
        api<Budget[]>('/budget-pacing/budgets', { workspace: true }),
        api<Proposal[]>('/budget-pacing/proposals', { workspace: true }),
        api<PacingAlert[]>('/budget-pacing/alerts', { workspace: true }),
        api<Overview>('/budget-pacing/overview', { workspace: true }),
      ]);
      setBudgets(b);
      setProposals(p);
      setAlerts(a);
      setOverview(o);
      const det: Record<string, BudgetDetail> = {};
      await Promise.all(
        b.map(async (bud) => {
          try {
            det[bud.id] = await api<BudgetDetail>(`/budget-pacing/budgets/${bud.id}`, { workspace: true });
          } catch {
            /* skip */
          }
        }),
      );
      setDetails(det);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load budget pacing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const createBudget = async () => {
    setSaving(true);
    try {
      const channels: Record<string, number> = {};
      for (const c of CHANNELS) {
        const v = parseFloat((form as Record<string, string>)[c]);
        if (!Number.isNaN(v) && v > 0) channels[c] = v;
      }
      await api('/budget-pacing/budgets', {
        method: 'POST',
        workspace: true,
        body: {
          name: form.name,
          period: form.period,
          total_amount: parseFloat(form.total_amount) || 0,
          start_date: form.start_date,
          end_date: form.end_date,
          channels,
        },
      });
      setOpenCreate(false);
      setForm({ name: '', period: 'monthly', total_amount: '', start_date: '', end_date: '', google: '', meta: '', linkedin: '', other: '' });
      setToast('Budget created');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const addSpend = async () => {
    setSaving(true);
    try {
      await api('/budget-pacing/spend', {
        method: 'POST',
        workspace: true,
        body: {
          budget_id: spendForm.budget_id || null,
          channel: spendForm.channel,
          amount: parseFloat(spendForm.amount) || 0,
          date: spendForm.date,
        },
      });
      setOpenSpend(false);
      setSpendForm({ budget_id: '', channel: 'google', amount: '', date: '' });
      setToast('Spend recorded');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to record spend');
    } finally {
      setSaving(false);
    }
  };

  const syncBudget = async (id: string) => {
    setBusy(`sync-${id}`);
    try {
      const r = await api<{ records: number; total_synced: number }>(`/budget-pacing/budgets/${id}/sync`, { method: 'POST', workspace: true });
      setToast(`Synced ${r.records} record(s), ${money(r.total_synced)}`);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(null);
    }
  };

  const reallocate = async (id: string) => {
    setBusy(`realloc-${id}`);
    try {
      await api(`/budget-pacing/budgets/${id}/reallocate`, { method: 'POST', workspace: true, body: { autonomy: 'suggest' } });
      setToast('Marginal-ROI reallocation proposed');
      setTab('Reallocation');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Reallocation failed');
    } finally {
      setBusy(null);
    }
  };

  const applyProposal = async (id: string) => {
    setBusy(`apply-${id}`);
    try {
      await api(`/budget-pacing/proposals/${id}/apply`, { method: 'POST', workspace: true });
      setToast('Proposal applied');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setBusy(null);
    }
  };

  const runPacingAgent = async () => {
    setAgentBusy(true);
    setAgentResult(null);
    try {
      const res = await api<any>('/budget-pacing/agent/run', { method: 'POST', workspace: true, body: { autonomy: 'suggest' } });
      setAgentResult(res);
      setToast('Pacing agent completed');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Agent run failed');
    } finally {
      setAgentBusy(false);
    }
  };

  const openAlerts = useMemo(() => alerts.filter((a) => a.status === 'open'), [alerts]);
  const suggested = useMemo(() => proposals.filter((p) => p.status !== 'applied'), [proposals]);

  if (!activeWorkspace) {
    return (
      <Box sx={{ p: 6, textAlign: 'center', color: SUBTLE }}>
        <Typography sx={{ fontWeight: 700 }}>Select a workspace to view budget pacing.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: INK, fontSize: 30 }}>
            Budget{' '}
            <Box component="span" sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Pacing
            </Box>
          </Typography>
          <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 14, mt: 0.25 }}>
            Seasonality-aware pacing, true-revenue ROAS and marginal-ROI reallocation.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            onClick={runPacingAgent}
            disabled={agentBusy}
            variant="outlined"
            startIcon={agentBusy ? <CircularProgress size={16} sx={{ color: INK }} /> : <AutoAwesomeRoundedIcon />}
            sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, borderColor: LINE, color: INK }}
          >
            Run pacing agent
          </Button>
          <Button
            onClick={() => setOpenSpend(true)}
            variant="outlined"
            sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, borderColor: LINE, color: INK }}
          >
            Record spend
          </Button>
          <Button
            onClick={() => setOpenCreate(true)}
            variant="contained"
            sx={{ background: INK, backgroundImage: 'none', borderRadius: '999px', textTransform: 'none', fontWeight: 700, '&:hover': { background: '#000' } }}
          >
            New budget
          </Button>
        </Stack>
      </Stack>

      {agentResult && (
        <Alert severity="info" onClose={() => setAgentResult(null)} sx={{ borderRadius: '16px', mb: 2.5 }}>
          Pacing agent ran successfully.{' '}
          {agentResult.proposals_created ? `${agentResult.proposals_created} proposal(s) created.` : ''}
          {agentResult.alerts_created ? ` ${agentResult.alerts_created} alert(s) raised.` : ''}
        </Alert>
      )}

      {overview && (
        <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
          <KpiCard label="Total budget" value={money(overview.total_budget)} sub={`${overview.active_budgets} active`} />
          <KpiCard label="Spent to date" value={money(overview.spent_to_date)} sub={`${overview.pace_pct}% of budget`} />
          <KpiCard
            label="Pace status"
            value={`${overview.pace_pct}%`}
            sub="Spend vs total"
            accent={overview.projected_variance > 0 ? BRAND.pink : BRAND.tealDeep}
          />
          <KpiCard
            label="Projected variance"
            value={`${overview.projected_variance > 0 ? '+' : ''}${money(overview.projected_variance)}`}
            sub={overview.projected_variance > 0 ? 'Projected over budget' : 'Projected under budget'}
            accent={overview.projected_variance > 0 ? BRAND.pink : BRAND.tealDeep}
          />
        </Stack>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const active = tab === t;
          const count = t === 'Alerts' ? openAlerts.length : t === 'Reallocation' ? suggested.length : t === 'Budgets' ? budgets.length : 0;
          return (
            <Button
              key={t}
              onClick={() => setTab(t)}
              sx={{
                borderRadius: '999px',
                textTransform: 'none',
                fontWeight: 700,
                px: 2,
                color: active ? '#fff' : 'text.secondary',
                bgcolor: active ? INK : 'transparent',
                '&:hover': { bgcolor: active ? '#1B2330' : 'rgba(14,17,22,0.05)', color: active ? '#fff' : INK },
              }}
            >
              {t}
              {count > 0 && (
                <Box component="span" sx={{ ml: 1, px: 0.9, py: 0.1, borderRadius: 999, fontSize: 12, fontWeight: 800, bgcolor: active ? 'rgba(255,255,255,0.2)' : 'rgba(14,17,22,0.08)', color: active ? '#fff' : INK }}>
                  {count}
                </Box>
              )}
            </Button>
          );
        })}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tab === 'Budgets' && (
            <Stack spacing={2}>
              {budgets.length === 0 && (
                <Box sx={{ border: `1.5px dashed ${LINE}`, borderRadius: CARD_RADIUS, py: 6, textAlign: 'center', color: SUBTLE, fontWeight: 600 }}>
                  No budgets yet. Create one to start pacing your cross-channel spend.
                </Box>
              )}
              {budgets.map((b) => {
                const det = details[b.id];
                const pacing = det?.pacing;
                const eff = det?.efficiency;
                const alloc = b.channels || {};
                return (
                  <Box key={b.id} sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Typography sx={{ fontWeight: 800, fontSize: 17, color: INK }}>{b.name}</Typography>
                          {pacing && <StatusChip status={pacing.status} />}
                          <Chip label={b.period} sx={{ fontWeight: 600, fontSize: 12, bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE }} />
                        </Stack>
                        <Typography sx={{ color: SUBTLE, fontSize: 13, fontWeight: 600, mt: 0.5 }}>
                          {b.start_date} &rarr; {b.end_date}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          onClick={() => syncBudget(b.id)}
                          disabled={busy === `sync-${b.id}`}
                          variant="outlined"
                          size="small"
                          sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, borderColor: LINE, color: INK }}
                        >
                          {busy === `sync-${b.id}` ? 'Syncing' : 'Sync ads spend'}
                        </Button>
                        <Button
                          onClick={() => reallocate(b.id)}
                          disabled={busy === `realloc-${b.id}`}
                          variant="contained"
                          size="small"
                          sx={{ background: INK, backgroundImage: 'none', borderRadius: '999px', textTransform: 'none', fontWeight: 700, '&:hover': { background: '#000' } }}
                        >
                          {busy === `realloc-${b.id}` ? 'Thinking' : 'Marginal-ROI reallocate'}
                        </Button>
                      </Stack>
                    </Stack>

                    {pacing && (
                      <>
                        <Stack direction="row" spacing={3} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: 13.5, color: INK, fontWeight: 700 }}>
                            {money(pacing.spent_to_date)} <Box component="span" sx={{ color: SUBTLE, fontWeight: 600 }}>of {money(pacing.total_amount)}</Box>
                          </Typography>
                          <Typography sx={{ fontSize: 13.5, color: SUBTLE, fontWeight: 600 }}>Seasonal ideal {money(pacing.ideal_to_date)}</Typography>
                          <Typography sx={{ fontSize: 13.5, color: SUBTLE, fontWeight: 600 }}>Projected {money(pacing.projected_total)}</Typography>
                        </Stack>
                        <PaceBar pacing={pacing} />

                        {pacing.pacing_series && pacing.pacing_series.length >= 2 && (
                          <PacingChart series={pacing.pacing_series} />
                        )}

                        {eff && <RoasChart efficiency={eff} />}

                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                          {Object.keys(alloc).length === 0 && pacing.channels.length === 0 && (
                            <Typography sx={{ fontSize: 12.5, color: SUBTLE }}>No channel allocation set.</Typography>
                          )}
                          {pacing.channels.map((c) => {
                            const cp = paceColor(c.pace_ratio > 1.1 ? 'overspend' : c.pace_ratio < 0.9 && pacing.elapsed_fraction > 0.1 ? 'underspend' : 'on_pace');
                            const chEff = eff?.[c.channel];
                            return (
                              <Tooltip
                                key={c.channel}
                                title={chEff ? `ROAS ${chEff.roas.toFixed(4)} (${chEff.roas_type || 'proxy'})${chEff.revenue != null ? ` | Rev ${money(chEff.revenue)}` : ''}` : ''}
                              >
                                <Box sx={{ px: 1.25, py: 0.75, borderRadius: '12px', bgcolor: cp.soft, border: `1px solid ${LINE}` }}>
                                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: cp.c, textTransform: 'capitalize' }}>{c.channel}</Typography>
                                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: SUBTLE }}>
                                    {money(c.spent)} / {money(c.allocated)}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            );
                          })}
                        </Stack>
                      </>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          {tab === 'Reallocation' && (
            <Stack spacing={2}>
              {suggested.length === 0 && (
                <Box sx={{ border: `1.5px dashed ${LINE}`, borderRadius: CARD_RADIUS, py: 6, textAlign: 'center', color: SUBTLE, fontWeight: 600 }}>
                  No reallocation proposals. Run marginal-ROI reallocate on a budget to generate one.
                </Box>
              )}
              {suggested.map((p) => {
                const bud = budgets.find((b) => b.id === p.budget_id);
                return (
                  <Box key={p.id} sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 240 }}>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>{bud?.name || 'Budget'}</Typography>
                          <Chip
                            label={p.status}
                            sx={{ fontWeight: 700, fontSize: 12, bgcolor: p.status === 'approved' ? BRAND.tealSoft : BRAND.amberSoft, color: p.status === 'approved' ? BRAND.tealDeep : BRAND.amberDeep }}
                          />
                          {typeof p.projected_lift === 'number' && (
                            <Chip label={`Projected lift ${p.projected_lift}%`} sx={{ fontWeight: 700, fontSize: 12, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }} />
                          )}
                        </Stack>
                        {p.rationale && <Typography sx={{ color: SUBTLE, fontSize: 13, fontWeight: 600, mt: 0.75 }}>{p.rationale}</Typography>}
                        <Stack spacing={1} sx={{ mt: 1.25 }}>
                          {(p.moves || []).map((m, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Box sx={{ px: 1, py: 0.4, borderRadius: '10px', bgcolor: BRAND.pinkSoft, color: BRAND.pink, fontWeight: 800, fontSize: 12.5, textTransform: 'capitalize' }}>{m.from}</Box>
                              <Typography sx={{ color: SUBTLE, fontWeight: 800 }}>&rarr;</Typography>
                              <Box sx={{ px: 1, py: 0.4, borderRadius: '10px', bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, fontWeight: 800, fontSize: 12.5, textTransform: 'capitalize' }}>{m.to}</Box>
                              <Typography sx={{ fontWeight: 800, color: INK, fontSize: 13 }}>{money(m.amount)}</Typography>
                              {m.reason && <Typography sx={{ color: SUBTLE, fontSize: 12.5, fontWeight: 600 }}>&mdash; {m.reason}</Typography>}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                      <Button
                        onClick={() => applyProposal(p.id)}
                        disabled={busy === `apply-${p.id}`}
                        variant="contained"
                        sx={{ background: INK, backgroundImage: 'none', borderRadius: '999px', textTransform: 'none', fontWeight: 700, '&:hover': { background: '#000' } }}
                      >
                        {busy === `apply-${p.id}` ? 'Applying' : 'Apply'}
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}

          {tab === 'Alerts' && (
            <Stack spacing={1.5}>
              {openAlerts.length === 0 && (
                <Box sx={{ border: `1.5px dashed ${LINE}`, borderRadius: CARD_RADIUS, py: 6, textAlign: 'center', color: SUBTLE, fontWeight: 600 }}>
                  No open pacing alerts. You are on track.
                </Box>
              )}
              {openAlerts.map((a) => {
                const sev =
                  a.severity === 'critical'
                    ? { c: BRAND.pink, soft: BRAND.pinkSoft }
                    : a.severity === 'info'
                      ? { c: BRAND.tealDeep, soft: BRAND.tealSoft }
                      : { c: BRAND.amberDeep, soft: BRAND.amberSoft };
                const bud = budgets.find((b) => b.id === a.budget_id);
                return (
                  <Box key={a.id} sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.25, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Box sx={{ mt: 0.5, width: 9, height: 9, borderRadius: '50%', bgcolor: sev.c, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: INK, textTransform: 'capitalize' }}>{a.kind}</Typography>
                        <Chip label={a.severity} sx={{ fontWeight: 700, fontSize: 11.5, bgcolor: sev.soft, color: sev.c }} />
                        {bud && <Typography sx={{ color: SUBTLE, fontSize: 12.5, fontWeight: 600 }}>{bud.name}</Typography>}
                      </Stack>
                      {a.detail && <Typography sx={{ color: SUBTLE, fontSize: 13, fontWeight: 600, mt: 0.5 }}>{a.detail}</Typography>}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}

          {tab === 'Overview' && overview && (
            <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 1.5 }}>Active budgets</Typography>
              <Stack spacing={1.25}>
                {overview.budgets.length === 0 && <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>No active budgets.</Typography>}
                {overview.budgets.map((b) => (
                  <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', py: 1, borderBottom: `1px solid ${LINE}` }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: INK, minWidth: 160 }}>{b.name}</Typography>
                    <StatusChip status={b.status} />
                    <Typography sx={{ fontSize: 13, color: SUBTLE, fontWeight: 600 }}>
                      {money(b.spent_to_date)} / {money(b.total_amount)}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: b.projected_variance > 0 ? BRAND.pink : BRAND.tealDeep }}>
                      {b.projected_variance > 0 ? '+' : ''}
                      {money(b.projected_variance)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}

      <PremiumDialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm">
        <DialogHero
          icon={<PaymentsRoundedIcon />}
          title="New budget"
          subtitle="Set the period, total and per-channel allocation"
          onClose={() => setOpenCreate(false)}
        />
        <DialogBody>
          <SectionLabel>Budget basics</SectionLabel>
          <FieldGrid>
            <FullSpan>
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth size="small" />
            </FullSpan>
            <TextField select label="Period" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} fullWidth size="small">
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
            </TextField>
            <TextField label="Total amount" type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} fullWidth size="small" />
            <TextField label="Start date" type="date" InputLabelProps={{ shrink: true }} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} fullWidth size="small" />
            <TextField label="End date" type="date" InputLabelProps={{ shrink: true }} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} fullWidth size="small" />
          </FieldGrid>

          <SectionLabel sx={{ mt: 2.75 }}>Channel allocation</SectionLabel>
          <FieldGrid>
            {CHANNELS.map((c) => (
              <TextField
                key={c}
                label={c.charAt(0).toUpperCase() + c.slice(1)}
                type="number"
                value={(form as Record<string, string>)[c]}
                onChange={(e) => setForm({ ...form, [c]: e.target.value })}
                fullWidth
                size="small"
              />
            ))}
          </FieldGrid>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpenCreate(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={createBudget}
            disabled={saving || !form.name || !form.start_date || !form.end_date}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            {saving ? 'Creating' : 'Create budget'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <PremiumDialog open={openSpend} onClose={() => setOpenSpend(false)} maxWidth="xs">
        <DialogHero
          icon={<ReceiptLongRoundedIcon />}
          title="Record spend"
          subtitle="Log spend against a budget and channel"
          onClose={() => setOpenSpend(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <SectionLabel>Spend details</SectionLabel>
          <Stack spacing={1.75}>
            <TextField select label="Budget" value={spendForm.budget_id} onChange={(e) => setSpendForm({ ...spendForm, budget_id: e.target.value })} fullWidth size="small">
              <MenuItem value="">Unassigned</MenuItem>
              {budgets.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Channel" value={spendForm.channel} onChange={(e) => setSpendForm({ ...spendForm, channel: e.target.value })} fullWidth size="small">
              {CHANNELS.map((c) => (
                <MenuItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Amount" type="number" value={spendForm.amount} onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })} fullWidth size="small" />
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={spendForm.date} onChange={(e) => setSpendForm({ ...spendForm, date: e.target.value })} fullWidth size="small" />
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpenSpend(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={addSpend}
            disabled={saving || !spendForm.amount || !spendForm.date}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            {saving ? 'Saving' : 'Record'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar open={!!toast} autoHideDuration={3200} onClose={() => setToast(null)} message={toast || ''} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
