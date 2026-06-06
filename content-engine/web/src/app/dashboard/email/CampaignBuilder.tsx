'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DesktopMacRoundedIcon from '@mui/icons-material/DesktopMacRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
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

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.08)';

interface EmailList {
  id: string;
  name: string;
  description?: string | null;
}

export interface CampaignDraft {
  name: string;
  subject: string;
  preheader: string;
  body_html: string;
  list_id: string;
  from_name: string;
  brief: string;
}

const EMPTY: CampaignDraft = {
  name: '',
  subject: '',
  preheader: '',
  body_html: '',
  list_id: '',
  from_name: '',
  brief: '',
};

const STEPS = ['Setup', 'Audience', 'Content', 'Review'] as const;

export default function CampaignBuilder({
  open,
  onClose,
  lists,
  onCreated,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  lists: EmailList[];
  onCreated: () => void;
  onToast: (m: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CampaignDraft>(EMPTY);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subjectVariants, setSubjectVariants] = useState<string[]>([]);

  const set = (patch: Partial<CampaignDraft>) => setForm((f) => ({ ...f, ...patch }));

  function reset() {
    setForm(EMPTY);
    setStep(0);
    setSubjectVariants([]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const selectedList = useMemo(() => lists.find((l) => l.id === form.list_id), [lists, form.list_id]);

  const canNext = useMemo(() => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 2) return form.subject.trim().length > 0 && form.body_html.trim().length > 0;
    return true;
  }, [step, form]);

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
      setSubjectVariants(variants);
      set({
        subject: variants[0] || form.subject,
        preheader: res.preheader || form.preheader,
        body_html: res.body_html || form.body_html,
      });
      onToast('AI draft ready — review and refine the content.');
      setStep(2);
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'AI draft failed');
    } finally {
      setDrafting(false);
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
      await api('/email/campaigns', {
        method: 'POST',
        body: {
          name: form.name,
          subject: form.subject,
          preheader: form.preheader,
          body_html: form.body_html,
          list_id: form.list_id || null,
          from_name: form.from_name || null,
        },
        workspace: true,
      });
      onToast('Campaign created.');
      onCreated();
      handleClose();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' }, minHeight: { md: 480 } }}>
          {/* ---------------- Form column ---------------- */}
          <Box sx={{ px: { xs: 2.5, sm: 3.25 }, py: 3, borderRight: { md: `1px solid ${LINE}` } }}>
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
                  placeholder="MarketiQ Team"
                  value={form.from_name}
                  onChange={(e) => set({ from_name: e.target.value })}
                  fullWidth
                  size="small"
                  helperText="Shown as the sender in the inbox."
                />
              </Stack>
            )}

            {step === 1 && (
              <Stack gap={2.25}>
                <Box>
                  <SectionLabel>Who receives this</SectionLabel>
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
                </Box>
                {selectedList ? (
                  <Box sx={{ p: 2, borderRadius: '16px', background: BRAND.tealSoft, border: '1px solid rgba(20,187,135,0.2)' }}>
                    <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14 }}>{selectedList.name}</Typography>
                    <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.25 }}>
                      {selectedList.description || 'Subscribers in this list will receive the campaign.'}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ p: 2, borderRadius: '16px', background: 'rgba(14,17,22,0.03)', border: `1px solid ${LINE}` }}>
                    <Typography sx={{ color: SUBTLE, fontSize: 13 }}>
                      No list selected — the campaign will be saved as a draft you can send later.
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}

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

                <TextField
                  label="Subject line"
                  value={form.subject}
                  onChange={(e) => set({ subject: e.target.value })}
                  fullWidth
                  size="small"
                />
                {subjectVariants.length > 1 && (
                  <Box>
                    <SectionLabel sx={{ mb: 0.75 }}>AI subject variants</SectionLabel>
                    <Stack direction="row" gap={0.75} flexWrap="wrap">
                      {subjectVariants.map((v, i) => (
                        <Chip
                          key={i}
                          label={v}
                          onClick={() => set({ subject: v })}
                          sx={{
                            cursor: 'pointer',
                            maxWidth: '100%',
                            borderRadius: '999px',
                            fontWeight: 600,
                            bgcolor: form.subject === v ? INK : 'rgba(14,17,22,0.05)',
                            color: form.subject === v ? '#fff' : INK,
                            '&:hover': { bgcolor: form.subject === v ? '#000' : 'rgba(14,17,22,0.1)' },
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
                <TextField
                  label="Preheader"
                  value={form.preheader}
                  onChange={(e) => set({ preheader: e.target.value })}
                  fullWidth
                  size="small"
                  helperText="Preview text shown after the subject in most inboxes."
                />
                <TextField
                  label="Body (HTML)"
                  value={form.body_html}
                  onChange={(e) => set({ body_html: e.target.value })}
                  multiline
                  minRows={6}
                  fullWidth
                  size="small"
                />
              </Stack>
            )}

            {step === 3 && (
              <Stack gap={1.5}>
                <SectionLabel>Ready to launch</SectionLabel>
                <ReviewRow label="Campaign" value={form.name || '—'} />
                <ReviewRow label="From" value={form.from_name || 'Default sender'} />
                <ReviewRow label="Audience" value={selectedList ? selectedList.name : 'Draft (no list)'} />
                <ReviewRow label="Subject" value={form.subject || '—'} />
                <ReviewRow label="Preheader" value={form.preheader || '—'} />
                <Box sx={{ mt: 1, p: 2, borderRadius: '16px', background: BRAND.amberSoft, border: '1px solid rgba(232,146,0,0.2)' }}>
                  <Typography sx={{ fontSize: 13, color: BRAND.amberDeep, fontWeight: 600 }}>
                    {selectedList
                      ? `This campaign will be created for “${selectedList.name}”. You can send it from the campaigns list.`
                      : 'This will be saved as a draft. Add a list later to send it.'}
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
                onChange={(_, v) => v && setDevice(v)}
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
                <ToggleButton value="desktop">
                  <DesktopMacRoundedIcon sx={{ fontSize: 17 }} />
                </ToggleButton>
                <ToggleButton value="mobile">
                  <PhoneIphoneRoundedIcon sx={{ fontSize: 17 }} />
                </ToggleButton>
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
                      {(form.from_name || 'M').trim().charAt(0).toUpperCase()}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: INK, lineHeight: 1.2 }}>
                        {form.from_name || 'MarketiQ'}
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
                <Box sx={{ maxHeight: 340, overflowY: 'auto' }}>
                  {form.body_html.trim() ? (
                    <Box sx={{ p: 2, fontSize: 14, color: INK, '& *': { maxWidth: '100%' } }} dangerouslySetInnerHTML={{ __html: form.body_html }} />
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <EmailRoundedIcon sx={{ fontSize: 30, color: 'rgba(14,17,22,0.18)' }} />
                      <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 1 }}>
                        Your email body will render here as you type or generate it with AI.
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
