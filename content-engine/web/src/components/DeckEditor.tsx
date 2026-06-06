'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ImageIcon from '@mui/icons-material/Image';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CloseIcon from '@mui/icons-material/Close';
import { Slide } from '@/components/DeckViewer';
import { Decks, ApiError, type Deck, type DeckSlide } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';

const LAYOUTS: Array<{ id: string; label: string }> = [
  { id: 'cover', label: 'Cover' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'section', label: 'Section break' },
  { id: 'bullets', label: 'Bullets' },
  { id: 'two_column', label: 'Two column' },
  { id: 'cards', label: 'Cards grid' },
  { id: 'process', label: 'Process flow' },
  { id: 'comparison_matrix', label: 'Comparison table' },
  { id: 'stats', label: 'Stats' },
  { id: 'quote', label: 'Quote' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'cta', label: 'Call to action' },
  { id: 'image', label: 'Big image' },
  { id: 'references', label: 'Sources' },
];
const LAYOUT_LABEL: Record<string, string> = Object.fromEntries(LAYOUTS.map((l) => [l.id, l.label]));

type Data = Record<string, unknown>;
const asStr = (v: unknown): string => (v == null ? '' : String(v));
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/* ------------------------------------------------------------------ */
/* Per-layout inline inspector                                         */
/* ------------------------------------------------------------------ */
function Field({ label, value, onChange, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
    />
  );
}

