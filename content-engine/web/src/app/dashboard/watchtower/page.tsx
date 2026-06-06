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
import { useAuth } from '@/lib/auth';
import {
  Watchtower,
  type CompetitorWatch,
  type WatchEvent,
  type WatchKind,
  type WatchImportance,
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

const ALL_KINDS: WatchKind[] = ['messaging', 'pricing', 'content', 'launch', 'seo', 'hiring', 'other'];

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
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  const refreshEvents = () => {
    Watchtower.events().then(setEvents).catch(() => null);
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
    refreshEvents();
    setToast('Competitor removed');
  };

  const filteredEvents = useMemo(
    () => (kindFilter ? events.filter((e) => e.kind === kindFilter) : events),
    [events, kindFilter],
  );

  const activeCount = watches.filter((w) => w.active).length;
  const highCount = events.filter((e) => e.importance === 'high').length;

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
                {watches.map((w) => (
                  <Card key={w.id} sx={{
                    borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff',
                    boxShadow: '0 10px 30px rgba(17,21,27,0.05)',
                    transition: 'transform .15s, box-shadow .15s',
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
                                  {w.website.replace(/^https?:\/\//, '')}
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
                        <Button size="small"
                          startIcon={checkingId === w.id ? <CircularProgress size={13} color="inherit" /> : <RefreshIcon />}
                          onClick={() => handleCheck(w)} disabled={checkingId === w.id}
                          sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 12, color: BRAND.tealDeep }}>
                          {checkingId === w.id ? 'Scanning…' : 'Check now'}
                        </Button>
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
                    </CardContent>
                  </Card>
                ))}
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
                        <Stack direction="row" spacing={1.5} sx={{ p: 2 }}>
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
                            {e.url && (
                              <MuiLink href={e.url} target="_blank" rel="noopener noreferrer"
                                variant="caption" underline="hover"
                                sx={{ color: BRAND.tealDeep, fontWeight: 700, mt: 0.5, display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                                View source <OpenInNewIcon sx={{ fontSize: 12 }} />
                              </MuiLink>
                            )}
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

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
