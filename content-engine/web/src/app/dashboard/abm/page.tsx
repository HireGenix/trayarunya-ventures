'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNewOutlined';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrowOutlined';
import PauseIcon from '@mui/icons-material/PauseOutlined';
import SkipNextIcon from '@mui/icons-material/SkipNextOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlotOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import TipsIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
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
import { useAuth } from '@/lib/auth';
import {
  Abm,
  api,
  type AbmAccount,
  type AbmStage,
  type AbmTier,
  type AbmPlay,
  type AbmPlayStep,
  type AbmEnrollment,
  type AbmMatrixPoint,
  type Persona,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

const STAGES: { key: AbmStage; label: string; accent: string }[] = [
  { key: 'new', label: 'New', accent: SUBTLE },
  { key: 'researching', label: 'Researching', accent: '#2563EB' },
  { key: 'engaging', label: 'Engaging', accent: BRAND.amber },
  { key: 'opportunity', label: 'Opportunity', accent: BRAND.teal },
  { key: 'won', label: 'Won', accent: BRAND.tealDeep },
  { key: 'lost', label: 'Lost', accent: BRAND.pink },
];

const STAGE_LABEL: Record<AbmStage, string> = {
  new: 'New',
  researching: 'Researching',
  engaging: 'Engaging',
  opportunity: 'Opportunity',
  won: 'Won',
  lost: 'Lost',
};

const TIERS: { key: AbmTier; label: string; accent: string }[] = [
  { key: 'tier_1', label: 'Tier 1', accent: BRAND.pink },
  { key: 'tier_2', label: 'Tier 2', accent: BRAND.amber },
  { key: 'tier_3', label: 'Tier 3', accent: SUBTLE },
];

const TIER_COLORS: Record<string, string> = {
  tier_1: BRAND.pink,
  tier_2: BRAND.amber,
  tier_3: SUBTLE,
};

function tierMeta(t: AbmTier) {
  return TIERS.find((x) => x.key === t) ?? TIERS[2];
}

function prettyKey(k: string): string {
  return k.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '\u2014';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map((x) => renderValue(x)).join(', ');
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ width: '100%' }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min((value / max) * 100, 100)}
          sx={{
            height: 6,
            borderRadius: 99,
            bgcolor: `${color}18`,
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 },
          }}
        />
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color, minWidth: 28, textAlign: 'right' }}>
        {Math.round(value)}
      </Typography>
    </Stack>
  );
}

