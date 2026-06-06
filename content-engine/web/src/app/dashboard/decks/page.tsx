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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import SlideshowRoundedIcon from '@mui/icons-material/SlideshowRounded';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MinimizeIcon from '@mui/icons-material/Minimize';
import ShareIcon from '@mui/icons-material/Share';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  FieldGrid,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { useAIModels } from '@/lib/useAIModels';
import { PresentMode, PresenterView } from '@/components/DeckViewer';
import DeckEditor from '@/components/DeckEditor';
import { Decks, ApiError, IMAGE_MODELS, type Deck, type DeckAnalytics, type DeckShareResult, type DeckOutlineSlide, type DeckTemplate, type BrandKit, type DeckAsyncJob } from '@/lib/api';

const STYLES: Array<{ id: string; label: string; swatch: string }> = [
  { id: 'modern', label: 'Modern', swatch: 'linear-gradient(135deg,#14BB87,#0FA874)' },
  { id: 'bold', label: 'Bold', swatch: 'linear-gradient(135deg,#7C3AED,#EC4899)' },
  { id: 'minimal', label: 'Minimal', swatch: 'linear-gradient(135deg,#111827,#374151)' },
  { id: 'editorial', label: 'Editorial', swatch: 'linear-gradient(135deg,#B45309,#0F766E)' },
  { id: 'gradient', label: 'Gradient', swatch: 'linear-gradient(135deg,#2563EB,#14BB87)' },
];

const TONES = ['Confident', 'Visionary', 'Data-driven', 'Friendly', 'Premium', 'Bold'];

function deckSubtitle(deck: Deck): string {
  const meta = deck.meta as Record<string, unknown> | null;
  return (meta?.subtitle as string) || deck.topic || '';
}

