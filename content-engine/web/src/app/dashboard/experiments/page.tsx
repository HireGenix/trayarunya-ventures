'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import ArchiveIcon from '@mui/icons-material/Inventory2Outlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import SplitscreenIcon from '@mui/icons-material/SplitscreenOutlined';
import { useAuth } from '@/lib/auth';
import { Experiments, type Experiment, type ExperimentVariant } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

const METRIC_OPTIONS = [
  'engagement_rate',
  'ctr',
  'conversion_rate',
  'reach',
  'impressions',
  'roas',
];

type StatusMeta = { label: string; fg: string; bg: string };

function statusMeta(status: Experiment['status']): StatusMeta {
  switch (status) {
    case 'running':
      return { label: 'Running', fg: BRAND.amber, bg: `${BRAND.amber}1f` };
    case 'completed':
      return { label: 'Completed', fg: BRAND.teal, bg: `${BRAND.teal}1f` };
    case 'archived':
      return { label: 'Archived', fg: SUBTLE, bg: `${SUBTLE}1f` };
    case 'draft':
    default:
      return { label: 'Draft', fg: SUBTLE, bg: `${INK}0d` };
  }
}

type VariantDraft = { key: string; label: string; notes: string };

function emptyVariant(key: string): VariantDraft {
  return { key, label: '', notes: '' };
}