function ListEditor<T extends Data>({
  title, items, render, onChange, blank, max = 6,
}: {
  title: string;
  items: T[];
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
  onChange: (items: T[]) => void;
  blank: () => T;
  max?: number;
}) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.4, color: 'text.secondary' }}>
          {title.toUpperCase()}
        </Typography>
        {items.length < max && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...items, blank()])}>
            Add
          </Button>
        )}
      </Stack>
      <Stack spacing={1.5}>
        {items.map((it, i) => (
          <Box key={i} sx={{ p: 1.2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="flex-end">
              <IconButton size="small" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Stack spacing={1}>
              {render(it, (patch) =>
                onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))),
              )}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function Inspector({ layout, data, onData }: {
  layout: string; data: Data; onData: (d: Data) => void;
}) {
  const set = (patch: Data) => onData({ ...data, ...patch });

  const titleField = <Field label="Title" value={asStr(data.title)} onChange={(v) => set({ title: v })} />;
  const eyebrow = <Field label="Eyebrow / kicker" value={asStr(data.eyebrow)} onChange={(v) => set({ eyebrow: v })} />;
  const subtitle = <Field label="Subtitle" value={asStr(data.subtitle)} onChange={(v) => set({ subtitle: v })} multiline />;

  if (layout === 'cover' || layout === 'section' || layout === 'image') {
    return <Stack spacing={1.5}>{eyebrow}{titleField}{subtitle}</Stack>;
  }
  if (layout === 'quote') {
    return (
      <Stack spacing={1.5}>
        <Field label="Quote" value={asStr(data.quote)} onChange={(v) => set({ quote: v })} multiline />
        <Field label="Attribution" value={asStr(data.attribution)} onChange={(v) => set({ attribution: v })} />
      </Stack>
    );
  }
  if (layout === 'cta') {
    return (
      <Stack spacing={1.5}>
        {titleField}
        <Field label="Body" value={asStr(data.body)} onChange={(v) => set({ body: v })} multiline />
        <Field label="Button text" value={asStr(data.cta)} onChange={(v) => set({ cta: v })} />
      </Stack>
    );
  }
  if (layout === 'agenda') {
    const items = asArr(data.items).map(asStr);
    return (
      <Stack spacing={1.5}>
        {titleField}
        <ListEditor<{ v: string }>
          title="Items"
          items={items.map((v) => ({ v }))}
          blank={() => ({ v: '' })}
          onChange={(arr) => set({ items: arr.map((x) => x.v) })}
          render={(it, s) => <Field label="Item" value={it.v} onChange={(v) => s({ v })} />}
        />
      </Stack>
    );
  }
  if (layout === 'references') {
    const items = asArr(data.items) as Array<{ label?: string; url?: string }>;
    return (
      <Stack spacing={1.5}>
        {titleField}
        <ListEditor<{ label: string; url: string }>
          title="Sources"
          items={items.map((x) => ({ label: asStr(x?.label), url: asStr(x?.url) }))}
          blank={() => ({ label: '', url: '' })}
          max={14}
          onChange={(arr) => set({ items: arr })}
          render={(it, s) => (
            <>
              <Field label="Label" value={it.label} onChange={(label) => s({ label })} />
              <Field label="URL" value={it.url} onChange={(url) => s({ url })} />
            </>
          )}
        />
      </Stack>
    );
  }
  if (layout === 'bullets') {
    const bullets = asArr(data.bullets) as Array<{ heading?: string; body?: string }>;
    return (
      <Stack spacing={1.5}>
        {titleField}{subtitle}
        <ListEditor<{ heading: string; body: string }>
          title="Bullets"
          items={bullets.map((b) => ({ heading: asStr(b?.heading), body: asStr(b?.body) }))}
          blank={() => ({ heading: '', body: '' })}
          max={4}
          onChange={(arr) => set({ bullets: arr })}
          render={(it, s) => (
            <>
              <Field label="Heading" value={it.heading} onChange={(heading) => s({ heading })} />
              <Field label="Body" value={it.body} onChange={(body) => s({ body })} multiline />
            </>
          )}
        />
      </Stack>
    );
  }
  if (layout === 'stats') {
    const stats = asArr(data.stats) as Array<{ value?: string; label?: string }>;
    return (
      <Stack spacing={1.5}>
        {titleField}{subtitle}
        <ListEditor<{ value: string; label: string }>
          title="Stats"
          items={stats.map((x) => ({ value: asStr(x?.value), label: asStr(x?.label) }))}
          blank={() => ({ value: '', label: '' })}
          max={4}
          onChange={(arr) => set({ stats: arr })}
          render={(it, s) => (
            <>
              <Field label="Value" value={it.value} onChange={(value) => s({ value })} />
              <Field label="Label" value={it.label} onChange={(label) => s({ label })} />
            </>
          )}
        />
      </Stack>
    );
  }
  if (layout === 'timeline') {
    const steps = asArr(data.steps) as Array<{ label?: string; body?: string }>;
    return (
      <Stack spacing={1.5}>
        {titleField}
        <ListEditor<{ label: string; body: string }>
          title="Steps"
          items={steps.map((x) => ({ label: asStr(x?.label), body: asStr(x?.body) }))}
          blank={() => ({ label: '', body: '' })}
          max={5}
          onChange={(arr) => set({ steps: arr })}
          render={(it, s) => (
            <>
              <Field label="Label" value={it.label} onChange={(label) => s({ label })} />
              <Field label="Body" value={it.body} onChange={(body) => s({ body })} multiline />
            </>
          )}
        />
      </Stack>
    );
  }
  if (layout === 'two_column' || layout === 'comparison') {
    const col = (key: 'left' | 'right') => {
      const c = (data[key] as Data) || {};
      const setCol = (patch: Data) => set({ [key]: { ...c, ...patch } });
      const items = asArr(c.items).map(asStr);
      return (
        <Box sx={{ p: 1.2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
            {key.toUpperCase()}
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Field label="Heading" value={asStr(c.heading)} onChange={(v) => setCol({ heading: v })} />
            {layout === 'two_column' && (
              <Field label="Body" value={asStr(c.body)} onChange={(v) => setCol({ body: v })} multiline />
            )}
            <ListEditor<{ v: string }>
              title="Items"
              items={items.map((v) => ({ v }))}
              blank={() => ({ v: '' })}
              max={4}
              onChange={(arr) => setCol({ items: arr.map((x) => x.v) })}
              render={(it, s) => <Field label="Item" value={it.v} onChange={(v) => s({ v })} />}
            />
          </Stack>
        </Box>
      );
    };
    return <Stack spacing={1.5}>{titleField}{col('left')}{col('right')}</Stack>;
  }
  // Fallback: editable JSON-ish title.
  return <Stack spacing={1.5}>{titleField}{subtitle}</Stack>;
}

/* ------------------------------------------------------------------ */
/* Main editor                                                         */
/* ------------------------------------------------------------------ */
export default function DeckEditor({
  deck, onChange, models, defaultModel,
}: {
  deck: Deck;
  onChange: (deck: Deck) => void;
  models: Array<{ id: string; label: string }>;
  defaultModel: string;
}) {
  const confirm = useConfirm();
  const slides = useMemo(() => deck.slides || [], [deck.slides]);
  const [selectedId, setSelectedId] = useState<string | null>(slides[0]?.id ?? null);
  const [draft, setDraft] = useState<DeckSlide | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // action key currently running
  const [error, setError] = useState<string | null>(null);
  const [layoutMenu, setLayoutMenu] = useState<null | HTMLElement>(null);
  const [model, setModel] = useState(defaultModel || '');
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [regenLayout, setRegenLayout] = useState(''); // '' = keep current design
  const [regenWithImage, setRegenWithImage] = useState(true);
  const [regenRewrite, setRegenRewrite] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const selected = useMemo(
    () => slides.find((s) => s.id === selectedId) || slides[0] || null,
    [slides, selectedId],
  );

  // Keep a local editable draft in sync. Reset when the user switches slides, or
  // when an AI action changed the slide externally — but never clobber in-flight
  // keystrokes (autosave echoes the same content back, so that's a no-op).
  useEffect(() => {
    if (!selected) { setDraft(null); return; }
    setDraft((prev) => {
      if (prev && prev.id === selected.id) {
        if (dirty.current) return prev; // user is mid-edit; keep their draft
        const same =
          prev.layout === selected.layout &&
          (prev.speaker_notes || '') === (selected.speaker_notes || '') &&
          JSON.stringify(prev.data) === JSON.stringify(selected.data);
        if (same) return prev;
      }
      return JSON.parse(JSON.stringify(selected));
    });
  }, [selected]);

  useEffect(() => {
    if (!selectedId && slides[0]) setSelectedId(slides[0].id);
  }, [slides, selectedId]);

  const modelKey = model || defaultModel || undefined;

  const run = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(key);
      setError(null);
      try {
        return await fn();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  /* ----- persistence ----- */
  const persistDraft = useCallback(
    async (next: DeckSlide) => {
      const updated = await run('save', () =>
        Decks.updateSlide(deck.id, next.id, {
          layout: next.layout,
          data: next.data,
          speaker_notes: next.speaker_notes || '',
        }),
      );
      dirty.current = false;
      if (updated) onChange(updated);
    },
    [deck.id, onChange, run],
  );

  const onDraftData = (data: Data) => {
    if (!draft) return;
    const next = { ...draft, data };
    dirty.current = true;
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistDraft(next), 700);
  };
  const onDraftNotes = (speaker_notes: string) => {
    if (!draft) return;
    const next = { ...draft, speaker_notes };
    dirty.current = true;
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistDraft(next), 700);
  };

  /* ----- slide actions ----- */
  const doRegenerate = async (opts: {
    instruction?: string;
    layout?: string;
    withImage?: boolean;
    rewriteContent?: boolean;
  } = {}) => {
    if (!selected) return;
    const updated = await run('regen', () =>
      Decks.regenerateSlide(deck.id, selected.id, {
        instruction: opts.instruction?.trim() || undefined,
        layout: opts.layout || undefined,
        model_key: modelKey,
        with_image: opts.withImage ?? true,
        rewrite_content: opts.rewriteContent ?? true,
      }),
    );
    if (updated) onChange(updated);
  };

  const doRegenImage = async () => {
    if (!selected) return;
    const updated = await run('image', () => Decks.regenerateSlideImage(deck.id, selected.id));
    if (updated) onChange(updated);
  };

  const doDuplicate = async () => {
    if (!selected) return;
    const updated = await run('dup', () => Decks.duplicateSlide(deck.id, selected.id));
    if (updated) onChange(updated);
  };

  const doDelete = async (slide: DeckSlide) => {
    const ok = await confirm({
      title: 'Delete slide?',
      message: 'This slide will be permanently removed from the deck.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const idx = slides.findIndex((s) => s.id === slide.id);
    const updated = await run('del', () => Decks.deleteSlide(deck.id, slide.id));
    if (updated) {
      onChange(updated);
      const next = updated.slides || [];
      setSelectedId(next[Math.max(0, idx - 1)]?.id ?? next[0]?.id ?? null);
    }
  };

  const doAdd = async (layout = 'bullets') => {
    const updated = await run('add', () =>
      Decks.addSlide(deck.id, {
        after_slide_id: selected?.id,
        layout,
        generate: true,
        model_key: modelKey,
      }),
    );
    if (updated) {
      onChange(updated);
      const prevIds = new Set(slides.map((s) => s.id));
      const created = (updated.slides || []).find((s) => !prevIds.has(s.id));
      if (created) setSelectedId(created.id);
    }
  };

  const move = async (slide: DeckSlide, dir: -1 | 1) => {
    const order = slides.map((s) => s.id);
    const i = order.indexOf(slide.id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    const updated = await run('move', () => Decks.reorder(deck.id, order));
    if (updated) onChange(updated);
  };

  if (!slides.length) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }} spacing={2}>
        <Typography color="text.secondary">This deck has no slides yet.</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => doAdd()} disabled={busy === 'add'}>
          Add a slide
        </Button>
      </Stack>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ position: 'fixed', top: 80, right: 24, zIndex: 1400, maxWidth: 380 }}>
          {error}
        </Alert>
      )}

      {/* -------- Thumbnail rail -------- */}
      <Box sx={{ width: 188, flexShrink: 0, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', pr: 0.5 }}>
        <Stack spacing={1.2}>
          {slides.map((s, i) => {
            const active = s.id === selected?.id;
            return (
              <Box key={s.id} sx={{ position: 'relative' }}>
                <Box
                  onClick={() => setSelectedId(s.id)}
                  sx={{
                    cursor: 'pointer', borderRadius: 1.5, overflow: 'hidden',
                    border: '2px solid', borderColor: active ? 'primary.main' : 'transparent',
                    boxShadow: active ? 4 : 1, transition: 'border-color .15s, box-shadow .15s',
                    '&:hover': { boxShadow: 3 },
                  }}
                >
                  <Box sx={{ pointerEvents: 'none' }}>
                    <Slide slide={s} theme={deck.theme} index={i} total={slides.length} />
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ position: 'absolute', top: 4, left: 6, color: '#fff', fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>
                  {i + 1}
                </Typography>
              </Box>
            );
          })}
          <Button
            variant="outlined"
            startIcon={busy === 'add' ? <CircularProgress size={14} /> : <AddIcon />}
            onClick={() => doAdd()}
            disabled={!!busy}
            sx={{ borderStyle: 'dashed', py: 1.2 }}
          >
            Add slide
          </Button>
        </Stack>
      </Box>

      {/* -------- Canvas with hover toolbar -------- */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {selected && (
          <Box
            sx={{
              position: 'relative',
              '&:hover .slide-toolbar': { opacity: 1, transform: 'translateY(0)' },
            }}
          >
            {/* Gamma-style hover popup toolbar */}
            <Stack
              className="slide-toolbar"
              direction="row"
              spacing={0.5}
              sx={{
                position: 'absolute', top: 12, right: 12, zIndex: 5,
                p: 0.5, borderRadius: 2, bgcolor: 'rgba(17,24,39,0.92)',
                backdropFilter: 'blur(8px)', boxShadow: 6,
                opacity: 0, transform: 'translateY(-6px)', transition: 'opacity .18s, transform .18s',
              }}
            >
              <Tooltip title="Regenerate this slide with AI">
                <span>
                  <IconButton size="small" sx={{ color: '#fff' }} disabled={!!busy} onClick={() => doRegenerate()}>
                    {busy === 'regen' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Edit with AI — rewrite, redesign & regenerate image">
                <span>
                  <IconButton size="small" sx={{ color: '#fff' }} disabled={!!busy} onClick={() => { setRegenInstruction(''); setRegenLayout(''); setRegenWithImage(true); setRegenRewrite(true); setRegenOpen(true); }}>
                    <EditNoteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Change layout">
                <span>
                  <IconButton size="small" sx={{ color: '#fff' }} disabled={!!busy} onClick={(e) => setLayoutMenu(e.currentTarget)}>
                    <DashboardCustomizeIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Regenerate image">
                <span>
                  <IconButton size="small" sx={{ color: '#fff' }} disabled={!!busy} onClick={doRegenImage}>
                    {busy === 'image' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <ImageIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
              <Tooltip title="Move up">
                <span>
                  <IconButton size="small" sx={{ color: '#fff' }} disabled={!!busy} onClick={() => move(selected, -1)}>
                    <KeyboardArrowUpIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move down">
                <span>
                  <IconButton size="small" sx={{ color: '#fff' }} disabled={!!busy} onClick={() => move(selected, 1)}>
                    <KeyboardArrowDownIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Duplicate">
                <span>
                  <IconButton size="small" sx={{ color: '#fff' }} disabled={!!busy} onClick={doDuplicate}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Delete slide">
                <span>
                  <IconButton size="small" sx={{ color: '#ff8a8a' }} disabled={!!busy} onClick={() => doDelete(selected)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>

            {/* busy overlay while regenerating */}
            {(busy === 'regen' || busy === 'image') && (
              <Box sx={{
                position: 'absolute', inset: 0, zIndex: 4, borderRadius: 3,
                bgcolor: 'rgba(11,27,22,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', gap: 1.5, flexDirection: 'column',
              }}>
                <CircularProgress sx={{ color: '#fff' }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {busy === 'image' ? 'Creating a fresh visual…' : 'Redesigning this slide…'}
                </Typography>
              </Box>
            )}

            <Slide slide={selected} theme={deck.theme} index={slides.indexOf(selected)} total={slides.length} />
          </Box>
        )}

        {selected?.speaker_notes ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontStyle: 'italic' }}>
            🎤 {selected.speaker_notes}
          </Typography>
        ) : null}
      </Box>

      {/* -------- Inspector -------- */}
      <Box sx={{ width: 320, flexShrink: 0, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={800}>Edit slide</Typography>
            {selected && <Chip size="small" label={LAYOUT_LABEL[selected.layout] || selected.layout} />}
            {busy === 'save' && <CircularProgress size={16} />}
          </Stack>
          {models.length > 0 && (
            <TextField select size="small" label="AI model" value={model || defaultModel || ''} onChange={(e) => setModel(e.target.value)} fullWidth>
              {models.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
            </TextField>
          )}
          <Divider />
          {draft && <Inspector layout={draft.layout} data={(draft.data as Data) || {}} onData={onDraftData} />}
          <Divider />
          <Field
            label="Speaker notes"
            value={asStr(draft?.speaker_notes)}
            onChange={onDraftNotes}
            multiline
          />
        </Stack>
      </Box>

      {/* Change-layout menu */}
      <Menu anchorEl={layoutMenu} open={!!layoutMenu} onClose={() => setLayoutMenu(null)}>
        {LAYOUTS.map((l) => (
          <MenuItem
            key={l.id}
            selected={selected?.layout === l.id}
            onClick={() => { setLayoutMenu(null); doRegenerate({ layout: l.id }); }}
          >
            {l.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Edit-with-AI dialog — rewrite copy, redesign layout, regenerate image */}
      <Dialog open={regenOpen} onClose={() => setRegenOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Edit with AI
          <IconButton size="small" onClick={() => setRegenOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tell the AI how to improve this slide — it stays grounded in your brand, research & strategy.
            You can also redesign its layout and generate a fresh visual.
          </Typography>
          <TextField
            value={regenInstruction}
            onChange={(e) => setRegenInstruction(e.target.value)}
            placeholder="e.g. Make it punchier with a real market-size stat and a source; focus on B2B buyers"
            multiline minRows={3} fullWidth autoFocus
            disabled={!regenRewrite}
            label="Instructions"
          />

          <Divider sx={{ my: 2 }} />

          <TextField
            select size="small" fullWidth
            label="Design (layout)"
            value={regenLayout}
            onChange={(e) => setRegenLayout(e.target.value)}
            helperText="Switch the slide to a different layout, or keep its current design."
          >
            <MenuItem value="">Keep current design{selected ? ` — ${LAYOUT_LABEL[selected.layout] || selected.layout}` : ''}</MenuItem>
            {LAYOUTS.map((l) => <MenuItem key={l.id} value={l.id}>{l.label}</MenuItem>)}
          </TextField>

          <Stack sx={{ mt: 1.5 }}>
            <FormControlLabel
              control={<Switch checked={regenRewrite} onChange={(e) => setRegenRewrite(e.target.checked)} />}
              label="Rewrite the slide content with AI"
            />
            <FormControlLabel
              control={<Switch checked={regenWithImage} onChange={(e) => setRegenWithImage(e.target.checked)} />}
              label="Generate a fresh image for this slide"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRegenOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={busy === 'regen' ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            disabled={busy === 'regen' || (!regenRewrite && !regenLayout && !regenWithImage)}
            onClick={async () => {
              setRegenOpen(false);
              await doRegenerate({
                instruction: regenInstruction,
                layout: regenLayout || undefined,
                withImage: regenWithImage,
                rewriteContent: regenRewrite,
              });
            }}
            sx={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontWeight: 700 }}
          >
            Apply with AI
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
