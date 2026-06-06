'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useAuth } from '@/lib/auth';
import { startAITask, setTaskProgress, finishAITask, dismissAITask } from '@/lib/aiProgress';
import {
  Research,
  Strategies,
  ICPApi,
  type AuditSnapshot,
  type Competitor,
  type ICP,
  type Insight,
  type ReasoningStep,
  type ResearchJob,
  type SocialProfile,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import ProfileAudit from '@/components/ProfileAudit';
import ProfileBenchmark from '@/components/ProfileBenchmark';
import CountryPlatformPicker, { COUNTRIES } from '@/components/CountryPlatformPicker';
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

const STATUS_COLOR: Record<ResearchJob['status'], 'default' | 'info' | 'success' | 'error'> = {
  queued: 'default',
  running: 'info',
  succeeded: 'success',
  failed: 'error',
};

function bnum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  return n.toLocaleString();
}

function erColor(er: number | null | undefined): string {
  if (er === null || er === undefined) return '#9AA4B2';
  if (er >= 3) return BRAND.tealDeep;
  if (er >= 1) return BRAND.teal;
  if (er >= 0.5) return BRAND.amberDeep;
  return BRAND.pink;
}

const PHASE_META: Record<
  string,
  { icon: typeof SearchRoundedIcon; color: string; title: string }
> = {
  plan: { icon: LightbulbRoundedIcon, color: BRAND.amber, title: 'Plan' },
  search: { icon: SearchRoundedIcon, color: BRAND.teal, title: 'Search' },
  crawl: { icon: MenuBookRoundedIcon, color: '#5B8DEF', title: 'Read' },
  synthesize: { icon: AutoAwesomeRoundedIcon, color: BRAND.amberDeep, title: 'Synthesise' },
  reflect: { icon: PsychologyRoundedIcon, color: '#A855F7', title: 'Reflect' },
  verify: { icon: VerifiedRoundedIcon, color: BRAND.tealDeep, title: 'Verify' },
};

