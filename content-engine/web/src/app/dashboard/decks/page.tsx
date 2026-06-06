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
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import SlideshowRoundedIcon from '@mui/icons-material/SlideshowRounded';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MinimizeIcon from '@mui/icons-material/Minimize';
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
import { PresentMode } from '@/components/DeckViewer';
import DeckEditor from '@/components/DeckEditor';
import { Decks, ApiError, IMAGE_MODELS, type Deck } from '@/lib/api';

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

export default function DecksPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();
  const { models, defaultId } = useAIModels();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Deck | null>(null);
  const [present, setPresent] = useState(false);
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
      const deck = await Decks.generate({
        topic: topic.trim(),
        audience: audience.trim() || undefined,
        tone,
        style,
        slide_count: slideCount,
        model_key: modelKey || undefined,
        image_provider: imageSource === 'ai' ? imageProvider : undefined,
        image_source: imageSource,
      });
      setOpen(false);
      setTopic('');
      setAudience('');
      await load();
      setSelected(deck);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Deck generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
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
      Designing your deck…
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
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton onClick={() => setSelected(null)}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight={800}>{selected.title}</Typography>
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
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => exportDeck(selected, 'pdf')}>
              PDF
            </Button>
            <Button variant="outlined" startIcon={<SlideshowOutlinedIcon />} onClick={() => exportDeck(selected, 'pptx')}>
              PPTX
            </Button>
            <Tooltip title="Delete deck">
              <IconButton color="error" onClick={() => onDelete(selected)}>
                <DeleteOutlineIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontWeight: 700 }}
        >
          New deck
        </Button>
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
            onClick={onGenerate}
            disabled={generating || !topic.trim()}
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            sx={inkPillSx}
          >
            {generating ? 'Designing…' : 'Generate deck'}
          </Button>
        </DialogFooter>
      </PremiumDialog>
    </Box>
  );
}
