'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from '@mui/material';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DesktopMacRoundedIcon from '@mui/icons-material/DesktopMacRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
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
import { api } from '@/lib/api';
import BlockEditor, { MergeTagMenu } from './BlockEditor';
import {
  type Block,
  blocksFromRaw,
  blocksToRaw,
  compileBlocksToHtml,
  INK,
  SUBTLE,
  LINE,
} from './blocks';

interface EmailList {
  id: string;
  name: string;
  description?: string | null;
}
export interface EmailSegment {
  id: string;
  name: string;
  list_id?: string | null;
  rules?: { match?: string; conditions?: unknown[] } | null;
}
export interface CampaignSeed {
  id?: string;
  name?: string;
  subject?: string;
  preheader?: string;
  body_html?: string | null;
  body_blocks?: unknown;
}

type ContentMode = 'blocks' | 'raw';

interface ABVariant {
  key: string;
  subject: string;
  body_html?: string;
}

interface CampaignDraft {
  name: string;
  subject: string;
  preheader: string;
  body_html: string;
  from_name: string;
  brief: string;
  list_id: string;
  segment_id: string;
  audience: 'list' | 'segment';
  scheduled_at: string;
  ab_enabled: boolean;
  ab_variants: ABVariant[];
  ab_holdout_pct: number;
  ab_winner_metric: string;
}

const EMPTY: CampaignDraft = {
  name: '',
  subject: '',
  preheader: '',
  body_html: '',
  from_name: '',
  brief: '',
  list_id: '',
  segment_id: '',
  audience: 'list',
  scheduled_at: '',
  ab_enabled: false,
  ab_variants: [],
  ab_holdout_pct: 20,
  ab_winner_metric: 'opens',
};

const STEPS = ['Setup', 'Audience', 'Content', 'Review'] as const;

interface SegmentPreview {
  count: number;
  sample: { id: string; email: string; name: string | null; status: string }[];
}

