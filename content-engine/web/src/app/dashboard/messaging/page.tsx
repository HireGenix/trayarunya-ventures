'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/SendRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  FieldGrid,
  FullSpan,
  AiAssist,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type Channel = 'sms' | 'whatsapp';
type Tab = 'broadcasts' | 'templates' | 'contacts' | 'overview';

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  channel: string;
  opt_in: boolean;
  tags: string[] | null;
  created_at: string;
}
interface Template {
  id: string;
  name: string;
  channel: string;
  category: string;
  body: string;
  status: string;
  variables: string[] | null;
  created_at: string;
}
interface Broadcast {
  id: string;
  name: string;
  channel: string;
  body: string | null;
  status: string;
  scheduled_at: string | null;
  stats: Record<string, number> | null;
  created_at: string;
}
interface ProviderState {
  configured: boolean;
  provider: string | null;
}
interface Overview {
  contacts: number;
  opted_in: number;
  templates: number;
  broadcasts_sent: number;
  messages_attempted: number;
  delivered: number;
  read: number;
  failed: number;
  delivery_rate: number;
  read_rate: number;
  fail_rate: number;
  contacts_by_channel: Record<string, number>;
  providers: { sms: ProviderState; whatsapp: ProviderState };
  recommendations?: { recommendations?: { type: string; priority: string; message: string }[] };
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'broadcasts', label: 'Broadcasts' },
  { key: 'templates', label: 'Templates' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'overview', label: 'Overview' },
];