function ReasoningTimeline({
  steps,
  live,
}: {
  steps: ReasoningStep[];
  live: boolean;
}) {
  if (!steps.length) return null;
  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 2.2,
        mb: 3,
        background: 'linear-gradient(135deg, #0E141B 0%, #161E2B 55%, #0D1A17 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <PsychologyRoundedIcon sx={{ color: BRAND.amber, fontSize: 18 }} />
        <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>
          Agent reasoning
        </Typography>
        {live && (
          <Chip
            label="LIVE"
            size="small"
            sx={{
              height: 16,
              fontSize: 8.5,
              fontWeight: 800,
              bgcolor: BRAND.pink,
              color: '#fff',
              animation: 'pulse 1.4s ease-in-out infinite',
              '@keyframes pulse': { '50%': { opacity: 0.45 } },
            }}
          />
        )}
      </Stack>
      <Stack spacing={0}>
        {steps.map((s, i) => {
          const meta = PHASE_META[s.phase] || PHASE_META.search;
          const Icon = meta.icon;
          const isLast = i === steps.length - 1;
          const activeNow = live && isLast;
          return (
            <Stack key={i} direction="row" spacing={1.3} sx={{ position: 'relative' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: `${meta.color}22`,
                    border: `1.5px solid ${meta.color}`,
                    flexShrink: 0,
                    ...(activeNow && {
                      animation: 'glow 1.2s ease-in-out infinite',
                      '@keyframes glow': {
                        '50%': { boxShadow: `0 0 0 4px ${meta.color}33` },
                      },
                    }),
                  }}
                >
                  <Icon sx={{ fontSize: 14, color: meta.color }} />
                </Box>
                {!isLast && (
                  <Box sx={{ width: 2, flex: 1, minHeight: 14, background: 'rgba(255,255,255,0.12)', my: 0.3 }} />
                )}
              </Box>
              <Box sx={{ pb: isLast ? 0 : 1.3, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                  {s.label}
                  {typeof s.sources === 'number' && s.sources > 0 && (
                    <Box
                      component="span"
                      sx={{ ml: 0.8, fontSize: 9.5, color: meta.color, fontWeight: 700 }}
                    >
                      · {s.sources} src
                    </Box>
                  )}
                </Typography>
                {s.detail && (
                  <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.35 }}>
                    {s.detail}
                  </Typography>
                )}
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? BRAND.tealDeep : pct >= 50 ? BRAND.amberDeep : BRAND.pink;
  return (
    <Chip
      icon={<VerifiedRoundedIcon sx={{ fontSize: 15, color: `${color} !important` }} />}
      label={`${pct}% confidence`}
      size="small"
      sx={{ bgcolor: `${color}1a`, color, fontWeight: 800, fontSize: 11.5, height: 24 }}
    />
  );
}

type FindingItem = { text: string; citations?: string[]; grounded?: boolean };

function normalizeFinding(v: unknown): FindingItem {
  if (typeof v === 'string') return { text: v };
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return {
      text: String(o.text ?? ''),
      citations: Array.isArray(o.citations) ? (o.citations as string[]) : undefined,
      grounded: Boolean(o.grounded),
    };
  }
  return { text: String(v ?? '') };
}

function BenchmarkTable({ snapshots }: { snapshots: AuditSnapshot[] }) {
  const rows = snapshots
    .map((s) => ({ s, p: s.profile }))
    .filter((r) => r.p && r.p.found);
  if (rows.length === 0) return null;
  const maxFollowers = Math.max(1, ...rows.map((r) => r.p!.followers || 0));
  const totalFollowers = rows.reduce((sum, r) => sum + (r.p!.followers || 0), 0) || 1;
  const erLeader = [...rows].sort(
    (a, b) => (b.p!.engagement_rate || 0) - (a.p!.engagement_rate || 0),
  )[0];

  return (
    <Box
      sx={{
        mb: 3,
        borderRadius: 3,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #11151B 0%, #1B2330 60%, #0E1A18 100%)',
        p: 2.2,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <CompareArrowsRoundedIcon sx={{ color: BRAND.teal, fontSize: 18 }} />
        <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>
          Instagram benchmark — you vs competitors
        </Typography>
      </Stack>
      {erLeader?.p && (
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', mb: 1.5 }}>
          <b style={{ color: '#fff' }}>@{erLeader.p.username}</b> leads on engagement
          {erLeader.p.engagement_rate != null ? ` (${erLeader.p.engagement_rate}%)` : ''}.
        </Typography>
      )}
      <Stack spacing={1}>
        {rows.map(({ s, p }) => {
          const sov = Math.round(((p!.followers || 0) / totalFollowers) * 100);
          return (
            <Box
              key={s.id}
              sx={{
                p: 1.2,
                borderRadius: 2,
                background: s.is_primary ? 'rgba(20,187,135,0.12)' : 'rgba(255,255,255,0.05)',
                border: s.is_primary ? `1px solid ${BRAND.teal}55` : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Avatar src={p!.profile_pic_url || undefined} sx={{ width: 34, height: 34 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }} noWrap>
                      {p!.full_name || `@${p!.username}`}
                    </Typography>
                    {s.is_primary && (
                      <Chip label="YOU" size="small" sx={{ height: 15, fontSize: 8, fontWeight: 800, bgcolor: BRAND.teal, color: '#062019' }} />
                    )}
                    {s.country && (
                      <Chip label={s.country} size="small" sx={{ height: 15, fontSize: 8.5, bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }} />
                    )}
                  </Stack>
                  <Box sx={{ mt: 0.5, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <Box sx={{ width: `${((p!.followers || 0) / maxFollowers) * 100}%`, height: '100%', background: BRAND.gradient }} />
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center', width: 56 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{bnum(p!.followers)}</Typography>
                  <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>followers</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', width: 46 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: erColor(p!.engagement_rate), lineHeight: 1 }}>
                    {p!.engagement_rate != null ? `${p!.engagement_rate}%` : '—'}
                  </Typography>
                  <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>eng.</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', width: 40 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{sov}%</Typography>
                  <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>SoV</Typography>
                </Box>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

const PLATFORM_CHANNEL_MAP: Record<string, string> = {
  linkedin: 'linkedin',
  instagram: 'instagram',
  insta: 'instagram',
  facebook: 'facebook',
  fb: 'facebook',
  x: 'x',
  twitter: 'x',
  youtube: 'youtube',
  yt: 'youtube',
  tiktok: 'tiktok',
  threads: 'threads',
  pinterest: 'pinterest',
  reddit: 'reddit',
};

function mapChannelsToPlatforms(channels: string[]): string[] {
  const out: string[] = [];
  for (const c of channels) {
    const key = String(c).toLowerCase().replace(/[^a-z]/g, '');
    const m = PLATFORM_CHANNEL_MAP[key];
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}

// Map free-text ICP geographies (e.g. "USA", "UK", "Middle East", "Global") onto
// the canonical country options the deep-research picker understands, so the AI's
// ICP region choices auto-populate the research scope.
const GEO_SYNONYMS: Record<string, string> = {
  usa: 'United States',
  us: 'United States',
  america: 'United States',
  unitedstatesofamerica: 'United States',
  uk: 'United Kingdom',
  britain: 'United Kingdom',
  england: 'United Kingdom',
  greatbritain: 'United Kingdom',
  uae: 'United Arab Emirates',
  emirates: 'United Arab Emirates',
  dubai: 'United Arab Emirates',
  abudhabi: 'United Arab Emirates',
  ksa: 'Saudi Arabia',
  saudi: 'Saudi Arabia',
  bharat: 'India',
  global: '🌍 Global',
  worldwide: '🌍 Global',
  international: '🌍 Global',
  anywhere: '🌍 Global',
  everywhere: '🌍 Global',
  sg: 'Singapore',
  nz: 'New Zealand',
  korea: 'South Korea',
};

function mapGeographiesToCountries(geos: string[]): string[] {
  const out: string[] = [];
  for (const g of geos) {
    const raw = String(g).trim();
    if (!raw) continue;
    const key = raw.toLowerCase().replace(/[^a-z]/g, '');
    let match: string | undefined = GEO_SYNONYMS[key];
    if (!match) {
      match = COUNTRIES.find((c) => {
        const ck = c.toLowerCase().replace(/[^a-z]/g, '');
        return ck === key || (key.length >= 3 && (ck.includes(key) || key.includes(ck)));
      });
    }
    if (match && !out.includes(match)) out.push(match);
  }
  return out;
}

type IcpResearchConfig = {
  topic: string;
  url: string;
  countries: string[];
  platforms: string[];
  demographics: string;
  keywords: string[];
};

// Translate a ready ICP into a fully-formed deep-research brief so a single click
// can launch research with the audience, region and platforms the AI already
// inferred — no manual form filling required.
function buildIcpConfig(icp: ICP): IcpResearchConfig {
  const head = [icp.industry, icp.value_prop || icp.offer].filter(Boolean).join(' — ');
  const who = icp.target_customer || (icp.personas && icp.personas[0]) || '';
  const base = [head, who].filter(Boolean).join(' for ') || 'Market & competitor research';
  const topic = `${base} — market, competitor & audience research`.slice(0, 240);
  const demographics = who || (icp.personas && icp.personas[0]) || '';
  return {
    topic,
    url: icp.website || '',
    countries: mapGeographiesToCountries(icp.geographies || []),
    platforms: mapChannelsToPlatforms(icp.channels || []),
    demographics,
    keywords: icp.keywords || [],
  };
}

function ParamChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.9,
        px: 1.3,
        py: 0.75,
        borderRadius: 2,
        maxWidth: 240,
        bgcolor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', color: '#C4B5FD', flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 8.5,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.1,
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.35 }} noWrap>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ResearchPage() {
  const { activeWorkspace } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [topic, setTopic] = useState('');
  const [url, setUrl] = useState('');
  const [selfHandle, setSelfHandle] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(['instagram']);
  const [creating, setCreating] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [icp, setIcp] = useState<ICP | null>(null);
  const prefilledRef = useRef(false);

  const [selected, setSelected] = useState<ResearchJob | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [snapshots, setSnapshots] = useState<AuditSnapshot[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [editJob, setEditJob] = useState<ResearchJob | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [tab, setTab] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  // One-click: fully configure the deep-research brief from the ICP (audience,
  // region, platforms, keywords — all AI-inferred) and launch it immediately.
  // No scrolling, no manual form — the running job streams into the detail panel.
  const launchIcpResearch = async () => {
    if (!icp || icp.status !== 'ready' || launching) return;
    const cfg = buildIcpConfig(icp);
    // Reflect the AI-picked config in the advanced form too, so power users can
    // see exactly what was launched and tweak a re-run.
    setTopic(cfg.topic);
    setUrl(cfg.url);
    setCountries(cfg.countries);
    setPlatforms(cfg.platforms.length ? cfg.platforms : ['instagram']);
    setLaunching(true);
    setError(null);
    try {
      const job = await Research.create({
        topic: cfg.topic,
        target_url: cfg.url || undefined,
        countries: cfg.countries.length ? cfg.countries : undefined,
        platforms: cfg.platforms.length ? cfg.platforms : undefined,
      });
      setJobs((prev) => [job, ...prev]);
      setSelected(job);
      setInsights([]);
      setCompetitors([]);
      setSnapshots([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch research');
    } finally {
      setLaunching(false);
    }
  };

  const handleBuildStrategy = (p: SocialProfile) => {
    const name = p.full_name || (p.username ? `@${p.username}` : 'this profile');
    const niche = p.category ? ` (${p.category})` : '';
    setTopic(`${name}${niche} — Instagram growth, content pillars & engagement strategy`);
    if (p.username) {
      setUrl(`https://www.instagram.com/${p.username}/`);
      setSelfHandle(`@${p.username}`);
    }
    setTab(2);
    setShowAdvanced(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const loadJobs = useCallback(async () => {
    try {
      setJobs(await Research.list());
    } catch {
      setJobs([]);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) loadJobs();
  }, [activeWorkspace, loadJobs]);

  // Load the workspace ICP for the summary card + optional research prefill.
  useEffect(() => {
    if (!activeWorkspace) return;
    ICPApi.get()
      .then((row) => {
        if (!row) return;
        setIcp(row);
        if (prefilledRef.current) return;
        const wantPrefill = searchParams.get('from') === 'icp' || row.status === 'ready';
        if (!wantPrefill) return;
        prefilledRef.current = true;
        const topicBits = [row.industry, row.value_prop || row.offer, row.target_customer]
          .filter(Boolean)
          .join(' — ');
        setTopic((t) => t || (topicBits ? `${topicBits} — market & competitor research` : ''));
        if (row.website) setUrl((u) => u || row.website || '');
        const mapped = mapChannelsToPlatforms(row.channels || []);
        if (mapped.length) setPlatforms((p) => (p.length && p[0] !== 'instagram' ? p : mapped));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  // Poll while any job is queued/running.
  useEffect(() => {
    const active = jobs.some((j) => j.status === 'queued' || j.status === 'running');
    if (active && !pollRef.current) {
      pollRef.current = setInterval(loadJobs, 4000);
    } else if (!active && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobs, loadJobs]);

  // Mirror long-running deep-research jobs into the global AI progress bar with
  // REAL progress derived from each job's live reasoning trace, so the user sees
  // genuine "kitna hua" updates on the deep research that runs server-side.
  const researchTasksRef = useRef<Map<string, string>>(new Map());
  // Jobs the user explicitly cancelled from the progress bar — don't re-mirror
  // them while they linger in an active state during the next poll cycle.
  const cancelledJobsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const REASONING_PCT: Record<string, number> = {
      plan: 12,
      search: 32,
      crawl: 56,
      synthesize: 76,
      reflect: 88,
      verify: 95,
    };
    const map = researchTasksRef.current;
    const cancelled = cancelledJobsRef.current;
    const liveIds = new Set(jobs.map((j) => j.id));

    // Reconcile: drop mirrored tasks whose job has vanished from the list (e.g.
    // it was deleted). Without this, a removed job would leave its progress
    // entry stuck on screen forever (e.g. frozen at 6% "Queued").
    for (const [jobId, taskId] of map) {
      if (!liveIds.has(jobId)) {
        dismissAITask(taskId);
        map.delete(jobId);
        cancelled.delete(jobId);
      }
    }

    for (const job of jobs) {
      const isActive = job.status === 'queued' || job.status === 'running';
      const existing = map.get(job.id);
      if (isActive && cancelled.has(job.id)) {
        // User cancelled this one; skip until the server confirms it's no longer active.
        continue;
      }
      if (isActive) {
        let taskId = existing;
        if (!taskId) {
          taskId = startAITask('research_run', {
            title: `Researching: ${job.topic.slice(0, 42)}${job.topic.length > 42 ? '…' : ''}`,
            manual: true,
            onCancel: () => {
              cancelled.add(job.id);
              map.delete(job.id);
              Research.cancel(job.id)
                .then(() => loadJobs())
                .catch(() => {
                  /* best-effort; UI already cleared */
                });
            },
          });
          map.set(job.id, taskId);
        }
        const steps = job.reasoning || [];
        const last = steps[steps.length - 1];
        const pct = last ? REASONING_PCT[last.phase] ?? 20 : job.status === 'queued' ? 6 : 18;
        const label = last?.label || (job.status === 'queued' ? 'Queued' : 'Researching');
        setTaskProgress(taskId, pct, label);
      } else {
        // Job reached a terminal state — clear any cancel guard and close its task.
        cancelled.delete(job.id);
        if (existing) {
          finishAITask(existing, job.status === 'succeeded');
          map.delete(job.id);
        }
      }
    }
  }, [jobs, loadJobs]);

  // Keep the open detail panel in sync with polled jobs so the live reasoning
  // trace streams in real time; load results the moment a job succeeds.
  useEffect(() => {
    if (!selected) return;
    const fresh = jobs.find((j) => j.id === selected.id);
    if (!fresh) return;
    if (fresh.updated_at !== selected.updated_at || fresh.status !== selected.status) {
      setSelected(fresh);
      if (fresh.status === 'succeeded' && selected.status !== 'succeeded') {
        Promise.all([
          Research.insights(fresh.id).catch(() => []),
          Research.competitors(fresh.id).catch(() => []),
          Research.auditSnapshots(fresh.id).catch(() => []),
        ]).then(([ins, comps, snaps]) => {
          setInsights(ins);
          setCompetitors(comps);
          setSnapshots(snaps);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const job = await Research.create({
        topic,
        target_url: url || undefined,
        countries: countries.length ? countries : undefined,
        platforms: platforms.length ? platforms : undefined,
        self_handle: selfHandle.trim() || undefined,
      });
      setTopic('');
      setUrl('');
      setSelfHandle('');
      setJobs((prev) => [job, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start research');
    } finally {
      setCreating(false);
    }
  };

  const openJob = async (job: ResearchJob) => {
    setSelected(job);
    setInsights([]);
    setCompetitors([]);
    setSnapshots([]);
    if (job.status === 'succeeded') {
      const [ins, comps, snaps] = await Promise.all([
        Research.insights(job.id).catch(() => []),
        Research.competitors(job.id).catch(() => []),
        Research.auditSnapshots(job.id).catch(() => []),
      ]);
      setInsights(ins);
      setCompetitors(comps);
      setSnapshots(snaps);
    }
  };

  const generateStrategy = async () => {
    if (!selected) return;
    setGenLoading(true);
    try {
      const strat = await Strategies.create({ research_job_id: selected.id });
      router.push(`/dashboard/strategy?focus=${strat.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Strategy generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  const deleteJob = async (job: ResearchJob) => {
    const ok = await confirm({
      title: 'Delete research?',
      message: (
        <>
          Delete research <b>“{job.topic}”</b> and all its insights &amp; competitors? This cannot be
          undone.
        </>
      ),
    });
    if (!ok) return;
    try {
      await Research.remove(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      if (selected?.id === job.id) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openEdit = (job: ResearchJob) => {
    setEditJob(job);
    setEditTopic(job.topic);
  };

  const saveEdit = async () => {
    if (!editJob || !editTopic.trim()) return;
    try {
      const updated = await Research.update(editJob.id, { topic: editTopic.trim() });
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      if (selected?.id === updated.id) setSelected(updated);
      setEditJob(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const findings = (selected?.findings || {}) as Record<string, unknown[]>;
  const icpReady = !!(icp && icp.status === 'ready');
  const icpConfig = icpReady ? buildIcpConfig(icp as ICP) : null;

  return (
    <>
    {/* hero header */}
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        p: { xs: 2.5, md: 3.5 },
        mb: 3,
        color: '#fff',
        background: 'linear-gradient(135deg, #11151B 0%, #1B2330 55%, #0E1A18 100%)',
        boxShadow: '0 16px 40px rgba(14,17,22,0.25)',
      }}
    >
      <Box sx={{ position: 'absolute', top: -80, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.30), transparent 65%)' }} />
      <Box sx={{ position: 'absolute', bottom: -90, left: '30%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,175,6,0.22), transparent 65%)' }} />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', background: BRAND.gradient, color: '#062019' }}>
          <TravelExploreRoundedIcon />
        </Box>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, md: 27 }, fontWeight: 900, lineHeight: 1.1, background: BRAND.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Research Intelligence
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
            Audit any profile, benchmark the competition, and turn signal into strategy.
          </Typography>
        </Box>
      </Stack>
    </Box>

    <Tabs
      value={tab}
      onChange={(_, v) => setTab(v)}
      sx={{
        mb: 3,
        minHeight: 0,
        '& .MuiTab-root': { minHeight: 0, py: 1.2, textTransform: 'none', fontWeight: 700, fontSize: 14 },
        '& .MuiTabs-indicator': { height: 3, borderRadius: 3, background: BRAND.gradient },
      }}
    >
      <Tab icon={<PersonSearchRoundedIcon fontSize="small" />} iconPosition="start" label="Profile Audit" />
      <Tab icon={<CompareArrowsRoundedIcon fontSize="small" />} iconPosition="start" label="Competitor Benchmark" />
      <Tab icon={<InsightsRoundedIcon fontSize="small" />} iconPosition="start" label="Deep Research" />
    </Tabs>

    {tab === 0 && (
      <Box sx={{ maxWidth: 560 }}>
        <ProfileAudit onBuildStrategy={handleBuildStrategy} />
      </Box>
    )}

    {tab === 1 && (
      <Box sx={{ maxWidth: 640 }}>
        <ProfileBenchmark onBuildStrategy={handleBuildStrategy} />
      </Box>
    )}

    {tab === 2 && (
    <Box>
      {/* ── ICP-grounded launch console ───────────────────────────── */}
      {icpConfig ? (
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 4,
            p: { xs: 2.5, md: 3 },
            mb: 3,
            color: '#fff',
            background: 'linear-gradient(135deg,#160E24 0%,#1E1430 45%,#0E1A17 100%)',
            border: '1px solid rgba(124,58,237,0.40)',
            boxShadow: '0 18px 46px rgba(76,29,149,0.30)',
          }}
        >
          <Box sx={{ position: 'absolute', top: -90, right: -50, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.42), transparent 65%)' }} />
          <Box sx={{ position: 'absolute', bottom: -100, left: '28%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.22), transparent 65%)' }} />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            sx={{ position: 'relative' }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.75 }}>
                <Box sx={{ width: 30, height: 30, borderRadius: 2, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#7C3AED,#A855F7)' }}>
                  <AutoAwesomeRoundedIcon sx={{ fontSize: 17 }} />
                </Box>
                <Typography sx={{ fontWeight: 800, letterSpacing: 0.5, fontSize: 11.5, textTransform: 'uppercase', color: '#C4B5FD' }}>
                  ICP-grounded mission
                </Typography>
                <Chip
                  size="small"
                  icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 13 }} />}
                  label="AI auto-configured"
                  sx={{ height: 20, fontSize: 10, fontWeight: 700, color: '#fff', bgcolor: 'rgba(124,58,237,0.45)', '& .MuiChip-icon': { color: '#fff' } }}
                />
              </Stack>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 15.5, md: 17.5 }, lineHeight: 1.32, mb: 1 }}>
                {icpConfig.topic}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <ParamChip
                  icon={<PublicRoundedIcon sx={{ fontSize: 17 }} />}
                  label="Region"
                  value={icpConfig.countries.length ? icpConfig.countries.join(', ') : 'Global (auto)'}
                />
                <ParamChip
                  icon={<HubRoundedIcon sx={{ fontSize: 17 }} />}
                  label="Platforms"
                  value={(icpConfig.platforms.length ? icpConfig.platforms : ['instagram']).join(', ')}
                />
                {icpConfig.demographics && (
                  <ParamChip
                    icon={<GroupsRoundedIcon sx={{ fontSize: 17 }} />}
                    label="Audience"
                    value={icpConfig.demographics}
                  />
                )}
                {icpConfig.keywords.length > 0 && (
                  <ParamChip
                    icon={<SellRoundedIcon sx={{ fontSize: 17 }} />}
                    label="Keywords"
                    value={icpConfig.keywords.slice(0, 3).join(', ')}
                  />
                )}
              </Stack>
            </Box>
            <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: { xs: 'stretch', md: 'center' }, gap: 1 }}>
              <Button
                onClick={launchIcpResearch}
                disabled={launching}
                startIcon={launching ? <CircularProgress size={17} sx={{ color: '#fff' }} /> : <RocketLaunchRoundedIcon />}
                sx={{
                  px: 3,
                  py: 1.3,
                  fontWeight: 800,
                  fontSize: 14.5,
                  textTransform: 'none',
                  borderRadius: 2.5,
                  color: '#fff',
                  background: 'linear-gradient(135deg,#7C3AED 0%,#A855F7 100%)',
                  boxShadow: '0 10px 26px rgba(124,58,237,0.45)',
                  '&:hover': { background: 'linear-gradient(135deg,#6D28D9 0%,#9333EA 100%)' },
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.7)', background: 'rgba(124,58,237,0.5)' },
                }}
              >
                {launching ? 'Launching research…' : 'Launch deep research'}
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => router.push('/dashboard/icp')}
                sx={{ color: 'rgba(196,181,253,0.95)', textTransform: 'none', fontSize: 12.5 }}
              >
                Edit ICP →
              </Button>
            </Box>
          </Stack>
          {error && (
            <Alert severity="error" sx={{ mt: 2, position: 'relative' }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            borderRadius: 4,
            p: { xs: 2.5, md: 3 },
            mb: 3,
            border: '1px dashed rgba(124,58,237,0.45)',
            bgcolor: 'rgba(124,58,237,0.04)',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}>
              <AutoAwesomeRoundedIcon />
            </Box>
            <Typography variant="h6" fontWeight={800}>
              Build your ICP to auto-launch research
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 620 }}>
            Define your ideal customer profile once and the Research Center will auto-configure the
            audience, region, platforms and keywords — then launch deep research in a single click.
          </Typography>
          <Button variant="contained" onClick={() => router.push('/dashboard/icp')} startIcon={<AutoAwesomeRoundedIcon />} sx={{ bgcolor: '#7C3AED', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#6D28D9' } }}>
            Set up ICP
          </Button>
        </Box>
      )}

    <Grid container spacing={3}>
      {/* Left: advanced params + research queue */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ mb: 3 }} ref={formRef}>
          <CardActionArea onClick={() => setShowAdvanced((s) => !s)} sx={{ px: 2.5, py: 1.75 }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box sx={{ width: 32, height: 32, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }}>
                <TuneRoundedIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={800} sx={{ fontSize: 15 }}>
                  Custom research run
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {icpConfig ? 'Fine-tune parameters for a manual run' : 'Configure topic, region & platforms manually'}
                </Typography>
              </Box>
              <ExpandMoreRoundedIcon
                sx={{ transition: 'transform .2s', transform: showAdvanced ? 'rotate(180deg)' : 'none', color: 'text.secondary' }}
              />
            </Stack>
          </CardActionArea>
          <Collapse in={showAdvanced || !icpConfig} timeout="auto" unmountOnExit>
            <Divider />
            <CardContent sx={{ p: 3 }}>
              {error && !icpConfig && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              <form onSubmit={onCreate}>
                <Stack spacing={2}>
                  <TextField
                    label="Topic / market"
                    placeholder="B2B SaaS demand gen on LinkedIn"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Brand website (optional)"
                    placeholder="https://yourbrand.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Your Instagram handle (optional)"
                    placeholder="@yourbrand — we'll auto-audit you vs competitors"
                    value={selfHandle}
                    onChange={(e) => setSelfHandle(e.target.value)}
                    fullWidth
                  />
                  <Divider sx={{ my: 0.5 }} />
                  <CountryPlatformPicker
                    countries={countries}
                    platforms={platforms}
                    onCountries={setCountries}
                    onPlatforms={setPlatforms}
                  />
                  <Button type="submit" variant="contained" color="primary" disabled={creating}>
                    {creating ? 'Starting…' : 'Run research'}
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Collapse>
        </Card>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
            RESEARCH QUEUE
          </Typography>
          {jobs.length > 0 && (
            <Chip size="small" label={jobs.length} sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
          )}
        </Stack>
        <Stack spacing={1.5}>
          {jobs.length === 0 && (
            <Typography color="text.secondary">No research yet.</Typography>
          )}
          {jobs.map((job) => (
            <Card key={job.id} variant="outlined">
              <CardActionArea onClick={() => openJob(job)} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={600} sx={{ pr: 1 }}>
                    {job.topic}
                  </Typography>
                  <Chip
                    label={job.status}
                    size="small"
                    color={STATUS_COLOR[job.status]}
                    variant={job.status === 'queued' ? 'outlined' : 'filled'}
                  />
                </Stack>
                {(job.status === 'queued' || job.status === 'running') && (
                  <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />
                )}
              </CardActionArea>
              <Stack
                direction="row"
                justifyContent="flex-end"
                spacing={0.5}
                sx={{ px: 1, pb: 0.5 }}
              >
                <Tooltip title="Rename">
                  <IconButton size="small" onClick={() => openEdit(job)} aria-label="edit">
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => deleteJob(job)} aria-label="delete">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Grid>

      {/* Right: detail */}
      <Grid size={{ xs: 12, md: 7 }}>
        {!selected ? (
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>Select a research job to see findings, insights and competitors.</Typography>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h5" fontWeight={800} sx={{ pr: 2 }}>
                  {selected.topic}
                </Typography>
                <Chip label={selected.status} color={STATUS_COLOR[selected.status]} />
              </Stack>

              {selected.status === 'failed' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {selected.error || 'Research failed.'}
                </Alert>
              )}

              {(selected.status === 'queued' || selected.status === 'running') && (
                <Box sx={{ mt: 3 }}>
                  {selected.reasoning && selected.reasoning.length > 0 ? (
                    <ReasoningTimeline steps={selected.reasoning} live />
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <CircularProgress sx={{ mb: 1 }} />
                      <Typography color="text.secondary">
                        Spinning up the research agents…
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {selected.status === 'succeeded' && (
                <Box sx={{ mt: 2 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
                  >
                    {typeof selected.confidence === 'number' && (
                      <ConfidenceBadge value={selected.confidence} />
                    )}
                    {selected.sources && (
                      <Chip
                        icon={<TravelExploreRoundedIcon sx={{ fontSize: 15 }} />}
                        label={`${selected.sources.length} sources`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11.5, height: 24 }}
                      />
                    )}
                    {selected.reasoning && (
                      <Chip
                        icon={<PsychologyRoundedIcon sx={{ fontSize: 15 }} />}
                        label={`${selected.reasoning.length} reasoning steps`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11.5, height: 24 }}
                      />
                    )}
                  </Stack>

                  {selected.summary && (
                    <Typography sx={{ mb: 3 }} color="text.secondary">
                      {selected.summary}
                    </Typography>
                  )}

                  {selected.reasoning && selected.reasoning.length > 0 && (
                    <ReasoningTimeline steps={selected.reasoning} live={false} />
                  )}

                  {snapshots.length > 0 && <BenchmarkTable snapshots={snapshots} />}

                  {Object.entries(findings).map(([key, values]) =>
                    Array.isArray(values) && values.length ? (
                      <Box key={key} sx={{ mb: 2.5 }}>
                        <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 0.75 }}>
                          {key.replace(/_/g, ' ')}
                        </Typography>
                        <Stack spacing={0.75}>
                          {values.map((raw, i) => {
                            const f = normalizeFinding(raw);
                            if (!f.text) return null;
                            return (
                              <Box
                                key={i}
                                sx={{
                                  p: 1,
                                  borderRadius: 1.5,
                                  bgcolor: 'rgba(20,187,135,0.04)',
                                  border: '1px solid rgba(0,0,0,0.06)',
                                }}
                              >
                                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                                  <Typography sx={{ fontSize: 13, flex: 1 }}>{f.text}</Typography>
                                  {f.grounded && (
                                    <VerifiedRoundedIcon
                                      sx={{ fontSize: 15, color: BRAND.tealDeep, mt: 0.2 }}
                                    />
                                  )}
                                </Stack>
                                {f.citations && f.citations.length > 0 && (
                                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {f.citations.slice(0, 4).map((c, ci) => (
                                      <Chip
                                        key={ci}
                                        component="a"
                                        href={c}
                                        target="_blank"
                                        clickable
                                        icon={<OpenInNewRoundedIcon sx={{ fontSize: 11 }} />}
                                        label={(() => {
                                          try {
                                            return new URL(c).hostname.replace('www.', '');
                                          } catch {
                                            return 'source';
                                          }
                                        })()}
                                        size="small"
                                        sx={{ height: 18, fontSize: 9.5 }}
                                      />
                                    ))}
                                  </Stack>
                                )}
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    ) : null
                  )}

                  {competitors.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Competitors
                      </Typography>
                      {competitors.map((c) => (
                        <Box key={c.id} sx={{ mb: 2 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.3 }}>
                            <Typography fontWeight={700}>{c.name}</Typography>
                            {c.country && (
                              <Chip label={c.country} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                            )}
                          </Stack>
                          {c.positioning && (
                            <Typography variant="body2" color="text.secondary">
                              {c.positioning}
                            </Typography>
                          )}
                          {c.social_handles && Object.keys(c.social_handles).length > 0 && (
                            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {Object.entries(c.social_handles).map(([platform, handle]) => (
                                <Chip
                                  key={platform}
                                  label={`${platform}: ${handle}`}
                                  size="small"
                                  sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(20,187,135,0.1)' }}
                                />
                              ))}
                            </Stack>
                          )}
                        </Box>
                      ))}
                    </>
                  )}

                  {insights.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Audience insights ({insights.length})
                      </Typography>
                      <List dense>
                        {insights.slice(0, 20).map((i) => (
                          <ListItem key={i.id} disableGutters>
                            <ListItemText
                              primary={i.text}
                              secondary={`${i.kind}${i.intent ? ` · ${i.intent}` : ''}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={generateStrategy}
                    disabled={genLoading}
                  >
                    {genLoading ? 'Generating strategy…' : 'Generate strategy from this research'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
    </Box>
    )}

    <PremiumDialog open={!!editJob} onClose={() => setEditJob(null)} maxWidth="sm">
      <DialogHero
        icon={<EditOutlinedIcon />}
        title="Rename research"
        subtitle="Update the topic or market label for this research"
        onClose={() => setEditJob(null)}
      />
      <DialogBody>
        <SectionLabel>Research topic</SectionLabel>
        <TextField
          label="Topic / market"
          value={editTopic}
          onChange={(e) => setEditTopic(e.target.value)}
          fullWidth
          size="small"
          autoFocus
        />
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => setEditJob(null)} sx={ghostPillSx}>
          Cancel
        </Button>
        <Button onClick={saveEdit} disabled={!editTopic.trim()} sx={inkPillSx}>
          Save
        </Button>
      </DialogFooter>
    </PremiumDialog>
    </>
  );
}
