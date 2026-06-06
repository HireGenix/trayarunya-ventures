'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
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
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type TabKey = 'reviews' | 'requests' | 'sources' | 'overview';

interface Review {
  id: string;
  source: string;
  author: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  sentiment: string | null;
  status: string;
  response_text: string | null;
  responded_at: string | null;
  review_date: string | null;
  created_at: string;
}
interface ReviewRequest {
  id: string;
  customer_email: string | null;
  phone: string | null;
  channel: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}
interface RepSource {
  id: string;
  source: string;
  profile_url: string | null;
  avg_rating: number | null;
  total_reviews: number | null;
  is_connected: boolean;
}
interface Overview {
  total_reviews: number;
  avg_rating: number;
  distribution: Record<string, number>;
  sentiment_split: Record<string, number>;
  responded: number;
  unanswered: number;
  response_rate: number;
}

const SOURCES = ['google', 'trustpilot', 'g2', 'facebook', 'manual'];

const SENTIMENT_STYLE: Record<string, { c: string; bg: string; b: string }> = {
  positive: { c: BRAND.tealDeep, bg: BRAND.tealSoft, b: '#BFEBDC' },
  neutral: { c: BRAND.amberDeep, bg: BRAND.amberSoft, b: '#FFE2A6' },
  negative: { c: BRAND.pink, bg: BRAND.pinkSoft, b: '#F6C9D2' },
};

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  const color = r >= 4 ? BRAND.tealDeep : r === 3 ? BRAND.amberDeep : BRAND.pink;
  return (
    <Box component="span" sx={{ display: 'inline-flex', gap: '1px', fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box
          key={i}
          component="span"
          sx={{ color: i <= r ? color : 'rgba(14,17,22,0.15)', fontWeight: 700 }}
        >
          ★
        </Box>
      ))}
    </Box>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

function SoftChip({ label, kind }: { label: string; kind: 'sentiment' | 'status' | 'source' }) {
  let style = { c: INK, bg: 'rgba(14,17,22,0.05)', b: LINE };
  if (kind === 'sentiment') style = SENTIMENT_STYLE[label] || style;
  else if (kind === 'status') {
    if (label === 'responded') style = { c: BRAND.tealDeep, bg: BRAND.tealSoft, b: '#BFEBDC' };
    else if (label === 'flagged') style = { c: BRAND.pink, bg: BRAND.pinkSoft, b: '#F6C9D2' };
    else if (label === 'sent' || label === 'reviewed') style = { c: BRAND.tealDeep, bg: BRAND.tealSoft, b: '#BFEBDC' };
    else if (label === 'new' || label === 'queued') style = { c: BRAND.amberDeep, bg: BRAND.amberSoft, b: '#FFE2A6' };
  }
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'capitalize',
        color: style.c,
        bgcolor: style.bg,
        border: `1px solid ${style.b}`,
      }}
    />
  );
}