function pct(v: number): string {
  return `${Math.round((v || 0) * 100)}%`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const STATUS_TONE: Record<string, { c: string; bg: string }> = {
  sent: { c: BRAND.tealDeep, bg: BRAND.tealSoft },
  approved: { c: BRAND.tealDeep, bg: BRAND.tealSoft },
  scheduled: { c: BRAND.amberDeep, bg: BRAND.amberSoft },
  sending: { c: BRAND.amberDeep, bg: BRAND.amberSoft },
  pending: { c: BRAND.amberDeep, bg: BRAND.amberSoft },
  draft: { c: SUBTLE, bg: 'rgba(14,17,22,0.05)' },
  failed: { c: BRAND.pink, bg: BRAND.pinkSoft },
};

function StatusChip({ value }: { value: string }) {
  const tone = STATUS_TONE[value] || { c: SUBTLE, bg: 'rgba(14,17,22,0.05)' };
  return (
    <Chip
      label={value}
      size="small"
      sx={{ fontWeight: 700, fontSize: 11.5, textTransform: 'capitalize', color: tone.c, bgcolor: tone.bg }}
    />
  );
}

function Card({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: `1px solid ${LINE}`,
        borderRadius: CARD_RADIUS,
        boxShadow: CARD_SHADOW,
        p: 2.5,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card sx={{ flex: 1, minWidth: 170 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: SUBTLE, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 30, fontWeight: 800, color: INK, lineHeight: 1.1, mt: 0.5 }}>{value}</Typography>
      {hint && <Typography sx={{ fontSize: 12.5, color: SUBTLE, mt: 0.5 }}>{hint}</Typography>}
    </Card>
  );
}

const inkButton = {
  px: 2.5,
  py: 1.2,
  borderRadius: '999px',
  fontWeight: 700,
  textTransform: 'none' as const,
  color: '#fff',
  background: INK,
  backgroundImage: 'none',
  boxShadow: '0 8px 20px rgba(14,17,22,0.22)',
  '&:hover': { background: '#1B2330' },
};

export default function MessagingPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<Tab>('broadcasts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [form, setForm] = useState({ name: '', channel: 'sms' as Channel, body: '', brief: '' });

  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ phone: '', name: '', channel: 'sms' as Channel, tags: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, t, c, o] = await Promise.all([
        api<Broadcast[]>('/messaging/broadcasts', { workspace: true }),
        api<Template[]>('/messaging/templates', { workspace: true }),
        api<Contact[]>('/messaging/contacts', { workspace: true }),
        api<Overview>('/messaging/overview', { workspace: true }),
      ]);
      setBroadcasts(b);
      setTemplates(t);
      setContacts(c);
      setOverview(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messaging');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const whatsappConfigured = overview?.providers?.whatsapp?.configured ?? false;
  const smsConfigured = overview?.providers?.sms?.configured ?? false;
  const activeProviderConfigured = form.channel === 'whatsapp' ? whatsappConfigured : smsConfigured;

  const recos = overview?.recommendations?.recommendations ?? [];

  async function draft() {
    if (!form.brief.trim()) {
      setToast('Add a short brief for the AI first');
      return;
    }
    setDrafting(true);
    try {
      const res = await api<{ message: string }>('/messaging/draft', {
        method: 'POST',
        body: { brief: form.brief.trim(), channel: form.channel },
        workspace: true,
      });
      setForm((f) => ({ ...f, body: res.message }));
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Draft failed');
    } finally {
      setDrafting(false);
    }
  }

  async function createBroadcast() {
    if (!form.name.trim() || !form.body.trim()) {
      setToast('Name and message are required');
      return;
    }
    setSaving(true);
    try {
      await api('/messaging/broadcasts', {
        method: 'POST',
        body: { name: form.name.trim(), channel: form.channel, body: form.body.trim() },
        workspace: true,
      });
      setOpen(false);
      setForm({ name: '', channel: 'sms', body: '', brief: '' });
      setToast('Broadcast created');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to create broadcast');
    } finally {
      setSaving(false);
    }
  }

  async function sendBroadcast(b: Broadcast) {
    try {
      const res = await api<{ status: string; recipients: number; provider_configured: boolean }>(
        `/messaging/broadcasts/${b.id}/send`,
        { method: 'POST', workspace: true },
      );
      setToast(
        res.provider_configured
          ? `Sent to ${res.recipients} contacts`
          : `Queued ${res.recipients} — provider not configured`,
      );
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Send failed');
    }
  }

  async function createContact() {
    if (!contactForm.phone.trim()) {
      setToast('Phone is required');
      return;
    }
    setSaving(true);
    try {
      await api('/messaging/contacts', {
        method: 'POST',
        body: {
          phone: contactForm.phone.trim(),
          name: contactForm.name.trim() || null,
          channel: contactForm.channel,
          opt_in: true,
          tags: contactForm.tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        workspace: true,
      });
      setContactOpen(false);
      setContactForm({ phone: '', name: '', channel: 'sms', tags: '' });
      setToast('Contact added');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  }

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info">Select a workspace to manage messaging.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        spacing={2}
        sx={{ mb: 2.5, px: 0.5 }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12, fontSize: { xs: 28, md: 38 }, color: INK }}
          >
            Messaging
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Reach customers on SMS &amp; WhatsApp —{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 700,
              }}
            >
              AI-drafted
            </Box>{' '}
            and grounded in your brand voice.
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={inkButton}>
          New broadcast
        </Button>
      </Stack>

      {/* Pill tabs */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, px: 0.5, flexWrap: 'wrap', rowGap: 1 }}>
        {TABS.map((t) => (
          <Button
            key={t.key}
            disableRipple
            onClick={() => setTab(t.key)}
            sx={{
              px: 2.25,
              py: 0.85,
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: 13.5,
              textTransform: 'none',
              color: tab === t.key ? '#fff' : 'text.secondary',
              bgcolor: tab === t.key ? INK : 'transparent',
              '&:hover': { bgcolor: tab === t.key ? '#1B2330' : 'rgba(14,17,22,0.05)', color: tab === t.key ? '#fff' : INK },
            }}
          >
            {t.label}
          </Button>
        ))}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '14px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* WhatsApp connect empty-state notice */}
      {!whatsappConfigured && (
        <Card sx={{ mb: 2.5, borderColor: '#FFE2A6', bgcolor: BRAND.amberSoft }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: INK }}>Connect WhatsApp Business</Typography>
              <Typography sx={{ fontSize: 13.5, color: SUBTLE, mt: 0.25 }}>
                WhatsApp Business requires a Cloud API / BSP connection. Drafting, templates and audiences work now;
                WhatsApp sends are durably queued until you connect a provider.
              </Typography>
            </Box>
            <Chip label="Provider not configured" size="small" sx={{ fontWeight: 700, color: BRAND.amberDeep, bgcolor: '#fff' }} />
          </Stack>
        </Card>
      )}

      {/* KPI cards */}
      {overview && (
        <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 2 }}>
          <Kpi label="Contacts" value={String(overview.contacts)} hint={`${overview.opted_in} opted in`} />
          <Kpi label="Delivery rate" value={pct(overview.delivery_rate)} hint={`${overview.delivered} delivered`} />
          <Kpi label="Read rate" value={pct(overview.read_rate)} hint={`${overview.read} read`} />
          <Kpi label="Broadcasts sent" value={String(overview.broadcasts_sent)} hint={`${overview.messages_attempted} messages`} />
        </Stack>
      )}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <>
          {/* Broadcasts */}
          {tab === 'broadcasts' && (
            <Card sx={{ p: 0, overflow: 'hidden' }}>
              {broadcasts.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 700, color: INK }}>No broadcasts yet</Typography>
                  <Typography sx={{ fontSize: 13.5, color: SUBTLE, mt: 0.5 }}>
                    Create your first SMS or WhatsApp broadcast to reach your audience.
                  </Typography>
                  <Button startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ ...inkButton, mt: 2 }}>
                    New broadcast
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Stack
                    direction="row"
                    sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}`, fontSize: 12, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  >
                    <Box sx={{ flex: 2 }}>Name</Box>
                    <Box sx={{ flex: 1 }}>Channel</Box>
                    <Box sx={{ flex: 1 }}>Status</Box>
                    <Box sx={{ flex: 1.4 }}>Delivered / Read</Box>
                    <Box sx={{ flex: 1, textAlign: 'right' }}>Action</Box>
                  </Stack>
                  {broadcasts.map((b) => {
                    const s = b.stats || {};
                    const delivered = (s.delivered || 0) + (s.read || 0);
                    return (
                      <Stack
                        key={b.id}
                        direction="row"
                        alignItems="center"
                        sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${LINE}`, '&:last-of-type': { borderBottom: 'none' } }}
                      >
                        <Box sx={{ flex: 2, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14.5 }} noWrap>
                            {b.name}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: SUBTLE }} noWrap>
                            {b.scheduled_at ? `Scheduled ${fmtDate(b.scheduled_at)}` : `Created ${fmtDate(b.created_at)}`}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Chip
                            label={b.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: 11.5, color: INK, bgcolor: 'rgba(14,17,22,0.05)' }}
                          />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <StatusChip value={b.status} />
                        </Box>
                        <Box sx={{ flex: 1.4 }}>
                          <Typography sx={{ fontSize: 13.5, color: INK, fontWeight: 600 }}>
                            {delivered} / {s.read || 0}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'right' }}>
                          {b.status !== 'sent' && (
                            <Button
                              size="small"
                              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                              onClick={() => sendBroadcast(b)}
                              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', color: INK, '&:hover': { bgcolor: 'rgba(14,17,22,0.05)' } }}
                            >
                              Send
                            </Button>
                          )}
                        </Box>
                      </Stack>
                    );
                  })}
                </Box>
              )}
            </Card>
          )}

          {/* Templates */}
          {tab === 'templates' && (
            <Stack spacing={1.5}>
              {templates.length === 0 ? (
                <Card sx={{ textAlign: 'center', py: 5 }}>
                  <Typography sx={{ fontWeight: 700, color: INK }}>No templates yet</Typography>
                  <Typography sx={{ fontSize: 13.5, color: SUBTLE, mt: 0.5 }}>
                    WhatsApp marketing templates require provider approval before sending.
                  </Typography>
                </Card>
              ) : (
                templates.map((t) => (
                  <Card key={t.id}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                          <Typography sx={{ fontWeight: 700, color: INK }}>{t.name}</Typography>
                          <Chip
                            label={t.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: 11, color: INK, bgcolor: 'rgba(14,17,22,0.05)' }}
                          />
                          <Chip label={t.category} size="small" sx={{ fontWeight: 600, fontSize: 11, color: SUBTLE, bgcolor: 'rgba(14,17,22,0.05)', textTransform: 'capitalize' }} />
                        </Stack>
                        <Typography sx={{ fontSize: 13.5, color: SUBTLE }}>{t.body}</Typography>
                      </Box>
                      <StatusChip value={t.status} />
                    </Stack>
                  </Card>
                ))
              )}
            </Stack>
          )}

          {/* Contacts */}
          {tab === 'contacts' && (
            <Card sx={{ p: 0, overflow: 'hidden' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${LINE}` }}>
                <Typography sx={{ fontWeight: 700, color: INK }}>{contacts.length} contacts</Typography>
                <Button startIcon={<AddIcon />} onClick={() => setContactOpen(true)} sx={{ ...inkButton, py: 0.85, px: 2 }}>
                  Add contact
                </Button>
              </Stack>
              {contacts.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 13.5, color: SUBTLE }}>No contacts yet. Add opted-in recipients to start.</Typography>
                </Box>
              ) : (
                contacts.map((c) => (
                  <Stack
                    key={c.id}
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}`, '&:last-of-type': { borderBottom: 'none' } }}
                  >
                    <Box sx={{ flex: 1.5, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: INK, fontSize: 14 }} noWrap>
                        {c.name || c.phone}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: SUBTLE }} noWrap>
                        {c.phone}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Chip
                        label={c.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: 11, color: INK, bgcolor: 'rgba(14,17,22,0.05)' }}
                      />
                    </Box>
                    <Box sx={{ flex: 1.5 }}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5}>
                        {(c.tags || []).map((tag) => (
                          <Chip key={tag} label={tag} size="small" sx={{ fontWeight: 600, fontSize: 11, color: BRAND.tealDeep, bgcolor: BRAND.tealSoft }} />
                        ))}
                      </Stack>
                    </Box>
                    <Box sx={{ flex: 0.8, textAlign: 'right' }}>
                      <StatusChip value={c.opt_in ? 'approved' : 'failed'} />
                    </Box>
                  </Stack>
                ))
              )}
            </Card>
          )}

          {/* Overview */}
          {tab === 'overview' && overview && (
            <Stack spacing={2}>
              <Card>
                <Typography sx={{ fontWeight: 700, color: INK, mb: 1.5 }}>Channel mix</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={1.5}>
                  {Object.entries(overview.contacts_by_channel || {}).map(([chan, n]) => (
                    <Chip
                      key={chan}
                      label={`${chan === 'whatsapp' ? 'WhatsApp' : 'SMS'} · ${n}`}
                      sx={{ fontWeight: 700, color: INK, bgcolor: 'rgba(14,17,22,0.05)' }}
                    />
                  ))}
                  {Object.keys(overview.contacts_by_channel || {}).length === 0 && (
                    <Typography sx={{ fontSize: 13.5, color: SUBTLE }}>No contacts yet.</Typography>
                  )}
                </Stack>
              </Card>
              <Card>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <AutoAwesomeIcon sx={{ fontSize: 18, color: BRAND.amberDeep }} />
                  <Typography sx={{ fontWeight: 700, color: INK }}>Agent recommendations</Typography>
                </Stack>
                {recos.length === 0 ? (
                  <Typography sx={{ fontSize: 13.5, color: SUBTLE }}>No recommendations right now.</Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {recos.map((r, i) => (
                      <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', mt: 0.75, bgcolor: r.priority === 'high' ? BRAND.pink : BRAND.amberDeep, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 13.5, color: INK }}>{r.message}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Card>
            </Stack>
          )}
        </>
      )}

      {/* New broadcast dialog */}
      <PremiumDialog open={open} onClose={() => setOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<CampaignRoundedIcon />}
          title="New broadcast"
          subtitle="Compose, draft with AI and queue a message to your contacts"
          onClose={() => setOpen(false)}
        />
        <DialogBody>
          <Stack spacing={2.25}>
            <Box>
              <SectionLabel>Broadcast basics</SectionLabel>
              <Stack spacing={2}>
                <TextField label="Broadcast name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth size="small" autoFocus />

                {/* Channel toggle */}
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: SUBTLE, mb: 0.75 }}>Channel</Typography>
                  <Stack direction="row" spacing={1}>
                    {(['sms', 'whatsapp'] as Channel[]).map((ch) => (
                      <Button
                        key={ch}
                        disableRipple
                        onClick={() => setForm((f) => ({ ...f, channel: ch }))}
                        sx={{
                          px: 2.25,
                          py: 0.85,
                          borderRadius: '999px',
                          fontWeight: 700,
                          textTransform: 'none',
                          color: form.channel === ch ? '#fff' : 'text.secondary',
                          bgcolor: form.channel === ch ? INK : 'transparent',
                          border: `1px solid ${form.channel === ch ? INK : LINE}`,
                          '&:hover': { bgcolor: form.channel === ch ? '#1B2330' : 'rgba(14,17,22,0.05)' },
                        }}
                      >
                        {ch === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                      </Button>
                    ))}
                  </Stack>
                </Box>

                {!activeProviderConfigured && (
                  <Alert severity="info" sx={{ borderRadius: '12px' }}>
                    {form.channel === 'whatsapp'
                      ? 'WhatsApp Business is not connected. You can still create and queue this broadcast; it will send once a provider is configured.'
                      : 'No SMS provider configured. You can still create and queue this broadcast; it will send once a provider is configured.'}
                  </Alert>
                )}
              </Stack>
            </Box>

            <Box>
              <SectionLabel>Message</SectionLabel>
              <TextField
                label="Message"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
                size="small"
                placeholder="Write your message, or draft it with AI below…"
                helperText={form.channel === 'sms' ? `${form.body.length}/160 characters` : `${form.body.length} characters`}
              />
            </Box>

            <AiAssist
              brief={form.brief}
              setBrief={(v) => setForm((f) => ({ ...f, brief: v }))}
              loading={drafting}
              onGenerate={draft}
              label="Describe the offer or update and let AI write the message"
              placeholder="e.g. 20% off summer sale, ends Sunday"
              buttonText="Draft message"
            />
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={createBroadcast} disabled={saving} sx={inkPillSx}>
            {saving ? 'Creating…' : 'Create broadcast'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* New contact dialog */}
      <PremiumDialog open={contactOpen} onClose={() => setContactOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<PersonAddRoundedIcon />}
          title="Add contact"
          subtitle="Add a recipient to your messaging audience"
          onClose={() => setContactOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <SectionLabel>Contact details</SectionLabel>
          <FieldGrid>
            <FullSpan>
              <TextField label="Phone" value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} fullWidth size="small" autoFocus placeholder="+1 555 010 1234" />
            </FullSpan>
            <TextField label="Name" value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} fullWidth size="small" />
            <TextField select label="Channel" value={contactForm.channel} onChange={(e) => setContactForm((f) => ({ ...f, channel: e.target.value as Channel }))} fullWidth size="small">
              <MenuItem value="sms">SMS</MenuItem>
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
            </TextField>
            <FullSpan>
              <TextField label="Tags" value={contactForm.tags} onChange={(e) => setContactForm((f) => ({ ...f, tags: e.target.value }))} fullWidth size="small" placeholder="vip, new (comma separated)" />
            </FullSpan>
          </FieldGrid>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setContactOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={createContact} disabled={saving} sx={inkPillSx}>
            {saving ? 'Adding…' : 'Add contact'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
