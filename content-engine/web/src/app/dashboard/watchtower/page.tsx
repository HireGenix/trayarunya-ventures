'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Link as MuiLink,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNewOutlined';
import RadarIcon from '@mui/icons-material/RadarOutlined';
import RadarRoundedIcon from '@mui/icons-material/RadarRounded';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import LanguageIcon from '@mui/icons-material/LanguageOutlined';
import TimelineIcon from '@mui/icons-material/TimelineOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreOutlined';
import LinkIcon from '@mui/icons-material/LinkOutlined';
import CompareArrowsIcon from '@mui/icons-material/CompareArrowsOutlined';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/lib/auth';
import {
  Watchtower,
  WatchtowerEnterprise,
  type CompetitorWatch,
  type WatchEvent,
  type WatchKind,
  type WatchImportance,
  type WatchTargetItem,
  type WatchDiffItem,
  type WatchDiffDetail,
  type WatchTimelinePoint,
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

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

const KIND_LABELS: Record<WatchKind, string> = {
  messaging: 'Messaging',
  pricing: 'Pricing',
  content: 'Content',
  launch: 'Launch',
  seo: 'SEO',
  hiring: 'Hiring',
  other: 'Other',
};

const KIND_COLORS: Record<WatchKind, string> = {
  messaging: BRAND.teal,
  pricing: BRAND.amber,
  content: '#6366F1',
  launch: BRAND.pink,
  seo: '#0EA5E9',
  hiring: '#8B5CF6',
  other: SUBTLE,
};

const IMPORTANCE_DOT: Record<WatchImportance, string> = {
  high: BRAND.pink,
  medium: BRAND.amber,
  low: BRAND.teal,
};

const IMPORTANCE_LABEL: Record<WatchImportance, string> = {
  high: 'High importance',
  medium: 'Medium importance',
  low: 'Low importance',
};

const ALL_KINDS: WatchKind[] = ['messaging', 'pricing', 'content', 'launch', 'seo', 'hiring', 'other'];

// status -> { label, color } for watch targets
const TARGET_STATUS: Record<string, { label: string; color: string }> = {
  awaiting_baseline: { label: 'Awaiting baseline', color: BRAND.amber },
  ok: { label: 'Tracking', color: BRAND.teal },
  fetch_failed: { label: 'Fetch failed', color: BRAND.pink },
};

function targetStatusMeta(status: string): { label: string; color: string } {
  return TARGET_STATUS[status] ?? { label: status.replace(/_/g, ' '), color: SUBTLE };
}

function shortDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function cleanUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}

function snapshotField(snap: Record<string, unknown> | null | undefined, key: string): string {
  if (!snap) return '';
  const v = snap[key];
  return typeof v === 'string' ? v : '';
}

