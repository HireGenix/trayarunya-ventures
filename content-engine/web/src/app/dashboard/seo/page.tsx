'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
  AiAssist,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type Tab = 'rankings' | 'research' | 'audits' | 'site-audits' | 'briefs' | 'overview' | 'competitors' | 'internal-links' | 'schema' | 'topics' | 'content-optimizer' | 'backlinks' | 'serp-features';

interface Keyword {
  id: string;
  term: string;
  country: string;
  device: string;
  intent: string | null;
  current_rank: number | null;
  previous_rank: number | null;
  search_volume: number | null;
  difficulty: number | null;
  volume_proxy: number | null;
  metrics: Record<string, unknown> | null;
  last_checked_at: string | null;
  is_tracked: boolean;
  created_at: string;
}

interface KeywordIdea {
  keyword: string;
  difficulty: number | null;
  volume_proxy: number | null;
  intent: string | null;
  cluster: string | null;
  source: string | null;
  confidence: number | null;
  metrics?: Record<string, unknown> | null;
}

interface Snapshot {
  rank?: number | null;
  position?: number | null;
  created_at?: string | null;
  checked_at?: string | null;
}

interface AuditIssue {
  type: string;
  severity: string;
  detail: string;
  url?: string | null;
}
interface Audit {
  id: string;
  url: string;
  score: number;
  issues: AuditIssue[] | null;
  status: string;
  created_at: string;
}

