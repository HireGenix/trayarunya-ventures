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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CloseIcon from '@mui/icons-material/Close';
import { Slide } from '@/components/DeckViewer';
import { Decks, ApiError, type Deck, type DeckSlide } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import ThemePicker from '@/components/ThemePicker';
import CommentsPanel from '@/components/CommentsPanel';
import VersionsPanel from '@/components/VersionsPanel';

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

/* Apply an inline-edit dot-path (e.g. "title", "bullets.0.heading",
   "left.items.2") onto a slide's data object, creating arrays/objects as
   needed. Mutates `obj` in place. */
function setByPath(obj: Data, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const nextNumeric = /^\d+$/.test(parts[i + 1]);
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = nextNumeric ? [] : {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

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
  const [rightPanel, setRightPanel] = useState<'inspector' | 'comments' | 'versions'>('inspector');
  const [commentCount, setCommentCount] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

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

  const doAdd = async (layout = 'bullets', afterId?: string) => {
    const updated = await run('add', () =>
      Decks.addSlide(deck.id, {
        after_slide_id: afterId ?? selected?.id,
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

  /* Drag-to-reorder in the thumbnail rail. */
  const reorderTo = async (fromId: string, toIndex: number) => {
    const order = slides.map((s) => s.id);
    const from = order.indexOf(fromId);
    if (from < 0 || toIndex < 0 || toIndex >= order.length || from === toIndex) return;
    order.splice(toIndex, 0, order.splice(from, 1)[0]);
    const updated = await run('move', () => Decks.reorder(deck.id, order));
    if (updated) onChange(updated);
  };

  /* Inline click-to-edit on the slide canvas → patch draft.data + autosave. */
  const onInlinePatch = (path: string, value: string) => {
    const base = draft && selected && draft.id === selected.id ? draft : selected;
    if (!base) return;
    const data = JSON.parse(JSON.stringify(base.data || {})) as Data;
    setByPath(data, path, value);
    onDraftData(data);
  };

  /* Live canvas reflects in-flight edits before the autosave round-trips. */
  const idx = selected ? slides.findIndex((s) => s.id === selected.id) : -1;
  const canvasSlide = draft && selected && draft.id === selected.id ? draft : selected;
  const goto = (n: number) => {
    const s = slides[n];
    if (s) setSelectedId(s.id);
  };

  /* Keyboard: ←/→ navigate slides, Cmd/Ctrl+Enter regenerates the current slide.
     Ignored while typing in an input or inline-editable text. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (
        el.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
      );
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!busy) { e.preventDefault(); doRegenerate(); }
        return;
      }
      if (typing) return;
      if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); goto(idx - 1); }
      else if (e.key === 'ArrowRight' && idx < slides.length - 1) { e.preventDefault(); goto(idx + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, slides.length, busy]);

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
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'stretch',
        height: { xs: 'auto', md: 'calc(100vh - 232px)' },
        minHeight: { xs: 'unset', md: 520 },
      }}
    >
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ position: 'fixed', top: 80, right: 24, zIndex: 1400, maxWidth: 380 }}>
          {error}
        </Alert>
      )}

      {/* -------- Thumbnail rail -------- */}
      <Box
        sx={{
          width: 222,
          flexShrink: 0,
          height: '100%',
          overflowY: 'auto',
          pr: 0.5,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Stack spacing={1}>
          {slides.map((s, i) => {
            const active = s.id === selected?.id;
            const isOver = dragOver === i && dragId && dragId !== s.id;
            return (
              <Box
                key={s.id}
                draggable
                onDragStart={() => setDragId(s.id)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                onDrop={() => { if (dragId) reorderTo(dragId, i); setDragId(null); setDragOver(null); }}
                onDragEnd={() => { setDragId(null); setDragOver(null); }}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  opacity: dragId === s.id ? 0.4 : 1,
                  '&:hover .drag-handle, &:hover .insert-btn': { opacity: 1 },
                }}
              >
                <Typography
                  sx={{
                    width: 16, flexShrink: 0, textAlign: 'right',
                    fontSize: 12, fontWeight: 800,
                    color: active ? '#14BB87' : 'text.secondary',
                  }}
                >
                  {i + 1}
                </Typography>
                <Box
                  onClick={() => setSelectedId(s.id)}
                  sx={{
                    flex: 1, minWidth: 0, position: 'relative',
                    cursor: 'pointer', borderRadius: 1.5, overflow: 'hidden',
                    border: '2px solid',
                    borderColor: active ? '#14BB87' : 'transparent',
                    boxShadow: active ? '0 6px 18px rgba(20,187,135,0.28)' : 1,
                    outline: isOver ? '2px dashed #14BB87' : 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  <Box sx={{ pointerEvents: 'none' }}>
                    <Slide slide={s} theme={deck.theme} index={i} total={slides.length} />
                  </Box>
                  <DragIndicatorIcon
                    className="drag-handle"
                    sx={{
                      position: 'absolute', top: 3, right: 3, fontSize: 16,
                      color: '#fff', opacity: 0, transition: 'opacity .15s',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.6))', cursor: 'grab',
                    }}
                  />
                </Box>
                {/* insert-between affordance */}
                <Tooltip title="Add slide here">
                  <IconButton
                    className="insert-btn"
                    size="small"
                    disabled={!!busy}
                    onClick={() => doAdd('bullets', s.id)}
                    sx={{
                      position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
                      zIndex: 2, width: 20, height: 20, bgcolor: '#14BB87', color: '#fff',
                      opacity: 0, transition: 'opacity .15s', boxShadow: 2,
                      '&:hover': { bgcolor: '#0FA874' },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
          <Button
            variant="outlined"
            startIcon={busy === 'add' ? <CircularProgress size={14} /> : <AddIcon />}
            onClick={() => doAdd()}
            disabled={!!busy}
            sx={{ borderStyle: 'dashed', py: 1.2, ml: '24px' }}
          >
            Add slide
          </Button>
        </Stack>
      </Box>

      {/* -------- Stage (canvas) -------- */}
      <Box
        sx={{
          flex: 1, minWidth: 0, height: { xs: 'auto', md: '100%' },
          display: 'flex', flexDirection: 'column',
          borderRadius: 3, overflow: 'hidden',
          bgcolor: '#0B1B16',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
        }}
      >
        {/* persistent action bar */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ px: 1.25, py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          {selected && (
            <Chip
              size="small"
              label={LAYOUT_LABEL[selected.layout] || selected.layout}
              sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700, mr: 0.5 }}
            />
          )}
          {busy === 'save' && <CircularProgress size={15} sx={{ color: 'rgba(255,255,255,0.8)' }} />}
          <Box sx={{ flex: 1 }} />
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
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)', mx: 0.5 }} />
          <Tooltip title="Duplicate slide">
            <span>
              <IconButton size="small" sx={{ color: '#fff' }} disabled={!!busy} onClick={doDuplicate}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete slide">
            <span>
              <IconButton size="small" sx={{ color: '#ff8a8a' }} disabled={!!busy || slides.length <= 1} onClick={() => selected && doDelete(selected)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* stage area */}
        <Box
          sx={{
            flex: 1, minHeight: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            p: { xs: 1.5, md: 3 }, position: 'relative', overflow: 'auto',
          }}
        >
          {canvasSlide && (
            <Box
              sx={{
                position: 'relative',
                width: { xs: '100%', md: 'min(100%, calc((100vh - 360px) * 16 / 9))' },
              }}
            >
              {(busy === 'regen' || busy === 'image') && (
                <Box sx={{
                  position: 'absolute', inset: 0, zIndex: 4, borderRadius: 3,
                  bgcolor: 'rgba(11,27,22,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', gap: 1.5, flexDirection: 'column',
                }}>
                  <CircularProgress sx={{ color: '#fff' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {busy === 'image' ? 'Creating a fresh visual…' : 'Redesigning this slide…'}
                  </Typography>
                </Box>
              )}
              <Box sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,0.45)' }}>
                <Slide
                  slide={canvasSlide}
                  theme={deck.theme}
                  index={idx}
                  total={slides.length}
                  editable
                  onPatch={onInlinePatch}
                />
              </Box>
            </Box>
          )}
        </Box>

        {/* bottom navigation bar */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={1.5}
          sx={{ px: 1.5, py: 0.6, borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
        >
          <Tooltip title="Previous slide (←)">
            <span>
              <IconButton size="small" sx={{ color: '#fff' }} disabled={idx <= 0} onClick={() => goto(idx - 1)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Typography sx={{ fontSize: 13, fontWeight: 700, minWidth: 56, textAlign: 'center' }}>
            {idx + 1} / {slides.length}
          </Typography>
          <Tooltip title="Next slide (→)">
            <span>
              <IconButton size="small" sx={{ color: '#fff' }} disabled={idx >= slides.length - 1} onClick={() => goto(idx + 1)}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.15)', mx: 0.5 }} />
          <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', display: { xs: 'none', sm: 'block' } }}>
            ✦ Click any text on the slide to edit it inline
          </Typography>
        </Stack>
      </Box>

      {/* -------- Inspector / Comments / Versions -------- */}
      <Box sx={{ width: 336, flexShrink: 0, height: { xs: 'auto', md: '100%' }, minHeight: { xs: 480, md: 'unset' }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column' }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant={rightPanel === 'inspector' ? 'contained' : 'text'}
            onClick={() => setRightPanel('inspector')}
            sx={{ textTransform: 'none', ...(rightPanel === 'inspector' && { bgcolor: '#14BB87', '&:hover': { bgcolor: '#0FA874' } }) }}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant={rightPanel === 'comments' ? 'contained' : 'text'}
            onClick={() => setRightPanel('comments')}
            sx={{ textTransform: 'none', ...(rightPanel === 'comments' && { bgcolor: '#14BB87', '&:hover': { bgcolor: '#0FA874' } }) }}
          >
            Comments{commentCount > 0 ? ` (${commentCount})` : ''}
          </Button>
          <Button
            size="small"
            variant={rightPanel === 'versions' ? 'contained' : 'text'}
            onClick={() => setRightPanel('versions')}
            sx={{ textTransform: 'none', ...(rightPanel === 'versions' && { bgcolor: '#14BB87', '&:hover': { bgcolor: '#0FA874' } }) }}
          >
            Versions
          </Button>
          <Box sx={{ flex: 1 }} />
          <ThemePicker
            deckId={deck.id}
            currentThemeId={deck.theme?.theme_id}
            onApplied={(updated) => onChange(updated)}
          />
        </Stack>

        {rightPanel === 'inspector' && (
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
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
        )}

        {rightPanel === 'comments' && (
          <Box sx={{ flex: 1, minHeight: 0, border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
            <CommentsPanel
              deckId={deck.id}
              activeSlide={selected ? slides.indexOf(selected) : 0}
              onCountChange={setCommentCount}
            />
          </Box>
        )}

        {rightPanel === 'versions' && (
          <Box sx={{ flex: 1, minHeight: 0, border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
            <VersionsPanel deckId={deck.id} onRestored={(updated) => onChange(updated)} />
          </Box>
        )}
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