export default function WatchtowerPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const [watches, setWatches] = useState<CompetitorWatch[]>([]);
  const [events, setEvents] = useState<WatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<WatchKind | null>(null);

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [seed, setSeed] = useState(true);

  // ── Enterprise target tracking ──
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [targets, setTargets] = useState<Record<string, WatchTargetItem[]>>({});
  const [targetsLoading, setTargetsLoading] = useState<Record<string, boolean>>({});
  const [checkingTargetId, setCheckingTargetId] = useState<string | null>(null);
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null);
  const [targetDiffs, setTargetDiffs] = useState<Record<string, WatchDiffItem[]>>({});
  const [targetDiffsLoading, setTargetDiffsLoading] = useState<Record<string, boolean>>({});

  // ── Add-URL dialog ──
  const [urlDialogFor, setUrlDialogFor] = useState<CompetitorWatch | null>(null);
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const [newTargetLabel, setNewTargetLabel] = useState('');
  const [addingTarget, setAddingTarget] = useState(false);

  // ── Timeline ──
  const [timelineWatchId, setTimelineWatchId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<WatchTimelinePoint[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // ── Diff viewer ──
  const [diffOpen, setDiffOpen] = useState(false);
  const [diff, setDiff] = useState<WatchDiffDetail | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffFallback, setDiffFallback] = useState<WatchEvent | null>(null);

  const load = () => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([
      Watchtower.list().catch(() => [] as CompetitorWatch[]),
      Watchtower.events().catch(() => [] as WatchEvent[]),
    ])
      .then(([w, e]) => {
        setWatches(w);
        setEvents(e);
        if (w.length && !timelineWatchId) setTimelineWatchId(w[0].id);
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [activeWorkspace]);

  const refreshEvents = () => {
    Watchtower.events().then(setEvents).catch(() => null);
  };

  // ── Timeline loading ──
  const loadTimeline = (watchId: string) => {
    setTimelineLoading(true);
    WatchtowerEnterprise.timeline(watchId, 90)
      .then(setTimeline)
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false));
  };

  useEffect(() => {
    if (timelineWatchId) loadTimeline(timelineWatchId);
    else setTimeline([]);
  }, [timelineWatchId]);

  // ── Targets ──
  const loadTargets = (watchId: string) => {
    setTargetsLoading((p) => ({ ...p, [watchId]: true }));
    WatchtowerEnterprise.listTargets(watchId)
      .then((t) => setTargets((p) => ({ ...p, [watchId]: t })))
      .catch(() => setTargets((p) => ({ ...p, [watchId]: [] })))
      .finally(() => setTargetsLoading((p) => ({ ...p, [watchId]: false })));
  };

  const toggleExpand = (w: CompetitorWatch) => {
    const next = expandedId === w.id ? null : w.id;
    setExpandedId(next);
    if (next) {
      setTimelineWatchId(w.id);
      if (!targets[w.id]) loadTargets(w.id);
    }
  };

  const loadTargetDiffs = (targetId: string) => {
    setTargetDiffsLoading((p) => ({ ...p, [targetId]: true }));
    WatchtowerEnterprise.targetDiffs(targetId, 20)
      .then((d) => setTargetDiffs((p) => ({ ...p, [targetId]: d })))
      .catch(() => setTargetDiffs((p) => ({ ...p, [targetId]: [] })))
      .finally(() => setTargetDiffsLoading((p) => ({ ...p, [targetId]: false })));
  };

  const toggleTargetDiffs = (target: WatchTargetItem) => {
    const next = expandedTargetId === target.id ? null : target.id;
    setExpandedTargetId(next);
    if (next && !targetDiffs[target.id]) loadTargetDiffs(target.id);
  };

  const handleAddTarget = async () => {
    if (!urlDialogFor || !newTargetUrl.trim()) return;
    setAddingTarget(true);
    try {
      const created = await WatchtowerEnterprise.createTarget(urlDialogFor.id, {
        url: newTargetUrl.trim(),
        label: newTargetLabel.trim() || undefined,
      });
      setTargets((p) => ({ ...p, [urlDialogFor.id]: [created, ...(p[urlDialogFor.id] ?? [])] }));
      setExpandedId(urlDialogFor.id);
      setUrlDialogFor(null);
      setNewTargetUrl('');
      setNewTargetLabel('');
      setToast('URL added — baseline will be captured on next scan.');
    } catch {
      setToast('Failed to add URL');
    } finally {
      setAddingTarget(false);
    }
  };

  const handleCheckTarget = async (target: WatchTargetItem) => {
    setCheckingTargetId(target.id);
    try {
      const res = await WatchtowerEnterprise.checkTarget(target.id);
      // refresh the parent watch's target list
      loadTargets(target.watch_id);
      if (res.ok && res.changed) {
        setToast('Change detected on tracked URL.');
        if (res.diff_id) openDiff(res.diff_id);
        if (expandedTargetId === target.id) loadTargetDiffs(target.id);
      } else if (res.ok) {
        setToast('No change since last snapshot.');
      } else {
        setToast('Scan failed for this URL.');
      }
      if (timelineWatchId === target.watch_id) loadTimeline(target.watch_id);
    } catch {
      setToast('Scan failed');
    } finally {
      setCheckingTargetId(null);
    }
  };

  const handleToggleTarget = async (target: WatchTargetItem) => {
    const next = !target.active;
    setTargets((p) => ({
      ...p,
      [target.watch_id]: (p[target.watch_id] ?? []).map((t) => (t.id === target.id ? { ...t, active: next } : t)),
    }));
    try {
      await WatchtowerEnterprise.updateTarget(target.id, { active: next });
    } catch {
      setTargets((p) => ({
        ...p,
        [target.watch_id]: (p[target.watch_id] ?? []).map((t) =>
          t.id === target.id ? { ...t, active: target.active } : t,
        ),
      }));
      setToast('Failed to update URL');
    }
  };

  const handleDeleteTarget = async (target: WatchTargetItem) => {
    const ok = await confirm({
      title: 'Remove tracked URL?',
      message: `"${target.label || cleanUrl(target.url)}" and its snapshots will be removed.`,
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await WatchtowerEnterprise.removeTarget(target.id);
      setTargets((p) => ({
        ...p,
        [target.watch_id]: (p[target.watch_id] ?? []).filter((t) => t.id !== target.id),
      }));
      setToast('URL removed');
    } catch {
      setToast('Failed to remove URL');
    }
  };

  // ── Diff viewer ──
  const openDiff = async (diffId: string) => {
    setDiffFallback(null);
    setDiff(null);
    setDiffLoading(true);
    setDiffOpen(true);
    try {
      const detail = await WatchtowerEnterprise.diffDetail(diffId);
      setDiff(detail);
    } catch {
      setDiff(null);
    } finally {
      setDiffLoading(false);
    }
  };

  const openEventDiff = async (e: WatchEvent) => {
    setDiff(null);
    setDiffFallback(null);
    setDiffLoading(true);
    setDiffOpen(true);
    try {
      const detail = await WatchtowerEnterprise.diffDetail(e.id);
      setDiff(detail);
    } catch {
      setDiffFallback(e);
    } finally {
      setDiffLoading(false);
    }
  };

  const closeDiff = () => {
    setDiffOpen(false);
    setDiff(null);
    setDiffFallback(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const social: Record<string, string> = {};
      if (linkedin.trim()) social.linkedin = linkedin.trim();
      if (twitter.trim()) social.twitter = twitter.trim();
      const created = await Watchtower.create({
        name: name.trim(),
        website: website.trim() || undefined,
        social_handles: Object.keys(social).length ? social : undefined,
        seed,
      });
      setWatches((prev) => [created, ...prev]);
      if (!timelineWatchId) setTimelineWatchId(created.id);
      setOpen(false);
      setName('');
      setWebsite('');
      setLinkedin('');
      setTwitter('');
      setSeed(true);
      setToast(seed ? 'Competitor added — initial snapshot generated.' : 'Competitor added to your watchtower.');
      refreshEvents();
    } catch {
      setToast('Failed to add competitor');
    } finally {
      setCreating(false);
    }
  };

  const handleCheck = async (w: CompetitorWatch) => {
    setCheckingId(w.id);
    try {
      const res = await Watchtower.check(w.id);
      if (res.ok) {
        setToast(
          res.events_created > 0
            ? `${res.events_created} new ${res.events_created === 1 ? 'change' : 'changes'} detected for ${w.name}.`
            : `No new changes for ${w.name}.`,
        );
      } else {
        setToast(res.error || `Scan failed for ${w.name}`);
      }
      const fresh = await Watchtower.list().catch(() => watches);
      setWatches(fresh);
      refreshEvents();
      if (timelineWatchId === w.id) loadTimeline(w.id);
    } catch {
      setToast('Scan failed');
    } finally {
      setCheckingId(null);
    }
  };

  const handleToggleActive = async (w: CompetitorWatch) => {
    const next = !w.active;
    setWatches((prev) => prev.map((x) => (x.id === w.id ? { ...x, active: next } : x)));
    try {
      await Watchtower.update(w.id, { active: next });
    } catch {
      setWatches((prev) => prev.map((x) => (x.id === w.id ? { ...x, active: w.active } : x)));
      setToast('Failed to update');
    }
  };

  const handleDelete = async (w: CompetitorWatch) => {
    const ok = await confirm({
      title: 'Delete competitor?',
      message: `"${w.name}" and all of its tracked events will be permanently removed.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await Watchtower.remove(w.id);
    setWatches((prev) => prev.filter((x) => x.id !== w.id));
    if (timelineWatchId === w.id) setTimelineWatchId(watches.find((x) => x.id !== w.id)?.id ?? null);
    refreshEvents();
    setToast('Competitor removed');
  };

  const filteredEvents = useMemo(
    () => (kindFilter ? events.filter((e) => e.kind === kindFilter) : events),
    [events, kindFilter],
  );

  const activeCount = watches.filter((w) => w.active).length;
  const highCount = events.filter((e) => e.importance === 'high').length;

  const timelineWatch = watches.find((w) => w.id === timelineWatchId) ?? null;
  const timelineTotal = useMemo(() => timeline.reduce((acc, p) => acc + p.changes, 0), [timeline]);

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
        <Box sx={{ position: 'absolute', top: -100, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,44,74,0.30), transparent 65%)', filter: 'blur(8px)' }} />
        <Box sx={{ position: 'absolute', bottom: -120, left: '28%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.30), transparent 65%)', filter: 'blur(10px)' }} />
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3} sx={{ position: 'relative' }}>
          <Box maxWidth={700}>
            <Chip icon={<RadarIcon />} label="Competitive intelligence" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Competitor Watchtower
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 620 }}>
              Track rival messaging, pricing, launches &amp; content — we watch so you can out-maneuver.
            </Typography>
          </Box>
          <Stack spacing={1.2} sx={{ minWidth: { md: 280 } }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}
              sx={{ borderRadius: 3, py: 1.2, textTransform: 'none', fontWeight: 900, color: '#11151B', background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)` }}>
              Add competitor
            </Button>
            <Grid container spacing={1}>
              <Grid size={4}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 950 }}>{watches.length}</Typography>
                  <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>Tracked</Typography>
                </Box>
              </Grid>
              <Grid size={4}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 950 }}>{activeCount}</Typography>
                  <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>Active</Typography>
                </Box>
              </Grid>
              <Grid size={4}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 950 }}>{highCount}</Typography>
                  <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>Hot signals</Typography>
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </Stack>
      </Box>

      {!activeWorkspace ? (
        <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, bgcolor: '#fff' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
              <RadarIcon sx={{ fontSize: 36, color: BRAND.teal }} />
            </Box>
            <Typography fontWeight={900} variant="h6" sx={{ color: INK }}>No workspace selected</Typography>
            <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={380}>
              Choose or create a workspace to start tracking your competitors.
            </Typography>
          </CardContent>
        </Card>
      ) : loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}><CircularProgress size={28} /></Box>
      ) : (
        <Stack spacing={2.5}>
          <Grid container spacing={2.5}>
            {/* ── LEFT: competitor list ── */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography fontWeight={950} variant="h6" sx={{ color: INK }}>Competitors</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
                  Add
                </Button>
              </Stack>

              {watches.length === 0 ? (
                <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, bgcolor: '#fff' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6 }}>
                    <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.amber}1A` }}>
                      <VisibilityIcon sx={{ fontSize: 30, color: BRAND.amberDeep }} />
                    </Box>
                    <Typography fontWeight={900} sx={{ color: INK }}>No competitors yet</Typography>
                    <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={340}>
                      Add a rival and we&apos;ll start watching their messaging, pricing and launches for you.
                    </Typography>
                    <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setOpen(true)} sx={{ mt: 1, borderRadius: 3, textTransform: 'none', fontWeight: 800 }}>
                      Add first competitor
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Stack spacing={1.5}>
                  {watches.map((w) => {
                    const wTargets = targets[w.id] ?? [];
                    const expanded = expandedId === w.id;
                    return (
                      <Card key={w.id} sx={{
                        borderRadius: 4, border: `1px solid ${expanded ? `${BRAND.teal}66` : BORDER}`, bgcolor: '#fff',
                        boxShadow: '0 10px 30px rgba(17,21,27,0.05)',
                        transition: 'transform .15s, box-shadow .15s, border-color .15s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 16px 42px rgba(17,21,27,0.10)' },
                      }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Box sx={{
                              width: 46, height: 46, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center',
                              background: w.active
                                ? 'linear-gradient(135deg, #14BB87 0%, #0d8f66 100%)'
                                : `${SUBTLE}22`,
                              boxShadow: w.active ? '0 6px 18px rgba(20,187,135,0.30)' : 'none',
                            }}>
                              <Typography sx={{ color: w.active ? '#fff' : SUBTLE, fontWeight: 950, fontSize: 18 }}>
                                {w.name.charAt(0).toUpperCase()}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                                <Typography fontWeight={900} noWrap sx={{ color: INK }}>{w.name}</Typography>
                                <Chip label={`${w.event_count ?? w.events?.length ?? 0} events`} size="small"
                                  sx={{ fontSize: 10.5, height: 20, fontWeight: 800, bgcolor: CANVAS, border: `1px solid ${BORDER}`, color: SUBTLE }} />
                              </Stack>
                              <Stack direction="row" gap={2} sx={{ mt: 0.6 }} flexWrap="wrap" alignItems="center">
                                {w.website && (
                                  <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
                                    <LanguageIcon sx={{ fontSize: 13, color: SUBTLE }} />
                                    <MuiLink href={w.website} target="_blank" rel="noopener noreferrer"
                                      variant="caption" underline="hover" noWrap
                                      sx={{ color: BRAND.tealDeep, fontWeight: 700, maxWidth: 200 }}>
                                      {cleanUrl(w.website)}
                                    </MuiLink>
                                  </Stack>
                                )}
                                <Typography variant="caption" sx={{ color: SUBTLE }}>
                                  Checked {shortDate(w.last_checked_at)}
                                </Typography>
                              </Stack>
                            </Box>
                            <Tooltip title={w.active ? 'Active — tracking on' : 'Paused'}>
                              <Switch checked={w.active} onChange={() => handleToggleActive(w)} size="small" color="success" />
                            </Tooltip>
                          </Stack>
                          <Divider sx={{ my: 1.5, borderColor: BORDER }} />
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" gap={0.5} alignItems="center">
                              <Button size="small"
                                startIcon={checkingId === w.id ? <CircularProgress size={13} color="inherit" /> : <RefreshIcon />}
                                onClick={() => handleCheck(w)} disabled={checkingId === w.id}
                                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 12, color: BRAND.tealDeep }}>
                                {checkingId === w.id ? 'Scanning…' : 'Check now'}
                              </Button>
                              <Button size="small"
                                onClick={() => toggleExpand(w)}
                                endIcon={
                                  <ExpandMoreIcon sx={{ transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />
                                }
                                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 12, color: SUBTLE }}>
                                {wTargets.length || !expanded ? `URLs${wTargets.length ? ` (${wTargets.length})` : ''}` : 'URLs'}
                              </Button>
                            </Stack>
                            <Stack direction="row" gap={0.5}>
                              {w.website && (
                                <Tooltip title="Open website">
                                  <IconButton size="small" href={w.website} target="_blank" rel="noopener noreferrer" component="a" sx={{ borderRadius: 2 }}>
                                    <OpenInNewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => handleDelete(w)} sx={{ borderRadius: 2, color: 'error.main' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>

                          {/* ── Target list ── */}
                          <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Box sx={{ mt: 1.5, p: 1.75, borderRadius: 3, bgcolor: CANVAS, border: `1px solid ${BORDER}` }}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Stack direction="row" alignItems="center" gap={0.75}>
                                  <LinkIcon sx={{ fontSize: 15, color: SUBTLE }} />
                                  <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Tracked URLs
                                  </Typography>
                                </Stack>
                                <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                                  onClick={() => { setUrlDialogFor(w); setNewTargetUrl(''); setNewTargetLabel(''); }}
                                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 11.5 }}>
                                  Add URL
                                </Button>
                              </Stack>

                              {targetsLoading[w.id] ? (
                                <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}><CircularProgress size={20} /></Box>
                              ) : wTargets.length === 0 ? (
                                <Typography variant="caption" sx={{ color: SUBTLE, display: 'block', py: 1.5, textAlign: 'center' }}>
                                  No URLs tracked yet. Add a pricing, homepage or product page to monitor for changes.
                                </Typography>
                              ) : (
                                <Stack spacing={1}>
                                  {wTargets.map((t) => {
                                    const meta = targetStatusMeta(t.status);
                                    const diffsOpen = expandedTargetId === t.id;
                                    const tDiffs = targetDiffs[t.id] ?? [];
                                    return (
                                      <Box key={t.id} sx={{ borderRadius: 2.5, border: `1px solid ${BORDER}`, bgcolor: '#fff', p: 1.25 }}>
                                        <Stack direction="row" alignItems="flex-start" gap={1}>
                                          <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                                              <Typography fontWeight={800} sx={{ color: INK, fontSize: 13 }} noWrap>
                                                {t.label || cleanUrl(t.url)}
                                              </Typography>
                                              <Chip label={meta.label} size="small"
                                                sx={{
                                                  height: 18, fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.4,
                                                  bgcolor: `${meta.color}16`, color: meta.color, border: `1px solid ${meta.color}33`,
                                                }} />
                                            </Stack>
                                            <MuiLink href={t.url} target="_blank" rel="noopener noreferrer"
                                              variant="caption" underline="hover" noWrap
                                              sx={{ color: BRAND.tealDeep, fontWeight: 700, display: 'block', maxWidth: '100%' }}>
                                              {cleanUrl(t.url)}
                                            </MuiLink>
                                            <Typography variant="caption" sx={{ color: SUBTLE }}>
                                              Checked {t.last_checked_at ? relativeTime(t.last_checked_at) : 'never'}
                                            </Typography>
                                          </Box>
                                          <Tooltip title={t.active ? 'Tracking on' : 'Paused'}>
                                            <Switch checked={t.active} onChange={() => handleToggleTarget(t)} size="small" color="success" />
                                          </Tooltip>
                                        </Stack>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.75 }}>
                                          <Stack direction="row" gap={0.25} alignItems="center">
                                            <Button size="small"
                                              startIcon={checkingTargetId === t.id ? <CircularProgress size={12} color="inherit" /> : <RefreshIcon sx={{ fontSize: 15 }} />}
                                              onClick={() => handleCheckTarget(t)} disabled={checkingTargetId === t.id}
                                              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 11, color: BRAND.tealDeep }}>
                                              {checkingTargetId === t.id ? 'Scanning…' : 'Check now'}
                                            </Button>
                                            <Button size="small"
                                              startIcon={<CompareArrowsIcon sx={{ fontSize: 15 }} />}
                                              onClick={() => toggleTargetDiffs(t)}
                                              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 11, color: SUBTLE }}>
                                              Changes
                                            </Button>
                                          </Stack>
                                          <Tooltip title="Remove URL">
                                            <IconButton size="small" onClick={() => handleDeleteTarget(t)} sx={{ borderRadius: 2, color: 'error.main' }}>
                                              <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                          </Tooltip>
                                        </Stack>

                                        <Collapse in={diffsOpen} timeout="auto" unmountOnExit>
                                          <Divider sx={{ my: 1, borderColor: BORDER }} />
                                          {targetDiffsLoading[t.id] ? (
                                            <Box sx={{ display: 'grid', placeItems: 'center', py: 1.5 }}><CircularProgress size={16} /></Box>
                                          ) : tDiffs.length === 0 ? (
                                            <Typography variant="caption" sx={{ color: SUBTLE, display: 'block', py: 1, textAlign: 'center' }}>
                                              No changes recorded yet for this URL.
                                            </Typography>
                                          ) : (
                                            <Stack spacing={0.5}>
                                              {tDiffs.map((d) => (
                                                <Stack key={d.id} direction="row" alignItems="center" gap={1}
                                                  onClick={() => openDiff(d.id)}
                                                  sx={{ p: 0.75, borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: CANVAS } }}>
                                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: IMPORTANCE_DOT[d.importance] }} />
                                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: INK }} noWrap>
                                                      {d.summary || d.classification.replace(/_/g, ' ')}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: SUBTLE }}>
                                                      {relativeTime(d.detected_at)}
                                                    </Typography>
                                                  </Box>
                                                  <CompareArrowsIcon sx={{ fontSize: 15, color: SUBTLE }} />
                                                </Stack>
                                              ))}
                                            </Stack>
                                          )}
                                        </Collapse>
                                      </Box>
                                    );
                                  })}
                                </Stack>
                              )}
                            </Box>
                          </Collapse>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Grid>

            {/* ── RIGHT: activity feed ── */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <TimelineIcon sx={{ color: BRAND.amberDeep, fontSize: 20 }} />
                  <Typography fontWeight={950} variant="h6" sx={{ color: INK }}>Activity feed</Typography>
                </Stack>
                <Tooltip title="Refresh">
                  <IconButton size="small" onClick={refreshEvents} sx={{ borderRadius: 2 }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mb: 1.5 }}>
                <Chip label="All" size="small" onClick={() => setKindFilter(null)}
                  variant={kindFilter === null ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 800, fontSize: 11,
                    bgcolor: kindFilter === null ? INK : 'transparent',
                    color: kindFilter === null ? '#fff' : SUBTLE,
                    border: `1px solid ${BORDER}`,
                  }} />
                {ALL_KINDS.map((k) => (
                  <Chip key={k} label={KIND_LABELS[k]} size="small" onClick={() => setKindFilter(kindFilter === k ? null : k)}
                    variant={kindFilter === k ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 800, fontSize: 11,
                      bgcolor: kindFilter === k ? KIND_COLORS[k] : 'transparent',
                      color: kindFilter === k ? '#fff' : SUBTLE,
                      border: `1px solid ${kindFilter === k ? KIND_COLORS[k] : BORDER}`,
                    }} />
                ))}
              </Stack>

              <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 10px 30px rgba(17,21,27,0.05)' }}>
                <CardContent sx={{ p: 0 }}>
                  {filteredEvents.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6, px: 3 }}>
                      <Box sx={{ width: 60, height: 60, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
                        <BoltIcon sx={{ fontSize: 28, color: BRAND.teal }} />
                      </Box>
                      <Typography fontWeight={900} sx={{ color: INK }}>
                        {kindFilter ? 'No events of this type' : 'No activity yet'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={300}>
                        {kindFilter
                          ? 'Try clearing the filter or check a competitor now.'
                          : 'Add a competitor and run a scan — detected changes will stream in here.'}
                      </Typography>
                    </Box>
                  ) : (
                    <Stack>
                      {filteredEvents.map((e, i) => (
                        <Box key={e.id}>
                          <Stack direction="row" spacing={1.5}
                            onClick={() => openEventDiff(e)}
                            sx={{ p: 2, cursor: 'pointer', transition: 'background .12s', '&:hover': { bgcolor: CANVAS } }}>
                            <Box sx={{ pt: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Box sx={{
                                width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                                bgcolor: IMPORTANCE_DOT[e.importance],
                                boxShadow: `0 0 0 4px ${IMPORTANCE_DOT[e.importance]}1F`,
                              }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                                <Chip label={KIND_LABELS[e.kind]} size="small"
                                  sx={{
                                    height: 19, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.4,
                                    bgcolor: `${KIND_COLORS[e.kind]}16`, color: KIND_COLORS[e.kind], border: `1px solid ${KIND_COLORS[e.kind]}33`,
                                  }} />
                                <Typography variant="caption" sx={{ color: SUBTLE, ml: 'auto' }}>{relativeTime(e.created_at)}</Typography>
                              </Stack>
                              <Typography fontWeight={800} sx={{ color: INK, mt: 0.6, fontSize: 14, lineHeight: 1.35 }}>
                                {e.title}
                              </Typography>
                              {e.detail && (
                                <Typography variant="body2" sx={{ color: SUBTLE, mt: 0.3 }}>{e.detail}</Typography>
                              )}
                              <Stack direction="row" alignItems="center" gap={1.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                                <Stack direction="row" alignItems="center" gap={0.4}
                                  sx={{ color: BRAND.tealDeep, fontWeight: 700, fontSize: 12 }}>
                                  <CompareArrowsIcon sx={{ fontSize: 14 }} /> View change
                                </Stack>
                                {e.url && (
                                  <MuiLink href={e.url} target="_blank" rel="noopener noreferrer"
                                    variant="caption" underline="hover" onClick={(ev) => ev.stopPropagation()}
                                    sx={{ color: SUBTLE, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                                    Source <OpenInNewIcon sx={{ fontSize: 12 }} />
                                  </MuiLink>
                                )}
                              </Stack>
                            </Box>
                          </Stack>
                          {i < filteredEvents.length - 1 && <Divider sx={{ borderColor: BORDER }} />}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Change timeline ── */}
          {watches.length > 0 && (
            <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 10px 30px rgba(17,21,27,0.05)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5} sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2.5, display: 'grid', placeItems: 'center', background: `${BRAND.amber}1A` }}>
                      <TimelineIcon sx={{ fontSize: 20, color: BRAND.amberDeep }} />
                    </Box>
                    <Box>
                      <Typography fontWeight={950} sx={{ color: INK }}>Change frequency</Typography>
                      <Typography variant="caption" sx={{ color: SUBTLE }}>
                        {timelineWatch ? `${timelineWatch.name} · last 90 days` : 'Last 90 days'} · {timelineTotal} total changes
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" gap={0.75} flexWrap="wrap">
                    {watches.map((w) => (
                      <Chip key={w.id} label={w.name} size="small" onClick={() => setTimelineWatchId(w.id)}
                        variant={timelineWatchId === w.id ? 'filled' : 'outlined'}
                        sx={{
                          fontWeight: 800, fontSize: 11,
                          bgcolor: timelineWatchId === w.id ? INK : 'transparent',
                          color: timelineWatchId === w.id ? '#fff' : SUBTLE,
                          border: `1px solid ${BORDER}`,
                        }} />
                    ))}
                  </Stack>
                </Stack>

                {/* Legend */}
                <Stack direction="row" gap={2} sx={{ mb: 1.5 }}>
                  {([['High', BRAND.pink], ['Medium', BRAND.amber], ['Low', BRAND.teal]] as const).map(([label, color]) => (
                    <Stack key={label} direction="row" alignItems="center" gap={0.6}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: color }} />
                      <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 700 }}>{label}</Typography>
                    </Stack>
                  ))}
                </Stack>

                {timelineLoading ? (
                  <Box sx={{ display: 'grid', placeItems: 'center', height: 220 }}><CircularProgress size={24} /></Box>
                ) : timelineTotal === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 5 }}>
                    <BoltIcon sx={{ fontSize: 30, color: `${BRAND.teal}AA` }} />
                    <Typography fontWeight={800} sx={{ color: INK }}>No changes detected yet</Typography>
                    <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={340}>
                      Add tracked URLs and run scans — the cadence of detected changes will plot here.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeline} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: SUBTLE }}
                          tickLine={false}
                          axisLine={{ stroke: BORDER }}
                          tickFormatter={(d: string) => shortDate(d)}
                          minTickGap={24}
                        />
                        <YAxis tick={{ fontSize: 11, fill: SUBTLE }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RTooltip
                          cursor={{ fill: `${BRAND.teal}10` }}
                          contentStyle={{ borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 12, boxShadow: '0 10px 30px rgba(17,21,27,0.10)' }}
                          labelFormatter={(d) => shortDate(String(d))}
                        />
                        <Bar dataKey="high" stackId="c" fill={BRAND.pink} name="High" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="medium" stackId="c" fill={BRAND.amber} name="Medium" />
                        <Bar dataKey="low" stackId="c" fill={BRAND.teal} name="Low" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* ── Add competitor dialog ── */}
      <PremiumDialog open={open} onClose={() => setOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<RadarRoundedIcon />}
          title="Add a competitor"
          subtitle="We'll watch their moves so you can stay ahead."
          onClose={() => setOpen(false)}
          tint={BRAND.pink}
          tintSoft={BRAND.pinkSoft}
        />
        <DialogBody>
          <SectionLabel>Competitor profile</SectionLabel>
          <FieldGrid columns={2}>
            <FullSpan>
              <TextField label="Competitor name" placeholder="e.g. Acme Inc." value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" autoFocus required />
            </FullSpan>
            <FullSpan>
              <TextField label="Website (optional)" placeholder="https://acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} fullWidth size="small" />
            </FullSpan>
            <TextField label="LinkedIn (optional)" placeholder="company/acme" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} fullWidth size="small" />
            <TextField label="Twitter / X (optional)" placeholder="@acme" value={twitter} onChange={(e) => setTwitter(e.target.value)} fullWidth size="small" />
          </FieldGrid>
          <FormControlLabel
            sx={{ mt: 2, alignItems: 'flex-start' }}
            control={<Checkbox checked={seed} onChange={(e) => setSeed(e.target.checked)} color="success" />}
            label={
              <Box>
                <Typography fontWeight={800} sx={{ color: INK, fontSize: 14 }}>Generate initial snapshot</Typography>
                <Typography variant="caption" sx={{ color: SUBTLE }}>Run a first scan immediately to baseline their current state.</Typography>
              </Box>
            }
          />
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} disabled={creating} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={inkPillSx}>
            {creating ? 'Adding…' : 'Add competitor'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* ── Add URL dialog ── */}
      <PremiumDialog open={!!urlDialogFor} onClose={() => setUrlDialogFor(null)} maxWidth="sm">
        <DialogHero
          icon={<LinkIcon />}
          title="Track a URL"
          subtitle={urlDialogFor ? `Monitor a page on ${urlDialogFor.name} for changes.` : 'Monitor a page for changes.'}
          onClose={() => setUrlDialogFor(null)}
          tint={BRAND.teal}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <SectionLabel>Page to monitor</SectionLabel>
          <FieldGrid columns={1}>
            <TextField label="URL" placeholder="https://acme.com/pricing" value={newTargetUrl} onChange={(e) => setNewTargetUrl(e.target.value)} fullWidth size="small" autoFocus required />
            <TextField label="Label (optional)" placeholder="e.g. Pricing page" value={newTargetLabel} onChange={(e) => setNewTargetLabel(e.target.value)} fullWidth size="small" />
          </FieldGrid>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setUrlDialogFor(null)} disabled={addingTarget} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={handleAddTarget} disabled={addingTarget || !newTargetUrl.trim()}
            startIcon={addingTarget ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={inkPillSx}>
            {addingTarget ? 'Adding…' : 'Add URL'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* ── Diff viewer dialog ── */}
      <PremiumDialog open={diffOpen} onClose={closeDiff} maxWidth="md">
        <DialogHero
          icon={<CompareArrowsIcon />}
          title="Detected change"
          subtitle="A side-by-side view of what shifted."
          onClose={closeDiff}
          tint={BRAND.amber}
          tintSoft={BRAND.amberSoft}
        />
        <DialogBody>
          {diffLoading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}><CircularProgress size={26} /></Box>
          ) : diff ? (
            <DiffContent diff={diff} />
          ) : diffFallback ? (
            <EventContent event={diffFallback} />
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography fontWeight={800} sx={{ color: INK }}>No detailed diff available</Typography>
              <Typography variant="body2" sx={{ color: SUBTLE, mt: 0.5 }}>
                This change doesn&apos;t have a structured snapshot to compare.
              </Typography>
            </Box>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={closeDiff} sx={inkPillSx}>Close</Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}

// ── Diff viewer content ──
function DiffContent({ diff }: { diff: WatchDiffDetail }) {
  const before = diff.old_snapshot;
  const after = diff.new_snapshot;

  const beforeTitle = snapshotField(before, 'title');
  const afterTitle = snapshotField(after, 'title');
  const beforeMeta = snapshotField(before, 'meta_description');
  const afterMeta = snapshotField(after, 'meta_description');
  const beforeHeadline = snapshotField(before, 'headline');
  const afterHeadline = snapshotField(after, 'headline');
  const beforeH1s = asStringArray(before?.h1s);
  const afterH1s = asStringArray(after?.h1s);
  const beforePricing = asStringArray(before?.pricing_signals);
  const afterPricing = asStringArray(after?.pricing_signals);

  return (
    <Stack spacing={2.25}>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Chip label={diff.classification.replace(/_/g, ' ')} size="small"
          sx={{
            height: 24, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5,
            bgcolor: `${BRAND.teal}16`, color: BRAND.tealDeep, border: `1px solid ${BRAND.teal}33`,
          }} />
        <Stack direction="row" alignItems="center" gap={0.6}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: IMPORTANCE_DOT[diff.importance] }} />
          <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800 }}>{IMPORTANCE_LABEL[diff.importance]}</Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: SUBTLE, ml: 'auto' }}>{relativeTime(diff.detected_at)}</Typography>
      </Stack>

      {diff.summary && (
        <Box sx={{ p: 1.75, borderRadius: 3, bgcolor: BRAND.amberSoft, border: `1px solid ${BRAND.amber}33` }}>
          <Typography sx={{ fontSize: 11, fontWeight: 900, color: BRAND.amberDeep, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
            AI summary
          </Typography>
          <Typography variant="body2" sx={{ color: INK }}>{diff.summary}</Typography>
        </Box>
      )}

      <DiffRow label="Title" before={beforeTitle} after={afterTitle} />
      <DiffRow label="Meta description" before={beforeMeta} after={afterMeta} />
      <DiffRow label="Headline" before={beforeHeadline} after={afterHeadline} />
      <DiffListRow label="H1 headings" before={beforeH1s} after={afterH1s} />
      <DiffListRow label="Pricing signals" before={beforePricing} after={afterPricing} />
    </Stack>
  );
}

function EventContent({ event }: { event: WatchEvent }) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Chip label={KIND_LABELS[event.kind]} size="small"
          sx={{
            height: 24, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5,
            bgcolor: `${KIND_COLORS[event.kind]}16`, color: KIND_COLORS[event.kind], border: `1px solid ${KIND_COLORS[event.kind]}33`,
          }} />
        <Stack direction="row" alignItems="center" gap={0.6}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: IMPORTANCE_DOT[event.importance] }} />
          <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800 }}>{IMPORTANCE_LABEL[event.importance]}</Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: SUBTLE, ml: 'auto' }}>{relativeTime(event.created_at)}</Typography>
      </Stack>
      <Typography fontWeight={900} sx={{ color: INK, fontSize: 17 }}>{event.title}</Typography>
      {event.detail && <Typography variant="body2" sx={{ color: SUBTLE }}>{event.detail}</Typography>}
      {event.url && (
        <MuiLink href={event.url} target="_blank" rel="noopener noreferrer"
          variant="body2" underline="hover"
          sx={{ color: BRAND.tealDeep, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          View source <OpenInNewIcon sx={{ fontSize: 14 }} />
        </MuiLink>
      )}
    </Stack>
  );
}

function DiffRow({ label, before, after }: { label: string; before: string; after: string }) {
  if (!before && !after) return null;
  const changed = before !== after;
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 900, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
        {label}
      </Typography>
      <Grid container spacing={1.25}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box sx={{ p: 1.5, borderRadius: 3, height: '100%', bgcolor: CANVAS, border: `1px solid ${BORDER}` }}>
            <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800 }}>Before</Typography>
            <Typography variant="body2" sx={{ color: before ? INK : SUBTLE, mt: 0.4 }}>
              {before || '—'}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box sx={{
            p: 1.5, borderRadius: 3, height: '100%',
            bgcolor: changed ? BRAND.tealSoft : CANVAS,
            border: `1px solid ${changed ? `${BRAND.teal}55` : BORDER}`,
          }}>
            <Typography variant="caption" sx={{ color: changed ? BRAND.tealDeep : SUBTLE, fontWeight: 800 }}>After</Typography>
            <Typography variant="body2" sx={{ color: after ? INK : SUBTLE, mt: 0.4 }}>
              {after || '—'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

function DiffListRow({ label, before, after }: { label: string; before: string[]; after: string[] }) {
  if (before.length === 0 && after.length === 0) return null;
  const added = after.filter((x) => !before.includes(x));
  const removed = before.filter((x) => !after.includes(x));
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 900, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
        {label}
      </Typography>
      {added.length === 0 && removed.length === 0 ? (
        <Typography variant="body2" sx={{ color: SUBTLE }}>No change</Typography>
      ) : (
        <Stack spacing={0.6}>
          {removed.map((x, i) => (
            <Stack key={`r-${i}`} direction="row" alignItems="flex-start" gap={0.75}>
              <Typography sx={{ color: BRAND.pink, fontWeight: 900, lineHeight: 1.5 }}>−</Typography>
              <Typography variant="body2" sx={{ color: INK, textDecoration: 'line-through', textDecorationColor: `${BRAND.pink}88` }}>{x}</Typography>
            </Stack>
          ))}
          {added.map((x, i) => (
            <Stack key={`a-${i}`} direction="row" alignItems="flex-start" gap={0.75}>
              <Typography sx={{ color: BRAND.tealDeep, fontWeight: 900, lineHeight: 1.5 }}>+</Typography>
              <Typography variant="body2" sx={{ color: INK }}>{x}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}
