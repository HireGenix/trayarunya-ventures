'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import SyncIcon from '@mui/icons-material/SyncRounded';
import SendIcon from '@mui/icons-material/SendRounded';
import AddIcon from '@mui/icons-material/Add';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import { inkPillSx, ghostPillSx, softPillSx, SectionLabel } from '@/components/PremiumDialog';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type Tab = 'inbox' | 'listening' | 'overview';

interface InboxItem {
  id: string;
  platform: string;
  kind: string;
  author_handle: string | null;
  author_name: string | null;
  text: string;
  permalink: string | null;
  sentiment: string | null;
  status: string;
  external_id: string | null;
  received_at: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
}

interface Reply {
  id: string;
  inbox_item_id: string;
  body: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface ItemDetail {
  item: InboxItem;
  replies: Reply[];
}

interface Keyword {
  id: string;
  term: string;
  platform: string | null;
  is_active: boolean;
  created_at: string;
}

interface Hit {
  id: string;
  keyword_id: string;
  platform: string | null;
  author: string | null;
  text: string;
  url: string | null;
  sentiment: string | null;
  found_at: string | null;
  created_at: string;
}

interface Overview {
  total: number;
  unread: number;
  open: number;
  replied: number;
  archived: number;
  analyzed: number;
  positive: number;
  negative: number;
  neutral: number;
  positive_pct: number;
  by_sentiment: Record<string, number>;
  by_platform: Record<string, number>;
  mentions_today: number;
  avg_response_minutes: number | null;
}

interface ChannelStatus {
  platform: string;
  connected: boolean;
  account_id: string | null;
  display_name: string | null;
  reason: string | null;
}

const PLATFORMS = ['linkedin', 'instagram', 'x', 'facebook'];
const STATUSES = ['unread', 'open', 'replied', 'archived'];
const SENTIMENTS_LIST = ['positive', 'neutral', 'negative'];

const SENTIMENT_CHIP: Record<string, { bg: string; fg: string; label: string }> = {
  positive: { bg: BRAND.tealSoft, fg: BRAND.tealDeep, label: 'Positive' },
  neutral: { bg: 'rgba(14,17,22,0.05)', fg: INK, label: 'Neutral' },
  negative: { bg: BRAND.pinkSoft, fg: BRAND.pink, label: 'Negative' },
};

const STATUS_CHIP: Record<string, { bg: string; fg: string }> = {
  unread: { bg: BRAND.amberSoft, fg: BRAND.amberDeep },
  open: { bg: 'rgba(14,17,22,0.05)', fg: INK },
  replied: { bg: BRAND.tealSoft, fg: BRAND.tealDeep },
  archived: { bg: 'rgba(14,17,22,0.05)', fg: SUBTLE },
};

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 150,
        bgcolor: '#fff',
        border: `1px solid ${LINE}`,
        borderRadius: CARD_RADIUS,
        boxShadow: CARD_SHADOW,
        p: 2.5,
      }}
    >
      <Typography sx={{ color: SUBTLE, fontSize: 13, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, fontWeight: 800, fontSize: 30, color: accent || INK, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function SocialInboxPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<Tab>('inbox');

  const [items, setItems] = useState<InboxItem[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [platformFilter, setPlatformFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');

  const [channels, setChannels] = useState<ChannelStatus[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [composer, setComposer] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [newKeyword, setNewKeyword] = useState('');
  const [newKwPlatform, setNewKwPlatform] = useState('');

  const loadItems = useCallback(async () => {
    const qs = new URLSearchParams();
    if (platformFilter) qs.set('platform', platformFilter);
    if (kindFilter) qs.set('kind', kindFilter);
    if (statusFilter) qs.set('status', statusFilter);
    if (sentimentFilter) qs.set('sentiment', sentimentFilter);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api<InboxItem[]>(`/social-inbox/items${suffix}`, { workspace: true });
  }, [platformFilter, kindFilter, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [it, kw, hs, ov, ch] = await Promise.all([
        loadItems(),
        api<Keyword[]>('/social-inbox/keywords', { workspace: true }),
        api<Hit[]>('/social-inbox/listening', { workspace: true }),
        api<Overview>('/social-inbox/overview', { workspace: true }),
        api<ChannelStatus[]>('/social-inbox/channels', { workspace: true }).catch(() => [] as ChannelStatus[]),
      ]);
      setItems(it);
      setKeywords(kw);
      setHits(hs);
      setOverview(ov);
      setChannels(ch);
      if (it.length && !selectedId) setSelectedId(it[0].id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, [loadItems, selectedId]);

  useEffect(() => {
    if (activeWorkspace) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  useEffect(() => {
    if (!activeWorkspace) return;
    loadItems()
      .then((it) => {
        setItems(it);
        if (it.length && !it.find((x) => x.id === selectedId)) setSelectedId(it[0].id);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformFilter, kindFilter, statusFilter, sentimentFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setComposer('');
    api<ItemDetail>(`/social-inbox/items/${selectedId}`, { workspace: true })
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedId]);

  const refreshDetail = useCallback(async () => {
    if (!selectedId) return;
    const d = await api<ItemDetail>(`/social-inbox/items/${selectedId}`, { workspace: true });
    setDetail(d);
  }, [selectedId]);

  async function sync() {
    setSyncing(true);
    setErr(null);
    try {
      const r = await api<{ connected_accounts: number; fetched: number; platforms: { platform: string; status: string; fetched?: number }[] }>(
        '/social-inbox/sync',
        { method: 'POST', workspace: true },
      );
      const statusSummary = r.platforms.map((p) => `${cap(p.platform)}: ${p.status}${p.fetched ? ` (${p.fetched} new)` : ''}`).join(', ');
      setToast(`Sync complete — ${r.connected_accounts} account(s), ${r.fetched} new. ${statusSummary || 'No connected channels.'}`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function aiDraft() {
    if (!selectedId) return;
    setDrafting(true);
    setErr(null);
    try {
      const r = await api<{ body: string; source: string }>(
        `/social-inbox/items/${selectedId}/draft-reply`,
        { method: 'POST', body: {}, workspace: true },
      );
      setComposer(r.body || '');
      setToast(`AI draft ready (${r.source})`);
      await refreshDetail();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Draft failed');
    } finally {
      setDrafting(false);
    }
  }

  async function sendReply(send: boolean) {
    if (!selectedId || !composer.trim()) return;
    setSending(true);
    setErr(null);
    try {
      const r = await api<{ delivery: string }>(
        `/social-inbox/items/${selectedId}/reply`,
        { method: 'POST', body: { body: composer.trim(), send }, workspace: true },
      );
      setComposer('');
      setToast(
        send
          ? r.delivery === 'sent'
            ? 'Reply sent to platform'
            : `Reply saved — channel status: ${r.delivery}`
          : 'Draft saved',
      );
      await refreshDetail();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reply failed');
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(item: InboxItem, status: string) {
    try {
      await api(`/social-inbox/items/${item.id}/status`, {
        method: 'POST',
        body: { status },
        workspace: true,
      });
      await load();
      await refreshDetail();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function runAgent() {
    setSyncing(true);
    setErr(null);
    try {
      const r = await api<{ classified: number; drafted: number }>(
        '/social-inbox/agent/run',
        { method: 'POST', body: { autonomy: 'suggest' }, workspace: true },
      );
      setToast(`Agent classified ${r.classified}, drafted ${r.drafted}`);
      await load();
      await refreshDetail();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Agent run failed');
    } finally {
      setSyncing(false);
    }
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return;
    try {
      await api('/social-inbox/keywords', {
        method: 'POST',
        body: { term: newKeyword.trim(), platform: newKwPlatform || null, is_active: true },
        workspace: true,
      });
      setNewKeyword('');
      setNewKwPlatform('');
      setToast('Keyword added');
      const kw = await api<Keyword[]>('/social-inbox/keywords', { workspace: true });
      setKeywords(kw);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add keyword');
    }
  }

  const kpis = useMemo(() => {
    const o = overview;
    return {
      unread: o ? String(o.unread) : '0',
      positive: o ? `${o.positive_pct}%` : '0%',
      mentions: o ? String(o.mentions_today) : '0',
      response: o && o.avg_response_minutes != null ? `${Math.round(o.avg_response_minutes)}m` : '—',
    };
  }, [overview]);

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info">Select a workspace to open the social inbox.</Alert>
      </Box>
    );
  }

  const selected = detail?.item || items.find((i) => i.id === selectedId) || null;
  const selectedPlatformConnected = selected
    ? channels.some((ch) => ch.platform === selected.platform && ch.connected)
    : false;

  // Volume chart data: items per day for the last 14 days
  const volumeData = useMemo(() => {
    const days: Record<string, Record<string, number>> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      days[key] = { positive: 0, neutral: 0, negative: 0, total: 0 };
    }
    for (const it of items) {
      const d = new Date(it.received_at || it.created_at);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (days[key]) {
        days[key].total += 1;
        const s = it.sentiment || 'neutral';
        if (s in days[key]) days[key][s] += 1;
      }
    }
    return Object.entries(days).map(([name, vals]) => ({
      name,
      positive: vals.positive,
      neutral: vals.neutral,
      negative: vals.negative,
      total: vals.total,
    }));
  }, [items]);

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
            Social{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 800,
              }}
            >
              Inbox
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            One queue for every comment, DM and mention — with AI sentiment and on-brand replies.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<AutoAwesomeIcon />}
            onClick={runAgent}
            disabled={syncing}
            sx={{
              px: 2.25, py: 1.1, borderRadius: '999px', fontWeight: 700, textTransform: 'none',
              color: INK, bgcolor: 'transparent', border: `1px solid ${LINE}`,
              '&:hover': { bgcolor: 'rgba(14,17,22,0.05)' },
            }}
          >
            Run agent
          </Button>
          <Button
            startIcon={syncing ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SyncIcon />}
            onClick={sync}
            disabled={syncing}
            sx={{
              px: 2.5, py: 1.1, borderRadius: '999px', fontWeight: 700, textTransform: 'none',
              color: '#fff', background: INK, backgroundImage: 'none',
              boxShadow: '0 8px 20px rgba(14,17,22,0.25)', '&:hover': { background: '#1B2330' },
            }}
          >
            Sync
          </Button>
        </Stack>
      </Stack>

      {/* Channel status badges */}
      {channels.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} sx={{ mb: 2, px: 0.5 }}>
          {channels.map((ch) => (
            <Chip
              key={ch.platform}
              icon={ch.connected
                ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
                : <LinkOffIcon sx={{ fontSize: 14 }} />
              }
              label={`${cap(ch.platform)}${ch.display_name ? ` (${ch.display_name})` : ''}${ch.connected ? '' : ` — ${ch.reason || 'not connected'}`}`}
              size="small"
              sx={{
                fontWeight: 700, fontSize: 11.5,
                bgcolor: ch.connected ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                color: ch.connected ? BRAND.tealDeep : SUBTLE,
              }}
            />
          ))}
        </Stack>
      )}

      {/* KPI cards */}
      <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2} sx={{ mb: 2.5, px: 0.5 }}>
        <KpiCard label="Unread" value={kpis.unread} accent={BRAND.amberDeep} />
        <KpiCard label="Positive sentiment" value={kpis.positive} accent={BRAND.tealDeep} />
        <KpiCard label="Mentions today" value={kpis.mentions} />
        <KpiCard label="Avg response" value={kpis.response} />
      </Stack>

      {/* Pill tabs */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, px: 0.5 }}>
        {(['inbox', 'listening', 'overview'] as const).map((t) => (
          <Button
            key={t}
            disableRipple
            onClick={() => setTab(t)}
            sx={{
              px: 2.25, py: 0.85, borderRadius: '999px', fontWeight: 600, fontSize: 13.5, textTransform: 'none',
              color: tab === t ? '#fff' : 'text.secondary',
              bgcolor: tab === t ? INK : 'transparent',
              '&:hover': { bgcolor: tab === t ? '#1B2330' : 'rgba(14,17,22,0.05)', color: tab === t ? '#fff' : INK },
            }}
          >
            {cap(t)}
          </Button>
        ))}
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : tab === 'inbox' ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start" sx={{ px: 0.5 }}>
          {/* LEFT — item list */}
          <Box
            sx={{
              flex: '0 0 380px', maxWidth: { md: 380 }, width: '100%',
              bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW,
              overflow: 'hidden',
            }}
          >
            {/* filters */}
            <Stack direction="row" spacing={1} sx={{ p: 1.5, borderBottom: `1px solid ${LINE}` }}>
              <TextField
                select size="small" label="Platform" value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)} sx={{ flex: 1 }}
              >
                <MenuItem value="">All</MenuItem>
                {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{cap(p)}</MenuItem>)}
              </TextField>
              <TextField
                select size="small" label="Status" value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)} sx={{ flex: 1 }}
              >
                <MenuItem value="">All</MenuItem>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{cap(s)}</MenuItem>)}
              </TextField>
              <TextField
                select size="small" label="Sentiment" value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)} sx={{ flex: 1 }}
              >
                <MenuItem value="">All</MenuItem>
                {SENTIMENTS_LIST.map((s) => <MenuItem key={s} value={s}>{cap(s)}</MenuItem>)}
              </TextField>
            </Stack>

            <Box sx={{ maxHeight: 620, overflowY: 'auto' }}>
              {items.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontSize: 14 }}>
                    No items yet. Connect an account and run Sync.
                  </Typography>
                </Box>
              ) : (
                items.map((it) => {
                  const active = it.id === selectedId;
                  const sc = it.sentiment ? SENTIMENT_CHIP[it.sentiment] : null;
                  return (
                    <Box
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      sx={{
                        p: 1.75, cursor: 'pointer', borderBottom: `1px solid ${LINE}`,
                        bgcolor: active ? 'rgba(14,17,22,0.04)' : 'transparent',
                        borderLeft: active ? `3px solid ${INK}` : '3px solid transparent',
                        '&:hover': { bgcolor: 'rgba(14,17,22,0.03)' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Chip
                            label={cap(it.platform)} size="small"
                            sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: 'rgba(14,17,22,0.05)', color: INK }}
                          />
                          <Typography sx={{ fontSize: 11.5, color: SUBTLE, fontWeight: 600 }}>{cap(it.kind)}</Typography>
                        </Stack>
                        <Typography sx={{ fontSize: 11.5, color: SUBTLE }}>{fmtTime(it.received_at || it.created_at)}</Typography>
                      </Stack>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: INK }} noWrap>
                        {it.author_name || it.author_handle || 'Unknown'}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: SUBTLE, mt: 0.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {it.text}
                      </Typography>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                        {sc && (
                          <Chip label={sc.label} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: sc.bg, color: sc.fg }} />
                        )}
                        <Chip
                          label={cap(it.status)} size="small"
                          sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: STATUS_CHIP[it.status]?.bg, color: STATUS_CHIP[it.status]?.fg }}
                        />
                      </Stack>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>

          {/* RIGHT — detail + composer */}
          <Box
            sx={{
              flex: 1, width: '100%', bgcolor: '#fff', border: `1px solid ${LINE}`,
              borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3, minHeight: 420,
            }}
          >
            {!selected ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 360 }}>
                <Typography sx={{ color: SUBTLE }}>Select an item to view the conversation.</Typography>
              </Box>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK }}>
                      {selected.author_name || selected.author_handle || 'Unknown'}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: SUBTLE }}>
                      {cap(selected.platform)} · {cap(selected.kind)}
                      {selected.author_handle ? ` · ${selected.author_handle}` : ''}
                    </Typography>
                  </Box>
                  <TextField
                    select size="small" label="Status" value={selected.status}
                    onChange={(e) => changeStatus(selected, e.target.value)} sx={{ minWidth: 140 }}
                  >
                    {STATUSES.map((s) => <MenuItem key={s} value={s}>{cap(s)}</MenuItem>)}
                  </TextField>
                </Stack>

                <Box sx={{ bgcolor: 'rgba(14,17,22,0.03)', borderRadius: '16px', p: 2, my: 2 }}>
                  <Typography sx={{ fontSize: 14.5, color: INK, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selected.text}
                  </Typography>
                  {selected.permalink && (
                    <Typography
                      component="a" href={selected.permalink} target="_blank" rel="noreferrer"
                      sx={{ display: 'inline-block', mt: 1, fontSize: 12.5, color: BRAND.tealDeep, fontWeight: 700, textDecoration: 'none' }}
                    >
                      View on {cap(selected.platform)}
                    </Typography>
                  )}
                </Box>

                {detail && detail.replies.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <SectionLabel>Replies</SectionLabel>
                    <Stack spacing={1}>
                      {detail.replies.map((r) => (
                        <Box key={r.id} sx={{ border: `1px solid ${LINE}`, borderRadius: '14px', p: 1.5 }}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Chip
                              label={r.status === 'sent' ? 'Sent' : 'Draft'} size="small"
                              sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: r.status === 'sent' ? BRAND.tealSoft : BRAND.amberSoft, color: r.status === 'sent' ? BRAND.tealDeep : BRAND.amberDeep }}
                            />
                            <Typography sx={{ fontSize: 11.5, color: SUBTLE }}>{fmtTime(r.sent_at || r.created_at)}</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 13.5, color: INK, whiteSpace: 'pre-wrap' }}>{r.body}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Composer — premium reply surface */}
                <Box
                  sx={{
                    border: `1px solid rgba(14,17,22,0.08)`,
                    borderRadius: '20px',
                    overflow: 'hidden',
                    bgcolor: '#fff',
                  }}
                >
                  {/* Soft-tinted icon-chip header */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1.5}
                    sx={{ px: 2.25, py: 1.75, borderBottom: `1px solid rgba(14,17,22,0.08)` }}
                  >
                    <Box
                      sx={{
                        width: 40, height: 40, borderRadius: '13px', flexShrink: 0,
                        display: 'grid', placeItems: 'center',
                        background: BRAND.tealSoft, color: BRAND.tealDeep,
                        '& svg': { fontSize: 21 },
                      }}
                    >
                      <ChatRoundedIcon />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 15.5, color: INK, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                        Compose reply
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: SUBTLE, mt: 0.2 }}>
                        Replying to {selected.author_name || selected.author_handle || 'Unknown'} on {cap(selected.platform)}
                      </Typography>
                    </Box>
                    <Button
                      startIcon={drafting ? <CircularProgress size={15} color="inherit" /> : <AutoAwesomeIcon />}
                      onClick={aiDraft}
                      disabled={drafting}
                      sx={softPillSx}
                    >
                      AI draft reply
                    </Button>
                  </Stack>

                  <Box sx={{ p: 2.25 }}>
                    <SectionLabel>Your reply</SectionLabel>
                    <TextField
                      multiline minRows={3} fullWidth placeholder="Write a reply…"
                      value={composer} onChange={(e) => setComposer(e.target.value)}
                    />

                    {/* Live preview of the outgoing message, built from real state */}
                    <SectionLabel sx={{ mt: 2.25 }}>Live preview</SectionLabel>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          maxWidth: '85%',
                          px: 1.75, py: 1.25,
                          borderRadius: '16px 16px 4px 16px',
                          background: composer.trim() ? BRAND.gradient : 'rgba(14,17,22,0.05)',
                          color: composer.trim() ? '#fff' : SUBTLE,
                        }}
                      >
                        <Typography sx={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                          {composer.trim() ? composer : 'Your reply will appear here as you type.'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="flex-end"
                    sx={{ px: 2.25, py: 1.75, borderTop: `1px solid rgba(14,17,22,0.08)`, bgcolor: 'rgba(14,17,22,0.015)' }}
                  >
                    <Button onClick={() => sendReply(false)} disabled={sending || !composer.trim()} sx={ghostPillSx}>
                      Save draft
                    </Button>
                    <Tooltip title={selectedPlatformConnected ? '' : `${cap(selected?.platform || '')} channel not connected — connect credentials to send`}>
                      <span>
                        <Button
                          startIcon={sending ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <SendIcon />}
                          onClick={() => sendReply(true)}
                          disabled={sending || !composer.trim()}
                          sx={inkPillSx}
                        >
                          {selectedPlatformConnected ? 'Send' : 'Send (not connected)'}
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Box>
              </>
            )}
          </Box>
        </Stack>
      ) : tab === 'listening' ? (
        <Box sx={{ px: 0.5 }}>
          {/* Keyword manager */}
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3, mb: 2.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 1.5 }}>Listening keywords</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                size="small" label="Term" value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)} sx={{ flex: 1 }}
              />
              <TextField
                select size="small" label="Platform" value={newKwPlatform}
                onChange={(e) => setNewKwPlatform(e.target.value)} sx={{ minWidth: 160 }}
              >
                <MenuItem value="">All platforms</MenuItem>
                {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{cap(p)}</MenuItem>)}
              </TextField>
              <Button
                startIcon={<AddIcon />}
                onClick={addKeyword}
                disabled={!newKeyword.trim()}
                sx={{
                  px: 2.5, borderRadius: '999px', fontWeight: 700, textTransform: 'none',
                  color: '#fff', background: INK, backgroundImage: 'none', '&:hover': { background: '#1B2330' },
                }}
              >
                Add
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
              {keywords.length === 0 ? (
                <Typography sx={{ color: SUBTLE, fontSize: 14 }}>No keywords tracked yet.</Typography>
              ) : (
                keywords.map((k) => (
                  <Chip
                    key={k.id}
                    label={`${k.term}${k.platform ? ` · ${cap(k.platform)}` : ''}`}
                    sx={{ fontWeight: 700, fontSize: 12.5, bgcolor: k.is_active ? BRAND.amberSoft : 'rgba(14,17,22,0.05)', color: k.is_active ? BRAND.amberDeep : SUBTLE }}
                  />
                ))
              )}
            </Stack>
          </Box>

          {/* Hits */}
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 1.5 }}>Mentions found</Typography>
            {hits.length === 0 ? (
              <Typography sx={{ color: SUBTLE, fontSize: 14 }}>
                No mentions captured yet. Add keywords, connect accounts, then run Sync.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {hits.map((h) => {
                  const sc = h.sentiment ? SENTIMENT_CHIP[h.sentiment] : null;
                  return (
                    <Box key={h.id} sx={{ border: `1px solid ${LINE}`, borderRadius: '16px', p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          {h.platform && (
                            <Chip label={cap(h.platform)} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: 'rgba(14,17,22,0.05)', color: INK }} />
                          )}
                          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: INK }}>{h.author || 'Unknown'}</Typography>
                        </Stack>
                        {sc && <Chip label={sc.label} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: sc.bg, color: sc.fg }} />}
                      </Stack>
                      <Typography sx={{ fontSize: 13.5, color: SUBTLE }}>{h.text}</Typography>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      ) : (
        /* OVERVIEW */
        <Box sx={{ px: 0.5 }}>
          {/* Volume chart */}
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3, mb: 2.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 2 }}>Inbox volume (14 days)</Typography>
            {volumeData.some((d) => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={volumeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: SUBTLE }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: SUBTLE }} />
                  <ReTooltip />
                  <Bar dataKey="positive" stackId="a" fill={BRAND.tealDeep} name="Positive" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="neutral" stackId="a" fill={SUBTLE} name="Neutral" />
                  <Bar dataKey="negative" stackId="a" fill={BRAND.pink} name="Negative" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography sx={{ color: SUBTLE, fontSize: 14 }}>No data yet. Sync your inbox to populate the chart.</Typography>
            )}
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start">
            <Box sx={{ flex: 1, width: '100%', bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 2 }}>By sentiment</Typography>
              {overview && overview.analyzed > 0 ? (
                <Stack spacing={1.5}>
                  {(['positive', 'neutral', 'negative'] as const).map((s) => {
                    const val = overview.by_sentiment[s] || 0;
                    const pct = overview.analyzed ? Math.round((val / overview.analyzed) * 100) : 0;
                    const sc = SENTIMENT_CHIP[s];
                    return (
                      <Box key={s}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{sc.label}</Typography>
                          <Typography sx={{ fontSize: 13.5, color: SUBTLE }}>{val} · {pct}%</Typography>
                        </Stack>
                        <Box sx={{ height: 8, borderRadius: 999, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
                          <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: sc.fg }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography sx={{ color: SUBTLE, fontSize: 14 }}>Run the agent to classify items.</Typography>
              )}
            </Box>

            <Box sx={{ flex: 1, width: '100%', bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 3 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 2 }}>By platform</Typography>
              {overview && Object.keys(overview.by_platform).length > 0 ? (
                <Stack spacing={1.25}>
                  {Object.entries(overview.by_platform).map(([p, c]) => (
                    <Stack key={p} direction="row" justifyContent="space-between" alignItems="center">
                      <Chip label={cap(p)} size="small" sx={{ height: 22, fontSize: 12, fontWeight: 700, bgcolor: 'rgba(14,17,22,0.05)', color: INK }} />
                      <Typography sx={{ fontWeight: 800, fontSize: 15, color: INK }}>{c}</Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ color: SUBTLE, fontSize: 14 }}>No items yet.</Typography>
              )}
            </Box>
          </Stack>
        </Box>
      )}

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
