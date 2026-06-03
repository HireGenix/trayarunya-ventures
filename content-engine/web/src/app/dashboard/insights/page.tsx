'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import FilterListIcon from '@mui/icons-material/FilterListOutlined';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import { useAuth } from '@/lib/auth';
import { Insights, Research, type Insight, type ResearchJob } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';

/* ── Constants ── */
const INTENT_COLORS: Record<string, string> = {
  informational: '#2563EB',
  commercial: BRAND.teal,
  navigational: '#7C3AED',
  transactional: BRAND.amberDeep,
};

const QWORDS = ['what','why','how','when','where','which','who','can','are','will','should','is','do'];
const CLUSTER_COLORS = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#84cc16','#f97316','#3b82f6','#d946ef','#10b981','#eab308'];

type Cluster = { key: string; label: string; color: string; items: Insight[] };

function clusterInsights(items: Insight[]): Cluster[] {
  const map = new Map<string, { key: string; label: string; items: Insight[] }>();
  for (const it of items) {
    let key: string;
    let label: string;
    const isQuestion = it.kind === 'question' || /\?\s*$/.test(it.text);
    if (isQuestion) {
      const first = it.text.trim().toLowerCase().split(/\s+/)[0];
      if (QWORDS.includes(first)) { key = `q:${first}`; label = first; }
      else { key = 'q:other'; label = 'questions'; }
    } else { key = `k:${it.kind}`; label = it.kind; }
    if (!map.has(key)) map.set(key, { key, label, items: [] });
    map.get(key)!.items.push(it);
  }
  return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length)
    .map((c, i) => ({ ...c, color: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }));
}

