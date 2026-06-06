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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
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

type Tab = 'rankings' | 'audits' | 'briefs' | 'overview';

interface Keyword {
  id: string;
  term: string;
  country: string;
  device: string;
  intent: string | null;
  current_rank: number | null;
  previous_rank: number | null;
  search_volume: number | null;
  last_checked_at: string | null;
  is_tracked: boolean;
  created_at: string;
}

interface AuditIssue {
  type: string;
  severity: string;
  detail: string;
}
interface Audit {
  id: string;
  url: string;
  score: number;
  issues: AuditIssue[] | null;
  status: string;
  created_at: string;
}

interface Brief {
  id: string;
  target_keyword: string;
  title: string | null;
  outline: Record<string, unknown> | null;
  word_count_target: number | null;
  status: string;
  brief_md: string | null;
  created_at: string;
}

interface Overview {
  tracked_count: number;
  total_keywords: number;
  ranked_count: number;
  avg_position: number | null;
  distribution: { top3: number; top10: number; top100: number };
  improved: number;
  declined: number;
  audits_run: number;
  briefs_count: number;
  has_rank_connector: boolean;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'rankings', label: 'Rankings' },
  { key: 'audits', label: 'Audits' },
  { key: 'briefs', label: 'Content Briefs' },
  { key: 'overview', label: 'Overview' },
];

const SEVERITY: Record<string, { c: string; soft: string; label: string }> = {
  critical: { c: BRAND.pink, soft: BRAND.pinkSoft, label: 'Critical' },
  high: { c: BRAND.pink, soft: BRAND.pinkSoft, label: 'High' },
  medium: { c: BRAND.amberDeep, soft: BRAND.amberSoft, label: 'Medium' },
  low: { c: BRAND.tealDeep, soft: BRAND.tealSoft, label: 'Low' },
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function scoreColor(score: number): string {
  if (score >= 80) return BRAND.tealDeep;
  if (score >= 50) return BRAND.amberDeep;
  return BRAND.pink;
}

function ScoreRing({ score }: { score: number }) {
  const c = scoreColor(score);
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: 64, height: 64 }}>
      <svg width={64} height={64}>
        <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(14,17,22,0.08)" strokeWidth={6} />
        <circle
          cx={32}
          cy={32}
          r={r}
          fill="none"
          stroke={c}
          strokeWidth={6}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: 17,
          color: c,
        }}
      >
        {score}
      </Box>
    </Box>
  );
}

function RankDelta({ kw }: { kw: Keyword }) {
  if (kw.current_rank === null) {
    return <Typography sx={{ fontSize: 13, fontWeight: 600, color: SUBTLE }}>awaiting data</Typography>;
  }
  if (kw.previous_rank === null) {
    return <Typography sx={{ fontSize: 13, fontWeight: 700, color: SUBTLE }}>new</Typography>;
  }
  const delta = kw.previous_rank - kw.current_rank; // positive = improved
  if (delta === 0) {
    return <Typography sx={{ fontSize: 13, fontWeight: 700, color: SUBTLE }}>±0</Typography>;
  }
  const up = delta > 0;
  return (
    <Typography sx={{ fontSize: 13, fontWeight: 800, color: up ? BRAND.tealDeep : BRAND.pink }}>
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </Typography>
  );
}

