'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BoltIcon from '@mui/icons-material/Bolt';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
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
const AMBER = '#FFAF06';
const TEAL = '#14BB87';
const PINK = '#D92C4A';

type TabKey = 'reviews' | 'analytics' | 'requests' | 'sources';

interface Review {
  id: string;
  source: string;
  author: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  themes: string[] | null;
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
interface TrendBucket { month: string; volume: number; avg_rating: number; avg_sentiment: number; }
interface ThemeItem { theme: string; count: number; avg_sentiment: number; }
interface Analytics {
  low_data: boolean;
  overview: Overview;
  trends: { low_data: boolean; buckets: TrendBucket[]; by_source: Record<string, { month: string; volume: number; avg_rating: number }[]> };
  themes: ThemeItem[];
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
        <Box key={i} component="span" sx={{ color: i <= r ? color : 'rgba(14,17,22,0.15)', fontWeight: 700 }}>
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

function Card({ children, sx, onClick }: { children: React.ReactNode; sx?: object; onClick?: () => void }) {
  return (
    <Box onClick={onClick} sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5, ...sx }}>
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
        height: 22, fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
        color: style.c, bgcolor: style.bg, border: `1px solid ${style.b}`,
      }}
    />
  );
}

function sentimentColor(score: number | null): string {
  if (score == null) return SUBTLE;
  if (score <= 0.35) return PINK;
  if (score <= 0.6) return AMBER;
  return TEAL;
}