/* ── Bubble Galaxy Visualization ── */
function BubbleGalaxy({ topic, clusters, activeKey, onSelect }: { topic: string; clusters: Cluster[]; activeKey: string | null; onSelect: (key: string | null) => void }) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dims, setDims] = useState({ w: 900, h: 520 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDims({ w: width, h: Math.max(420, Math.min(600, width * 0.55)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const maxItems = Math.max(...clusters.map((c) => c.items.length), 1);
  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const orbitR = Math.min(cx, cy) * 0.55;

  // Exploded cluster: show child insight bubbles around it
  const expandedCluster = clusters.find((c) => c.key === activeKey) || null;

  // Position clusters in orbit
  const N = clusters.length || 1;
  const clusterPositions = clusters.map((c, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / N;
    const jitter = ((i % 3) - 1) * 12;
    return {
      ...c,
      x: cx + (orbitR + jitter) * Math.cos(angle),
      y: cy + (orbitR + jitter) * Math.sin(angle),
      r: 18 + (c.items.length / maxItems) * 32,
      angle,
    };
  });

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 4 }}>
      <Box
        component="svg"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        sx={{
          width: '100%', height: 'auto', display: 'block',
          background: 'linear-gradient(145deg, #0B0F18 0%, #111827 50%, #0D1117 100%)',
          borderRadius: 4,
        }}
      >
        <defs>
          {clusters.map((c) => (
            <radialGradient key={`g-${c.key}`} id={`glow-${c.key.replace(/[^a-z0-9]/gi,'')}`}>
              <stop offset="0%" stopColor={c.color} stopOpacity={0.6} />
              <stop offset="100%" stopColor={c.color} stopOpacity={0} />
            </radialGradient>
          ))}
          <radialGradient id="center-glow">
            <stop offset="0%" stopColor={BRAND.teal} stopOpacity={0.5} />
            <stop offset="100%" stopColor={BRAND.teal} stopOpacity={0} />
          </radialGradient>
          <filter id="blur-sm"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="blur-lg"><feGaussianBlur stdDeviation="8" /></filter>
        </defs>

        {/* Ambient particles */}
        {Array.from({ length: 60 }).map((_, idx) => {
          const px = ((idx * 137.5) % dims.w);
          const py = ((idx * 97.3 + 41) % dims.h);
          const r = 0.6 + (idx % 4) * 0.4;
          return <circle key={`star-${idx}`} cx={px} cy={py} r={r} fill="#fff" opacity={0.08 + (idx % 5) * 0.04}>
            <animate attributeName="opacity" values={`${0.08 + (idx % 5) * 0.04};${0.2 + (idx % 3) * 0.08};${0.08 + (idx % 5) * 0.04}`} dur={`${3 + (idx % 4)}s`} repeatCount="indefinite" />
          </circle>;
        })}

        {/* Orbit ring (subtle) */}
        <circle cx={cx} cy={cy} r={orbitR} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="4,8" />

        {/* Connection lines from center to cluster bubbles */}
        {clusterPositions.map((cp) => {
          const isActive = activeKey === cp.key;
          const isHov = hovered === cp.key;
          const dim = activeKey !== null && !isActive;
          return (
            <line key={`line-${cp.key}`}
              x1={cx} y1={cy} x2={cp.x} y2={cp.y}
              stroke={cp.color}
              strokeWidth={isActive || isHov ? 1.5 : 0.8}
              opacity={dim ? 0.04 : isActive ? 0.5 : 0.12}
              style={{ transition: 'all .4s ease' }}
            />
          );
        })}

        {/* Cluster bubbles */}
        {clusterPositions.map((cp) => {
          const isActive = activeKey === cp.key;
          const isHov = hovered === cp.key;
          const dim = activeKey !== null && !isActive;
          const scale = isActive ? 1.18 : isHov ? 1.08 : 1;
          const bubbleR = cp.r * scale;
          return (
            <g key={cp.key}
              style={{ cursor: 'pointer', transition: 'opacity .4s ease' }}
              opacity={dim ? 0.18 : 1}
              onClick={() => onSelect(isActive ? null : cp.key)}
              onMouseEnter={() => setHovered(cp.key)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Glow halo */}
              <circle cx={cp.x} cy={cp.y} r={bubbleR * 2.4} fill={`url(#glow-${cp.key.replace(/[^a-z0-9]/gi,'')})`} opacity={isActive ? 0.7 : isHov ? 0.5 : 0.2} filter="url(#blur-lg)" style={{ transition: 'all .4s' }} />

              {/* Main bubble */}
              <circle cx={cp.x} cy={cp.y} r={bubbleR} fill={cp.color} opacity={0.82} style={{ transition: 'all .35s ease' }}>
                {isActive && <animate attributeName="opacity" values="0.82;0.92;0.82" dur="2s" repeatCount="indefinite" />}
              </circle>

              {/* Inner bright ring */}
              <circle cx={cp.x} cy={cp.y} r={bubbleR * 0.7} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} style={{ transition: 'all .35s' }} />

              {/* Label */}
              <text x={cp.x} y={cp.y - 3} textAnchor="middle" fontSize={bubbleR > 32 ? 12 : 10} fontWeight={800} fill="#fff" style={{ pointerEvents: 'none', textTransform: 'capitalize' }}>
                {cp.label.length > 12 ? cp.label.slice(0, 11) + '…' : cp.label}
              </text>
              <text x={cp.x} y={cp.y + 12} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.75)" fontWeight={600} style={{ pointerEvents: 'none' }}>
                {cp.items.length}
              </text>
            </g>
          );
        })}

        {/* Exploded child insight bubbles (when cluster is active) */}
        {expandedCluster && (() => {
          const parent = clusterPositions.find((cp) => cp.key === expandedCluster.key);
          if (!parent) return null;
          const children = expandedCluster.items.slice(0, 18);
          const childOrbitR = parent.r * 2.6;
          return children.map((child, ci) => {
            const angle = (2 * Math.PI * ci) / children.length - Math.PI / 2;
            const jitter = ((ci % 3) - 1) * 4;
            const childX = parent.x + (childOrbitR + jitter) * Math.cos(angle);
            const childY = parent.y + (childOrbitR + jitter) * Math.sin(angle);
            const childR = 4 + child.score * 6;
            return (
              <g key={`child-${child.id}`} opacity={0} style={{ animation: `fadeIn .4s ease ${ci * 0.03}s forwards` }}>
                <line x1={parent.x} y1={parent.y} x2={childX} y2={childY} stroke={parent.color} strokeWidth={0.5} opacity={0.25} />
                <circle cx={childX} cy={childY} r={childR * 1.8} fill={parent.color} opacity={0.12} filter="url(#blur-sm)" />
                <circle cx={childX} cy={childY} r={childR} fill={parent.color} opacity={0.9}>
                  <animate attributeName="opacity" values="0.9;1;0.9" dur={`${2 + (ci % 3)}s`} repeatCount="indefinite" />
                </circle>
              </g>
            );
          });
        })()}

        {/* Center hub */}
        <g style={{ cursor: 'pointer' }} onClick={() => onSelect(null)}>
          <circle cx={cx} cy={cy} r={52} fill="url(#center-glow)" filter="url(#blur-lg)" />
          <circle cx={cx} cy={cy} r={34} fill={theme.palette.primary.main} opacity={0.92}>
            <animate attributeName="r" values="34;36;34" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx} cy={cy} r={28} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff" style={{ pointerEvents: 'none' }}>
            {topic.length > 14 ? topic.slice(0, 13) + '…' : topic}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.7)" fontWeight={600} style={{ pointerEvents: 'none' }}>
            galaxy
          </text>
        </g>
      </Box>

      {/* CSS keyframe for child fade-in */}
      <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>

      {/* Hovered / active cluster tooltip overlay */}
      {(hovered || activeKey) && (() => {
        const key = activeKey || hovered;
        const cp = clusterPositions.find((c) => c.key === key);
        if (!cp) return null;
        return (
          <Box sx={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            bgcolor: 'rgba(17,21,27,0.85)', backdropFilter: 'blur(12px)',
            border: `1px solid ${cp.color}44`, borderRadius: 3,
            px: 2.5, py: 1.2, display: 'flex', gap: 2, alignItems: 'center',
            boxShadow: `0 8px 32px ${cp.color}22`,
          }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cp.color, boxShadow: `0 0 8px ${cp.color}` }} />
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'capitalize' }}>{cp.label}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{cp.items.length} insights</Typography>
            {activeKey === cp.key && <Chip label="Click center to reset" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 10, height: 22 }} />}
          </Box>
        );
      })()}
    </Box>
  );
}