const cardSx = {
  bgcolor: '#fff',
  border: `1px solid ${LINE}`,
  borderRadius: CARD_RADIUS,
  boxShadow: CARD_SHADOW,
};

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Box sx={{ ...cardSx, p: 2.5, flex: '1 1 180px', minWidth: 160 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 30, fontWeight: 800, color: accent || INK, mt: 0.5, lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function SeoPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<Tab>('rankings');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [ov, setOv] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [kwOpen, setKwOpen] = useState(false);
  const [kwForm, setKwForm] = useState({ term: '', country: 'US', device: 'desktop', intent: '' });
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditUrl, setAuditUrl] = useState('');
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefKw, setBriefKw] = useState('');
  const [activeBrief, setActiveBrief] = useState<Brief | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, a, b, o] = await Promise.all([
        api<Keyword[]>('/seo/keywords', { workspace: true }),
        api<Audit[]>('/seo/audits', { workspace: true }),
        api<Brief[]>('/seo/briefs', { workspace: true }),
        api<Overview>('/seo/overview', { workspace: true }),
      ]);
      setKeywords(k);
      setAudits(a);
      setBriefs(b);
      setOv(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const addKeyword = async () => {
    if (!kwForm.term.trim()) return;
    setSaving(true);
    try {
      await api('/seo/keywords', { method: 'POST', body: kwForm, workspace: true });
      setKwOpen(false);
      setKwForm({ term: '', country: 'US', device: 'desktop', intent: '' });
      setToast('Keyword added');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add keyword');
    } finally {
      setSaving(false);
    }
  };

  const checkKeyword = async (id: string) => {
    try {
      const res = await api<{ status: string }>(`/seo/keywords/${id}/check`, { method: 'POST', workspace: true });
      setToast(res.status === 'recorded' ? 'Rank recorded' : 'Awaiting ranking data');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed');
    }
  };

  const toggleTrack = async (kw: Keyword) => {
    try {
      await api(`/seo/keywords/${kw.id}/track`, {
        method: 'POST',
        body: { is_tracked: !kw.is_tracked },
        workspace: true,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const runAudit = async () => {
    if (!auditUrl.trim()) return;
    setSaving(true);
    try {
      await api('/seo/audit', { method: 'POST', body: { url: auditUrl.trim() }, workspace: true });
      setAuditOpen(false);
      setAuditUrl('');
      setToast('Audit complete');
      setTab('audits');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit failed');
    } finally {
      setSaving(false);
    }
  };

  const generateBrief = async () => {
    if (!briefKw.trim()) return;
    setSaving(true);
    try {
      const brief = await api<Brief>('/seo/briefs', { method: 'POST', body: { keyword: briefKw.trim() }, workspace: true });
      setBriefOpen(false);
      setBriefKw('');
      setToast('Brief generated');
      setTab('briefs');
      await load();
      setActiveBrief(brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Brief generation failed');
    } finally {
      setSaving(false);
    }
  };

  const inkBtn = {
    px: 2.5,
    py: 1.1,
    borderRadius: '999px',
    fontWeight: 700,
    textTransform: 'none' as const,
    color: '#fff',
    background: INK,
    backgroundImage: 'none',
    boxShadow: '0 8px 20px rgba(14,17,22,0.22)',
    '&:hover': { background: '#000' },
  };

  const trackedCount = useMemo(() => keywords.filter((k) => k.is_tracked).length, [keywords]);

  if (!activeWorkspace) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>Select a workspace to view the SEO Suite.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: INK, fontSize: { xs: 26, md: 32 } }}>
            SEO{' '}
            <Box component="span" sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Suite
            </Box>
          </Typography>
          <Typography sx={{ color: SUBTLE, fontWeight: 500, mt: 0.5, maxWidth: 560 }}>
            Track rankings, audit on-page health, and generate AI content briefs — all from real data.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          {tab === 'rankings' && (
            <Button onClick={() => setKwOpen(true)} sx={inkBtn}>
              Add keyword
            </Button>
          )}
          {tab === 'audits' && (
            <Button onClick={() => setAuditOpen(true)} sx={inkBtn}>
              Run audit
            </Button>
          )}
          <Button onClick={() => setBriefOpen(true)} sx={inkBtn}>
            Generate brief
          </Button>
        </Stack>
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
              '&:hover': {
                bgcolor: tab === t.key ? '#1B2330' : 'rgba(14,17,22,0.05)',
                color: tab === t.key ? '#fff' : INK,
              },
            }}
          >
            {t.label}
          </Button>
        ))}
      </Stack>

      {/* KPI cards */}
      <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2} sx={{ mb: 3 }}>
        <KpiCard label="Tracked keywords" value={trackedCount} />
        <KpiCard label="Avg position" value={ov?.avg_position ?? '—'} accent={BRAND.amberDeep} />
        <KpiCard label="Top-10 keywords" value={ov?.distribution.top10 ?? 0} accent={BRAND.tealDeep} />
        <KpiCard label="Audits run" value={ov?.audits_run ?? 0} />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* RANKINGS */}
          {tab === 'rankings' && (
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
              {ov && !ov.has_rank_connector && (
                <Box sx={{ p: 2, bgcolor: BRAND.amberSoft, borderBottom: `1px solid ${LINE}` }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.amberDeep }}>
                    Connect Google Search Console to pull real positions. Until then, keywords are stored and checks return awaiting data — we never fabricate ranks.
                  </Typography>
                </Box>
              )}
              {keywords.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>No keywords yet. Add one to start tracking.</Typography>
                </Box>
              ) : (
                <Box>
                  <Stack
                    direction="row"
                    sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}`, color: SUBTLE, fontWeight: 700, fontSize: 12.5 }}
                  >
                    <Box sx={{ flex: 2 }}>Keyword</Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>Rank</Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>Change</Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>Volume</Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>Checked</Box>
                    <Box sx={{ flex: 1.4, textAlign: 'right' }}>Actions</Box>
                  </Stack>
                  {keywords.map((kw) => (
                    <Stack
                      key={kw.id}
                      direction="row"
                      alignItems="center"
                      sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${LINE}`, '&:last-of-type': { borderBottom: 'none' } }}
                    >
                      <Box sx={{ flex: 2 }}>
                        <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14 }}>{kw.term}</Typography>
                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                          <Chip label={kw.country} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
                          <Chip label={kw.device} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
                          {kw.intent && (
                            <Chip label={kw.intent} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }} />
                          )}
                        </Stack>
                      </Box>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16 }}>
                          {kw.current_rank ?? '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <RankDelta kw={kw} />
                      </Box>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: SUBTLE }}>
                          {kw.search_volume ?? '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: SUBTLE }}>{fmtDate(kw.last_checked_at)}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.75} sx={{ flex: 1.4, justifyContent: 'flex-end' }}>
                        <Button
                          onClick={() => checkKeyword(kw.id)}
                          size="small"
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: INK, borderRadius: '999px', px: 1.5, '&:hover': { bgcolor: 'rgba(14,17,22,0.05)' } }}
                        >
                          Check
                        </Button>
                        <Button
                          onClick={() => toggleTrack(kw)}
                          size="small"
                          sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: 12.5,
                            borderRadius: '999px',
                            px: 1.5,
                            color: kw.is_tracked ? BRAND.tealDeep : SUBTLE,
                            bgcolor: kw.is_tracked ? BRAND.tealSoft : 'transparent',
                            '&:hover': { bgcolor: kw.is_tracked ? BRAND.tealSoft : 'rgba(14,17,22,0.05)' },
                          }}
                        >
                          {kw.is_tracked ? 'Tracked' : 'Paused'}
                        </Button>
                      </Stack>
                    </Stack>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* AUDITS */}
          {tab === 'audits' && (
            <>
              {audits.length === 0 ? (
                <Box sx={{ ...cardSx, p: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>No audits yet. Run one against a URL.</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {audits.map((a) => (
                    <Box key={a.id} sx={{ ...cardSx, p: 2.5 }}>
                      <Stack direction="row" spacing={2.5} alignItems="flex-start">
                        <ScoreRing score={a.score} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14.5, wordBreak: 'break-all' }}>{a.url}</Typography>
                            <Chip
                              label={a.status}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: 11.5,
                                bgcolor: a.status === 'done' ? BRAND.tealSoft : BRAND.amberSoft,
                                color: a.status === 'done' ? BRAND.tealDeep : BRAND.amberDeep,
                              }}
                            />
                          </Stack>
                          <Typography sx={{ fontSize: 12.5, color: SUBTLE, mt: 0.25 }}>
                            {fmtDate(a.created_at)} · {(a.issues?.length ?? 0)} issues
                          </Typography>
                          <Stack spacing={1} sx={{ mt: 1.5 }}>
                            {(a.issues || []).slice(0, 6).map((iss, idx) => {
                              const sv = SEVERITY[iss.severity?.toLowerCase()] || SEVERITY.low;
                              return (
                                <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                                  <Chip label={sv.label} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: sv.soft, color: sv.c, minWidth: 64 }} />
                                  <Typography sx={{ fontSize: 13, color: INK, flex: 1 }}>
                                    <Box component="span" sx={{ fontWeight: 700, color: SUBTLE, mr: 0.75 }}>{iss.type}</Box>
                                    {iss.detail}
                                  </Typography>
                                </Stack>
                              );
                            })}
                          </Stack>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </>
          )}

          {/* BRIEFS */}
          {tab === 'briefs' && (
            <>
              {briefs.length === 0 ? (
                <Box sx={{ ...cardSx, p: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>No briefs yet. Generate one for a target keyword.</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {briefs.map((b) => (
                    <Box key={b.id} sx={{ ...cardSx, p: 2.5, cursor: 'pointer' }} onClick={() => setActiveBrief(b)}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16 }}>{b.title || b.target_keyword}</Typography>
                          <Typography sx={{ fontSize: 13, color: SUBTLE, mt: 0.25 }}>
                            Target: {b.target_keyword}
                            {b.word_count_target ? ` · ${b.word_count_target} words` : ''}
                          </Typography>
                        </Box>
                        <Chip
                          label={b.status}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: 11.5, bgcolor: b.status === 'ready' ? BRAND.tealSoft : BRAND.amberSoft, color: b.status === 'ready' ? BRAND.tealDeep : BRAND.amberDeep }}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </>
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && ov && (
            <Stack spacing={2}>
              <Box sx={{ ...cardSx, p: 3 }}>
                <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>Rank distribution</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2}>
                  {[
                    { label: 'Top 3', value: ov.distribution.top3, c: BRAND.tealDeep, soft: BRAND.tealSoft },
                    { label: 'Top 10', value: ov.distribution.top10, c: BRAND.amberDeep, soft: BRAND.amberSoft },
                    { label: 'Top 100', value: ov.distribution.top100, c: INK, soft: 'rgba(14,17,22,0.05)' },
                  ].map((d) => (
                    <Box key={d.label} sx={{ flex: '1 1 140px', p: 2, borderRadius: '16px', bgcolor: d.soft, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 30, fontWeight: 800, color: d.c }}>{d.value}</Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: SUBTLE }}>{d.label}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2}>
                <KpiCard label="Avg position" value={ov.avg_position ?? '—'} accent={BRAND.amberDeep} />
                <KpiCard label="Ranked keywords" value={ov.ranked_count} />
                <KpiCard label="Improved" value={ov.improved} accent={BRAND.tealDeep} />
                <KpiCard label="Declined" value={ov.declined} accent={BRAND.pink} />
                <KpiCard label="Briefs created" value={ov.briefs_count} />
              </Stack>
              <Box sx={{ ...cardSx, p: 2.5 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: ov.has_rank_connector ? BRAND.tealDeep : BRAND.amberDeep }}>
                  {ov.has_rank_connector
                    ? 'Google Search Console connected — rank checks pull real organic positions.'
                    : 'No ranking provider connected. Connect Google Search Console for live positions.'}
                </Typography>
              </Box>
            </Stack>
          )}
        </>
      )}

      {/* Add keyword dialog */}
      <PremiumDialog open={kwOpen} onClose={() => setKwOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<AddRoundedIcon />}
          title="Add keyword"
          subtitle="Track a search term's position over time"
          onClose={() => setKwOpen(false)}
        />
        <DialogBody>
          <SectionLabel>Keyword</SectionLabel>
          <FieldGrid>
            <FullSpan>
              <TextField label="Keyword term" value={kwForm.term} onChange={(e) => setKwForm({ ...kwForm, term: e.target.value })} fullWidth size="small" autoFocus />
            </FullSpan>
            <TextField label="Country" value={kwForm.country} onChange={(e) => setKwForm({ ...kwForm, country: e.target.value })} fullWidth size="small" />
            <TextField select label="Device" value={kwForm.device} onChange={(e) => setKwForm({ ...kwForm, device: e.target.value })} fullWidth size="small">
              <MenuItem value="desktop">Desktop</MenuItem>
              <MenuItem value="mobile">Mobile</MenuItem>
            </TextField>
            <FullSpan>
              <TextField select label="Intent" value={kwForm.intent} onChange={(e) => setKwForm({ ...kwForm, intent: e.target.value })} fullWidth size="small">
                <MenuItem value="">Unspecified</MenuItem>
                <MenuItem value="informational">Informational</MenuItem>
                <MenuItem value="commercial">Commercial</MenuItem>
                <MenuItem value="transactional">Transactional</MenuItem>
                <MenuItem value="navigational">Navigational</MenuItem>
              </TextField>
            </FullSpan>
          </FieldGrid>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setKwOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={addKeyword} disabled={saving || !kwForm.term.trim()} sx={inkPillSx}>
            {saving ? 'Adding…' : 'Add'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Run audit dialog */}
      <PremiumDialog open={auditOpen} onClose={() => setAuditOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<SpeedRoundedIcon />}
          title="Run on-page audit"
          subtitle="Score a page and surface technical SEO issues"
          onClose={() => setAuditOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <SectionLabel>Target page</SectionLabel>
          <TextField
            label="Page URL"
            placeholder="https://example.com/page"
            value={auditUrl}
            onChange={(e) => setAuditUrl(e.target.value)}
            fullWidth
            size="small"
            autoFocus
          />
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setAuditOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={runAudit} disabled={saving || !auditUrl.trim()} sx={inkPillSx}>
            {saving ? 'Auditing…' : 'Run audit'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Generate brief dialog */}
      <PremiumDialog open={briefOpen} onClose={() => setBriefOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<AutoAwesomeRoundedIcon />}
          title="Generate content brief"
          subtitle="Turn a target keyword into an AI-written content brief"
          onClose={() => setBriefOpen(false)}
        />
        <DialogBody>
          <AiAssist
            brief={briefKw}
            setBrief={setBriefKw}
            loading={saving}
            onGenerate={generateBrief}
            label="Enter the keyword you want to rank for and let AI build the brief"
            placeholder="e.g. marketing automation"
            buttonText="Generate"
            minRows={1}
          />
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setBriefOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Brief detail */}
      <PremiumDialog open={!!activeBrief} onClose={() => setActiveBrief(null)} maxWidth="sm">
        {activeBrief && (
          <>
            <DialogHero
              icon={<ArticleRoundedIcon />}
              title={activeBrief.title || activeBrief.target_keyword}
              subtitle={`Target: ${activeBrief.target_keyword}${activeBrief.word_count_target ? ` · ${activeBrief.word_count_target} words` : ''}`}
              onClose={() => setActiveBrief(null)}
              tint={BRAND.tealDeep}
              tintSoft={BRAND.tealSoft}
            />
            <DialogBody>
              <Box
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: 13.5,
                  color: INK,
                  bgcolor: 'rgba(14,17,22,0.03)',
                  borderRadius: '14px',
                  p: 2,
                  m: 0,
                }}
              >
                {activeBrief.brief_md || 'No brief content.'}
              </Box>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setActiveBrief(null)} sx={inkPillSx}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </PremiumDialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