function ShareAnalyticsDialog({
  deck,
  open,
  onClose,
  onUpdate,
}: {
  deck: Deck;
  open: boolean;
  onClose: () => void;
  onUpdate: (d: Deck) => void;
}) {
  const [tab, setTab] = useState(0);
  const [analytics, setAnalytics] = useState<DeckAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [requireEmail, setRequireEmail] = useState(deck.require_email || false);
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState(deck.expires_at || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState('');

  const shareUrl = typeof window !== 'undefined' && deck.share_token
    ? `${window.location.origin}/p/deck/${deck.share_token}`
    : '';

  useEffect(() => {
    if (open && tab === 1 && deck.id) {
      setLoadingAnalytics(true);
      Decks.analytics(deck.id)
        .then(setAnalytics)
        .catch(() => setAnalytics(null))
        .finally(() => setLoadingAnalytics(false));
    }
  }, [open, tab, deck.id]);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && shareUrl) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEnableSharing = async () => {
    setShareError('');
    try {
      const result = await Decks.enableSharing(deck.id);
      onUpdate({ ...deck, share_enabled: true, share_token: result.share_token });
    } catch (e) {
      setShareError(e instanceof ApiError ? e.message : 'Failed to enable sharing');
    }
  };

  const handleDisableSharing = async () => {
    setShareError('');
    try {
      await Decks.disableSharing(deck.id);
      onUpdate({ ...deck, share_enabled: false, share_token: undefined });
    } catch (e) {
      setShareError(e instanceof ApiError ? e.message : 'Failed to disable sharing');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setShareError('');
    try {
      await Decks.updateShareSettings(deck.id, {
        require_email: requireEmail,
        password: password || null,
        expires_at: expiresAt || null,
      });
      onUpdate({ ...deck, require_email: requireEmail, expires_at: expiresAt || undefined });
    } catch (e) {
      setShareError(e instanceof ApiError ? e.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShareIcon fontSize="small" />
        Share & Analytics
      </DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
        <Tab label="Share Link" />
        <Tab label="Analytics" disabled={!deck.share_enabled} />
      </Tabs>
      <DialogContent sx={{ minHeight: 360 }}>
        {shareError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setShareError('')}>{shareError}</Alert>
        )}

        {tab === 0 && (
          <Stack spacing={2.5}>
            {!deck.share_enabled ? (
              <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
                <Typography color="text.secondary">Sharing is disabled for this deck.</Typography>
                <Button
                  variant="contained"
                  onClick={handleEnableSharing}
                  sx={{ background: 'linear-gradient(135deg,#14BB87,#0FA874)', fontWeight: 700 }}
                >
                  Enable sharing
                </Button>
              </Stack>
            ) : (
              <>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>Public link</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      value={shareUrl}
                      size="small"
                      fullWidth
                      slotProps={{ input: { readOnly: true } }}
                      sx={{ '& .MuiOutlinedInput-root': { fontFamily: 'monospace', fontSize: 13 } }}
                    />
                    <Button
                      size="small"
                      startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                      onClick={handleCopy}
                      sx={{ textTransform: 'none', minWidth: 90 }}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </Stack>
                </Box>

                <Divider />

                <Typography variant="subtitle2" fontWeight={700}>Access controls</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={requireEmail}
                      onChange={(e) => setRequireEmail(e.target.checked)}
                    />
                  }
                  label="Require email to view (lead capture)"
                />
                <TextField
                  label="Password (optional)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Leave blank for no password"
                />
                <TextField
                  label="Expires at"
                  type="datetime-local"
                  value={expiresAt ? expiresAt.slice(0, 16) : ''}
                  onChange={(e) => setExpiresAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <Stack direction="row" spacing={1} justifyContent="space-between">
                  <Button
                    color="error"
                    onClick={handleDisableSharing}
                    sx={{ textTransform: 'none' }}
                  >
                    Disable sharing
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSaveSettings}
                    disabled={saving}
                    sx={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontWeight: 700, textTransform: 'none' }}
                  >
                    {saving ? 'Saving…' : 'Save settings'}
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={3}>
            {loadingAnalytics ? (
              <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
            ) : !analytics || analytics.total_views === 0 ? (
              <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
                <AnalyticsOutlinedIcon sx={{ fontSize: 48, color: '#D1D5DB' }} />
                <Typography color="text.secondary" fontWeight={600}>No views yet</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Share your deck link and analytics will appear here as real viewers visit it.
                </Typography>
              </Stack>
            ) : (
              <>
                {/* KPI cards */}
                <Grid container spacing={2}>
                  {[
                    { label: 'Unique viewers', value: analytics.unique_viewers },
                    { label: 'Total views', value: analytics.total_views },
                    { label: 'Avg. time', value: formatTime(Math.round(analytics.avg_seconds)) },
                    { label: 'Completion', value: `${Math.round(analytics.completion_rate * 100)}%` },
                  ].map((kpi) => (
                    <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
                      <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB', textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800}>{kpi.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Per-slide bar chart */}
                {analytics.per_slide.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>Time per slide</Typography>
                    <Box sx={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.per_slide.map((s) => ({ name: `Slide ${s.slide_index + 1}`, seconds: s.total_seconds }))}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip />
                          <Bar dataKey="seconds" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                )}

                {/* Recent viewers table */}
                {analytics.recent_viewers.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>Recent viewers</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Started</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analytics.recent_viewers.slice(0, 20).map((v) => (
                            <TableRow key={v.session_id}>
                              <TableCell>{v.viewer_email || '(anonymous)'}</TableCell>
                              <TableCell>{new Date(v.started_at).toLocaleString()}</TableCell>
                              <TableCell>{formatTime(v.total_seconds)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function OutlineDialog({
  open,
  outline,
  onClose,
  onUpdate,
  onGenerate,
  generating,
}: {
  open: boolean;
  outline: DeckOutlineSlide[];
  onClose: () => void;
  onUpdate: (slides: DeckOutlineSlide[]) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const handleSlideChange = (idx: number, field: keyof DeckOutlineSlide, value: string) => {
    const updated = [...outline];
    updated[idx] = { ...updated[idx], [field]: value };
    onUpdate(updated);
  };

  const handleRemove = (idx: number) => {
    onUpdate(outline.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    onUpdate([...outline, { title: 'New Slide', intent: '', layout: 'bullets' }]);
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...outline];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    onUpdate(updated);
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= outline.length - 1) return;
    const updated = [...outline];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    onUpdate(updated);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Edit Outline</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Review and edit the slide outline before generating the full deck.
          Add, remove, reorder or retitle slides.
        </Typography>
        <Stack spacing={1.5}>
          {outline.map((slide, idx) => (
            <Box key={idx} sx={{ p: 1.5, border: '1px solid #E5E7EB', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#9CA3AF', minWidth: 24 }}>
                  {idx + 1}
                </Typography>
                <TextField
                  value={slide.title}
                  onChange={(e) => handleSlideChange(idx, 'title', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Slide title"
                />
                <IconButton size="small" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>
                  <KeyboardArrowUpIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleMoveDown(idx)} disabled={idx >= outline.length - 1}>
                  <KeyboardArrowDownIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleRemove(idx)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
              <TextField
                value={slide.intent}
                onChange={(e) => handleSlideChange(idx, 'intent', e.target.value)}
                size="small"
                fullWidth
                placeholder="Brief description of what this slide should cover"
                sx={{ mt: 0.75, ml: 4 }}
                multiline
                maxRows={2}
              />
            </Box>
          ))}
        </Stack>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAdd} sx={{ mt: 1, textTransform: 'none' }}>
          Add slide
        </Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onGenerate}
          disabled={generating || outline.length === 0}
          startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          sx={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontWeight: 700 }}
        >
          {generating ? 'Generating…' : 'Generate from outline'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TemplateGallery({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (template: DeckTemplate) => void;
}) {
  const [templates, setTemplates] = useState<DeckTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Decks.templates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Start from a template
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a starter structure. You can edit the outline before generating.
        </Typography>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
        ) : templates.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            No templates available.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {templates.map((t) => (
              <Grid key={t.id} size={{ xs: 12, sm: 6 }}>
                <Card
                  sx={{
                    cursor: 'pointer', height: '100%',
                    transition: 'box-shadow .15s',
                    '&:hover': { boxShadow: 4 },
                    border: '1px solid #E5E7EB',
                  }}
                  onClick={() => onSelect(t)}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight={800} gutterBottom>{t.name}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{t.description}</Typography>
                    <Chip size="small" label={`${t.slide_count} slides`} sx={{ fontWeight: 700, mr: 0.5 }} />
                    <Chip size="small" label={t.category} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DecksPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();
  const { models, defaultId } = useAIModels();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Deck | null>(null);
  const [present, setPresent] = useState(false);
  const [presenterView, setPresenterView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate dialog state
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('Confident');
  const [style, setStyle] = useState('modern');
  const [slideCount, setSlideCount] = useState(10);
  const [model, setModel] = useState('');
  const [imageProvider, setImageProvider] = useState('gpt-image-1.5');
  const [imageSource, setImageSource] = useState<'ai' | 'stock'>('ai');
  const [generating, setGenerating] = useState(false);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [asyncJob, setAsyncJob] = useState<DeckAsyncJob | null>(null);
  const [asyncProgress, setAsyncProgress] = useState(0);

  // Rename/restyle dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStyle, setEditStyle] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Share & Analytics dialog
  const [shareOpen, setShareOpen] = useState(false);

  // Outline flow
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outline, setOutline] = useState<DeckOutlineSlide[]>([]);
  const [outlineGenerating, setOutlineGenerating] = useState(false);
  const [outlineTopic, setOutlineTopic] = useState('');

  // Template gallery
  const [templateOpen, setTemplateOpen] = useState(false);

  const modelKey = model || defaultId || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDecks(await Decks.list());
    } catch {
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  useEffect(() => {
    if (open) Decks.brandKit().then(setBrandKit).catch(() => setBrandKit(null));
  }, [open]);

  const openSelected = async (id: string) => {
    try {
      setSelected(await Decks.get(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not open deck');
    }
  };

  const onGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const job = await Decks.generateAsync({
        topic: topic.trim(),
        audience: audience.trim() || undefined,
        tone,
        style,
        slide_count: slideCount,
        model_key: modelKey || undefined,
        image_provider: imageSource === 'ai' ? imageProvider : undefined,
        image_source: imageSource,
      });
      setAsyncJob(job);
      setOpen(false);
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const status = await Decks.jobStatus(job.deck_id);
          if (status.progress !== undefined) setAsyncProgress(status.progress);
          if (status.status === 'ready' || status.status === 'completed') {
            clearInterval(poll);
            const deck = await Decks.get(job.deck_id);
            setSelected(deck);
            await load();
            setGenerating(false);
            setAsyncJob(null);
            setAsyncProgress(0);
            setTopic('');
            setAudience('');
          } else if (status.status === 'failed') {
            clearInterval(poll);
            setError('Deck generation failed. Please try again.');
            setGenerating(false);
            setAsyncJob(null);
            setAsyncProgress(0);
          }
        } catch {
          clearInterval(poll);
          setError('Lost connection to generation job.');
          setGenerating(false);
          setAsyncJob(null);
          setAsyncProgress(0);
        }
      }, 2500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Deck generation failed. Please try again.');
      setGenerating(false);
    }
  };

  const onGenerateOutline = async () => {
    if (!topic.trim()) return;
    setOutlineGenerating(true);
    try {
      const result = await Decks.generateOutline({
        topic: topic.trim(),
        audience: audience.trim() || undefined,
        tone,
        slide_count: slideCount,
        model_key: modelKey || undefined,
      });
      setOutline(result.slides);
      setOutlineTopic(topic.trim());
      setOpen(false);
      setOutlineOpen(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate outline');
    } finally {
      setOutlineGenerating(false);
    }
  };

  const onGenerateFromOutline = async () => {
    setOutlineGenerating(true);
    setError(null);
    try {
      const deck = await Decks.generateFromOutline({
        outline,
        topic: outlineTopic,
        audience: audience.trim() || undefined,
        tone,
        style,
        model_key: modelKey || undefined,
        image_provider: imageSource === 'ai' ? imageProvider : undefined,
        image_source: imageSource,
      });
      setOutlineOpen(false);
      setOutline([]);
      await load();
      setSelected(deck);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Generation from outline failed');
    } finally {
      setOutlineGenerating(false);
    }
  };

  const onSelectTemplate = (template: DeckTemplate) => {
    setTemplateOpen(false);
    setOutline(template.outline);
    setOutlineTopic(template.name);
    setTopic(template.name);
    setOutlineOpen(true);
  };

  const onDelete = async (deck: Deck) => {
    const ok = await confirm({
      title: 'Delete deck?',
      message: `“${deck.title}” and all its slides will be permanently removed.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await Decks.remove(deck.id);
      if (selected?.id === deck.id) setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete deck');
    }
  };

  const exportDeck = async (deck: Deck, kind: 'pdf' | 'pptx') => {
    try {
      const fn = `${deck.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'deck'}.${kind}`;
      if (kind === 'pdf') await Decks.exportPdf(deck.id, fn);
      else await Decks.exportPptx(deck.id, fn);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Export failed');
    }
  };

  const modelOptions = useMemo(() => models || [], [models]);

  // Floating indicator shown when generation continues after the dialog is
  // minimised/closed — click to reopen the dialog.
  const generatingPill = generating && !open ? (
    <Box
      onClick={() => setOpen(true)}
      sx={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1300,
        display: 'flex', alignItems: 'center', gap: 1.2,
        px: 2.2, py: 1.4, borderRadius: 999, cursor: 'pointer',
        color: '#fff', fontWeight: 700, fontSize: 14,
        background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
        boxShadow: '0 10px 30px rgba(124,58,237,0.4)',
      }}
    >
      <CircularProgress size={16} sx={{ color: '#fff' }} />
      Designing your deck{asyncProgress > 0 ? ` (${asyncProgress}%)` : ''}…
    </Box>
  ) : null;

  /* ----------------------------- Detail view ----------------------------- */
  if (selected) {
    const slides = selected.slides || [];
    return (
      <Box>
        {generatingPill}
        {present && slides.length > 0 && (
          <PresentMode slides={slides} theme={selected.theme} onClose={() => setPresent(false)} />
        )}
        {presenterView && slides.length > 0 && (
          <PresenterView slides={slides} theme={selected.theme} onClose={() => setPresenterView(false)} />
        )}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton onClick={() => setSelected(null)}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="h5" fontWeight={800}>{selected.title}</Typography>
                <IconButton size="small" onClick={() => { setEditTitle(selected.title); setEditStyle(selected.style || 'modern'); setEditOpen(true); }}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Stack>
              {deckSubtitle(selected) && (
                <Typography variant="body2" color="text.secondary">{deckSubtitle(selected)}</Typography>
              )}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<SlideshowIcon />}
              disabled={!slides.length}
              onClick={() => setPresent(true)}
              sx={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontWeight: 700 }}
            >
              Present
            </Button>
            <Button
              variant="outlined"
              startIcon={<SlideshowIcon />}
              disabled={!slides.length}
              onClick={() => setPresenterView(true)}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Presenter
            </Button>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => exportDeck(selected, 'pdf')}>
              PDF
            </Button>
            <Button variant="outlined" startIcon={<SlideshowOutlinedIcon />} onClick={() => exportDeck(selected, 'pptx')}>
              PPTX
            </Button>
            <Button
              size="small"
              startIcon={<ShareIcon />}
              onClick={() => setShareOpen(true)}
              sx={{ textTransform: 'none', color: '#14BB87' }}
            >
              Share & Analytics
            </Button>
            <Tooltip title="Delete deck">
              <IconButton color="error" onClick={() => onDelete(selected)}>
                <DeleteOutlineIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {shareOpen && selected && (
          <ShareAnalyticsDialog
            deck={selected}
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            onUpdate={(d) => {
              setSelected(d);
              setDecks((prev) => prev.map((x) => (x.id === d.id ? { ...x, ...d } : x)));
            }}
          />
        )}

        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Edit deck</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} fullWidth size="small" />
              <TextField select label="Style" value={editStyle} onChange={(e) => setEditStyle(e.target.value)} fullWidth size="small">
                {STYLES.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="contained" disabled={editSaving || !editTitle.trim()} onClick={async () => {
              setEditSaving(true);
              try {
                const updated = await Decks.update(selected.id, { title: editTitle.trim(), style: editStyle });
                setSelected(updated);
                setDecks((prev) => prev.map((d) => d.id === updated.id ? updated : d));
                setEditOpen(false);
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Update failed');
              } finally {
                setEditSaving(false);
              }
            }} sx={{ fontWeight: 700 }}>
              {editSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        <DeckEditor
          deck={selected}
          onChange={(d) => {
            setSelected(d);
            setDecks((prev) => prev.map((x) => (x.id === d.id ? { ...x, ...d } : x)));
          }}
          models={modelOptions}
          defaultModel={defaultId || ''}
        />
      </Box>
    );
  }

  /* ------------------------------ List view ------------------------------ */
  return (
    <Box>
      {generatingPill}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Decks</Typography>
          <Typography variant="body2" color="text.secondary">
            Beautiful branded presentations — generated from your ICP, brand &amp; strategy, with real visuals.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DashboardCustomizeIcon />}
            onClick={() => setTemplateOpen(true)}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            Templates
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontWeight: 700 }}
          >
            New deck
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ my: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 10 }}><CircularProgress /></Stack>
      ) : decks.length === 0 ? (
        <Card sx={{ mt: 4, textAlign: 'center', py: 8, border: '1px dashed', borderColor: 'divider' }}>
          <CardContent>
            <Box
              sx={{
                width: 72, height: 72, borderRadius: 3, mx: 'auto', mb: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
              }}
            >
              <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 36 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} gutterBottom>Create your first deck</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto', mb: 3 }}>
              Describe a pitch, proposal or campaign. MarketIQ designs a beautiful, on-brand deck
              grounded in this workspace — ready to present or export.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setOpen(true)}
              sx={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontWeight: 700 }}
            >
              Generate a deck
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          {decks.map((deck) => {
            const t = deck.theme || {};
            const bg = t.style === 'minimal'
              ? (t.ink || '#111827')
              : `linear-gradient(135deg, ${t.primary || '#14BB87'}, ${t.accent || '#0FA874'})`;
            return (
              <Grid key={deck.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    cursor: 'pointer', overflow: 'hidden', height: '100%',
                    transition: 'transform .15s, box-shadow .15s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  }}
                  onClick={() => openSelected(deck.id)}
                >
                  <Box sx={{ position: 'relative', aspectRatio: '16/9', background: bg, p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: t.accent || '#0FA874' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 20, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                      {deck.title}
                    </Typography>
                    {t.brand_name && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 700, mt: 0.5 }}>
                        {t.brand_name}
                      </Typography>
                    )}
                  </Box>
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={deck.style} sx={{ textTransform: 'capitalize', fontWeight: 700 }} />
                        {deck.status !== 'ready' && (
                          <Chip size="small" color={deck.status === 'failed' ? 'error' : 'warning'} label={deck.status} />
                        )}
                        {typeof deck.slide_count === 'number' && (
                          <Typography variant="caption" color="text.secondary">{deck.slide_count} slides</Typography>
                        )}
                      </Stack>
                      <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(deck); }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Generate dialog */}
      <PremiumDialog open={open} onClose={() => setOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<SlideshowRoundedIcon />}
          title="Generate a deck"
          subtitle="Describe it once — we write the copy and design the slides."
          onClose={() => setOpen(false)}
          right={
            generating ? (
              <Tooltip title="Minimise — keep designing in the background">
                <IconButton size="small" onClick={() => setOpen(false)} sx={{ mr: 0.5 }}>
                  <MinimizeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : undefined
          }
        />
        <DialogBody>
          {generating && (
            <Alert severity="info" icon={<CircularProgress size={16} />} sx={{ mb: 2 }}>
              Designing your deck — this can take up to a minute while we write copy and create visuals.
              You can minimise this and keep working; we&apos;ll open it when it&apos;s ready.
            </Alert>
          )}
          <SectionLabel>Brief</SectionLabel>
          <Stack spacing={2.25}>
            <TextField
              label="What should this deck be about?"
              placeholder="e.g. Investor pitch for our Q3 raise; or a proposal for a B2B SaaS client on LinkedIn demand gen"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              multiline minRows={3} fullWidth size="small" autoFocus
            />
            <TextField
              label="Audience (optional)"
              placeholder="e.g. Seed investors, or the client's CMO"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              fullWidth size="small"
            />
          </Stack>

          <SectionLabel sx={{ mt: 3 }}>Design</SectionLabel>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {STYLES.map((st) => (
                <Box
                  key={st.id}
                  onClick={() => setStyle(st.id)}
                  sx={{
                    cursor: 'pointer', textAlign: 'center',
                    border: '2px solid', borderColor: style === st.id ? 'primary.main' : 'transparent',
                    borderRadius: 2, p: 0.5, transition: 'border-color .15s',
                  }}
                >
                  <Box sx={{ width: 64, height: 40, borderRadius: 1.5, background: st.swatch }} />
                  <Typography variant="caption" sx={{ fontWeight: style === st.id ? 800 : 500 }}>{st.label}</Typography>
                </Box>
              ))}
            </Stack>
            {brandKit && (brandKit.primary_color || brandKit.brand_name) && (
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: '1px solid #E5E7EB', bgcolor: '#FAFBFC' }}>
                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: '#6B7280' }}>Brand kit detected</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75 }}>
                  {brandKit.primary_color && <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: brandKit.primary_color, border: '1px solid rgba(0,0,0,0.1)' }} />}
                  {brandKit.accent_color && <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: brandKit.accent_color, border: '1px solid rgba(0,0,0,0.1)' }} />}
                  {brandKit.brand_name && <Typography variant="body2" fontWeight={700}>{brandKit.brand_name}</Typography>}
                </Stack>
              </Box>
            )}
          </Box>
          <FieldGrid columns={2}>
            <TextField select label="Tone" value={tone} onChange={(e) => setTone(e.target.value)} fullWidth size="small">
              {TONES.map((tn) => <MenuItem key={tn} value={tn}>{tn}</MenuItem>)}
            </TextField>
            <TextField
              select label="Slides" value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))} fullWidth size="small"
            >
              {[6, 8, 10, 12, 14, 16].map((n) => <MenuItem key={n} value={n}>{n} slides</MenuItem>)}
            </TextField>
          </FieldGrid>

          <SectionLabel sx={{ mt: 3 }}>Model &amp; images</SectionLabel>
          <Stack spacing={2.25}>
            {modelOptions.length > 0 && (
              <TextField
                select label="Model" value={model || defaultId || ''}
                onChange={(e) => setModel(e.target.value)} fullWidth size="small"
              >
                {modelOptions.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
              </TextField>
            )}
            <ToggleButtonGroup
              value={imageSource}
              exclusive
              onChange={(_, v) => v && setImageSource(v)}
              fullWidth
              size="small"
            >
              <ToggleButton value="ai" sx={{ fontWeight: 700, textTransform: 'none' }}>
                <AutoAwesomeIcon fontSize="small" sx={{ mr: 0.8 }} /> AI generated
              </ToggleButton>
              <ToggleButton value="stock" sx={{ fontWeight: 700, textTransform: 'none' }}>
                Stock photos
              </ToggleButton>
            </ToggleButtonGroup>
            {imageSource === 'ai' && (
              <TextField
                select label="Image model" value={imageProvider}
                onChange={(e) => setImageProvider(e.target.value)} fullWidth size="small"
              >
                {IMAGE_MODELS.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} sx={ghostPillSx}>{generating ? 'Run in background' : 'Cancel'}</Button>
          <Button
            onClick={onGenerateOutline}
            disabled={generating || outlineGenerating || !topic.trim()}
            startIcon={outlineGenerating ? <CircularProgress size={16} color="inherit" /> : <EditOutlinedIcon />}
            sx={{ ...ghostPillSx, mr: 1 }}
          >
            Outline first
          </Button>
          <Button
            onClick={onGenerate}
            disabled={generating || !topic.trim()}
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            sx={inkPillSx}
          >
            {generating ? 'Designing…' : 'Generate deck'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <OutlineDialog
        open={outlineOpen}
        outline={outline}
        onClose={() => setOutlineOpen(false)}
        onUpdate={setOutline}
        onGenerate={onGenerateFromOutline}
        generating={outlineGenerating}
      />

      <TemplateGallery
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSelect={onSelectTemplate}
      />
    </Box>
  );
}