/* ── Main Page ── */
export default function InsightsPage() {
  const { activeWorkspace } = useAuth();
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [jobId, setJobId] = useState('');
  const [items, setItems] = useState<Insight[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [intent, setIntent] = useState('');
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const confirm = useConfirm();

  const removeInsight = useCallback(async (ins: Insight) => {
    const ok = await confirm({
      title: 'Delete insight?',
      message: (<>This will permanently remove <b>&quot;{ins.text}&quot;</b> from this research&apos;s explorer.</>),
    });
    if (!ok) return;
    const prev = items;
    setItems((list) => list.filter((x) => x.id !== ins.id));
    try { await Insights.remove(ins.id); } catch { setItems(prev); }
  }, [confirm, items]);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoadingJobs(true);
    Research.list().then((list) => { setJobs(list); setJobId((prev) => prev || list[0]?.id || ''); }).catch(() => setJobs([])).finally(() => setLoadingJobs(false));
  }, [activeWorkspace]);

  useEffect(() => {
    if (!jobId) { setItems([]); return; }
    setLoading(true); setActiveCluster(null);
    Research.insights(jobId).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [jobId]);

  const selectedJob = jobs.find((j) => j.id === jobId) || null;
  const intents = useMemo(() => Array.from(new Set(items.map((i) => i.intent).filter(Boolean))) as string[], [items]);
  const clusters = useMemo(() => clusterInsights(items), [items]);

  const filtered = items.filter((i) => {
    if (intent && i.intent !== intent) return false;
    if (q && !i.text.toLowerCase().includes(q.toLowerCase())) return false;
    if (activeCluster) { const c = clusters.find((cl) => cl.key === activeCluster); if (c && !c.items.some((it) => it.id === i.id)) return false; }
    return true;
  });

  const grouped = useMemo(() => {
    const g: Record<string, Insight[]> = {};
    for (const it of filtered) (g[it.kind] ||= []).push(it);
    return g;
  }, [filtered]);

  const activeLabel = clusters.find((c) => c.key === activeCluster)?.label;
  const questionCount = items.filter((i) => i.kind === 'question' || /\?\s*$/.test(i.text)).length;

  return (
    <Stack spacing={3}>
      {/* ── Cinematic hero ── */}
      <Box
        sx={{
          p: { xs: 3, md: 4 }, borderRadius: 5, color: '#fff', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(125deg, #11151B 0%, #1B2330 56%, #0E1A18 100%)',
          boxShadow: '0 24px 70px rgba(17,21,27,0.18)',
        }}
      >
        <Box sx={{ position: 'absolute', top: -100, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,175,6,0.34), transparent 65%)', filter: 'blur(8px)' }} />
        <Box sx={{ position: 'absolute', bottom: -120, left: '28%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.30), transparent 65%)', filter: 'blur(10px)' }} />
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3} sx={{ position: 'relative' }}>
          <Box maxWidth={700}>
            <Chip icon={<BoltIcon />} label="Insight intelligence galaxy" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Every question your audience is asking — mapped.
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 620 }}>
              Explore the insight galaxy — click any cluster bubble to explode it into individual insights mined from deep research.
            </Typography>
          </Box>
          <Grid container spacing={1} sx={{ minWidth: { md: 280 }, maxWidth: 320 }}>
            <Grid size={4}>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{items.length}</Typography>
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase' }}>Insights</Typography>
              </Box>
            </Grid>
            <Grid size={4}>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{questionCount}</Typography>
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase' }}>Questions</Typography>
              </Box>
            </Grid>
            <Grid size={4}>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{clusters.length}</Typography>
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase' }}>Clusters</Typography>
              </Box>
            </Grid>
          </Grid>
        </Stack>
      </Box>

      {/* ── Filters card ── */}
      <Card sx={{ borderRadius: 4, border: '1px solid rgba(17,21,27,0.08)', boxShadow: '0 18px 45px rgba(17,21,27,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <FilterListIcon sx={{ color: BRAND.teal }} />
            <Typography fontWeight={900}>Filter & scope</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select label="Client / Research" value={jobId} onChange={(e) => setJobId(e.target.value)} fullWidth
              disabled={loadingJobs || jobs.length === 0}
              helperText={!loadingJobs && jobs.length === 0 ? 'No research yet — run a research job first.' : selectedJob?.target_url || ' '}>
              {jobs.map((j) => <MenuItem key={j.id} value={j.id}>{j.topic}</MenuItem>)}
            </TextField>
            <TextField label="Search insights" value={q} onChange={(e) => setQ(e.target.value)} fullWidth
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.disabled' }} /> }} />
            <TextField select label="Intent" value={intent} onChange={(e) => setIntent(e.target.value)} sx={{ minWidth: 200 }}>
              <MenuItem value="">All intents</MenuItem>
              {intents.map((it) => <MenuItem key={it} value={it}>{it}</MenuItem>)}
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {loadingJobs || loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}><CircularProgress /></Box>
      ) : !jobId ? (
        <Card sx={{ borderRadius: 4, p: 4, textAlign: 'center', border: '1px dashed rgba(17,21,27,0.18)' }}>
          <BubbleChartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" fontWeight={900}>Select a research to explore</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.6 }}>Pick a client or research job above to launch the insight galaxy.</Typography>
        </Card>
      ) : items.length === 0 ? (
        <Card sx={{ borderRadius: 4, p: 4, textAlign: 'center', border: '1px dashed rgba(17,21,27,0.18)' }}>
          <BubbleChartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" fontWeight={900}>No insights mined yet</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.6 }}>Open this research and run deep research to populate the insight galaxy.</Typography>
        </Card>
      ) : (
        <>
          {/* ── Cluster chips ── */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {clusters.map((c) => (
              <Chip key={c.key} label={`${c.label} · ${c.items.length}`} size="small"
                onClick={() => setActiveCluster(activeCluster === c.key ? null : c.key)}
                variant={activeCluster === c.key ? 'filled' : 'outlined'}
                sx={{
                  borderColor: c.color, fontWeight: 700,
                  color: activeCluster === c.key ? '#fff' : c.color,
                  bgcolor: activeCluster === c.key ? c.color : 'transparent',
                }} />
            ))}
          </Stack>

          {/* ── Bubble Galaxy ── */}
          <Card sx={{ borderRadius: 4, border: '1px solid rgba(17,21,27,0.08)', boxShadow: '0 18px 45px rgba(17,21,27,0.06)', overflow: 'hidden' }}>
            <CardContent sx={{ p: { xs: 0.5, sm: 1.5 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1, px: { xs: 1, sm: 1.5 }, pt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BubbleChartIcon sx={{ color: BRAND.teal }} />
                  <Typography variant="subtitle1" fontWeight={900}>Insight galaxy</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">Click a bubble to expand · click center to reset</Typography>
              </Stack>
              <BubbleGalaxy topic={selectedJob?.topic || 'Research'} clusters={clusters} activeKey={activeCluster} onSelect={setActiveCluster} />
            </CardContent>
          </Card>

          {/* ── Insight cards ── */}
          {activeLabel && (
            <Typography variant="subtitle2" color="text.secondary">
              Showing cluster: <b>{activeLabel}</b> · {filtered.length} insights
            </Typography>
          )}
          {filtered.length === 0 ? (
            <Typography color="text.secondary">No insights match your filters.</Typography>
          ) : (
            Object.entries(grouped).map(([kind, list]) => (
              <Box key={kind}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', fontWeight: 900, letterSpacing: 0.5 }}>
                  {kind} · {list.length}
                </Typography>
                <Grid container spacing={2}>
                  {list.map((i) => (
                    <Grid key={i.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Card sx={{
                        height: '100%', borderRadius: 3, border: '1px solid rgba(17,21,27,0.08)',
                        borderLeft: `4px solid ${(i.intent && INTENT_COLORS[i.intent]) || '#94a3b8'}`,
                        boxShadow: '0 8px 22px rgba(17,21,27,0.05)',
                        transition: 'transform .12s', '&:hover': { transform: 'translateY(-2px)' },
                      }}>
                        <CardContent sx={{ position: 'relative', pr: 5, pb: 2 }}>
                          <Tooltip title="Delete insight">
                            <IconButton size="small" onClick={() => removeInsight(i)} sx={{ position: 'absolute', top: 6, right: 6, color: 'text.disabled' }} aria-label="delete insight">
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Typography sx={{ mb: 1.5, fontWeight: 600, lineHeight: 1.45 }}>{i.text}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            {i.intent && <Chip size="small" label={i.intent} sx={{ bgcolor: `${INTENT_COLORS[i.intent] || '#94a3b8'}18`, color: INTENT_COLORS[i.intent] || '#94a3b8', fontWeight: 800, fontSize: 11 }} />}
                            <Box sx={{ flex: 1, minWidth: 60 }}>
                              <LinearProgress variant="determinate" value={Math.min(100, i.score * 100)}
                                sx={{ height: 5, borderRadius: 99, bgcolor: 'rgba(17,21,27,0.07)',
                                  '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: (i.intent && INTENT_COLORS[i.intent]) || '#94a3b8' } }} />
                            </Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={800}>{i.score.toFixed(2)}</Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))
          )}
        </>
      )}
    </Stack>
  );
}