export default function CampaignBuilder({
  open,
  onClose,
  lists,
  segments,
  seed,
  onCreated,
  onToast,
  onSegmentCreated,
}: {
  open: boolean;
  onClose: () => void;
  lists: EmailList[];
  segments: EmailSegment[];
  seed?: CampaignSeed | null;
  onCreated: () => void;
  onToast: (m: string) => void;
  onSegmentCreated?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CampaignDraft>(EMPTY);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [mode, setMode] = useState<ContentMode>('blocks');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const subjectRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const subjectCaret = useRef<number | null>(null);

  // Inline segment creation
  const [showSegForm, setShowSegForm] = useState(false);
  const [segName, setSegName] = useState('');
  const [segField, setSegField] = useState('status');
  const [segValue, setSegValue] = useState('subscribed');
  const [segSaving, setSegSaving] = useState(false);

  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const set = (patch: Partial<CampaignDraft>) => setForm((f) => ({ ...f, ...patch }));

  // Seed the builder from a template/clone when opened.
  useEffect(() => {
    if (!open) return;
    if (seed) {
      const seededBlocks = blocksFromRaw(seed.body_blocks);
      setForm({
        ...EMPTY,
        name: seed.name || '',
        subject: seed.subject || '',
        preheader: seed.preheader || '',
        body_html: seed.body_html || '',
      });
      setBlocks(seededBlocks);
      setMode(seededBlocks.length > 0 ? 'blocks' : seed.body_html ? 'raw' : 'blocks');
    } else {
      setForm(EMPTY);
      setBlocks([]);
      setMode('blocks');
    }
    setStep(0);
    setShowSegForm(false);
    setPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed]);

  function handleClose() {
    onClose();
  }

  const selectedList = useMemo(
    () => lists.find((l) => l.id === form.list_id),
    [lists, form.list_id],
  );
  const selectedSegment = useMemo(
    () => segments.find((s) => s.id === form.segment_id),
    [segments, form.segment_id],
  );

  // Load segment preview count whenever a segment is chosen.
  useEffect(() => {
    let cancelled = false;
    if (form.audience === 'segment' && form.segment_id) {
      setPreviewLoading(true);
      setPreview(null);
      api<SegmentPreview>(`/email/segments/${form.segment_id}/preview`, { workspace: true })
        .then((p) => {
          if (!cancelled) setPreview(p);
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    } else {
      setPreview(null);
    }
    return () => {
      cancelled = true;
    };
  }, [form.audience, form.segment_id]);

  const previewHtml = useMemo(() => {
    if (mode === 'raw') return form.body_html;
    return compileBlocksToHtml(blocks);
  }, [mode, form.body_html, blocks]);

  const hasContent = mode === 'raw' ? form.body_html.trim().length > 0 : blocks.length > 0;

  const canNext = useMemo(() => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 2) return form.subject.trim().length > 0 && hasContent;
    return true;
  }, [step, form.name, form.subject, hasContent]);

  async function aiDraft() {
    if (!form.brief.trim()) {
      onToast('Add a brief for the AI to work from.');
      return;
    }
    setDrafting(true);
    try {
      const res = await api<{ subject_variants?: string[]; preheader?: string; body_html?: string }>(
        '/email/campaigns/generate',
        { method: 'POST', body: { brief: form.brief, list_id: form.list_id || null }, workspace: true },
      );
      const variants = res.subject_variants || [];
      const abVars: ABVariant[] = variants.map((s: string, i: number) => ({
        key: `v${i}`,
        subject: s,
      }));
      set({
        subject: variants[0] || form.subject,
        preheader: res.preheader || form.preheader,
        body_html: res.body_html || form.body_html,
        ab_variants: abVars.length > 1 ? abVars : form.ab_variants,
        ab_enabled: abVars.length > 1 ? true : form.ab_enabled,
      });
      if (res.body_html) setMode('raw');
      onToast('AI draft ready — review and refine the content.');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'AI draft failed');
    } finally {
      setDrafting(false);
    }
  }

  async function createSegmentInline() {
    if (!segName.trim()) {
      onToast('Give the segment a name.');
      return;
    }
    setSegSaving(true);
    try {
      const rules = {
        match: 'all',
        conditions: [{ field: segField, op: segField === 'status' ? 'eq' : 'contains', value: segValue }],
      };
      const created = await api<EmailSegment>('/email/segments', {
        method: 'POST',
        body: { name: segName.trim(), rules, list_id: form.list_id || null },
        workspace: true,
      });
      onSegmentCreated?.();
      set({ audience: 'segment', segment_id: created.id });
      setShowSegForm(false);
      setSegName('');
      onToast('Segment created.');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Could not create segment');
    } finally {
      setSegSaving(false);
    }
  }

  async function create() {
    if (!form.name.trim()) {
      onToast('Campaign needs a name.');
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        subject: form.subject,
        preheader: form.preheader,
        from_name: form.from_name || null,
        list_id: form.audience === 'list' ? form.list_id || null : form.list_id || null,
        segment_id: form.audience === 'segment' ? form.segment_id || null : null,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      };
      if (form.ab_enabled && form.ab_variants.length >= 2) {
        body.ab_test = {
          enabled: true,
          variants: form.ab_variants.map((v) => ({ key: v.key, subject: v.subject })),
          holdout_pct: form.ab_holdout_pct,
          winner_metric: form.ab_winner_metric,
        };
      }
      if (mode === 'raw') {
        body.body_html = form.body_html;
        body.body_blocks = null;
      } else {
        body.body_blocks = { blocks: blocksToRaw(blocks) };
        body.body_html = null;
      }
      await api('/email/campaigns', { method: 'POST', body, workspace: true });
      onToast('Campaign created.');
      onCreated();
      handleClose();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const audienceLabel =
    form.audience === 'segment'
      ? selectedSegment
        ? `Segment: ${selectedSegment.name}`
        : 'No segment selected'
      : selectedList
      ? selectedList.name
      : 'Draft (no list)';

  return (
    <PremiumDialog open={open} onClose={handleClose} maxWidth="lg">
      <DialogHero
        icon={<EmailRoundedIcon />}
        title="Create campaign"
        subtitle="Draft, preview and launch — guided in four steps"
        onClose={handleClose}
        right={<StepRail step={step} onJump={(i) => i < step && setStep(i)} />}
      />

      <DialogBody sx={{ p: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' }, minHeight: { md: 500 } }}>
          {/* ---------------- Form column ---------------- */}
          <Box sx={{ px: { xs: 2.5, sm: 3.25 }, py: 3, borderRight: { md: `1px solid ${LINE}` } }}>
            {/* Step 1: Setup */}
            {step === 0 && (
              <Stack gap={2.25}>
                <Box>
                  <SectionLabel>Campaign basics</SectionLabel>
                  <TextField
                    label="Campaign name"
                    placeholder="Spring launch — engaged subscribers"
                    value={form.name}
                    onChange={(e) => set({ name: e.target.value })}
                    fullWidth
                    size="small"
                    autoFocus
                  />
                </Box>
                <TextField
                  label="From name"
                  placeholder="Trayarunya Team"
                  value={form.from_name}
                  onChange={(e) => set({ from_name: e.target.value })}
                  fullWidth
                  size="small"
                  helperText="Shown as the sender in the inbox."
                />
              </Stack>
            )}

            {/* Step 2: Audience */}
            {step === 1 && (
              <Stack gap={2.25}>
                <Box>
                  <SectionLabel>Who receives this</SectionLabel>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={form.audience}
                    onChange={(_, v: 'list' | 'segment' | null) => v && set({ audience: v })}
                    sx={{
                      '& .MuiToggleButton-root': {
                        textTransform: 'none',
                        fontWeight: 700,
                        border: `1px solid ${LINE}`,
                        borderRadius: '999px !important',
                        px: 2,
                        mx: 0.25,
                        color: SUBTLE,
                        '&.Mui-selected': { background: INK, color: '#fff', '&:hover': { background: '#000' } },
                      },
                    }}
                  >
                    <ToggleButton value="list">
                      <GroupsRoundedIcon sx={{ fontSize: 17, mr: 0.75 }} /> List
                    </ToggleButton>
                    <ToggleButton value="segment">
                      <FilterAltRoundedIcon sx={{ fontSize: 17, mr: 0.75 }} /> Segment
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {form.audience === 'list' ? (
                  <TextField
                    select
                    label="Recipient list"
                    value={form.list_id}
                    onChange={(e) => set({ list_id: e.target.value })}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">No list (save as draft)</MenuItem>
                    {lists.map((l) => (
                      <MenuItem key={l.id} value={l.id}>
                        {l.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Stack gap={1.5}>
                    <TextField
                      select
                      label="Segment"
                      value={form.segment_id}
                      onChange={(e) => set({ segment_id: e.target.value })}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">Select a segment…</MenuItem>
                      {segments.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    {form.segment_id && (
                      <Box sx={{ p: 1.75, borderRadius: '14px', background: BRAND.tealSoft, border: '1px solid rgba(20,187,135,0.2)' }}>
                        {previewLoading ? (
                          <Stack direction="row" alignItems="center" gap={1}>
                            <CircularProgress size={15} />
                            <Typography sx={{ fontSize: 13, color: SUBTLE }}>Counting matches…</Typography>
                          </Stack>
                        ) : preview ? (
                          <Typography sx={{ fontSize: 13.5, color: INK, fontWeight: 700 }}>
                            {preview.count.toLocaleString()} subscribers currently match this segment.
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 13, color: SUBTLE }}>Preview unavailable.</Typography>
                        )}
                      </Box>
                    )}

                    {!showSegForm ? (
                      <Button onClick={() => setShowSegForm(true)} sx={{ ...ghostPillSx, alignSelf: 'flex-start' }} startIcon={<FilterAltRoundedIcon />}>
                        Create segment
                      </Button>
                    ) : (
                      <Box sx={{ p: 2, borderRadius: '16px', border: `1px solid ${LINE}` }}>
                        <SectionLabel sx={{ mb: 1 }}>New segment</SectionLabel>
                        <Stack gap={1.25}>
                          <TextField size="small" label="Segment name" value={segName} onChange={(e) => setSegName(e.target.value)} fullWidth />
                          <Stack direction="row" gap={1} flexWrap="wrap">
                            <TextField select size="small" label="Field" value={segField} onChange={(e) => setSegField(e.target.value)} sx={{ flex: '1 1 130px' }}>
                              <MenuItem value="status">Status</MenuItem>
                              <MenuItem value="tag">Tag</MenuItem>
                            </TextField>
                            <TextField size="small" label="Value" value={segValue} onChange={(e) => setSegValue(e.target.value)} sx={{ flex: '1 1 130px' }} />
                          </Stack>
                          <Stack direction="row" gap={1}>
                            <Button onClick={createSegmentInline} disabled={segSaving} sx={inkPillSx} startIcon={segSaving ? <CircularProgress size={14} color="inherit" /> : undefined}>
                              {segSaving ? 'Creating…' : 'Create'}
                            </Button>
                            <Button onClick={() => setShowSegForm(false)} sx={ghostPillSx}>Cancel</Button>
                          </Stack>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                )}

                {form.audience === 'list' && selectedList && (
                  <Box sx={{ p: 2, borderRadius: '16px', background: BRAND.tealSoft, border: '1px solid rgba(20,187,135,0.2)' }}>
                    <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14 }}>{selectedList.name}</Typography>
                    <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.25 }}>
                      {selectedList.description || 'Subscribers in this list will receive the campaign.'}
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}

            {/* Step 3: Content */}
            {step === 2 && (
              <Stack gap={2.25}>
                <Box
                  sx={{
                    borderRadius: '18px',
                    p: 2,
                    background: 'linear-gradient(135deg, rgba(20,187,135,0.08) 0%, rgba(255,175,6,0.07) 100%)',
                    border: '1px solid rgba(20,187,135,0.18)',
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 17, color: BRAND.tealDeep }} />
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: INK }}>AI content assistant</Typography>
                  </Stack>
                  <TextField
                    value={form.brief}
                    onChange={(e) => set({ brief: e.target.value })}
                    placeholder="Describe the email — goal, offer, audience and tone"
                    multiline
                    minRows={2}
                    fullWidth
                    size="small"
                    sx={{ background: '#fff', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                  <Button
                    onClick={aiDraft}
                    disabled={drafting || !form.brief.trim()}
                    startIcon={drafting ? <CircularProgress size={15} color="inherit" /> : <AutoAwesomeRoundedIcon />}
                    sx={{
                      mt: 1.25,
                      borderRadius: '999px',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 2.2,
                      color: '#fff',
                      background: BRAND.gradient,
                      boxShadow: 'none',
                      '&:hover': { background: BRAND.gradient, opacity: 0.94, boxShadow: 'none' },
                      '&.Mui-disabled': { background: 'rgba(14,17,22,0.18)', color: '#fff' },
                    }}
                  >
                    {drafting ? 'Generating…' : 'Generate with AI'}
                  </Button>
                </Box>

                <Box>
                  <TextField
                    label="Subject line"
                    value={form.subject}
                    onChange={(e) => set({ subject: e.target.value })}
                    onSelect={() => {
                      if (subjectRef.current) subjectCaret.current = subjectRef.current.selectionStart;
                    }}
                    onKeyUp={() => {
                      if (subjectRef.current) subjectCaret.current = subjectRef.current.selectionStart;
                    }}
                    onClick={() => {
                      if (subjectRef.current) subjectCaret.current = subjectRef.current.selectionStart;
                    }}
                    inputRef={subjectRef}
                    fullWidth
                    size="small"
                  />
                  <Box sx={{ mt: 0.75 }}>
                    <MergeTagMenu
                      onInsert={(tag) => {
                        const v = form.subject;
                        const c = subjectCaret.current;
                        const next = c == null ? `${v}${tag}` : v.slice(0, c) + tag + v.slice(c);
                        set({ subject: next });
                      }}
                    />
                  </Box>
                </Box>

                <TextField
                  label="Preheader"
                  value={form.preheader}
                  onChange={(e) => set({ preheader: e.target.value })}
                  fullWidth
                  size="small"
                  helperText="Preview text shown after the subject in most inboxes."
                />

                {/* A/B testing */}
                <Box sx={{ p: 2, borderRadius: '16px', border: `1px solid ${LINE}` }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: form.ab_enabled ? 1.5 : 0 }}>
                    <SectionLabel sx={{ mb: 0 }}>A/B test subject lines</SectionLabel>
                    <Box
                      component="label"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={form.ab_enabled}
                        onChange={(e) => {
                          const on = e.target.checked;
                          set({
                            ab_enabled: on,
                            ab_variants: on && form.ab_variants.length < 2
                              ? [
                                  { key: 'v0', subject: form.subject },
                                  { key: 'v1', subject: '' },
                                ]
                              : form.ab_variants,
                          });
                        }}
                        style={{ width: 16, height: 16 }}
                      />
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: SUBTLE }}>Enable</Typography>
                    </Box>
                  </Stack>
                  {form.ab_enabled && (
                    <Stack gap={1.25}>
                      {form.ab_variants.map((v, i) => (
                        <Stack key={v.key} direction="row" gap={1} alignItems="center">
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE, minWidth: 50 }}>
                            Variant {String.fromCharCode(65 + i)}
                          </Typography>
                          <TextField
                            placeholder={`Subject line ${String.fromCharCode(65 + i)}`}
                            value={v.subject}
                            onChange={(e) => {
                              const next = [...form.ab_variants];
                              next[i] = { ...next[i], subject: e.target.value };
                              set({ ab_variants: next });
                            }}
                            size="small"
                            fullWidth
                          />
                          {form.ab_variants.length > 2 && (
                            <IconButton
                              size="small"
                              onClick={() => set({ ab_variants: form.ab_variants.filter((_, j) => j !== i) })}
                              sx={{ color: '#D92C4A' }}
                            >
                              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>x</Typography>
                            </IconButton>
                          )}
                        </Stack>
                      ))}
                      <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
                        <Button
                          size="small"
                          onClick={() =>
                            set({
                              ab_variants: [
                                ...form.ab_variants,
                                { key: `v${form.ab_variants.length}`, subject: '' },
                              ],
                            })
                          }
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', color: INK, fontSize: 12 }}
                        >
                          + Add variant
                        </Button>
                        <TextField
                          select
                          size="small"
                          label="Holdout %"
                          value={form.ab_holdout_pct}
                          onChange={(e) => set({ ab_holdout_pct: Number(e.target.value) })}
                          sx={{ width: 100 }}
                        >
                          {[10, 20, 30, 40, 50].map((p) => (
                            <MenuItem key={p} value={p}>{p}%</MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          select
                          size="small"
                          label="Winner by"
                          value={form.ab_winner_metric}
                          onChange={(e) => set({ ab_winner_metric: e.target.value })}
                          sx={{ width: 110 }}
                        >
                          <MenuItem value="opens">Opens</MenuItem>
                          <MenuItem value="clicks">Clicks</MenuItem>
                        </TextField>
                      </Stack>
                    </Stack>
                  )}
                </Box>

                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
                    <SectionLabel sx={{ mb: 0 }}>Email content</SectionLabel>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={mode}
                      onChange={(_, v: ContentMode | null) => v && setMode(v)}
                      sx={{
                        '& .MuiToggleButton-root': {
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: 12,
                          border: `1px solid ${LINE}`,
                          borderRadius: '999px !important',
                          px: 1.5,
                          py: 0.3,
                          mx: 0.25,
                          color: SUBTLE,
                          '&.Mui-selected': { background: INK, color: '#fff', '&:hover': { background: '#000' } },
                        },
                      }}
                    >
                      <ToggleButton value="blocks">Blocks</ToggleButton>
                      <ToggleButton value="raw">Raw HTML</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>

                  {mode === 'blocks' ? (
                    <BlockEditor blocks={blocks} onChange={setBlocks} />
                  ) : (
                    <Stack gap={1}>
                      <Alert severity="info" sx={{ borderRadius: 3, py: 0.5 }}>
                        Advanced mode — paste or edit raw HTML. This replaces the block content on save.
                      </Alert>
                      <TextField
                        label="Body (HTML)"
                        value={form.body_html}
                        onChange={(e) => set({ body_html: e.target.value })}
                        multiline
                        minRows={8}
                        fullWidth
                        size="small"
                      />
                    </Stack>
                  )}
                </Box>
              </Stack>
            )}

            {/* Step 4: Review */}
            {step === 3 && (
              <Stack gap={1.5}>
                <SectionLabel>Ready to launch</SectionLabel>
                <ReviewRow label="Campaign" value={form.name || '—'} />
                <ReviewRow label="From" value={form.from_name || 'Default sender'} />
                <ReviewRow label="Audience" value={audienceLabel} />
                {form.audience === 'segment' && preview && (
                  <ReviewRow label="Matches" value={`${preview.count.toLocaleString()} subscribers`} />
                )}
                <ReviewRow label="Subject" value={form.subject || '—'} />
                {form.ab_enabled && form.ab_variants.length >= 2 && (
                  <ReviewRow
                    label="A/B test"
                    value={`${form.ab_variants.length} variants, ${form.ab_holdout_pct}% holdout, winner by ${form.ab_winner_metric}`}
                  />
                )}
                <ReviewRow label="Preheader" value={form.preheader || '—'} />
                <ReviewRow label="Content" value={mode === 'raw' ? 'Raw HTML' : `${blocks.length} block${blocks.length === 1 ? '' : 's'}`} />
                <Box sx={{ mt: 1 }}>
                  <SectionLabel sx={{ mb: 0.75 }}>Schedule</SectionLabel>
                  <TextField
                    type="datetime-local"
                    label="Send at (optional)"
                    value={form.scheduled_at}
                    onChange={(e) => set({ scheduled_at: e.target.value })}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty to queue immediately on create."
                  />
                </Box>
                <Box sx={{ mt: 0.5, p: 1.5, borderRadius: '12px', background: 'rgba(14,17,22,0.03)', border: `1px solid ${LINE}` }}>
                  <Typography sx={{ fontSize: 11.5, color: SUBTLE }}>
                    Open and click tracking, an unsubscribe link and a CAN-SPAM footer are added to every send.
                  </Typography>
                </Box>
              </Stack>
            )}
          </Box>

          {/* ---------------- Live preview column ---------------- */}
          <Box sx={{ background: 'rgba(14,17,22,0.025)', px: { xs: 2.5, sm: 3 }, py: 2.5, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <SectionLabel sx={{ mb: 0 }}>Live preview</SectionLabel>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={device}
                onChange={(_, v: 'desktop' | 'mobile' | null) => v && setDevice(v)}
                sx={{
                  '& .MuiToggleButton-root': {
                    border: `1px solid ${LINE}`,
                    borderRadius: '999px !important',
                    px: 1.25,
                    py: 0.4,
                    mx: 0.25,
                    color: SUBTLE,
                    '&.Mui-selected': { background: INK, color: '#fff', '&:hover': { background: '#000' } },
                  },
                }}
              >
                <ToggleButton value="desktop"><DesktopMacRoundedIcon sx={{ fontSize: 17 }} /></ToggleButton>
                <ToggleButton value="mobile"><PhoneIphoneRoundedIcon sx={{ fontSize: 17 }} /></ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'hidden' }}>
              <Box
                sx={{
                  width: device === 'mobile' ? 320 : '100%',
                  maxWidth: '100%',
                  background: '#fff',
                  borderRadius: '18px',
                  border: `1px solid ${LINE}`,
                  boxShadow: '0 8px 30px -12px rgba(14,17,22,0.18)',
                  overflow: 'hidden',
                  transition: 'width .2s ease',
                }}
              >
                {/* Inbox header */}
                <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${LINE}` }}>
                  <Stack direction="row" alignItems="center" gap={1.25}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: BRAND.gradient,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 15,
                      }}
                    >
                      {(form.from_name || 'T').trim().charAt(0).toUpperCase()}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: INK, lineHeight: 1.2 }}>
                        {form.from_name || 'Trayarunya'}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 12, color: SUBTLE }}>
                        {form.subject || 'Your subject line appears here'}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 11.5, color: '#9AA0A6' }}>
                        {form.preheader || 'Preview text shows here in the inbox…'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                {/* Body */}
                <Box sx={{ height: 360, overflow: 'hidden' }}>
                  {previewHtml.trim() ? (
                    <Box
                      component="iframe"
                      title="Email preview"
                      srcDoc={previewHtml}
                      sx={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
                    />
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <EmailRoundedIcon sx={{ fontSize: 30, color: 'rgba(14,17,22,0.18)' }} />
                      <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 1 }}>
                        Add blocks or generate with AI to see your email render here.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogBody>

      <DialogFooter
        hint={
          <Stack direction="row" alignItems="center" gap={0.75}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: BRAND.tealDeep }} />
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </Stack>
        }
      >
        {step > 0 && (
          <Button onClick={() => setStep((s) => s - 1)} startIcon={<ArrowBackRoundedIcon />} sx={ghostPillSx}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} endIcon={<ArrowForwardRoundedIcon />} sx={inkPillSx}>
            Next
          </Button>
        ) : (
          <Button onClick={create} disabled={saving} startIcon={saving ? <CircularProgress size={15} color="inherit" /> : <CheckCircleRoundedIcon />} sx={inkPillSx}>
            {saving ? 'Creating…' : 'Create campaign'}
          </Button>
        )}
      </DialogFooter>
    </PremiumDialog>
  );
}

function StepRail({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <Stack direction="row" gap={0.75} alignItems="center" sx={{ display: { xs: 'none', sm: 'flex' }, mr: 1 }}>
      {STEPS.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <Stack key={label} direction="row" alignItems="center" gap={0.75}>
            <Box
              onClick={() => onJump(i)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1,
                py: 0.4,
                borderRadius: '999px',
                cursor: done ? 'pointer' : 'default',
                background: active ? INK : done ? BRAND.tealSoft : 'transparent',
              }}
            >
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  background: active ? '#fff' : done ? BRAND.tealDeep : 'rgba(14,17,22,0.1)',
                  color: active ? INK : done ? '#fff' : SUBTLE,
                }}
              >
                {done ? '✓' : i + 1}
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : done ? BRAND.tealDeep : SUBTLE }}>
                {label}
              </Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" alignItems="flex-start" sx={{ py: 1, borderBottom: `1px solid ${LINE}` }}>
      <Typography sx={{ width: 110, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, color: INK, fontWeight: 600, wordBreak: 'break-word' }}>{value}</Typography>
    </Stack>
  );
}