export default function ReputationPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<TabKey>('reviews');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [sources, setSources] = useState<RepSource[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [agentBusy, setAgentBusy] = useState(false);

  // Filters
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Review drawer
  const [drawerReview, setDrawerReview] = useState<Review | null>(null);

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
      const params = new URLSearchParams();
      if (filterSentiment !== 'all') params.set('sentiment', filterSentiment);
      if (filterSource !== 'all') params.set('source', filterSource);
      const qs = params.toString();
      const reviewUrl = `/reputation/reviews${qs ? `?${qs}` : ''}`;
      const [rv, rq, sr, an] = await Promise.all([
        api<Review[]>(reviewUrl, { workspace: true }),
        api<ReviewRequest[]>('/reputation/requests', { workspace: true }),
        api<RepSource[]>('/reputation/sources', { workspace: true }),
        api<Analytics>('/reputation/analytics', { workspace: true }),
      ]);
      setReviews(rv);
      setRequests(rq);
      setSources(sr);
      setAnalytics(an);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reputation data');
    } finally {
      setLoading(false);
    }
  }, [filterSentiment, filterSource]);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const aiDraft = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await api<{ draft: string }>(`/reputation/reviews/${id}/draft`, {
        method: 'POST', body: { tone: 'professional' }, workspace: true,
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
        method: 'POST', body: { response_text: text, publish: true }, workspace: true,
      });
      setToast('Response saved');
      setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
      setDrawerReview(null);
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
        body: { channel: reqForm.channel, customer_email: reqForm.customer_email || null, phone: reqForm.phone || null },
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
      const res = await api<{ delivery_status: string }>(`/reputation/requests/${id}/send`, { method: 'POST', workspace: true });
      setToast(res.delivery_status === 'sent' ? 'Request sent' : `Queued (${res.delivery_status.replace(/_/g, ' ')})`);
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
        body: { source: reviewForm.source, author: reviewForm.author || null, rating: Number(reviewForm.rating), title: reviewForm.title || null, body: reviewForm.body || null },
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
        body: { source: srcForm.source, profile_url: srcForm.profile_url || null, is_connected: Boolean(srcForm.profile_url) },
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

  const reanalyze = async () => {
    setAgentBusy(true);
    try {
      const res = await api<{ backfilled: number }>('/reputation/backfill', { method: 'POST', workspace: true });
      setToast(`Re-analyzed ${res.backfilled} reviews`);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to re-analyze reviews');
    } finally {
      setAgentBusy(false);
    }
  };

  const runAgent = async () => {
    setAgentBusy(true);
    try {
      await api('/reputation/agent/run', { method: 'POST', body: { autonomy: 'suggest' }, workspace: true });
      setToast('Reputation agent completed');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to run reputation agent');
    } finally {
      setAgentBusy(false);
    }
  };

  const overview = analytics?.overview;
  const kpis = useMemo(() => {
    const ov = overview;
    return [
      { label: 'Average rating', value: ov ? ov.avg_rating.toFixed(2) : '0.00', stars: ov?.avg_rating || 0 },
      { label: 'Total reviews', value: ov ? String(ov.total_reviews) : '0', stars: undefined as number | undefined },
      { label: 'Response rate', value: ov ? `${ov.response_rate}%` : '0%', stars: undefined as number | undefined },
      { label: 'Unanswered', value: ov ? String(ov.unanswered) : '0', stars: undefined as number | undefined },
    ];
  }, [overview]);

  // Sentiment pie data
  const sentimentPie = useMemo(() => {
    if (!overview) return [];
    return [
      { name: 'Positive', value: overview.sentiment_split.positive || 0, color: TEAL },
      { name: 'Neutral', value: overview.sentiment_split.neutral || 0, color: AMBER },
      { name: 'Negative', value: overview.sentiment_split.negative || 0, color: PINK },
    ].filter((d) => d.value > 0);
  }, [overview]);

  // Rating distribution bar data
  const ratingBars = useMemo(() => {
    if (!overview) return [];
    return [5, 4, 3, 2, 1].map((n) => ({
      rating: `${n}`,
      count: overview.distribution[String(n)] || 0,
      fill: n >= 4 ? TEAL : n === 3 ? AMBER : PINK,
    }));
  }, [overview]);

  if (!activeWorkspace) {
    return (<Box><Alert severity="info">Select a workspace to manage reputation.</Alert></Box>);
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'reviews', label: 'Reviews' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'requests', label: 'Requests' },
    { key: 'sources', label: 'Sources' },
  ];

  return (
    <Box>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 2.5, px: 0.5 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12, fontSize: { xs: 28, md: 38 }, color: INK }}>
            Reputation
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Listen, respond and{' '}
            <Box component="span" sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 700 }}>
              grow
            </Box>{' '}
            your reviews — with an agent drafting every reply.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          <Button
            startIcon={<AutoAwesomeRoundedIcon />}
            disabled={agentBusy}
            onClick={reanalyze}
            variant="outlined"
            sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, borderColor: LINE, color: INK, '&:hover': { borderColor: INK } }}
          >
            Re-analyze reviews
          </Button>
          <Button
            startIcon={<BoltIcon />}
            disabled={agentBusy}
            onClick={runAgent}
            sx={{
              px: 2.5, py: 1.1, borderRadius: '999px', fontWeight: 700, textTransform: 'none',
              color: INK, background: '#fff', backgroundImage: 'none', border: `1px solid ${LINE}`,
              '&:hover': { background: BRAND.amberSoft, borderColor: BRAND.amber },
            }}
          >
            Run agent
          </Button>
          <Button onClick={() => setReviewOpen(true)} variant="outlined" sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, borderColor: LINE, color: INK }}>
            Add review
          </Button>
          <Button onClick={() => setReqOpen(true)} sx={{ px: 2.5, py: 1.25, borderRadius: '999px', fontWeight: 700, textTransform: 'none', color: '#fff', background: INK, backgroundImage: 'none', boxShadow: '0 8px 20px rgba(14,17,22,0.25)', '&:hover': { background: '#000' } }}>
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
            <Box key={t.key} onClick={() => setTab(t.key)} sx={{ cursor: 'pointer', px: 2, py: 0.85, borderRadius: '999px', fontSize: 14, fontWeight: 700, color: active ? '#fff' : INK, bgcolor: active ? INK : 'transparent', border: `1px solid ${active ? INK : LINE}`, transition: 'all .15s', '&:hover': { borderColor: INK } }}>
              {t.label}
            </Box>
          );
        })}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress sx={{ color: BRAND.amberDeep }} /></Stack>
      ) : (
        <>
          {/* REVIEWS */}
          {tab === 'reviews' && (
            <>
              {/* Filters */}
              <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                <TextField select label="Sentiment" size="small" value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)} sx={{ minWidth: 130 }}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="positive">Positive</MenuItem>
                  <MenuItem value="neutral">Neutral</MenuItem>
                  <MenuItem value="negative">Negative</MenuItem>
                </TextField>
                <TextField select label="Source" size="small" value={filterSource} onChange={(e) => setFilterSource(e.target.value)} sx={{ minWidth: 130 }}>
                  <MenuItem value="all">All</MenuItem>
                  {SOURCES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
                </TextField>
              </Stack>

              <Stack spacing={2}>
                {reviews.length === 0 && (
                  <Card><Typography sx={{ color: SUBTLE }}>No reviews match your filters. Add one or connect a source to begin.</Typography></Card>
                )}
                {reviews.map((r) => (
                  <Card key={r.id} sx={{ cursor: 'pointer', '&:hover': { borderColor: BRAND.amberDeep } }} onClick={() => setDrawerReview(r)}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75, flexWrap: 'wrap', gap: 0.75 }}>
                          <Stars rating={r.rating} />
                          <SoftChip label={r.source} kind="source" />
                          {r.sentiment && <SoftChip label={r.sentiment} kind="sentiment" />}
                          <SoftChip label={r.status} kind="status" />
                          {r.sentiment_score != null && (
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: sentimentColor(r.sentiment_score) }}>
                              {(r.sentiment_score * 100).toFixed(0)}%
                            </Typography>
                          )}
                        </Stack>
                        <Typography sx={{ fontWeight: 700, color: INK }}>{r.title || r.author || 'Review'}</Typography>
                        <Typography sx={{ color: SUBTLE, fontSize: 13, mb: 0.5 }}>
                          {r.author || 'Anonymous'} · {fmtDate(r.review_date || r.created_at)}
                        </Typography>
                        {r.body && <Typography sx={{ color: INK, fontSize: 14, mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.body}</Typography>}
                        {r.themes && r.themes.length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                            {(r.themes as string[]).slice(0, 4).map((t) => (
                              <Chip key={t} label={t} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, color: SUBTLE, bgcolor: 'rgba(14,17,22,0.04)', border: `1px solid ${LINE}` }} />
                            ))}
                          </Stack>
                        )}
                      </Box>
                      {r.response_text && (
                        <Box sx={{ minWidth: 100, textAlign: 'right' }}>
                          <Chip label="replied" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, color: BRAND.tealDeep, bgcolor: BRAND.tealSoft, border: '1px solid #BFEBDC' }} />
                        </Box>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </>
          )}

          {/* ANALYTICS */}
          {tab === 'analytics' && analytics && (
            <Box>
              {analytics.low_data && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: '14px' }}>
                  Limited data available. Analytics accuracy improves with more reviews.
                </Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                {/* Sentiment distribution pie */}
                <Card>
                  <Typography sx={{ fontWeight: 800, color: INK, mb: 1.5 }}>Sentiment distribution</Typography>
                  {sentimentPie.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <ResponsiveContainer width={140} height={140}>
                        <PieChart>
                          <Pie data={sentimentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={62} strokeWidth={2} stroke="#fff">
                            {sentimentPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <Stack spacing={1}>
                        {sentimentPie.map((d) => (
                          <Stack key={d.name} direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK }}>{d.name}</Typography>
                            <Typography sx={{ fontSize: 13, color: SUBTLE }}>{d.value}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  ) : (
                    <Typography sx={{ color: SUBTLE, fontSize: 13 }}>No review data yet.</Typography>
                  )}
                </Card>

                {/* Rating distribution bar */}
                <Card>
                  <Typography sx={{ fontWeight: 800, color: INK, mb: 1.5 }}>Rating distribution</Typography>
                  {overview && overview.total_reviews > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={ratingBars} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="rating" type="category" width={20} tick={{ fontSize: 13, fontWeight: 700, fill: INK }} axisLine={false} tickLine={false} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                          {ratingBars.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Bar>
                        <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography sx={{ color: SUBTLE, fontSize: 13 }}>No review data yet.</Typography>
                  )}
                </Card>
              </Box>

              {/* Rating + sentiment trend line */}
              {analytics.trends.buckets.length >= 2 && (
                <Card sx={{ mb: 2 }}>
                  <Typography sx={{ fontWeight: 800, color: INK, mb: 1.5 }}>Rating and sentiment trend</Typography>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={analytics.trends.buckets} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,17,22,0.06)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: SUBTLE }} />
                      <YAxis yAxisId="left" domain={[0, 5]} tick={{ fontSize: 12, fill: SUBTLE }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fontSize: 12, fill: SUBTLE }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }} />
                      <Line yAxisId="left" type="monotone" dataKey="avg_rating" stroke={AMBER} strokeWidth={2.5} dot={{ r: 3, fill: AMBER }} name="Avg rating" />
                      <Line yAxisId="right" type="monotone" dataKey="avg_sentiment" stroke={TEAL} strokeWidth={2.5} dot={{ r: 3, fill: TEAL }} name="Avg sentiment" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Volume trend */}
              {analytics.trends.buckets.length >= 2 && (
                <Card sx={{ mb: 2 }}>
                  <Typography sx={{ fontWeight: 800, color: INK, mb: 1.5 }}>Review volume over time</Typography>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={analytics.trends.buckets} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,17,22,0.06)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: SUBTLE }} />
                      <YAxis tick={{ fontSize: 12, fill: SUBTLE }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }} />
                      <Bar dataKey="volume" fill={AMBER} radius={[4, 4, 0, 0]} barSize={28} name="Reviews" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Themes */}
              {analytics.themes.length > 0 && (
                <Card>
                  <Typography sx={{ fontWeight: 800, color: INK, mb: 1.5 }}>Top themes</Typography>
                  <Stack spacing={1}>
                    {analytics.themes.map((t) => {
                      const pct = overview && overview.total_reviews > 0 ? Math.round((t.count / overview.total_reviews) * 100) : 0;
                      return (
                        <Stack key={t.theme} direction="row" alignItems="center" spacing={1.5}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK, minWidth: 140, textTransform: 'capitalize' }}>{t.theme}</Typography>
                          <Box sx={{ flex: 1, height: 8, borderRadius: 99, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
                            <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: sentimentColor(t.avg_sentiment), borderRadius: 99, transition: 'width .3s' }} />
                          </Box>
                          <Typography sx={{ fontSize: 12, color: SUBTLE, minWidth: 55, textAlign: 'right' }}>{t.count} ({pct}%)</Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Card>
              )}
            </Box>
          )}

          {/* REQUESTS */}
          {tab === 'requests' && (
            <Stack spacing={2}>
              {requests.length === 0 && (
                <Card><Typography sx={{ color: SUBTLE }}>No review requests yet. Send one to a happy customer.</Typography></Card>
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
                        Created {fmtDate(q.created_at)}{q.sent_at ? ` · Sent ${fmtDate(q.sent_at)}` : ''}
                      </Typography>
                    </Box>
                    {q.status === 'queued' && (
                      <Button onClick={() => sendRequest(q.id)} disabled={busy[q.id]} sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, color: '#fff', background: INK, backgroundImage: 'none', '&:hover': { background: '#000' } }}>
                        {busy[q.id] ? 'Sending...' : 'Send'}
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
                <Button onClick={() => setSrcOpen(true)} variant="outlined" sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, borderColor: LINE, color: INK }}>
                  Connect a source
                </Button>
              </Card>
              {sources.map((s) => (
                <Card key={s.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontWeight: 800, color: INK, textTransform: 'capitalize' }}>{s.source}</Typography>
                    <SoftChip label={s.is_connected ? 'connected' : 'pending'} kind="status" />
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
                  {s.profile_url && <Typography sx={{ color: SUBTLE, fontSize: 12, mt: 1, wordBreak: 'break-all' }}>{s.profile_url}</Typography>}
                </Card>
              ))}
            </Box>
          )}
        </>
      )}

      {/* Review detail drawer */}
      <Drawer anchor="right" open={!!drawerReview} onClose={() => setDrawerReview(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, borderRadius: { sm: '22px 0 0 22px' } } }}>
        {drawerReview && (() => {
          const r = drawerReview;
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Top accent */}
              <Box sx={{ height: 4, background: BRAND.gradient, flexShrink: 0 }} />
              {/* Header */}
              <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${LINE}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                      <Stars rating={r.rating} size={18} />
                      <SoftChip label={r.source} kind="source" />
                      {r.sentiment && <SoftChip label={r.sentiment} kind="sentiment" />}
                    </Stack>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK }}>{r.title || r.author || 'Review'}</Typography>
                    <Typography sx={{ color: SUBTLE, fontSize: 13 }}>{r.author || 'Anonymous'} · {fmtDate(r.review_date || r.created_at)}</Typography>
                  </Box>
                  <IconButton onClick={() => setDrawerReview(null)} size="small" sx={{ color: SUBTLE }}><CloseRoundedIcon fontSize="small" /></IconButton>
                </Stack>
                {r.sentiment_score != null && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE }}>Sentiment score</Typography>
                    <Box sx={{ flex: 1, height: 6, borderRadius: 99, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
                      <Box sx={{ width: `${r.sentiment_score * 100}%`, height: '100%', bgcolor: sentimentColor(r.sentiment_score), borderRadius: 99 }} />
                    </Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: sentimentColor(r.sentiment_score) }}>{(r.sentiment_score * 100).toFixed(0)}%</Typography>
                  </Stack>
                )}
              </Box>
              {/* Body */}
              <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.5 }}>
                {r.body && <Typography sx={{ color: INK, fontSize: 14, lineHeight: 1.7, mb: 2 }}>{r.body}</Typography>}
                {r.themes && (r.themes as string[]).length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.75 }}>Themes</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {(r.themes as string[]).map((t) => (
                        <Chip key={t} label={t} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 600, color: INK, bgcolor: 'rgba(14,17,22,0.04)', border: `1px solid ${LINE}` }} />
                      ))}
                    </Stack>
                  </Box>
                )}
                {/* Response / draft */}
                {r.response_text ? (
                  <Box sx={{ p: 2, borderRadius: '14px', bgcolor: BRAND.tealSoft, border: '1px solid #BFEBDC' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.tealDeep, mb: 0.5 }}>Your response</Typography>
                    <Typography sx={{ fontSize: 14, color: INK }}>{r.response_text}</Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: SUBTLE, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1 }}>Reply</Typography>
                    <TextField multiline minRows={3} fullWidth placeholder="Write a reply, or let the agent draft one..." value={drafts[r.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))} sx={{ mb: 1.5 }} />
                    <Stack direction="row" spacing={1.25}>
                      <Button onClick={() => aiDraft(r.id)} disabled={busy[r.id]} startIcon={busy[r.id] ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} />}
                        sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, px: 2, color: BRAND.amberDeep, border: `1px solid ${LINE}`, '&:hover': { borderColor: BRAND.amberDeep, bgcolor: BRAND.amberSoft } }}>
                        {busy[r.id] ? 'Thinking...' : 'AI draft'}
                      </Button>
                      <Button onClick={() => submitResponse(r.id)} disabled={busy[r.id] || !(drafts[r.id]?.trim())}
                        sx={{ borderRadius: '999px', textTransform: 'none', fontWeight: 700, px: 2, color: '#fff', background: INK, backgroundImage: 'none', '&:hover': { background: '#000' } }}>
                        Save response
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })()}
      </Drawer>

      {/* Request review dialog */}
      <PremiumDialog open={reqOpen} onClose={() => setReqOpen(false)} maxWidth="xs">
        <DialogHero icon={<SendRoundedIcon />} title="Request a review" subtitle="Invite a happy customer to leave a review" onClose={() => setReqOpen(false)} />
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
          <Button onClick={createRequest} disabled={saving || !(reqForm.customer_email || reqForm.phone)} startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined} sx={inkPillSx}>
            Queue request
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Add review dialog */}
      <PremiumDialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="md">
        <DialogHero icon={<StarRoundedIcon />} title="Add a review" subtitle="Log a review and preview how it appears" onClose={() => setReviewOpen(false)} />
        <DialogBody sx={{ p: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, minHeight: { md: 360 } }}>
            <Box sx={{ px: { xs: 2.5, sm: 3.25 }, py: 2.75, borderRight: { md: `1px solid ${LINE}` } }}>
              <SectionLabel>Review details</SectionLabel>
              <FieldGrid>
                <TextField select label="Source" fullWidth size="small" value={reviewForm.source} onChange={(e) => setReviewForm((f) => ({ ...f, source: e.target.value }))}>
                  {SOURCES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
                </TextField>
                <TextField select label="Rating" fullWidth size="small" value={reviewForm.rating} onChange={(e) => setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))}>
                  {[5, 4, 3, 2, 1].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </TextField>
                <FullSpan><TextField label="Author" fullWidth size="small" value={reviewForm.author} onChange={(e) => setReviewForm((f) => ({ ...f, author: e.target.value }))} /></FullSpan>
                <FullSpan><TextField label="Title" fullWidth size="small" value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} /></FullSpan>
                <FullSpan><TextField label="Body" fullWidth size="small" multiline minRows={3} value={reviewForm.body} onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))} /></FullSpan>
              </FieldGrid>
            </Box>
            <Box sx={{ background: 'rgba(14,17,22,0.025)', px: { xs: 2.5, sm: 3 }, py: 2.75 }}>
              <SectionLabel sx={{ mb: 1.5 }}>Live preview</SectionLabel>
              <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: '18px', boxShadow: '0 8px 30px -12px rgba(14,17,22,0.18)', p: 2.25 }}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75, flexWrap: 'wrap', gap: 0.75 }}>
                  <Stars rating={reviewForm.rating} />
                  <SoftChip label={reviewForm.source} kind="source" />
                </Stack>
                <Typography sx={{ fontWeight: 700, color: INK }}>{reviewForm.title || reviewForm.author || 'Review title'}</Typography>
                <Typography sx={{ color: SUBTLE, fontSize: 13, mb: 0.5 }}>{reviewForm.author || 'Anonymous'}</Typography>
                {reviewForm.body ? (
                  <Typography sx={{ color: INK, fontSize: 14, mt: 0.5 }}>{reviewForm.body}</Typography>
                ) : (
                  <Typography sx={{ color: SUBTLE, fontSize: 13.5, mt: 0.5, fontStyle: 'italic' }}>The review body will appear here as you type.</Typography>
                )}
              </Box>
            </Box>
          </Box>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setReviewOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={createReview} disabled={saving} startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined} sx={inkPillSx}>Add review</Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Connect source dialog */}
      <PremiumDialog open={srcOpen} onClose={() => setSrcOpen(false)} maxWidth="xs">
        <DialogHero icon={<LinkRoundedIcon />} title="Connect a source" subtitle="Link a review profile to track its ratings" onClose={() => setSrcOpen(false)} tint={BRAND.tealDeep} tintSoft={BRAND.tealSoft} />
        <DialogBody>
          <SectionLabel>Source</SectionLabel>
          <Stack spacing={1.75}>
            <TextField select label="Source" fullWidth size="small" value={srcForm.source} onChange={(e) => setSrcForm((f) => ({ ...f, source: e.target.value }))}>
              {SOURCES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Profile URL" fullWidth size="small" value={srcForm.profile_url} onChange={(e) => setSrcForm((f) => ({ ...f, profile_url: e.target.value }))} />
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setSrcOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={createSource} disabled={saving} startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined} sx={inkPillSx}>Save source</Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar open={!!toast} autoHideDuration={3200} onClose={() => setToast(null)} message={toast || ''} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