function PlaySuggestionView({ data }: { data: Record<string, unknown> }) {
  const name = typeof data.name === 'string' ? data.name : undefined;
  const description = typeof data.description === 'string' ? data.description
    : typeof data.rationale === 'string' ? data.rationale : undefined;
  const steps = Array.isArray(data.steps) ? (data.steps as unknown[]) : [];
  const handled = new Set(['name', 'description', 'rationale', 'steps']);
  const rest = Object.entries(data).filter(([k]) => !handled.has(k));
  return (
    <Stack spacing={1.2}>
      {name && <Typography fontWeight={900} sx={{ color: INK, fontSize: 15 }}>{name}</Typography>}
      {description && <Typography sx={{ fontSize: 13, color: SUBTLE }}>{description}</Typography>}
      {steps.length > 0 && (
        <Stack spacing={0.8}>
          {steps.map((s, i) => {
            const step = (s && typeof s === 'object') ? (s as Record<string, unknown>) : {};
            const channel = typeof step.channel === 'string' ? step.channel : 'step';
            const subject = typeof step.subject === 'string' ? step.subject : undefined;
            const body = typeof step.body === 'string' ? step.body : undefined;
            const delay = typeof step.delay_days === 'number' ? step.delay_days : undefined;
            return (
              <Box key={i} sx={{ p: 1.4, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Chip label={`${i + 1}`} size="small" sx={{ height: 22, width: 22, fontSize: 11, fontWeight: 800, bgcolor: `${BRAND.teal}18`, color: BRAND.teal }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase' }}>{channel}</Typography>
                  {delay != null && <Chip label={`+${delay}d`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: `${BRAND.amber}18`, color: BRAND.amber }} />}
                </Stack>
                {subject && <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK, mt: 0.4 }}>{subject}</Typography>}
                {body && <Typography sx={{ fontSize: 12, color: SUBTLE, mt: 0.3, whiteSpace: 'pre-wrap' }}>{body}</Typography>}
              </Box>
            );
          })}
        </Stack>
      )}
      {!name && !description && steps.length === 0 && rest.length > 0 && (
        <Stack spacing={0.8}>
          {rest.map(([k, v]) => (
            <Box key={k} sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
              <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{prettyKey(k)}</Typography>
              <Typography sx={{ color: INK, fontSize: 13, mt: 0.3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderValue(v)}</Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export default function AbmPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const [accounts, setAccounts] = useState<AbmAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState(0);

  // Add dialog
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [creating, setCreating] = useState(false);
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [tier, setTier] = useState<AbmTier>('tier_2');
  const [notes, setNotes] = useState('');
  const [bulkText, setBulkText] = useState('');

  // Detail drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AbmAccount | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [genPersonas, setGenPersonas] = useState(false);
  const [genAssets, setGenAssets] = useState(false);

  // Scoring
  const [scoring, setScoring] = useState(false);
  const [matrixData, setMatrixData] = useState<AbmMatrixPoint[]>([]);

  // Plays
  const [plays, setPlays] = useState<AbmPlay[]>([]);
  const [playsLoading, setPlaysLoading] = useState(false);
  const [playOpen, setPlayOpen] = useState(false);
  const [playName, setPlayName] = useState('');
  const [playDesc, setPlayDesc] = useState('');
  const [playSteps, setPlaySteps] = useState<{ channel: string; subject: string; body: string; delay_days: number }[]>([
    { channel: 'email', subject: '', body: '', delay_days: 0 },
  ]);
  const [creatingPlay, setCreatingPlay] = useState(false);

  // Play detail
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [selectedPlay, setSelectedPlay] = useState<AbmPlay | null>(null);
  const [playEnrollments, setPlayEnrollments] = useState<AbmEnrollment[]>([]);
  const [enrollingAccountId, setEnrollingAccountId] = useState('');
  const [playStepsDetail, setPlayStepsDetail] = useState<AbmPlayStep[]>([]);
  const [playStepsLoading, setPlayStepsLoading] = useState(false);
  const [addStepForm, setAddStepForm] = useState<{ channel: string; subject: string; body: string; delay_days: number }>({
    channel: 'email', subject: '', body: '', delay_days: 0,
  });
  const [addingStep, setAddingStep] = useState(false);
  const [editPlayName, setEditPlayName] = useState('');
  const [editPlayDesc, setEditPlayDesc] = useState('');
  const [savingPlay, setSavingPlay] = useState(false);
  const [deletingPlay, setDeletingPlay] = useState(false);

  // Account-level play recommendation, score breakdown, enrollments
  const [recommendingPlay, setRecommendingPlay] = useState(false);
  const [recommendedPlay, setRecommendedPlay] = useState<Record<string, unknown> | null>(null);
  const [accountScore, setAccountScore] = useState<Record<string, unknown> | null>(null);
  const [accountScoreLoading, setAccountScoreLoading] = useState(false);
  const [accountEnrollments, setAccountEnrollments] = useState<AbmEnrollment[]>([]);

  // Suggest play (tier-based)
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<Record<string, unknown> | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestTier, setSuggestTier] = useState<AbmTier>('tier_2');

  const load = useCallback(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Abm.listAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, [activeWorkspace]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setRecommendedPlay(null);
      setAccountScore(null);
      setAccountEnrollments([]);
      return;
    }
    setDetailLoading(true);
    setRecommendedPlay(null);
    Abm.getAccount(selectedId)
      .then((a) => {
        setDetail(a);
        setDraftNotes(a.notes ?? '');
      })
      .catch(() => setToast('Failed to load account'))
      .finally(() => setDetailLoading(false));

    setAccountScoreLoading(true);
    Abm.getAccountScore(selectedId)
      .then(setAccountScore)
      .catch(() => setAccountScore(null))
      .finally(() => setAccountScoreLoading(false));

    Abm.listAccountEnrollments(selectedId)
      .then(setAccountEnrollments)
      .catch(() => setAccountEnrollments([]));
  }, [selectedId]);

  const loadPlays = useCallback(() => {
    if (!activeWorkspace) return;
    setPlaysLoading(true);
    Abm.listPlays()
      .then(setPlays)
      .catch(() => setPlays([]))
      .finally(() => setPlaysLoading(false));
  }, [activeWorkspace]);

  const loadMatrix = useCallback(() => {
    if (!activeWorkspace) return;
    Abm.priorityMatrix()
      .then(setMatrixData)
      .catch(() => setMatrixData([]));
  }, [activeWorkspace]);

  useEffect(() => {
    if (mainTab === 1) loadMatrix();
    if (mainTab === 2) loadPlays();
  }, [mainTab, loadMatrix, loadPlays]);

  const byStage = useMemo(() => {
    const map: Record<AbmStage, AbmAccount[]> = {
      new: [],
      researching: [],
      engaging: [],
      opportunity: [],
      won: [],
      lost: [],
    };
    for (const a of accounts) map[a.stage]?.push(a);
    return map;
  }, [accounts]);

  const resetForm = () => {
    setCompany('');
    setWebsite('');
    setIndustry('');
    setTier('tier_2');
    setNotes('');
    setBulkText('');
    setMode('single');
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      if (mode === 'single') {
        if (!company.trim()) return;
        const a = await Abm.createAccount({
          company: company.trim(),
          website: website.trim() || undefined,
          industry: industry.trim() || undefined,
          tier,
          notes: notes.trim() || undefined,
        });
        setAccounts((prev) => [a, ...prev]);
        setToast('Account added');
      } else {
        const names = bulkText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (names.length === 0) return;
        const created = await Abm.bulkCreateAccounts(
          names.map((c) => ({ company: c, tier })),
        );
        setAccounts((prev) => [...created, ...prev]);
        setToast(`${created.length} accounts added`);
      }
      setOpen(false);
      resetForm();
    } catch {
      setToast('Failed to add account(s)');
    } finally {
      setCreating(false);
    }
  };

  const handleStageChange = async (acc: AbmAccount, stage: AbmStage) => {
    if (stage === acc.stage) return;
    const prev = accounts;
    setAccounts((list) => list.map((x) => (x.id === acc.id ? { ...x, stage } : x)));
    try {
      const updated = await Abm.updateAccount(acc.id, { stage });
      setAccounts((list) => list.map((x) => (x.id === acc.id ? updated : x)));
      if (detail?.id === acc.id) setDetail(updated);
    } catch {
      setAccounts(prev);
      setToast('Failed to move account');
    }
  };

  const handleDelete = async (acc: AbmAccount) => {
    const ok = await confirm({
      title: 'Delete account?',
      message: `"${acc.company}" and all its personas & assets will be permanently removed.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await Abm.deleteAccount(acc.id);
    setAccounts((prev) => prev.filter((x) => x.id !== acc.id));
    if (selectedId === acc.id) setSelectedId(null);
    setToast('Account deleted');
  };

  const handleSaveNotes = async () => {
    if (!detail) return;
    setSavingNotes(true);
    try {
      const updated = await Abm.updateAccount(detail.id, { notes: draftNotes });
      setDetail(updated);
      setAccounts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setToast('Notes saved');
    } catch {
      setToast('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleGeneratePersonas = async () => {
    if (!detail) return;
    setGenPersonas(true);
    try {
      const personas = await Abm.generatePersonas(detail.id);
      setDetail((d) => (d ? { ...d, personas } : d));
      setToast('Personas generated');
    } catch {
      setToast('Failed to generate personas');
    } finally {
      setGenPersonas(false);
    }
  };

  const handleGenerateAssets = async () => {
    if (!detail) return;
    setGenAssets(true);
    try {
      const assets = await Abm.generateAssets(detail.id);
      setDetail((d) => (d ? { ...d, assets } : d));
      setToast('Assets generated');
    } catch {
      setToast('Failed to generate assets');
    } finally {
      setGenAssets(false);
    }
  };

  const handleScoreAll = async () => {
    setScoring(true);
    try {
      const res = await Abm.scoreAll();
      setToast(`Scored ${res.scored} accounts`);
      load();
      loadMatrix();
    } catch {
      setToast('Failed to score accounts');
    } finally {
      setScoring(false);
    }
  };

  const handleCreatePlay = async () => {
    setCreatingPlay(true);
    try {
      const play = await Abm.createPlay({
        name: playName.trim(),
        description: playDesc.trim() || undefined,
        steps: playSteps.filter((s) => s.channel),
      });
      setPlays((prev) => [play, ...prev]);
      setToast('Play created');
      setPlayOpen(false);
      setPlayName('');
      setPlayDesc('');
      setPlaySteps([{ channel: 'email', subject: '', body: '', delay_days: 0 }]);
    } catch {
      setToast('Failed to create play');
    } finally {
      setCreatingPlay(false);
    }
  };

  const handleSelectPlay = async (playId: string) => {
    setSelectedPlayId(playId);
    setPlayStepsLoading(true);
    try {
      const [play, enrollments, steps] = await Promise.all([
        Abm.getPlay(playId),
        Abm.listPlayEnrollments(playId),
        Abm.getPlaySteps(playId),
      ]);
      setSelectedPlay(play);
      setPlayEnrollments(enrollments);
      setPlayStepsDetail(steps);
      setEditPlayName(play.name);
      setEditPlayDesc(play.description ?? '');
    } catch {
      setToast('Failed to load play');
    } finally {
      setPlayStepsLoading(false);
    }
  };

  const closePlayDrawer = () => {
    setSelectedPlayId(null);
    setSelectedPlay(null);
    setPlayStepsDetail([]);
    setAddStepForm({ channel: 'email', subject: '', body: '', delay_days: 0 });
  };

  const handleAddStep = async () => {
    if (!selectedPlayId || !addStepForm.channel.trim()) return;
    setAddingStep(true);
    try {
      await api(`/abm/plays/${selectedPlayId}/steps`, { method: 'POST', body: addStepForm, workspace: true });
      const steps = await Abm.getPlaySteps(selectedPlayId);
      setPlayStepsDetail(steps);
      setAddStepForm({ channel: 'email', subject: '', body: '', delay_days: 0 });
      setToast('Step added');
    } catch {
      setToast('Failed to add step');
    } finally {
      setAddingStep(false);
    }
  };

  const handleSavePlay = async () => {
    if (!selectedPlayId || !editPlayName.trim()) return;
    setSavingPlay(true);
    try {
      const updated = await Abm.updatePlay(selectedPlayId, {
        name: editPlayName.trim(),
        description: editPlayDesc.trim() || undefined,
      });
      setSelectedPlay(updated);
      setPlays((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setToast('Play updated');
    } catch {
      setToast('Failed to update play');
    } finally {
      setSavingPlay(false);
    }
  };

  const handleDeletePlay = async () => {
    if (!selectedPlayId) return;
    const ok = await confirm({
      title: 'Delete play?',
      message: `"${selectedPlay?.name ?? 'This play'}" and its enrollments will be permanently removed.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setDeletingPlay(true);
    try {
      await Abm.deletePlay(selectedPlayId);
      setPlays((prev) => prev.filter((p) => p.id !== selectedPlayId));
      setToast('Play deleted');
      closePlayDrawer();
    } catch {
      setToast('Failed to delete play');
    } finally {
      setDeletingPlay(false);
    }
  };

  const handleRecommendPlay = async () => {
    if (!detail) return;
    setRecommendingPlay(true);
    try {
      const res = await Abm.recommendPlay(detail.id);
      setRecommendedPlay(res);
      setToast('Play recommended');
    } catch {
      setToast('Failed to recommend play');
    } finally {
      setRecommendingPlay(false);
    }
  };

  const handleSuggestPlay = async () => {
    setSuggesting(true);
    setSuggestOpen(true);
    setSuggestion(null);
    try {
      const res = await api<Record<string, unknown>>(`/abm/suggest-play?tier=${suggestTier}`, { method: 'POST', workspace: true });
      setSuggestion(res);
    } catch {
      setToast('Failed to suggest play');
      setSuggestOpen(false);
    } finally {
      setSuggesting(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedPlayId || !enrollingAccountId) return;
    try {
      const enrollment = await Abm.enrollAccount(selectedPlayId, enrollingAccountId);
      setPlayEnrollments((prev) => [enrollment, ...prev]);
      setEnrollingAccountId('');
      setToast('Account enrolled');
    } catch {
      setToast('Failed to enroll account');
    }
  };

  const handleAdvanceEnrollment = async (enrollmentId: string, action: string) => {
    try {
      const updated = await Abm.advanceEnrollment(enrollmentId, action);
      setPlayEnrollments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setToast(`Enrollment ${action}d`);
    } catch {
      setToast('Failed to update enrollment');
    }
  };

  if (!activeWorkspace) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, maxWidth: 440 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
              <BusinessIcon sx={{ fontSize: 32, color: BRAND.teal }} />
            </Box>
            <Typography fontWeight={900} variant="h6">No workspace selected</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={320}>
              Pick a workspace to start targeting high-value accounts with Account-Based Marketing.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Hero */}
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
          <Box maxWidth={720}>
            <Chip icon={<BoltIcon />} label="Account-based cockpit" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Account-Based Marketing
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 640 }}>
              Target high-value accounts: score ICP fit, track intent signals, orchestrate multi-step plays, and move them stage by stage.
            </Typography>
          </Box>
          <Stack spacing={1.2} sx={{ minWidth: { md: 240 } }}>
            <Stack direction="row" spacing={1}>
              <Button startIcon={<AddIcon />} variant="contained" onClick={() => { resetForm(); setOpen(true); }}
                sx={{ flex: 1, borderRadius: 3, py: 1.2, textTransform: 'none', fontWeight: 900, color: INK, background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)` }}>
                Add account
              </Button>
              <Tooltip title="Rescore all accounts">
                <Button
                  variant="outlined"
                  onClick={handleScoreAll}
                  disabled={scoring}
                  sx={{ borderRadius: 3, minWidth: 48, borderColor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { borderColor: 'rgba(255,255,255,0.4)' } }}
                >
                  {scoring ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                </Button>
              </Tooltip>
            </Stack>
            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{accounts.length}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>Target accounts</Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 800, minWidth: 'auto', px: 2.5 } }}>
        <Tab label="Pipeline" />
        <Tab label="Priority matrix" />
        <Tab label="Plays" />
      </Tabs>

      {/* Tab 0: Pipeline */}
      {mainTab === 0 && (
        <>
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}><CircularProgress size={28} /></Box>
          ) : accounts.length === 0 ? (
            <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, overflow: 'hidden' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
                <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
                  <GroupsIcon sx={{ fontSize: 36, color: BRAND.teal }} />
                </Box>
                <Typography fontWeight={900} variant="h6">No target accounts yet</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
                  Add the companies you want to win. Then score, prioritize, and orchestrate plays.
                </Typography>
                <Button startIcon={<AddIcon />} variant="outlined" onClick={() => { resetForm(); setOpen(true); }} sx={{ mt: 1, borderRadius: 3, textTransform: 'none', fontWeight: 800 }}>
                  Add first account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ overflowX: 'auto', pb: 1 }}>
              <Stack direction="row" spacing={2} sx={{ minWidth: 1080 }}>
                {STAGES.map((col) => {
                  const items = byStage[col.key];
                  return (
                    <Box key={col.key} sx={{ flex: 1, minWidth: 240 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, mb: 1.2 }}>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.accent }} />
                          <Typography fontWeight={900} sx={{ color: INK, fontSize: 13.5 }}>{col.label}</Typography>
                        </Stack>
                        <Chip label={items.length} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 800, bgcolor: `${col.accent}14`, color: col.accent }} />
                      </Stack>
                      <Stack
                        spacing={1.2}
                        sx={{
                          p: 1.2, borderRadius: 3, bgcolor: CANVAS, border: `1px solid ${BORDER}`,
                          minHeight: 120, borderTop: `3px solid ${col.accent}`,
                        }}
                      >
                        {items.length === 0 ? (
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                            No accounts
                          </Typography>
                        ) : (
                          items.map((acc) => {
                            const tm = tierMeta(acc.tier);
                            return (
                              <Card
                                key={acc.id}
                                onClick={() => setSelectedId(acc.id)}
                                sx={{
                                  borderRadius: 3, border: `1px solid ${BORDER}`, cursor: 'pointer',
                                  boxShadow: '0 6px 16px rgba(17,21,27,0.04)',
                                  transition: 'transform .15s, box-shadow .15s',
                                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 32px rgba(17,21,27,0.10)' },
                                }}
                              >
                                <CardContent sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}>
                                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                                    <Typography fontWeight={900} sx={{ color: INK, fontSize: 14, lineHeight: 1.3 }}>
                                      {acc.company}
                                    </Typography>
                                    <Tooltip title="Delete">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(acc); }}
                                        sx={{ mt: -0.6, mr: -0.6, color: 'error.main' }}
                                      >
                                        <DeleteIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                  <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ mt: 0.8 }}>
                                    <Chip label={tm.label} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: `${tm.accent}18`, color: tm.accent }} />
                                    {acc.industry && (
                                      <Chip label={acc.industry} size="small" variant="outlined" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, borderColor: BORDER, color: SUBTLE }} />
                                    )}
                                  </Stack>
                                  {/* Fit / Intent mini-bars */}
                                  {(acc.fit_score != null || acc.intent_score != null) && (
                                    <Stack spacing={0.4} sx={{ mt: 1 }}>
                                      {acc.fit_score != null && (
                                        <Stack direction="row" alignItems="center" gap={0.5}>
                                          <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: SUBTLE, width: 26, textTransform: 'uppercase' }}>Fit</Typography>
                                          <ScoreBar value={acc.fit_score} color={BRAND.teal} />
                                        </Stack>
                                      )}
                                      {acc.intent_score != null && (
                                        <Stack direction="row" alignItems="center" gap={0.5}>
                                          <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: SUBTLE, width: 26, textTransform: 'uppercase' }}>Int</Typography>
                                          <ScoreBar value={acc.intent_score} color={BRAND.amber} />
                                        </Stack>
                                      )}
                                    </Stack>
                                  )}
                                  <TextField
                                    select
                                    size="small"
                                    fullWidth
                                    value={acc.stage}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleStageChange(acc, e.target.value as AbmStage)}
                                    sx={{ mt: 1.2, '& .MuiInputBase-input': { fontSize: 12, fontWeight: 700, py: 0.6 } }}
                                  >
                                    {STAGES.map((s) => (
                                      <MenuItem key={s.key} value={s.key} sx={{ fontSize: 12.5 }}>{s.label}</MenuItem>
                                    ))}
                                  </TextField>
                                </CardContent>
                              </Card>
                            );
                          })
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </>
      )}

      {/* Tab 1: Priority Matrix */}
      {mainTab === 1 && (
        <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <ScatterPlotIcon sx={{ color: BRAND.teal }} />
                <Typography fontWeight={900} sx={{ color: INK }}>Fit vs Intent Priority Matrix</Typography>
              </Stack>
              <Stack direction="row" gap={1}>
                {TIERS.map((t) => (
                  <Chip key={t.key} label={t.label} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: `${t.accent}18`, color: t.accent }} />
                ))}
              </Stack>
            </Stack>
            {matrixData.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No scored accounts yet. Click "Rescore" to compute fit and intent scores.
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis
                    type="number" dataKey="fit_score" name="ICP Fit"
                    domain={[0, 100]}
                    label={{ value: 'ICP Fit Score', position: 'insideBottom', offset: -10, style: { fontSize: 12, fontWeight: 800, fill: SUBTLE } }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="number" dataKey="intent_score" name="Intent"
                    domain={[0, 100]}
                    label={{ value: 'Intent Score', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12, fontWeight: 800, fill: SUBTLE } }}
                    tick={{ fontSize: 11 }}
                  />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload as AbmMatrixPoint;
                      return (
                        <Box sx={{ p: 1.5, bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                          <Typography sx={{ fontWeight: 900, fontSize: 13, color: INK }}>{d.company}</Typography>
                          <Typography sx={{ fontSize: 11, color: SUBTLE }}>Fit: {d.fit_score} | Intent: {d.intent_score}</Typography>
                          <Chip label={d.tier.replace('_', ' ')} size="small" sx={{ mt: 0.5, height: 18, fontSize: 10, fontWeight: 800, bgcolor: `${TIER_COLORS[d.tier] || SUBTLE}18`, color: TIER_COLORS[d.tier] || SUBTLE }} />
                        </Box>
                      );
                    }}
                  />
                  <Scatter data={matrixData} fill={BRAND.teal}>
                    {matrixData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={TIER_COLORS[entry.tier] || SUBTLE} r={7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Plays */}
      {mainTab === 2 && (
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={900} sx={{ color: INK }}>ABM Plays</Typography>
            <Stack direction="row" gap={1}>
              <Button startIcon={<TipsIcon />} variant="outlined" onClick={handleSuggestPlay} disabled={suggesting}
                sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, borderColor: BORDER, color: INK }}>
                Suggest play
              </Button>
              <Button startIcon={<AddIcon />} variant="contained" onClick={() => setPlayOpen(true)}
                sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 900, color: INK, background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)` }}>
                New play
              </Button>
            </Stack>
          </Stack>
          {playsLoading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 120 }}><CircularProgress size={24} /></Box>
          ) : plays.length === 0 ? (
            <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}` }}>
              <CardContent sx={{ textAlign: 'center', py: 5 }}>
                <Typography variant="body2" color="text.secondary">No plays yet. Create a multi-step play to orchestrate outreach.</Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {plays.map((play) => (
                <Grid key={play.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    onClick={() => handleSelectPlay(play.id)}
                    sx={{
                      borderRadius: 3, border: `1px solid ${BORDER}`, cursor: 'pointer',
                      transition: 'transform .15s, box-shadow .15s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 32px rgba(17,21,27,0.10)' },
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography fontWeight={900} sx={{ color: INK, fontSize: 14 }}>{play.name}</Typography>
                      {play.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 12 }}>
                          {play.description.slice(0, 100)}{play.description.length > 100 ? '...' : ''}
                        </Typography>
                      )}
                      <Stack direction="row" gap={0.6} sx={{ mt: 1 }}>
                        <Chip label={play.status} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: play.status === 'active' ? `${BRAND.teal}18` : `${SUBTLE}14`, color: play.status === 'active' ? BRAND.teal : SUBTLE }} />
                        {play.step_summary && (
                          <Chip label={`${play.step_summary.length} steps`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: `${BRAND.amber}18`, color: BRAND.amber }} />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      )}

      {/* Add account dialog */}
      <PremiumDialog open={open} onClose={() => setOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<BusinessRoundedIcon />}
          title="Add target account"
          subtitle="Build your named-account list to run tailored plays."
          onClose={() => setOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={(_, v) => v && setMode(v)}
            sx={{
              mb: 2.5,
              '& .MuiToggleButton-root': {
                textTransform: 'none', fontWeight: 800, px: 2, py: 0.5,
                borderRadius: '999px !important', border: '1px solid rgba(14,17,22,0.08)', mx: 0.25, color: SUBTLE,
                '&.Mui-selected': { background: INK, color: '#fff', '&:hover': { background: '#000' } },
              },
            }}
          >
            <ToggleButton value="single">Single</ToggleButton>
            <ToggleButton value="bulk">Bulk add</ToggleButton>
          </ToggleButtonGroup>
          {mode === 'single' ? (
            <>
              <SectionLabel>Account details</SectionLabel>
              <FieldGrid columns={2}>
                <FullSpan>
                  <TextField label="Company" placeholder="e.g. Acme Corp" value={company} onChange={(e) => setCompany(e.target.value)} fullWidth size="small" autoFocus required />
                </FullSpan>
                <TextField label="Website (optional)" placeholder="https://acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} fullWidth size="small" />
                <TextField label="Industry (optional)" placeholder="e.g. SaaS" value={industry} onChange={(e) => setIndustry(e.target.value)} fullWidth size="small" />
                <TextField select label="Tier" value={tier} onChange={(e) => setTier(e.target.value as AbmTier)} fullWidth size="small">
                  {TIERS.map((t) => (<MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>))}
                </TextField>
                <FullSpan>
                  <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth size="small" multiline minRows={2} />
                </FullSpan>
              </FieldGrid>
            </>
          ) : (
            <>
              <SectionLabel>Bulk add accounts</SectionLabel>
              <Stack spacing={2.25}>
                <TextField label="Company names" placeholder={'One company per line\nAcme Corp\nGlobex\nInitech'} value={bulkText} onChange={(e) => setBulkText(e.target.value)} fullWidth size="small" multiline minRows={6} autoFocus helperText="Each line becomes a new account at the selected tier." />
                <TextField select label="Tier for all" value={tier} onChange={(e) => setTier(e.target.value as AbmTier)} fullWidth size="small">
                  {TIERS.map((t) => (<MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>))}
                </TextField>
              </Stack>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} disabled={creating} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || (mode === 'single' ? !company.trim() : !bulkText.trim())} startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined} sx={inkPillSx}>
            {creating ? 'Adding...' : mode === 'single' ? 'Add account' : 'Add accounts'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Create play dialog */}
      <PremiumDialog open={playOpen} onClose={() => setPlayOpen(false)} maxWidth="md">
        <DialogHero icon={<PlayArrowIcon />} title="Create ABM play" subtitle="Design a multi-step outreach sequence for target accounts." onClose={() => setPlayOpen(false)} tint={BRAND.tealDeep} tintSoft={BRAND.tealSoft} />
        <DialogBody>
          <SectionLabel>Play details</SectionLabel>
          <FieldGrid columns={1}>
            <TextField label="Play name" value={playName} onChange={(e) => setPlayName(e.target.value)} fullWidth size="small" autoFocus required />
            <TextField label="Description (optional)" value={playDesc} onChange={(e) => setPlayDesc(e.target.value)} fullWidth size="small" multiline minRows={2} />
          </FieldGrid>
          <SectionLabel>Steps</SectionLabel>
          <Stack spacing={1.5}>
            {playSteps.map((step, i) => (
              <Card key={i} sx={{ borderRadius: 2, border: `1px solid ${BORDER}`, p: 1.5 }}>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <TextField select label="Channel" value={step.channel} onChange={(e) => { const ns = [...playSteps]; ns[i].channel = e.target.value; setPlaySteps(ns); }} size="small" sx={{ minWidth: 120 }}>
                    {['email', 'linkedin', 'ad', 'content', 'task', 'call'].map((c) => (<MenuItem key={c} value={c}>{prettyKey(c)}</MenuItem>))}
                  </TextField>
                  <TextField label="Subject" value={step.subject} onChange={(e) => { const ns = [...playSteps]; ns[i].subject = e.target.value; setPlaySteps(ns); }} size="small" sx={{ flex: 1, minWidth: 160 }} />
                  <TextField label="Delay (days)" type="number" value={step.delay_days} onChange={(e) => { const ns = [...playSteps]; ns[i].delay_days = Number(e.target.value) || 0; setPlaySteps(ns); }} size="small" sx={{ width: 100 }} />
                  <IconButton size="small" onClick={() => setPlaySteps((prev) => prev.filter((_, j) => j !== i))} disabled={playSteps.length <= 1}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
                <TextField label="Body" value={step.body} onChange={(e) => { const ns = [...playSteps]; ns[i].body = e.target.value; setPlaySteps(ns); }} size="small" fullWidth multiline minRows={2} sx={{ mt: 1 }} />
              </Card>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => setPlaySteps((prev) => [...prev, { channel: 'email', subject: '', body: '', delay_days: 0 }])} sx={{ textTransform: 'none', fontWeight: 800 }}>
              Add step
            </Button>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setPlayOpen(false)} disabled={creatingPlay} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={handleCreatePlay} disabled={creatingPlay || !playName.trim()} startIcon={creatingPlay ? <CircularProgress size={14} color="inherit" /> : undefined} sx={inkPillSx}>
            {creatingPlay ? 'Creating...' : 'Create play'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Play detail drawer */}
      <Drawer anchor="right" open={!!selectedPlayId} onClose={closePlayDrawer} PaperProps={{ sx: { width: { xs: '100%', sm: 480, md: 560 }, bgcolor: '#fff' } }}>
        {!selectedPlay ? (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}><CircularProgress size={28} /></Box>
        ) : (
          <Box>
            <Box sx={{ p: 3, background: 'linear-gradient(135deg, #11151B 0%, #1B2330 100%)', color: '#fff', position: 'relative' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h5" fontWeight={950}>{selectedPlay.name}</Typography>
                  {selectedPlay.description && <Typography sx={{ mt: 0.5, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{selectedPlay.description}</Typography>}
                  <Chip label={selectedPlay.status} size="small" sx={{ mt: 1, height: 22, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }} />
                </Box>
                <Stack direction="row" gap={0.5}>
                  <Tooltip title="Delete play">
                    <IconButton onClick={handleDeletePlay} disabled={deletingPlay} sx={{ color: '#fff' }}>
                      {deletingPlay ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                    </IconButton>
                  </Tooltip>
                  <IconButton onClick={closePlayDrawer} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
                </Stack>
              </Stack>
            </Box>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                {/* Edit play */}
                <Box>
                  <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Edit play</Typography>
                  <Stack spacing={1.5}>
                    <TextField label="Name" value={editPlayName} onChange={(e) => setEditPlayName(e.target.value)} fullWidth size="small" />
                    <TextField label="Description" value={editPlayDesc} onChange={(e) => setEditPlayDesc(e.target.value)} fullWidth size="small" multiline minRows={2} />
                    <Button onClick={handleSavePlay} startIcon={savingPlay ? <CircularProgress size={14} color="inherit" /> : <EditIcon />}
                      disabled={savingPlay || !editPlayName.trim() || (editPlayName.trim() === selectedPlay.name && editPlayDesc.trim() === (selectedPlay.description ?? ''))}
                      sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
                      Save changes
                    </Button>
                  </Stack>
                </Box>

                <Divider sx={{ borderColor: BORDER }} />

                {/* Steps */}
                <Box>
                  <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Steps</Typography>
                  {playStepsLoading ? (
                    <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}><CircularProgress size={20} /></Box>
                  ) : playStepsDetail.length > 0 ? (
                    <Stack spacing={1}>
                      {playStepsDetail.map((s, i) => (
                        <Box key={s.id} sx={{ p: 1.4, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                          <Stack direction="row" alignItems="center" gap={1}>
                            <Chip label={`${s.ordinal ?? i + 1}`} size="small" sx={{ height: 22, width: 22, fontSize: 11, fontWeight: 800, bgcolor: `${BRAND.teal}18`, color: BRAND.teal }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase' }}>{s.channel}</Typography>
                            <Chip label={`+${s.delay_days}d`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: `${BRAND.amber}18`, color: BRAND.amber }} />
                          </Stack>
                          {s.subject && <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK, mt: 0.5 }}>{s.subject}</Typography>}
                          {s.body && <Typography sx={{ fontSize: 12, color: SUBTLE, mt: 0.3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.body}</Typography>}
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No steps defined.</Typography>
                  )}

                  {/* Add step form */}
                  <Card sx={{ borderRadius: 2, border: `1px dashed ${BORDER}`, p: 1.5, mt: 1.5 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4, mb: 1 }}>Add step</Typography>
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      <TextField select label="Channel" value={addStepForm.channel} onChange={(e) => setAddStepForm((f) => ({ ...f, channel: e.target.value }))} size="small" sx={{ minWidth: 120 }}>
                        {['email', 'linkedin', 'ad', 'content', 'task', 'call'].map((c) => (<MenuItem key={c} value={c}>{prettyKey(c)}</MenuItem>))}
                      </TextField>
                      <TextField label="Subject" value={addStepForm.subject} onChange={(e) => setAddStepForm((f) => ({ ...f, subject: e.target.value }))} size="small" sx={{ flex: 1, minWidth: 160 }} />
                      <TextField label="Delay (days)" type="number" value={addStepForm.delay_days} onChange={(e) => setAddStepForm((f) => ({ ...f, delay_days: Number(e.target.value) || 0 }))} size="small" sx={{ width: 100 }} />
                    </Stack>
                    <TextField label="Body" value={addStepForm.body} onChange={(e) => setAddStepForm((f) => ({ ...f, body: e.target.value }))} size="small" fullWidth multiline minRows={2} sx={{ mt: 1 }} />
                    <Button onClick={handleAddStep} startIcon={addingStep ? <CircularProgress size={14} color="inherit" /> : <AddIcon />} disabled={addingStep || !addStepForm.channel.trim()}
                      sx={{ mt: 1, textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
                      Add step
                    </Button>
                  </Card>
                </Box>

                <Divider sx={{ borderColor: BORDER }} />

                {/* Enrollments */}
                <Box>
                  <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Enrolled accounts</Typography>
                  <Stack direction="row" gap={1} sx={{ mb: 1.5 }}>
                    <TextField select label="Account" value={enrollingAccountId} onChange={(e) => setEnrollingAccountId(e.target.value)} size="small" sx={{ flex: 1 }}>
                      {accounts.map((a) => (<MenuItem key={a.id} value={a.id}>{a.company}</MenuItem>))}
                    </TextField>
                    <Button variant="contained" size="small" onClick={handleEnroll} disabled={!enrollingAccountId} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, background: BRAND.teal, color: '#fff' }}>
                      Enroll
                    </Button>
                  </Stack>
                  {playEnrollments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No accounts enrolled yet.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {playEnrollments.map((e) => {
                        const acct = accounts.find((a) => a.id === e.account_id);
                        return (
                          <Card key={e.id} sx={{ borderRadius: 2, border: `1px solid ${BORDER}` }}>
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography fontWeight={800} sx={{ fontSize: 13, color: INK }}>{acct?.company || 'Unknown'}</Typography>
                                  <Stack direction="row" gap={0.5} sx={{ mt: 0.4 }}>
                                    <Chip label={e.status} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: e.status === 'active' ? `${BRAND.teal}18` : e.status === 'completed' ? `${BRAND.tealDeep}18` : `${SUBTLE}14`, color: e.status === 'active' ? BRAND.teal : e.status === 'completed' ? BRAND.tealDeep : SUBTLE }} />
                                    <Chip label={`Step ${e.current_step}`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: `${BRAND.amber}18`, color: BRAND.amber }} />
                                  </Stack>
                                </Box>
                                <Stack direction="row" gap={0.3}>
                                  {e.status !== 'completed' && e.status !== 'skipped' && (
                                    <>
                                      <Tooltip title="Advance">
                                        <IconButton size="small" onClick={() => handleAdvanceEnrollment(e.id, 'advance')}><SkipNextIcon sx={{ fontSize: 16, color: BRAND.teal }} /></IconButton>
                                      </Tooltip>
                                      {e.status === 'active' ? (
                                        <Tooltip title="Pause">
                                          <IconButton size="small" onClick={() => handleAdvanceEnrollment(e.id, 'pause')}><PauseIcon sx={{ fontSize: 16, color: BRAND.amber }} /></IconButton>
                                        </Tooltip>
                                      ) : e.status === 'paused' ? (
                                        <Tooltip title="Resume">
                                          <IconButton size="small" onClick={() => handleAdvanceEnrollment(e.id, 'resume')}><PlayArrowIcon sx={{ fontSize: 16, color: BRAND.teal }} /></IconButton>
                                        </Tooltip>
                                      ) : null}
                                      <Tooltip title="Complete">
                                        <IconButton size="small" onClick={() => handleAdvanceEnrollment(e.id, 'complete')}><CheckCircleIcon sx={{ fontSize: 16, color: BRAND.tealDeep }} /></IconButton>
                                      </Tooltip>
                                    </>
                                  )}
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Account detail drawer */}
      <Drawer anchor="right" open={!!selectedId} onClose={() => setSelectedId(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480, md: 560 }, bgcolor: '#fff' } }}>
        {detailLoading || !detail ? (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}><CircularProgress size={28} /></Box>
        ) : (
          <Box>
            <Box sx={{ p: 3, background: 'linear-gradient(135deg, #11151B 0%, #1B2330 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,175,6,0.28), transparent 65%)' }} />
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ position: 'relative' }}>
                <Box>
                  <Typography variant="h5" fontWeight={950}>{detail.company}</Typography>
                  <Stack direction="row" gap={0.8} flexWrap="wrap" sx={{ mt: 1 }}>
                    <Chip label={tierMeta(detail.tier).label} size="small" sx={{ height: 22, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }} />
                    <Chip label={STAGE_LABEL[detail.stage]} size="small" sx={{ height: 22, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }} />
                    {detail.industry && <Chip label={detail.industry} size="small" sx={{ height: 22, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.10)', color: '#fff' }} />}
                  </Stack>
                  {detail.website && (
                    <Button href={detail.website.startsWith('http') ? detail.website : `https://${detail.website}`} target="_blank" rel="noopener noreferrer" component="a" size="small" endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                      sx={{ mt: 1, textTransform: 'none', color: 'rgba(255,255,255,0.85)', p: 0, fontWeight: 700 }}>
                      {detail.website}
                    </Button>
                  )}
                </Box>
                <IconButton onClick={() => setSelectedId(null)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
              </Stack>
            </Box>

            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                {/* Recommend play */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography fontWeight={900} sx={{ color: INK }}>Play recommendation</Typography>
                    <Button onClick={handleRecommendPlay} disabled={recommendingPlay} variant="contained" size="small"
                      startIcon={recommendingPlay ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})`, color: INK }}>
                      {recommendingPlay ? 'Thinking...' : 'Recommend play'}
                    </Button>
                  </Stack>
                  {recommendedPlay ? (
                    <Box sx={{ p: 1.6, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                      <PlaySuggestionView data={recommendedPlay} />
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Get an AI-recommended outreach play tailored to this account.
                    </Typography>
                  )}
                </Box>

                {/* Score breakdown */}
                <Box>
                  <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Score breakdown</Typography>
                  {accountScoreLoading ? (
                    <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}><CircularProgress size={20} /></Box>
                  ) : (() => {
                    const sc = accountScore as { fit_score?: number; intent_score?: number; fit_factors?: Record<string, { score: number; weight: number; reason: string }> } | null;
                    const factors = sc?.fit_factors;
                    if (!sc || !factors || Object.keys(factors).length === 0) {
                      return <Typography variant="body2" color="text.secondary">No score breakdown yet. Rescore accounts to compute fit factors.</Typography>;
                    }
                    return (
                      <Stack spacing={0.8}>
                        {typeof sc.fit_score === 'number' && (
                          <Box sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>Overall ICP fit</Typography>
                            <ScoreBar value={sc.fit_score} color={BRAND.teal} />
                          </Box>
                        )}
                        {Object.entries(factors).map(([k, v]) => (
                          <Box key={k} sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{prettyKey(k)}</Typography>
                              <Chip label={`Weight ${v.weight}%`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: `${SUBTLE}14`, color: SUBTLE }} />
                            </Stack>
                            <ScoreBar value={v.score} color={v.score >= 50 ? BRAND.teal : v.score > 0 ? BRAND.amber : SUBTLE} />
                            {v.reason && <Typography sx={{ fontSize: 11, color: SUBTLE, mt: 0.4 }}>{v.reason}</Typography>}
                          </Box>
                        ))}
                      </Stack>
                    );
                  })()}
                </Box>

                {/* Account enrollments */}
                <Box>
                  <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Play enrollments</Typography>
                  {accountEnrollments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Not enrolled in any plays yet.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {accountEnrollments.map((e) => {
                        const pl = plays.find((p) => p.id === e.play_id);
                        return (
                          <Box key={e.id} sx={{ p: 1.4, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography sx={{ fontSize: 13, fontWeight: 800, color: INK }}>{pl?.name ?? e.play_id}</Typography>
                              <Stack direction="row" gap={0.5}>
                                <Chip label={e.status} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: e.status === 'active' ? `${BRAND.teal}18` : e.status === 'completed' ? `${BRAND.tealDeep}18` : `${SUBTLE}14`, color: e.status === 'active' ? BRAND.teal : e.status === 'completed' ? BRAND.tealDeep : SUBTLE }} />
                                <Chip label={`Step ${e.current_step}`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: `${BRAND.amber}18`, color: BRAND.amber }} />
                              </Stack>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>

                <Divider sx={{ borderColor: BORDER }} />

                {/* Scores */}
                {(detail.fit_score != null || detail.intent_score != null) && (
                  <Box>
                    <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Scores</Typography>
                    <Grid container spacing={1.5}>
                      {detail.fit_score != null && (
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ p: 1.6, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4 }}>ICP Fit</Typography>
                            <Typography sx={{ fontSize: 24, fontWeight: 950, color: BRAND.teal, mt: 0.3 }}>{Math.round(detail.fit_score)}</Typography>
                            <ScoreBar value={detail.fit_score} color={BRAND.teal} />
                          </Box>
                        </Grid>
                      )}
                      {detail.intent_score != null && (
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ p: 1.6, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4 }}>Intent</Typography>
                            <Typography sx={{ fontSize: 24, fontWeight: 950, color: BRAND.amber, mt: 0.3 }}>{Math.round(detail.intent_score)}</Typography>
                            <ScoreBar value={detail.intent_score} color={BRAND.amber} />
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {/* Fit factor breakdown */}
                {detail.fit_factors && Object.keys(detail.fit_factors).length > 0 && (
                  <Box>
                    <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Fit factor breakdown</Typography>
                    <Stack spacing={0.8}>
                      {Object.entries(detail.fit_factors).map(([k, v]) => (
                        <Box key={k} sx={{ p: 1.2, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{prettyKey(k)}</Typography>
                            <Chip label={`${v.score}/100`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: v.score >= 50 ? `${BRAND.teal}18` : v.score > 0 ? `${BRAND.amber}18` : `${SUBTLE}14`, color: v.score >= 50 ? BRAND.teal : v.score > 0 ? BRAND.amber : SUBTLE }} />
                          </Stack>
                          <Typography sx={{ fontSize: 11, color: SUBTLE, mt: 0.3 }}>
                            Weight: {v.weight}% | {v.reason}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {(detail.fit_score != null || (detail.fit_factors && Object.keys(detail.fit_factors).length > 0)) && <Divider sx={{ borderColor: BORDER }} />}

                {/* Firmographics */}
                <Box>
                  <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Firmographics</Typography>
                  {detail.firmographics && Object.keys(detail.firmographics).length > 0 ? (
                    <Grid container spacing={1}>
                      {Object.entries(detail.firmographics).map(([k, v]) => (
                        <Grid key={k} size={{ xs: 6 }}>
                          <Box sx={{ p: 1.4, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                            <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{prettyKey(k)}</Typography>
                            <Typography sx={{ color: INK, fontSize: 13, fontWeight: 600, mt: 0.3 }}>{renderValue(v)}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No firmographic data yet.</Typography>
                  )}
                </Box>

                <Divider sx={{ borderColor: BORDER }} />

                {/* Notes */}
                <Box>
                  <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Notes</Typography>
                  <TextField value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} fullWidth multiline minRows={3} placeholder="Account context, signals, champions..." />
                  <Button onClick={handleSaveNotes} disabled={savingNotes || draftNotes === (detail.notes ?? '')} startIcon={savingNotes ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                    sx={{ mt: 1, textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
                    Save notes
                  </Button>
                </Box>

                <Divider sx={{ borderColor: BORDER }} />

                {/* Personas */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography fontWeight={900} sx={{ color: INK }}>Buying committee</Typography>
                    <Button onClick={handleGeneratePersonas} disabled={genPersonas} variant="contained" size="small"
                      startIcon={genPersonas ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})`, color: INK }}>
                      {genPersonas ? 'Generating...' : 'Generate personas'}
                    </Button>
                  </Stack>
                  {detail.personas && detail.personas.length > 0 ? (
                    <Stack spacing={1.5}>
                      {detail.personas.map((p: Persona, i) => (
                        <Card key={`${p.role}-${i}`} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, boxShadow: 'none' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Stack direction="row" alignItems="center" gap={1}>
                              <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
                                <GroupsIcon sx={{ fontSize: 18, color: BRAND.teal }} />
                              </Box>
                              <Box>
                                <Typography fontWeight={900} sx={{ color: INK, fontSize: 14 }}>{p.role}</Typography>
                                <Typography variant="caption" color="text.secondary">{p.title}</Typography>
                              </Box>
                            </Stack>
                            <PersonaList label="Pains" items={p.pains} accent={BRAND.pink} />
                            <PersonaList label="Priorities" items={p.priorities} accent={BRAND.teal} />
                            <PersonaList label="Objections" items={p.objections} accent={BRAND.amber} />
                            {p.message_angle && (
                              <Box sx={{ mt: 1.2, p: 1.2, borderRadius: 2, bgcolor: `${BRAND.amber}10`, border: `1px solid ${BRAND.amber}33` }}>
                                <Typography variant="caption" sx={{ color: BRAND.amberDeep, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>Message angle</Typography>
                                <Typography sx={{ color: INK, fontSize: 13, mt: 0.3 }}>{p.message_angle}</Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No personas yet. Generate the buying committee to map roles, pains and message angles.
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ borderColor: BORDER }} />

                {/* Assets */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography fontWeight={900} sx={{ color: INK }}>Outreach assets</Typography>
                    <Button onClick={handleGenerateAssets} disabled={genAssets} variant="contained" size="small"
                      startIcon={genAssets ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})`, color: INK }}>
                      {genAssets ? 'Generating...' : 'Generate assets'}
                    </Button>
                  </Stack>
                  {detail.assets && Object.keys(detail.assets).length > 0 ? (
                    <Stack spacing={1.2}>
                      {Object.entries(detail.assets).map(([k, v]) => (
                        <Box key={k} sx={{ p: 1.6, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                          <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{prettyKey(k)}</Typography>
                          <Typography sx={{ color: INK, fontSize: 13, mt: 0.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {renderValue(v)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No assets yet. Generate tailored outreach copy for this account.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Suggest play dialog */}
      <PremiumDialog open={suggestOpen} onClose={() => setSuggestOpen(false)} maxWidth="sm">
        <DialogHero icon={<TipsIcon />} title="Suggested play" subtitle="An AI-generated play template based on account tier." onClose={() => setSuggestOpen(false)} tint={BRAND.tealDeep} tintSoft={BRAND.tealSoft} />
        <DialogBody>
          <SectionLabel>Tier</SectionLabel>
          <TextField select value={suggestTier} onChange={(e) => setSuggestTier(e.target.value as AbmTier)} fullWidth size="small" sx={{ mb: 2 }}>
            {TIERS.map((t) => (<MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>))}
          </TextField>
          {suggesting ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : suggestion ? (
            <PlaySuggestionView data={suggestion} />
          ) : (
            <Typography variant="body2" color="text.secondary">No suggestion yet.</Typography>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setSuggestOpen(false)} sx={ghostPillSx}>Close</Button>
          <Button onClick={handleSuggestPlay} disabled={suggesting} startIcon={suggesting ? <CircularProgress size={14} color="inherit" /> : <TipsIcon />} sx={inkPillSx}>
            {suggesting ? 'Suggesting...' : 'Regenerate'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}

function PersonaList({ label, items, accent }: { label: string; items: string[]; accent: string }) {
  if (!items || items.length === 0) return null;
  return (
    <Box sx={{ mt: 1.2 }}>
      <Typography variant="caption" sx={{ color: accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{label}</Typography>
      <Stack component="ul" sx={{ m: 0, mt: 0.4, pl: 2.2 }} spacing={0.2}>
        {items.map((it, i) => (
          <Typography key={`${label}-${i}`} component="li" sx={{ color: INK, fontSize: 12.5, lineHeight: 1.5 }}>{it}</Typography>
        ))}
      </Stack>
    </Box>
  );
}
