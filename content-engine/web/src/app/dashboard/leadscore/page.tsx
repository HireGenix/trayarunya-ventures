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
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type Tab = 'leads' | 'rules' | 'overview';

interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  source: string | null;
  stage: string;
  score: number;
  grade: string;
  last_activity_at: string | null;
  created_at: string;
}

interface Rule {
  id: string;
  name: string;
  condition: Record<string, unknown>;
  points: number;
  is_active: boolean;
}

interface Overview {
  total_leads: number;
  funnel: Record<string, number>;
  grade_distribution: Record<string, number>;
  avg_score: number;
  mqls: number;
  sqls: number;
  stages: string[];
}

interface NextAction {
  action: string;
  channel: string;
  reasoning: string;
  priority: string;
  source: string;
}

const STAGE_CHIP: Record<string, { bg: string; c: string }> = {
  subscriber: { bg: 'rgba(14,17,22,0.05)', c: INK },
  mql: { bg: BRAND.amberSoft, c: BRAND.amberDeep },
  sql: { bg: BRAND.tealSoft, c: BRAND.tealDeep },
  opportunity: { bg: '#EDE9FE', c: '#6D28D9' },
  customer: { bg: BRAND.tealSoft, c: BRAND.tealDeep },
};

const GRADE_CHIP: Record<string, { bg: string; c: string }> = {
  A: { bg: BRAND.tealSoft, c: BRAND.tealDeep },
  B: { bg: BRAND.amberSoft, c: BRAND.amberDeep },
  C: { bg: 'rgba(14,17,22,0.05)', c: SUBTLE },
  D: { bg: BRAND.pinkSoft, c: BRAND.pink },
};

function StageChip({ stage }: { stage: string }) {
  const s = STAGE_CHIP[stage] || STAGE_CHIP.subscriber;
  return (
    <Chip
      label={stage}
      size="small"
      sx={{ fontWeight: 700, fontSize: 11.5, textTransform: 'capitalize', bgcolor: s.bg, color: s.c }}
    />
  );
}

function GradeChip({ grade }: { grade: string }) {
  const g = GRADE_CHIP[grade] || GRADE_CHIP.D;
  return (
    <Box
      sx={{
        width: 26,
        height: 26,
        borderRadius: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 13,
        bgcolor: g.bg,
        color: g.c,
      }}
    >
      {grade}
    </Box>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 150,
        bgcolor: '#fff',
        border: `1px solid ${LINE}`,
        borderRadius: CARD_RADIUS,
        boxShadow: CARD_SHADOW,
        p: 2.5,
      }}
    >
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: SUBTLE, letterSpacing: 0.3 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 30, color: accent || INK, mt: 0.5, lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Box>
  );
}

const inkBtn = {
  px: 2.5,
  py: 1.1,
  borderRadius: '999px',
  fontWeight: 700,
  textTransform: 'none' as const,
  color: '#fff',
  background: INK,
  backgroundImage: 'none',
  boxShadow: '0 8px 20px rgba(14,17,22,0.22)',
  '&:hover': { background: '#1B2330' },
};