interface SiteAudit {
  id: string;
  base_url: string;
  max_pages: number;
  pages_crawled: number;
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

interface TermScore {
  term: string;
  present?: boolean;
  score?: number;
  count?: number;
  target?: number;
}
interface ContentScore {
  overall: number;
  term_coverage: number;
  readability: number;
  word_count: number;
  target_word_count: number;
  word_count_score: number;
  term_scores: TermScore[];
  gaps: string[];
}

interface ContentGap {
  keyword: string;
  missing_terms: string[];
  missing_questions: string[];
  confidence: number | null;
}

interface SovBreakdown {
  domain?: string;
  label?: string;
  share?: number;
  value?: number;
}
interface ShareOfVoice {
  sov_score: number;
  total_keywords: number;
  ranked_keywords: number;
  breakdown: SovBreakdown[];
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

interface SerpFeature {
  id: string;
  keyword_id: string;
  features: string[] | null;
  detected_at: string | null;
}

interface CompetitorGapRow {
  keyword: string;
  your_rank: number | null;
  competitors: { domain: string; rank: number | null }[];
  gap_flags: string[];
}

interface LinkGraphData {
  id: string;
  base_url: string;
  graph: {
    nodes: { url: string; title: string }[];
    edges: { from_url: string; to_url: string; anchor_text: string }[];
  } | null;
  orphan_pages: string[] | null;
  suggestions: { target: string; suggested_from: string[]; reason: string }[] | null;
  status: string;
  created_at: string;
}

interface TopicCluster {
  id: string;
  topic: string;
  keywords: string[];
  coverage_pct: number;
  authority_score: number;
  pillar_gaps: string[] | null;
  computed_at: string;
}

interface EnhancedContentScore {
  overall: number;
  grade: string;
  term_coverage: number;
  readability: number;
  word_count: number;
  target_word_count: number;
  important_terms: { term: string; count: number; target: number; present: boolean }[];
  add_terms: string[];
  gaps: string[];
  low_confidence: boolean;
}

interface BacklinkRow {
  id: string;
  source_url: string;
  target_url: string;
  anchor_text: string | null;
  referring_domain: string;
  first_seen: string | null;
}

interface ReferringDomainRow {
  id: string;
  domain: string;
  backlink_count: number;
  first_seen: string | null;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'rankings', label: 'Rankings' },
  { key: 'research', label: 'Research' },
  { key: 'audits', label: 'Audits' },
  { key: 'site-audits', label: 'Site Audits' },
  { key: 'briefs', label: 'Content Briefs' },
  { key: 'overview', label: 'Overview' },
  { key: 'competitors', label: 'Competitors' },
  { key: 'internal-links', label: 'Internal Links' },
  { key: 'schema', label: 'Schema' },
  { key: 'topics', label: 'Topics' },
  { key: 'content-optimizer', label: 'Content Optimizer' },
  { key: 'backlinks', label: 'Backlinks' },
  { key: 'serp-features', label: 'SERP Features' },
];

const COUNTRIES = ['US', 'GB', 'IN', 'CA', 'AU', 'DE', 'FR', 'ES', 'BR', 'JP'];

const SEVERITY: Record<string, { c: string; soft: string; label: string; order: number }> = {
  critical: { c: BRAND.pink, soft: BRAND.pinkSoft, label: 'Critical', order: 0 },
  high: { c: BRAND.pink, soft: BRAND.pinkSoft, label: 'High', order: 1 },
  medium: { c: BRAND.amberDeep, soft: BRAND.amberSoft, label: 'Medium', order: 2 },
  low: { c: BRAND.tealDeep, soft: BRAND.tealSoft, label: 'Low', order: 3 },
};

function fmtDate(iso: string | null | undefined): string {
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

function difficultyColor(v: number): string {
  if (v < 30) return BRAND.tealDeep;
  if (v <= 70) return BRAND.amberDeep;
  return BRAND.pink;
}

function MetricBar({ value, color }: { value: number | null | undefined; color: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
      <Box sx={{ flex: 1, height: 6, borderRadius: 99, bgcolor: 'rgba(14,17,22,0.07)', overflow: 'hidden', minWidth: 40 }}>
        <Box sx={{ width: `${v}%`, height: '100%', borderRadius: 99, background: color }} />
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE, width: 26, textAlign: 'right' }}>
        {value === null || value === undefined ? '—' : v}
      </Typography>
    </Stack>
  );
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const c = scoreColor(score);
  const stroke = size >= 64 ? 6 : 5;
  const r = size / 2 - stroke - 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(14,17,22,0.08)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={c}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: size >= 64 ? 17 : 14,
          color: c,
        }}
      >
        {Math.round(score)}
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
  const [siteAudits, setSiteAudits] = useState<SiteAudit[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [ov, setOv] = useState<Overview | null>(null);
  const [sov, setSov] = useState<ShareOfVoice | null>(null);
  const [contentGaps, setContentGaps] = useState<ContentGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [kwOpen, setKwOpen] = useState(false);
  const [kwForm, setKwForm] = useState({ term: '', country: 'US', device: 'desktop', intent: '' });
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditUrl, setAuditUrl] = useState('');
  const [siteAuditOpen, setSiteAuditOpen] = useState(false);
  const [siteAuditForm, setSiteAuditForm] = useState({ url: '', max_pages: 20 });
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefKw, setBriefKw] = useState('');
  const [activeBrief, setActiveBrief] = useState<Brief | null>(null);
  const [saving, setSaving] = useState(false);

  // Rankings: history + serp check
  const [expandedKw, setExpandedKw] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, Snapshot[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  const [serpOpen, setSerpOpen] = useState(false);
  const [serpKw, setSerpKw] = useState<Keyword | null>(null);
  const [serpDomain, setSerpDomain] = useState('');

  // Research
  const [seed, setSeed] = useState('');
  const [researchCountry, setResearchCountry] = useState('US');
  const [researching, setResearching] = useState(false);
  const [ideas, setIdeas] = useState<KeywordIdea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<'keyword' | 'difficulty' | 'volume_proxy' | 'confidence'>('difficulty');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Site audit expand
  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  // Content score (brief detail)
  const [scoreText, setScoreText] = useState('');
  const [scoring, setScoring] = useState(false);
  const [contentScore, setContentScore] = useState<ContentScore | null>(null);

  // Competitors
  const [compGapOpen, setCompGapOpen] = useState(false);
  const [compForm, setCompForm] = useState({ your_domain: '', competitors: [''] });
  const [compResults, setCompResults] = useState<CompetitorGapRow[]>([]);
  const [compLoading, setCompLoading] = useState(false);

  // Internal Links
  const [linkGraphs, setLinkGraphs] = useState<LinkGraphData[]>([]);
  const [linkGraphOpen, setLinkGraphOpen] = useState(false);
  const [linkGraphUrl, setLinkGraphUrl] = useState('');

  // Schema
  const [schemaType, setSchemaType] = useState('Article');
  const [schemaFields, setSchemaFields] = useState<Record<string, string>>({});
  const [generatedSchema, setGeneratedSchema] = useState<{ jsonld: object; script_tag: string } | null>(null);
  const [schemaValidation, setSchemaValidation] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);

  // Topics
  const [topics, setTopics] = useState<TopicCluster[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Content Optimizer
  const [optKeyword, setOptKeyword] = useState('');
  const [optText, setOptText] = useState('');
  const [optLoading, setOptLoading] = useState(false);
  const [optScore, setOptScore] = useState<EnhancedContentScore | null>(null);

  // Backlinks
  const [backlinks, setBacklinks] = useState<BacklinkRow[]>([]);
  const [refDomains, setRefDomains] = useState<ReferringDomainRow[]>([]);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvUploading, setCsvUploading] = useState(false);

  // SEO agent
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [agentToast, setAgentToast] = useState<string | null>(null);

  // SERP features
  const [serpFeatures, setSerpFeatures] = useState<SerpFeature[]>([]);
  const [serpLoading, setSerpLoading] = useState(false);
  const [detectingSerp, setDetectingSerp] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, a, sa, b, o] = await Promise.all([
        api<Keyword[]>('/seo/keywords', { workspace: true }),
        api<Audit[]>('/seo/audits', { workspace: true }),
        api<SiteAudit[]>('/seo/site-audits', { workspace: true }),
        api<Brief[]>('/seo/briefs', { workspace: true }),
        api<Overview>('/seo/overview', { workspace: true }),
      ]);
      setKeywords(k);
      setAudits(a);
      setSiteAudits(sa);
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

  // Overview extras
  useEffect(() => {
    if (!activeWorkspace || tab !== 'overview') return;
    (async () => {
      try {
        const [s, g] = await Promise.all([
          api<ShareOfVoice>('/seo/share-of-voice', { workspace: true }),
          api<{ gaps: ContentGap[] }>('/seo/content-gaps', { workspace: true }),
        ]);
        setSov(s);
        setContentGaps(g.gaps || []);
      } catch {
        // non-fatal
      }
    })();
  }, [activeWorkspace, tab]);

  // Load data for new tabs
  useEffect(() => {
    if (!activeWorkspace) return;
    if (tab === 'internal-links') loadLinkGraphs();
    if (tab === 'topics') loadTopics();
    if (tab === 'backlinks') loadBacklinks();
    if (tab === 'serp-features') loadSerpFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, tab]);

  // Poll running site audits every 5s
  useEffect(() => {
    const hasRunning = siteAudits.some((s) => s.status === 'running');
    if (!hasRunning) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await api<SiteAudit[]>('/seo/site-audits', { workspace: true });
        setSiteAudits(fresh);
      } catch {
        // ignore poll errors
      }
    }, 5000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [siteAudits]);

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

  const runSerpCheck = async () => {
    if (!serpKw || !serpDomain.trim()) return;
    setSaving(true);
    try {
      const res = await api<{ status: string; rank?: number }>(`/seo/keywords/${serpKw.id}/check-serp`, {
        method: 'POST',
        body: { domain: serpDomain.trim() },
        workspace: true,
      });
      setToast(res.status === 'recorded' ? `SERP rank: ${res.rank ?? '—'}` : 'No SERP position found');
      setSerpOpen(false);
      setSerpDomain('');
      setSerpKw(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SERP check failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleHistory = async (kw: Keyword) => {
    if (expandedKw === kw.id) {
      setExpandedKw(null);
      return;
    }
    setExpandedKw(kw.id);
    if (!historyMap[kw.id]) {
      setHistoryLoading(kw.id);
      try {
        const hist = await api<Snapshot[]>(`/seo/keywords/${kw.id}/history`, { workspace: true });
        setHistoryMap((m) => ({ ...m, [kw.id]: hist }));
      } catch {
        setHistoryMap((m) => ({ ...m, [kw.id]: [] }));
      } finally {
        setHistoryLoading(null);
      }
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

  const runSiteAudit = async () => {
    if (!siteAuditForm.url.trim()) return;
    setSaving(true);
    try {
      await api('/seo/site-audit', {
        method: 'POST',
        body: { url: siteAuditForm.url.trim(), max_pages: siteAuditForm.max_pages },
        workspace: true,
      });
      setSiteAuditOpen(false);
      setSiteAuditForm({ url: '', max_pages: 20 });
      setToast('Site audit started');
      setTab('site-audits');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Site audit failed');
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
      openBrief(brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Brief generation failed');
    } finally {
      setSaving(false);
    }
  };

  const openBrief = (b: Brief) => {
    setActiveBrief(b);
    setScoreText('');
    setContentScore(null);
  };

  const runContentScore = async () => {
    if (!activeBrief || !scoreText.trim()) return;
    setScoring(true);
    try {
      const res = await api<ContentScore>('/seo/content-score', {
        method: 'POST',
        body: { keyword: activeBrief.target_keyword, text: scoreText },
        workspace: true,
      });
      setContentScore(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scoring failed');
    } finally {
      setScoring(false);
    }
  };

  const runResearch = async () => {
    if (!seed.trim()) return;
    setResearching(true);
    setError(null);
    try {
      const res = await api<{ ideas: KeywordIdea[] }>('/seo/research', {
        method: 'POST',
        body: { seed: seed.trim(), country: researchCountry },
        workspace: true,
      });
      setIdeas(res.ideas || []);
      setSelectedIdeas(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research failed');
    } finally {
      setResearching(false);
    }
  };

  const toggleIdea = (keyword: string) => {
    setSelectedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  const trackSelectedIdeas = async () => {
    const chosen = ideas.filter((i) => selectedIdeas.has(i.keyword));
    if (chosen.length === 0) return;
    setSaving(true);
    try {
      await api('/seo/keywords/bulk', {
        method: 'POST',
        body: {
          keywords: chosen.map((i) => ({
            term: i.keyword,
            country: researchCountry,
            device: 'desktop',
            intent: i.intent ?? null,
            difficulty: i.difficulty ?? null,
            volume_proxy: i.volume_proxy ?? null,
            metrics: i.metrics ?? null,
            is_tracked: true,
          })),
        },
        workspace: true,
      });
      setToast(`Tracking ${chosen.length} keyword${chosen.length > 1 ? 's' : ''}`);
      setSelectedIdeas(new Set());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to track keywords');
    } finally {
      setSaving(false);
    }
  };

  const sortedIdeas = useMemo(() => {
    const arr = [...ideas];
    arr.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === 'keyword') {
        av = a.keyword.toLowerCase();
        bv = b.keyword.toLowerCase();
      } else {
        av = (a[sortKey] as number) ?? -1;
        bv = (b[sortKey] as number) ?? -1;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [ideas, sortKey, sortDir]);

  const setSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'keyword' ? 'asc' : 'desc');
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

  const smallBtn = {
    textTransform: 'none' as const,
    fontWeight: 700,
    fontSize: 12.5,
    color: INK,
    borderRadius: '999px',
    px: 1.5,
    '&:hover': { bgcolor: 'rgba(14,17,22,0.05)' },
  };

  const trackedCount = useMemo(() => keywords.filter((k) => k.is_tracked).length, [keywords]);

  const serpResearch = useMemo(() => {
    const outline = activeBrief?.outline as Record<string, unknown> | null | undefined;
    if (!outline) return null;
    const sr = outline['serp_research'];
    return sr && typeof sr === 'object' ? (sr as Record<string, unknown>) : null;
  }, [activeBrief]);

  // ── Competitors ──
  const runCompetitorGap = async () => {
    if (!compForm.your_domain.trim()) return;
    const competitors = compForm.competitors.filter((c) => c.trim());
    if (competitors.length === 0) return;
    setCompLoading(true);
    try {
      const res = await api<{ matrix: CompetitorGapRow[] }>('/seo/competitor-gap', {
        method: 'POST',
        body: { your_domain: compForm.your_domain.trim(), competitor_domains: competitors },
        workspace: true,
      });
      setCompResults(res.matrix || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Competitor gap analysis failed');
    } finally {
      setCompLoading(false);
    }
  };

  // ── Internal Links ──
  const loadLinkGraphs = async () => {
    try {
      const res = await api<LinkGraphData[]>('/seo/link-graphs', { workspace: true });
      setLinkGraphs(res || []);
    } catch { /* non-fatal */ }
  };

  const runLinkGraph = async () => {
    if (!linkGraphUrl.trim()) return;
    setSaving(true);
    try {
      await api('/seo/link-graph', { method: 'POST', body: { base_url: linkGraphUrl.trim() }, workspace: true });
      setLinkGraphOpen(false);
      setLinkGraphUrl('');
      setToast('Link graph analysis started');
      await loadLinkGraphs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Link graph failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Schema ──
  const SCHEMA_TYPES = ['Article', 'Product', 'FAQ', 'HowTo', 'Organization', 'BreadcrumbList'];
  const SCHEMA_FIELDS: Record<string, string[]> = {
    Article: ['headline', 'author', 'datePublished', 'image', 'description'],
    Product: ['name', 'description', 'price', 'currency', 'availability', 'image'],
    FAQ: ['question1', 'answer1', 'question2', 'answer2', 'question3', 'answer3'],
    HowTo: ['name', 'description', 'step1', 'step2', 'step3'],
    Organization: ['name', 'url', 'logo', 'description', 'email', 'phone'],
    BreadcrumbList: ['item1_name', 'item1_url', 'item2_name', 'item2_url', 'item3_name', 'item3_url'],
  };

  const generateSchema = async () => {
    setSaving(true);
    try {
      const res = await api<{ jsonld: object; script_tag: string }>('/seo/schema/generate', {
        method: 'POST',
        body: { schema_type: schemaType, fields: schemaFields },
        workspace: true,
      });
      setGeneratedSchema(res);
      setSchemaValidation(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schema generation failed');
    } finally {
      setSaving(false);
    }
  };

  const validateSchema = async () => {
    if (!generatedSchema) return;
    try {
      const res = await api<{ valid: boolean; errors: string[]; warnings: string[] }>('/seo/schema/validate', {
        method: 'POST',
        body: { jsonld: generatedSchema.jsonld },
        workspace: true,
      });
      setSchemaValidation(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schema validation failed');
    }
  };

  // ── Topics ──
  const computeTopics = async () => {
    setTopicsLoading(true);
    try {
      const res = await api<{ clusters: TopicCluster[] }>('/seo/topics/compute', { method: 'POST', workspace: true });
      setTopics(res.clusters || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Topic computation failed');
    } finally {
      setTopicsLoading(false);
    }
  };

  const loadTopics = async () => {
    try {
      const res = await api<TopicCluster[]>('/seo/topics', { workspace: true });
      setTopics(res || []);
    } catch { /* non-fatal */ }
  };

  // ── Content Optimizer ──
  const runEnhancedScore = async () => {
    if (!optKeyword.trim() || !optText.trim()) return;
    setOptLoading(true);
    try {
      const res = await api<EnhancedContentScore>('/seo/content-score-enhanced', {
        method: 'POST',
        body: { keyword: optKeyword.trim(), text: optText },
        workspace: true,
      });
      setOptScore(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Content scoring failed');
    } finally {
      setOptLoading(false);
    }
  };

  // ── Backlinks ──
  const loadBacklinks = async () => {
    try {
      const [bl, rd] = await Promise.all([
        api<BacklinkRow[]>('/seo/backlinks', { workspace: true }),
        api<ReferringDomainRow[]>('/seo/referring-domains', { workspace: true }),
      ]);
      setBacklinks(bl || []);
      setRefDomains(rd || []);
    } catch { /* non-fatal */ }
  };

  // ── SEO Agent ──
  const runSeoAgent = async () => {
    setAgentBusy(true);
    setAgentResult(null);
    try {
      const res = await api<any>('/seo/agent/run', { method: 'POST', workspace: true });
      setAgentResult(res);
      setAgentToast(`SEO agent completed: ${res.rank_drops?.length ?? 0} rank drops flagged`);
      load();
    } catch (e) {
      setAgentToast(e instanceof Error ? e.message : 'Agent run failed');
    } finally {
      setAgentBusy(false);
    }
  };

  // ── SERP Features ──
  const loadSerpFeatures = async () => {
    setSerpLoading(true);
    try {
      const data = await api<SerpFeature[]>('/seo/serp-features', { workspace: true });
      setSerpFeatures(data);
    } catch { setSerpFeatures([]); }
    finally { setSerpLoading(false); }
  };

  const detectSerpFeatures = async (keywordId: string) => {
    setDetectingSerp(keywordId);
    try {
      await api(`/seo/keywords/${keywordId}/detect-serp-features`, { method: 'POST', workspace: true });
      await loadSerpFeatures();
    } catch (e) {
      setAgentToast(e instanceof Error ? e.message : 'Detection failed');
    } finally {
      setDetectingSerp(null);
    }
  };

  const uploadCsv = async () => {
    if (!csvText.trim()) return;
    setCsvUploading(true);
    try {
      const res = await api<{ imported: number; domains: number; errors: string[] }>('/seo/backlinks/upload', {
        method: 'POST',
        body: { csv_content: csvText, filename: 'manual_upload.csv' },
        workspace: true,
      });
      setToast(`Imported ${res.imported} backlinks from ${res.domains} domains`);
      setCsvUploadOpen(false);
      setCsvText('');
      await loadBacklinks();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CSV upload failed');
    } finally {
      setCsvUploading(false);
    }
  };

  // ── Track All ──
  const [trackAllDomain, setTrackAllDomain] = useState('');
  const [trackAllOpen, setTrackAllOpen] = useState(false);
  const [trackingAll, setTrackingAll] = useState(false);

  const runTrackAll = async () => {
    if (!trackAllDomain.trim()) return;
    setTrackingAll(true);
    try {
      const res = await api<{ total: number; recorded: number }>('/seo/track-all', {
        method: 'POST',
        body: { domain: trackAllDomain.trim() },
        workspace: true,
      });
      setToast(`Checked ${res.total} keywords · ${res.recorded} positions found`);
      setTrackAllOpen(false);
      setTrackAllDomain('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Track all failed');
    } finally {
      setTrackingAll(false);
    }
  };

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
          {tab === 'site-audits' && (
            <Button onClick={() => setSiteAuditOpen(true)} sx={inkBtn}>
              Run site audit
            </Button>
          )}
          {tab === 'internal-links' && (
            <Button onClick={() => setLinkGraphOpen(true)} sx={inkBtn}>
              Analyze links
            </Button>
          )}
          {tab === 'backlinks' && (
            <Button onClick={() => setCsvUploadOpen(true)} sx={inkBtn}>
              Upload CSV
            </Button>
          )}
          {tab === 'rankings' && (
            <Button onClick={() => setTrackAllOpen(true)} sx={{ ...inkBtn, bgcolor: BRAND.tealDeep, '&:hover': { bgcolor: '#0C8A5F' } }}>
              Check all tracked
            </Button>
          )}
          <Button
            onClick={runSeoAgent}
            disabled={agentBusy}
            startIcon={agentBusy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />}
            sx={inkBtn}
          >
            {agentBusy ? 'Running…' : 'Run SEO agent'}
          </Button>
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

      {agentResult && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setAgentResult(null)}>
          SEO agent run complete — {agentResult.rank_drops?.length ?? 0} rank drop{(agentResult.rank_drops?.length ?? 0) === 1 ? '' : 's'} flagged
          {Array.isArray(agentResult.actions) ? `, ${agentResult.actions.length} action${agentResult.actions.length === 1 ? '' : 's'} suggested` : ''}.
        </Alert>
      )}

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
                    <Box sx={{ flex: 1.3, textAlign: 'center' }}>Difficulty</Box>
                    <Box sx={{ flex: 1.3, textAlign: 'center' }}>Demand</Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>Checked</Box>
                    <Box sx={{ flex: 1.8, textAlign: 'right' }}>Actions</Box>
                  </Stack>
                  {keywords.map((kw) => (
                    <Box key={kw.id} sx={{ borderBottom: `1px solid ${LINE}`, '&:last-of-type': { borderBottom: 'none' } }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        sx={{ px: 2.5, py: 1.75 }}
                      >
                        <Box
                          sx={{ flex: 2, cursor: 'pointer' }}
                          onClick={() => toggleHistory(kw)}
                        >
                          <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14 }}>{kw.term}</Typography>
                          <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                            <Chip label={kw.country} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
                            <Chip label={kw.device} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
                            {kw.intent && (
                              <Chip label={kw.intent} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }} />
                            )}
                            {!!kw.metrics?.serp_features && Array.isArray(kw.metrics.serp_features) && (kw.metrics.serp_features as string[]).map((f: string) => (
                              <Chip key={f} label={f.replace(/_/g, ' ')} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: BRAND.amberSoft, color: BRAND.amberDeep }} />
                            ))}
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
                        <Box sx={{ flex: 1.3, px: 1.5 }}>
                          <MetricBar value={kw.difficulty} color={difficultyColor(kw.difficulty ?? 0)} />
                        </Box>
                        <Box sx={{ flex: 1.3, px: 1.5 }}>
                          <MetricBar value={kw.volume_proxy} color={BRAND.amberDeep} />
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: SUBTLE }}>{fmtDate(kw.last_checked_at)}</Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5} sx={{ flex: 1.8, justifyContent: 'flex-end' }}>
                          <Button onClick={() => checkKeyword(kw.id)} size="small" sx={smallBtn}>
                            Check
                          </Button>
                          <Button
                            onClick={() => {
                              setSerpKw(kw);
                              setSerpDomain('');
                              setSerpOpen(true);
                            }}
                            size="small"
                            sx={smallBtn}
                          >
                            SERP Check
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
                      {expandedKw === kw.id && (
                        <Box sx={{ px: 2.5, pb: 2.5, pt: 0.5 }}>
                          <Box sx={{ bgcolor: 'rgba(14,17,22,0.02)', borderRadius: '14px', p: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                              <TrendingUpRoundedIcon sx={{ fontSize: 16, color: BRAND.tealDeep }} />
                              <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: INK }}>Rank history</Typography>
                            </Stack>
                            {historyLoading === kw.id ? (
                              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                <CircularProgress size={20} />
                              </Box>
                            ) : (() => {
                              const data = (historyMap[kw.id] || [])
                                .map((s) => ({
                                  date: fmtDate(s.created_at ?? s.checked_at),
                                  rank: (s.rank ?? s.position) ?? null,
                                }))
                                .filter((d) => d.rank !== null);
                              if (data.length === 0) {
                                return (
                                  <Typography sx={{ fontSize: 13, color: SUBTLE, py: 1 }}>
                                    No rank history yet. Run a check to record positions over time.
                                  </Typography>
                                );
                              }
                              return (
                                <Box sx={{ width: '100%', height: 180 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: SUBTLE }} stroke={LINE} />
                                      <YAxis
                                        reversed
                                        domain={[1, 'dataMax']}
                                        allowDecimals={false}
                                        tick={{ fontSize: 11, fill: SUBTLE }}
                                        stroke={LINE}
                                      />
                                      <Tooltip
                                        contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }}
                                        formatter={(v: number | string) => [v, 'Rank']}
                                      />
                                      <Line
                                        type="monotone"
                                        dataKey="rank"
                                        stroke={BRAND.tealDeep}
                                        strokeWidth={2.5}
                                        dot={{ r: 3, fill: BRAND.tealDeep }}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </Box>
                              );
                            })()}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* RESEARCH */}
          {tab === 'research' && (
            <Stack spacing={2}>
              <Box sx={{ ...cardSx, p: 2.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                  <TextField
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') runResearch();
                    }}
                    placeholder="Seed keyword e.g. marketing automation"
                    fullWidth
                    size="small"
                    InputProps={{ startAdornment: <SearchRoundedIcon sx={{ fontSize: 19, color: SUBTLE, mr: 1 }} /> }}
                  />
                  <TextField
                    select
                    value={researchCountry}
                    onChange={(e) => setResearchCountry(e.target.value)}
                    size="small"
                    sx={{ minWidth: { xs: '100%', md: 130 } }}
                  >
                    {COUNTRIES.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    onClick={runResearch}
                    disabled={researching || !seed.trim()}
                    startIcon={researching ? <CircularProgress size={15} color="inherit" /> : <SearchRoundedIcon />}
                    sx={{ ...inkBtn, boxShadow: 'none', whiteSpace: 'nowrap', minWidth: 130 }}
                  >
                    {researching ? 'Researching…' : 'Research'}
                  </Button>
                </Stack>
              </Box>

              {ideas.length > 0 && (
                <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}` }}
                  >
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: INK }}>
                      {ideas.length} ideas{selectedIdeas.size > 0 ? ` · ${selectedIdeas.size} selected` : ''}
                    </Typography>
                    <Button
                      onClick={trackSelectedIdeas}
                      disabled={saving || selectedIdeas.size === 0}
                      startIcon={<AddRoundedIcon />}
                      sx={{ ...inkBtn, boxShadow: 'none', py: 0.8 }}
                    >
                      Track selected
                    </Button>
                  </Stack>

                  <Stack
                    direction="row"
                    alignItems="center"
                    sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${LINE}`, color: SUBTLE, fontWeight: 700, fontSize: 12 }}
                  >
                    <Box sx={{ width: 36 }} />
                    <Box sx={{ flex: 2, cursor: 'pointer' }} onClick={() => setSort('keyword')}>
                      Keyword{sortKey === 'keyword' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </Box>
                    <Box sx={{ flex: 1.3, cursor: 'pointer' }} onClick={() => setSort('difficulty')}>
                      Difficulty{sortKey === 'difficulty' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </Box>
                    <Box sx={{ flex: 1.3, cursor: 'pointer' }} onClick={() => setSort('volume_proxy')}>
                      Demand{sortKey === 'volume_proxy' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>Intent</Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>Cluster</Box>
                    <Box sx={{ flex: 0.8, textAlign: 'center' }}>Source</Box>
                    <Box sx={{ flex: 0.9, textAlign: 'center', cursor: 'pointer' }} onClick={() => setSort('confidence')}>
                      Confidence{sortKey === 'confidence' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </Box>
                  </Stack>

                  {sortedIdeas.map((idea) => (
                    <Stack
                      key={idea.keyword}
                      direction="row"
                      alignItems="center"
                      sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${LINE}`, '&:last-of-type': { borderBottom: 'none' } }}
                    >
                      <Box sx={{ width: 36 }}>
                        <Checkbox
                          checked={selectedIdeas.has(idea.keyword)}
                          onChange={() => toggleIdea(idea.keyword)}
                          size="small"
                          sx={{ p: 0, color: SUBTLE, '&.Mui-checked': { color: BRAND.tealDeep } }}
                        />
                      </Box>
                      <Box sx={{ flex: 2, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{idea.keyword}</Typography>
                      </Box>
                      <Box sx={{ flex: 1.3, pr: 1.5 }}>
                        <MetricBar value={idea.difficulty} color={difficultyColor(idea.difficulty ?? 0)} />
                      </Box>
                      <Box sx={{ flex: 1.3, pr: 1.5 }}>
                        <MetricBar value={idea.volume_proxy} color={BRAND.amberDeep} />
                      </Box>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        {idea.intent ? (
                          <Chip label={idea.intent} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }} />
                        ) : (
                          <Typography sx={{ fontSize: 12, color: SUBTLE }}>—</Typography>
                        )}
                      </Box>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        {idea.cluster ? (
                          <Chip label={idea.cluster} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: BRAND.amberSoft, color: BRAND.amberDeep }} />
                        ) : (
                          <Typography sx={{ fontSize: 12, color: SUBTLE }}>—</Typography>
                        )}
                      </Box>
                      <Box sx={{ flex: 0.8, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 12, color: SUBTLE, fontWeight: 600 }}>{idea.source ?? '—'}</Typography>
                      </Box>
                      <Box sx={{ flex: 0.9, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 12.5, color: INK, fontWeight: 700 }}>
                          {idea.confidence === null || idea.confidence === undefined
                            ? '—'
                            : `${Math.round(idea.confidence * (idea.confidence <= 1 ? 100 : 1))}%`}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                  <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'rgba(14,17,22,0.02)' }}>
                    <Typography sx={{ fontSize: 12, color: SUBTLE, fontStyle: 'italic' }}>
                      Difficulty and demand are computed estimates from real SERP analysis, not exact volume data.
                    </Typography>
                  </Box>
                </Box>
              )}

              {ideas.length === 0 && !researching && (
                <Box sx={{ ...cardSx, p: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>
                    Enter a seed keyword to discover related ideas with difficulty and demand estimates.
                  </Typography>
                </Box>
              )}
            </Stack>
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

          {/* SITE AUDITS */}
          {tab === 'site-audits' && (
            <>
              {siteAudits.length === 0 ? (
                <Box sx={{ ...cardSx, p: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>No site audits yet. Crawl a site to surface technical issues.</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {siteAudits.map((sa) => {
                    const statusColor =
                      sa.status === 'done' ? BRAND.tealDeep : sa.status === 'failed' ? BRAND.pink : BRAND.amberDeep;
                    const statusSoft =
                      sa.status === 'done' ? BRAND.tealSoft : sa.status === 'failed' ? BRAND.pinkSoft : BRAND.amberSoft;
                    const grouped = (sa.issues || []).reduce<Record<string, AuditIssue[]>>((acc, iss) => {
                      const key = (iss.severity || 'low').toLowerCase();
                      (acc[key] = acc[key] || []).push(iss);
                      return acc;
                    }, {});
                    const sevKeys = Object.keys(grouped).sort(
                      (a, b) => (SEVERITY[a]?.order ?? 9) - (SEVERITY[b]?.order ?? 9),
                    );
                    const expanded = expandedSite === sa.id;
                    return (
                      <Box key={sa.id} sx={{ ...cardSx, p: 2.5 }}>
                        <Stack
                          direction="row"
                          spacing={2.5}
                          alignItems="flex-start"
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setExpandedSite(expanded ? null : sa.id)}
                        >
                          {sa.status === 'running' ? (
                            <Box sx={{ width: 64, height: 64, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                              <CircularProgress size={28} sx={{ color: BRAND.amberDeep }} />
                            </Box>
                          ) : (
                            <ScoreRing score={sa.score} />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                                <LanguageRoundedIcon sx={{ fontSize: 18, color: SUBTLE }} />
                                <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14.5, wordBreak: 'break-all' }}>{sa.base_url}</Typography>
                              </Stack>
                              <Chip
                                label={sa.status}
                                size="small"
                                sx={{ fontWeight: 700, fontSize: 11.5, bgcolor: statusSoft, color: statusColor }}
                              />
                            </Stack>
                            <Typography sx={{ fontSize: 12.5, color: SUBTLE, mt: 0.25 }}>
                              {fmtDate(sa.created_at)} · {sa.pages_crawled}/{sa.max_pages} pages · {(sa.issues?.length ?? 0)} issues
                            </Typography>
                          </Box>
                        </Stack>
                        {expanded && sevKeys.length > 0 && (
                          <Stack spacing={2} sx={{ mt: 2 }}>
                            {sevKeys.map((sevKey) => {
                              const sv = SEVERITY[sevKey] || SEVERITY.low;
                              return (
                                <Box key={sevKey}>
                                  <Chip
                                    label={`${sv.label} · ${grouped[sevKey].length}`}
                                    size="small"
                                    sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: sv.soft, color: sv.c, mb: 1 }}
                                  />
                                  <Stack spacing={0.75}>
                                    {grouped[sevKey].map((iss, idx) => (
                                      <Box key={idx} sx={{ pl: 1, borderLeft: `2px solid ${sv.soft}` }}>
                                        <Typography sx={{ fontSize: 13, color: INK }}>
                                          <Box component="span" sx={{ fontWeight: 700, color: SUBTLE, mr: 0.75 }}>{iss.type}</Box>
                                          {iss.detail}
                                        </Typography>
                                        {iss.url && (
                                          <Typography sx={{ fontSize: 12, color: SUBTLE, wordBreak: 'break-all' }}>{iss.url}</Typography>
                                        )}
                                      </Box>
                                    ))}
                                  </Stack>
                                </Box>
                              );
                            })}
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
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
                    <Box key={b.id} sx={{ ...cardSx, p: 2.5, cursor: 'pointer' }} onClick={() => openBrief(b)}>
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

              {/* Share of Voice */}
              {sov && (
                <Box sx={{ ...cardSx, p: 3 }}>
                  <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>Share of Voice</Typography>
                  <Stack direction="row" spacing={2.5} alignItems="center" flexWrap="wrap" rowGap={2}>
                    <ScoreRing score={sov.sov_score} />
                    <Box>
                      <Typography sx={{ fontSize: 13, color: SUBTLE, fontWeight: 600 }}>
                        Ranked {sov.ranked_keywords} of {sov.total_keywords} tracked keywords
                      </Typography>
                    </Box>
                    {sov.breakdown && sov.breakdown.length > 0 && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} sx={{ flex: 1, justifyContent: { md: 'flex-end' } }}>
                        {sov.breakdown.slice(0, 6).map((b, idx) => (
                          <Chip
                            key={idx}
                            label={`${b.domain ?? b.label ?? '—'} · ${Math.round(((b.share ?? b.value) ?? 0))}%`}
                            size="small"
                            sx={{ height: 24, fontSize: 11.5, fontWeight: 700, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Box>
              )}

              <Box sx={{ ...cardSx, p: 2.5 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: ov.has_rank_connector ? BRAND.tealDeep : BRAND.amberDeep }}>
                  {ov.has_rank_connector
                    ? 'Google Search Console connected — rank checks pull real organic positions.'
                    : 'No ranking provider connected. Connect Google Search Console for live positions.'}
                </Typography>
              </Box>

              {/* Content Gaps */}
              {contentGaps.length > 0 && (
                <Box sx={{ ...cardSx, p: 3 }}>
                  <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>Content Gaps</Typography>
                  <Stack spacing={2}>
                    {contentGaps.map((g, idx) => (
                      <Box key={idx} sx={{ pb: 2, borderBottom: idx < contentGaps.length - 1 ? `1px solid ${LINE}` : 'none' }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                          <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14 }}>{g.keyword}</Typography>
                          {g.confidence !== null && g.confidence !== undefined && (
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE }}>
                              {Math.round(g.confidence * (g.confidence <= 1 ? 100 : 1))}% confidence
                            </Typography>
                          )}
                        </Stack>
                        {g.missing_terms.length > 0 && (
                          <Box sx={{ mb: 1 }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>
                              Missing terms
                            </Typography>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                              {g.missing_terms.map((t, i) => (
                                <Chip key={i} label={t} size="small" sx={{ height: 22, fontSize: 11.5, fontWeight: 700, bgcolor: BRAND.pinkSoft, color: BRAND.pink }} />
                              ))}
                            </Stack>
                          </Box>
                        )}
                        {g.missing_questions.length > 0 && (
                          <Box>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>
                              Missing questions
                            </Typography>
                            <Stack spacing={0.5}>
                              {g.missing_questions.map((q, i) => (
                                <Typography key={i} sx={{ fontSize: 13, color: INK }}>
                                  • {q}
                                </Typography>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              {/* SERP Feature Opportunities */}
              {keywords.filter(k => k.metrics?.serp_features && Array.isArray(k.metrics.serp_features) && (k.metrics.serp_features as string[]).includes('paa')).length > 0 && (
                <Box sx={{ ...cardSx, p: 3 }}>
                  <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>SERP Feature Opportunities</Typography>
                  <Typography sx={{ fontSize: 13.5, color: SUBTLE, mb: 1.5 }}>
                    {keywords.filter(k => k.metrics?.serp_features && Array.isArray(k.metrics.serp_features) && (k.metrics.serp_features as string[]).includes('paa')).length} keywords show People-Also-Ask you could target
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                    {keywords.filter(k => k.metrics?.serp_features && Array.isArray(k.metrics.serp_features) && (k.metrics.serp_features as string[]).includes('paa')).slice(0, 8).map(kw => (
                      <Chip key={kw.id} label={kw.term} size="small" sx={{ height: 24, fontSize: 11.5, fontWeight: 700, bgcolor: BRAND.amberSoft, color: BRAND.amberDeep }} />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}

          {tab === 'competitors' && (
            <Stack spacing={2}>
              <Box sx={{ ...cardSx, p: 2.5 }}>
                <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>Competitor Keyword Gap Analysis</Typography>
                <Stack spacing={1.5}>
                  <TextField label="Your domain" value={compForm.your_domain} onChange={(e) => setCompForm({ ...compForm, your_domain: e.target.value })} fullWidth size="small" placeholder="yourdomain.com" />
                  {compForm.competitors.map((c, i) => (
                    <Stack key={i} direction="row" spacing={1}>
                      <TextField label={`Competitor ${i + 1}`} value={c} onChange={(e) => { const arr = [...compForm.competitors]; arr[i] = e.target.value; setCompForm({ ...compForm, competitors: arr }); }} fullWidth size="small" placeholder="competitor.com" />
                      {i === compForm.competitors.length - 1 && compForm.competitors.length < 3 && (
                        <Button onClick={() => setCompForm({ ...compForm, competitors: [...compForm.competitors, ''] })} size="small" sx={smallBtn}>+</Button>
                      )}
                    </Stack>
                  ))}
                  <Button onClick={runCompetitorGap} disabled={compLoading || !compForm.your_domain.trim()} startIcon={compLoading ? <CircularProgress size={15} color="inherit" /> : <SearchRoundedIcon />} sx={{ ...inkBtn, alignSelf: 'flex-start' }}>
                    {compLoading ? 'Analyzing…' : 'Analyze gaps'}
                  </Button>
                </Stack>
              </Box>
              {compResults.length > 0 && (
                <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                  <Stack direction="row" sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}`, color: SUBTLE, fontWeight: 700, fontSize: 12 }}>
                    <Box sx={{ flex: 2 }}>Keyword</Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>Your Rank</Box>
                    {compResults[0]?.competitors?.map((c) => (
                      <Box key={c.domain} sx={{ flex: 1, textAlign: 'center' }}>{c.domain}</Box>
                    ))}
                    <Box sx={{ flex: 1, textAlign: 'center' }}>Gap</Box>
                  </Stack>
                  {compResults.map((row) => (
                    <Stack key={row.keyword} direction="row" alignItems="center" sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}` }}>
                      <Box sx={{ flex: 2 }}>
                        <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{row.keyword}</Typography>
                      </Box>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 800, color: row.your_rank ? INK : SUBTLE, fontSize: 14 }}>{row.your_rank ?? '—'}</Typography>
                      </Box>
                      {row.competitors.map((c) => (
                        <Box key={c.domain} sx={{ flex: 1, textAlign: 'center' }}>
                          <Typography sx={{ fontWeight: 700, color: c.rank ? (c.rank <= 10 ? BRAND.tealDeep : INK) : SUBTLE, fontSize: 14 }}>{c.rank ?? '—'}</Typography>
                        </Box>
                      ))}
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        {row.gap_flags.includes('competitor_top10') ? (
                          <Chip label="Gap" size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: BRAND.pinkSoft, color: BRAND.pink }} />
                        ) : (
                          <Typography sx={{ fontSize: 12, color: SUBTLE }}>—</Typography>
                        )}
                      </Box>
                    </Stack>
                  ))}
                </Box>
              )}
              {compResults.length === 0 && !compLoading && (
                <Box sx={{ ...cardSx, p: 5, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>Enter your domain and competitors to find keyword gaps from real SERP data.</Typography>
                </Box>
              )}
            </Stack>
          )}

          {tab === 'internal-links' && (
            <Stack spacing={2}>
              {linkGraphs.length === 0 ? (
                <Box sx={{ ...cardSx, p: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>No link graph analyses yet. Run one to discover orphan pages and internal linking opportunities.</Typography>
                </Box>
              ) : (
                linkGraphs.map((lg) => (
                  <Box key={lg.id} sx={{ ...cardSx, p: 2.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16 }}>{lg.base_url}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: SUBTLE }}>{fmtDate(lg.created_at)} · {lg.graph?.nodes?.length ?? 0} pages · {lg.graph?.edges?.length ?? 0} links</Typography>
                      </Box>
                      <Chip label={lg.status} size="small" sx={{ fontWeight: 700, fontSize: 11.5, bgcolor: lg.status === 'done' ? BRAND.tealSoft : BRAND.amberSoft, color: lg.status === 'done' ? BRAND.tealDeep : BRAND.amberDeep }} />
                    </Stack>
                    {lg.orphan_pages && lg.orphan_pages.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.pink, textTransform: 'uppercase', mb: 1 }}>Orphan pages (no inbound links)</Typography>
                        <Stack spacing={0.5}>
                          {lg.orphan_pages.map((url, i) => (
                            <Typography key={i} sx={{ fontSize: 13, color: INK, wordBreak: 'break-all', pl: 1, borderLeft: `2px solid ${BRAND.pinkSoft}` }}>{url}</Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {lg.suggestions && lg.suggestions.length > 0 && (
                      <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.tealDeep, textTransform: 'uppercase', mb: 1 }}>Link opportunities</Typography>
                        <Stack spacing={1}>
                          {(lg.suggestions as { target: string; suggested_from: string[]; reason: string }[]).slice(0, 10).map((s, i) => (
                            <Box key={i} sx={{ pl: 1, borderLeft: `2px solid ${BRAND.tealSoft}` }}>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK }}>{s.target}</Typography>
                              <Typography sx={{ fontSize: 12, color: SUBTLE }}>← Link from: {s.suggested_from.slice(0, 3).join(', ')}</Typography>
                              <Typography sx={{ fontSize: 11.5, color: SUBTLE, fontStyle: 'italic' }}>{s.reason}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                ))
              )}
            </Stack>
          )}

          {tab === 'schema' && (
            <Stack spacing={2}>
              <Box sx={{ ...cardSx, p: 2.5 }}>
                <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>JSON-LD Schema Generator</Typography>
                <Stack spacing={1.5}>
                  <TextField select label="Schema type" value={schemaType} onChange={(e) => { setSchemaType(e.target.value); setSchemaFields({}); setGeneratedSchema(null); setSchemaValidation(null); }} fullWidth size="small">
                    {SCHEMA_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                  {(SCHEMA_FIELDS[schemaType] || []).map((f) => (
                    <TextField key={f} label={f.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())} value={schemaFields[f] || ''} onChange={(e) => setSchemaFields({ ...schemaFields, [f]: e.target.value })} fullWidth size="small" />
                  ))}
                  <Stack direction="row" spacing={1}>
                    <Button onClick={generateSchema} disabled={saving} sx={inkBtn}>Generate JSON-LD</Button>
                    {generatedSchema && <Button onClick={validateSchema} sx={{ ...inkBtn, bgcolor: BRAND.tealDeep, '&:hover': { bgcolor: '#0C8A5F' } }}>Validate</Button>}
                  </Stack>
                </Stack>
              </Box>
              {generatedSchema && (
                <Box sx={{ ...cardSx, p: 2.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14 }}>Generated JSON-LD</Typography>
                    <Button size="small" onClick={() => { navigator.clipboard.writeText(generatedSchema.script_tag); setToast('Copied to clipboard'); }} sx={smallBtn}>Copy</Button>
                  </Stack>
                  <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12.5, color: INK, bgcolor: 'rgba(14,17,22,0.03)', borderRadius: '14px', p: 2, m: 0, overflow: 'auto', maxHeight: 400 }}>
                    {generatedSchema.script_tag}
                  </Box>
                  {schemaValidation && (
                    <Box sx={{ mt: 2, p: 2, borderRadius: '14px', border: `1px solid ${LINE}`, bgcolor: schemaValidation.valid ? BRAND.tealSoft : BRAND.pinkSoft }}>
                      <Typography sx={{ fontWeight: 700, color: schemaValidation.valid ? BRAND.tealDeep : BRAND.pink, fontSize: 14, mb: 1 }}>
                        {schemaValidation.valid ? '✓ Valid schema' : '✗ Schema has issues'}
                      </Typography>
                      {schemaValidation.errors.map((e, i) => (
                        <Typography key={i} sx={{ fontSize: 13, color: BRAND.pink, mb: 0.5 }}>• {e}</Typography>
                      ))}
                      {schemaValidation.warnings.map((w, i) => (
                        <Typography key={i} sx={{ fontSize: 13, color: BRAND.amberDeep, mb: 0.5 }}>⚠ {w}</Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Stack>
          )}

          {tab === 'topics' && (
            <Stack spacing={2}>
              <Box sx={{ ...cardSx, p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16 }}>Topical Authority Map</Typography>
                  <Button onClick={computeTopics} disabled={topicsLoading} startIcon={topicsLoading ? <CircularProgress size={15} color="inherit" /> : <AutoAwesomeRoundedIcon />} sx={inkBtn}>
                    {topicsLoading ? 'Computing…' : 'Compute clusters'}
                  </Button>
                </Stack>
              </Box>
              {topics.length === 0 && !topicsLoading ? (
                <Box sx={{ ...cardSx, p: 6, textAlign: 'center' }}>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>No topic clusters yet. Add tracked keywords, then compute clusters to see your topical authority.</Typography>
                </Box>
              ) : (
                topics.map((tc) => (
                  <Box key={tc.id || tc.topic} sx={{ ...cardSx, p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={2.5} sx={{ mb: 1.5 }}>
                      <ScoreRing score={tc.authority_score} size={56} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, textTransform: 'capitalize' }}>{tc.topic}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: SUBTLE }}>{tc.keywords?.length ?? 0} keywords · {tc.coverage_pct}% coverage</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase' }}>Authority</Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: scoreColor(tc.authority_score) }}>{tc.authority_score}</Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ height: 6, borderRadius: 99, bgcolor: 'rgba(14,17,22,0.07)', overflow: 'hidden' }}>
                        <Box sx={{ width: `${tc.coverage_pct}%`, height: '100%', borderRadius: 99, background: BRAND.gradient }} />
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75} sx={{ mb: 1 }}>
                      {(tc.keywords || []).slice(0, 12).map((kw) => (
                        <Chip key={kw} label={kw} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: 'rgba(14,17,22,0.05)', color: INK }} />
                      ))}
                    </Stack>
                    {tc.pillar_gaps && tc.pillar_gaps.length > 0 && (
                      <Box>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: BRAND.pink, textTransform: 'uppercase', mb: 0.5 }}>Pillar gaps</Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                          {tc.pillar_gaps.map((g) => (
                            <Chip key={g} label={g} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: BRAND.pinkSoft, color: BRAND.pink }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                ))
              )}
            </Stack>
          )}

          {tab === 'content-optimizer' && (
            <Stack spacing={2}>
              <Box sx={{ ...cardSx, p: 2.5 }}>
                <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>Content Optimizer</Typography>
                <Typography sx={{ fontSize: 13, color: SUBTLE, mb: 2 }}>Grade your content against real SERP competitors. Get an A–F score with specific term recommendations.</Typography>
                <Stack spacing={1.5}>
                  <TextField label="Target keyword" value={optKeyword} onChange={(e) => setOptKeyword(e.target.value)} fullWidth size="small" placeholder="e.g. content marketing strategy" />
                  <TextField label="Your content" value={optText} onChange={(e) => setOptText(e.target.value)} fullWidth size="small" multiline minRows={6} placeholder="Paste your article text here…" />
                  <Button onClick={runEnhancedScore} disabled={optLoading || !optKeyword.trim() || !optText.trim()} startIcon={optLoading ? <CircularProgress size={15} color="inherit" /> : <SpeedRoundedIcon />} sx={{ ...inkBtn, alignSelf: 'flex-start' }}>
                    {optLoading ? 'Scoring…' : 'Score content'}
                  </Button>
                </Stack>
              </Box>
              {optScore && (
                <Box sx={{ ...cardSx, p: 2.5 }}>
                  <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 2.5 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 48, fontWeight: 900, color: scoreColor(optScore.overall), lineHeight: 1 }}>{optScore.grade}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE }}>Grade</Typography>
                    </Box>
                    <ScoreRing score={optScore.overall} size={72} />
                    <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={1}>
                      <Box>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase' }}>Term coverage</Typography>
                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: INK }}>{Math.round(optScore.term_coverage)}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase' }}>Readability</Typography>
                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: INK }}>{Math.round(optScore.readability)}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase' }}>Words</Typography>
                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: INK }}>{optScore.word_count}<Box component="span" sx={{ fontSize: 12, color: SUBTLE, fontWeight: 600 }}> / {optScore.target_word_count}</Box></Typography>
                      </Box>
                    </Stack>
                  </Stack>
                  {optScore.important_terms && optScore.important_terms.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', mb: 1 }}>Important terms</Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                        {optScore.important_terms.map((t, i) => (
                          <Chip key={i} icon={t.present ? <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> : undefined} label={`${t.term} (${t.count}/${t.target})`} size="small" sx={{ height: 24, fontSize: 11.5, fontWeight: 700, bgcolor: t.present ? BRAND.tealSoft : 'rgba(14,17,22,0.05)', color: t.present ? BRAND.tealDeep : SUBTLE, '& .MuiChip-icon': { color: BRAND.tealDeep } }} />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {optScore.add_terms && optScore.add_terms.length > 0 && (
                    <Box>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: BRAND.pink, textTransform: 'uppercase', mb: 1 }}>Add these terms</Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                        {optScore.add_terms.map((t, i) => (
                          <Chip key={i} label={t} size="small" sx={{ height: 22, fontSize: 11.5, fontWeight: 700, bgcolor: BRAND.pinkSoft, color: BRAND.pink }} />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {optScore.low_confidence && (
                    <Typography sx={{ fontSize: 12, color: BRAND.amberDeep, fontStyle: 'italic', mt: 1.5 }}>⚠ Low confidence — limited SERP data available for this keyword.</Typography>
                  )}
                </Box>
              )}
            </Stack>
          )}

          {tab === 'backlinks' && (
            <Stack spacing={2}>
              {backlinks.length === 0 ? (
                <Box sx={{ ...cardSx, p: 5, textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 800, color: INK, fontSize: 18, mb: 1 }}>Backlink Data</Typography>
                  <Typography sx={{ color: SUBTLE, fontWeight: 600, mb: 2, maxWidth: 500, mx: 'auto' }}>
                    Backlink data requires a real source. Upload a Google Search Console links export (CSV) or connect a backlink provider to populate real data. We never fabricate link data.
                  </Typography>
                  <Button onClick={() => setCsvUploadOpen(true)} sx={inkBtn}>Upload GSC Links CSV</Button>
                </Box>
              ) : (
                <>
                  <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2}>
                    <KpiCard label="Total backlinks" value={backlinks.length} accent={BRAND.tealDeep} />
                    <KpiCard label="Referring domains" value={refDomains.length} accent={BRAND.amberDeep} />
                  </Stack>
                  {refDomains.length > 0 && (
                    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                      <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14, px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}` }}>Referring Domains</Typography>
                      {refDomains.slice(0, 20).map((rd) => (
                        <Stack key={rd.id} direction="row" alignItems="center" sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${LINE}` }}>
                          <Box sx={{ flex: 2 }}><Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{rd.domain}</Typography></Box>
                          <Box sx={{ flex: 1, textAlign: 'center' }}><Typography sx={{ fontWeight: 800, color: BRAND.tealDeep, fontSize: 14 }}>{rd.backlink_count}</Typography></Box>
                          <Box sx={{ flex: 1, textAlign: 'right' }}><Typography sx={{ fontSize: 12.5, color: SUBTLE }}>{fmtDate(rd.first_seen)}</Typography></Box>
                        </Stack>
                      ))}
                    </Box>
                  )}
                  <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                    <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14, px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}` }}>Recent Backlinks</Typography>
                    {backlinks.slice(0, 30).map((bl) => (
                      <Stack key={bl.id} direction="row" alignItems="center" sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${LINE}` }}>
                        <Box sx={{ flex: 2, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13, color: INK, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bl.source_url}</Typography>
                        </Box>
                        <Box sx={{ flex: 1.5, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13, color: SUBTLE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>→ {bl.target_url}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 12.5, color: INK, fontWeight: 600 }}>{bl.anchor_text || '—'}</Typography>
                        </Box>
                        <Box sx={{ flex: 0.7, textAlign: 'right' }}>
                          <Typography sx={{ fontSize: 12, color: SUBTLE }}>{fmtDate(bl.first_seen)}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Box>
                </>
              )}
            </Stack>
          )}

          {tab === 'serp-features' && (
            <Stack spacing={2}>
              <Box sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${LINE}` }}>
                  <Typography sx={{ fontWeight: 800, color: INK, fontSize: 18 }}>SERP Features</Typography>
                  <Typography sx={{ color: SUBTLE, fontWeight: 500, mt: 0.5, maxWidth: 620 }}>
                    Feature snippet, People Also Ask, video, and other SERP feature detection for tracked keywords.
                  </Typography>
                </Box>

                {serpLoading ? (
                  <Box sx={{ p: 5, textAlign: 'center' }}>
                    <CircularProgress size={22} sx={{ color: INK }} />
                  </Box>
                ) : serpFeatures.length === 0 ? (
                  <Box sx={{ p: 5, textAlign: 'center' }}>
                    <Typography sx={{ color: SUBTLE, fontWeight: 600 }}>
                      No SERP feature data yet. Use the detect action on tracked keywords.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Stack direction="row" alignItems="center" sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${LINE}` }}>
                      <Box sx={{ flex: 1.5 }}><Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4 }}>Keyword</Typography></Box>
                      <Box sx={{ flex: 2 }}><Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4 }}>Features</Typography></Box>
                      <Box sx={{ flex: 0.8 }}><Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4 }}>Detected at</Typography></Box>
                      <Box sx={{ flex: 0.8, textAlign: 'right' }}><Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4 }}>Action</Typography></Box>
                    </Stack>
                    {serpFeatures.map((sf) => {
                      const kw = keywords.find((k) => k.id === sf.keyword_id);
                      const feats = sf.features || [];
                      return (
                        <Stack key={sf.id} direction="row" alignItems="center" sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}` }}>
                          <Box sx={{ flex: 1.5, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {kw?.term || sf.keyword_id}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 2 }}>
                            {feats.length === 0 ? (
                              <Typography sx={{ fontSize: 13, color: SUBTLE }}>—</Typography>
                            ) : (
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                                {feats.map((f) => (
                                  <Chip key={f} label={f} size="small" sx={{ fontWeight: 600, fontSize: 12, bgcolor: 'rgba(14,17,22,0.05)', color: INK }} />
                                ))}
                              </Stack>
                            )}
                          </Box>
                          <Box sx={{ flex: 0.8 }}>
                            <Typography sx={{ fontSize: 12.5, color: SUBTLE }}>{fmtDate(sf.detected_at)}</Typography>
                          </Box>
                          <Box sx={{ flex: 0.8, textAlign: 'right' }}>
                            <Button
                              size="small"
                              onClick={() => detectSerpFeatures(sf.keyword_id)}
                              disabled={detectingSerp === sf.keyword_id}
                              sx={smallBtn}
                            >
                              {detectingSerp === sf.keyword_id ? 'Detecting…' : 'Detect'}
                            </Button>
                          </Box>
                        </Stack>
                      );
                    })}
                  </>
                )}
              </Box>

              {(() => {
                const withFeatures = new Set(serpFeatures.map((sf) => sf.keyword_id));
                const tracked = keywords.filter((k) => k.is_tracked && !withFeatures.has(k.id));
                if (tracked.length === 0) return null;
                return (
                  <Box sx={{ ...cardSx, p: 0, overflow: 'hidden' }}>
                    <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14, px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}` }}>
                      Tracked keywords without SERP features
                    </Typography>
                    {tracked.map((k) => (
                      <Stack key={k.id} direction="row" alignItems="center" sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${LINE}` }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.term}</Typography>
                        </Box>
                        <Box sx={{ flex: 0.5, textAlign: 'right' }}>
                          <Button
                            size="small"
                            onClick={() => detectSerpFeatures(k.id)}
                            disabled={detectingSerp === k.id}
                            sx={smallBtn}
                          >
                            {detectingSerp === k.id ? 'Detecting…' : 'Detect'}
                          </Button>
                        </Box>
                      </Stack>
                    ))}
                  </Box>
                );
              })()}
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

      {/* SERP check dialog */}
      <PremiumDialog open={serpOpen} onClose={() => setSerpOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<SearchRoundedIcon />}
          title="SERP check"
          subtitle={serpKw ? `Find live position for "${serpKw.term}"` : 'Find live position'}
          onClose={() => setSerpOpen(false)}
          tint={BRAND.amberDeep}
          tintSoft={BRAND.amberSoft}
        />
        <DialogBody>
          <SectionLabel>Your domain</SectionLabel>
          <TextField
            label="Domain"
            placeholder="example.com"
            value={serpDomain}
            onChange={(e) => setSerpDomain(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSerpCheck();
            }}
          />
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setSerpOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={runSerpCheck} disabled={saving || !serpDomain.trim()} sx={inkPillSx}>
            {saving ? 'Checking…' : 'Check SERP'}
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

      {/* Run site audit dialog */}
      <PremiumDialog open={siteAuditOpen} onClose={() => setSiteAuditOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<LanguageRoundedIcon />}
          title="Run site audit"
          subtitle="Crawl a site and surface technical SEO issues at scale"
          onClose={() => setSiteAuditOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <SectionLabel>Crawl settings</SectionLabel>
          <FieldGrid>
            <FullSpan>
              <TextField
                label="Site URL"
                placeholder="https://example.com"
                value={siteAuditForm.url}
                onChange={(e) => setSiteAuditForm({ ...siteAuditForm, url: e.target.value })}
                fullWidth
                size="small"
                autoFocus
              />
            </FullSpan>
            <FullSpan>
              <TextField
                label="Max pages"
                type="number"
                value={siteAuditForm.max_pages}
                onChange={(e) => setSiteAuditForm({ ...siteAuditForm, max_pages: Math.max(1, Number(e.target.value) || 1) })}
                fullWidth
                size="small"
                inputProps={{ min: 1, max: 200 }}
              />
            </FullSpan>
          </FieldGrid>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setSiteAuditOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={runSiteAudit} disabled={saving || !siteAuditForm.url.trim()} sx={inkPillSx}>
            {saving ? 'Starting…' : 'Run site audit'}
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
      <PremiumDialog open={!!activeBrief} onClose={() => setActiveBrief(null)} maxWidth="md">
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
              {/* SERP Targets */}
              {serpResearch && Array.isArray(serpResearch['target_terms']) && (serpResearch['target_terms'] as unknown[]).length > 0 && (
                <Box sx={{ mb: 2.5 }}>
                  <SectionLabel>SERP Targets</SectionLabel>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                    {(serpResearch['target_terms'] as Array<Record<string, unknown> | string>).map((t, i) => {
                      const term = typeof t === 'string' ? t : String(t['term'] ?? t['keyword'] ?? '');
                      const count =
                        typeof t === 'string' ? null : (t['suggested_count'] ?? t['count'] ?? t['target']) as number | undefined;
                      return (
                        <Chip
                          key={i}
                          label={count ? `${term} · ${count}` : term}
                          size="small"
                          sx={{ height: 24, fontSize: 11.5, fontWeight: 700, bgcolor: BRAND.amberSoft, color: BRAND.amberDeep }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}

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

              {/* Score content */}
              <Box sx={{ mt: 3 }}>
                <SectionLabel>Score content</SectionLabel>
                <TextField
                  value={scoreText}
                  onChange={(e) => setScoreText(e.target.value)}
                  placeholder="Paste your draft text here to score term coverage and readability against this keyword"
                  multiline
                  minRows={4}
                  fullWidth
                  size="small"
                />
                <Button
                  onClick={runContentScore}
                  disabled={scoring || !scoreText.trim()}
                  startIcon={scoring ? <CircularProgress size={15} color="inherit" /> : <CheckCircleRoundedIcon />}
                  sx={{ ...inkPillSx, mt: 1.25 }}
                >
                  {scoring ? 'Scoring…' : 'Score content'}
                </Button>

                {contentScore && (
                  <Box sx={{ mt: 2.5, p: 2, borderRadius: '16px', border: `1px solid ${LINE}`, bgcolor: 'rgba(14,17,22,0.02)' }}>
                    <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mb: 2 }}>
                      <ScoreRing score={contentScore.overall} />
                      <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={1}>
                        <Box>
                          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase' }}>Term coverage</Typography>
                          <Typography sx={{ fontSize: 18, fontWeight: 800, color: INK }}>{Math.round(contentScore.term_coverage)}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase' }}>Readability</Typography>
                          <Typography sx={{ fontSize: 18, fontWeight: 800, color: INK }}>{Math.round(contentScore.readability)}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase' }}>Words</Typography>
                          <Typography sx={{ fontSize: 18, fontWeight: 800, color: INK }}>
                            {contentScore.word_count}
                            <Box component="span" sx={{ fontSize: 12, color: SUBTLE, fontWeight: 600 }}> / {contentScore.target_word_count}</Box>
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>

                    {contentScore.term_scores && contentScore.term_scores.length > 0 && (
                      <Box sx={{ mb: contentScore.gaps?.length ? 2 : 0 }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', mb: 1 }}>Term checklist</Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                          {contentScore.term_scores.map((ts, i) => {
                            const present = ts.present ?? ((ts.score ?? 0) > 0 || (ts.count ?? 0) > 0);
                            return (
                              <Chip
                                key={i}
                                icon={present ? <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> : undefined}
                                label={ts.term}
                                size="small"
                                sx={{
                                  height: 24,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  bgcolor: present ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                                  color: present ? BRAND.tealDeep : SUBTLE,
                                  '& .MuiChip-icon': { color: BRAND.tealDeep },
                                }}
                              />
                            );
                          })}
                        </Stack>
                      </Box>
                    )}

                    {contentScore.gaps && contentScore.gaps.length > 0 && (
                      <Box>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', mb: 1 }}>Gaps to address</Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                          {contentScore.gaps.map((g, i) => (
                            <Chip key={i} label={g} size="small" sx={{ height: 24, fontSize: 11.5, fontWeight: 700, bgcolor: BRAND.pinkSoft, color: BRAND.pink }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )}
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

      <PremiumDialog open={linkGraphOpen} onClose={() => setLinkGraphOpen(false)} maxWidth="xs">
        <DialogHero icon={<LanguageRoundedIcon />} title="Analyze internal links" subtitle="Crawl your site to map internal link structure" onClose={() => setLinkGraphOpen(false)} tint={BRAND.tealDeep} tintSoft={BRAND.tealSoft} />
        <DialogBody>
          <SectionLabel>Site URL</SectionLabel>
          <TextField label="Base URL" placeholder="https://example.com" value={linkGraphUrl} onChange={(e) => setLinkGraphUrl(e.target.value)} fullWidth size="small" autoFocus />
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setLinkGraphOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={runLinkGraph} disabled={saving || !linkGraphUrl.trim()} sx={inkPillSx}>{saving ? 'Starting…' : 'Analyze'}</Button>
        </DialogFooter>
      </PremiumDialog>

      <PremiumDialog open={csvUploadOpen} onClose={() => setCsvUploadOpen(false)} maxWidth="sm">
        <DialogHero icon={<ArticleRoundedIcon />} title="Upload backlinks CSV" subtitle="Import links from a Google Search Console export" onClose={() => setCsvUploadOpen(false)} />
        <DialogBody>
          <SectionLabel>Paste CSV content</SectionLabel>
          <Typography sx={{ fontSize: 12, color: SUBTLE, mb: 1 }}>Expected columns: Source page, Target page, Anchor text, Date first seen (or similar GSC format)</Typography>
          <TextField value={csvText} onChange={(e) => setCsvText(e.target.value)} fullWidth size="small" multiline minRows={8} placeholder={'Source page,Target page,Anchor text\nhttps://blog.example.com/post,https://yoursite.com/page,anchor text'} />
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setCsvUploadOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={uploadCsv} disabled={csvUploading || !csvText.trim()} sx={inkPillSx}>{csvUploading ? 'Uploading…' : 'Upload'}</Button>
        </DialogFooter>
      </PremiumDialog>

      <PremiumDialog open={trackAllOpen} onClose={() => setTrackAllOpen(false)} maxWidth="xs">
        <DialogHero icon={<TrendingUpRoundedIcon />} title="Check all tracked keywords" subtitle="Run a SERP position check for every tracked keyword at once" onClose={() => setTrackAllOpen(false)} tint={BRAND.tealDeep} tintSoft={BRAND.tealSoft} />
        <DialogBody>
          <SectionLabel>Your domain</SectionLabel>
          <TextField label="Domain" placeholder="yourdomain.com" value={trackAllDomain} onChange={(e) => setTrackAllDomain(e.target.value)} fullWidth size="small" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') runTrackAll(); }} />
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setTrackAllOpen(false)} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={runTrackAll} disabled={trackingAll || !trackAllDomain.trim()} sx={inkPillSx}>{trackingAll ? 'Checking…' : 'Check all'}</Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Snackbar
        open={!!agentToast}
        autoHideDuration={3600}
        onClose={() => setAgentToast(null)}
        message={agentToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