export default function ExperimentsPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const [name, setName] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [successMetric, setSuccessMetric] = useState('engagement_rate');
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant('A'), emptyVariant('B')]);

  const load = () => {
    if (!activeWorkspace) {
      setExperiments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Experiments.list()
      .then(setExperiments)
      .catch(() => setExperiments([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  const notify = (msg: string, severity: 'success' | 'error' = 'success') =>
    setToast({ msg, severity });

  const resetForm = () => {
    setName('');
    setHypothesis('');
    setSuccessMetric('engagement_rate');
    setVariants([emptyVariant('A'), emptyVariant('B')]);
  };

  const addVariant = () => {
    const nextKey = String.fromCharCode(65 + variants.length);
    setVariants((prev) => [...prev, emptyVariant(nextKey)]);
  };

  const removeVariant = (idx: number) => {
    setVariants((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const updateVariant = (idx: number, field: keyof VariantDraft, value: string) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const cleaned: ExperimentVariant[] = variants
        .filter((v) => v.key.trim())
        .map((v) => ({
          key: v.key.trim(),
          label: v.label.trim() || undefined,
          notes: v.notes.trim() || undefined,
        }));
      const created = await Experiments.create({
        name: name.trim(),
        hypothesis: hypothesis.trim() || undefined,
        success_metric: successMetric.trim() || undefined,
        variants: cleaned.length ? cleaned : undefined,
      });
      setExperiments((prev) => [created, ...prev]);
      setOpen(false);
      resetForm();
      notify('Experiment created');
    } catch {
      notify('Failed to create experiment', 'error');
    } finally {
      setCreating(false);
    }
  };

  const replaceInList = (updated: Experiment) =>
    setExperiments((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

  const handleStart = async (exp: Experiment) => {
    setBusyId(exp.id);
    try {
      const updated = await Experiments.update(exp.id, {
        status: 'running',
        started_at: new Date().toISOString(),
      });
      replaceInList(updated);
      notify('Experiment started');
    } catch {
      notify('Failed to start experiment', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleEvaluate = async (exp: Experiment) => {
    setBusyId(exp.id);
    try {
      const updated = await Experiments.evaluate(exp.id);
      replaceInList(updated);
      notify(updated.winner_key ? `Winner: ${updated.winner_key}` : 'Evaluation complete');
    } catch {
      notify('Failed to evaluate experiment', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (exp: Experiment) => {
    setBusyId(exp.id);
    try {
      const updated = await Experiments.update(exp.id, { status: 'archived' });
      replaceInList(updated);
      notify('Experiment archived');
    } catch {
      notify('Failed to archive experiment', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (exp: Experiment) => {
    const ok = await confirm({
      title: 'Delete experiment?',
      message: `"${exp.name}" and its variants will be permanently deleted.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await Experiments.remove(exp.id);
      setExperiments((prev) => prev.filter((x) => x.id !== exp.id));
      notify('Experiment deleted');
    } catch {
      notify('Failed to delete experiment', 'error');
    }
  };

  if (!activeWorkspace) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 360 }}>
        <Stack spacing={1.5} alignItems="center" textAlign="center" maxWidth={420}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
            <ScienceIcon sx={{ fontSize: 36, color: BRAND.teal }} />
          </Box>
          <Typography variant="h6" fontWeight={900} color={INK}>Select a workspace</Typography>
          <Typography variant="body2" sx={{ color: SUBTLE }}>
            Choose a workspace to design and run A/B experiments on your content and ads.
          </Typography>
        </Stack>
      </Box>
    );
  }

  const runningCount = experiments.filter((e) => e.status === 'running').length;
  const completedCount = experiments.filter((e) => e.status === 'completed').length;

  return (
    <Stack spacing={3}>
      {/* ── Hero ── */}
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
            <Chip icon={<BoltIcon />} label="Experiment Hub" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Test, measure, and learn what actually works.
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 620 }}>
              Run A/B experiments across your content and ads. Form a hypothesis, ship variants, and let real engagement decide the winner — so every decision is backed by proof.
            </Typography>
          </Box>
          <Stack spacing={1.2} sx={{ minWidth: { md: 260 } }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}
              sx={{ borderRadius: 3, py: 1.2, textTransform: 'none', fontWeight: 900, color: INK, background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)` }}>
              New experiment
            </Button>
            <Grid container spacing={1}>
              <Grid size={4}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{experiments.length}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</Typography>
                </Box>
              </Grid>
              <Grid size={4}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{runningCount}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Running</Typography>
                </Box>
              </Grid>
              <Grid size={4}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{completedCount}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Won</Typography>
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </Stack>
      </Box>

      {/* ── List ── */}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><CircularProgress size={28} /></Box>
      ) : experiments.length === 0 ? (
        <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, overflow: 'hidden', bgcolor: '#fff' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
              <SplitscreenIcon sx={{ fontSize: 36, color: BRAND.teal }} />
            </Box>
            <Typography fontWeight={900} variant="h6" color={INK}>No experiments yet</Typography>
            <Typography variant="body2" textAlign="center" maxWidth={420} sx={{ color: SUBTLE }}>
              Spin up your first A/B test — pit two variants of a post or ad against each other and discover what truly drives engagement.
            </Typography>
            <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setOpen(true)} sx={{ mt: 1, borderRadius: 3, textTransform: 'none', fontWeight: 800 }}>
              Create first experiment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {experiments.map((exp) => {
            const meta = statusMeta(exp.status);
            const variantCount = exp.variants?.length ?? 0;
            const busy = busyId === exp.id;
            return (
              <Grid key={exp.id} size={{ xs: 12, md: 6 }}>
                <Card sx={{
                  height: '100%', borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff',
                  boxShadow: '0 18px 45px rgba(17,21,27,0.06)',
                  transition: 'transform .15s, box-shadow .15s',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 22px 55px rgba(17,21,27,0.12)' },
                }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Box sx={{
                        width: 50, height: 50, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center',
                        background: 'linear-gradient(135deg, #14BB87 0%, #0d8f66 100%)',
                        boxShadow: '0 6px 18px rgba(20,187,135,0.35)',
                      }}>
                        <ScienceIcon sx={{ color: '#fff', fontSize: 24 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                          <Typography fontWeight={900} color={INK} noWrap>{exp.name}</Typography>
                          <Chip label={meta.label} size="small" sx={{ fontSize: 11, height: 22, fontWeight: 800, color: meta.fg, bgcolor: meta.bg }} />
                          {exp.winner_key && (
                            <Chip icon={<EmojiEventsIcon sx={{ fontSize: 14 }} />} label={`Winner ${exp.winner_key}`} size="small"
                              sx={{ fontSize: 11, height: 22, fontWeight: 800, color: INK, bgcolor: `${BRAND.amber}29`, '& .MuiChip-icon': { color: BRAND.amber } }} />
                          )}
                        </Stack>
                        <Stack direction="row" gap={2} sx={{ mt: 0.8 }} flexWrap="wrap">
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <InsightsIcon sx={{ fontSize: 14, color: SUBTLE }} />
                            <Typography variant="caption" sx={{ color: SUBTLE }}>{exp.success_metric}</Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <SplitscreenIcon sx={{ fontSize: 14, color: SUBTLE }} />
                            <Typography variant="caption" sx={{ color: SUBTLE }}>{variantCount} variant{variantCount === 1 ? '' : 's'}</Typography>
                          </Stack>
                        </Stack>
                        {exp.hypothesis && (
                          <Typography variant="body2" sx={{ mt: 1, color: INK, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {exp.hypothesis}
                          </Typography>
                        )}
                      </Box>
                    </Stack>

                    {exp.status === 'completed' && exp.learning && (
                      <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: CANVAS, border: `1px solid ${BORDER}` }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: BRAND.teal, textTransform: 'uppercase', letterSpacing: 0.5 }}>Learning</Typography>
                        <Typography variant="body2" sx={{ mt: 0.3, color: INK }}>{exp.learning}</Typography>
                      </Box>
                    )}

                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" gap={1}>
                        {exp.status === 'draft' && (
                          <Button size="small" startIcon={busy ? <CircularProgress size={12} color="inherit" /> : <PlayArrowIcon />}
                            onClick={() => handleStart(exp)} disabled={busy}
                            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 12, color: BRAND.amber }}>
                            Start
                          </Button>
                        )}
                        {(exp.status === 'running' || exp.status === 'completed') && (
                          <Button size="small" startIcon={busy ? <CircularProgress size={12} color="inherit" /> : <InsightsIcon />}
                            onClick={() => handleEvaluate(exp)} disabled={busy}
                            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 12, color: BRAND.teal }}>
                            Evaluate
                          </Button>
                        )}
                      </Stack>
                      <Stack direction="row" gap={0.5}>
                        {exp.status !== 'archived' && (
                          <Tooltip title="Archive">
                            <span>
                              <IconButton size="small" onClick={() => handleArchive(exp)} disabled={busy} sx={{ borderRadius: 2, color: SUBTLE }}>
                                <ArchiveIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <span>
                            <IconButton size="small" onClick={() => handleDelete(exp)} disabled={busy} sx={{ borderRadius: 2, color: BRAND.pink }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ── Create dialog ── */}
      <PremiumDialog open={open} onClose={() => !creating && setOpen(false)} maxWidth="md">
        <DialogHero
          icon={<ScienceRoundedIcon />}
          title="New experiment"
          subtitle="Define a hypothesis and the variants you want to test."
          onClose={() => !creating && setOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody sx={{ p: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' }, minHeight: { md: 440 } }}>
            {/* Form column */}
            <Box sx={{ px: { xs: 2.5, sm: 3.25 }, py: 3, borderRight: { md: `1px solid ${BORDER}` } }}>
              <Stack spacing={2.5}>
                <Box>
                  <SectionLabel>Experiment basics</SectionLabel>
                  <Stack spacing={2}>
                    <TextField label="Experiment name" placeholder="e.g. Hook style: question vs. bold claim"
                      value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" autoFocus required />
                    <TextField label="Hypothesis" placeholder="e.g. A question-led hook will beat a claim-led hook on engagement."
                      value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} fullWidth size="small" multiline minRows={2} />
                    <TextField select label="Success metric" value={successMetric} onChange={(e) => setSuccessMetric(e.target.value)} fullWidth size="small"
                      helperText="The metric used to decide the winner">
                      {METRIC_OPTIONS.map((m) => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <SectionLabel sx={{ mb: 0 }}>Variants</SectionLabel>
                    <Button size="small" startIcon={<AddIcon />} onClick={addVariant}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}>
                      Add variant
                    </Button>
                  </Stack>
                  <Stack spacing={1.5}>
                    {variants.map((v, idx) => (
                      <Box key={idx} sx={{ p: 1.5, borderRadius: '14px', border: `1px solid ${BORDER}`, background: CANVAS }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <TextField label="Key" value={v.key} onChange={(e) => updateVariant(idx, 'key', e.target.value)}
                            size="small" sx={{ width: 80, flexShrink: 0 }} />
                          <TextField label="Label" value={v.label} onChange={(e) => updateVariant(idx, 'label', e.target.value)}
                            placeholder="Short name" fullWidth size="small" />
                          <Tooltip title="Remove variant">
                            <span>
                              <IconButton onClick={() => removeVariant(idx)} disabled={variants.length <= 1}
                                sx={{ mt: 0.5, color: BRAND.pink }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                        <TextField label="Notes" value={v.notes} onChange={(e) => updateVariant(idx, 'notes', e.target.value)}
                          placeholder="What's different" fullWidth size="small" sx={{ mt: 1 }} />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* Live preview column */}
            <Box sx={{ background: 'rgba(14,17,22,0.025)', px: { xs: 2.5, sm: 3 }, py: 2.5, display: 'flex', flexDirection: 'column' }}>
              <SectionLabel sx={{ mb: 1.5 }}>Live preview</SectionLabel>
              <Box sx={{ background: '#fff', borderRadius: '18px', border: `1px solid ${BORDER}`, boxShadow: '0 8px 30px -12px rgba(14,17,22,0.18)', overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.75, borderBottom: `1px solid ${BORDER}` }}>
                  <Stack direction="row" alignItems="center" gap={1.25}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, display: 'grid', placeItems: 'center', background: BRAND.tealSoft, color: BRAND.tealDeep }}>
                      <ScienceRoundedIcon sx={{ fontSize: 19 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 14, color: INK, lineHeight: 1.25 }}>
                        {name.trim() || 'Untitled experiment'}
                      </Typography>
                      <Chip label={successMetric} size="small" sx={{ mt: 0.4, height: 20, fontSize: 11, fontWeight: 700, bgcolor: `${BRAND.amber}1f`, color: BRAND.amberDeep }} />
                    </Box>
                  </Stack>
                </Box>
                <Box sx={{ px: 2, py: 1.75 }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: SUBTLE, mb: 0.5 }}>
                    Hypothesis
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: hypothesis.trim() ? INK : SUBTLE, mb: 2 }}>
                    {hypothesis.trim() || 'Describe what you expect to happen and why.'}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: SUBTLE, mb: 0.75 }}>
                    Variants
                  </Typography>
                  <Stack spacing={1}>
                    {variants.filter((v) => v.key.trim()).length === 0 ? (
                      <Typography sx={{ fontSize: 13, color: SUBTLE }}>Add a variant key to see it here.</Typography>
                    ) : (
                      variants.filter((v) => v.key.trim()).map((v, idx) => (
                        <Stack key={idx} direction="row" alignItems="flex-start" gap={1.25} sx={{ p: 1.25, borderRadius: '12px', border: `1px solid ${BORDER}` }}>
                          <Box sx={{ width: 26, height: 26, borderRadius: '8px', flexShrink: 0, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, background: INK, color: '#fff' }}>
                            {v.key.trim().charAt(0).toUpperCase()}
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK }}>
                              {v.label.trim() || `Variant ${v.key.trim()}`}
                            </Typography>
                            {v.notes.trim() && (
                              <Typography sx={{ fontSize: 12, color: SUBTLE }}>{v.notes.trim()}</Typography>
                            )}
                          </Box>
                        </Stack>
                      ))
                    )}
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} disabled={creating} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={inkPillSx}>
            {creating ? 'Creating…' : 'Create experiment'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast.msg}</Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