export default function LeadScorePage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<Tab>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ email: '', name: '', company: '', source: '', stage: 'subscriber' });
  const [action, setAction] = useState<{ lead: Lead; data: NextAction } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, r, o] = await Promise.all([
        api<Lead[]>('/leadscore/leads', { workspace: true }),
        api<Rule[]>('/leadscore/rules', { workspace: true }),
        api<Overview>('/leadscore/overview', { workspace: true }),
      ]);
      setLeads(l);
      setRules(r);
      setOverview(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load lead scoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const kpis = useMemo(() => {
    const total = overview?.total_leads ?? leads.length;
    const mqls = overview?.mqls ?? leads.filter((l) => l.stage === 'mql').length;
    const sqls = overview?.sqls ?? leads.filter((l) => l.stage === 'sql').length;
    const avg = overview?.avg_score ?? 0;
    return { total, mqls, sqls, avg };
  }, [overview, leads]);

  const createLead = useCallback(async () => {
    if (!leadForm.email.trim()) return;
    setBusy(true);
    try {
      await api('/leadscore/leads', { method: 'POST', body: leadForm, workspace: true });
      setLeadOpen(false);
      setLeadForm({ email: '', name: '', company: '', source: '', stage: 'subscriber' });
      setToast('Lead added');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add lead');
    } finally {
      setBusy(false);
    }
  }, [leadForm, load]);

  const runNextAction = useCallback(async (lead: Lead) => {
    setBusy(true);
    try {
      const data = await api<NextAction>(`/leadscore/leads/${lead.id}/next-action`, {
        method: 'POST',
        workspace: true,
      });
      setAction({ lead, data });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get next action');
    } finally {
      setBusy(false);
    }
  }, []);

  const suggestRules = useCallback(async () => {
    setBusy(true);
    try {
      await api('/leadscore/rules/suggest', { method: 'POST', body: { persist: true }, workspace: true });
      setToast('AI scoring rules added');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to suggest rules');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const runAgent = useCallback(async () => {
    setBusy(true);
    try {
      await api('/leadscore/agent/run', { method: 'POST', body: { autonomy: 'approve' }, workspace: true });
      setToast('Agent recomputed scores');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Agent run failed');
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info">Select a workspace to manage lead scoring.</Alert>
      </Box>
    );
  }

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
            Lead{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Scoring
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Score, grade and nurture every lead from real engagement — not guesswork.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
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
          <Button startIcon={<AddIcon />} onClick={() => setLeadOpen(true)} sx={inkBtn}>
            New lead
          </Button>
        </Stack>
      </Stack>

      {/* KPI cards */}
      <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2} sx={{ mb: 2.5, px: 0.5 }}>
        <Kpi label="Total leads" value={kpis.total} />
        <Kpi label="MQLs" value={kpis.mqls} accent={BRAND.amberDeep} />
        <Kpi label="SQLs" value={kpis.sqls} accent={BRAND.tealDeep} />
        <Kpi label="Avg score" value={kpis.avg} />
      </Stack>

      {/* Pill tabs */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, px: 0.5 }}>
        {(['leads', 'rules', 'overview'] as const).map((t) => (
          <Button
            key={t}
            disableRipple
            onClick={() => setTab(t)}
            sx={{
              px: 2.25, py: 0.85, borderRadius: '999px', fontWeight: 600, fontSize: 13.5, textTransform: 'none',
              color: tab === t ? '#fff' : 'text.secondary',
              bgcolor: tab === t ? INK : 'transparent',
              '&:hover': { bgcolor: tab === t ? '#1B2330' : 'rgba(14,17,22,0.05)', color: tab === t ? '#fff' : INK },
            }}
          >
            {t === 'leads' ? 'Leads' : t === 'rules' ? 'Scoring Rules' : 'Overview'}
          </Button>
        ))}
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
          {/* LEADS */}
          {tab === 'leads' && (
            <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
              {leads.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>No leads yet. Add one to start scoring.</Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      {['Lead', 'Company', 'Stage', 'Grade', 'Score', ''].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12.5, color: SUBTLE, borderColor: LINE }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leads.map((l) => (
                      <TableRow key={l.id} hover>
                        <TableCell sx={{ borderColor: LINE }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: INK }}>{l.name || l.email}</Typography>
                          <Typography sx={{ fontSize: 12, color: SUBTLE }}>{l.email}</Typography>
                        </TableCell>
                        <TableCell sx={{ borderColor: LINE, fontSize: 13, color: INK }}>{l.company || '—'}</TableCell>
                        <TableCell sx={{ borderColor: LINE }}><StageChip stage={l.stage} /></TableCell>
                        <TableCell sx={{ borderColor: LINE }}><GradeChip grade={l.grade} /></TableCell>
                        <TableCell sx={{ borderColor: LINE }}>
                          <Typography sx={{ fontWeight: 800, fontSize: 15, color: INK }}>{l.score}</Typography>
                        </TableCell>
                        <TableCell sx={{ borderColor: LINE }} align="right">
                          <Button
                            size="small"
                            disabled={busy}
                            startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                            onClick={() => runNextAction(l)}
                            sx={{ textTransform: 'none', fontWeight: 700, color: BRAND.tealDeep, '&:hover': { bgcolor: BRAND.tealSoft } }}
                          >
                            Next action
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}

          {/* RULES */}
          {tab === 'rules' && (
            <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 17, color: INK }}>Scoring rules</Typography>
                <Button
                  startIcon={<AutoAwesomeIcon />}
                  disabled={busy}
                  onClick={suggestRules}
                  sx={inkBtn}
                >
                  AI suggest rules
                </Button>
              </Stack>
              {rules.length === 0 ? (
                <Typography sx={{ color: SUBTLE, fontWeight: 600, py: 3, textAlign: 'center' }}>
                  No rules yet. Let the agent propose a scoring model from your activity.
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {rules.map((r) => (
                    <Stack
                      key={r.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ p: 1.75, border: `1px solid ${LINE}`, borderRadius: '14px' }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: INK }}>{r.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: SUBTLE, fontFamily: 'monospace', mt: 0.25 }}>
                          {JSON.stringify(r.condition)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={r.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            fontWeight: 700, fontSize: 11,
                            bgcolor: r.is_active ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                            color: r.is_active ? BRAND.tealDeep : SUBTLE,
                          }}
                        />
                        <Box sx={{ fontWeight: 800, fontSize: 15, color: r.points >= 0 ? BRAND.tealDeep : BRAND.pink, minWidth: 44, textAlign: 'right' }}>
                          {r.points >= 0 ? `+${r.points}` : r.points}
                        </Box>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && overview && (
            <Stack spacing={2}>
              <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 17, color: INK, mb: 2 }}>Stage funnel</Typography>
                <Stack spacing={1.5}>
                  {(overview.stages || []).map((stage) => {
                    const n = overview.funnel[stage] || 0;
                    const max = Math.max(1, ...Object.values(overview.funnel));
                    return (
                      <Box key={stage}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 13, color: INK, textTransform: 'capitalize' }}>{stage}</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: 13, color: INK }}>{n}</Typography>
                        </Stack>
                        <Box sx={{ height: 8, borderRadius: 999, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
                          <Box sx={{ width: `${(n / max) * 100}%`, height: '100%', background: BRAND.gradient }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 17, color: INK, mb: 2 }}>Grade distribution</Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
                  {(['A', 'B', 'C', 'D'] as const).map((g) => {
                    const chip = GRADE_CHIP[g];
                    return (
                      <Box key={g} sx={{ flex: 1, minWidth: 110, p: 2, borderRadius: '14px', bgcolor: chip.bg, textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 24, color: chip.c }}>{overview.grade_distribution[g] || 0}</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: 12, color: chip.c }}>Grade {g}</Typography>
                      </Box>
                    );
                  })}
                </Stack>
                <Typography sx={{ mt: 2.5, fontWeight: 700, color: SUBTLE, fontSize: 13 }}>
                  Average score across {overview.total_leads} leads:{' '}
                  <Box component="span" sx={{ color: INK, fontWeight: 800 }}>{overview.avg_score}</Box>
                </Typography>
              </Box>
            </Stack>
          )}
        </>
      )}

      {/* New lead dialog */}
      <PremiumDialog open={leadOpen} onClose={() => setLeadOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<PersonAddAltRoundedIcon />}
          title="New lead"
          subtitle="Add a contact — scoring is applied automatically by your rules"
          onClose={() => setLeadOpen(false)}
        />
        <DialogBody>
          <SectionLabel>Contact details</SectionLabel>
          <Stack spacing={2}>
            <TextField label="Email" value={leadForm.email} required
              onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} fullWidth size="small" />
            <TextField label="Name" value={leadForm.name}
              onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} fullWidth size="small" />
            <TextField label="Company" value={leadForm.company}
              onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })} fullWidth size="small" />
            <TextField label="Source" value={leadForm.source}
              onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })} fullWidth size="small" />
            <TextField label="Stage" select value={leadForm.stage}
              onChange={(e) => setLeadForm({ ...leadForm, stage: e.target.value })} fullWidth size="small">
              {['subscriber', 'mql', 'sql', 'opportunity', 'customer'].map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setLeadOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={createLead} disabled={busy || !leadForm.email.trim()} sx={inkPillSx}>Add lead</Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Next action dialog */}
      <PremiumDialog open={!!action} onClose={() => setAction(null)} maxWidth="sm">
        <DialogHero
          icon={<BoltRoundedIcon />}
          title="Next best action"
          subtitle={action ? (action.lead.name || action.lead.email) : 'Recommended follow-up'}
          onClose={() => setAction(null)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          {action && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip label={action.data.action} sx={{ fontWeight: 700, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, textTransform: 'capitalize' }} />
                <Chip label={action.data.channel} size="small" sx={{ fontWeight: 700, bgcolor: BRAND.amberSoft, color: BRAND.amberDeep }} />
                <Chip label={action.data.priority} size="small" sx={{ fontWeight: 700, bgcolor: 'rgba(14,17,22,0.05)', color: INK }} />
              </Stack>
              <Typography sx={{ fontSize: 14, color: INK, lineHeight: 1.5 }}>{action.data.reasoning}</Typography>
            </Stack>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setAction(null)} sx={inkPillSx}>Close</Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