export default function ReputationPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<TabKey>('reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [sources, setSources] = useState<RepSource[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const [reqOpen, setReqOpen] = useState(false);
  const [reqForm, setReqForm] = useState({ channel: 'email', customer_email: '', phone: '' });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ source: 'manual', author: '', rating: 5, title: '', body: '' });
  const [srcOpen, setSrcOpen] = useState(false);
  const [srcForm, setSrcForm] = useState({ source: 'google', profile_url: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rv, rq, sr, ov] = await Promise.all([
        api<Review[]>('/reputation/reviews', { workspace: true }),
        api<ReviewRequest[]>('/reputation/requests', { workspace: true }),
        api<RepSource[]>('/reputation/sources', { workspace: true }),
        api<Overview>('/reputation/overview', { workspace: true }),
      ]);
      setReviews(rv);
      setRequests(rq);
      setSources(sr);
      setOverview(ov);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reputation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const aiDraft = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await api<{ draft: string }>(`/reputation/reviews/${id}/draft`, {
        method: 'POST',
        body: { tone: 'professional' },
        workspace: true,
      });
      setDrafts((d) => ({ ...d, [id]: res.draft }));
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'AI draft failed');
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const submitResponse = async (id: string) => {
    const text = drafts[id]?.trim();
    if (!text) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api(`/reputation/reviews/${id}/respond`, {
        method: 'POST',
        body: { response_text: text, publish: true },
        workspace: true,
      });
      setToast('Response saved');
      setDrafts((d) => {
        const n = { ...d };
        delete n[id];
        return n;
      });
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to save response');
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const createRequest = async () => {
    setSaving(true);
    try {
      await api('/reputation/requests', {
        method: 'POST',
        body: {
          channel: reqForm.channel,
          customer_email: reqForm.customer_email || null,
          phone: reqForm.phone || null,
        },
        workspace: true,
      });
      setReqOpen(false);
      setReqForm({ channel: 'email', customer_email: '', phone: '' });
      setToast('Review request queued');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to create request');
    } finally {
      setSaving(false);
    }
  };

  const sendRequest = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await api<{ delivery_status: string }>(`/reputation/requests/${id}/send`, {
        method: 'POST',
        workspace: true,
      });
      setToast(
        res.delivery_status === 'sent'
          ? 'Request sent'
          : `Queued (${res.delivery_status.replace(/_/g, ' ')})`,
      );
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const createReview = async () => {
    setSaving(true);
    try {
      await api('/reputation/reviews', {
        method: 'POST',
        body: {
          source: reviewForm.source,
          author: reviewForm.author || null,
          rating: Number(reviewForm.rating),
          title: reviewForm.title || null,
          body: reviewForm.body || null,
        },
        workspace: true,
      });
      setReviewOpen(false);
      setReviewForm({ source: 'manual', author: '', rating: 5, title: '', body: '' });
      setToast('Review added');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to add review');
    } finally {
      setSaving(false);
    }
  };

  const createSource = async () => {
    setSaving(true);
    try {
      await api('/reputation/sources', {
        method: 'POST',
        body: {
          source: srcForm.source,
          profile_url: srcForm.profile_url || null,
          is_connected: Boolean(srcForm.profile_url),
        },
        workspace: true,
      });
      setSrcOpen(false);
      setSrcForm({ source: 'google', profile_url: '' });
      setToast('Source saved');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to save source');
    } finally {
      setSaving(false);
    }
  };

  const kpis = useMemo(() => {
    const ov = overview;
    return [
      { label: 'Average rating', value: ov ? ov.avg_rating.toFixed(2) : '0.00', stars: ov?.avg_rating || 0 },
      { label: 'Total reviews', value: ov ? String(ov.total_reviews) : '0', stars: undefined as number | undefined },
      { label: 'Response rate', value: ov ? `${ov.response_rate}%` : '0%', stars: undefined as number | undefined },
      { label: 'Unanswered', value: ov ? String(ov.unanswered) : '0', stars: undefined as number | undefined },
    ];
  }, [overview]);

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info">Select a workspace to manage reputation.</Alert>
      </Box>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'reviews', label: 'Reviews' },
    { key: 'requests', label: 'Requests' },
    { key: 'sources', label: 'Sources' },
    { key: 'overview', label: 'Overview' },
  ];

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
            Reputation
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Listen, respond and{' '}
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
              grow
            </Box>{' '}
            your reviews — with an agent drafting every reply.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          <Button
            onClick={() => setReviewOpen(true)}
            variant="outlined"
            sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, borderColor: LINE, color: INK }}
          >
            Add review
          </Button>
          <Button
            onClick={() => setReqOpen(true)}
            sx={{
              px: 2.5,
              py: 1.25,
              borderRadius: '999px',
              fontWeight: 700,
              textTransform: 'none',
              color: '#fff',
              background: INK,
              backgroundImage: 'none',
              boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
              '&:hover': { background: '#000' },
            }}
          >
            Request review
          </Button>
        </Stack>
      </Stack>

      {/* KPI cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2.5 }}>
        {kpis.map((k) => (
          <Card key={k.label} sx={{ p: 2.25 }}>
            <Typography sx={{ color: SUBTLE, fontSize: 13, fontWeight: 600 }}>{k.label}</Typography>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: INK, lineHeight: 1 }}>{k.value}</Typography>
              {k.stars !== undefined && k.stars > 0 && <Stars rating={k.stars} size={15} />}
            </Stack>
          </Card>
        ))}
      </Box>

      {/* Pill tabs */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Box
              key={t.key}
              onClick={() => setTab(t.key)}
              sx={{
                cursor: 'pointer',
                px: 2,
                py: 0.85,
                borderRadius: '999px',
                fontSize: 14,
                fontWeight: 700,
                color: active ? '#fff' : INK,
                bgcolor: active ? INK : 'transparent',
                border: `1px solid ${active ? INK : LINE}`,
                transition: 'all .15s',
                '&:hover': { borderColor: INK },
              }}
            >
              {t.label}
            </Box>
          );
        })}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress sx={{ color: BRAND.amberDeep }} />
        </Stack>
      ) : (
        <>
          {/* REVIEWS */}
          {tab === 'reviews' && (
            <Stack spacing={2}>
              {reviews.length === 0 && (
                <Card>
                  <Typography sx={{ color: SUBTLE }}>No reviews yet. Add one or connect a source to begin.</Typography>
                </Card>
              )}
              {reviews.map((r) => (
                <Card key={r.id}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75, flexWrap: 'wrap', gap: 0.75 }}>
                        <Stars rating={r.rating} />
                        <SoftChip label={r.source} kind="source" />
                        {r.sentiment && <SoftChip label={r.sentiment} kind="sentiment" />}
                        <SoftChip label={r.status} kind="status" />
                      </Stack>
                      <Typography sx={{ fontWeight: 700, color: INK }}>{r.title || r.author || 'Review'}</Typography>
                      <Typography sx={{ color: SUBTLE, fontSize: 13, mb: 0.5 }}>
                        {r.author || 'Anonymous'} · {fmtDate(r.review_date || r.created_at)}
                      </Typography>
                      {r.body && <Typography sx={{ color: INK, fontSize: 14, mt: 0.5 }}>{r.body}</Typography>}
                    </Box>
                  </Stack>

                  {r.response_text ? (
                    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '14px', bgcolor: BRAND.tealSoft, border: `1px solid #BFEBDC` }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.tealDeep, mb: 0.5 }}>Your response</Typography>
                      <Typography sx={{ fontSize: 14, color: INK }}>{r.response_text}</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ mt: 1.5 }}>
                      <TextField
                        multiline
                        minRows={2}
                        fullWidth
                        placeholder="Write a reply, or let the agent draft one…"
                        value={drafts[r.id] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                      />
                      <Stack direction="row" spacing={1.25} sx={{ mt: 1 }}>
                        <Button
                          onClick={() => aiDraft(r.id)}
                          disabled={busy[r.id]}
                          variant="outlined"
                          sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, borderColor: LINE, color: BRAND.amberDeep }}
                        >
                          {busy[r.id] ? 'Thinking…' : 'AI draft response'}
                        </Button>
                        <Button
                          onClick={() => submitResponse(r.id)}
                          disabled={busy[r.id] || !(drafts[r.id]?.trim())}
                          sx={{
                            borderRadius: '999px',
                            textTransform: 'none',
                            fontWeight: 700,
                            color: '#fff',
                            background: INK,
                            backgroundImage: 'none',
                            '&:hover': { background: '#000' },
                          }}
                        >
                          Save response
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Card>
              ))}
            </Stack>
          )}

          {/* REQUESTS */}
          {tab === 'requests' && (
            <Stack spacing={2}>
              {requests.length === 0 && (
                <Card>
                  <Typography sx={{ color: SUBTLE }}>No review requests yet. Send one to a happy customer.</Typography>
                </Card>
              )}
              {requests.map((q) => (
                <Card key={q.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <SoftChip label={q.channel} kind="source" />
                        <SoftChip label={q.status} kind="status" />
                      </Stack>
                      <Typography sx={{ fontWeight: 700, color: INK }}>{q.customer_email || q.phone || '—'}</Typography>
                      <Typography sx={{ color: SUBTLE, fontSize: 13 }}>
                        Created {fmtDate(q.created_at)}
                        {q.sent_at ? ` · Sent ${fmtDate(q.sent_at)}` : ''}
                      </Typography>
                    </Box>
                    {q.status === 'queued' && (
                      <Button
                        onClick={() => sendRequest(q.id)}
                        disabled={busy[q.id]}
                        sx={{
                          borderRadius: '999px',
                          textTransform: 'none',
                          fontWeight: 700,
                          color: '#fff',
                          background: INK,
                          backgroundImage: 'none',
                          '&:hover': { background: '#000' },
                        }}
                      >
                        {busy[q.id] ? 'Sending…' : 'Send'}
                      </Button>
                    )}
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}

          {/* SOURCES */}
          {tab === 'sources' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Card sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
                <Button
                  onClick={() => setSrcOpen(true)}
                  variant="outlined"
                  sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, borderColor: LINE, color: INK }}
                >
                  Connect a source
                </Button>
              </Card>
              {sources.map((s) => (
                <Card key={s.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontWeight: 800, color: INK, textTransform: 'capitalize' }}>{s.source}</Typography>
                    <SoftChip label={s.is_connected ? 'sent' : 'queued'} kind="status" />
                  </Stack>
                  <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
                    <Box>
                      <Typography sx={{ color: SUBTLE, fontSize: 12 }}>Avg rating</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Typography sx={{ fontWeight: 800, color: INK }}>{s.avg_rating != null ? s.avg_rating.toFixed(2) : '—'}</Typography>
                        {s.avg_rating != null && <Stars rating={s.avg_rating} size={13} />}
                      </Stack>
                    </Box>
                    <Box>
                      <Typography sx={{ color: SUBTLE, fontSize: 12 }}>Total reviews</Typography>
                      <Typography sx={{ fontWeight: 800, color: INK }}>{s.total_reviews != null ? s.total_reviews : '—'}</Typography>
                    </Box>
                  </Stack>
                  {s.profile_url && (
                    <Typography sx={{ color: SUBTLE, fontSize: 12, mt: 1, wordBreak: 'break-all' }}>{s.profile_url}</Typography>
                  )}
                </Card>
              ))}
            </Box>
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && overview && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Card>
                <Typography sx={{ fontWeight: 800, color: INK, mb: 1.5 }}>Rating distribution</Typography>
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = overview.distribution[String(n)] || 0;
                  const pct = overview.total_reviews ? (count / overview.total_reviews) * 100 : 0;
                  const color = n >= 4 ? BRAND.tealDeep : n === 3 ? BRAND.amberDeep : BRAND.pink;
                  return (
                    <Stack key={n} direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                      <Typography sx={{ width: 18, fontWeight: 700, color: INK }}>{n}</Typography>
                      <Box sx={{ flex: 1, height: 10, borderRadius: 99, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
                        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 99 }} />
                      </Box>
                      <Typography sx={{ width: 28, textAlign: 'right', color: SUBTLE, fontSize: 13 }}>{count}</Typography>
                    </Stack>
                  );
                })}
              </Card>
              <Card>
                <Typography sx={{ fontWeight: 800, color: INK, mb: 1.5 }}>Sentiment split</Typography>
                <Stack spacing={1.25}>
                  {(['positive', 'neutral', 'negative'] as const).map((k) => {
                    const count = overview.sentiment_split[k] || 0;
                    const pct = overview.total_reviews ? (count / overview.total_reviews) * 100 : 0;
                    const st = SENTIMENT_STYLE[k];
                    return (
                      <Box key={k}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography sx={{ textTransform: 'capitalize', fontWeight: 700, color: st.c, fontSize: 14 }}>{k}</Typography>
                          <Typography sx={{ color: SUBTLE, fontSize: 13 }}>{count} · {pct.toFixed(0)}%</Typography>
                        </Stack>
                        <Box sx={{ height: 10, borderRadius: 99, bgcolor: st.bg, overflow: 'hidden' }}>
                          <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: st.c, borderRadius: 99 }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                  <Box>
                    <Typography sx={{ color: SUBTLE, fontSize: 12 }}>Responded</Typography>
                    <Typography sx={{ fontWeight: 800, color: INK }}>{overview.responded}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: SUBTLE, fontSize: 12 }}>Response rate</Typography>
                    <Typography sx={{ fontWeight: 800, color: BRAND.tealDeep }}>{overview.response_rate}%</Typography>
                  </Box>
                </Stack>
              </Card>
            </Box>
          )}
        </>
      )}

      {/* Request review dialog */}
      <PremiumDialog open={reqOpen} onClose={() => setReqOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<SendRoundedIcon />}
          title="Request a review"
          subtitle="Invite a happy customer to leave a review"
          onClose={() => setReqOpen(false)}
        />
        <DialogBody>
          <SectionLabel>Delivery</SectionLabel>
          <Stack spacing={1.75}>
            <TextField select label="Channel" fullWidth size="small" value={reqForm.channel} onChange={(e) => setReqForm((f) => ({ ...f, channel: e.target.value }))}>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
            </TextField>
            {reqForm.channel === 'email' ? (
              <TextField label="Customer email" fullWidth size="small" value={reqForm.customer_email} onChange={(e) => setReqForm((f) => ({ ...f, customer_email: e.target.value }))} />
            ) : (
              <TextField label="Phone" fullWidth size="small" value={reqForm.phone} onChange={(e) => setReqForm((f) => ({ ...f, phone: e.target.value }))} />
            )}
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setReqOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button
            onClick={createRequest}
            disabled={saving || !(reqForm.customer_email || reqForm.phone)}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            Queue request
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Add review dialog */}
      <PremiumDialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="md">
        <DialogHero
          icon={<StarRoundedIcon />}
          title="Add a review"
          subtitle="Log a review and preview how it appears"
          onClose={() => setReviewOpen(false)}
        />
        <DialogBody sx={{ p: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, minHeight: { md: 360 } }}>
            {/* Form column */}
            <Box sx={{ px: { xs: 2.5, sm: 3.25 }, py: 2.75, borderRight: { md: `1px solid ${LINE}` } }}>
              <SectionLabel>Review details</SectionLabel>
              <FieldGrid>
                <TextField select label="Source" fullWidth size="small" value={reviewForm.source} onChange={(e) => setReviewForm((f) => ({ ...f, source: e.target.value }))}>
                  {SOURCES.map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
                  ))}
                </TextField>
                <TextField select label="Rating" fullWidth size="small" value={reviewForm.rating} onChange={(e) => setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <MenuItem key={n} value={n}>{n}</MenuItem>
                  ))}
                </TextField>
                <FullSpan>
                  <TextField label="Author" fullWidth size="small" value={reviewForm.author} onChange={(e) => setReviewForm((f) => ({ ...f, author: e.target.value }))} />
                </FullSpan>
                <FullSpan>
                  <TextField label="Title" fullWidth size="small" value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} />
                </FullSpan>
                <FullSpan>
                  <TextField label="Body" fullWidth size="small" multiline minRows={3} value={reviewForm.body} onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))} />
                </FullSpan>
              </FieldGrid>
            </Box>

            {/* Live preview column */}
            <Box sx={{ background: 'rgba(14,17,22,0.025)', px: { xs: 2.5, sm: 3 }, py: 2.75 }}>
              <SectionLabel sx={{ mb: 1.5 }}>Live preview</SectionLabel>
              <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: '18px', boxShadow: '0 8px 30px -12px rgba(14,17,22,0.18)', p: 2.25 }}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75, flexWrap: 'wrap', gap: 0.75 }}>
                  <Stars rating={reviewForm.rating} />
                  <SoftChip label={reviewForm.source} kind="source" />
                </Stack>
                <Typography sx={{ fontWeight: 700, color: INK }}>
                  {reviewForm.title || reviewForm.author || 'Review title'}
                </Typography>
                <Typography sx={{ color: SUBTLE, fontSize: 13, mb: 0.5 }}>
                  {reviewForm.author || 'Anonymous'}
                </Typography>
                {reviewForm.body ? (
                  <Typography sx={{ color: INK, fontSize: 14, mt: 0.5 }}>{reviewForm.body}</Typography>
                ) : (
                  <Typography sx={{ color: SUBTLE, fontSize: 13.5, mt: 0.5, fontStyle: 'italic' }}>
                    The review body will appear here as you type.
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setReviewOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button
            onClick={createReview}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            Add review
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Connect source dialog */}
      <PremiumDialog open={srcOpen} onClose={() => setSrcOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<LinkRoundedIcon />}
          title="Connect a source"
          subtitle="Link a review profile to track its ratings"
          onClose={() => setSrcOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <SectionLabel>Source</SectionLabel>
          <Stack spacing={1.75}>
            <TextField select label="Source" fullWidth size="small" value={srcForm.source} onChange={(e) => setSrcForm((f) => ({ ...f, source: e.target.value }))}>
              {SOURCES.map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField label="Profile URL" fullWidth size="small" value={srcForm.profile_url} onChange={(e) => setSrcForm((f) => ({ ...f, profile_url: e.target.value }))} />
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setSrcOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button
            onClick={createSource}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            Save source
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar open={!!toast} autoHideDuration={3200} onClose={() => setToast(null)} message={toast || ''} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
