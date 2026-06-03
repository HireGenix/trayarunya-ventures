'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '@/lib/auth';
import { Insights, Research, type Insight, type ResearchJob } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';

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

function truncate(s: string, n: number) { return s.length > n ? `${s.slice(0, n - 1)}…` : s; }

function wrapLabel(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length <= maxChars) { cur = candidate; }
    else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? truncate(w, maxChars) : w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    const consumed = lines.join(' ').length;
    if (consumed < text.trim().length) lines[maxLines - 1] = truncate(lines[maxLines - 1], maxChars - 1).replace(/…?$/, '…');
  }
  return lines;
}

function ClusterWheel({ topic, clusters, activeKey, onSelect }: { topic: string; clusters: Cluster[]; activeKey: string | null; onSelect: (key: string | null) => void }) {
  const theme = useTheme();
  const W = 1200; const H = 1200; const cx = W / 2; const cy = H / 2;
  const centerR = 66; const hubR = 210; const leafR = 430;
  const N = Math.max(clusters.length, 1);
  const single = clusters.length === 1;
  return (
    <Box component="svg" viewBox={`0 0 ${W} ${H}`} sx={{ width: '100%', height: 'auto', maxWidth: 980, mx: 'auto', display: 'block', overflow: 'visible' }}>
      {clusters.map((c, i) => {
        const baseAngle = -Math.PI / 2 + (2 * Math.PI * i) / N;
        const hx = cx + hubR * Math.cos(baseAngle);
        const hy = cy + hubR * Math.sin(baseAngle);
        const isActive = activeKey === c.key;
        const dim = activeKey !== null && !isActive;
        const leaves = c.items.slice(0, 12);
        const showLeaves = isActive || single;
        return (
          <g key={c.key} opacity={dim ? 0.15 : 1} style={{ transition: 'opacity .2s' }}>
            <line x1={cx} y1={cy} x2={hx} y2={hy} stroke={c.color} strokeWidth={2.5} opacity={0.55} />
            {showLeaves && leaves.map((leaf, j) => {
              const ang = -Math.PI / 2 + (2 * Math.PI * j) / leaves.length;
              const lx = cx + leafR * Math.cos(ang); const ly = cy + leafR * Math.sin(ang);
              const cosA = Math.cos(ang);
              const anchor = cosA < -0.25 ? 'end' : cosA > 0.25 ? 'start' : 'middle';
              const tx = lx + (anchor === 'end' ? -10 : anchor === 'start' ? 10 : 0);
              const lines = wrapLabel(leaf.text, 24, 3);
              const lh = 16; const startY = ly - ((lines.length - 1) * lh) / 2;
              return (
                <g key={leaf.id}>
                  <line x1={hx} y1={hy} x2={lx} y2={ly} stroke={c.color} strokeWidth={1} opacity={0.35} />
                  <circle cx={lx} cy={ly} r={5} fill={c.color} />
                  <text x={tx} y={startY} textAnchor={anchor} fontSize={14} fill={theme.palette.text.primary}>
                    {lines.map((ln, k) => <tspan key={k} x={tx} dy={k === 0 ? 0 : lh}>{ln}</tspan>)}
                  </text>
                </g>
              );
            })}
            <g style={{ cursor: 'pointer' }} onClick={() => onSelect(isActive ? null : c.key)}>
              <circle cx={hx} cy={hy} r={isActive ? 36 : 32} fill={c.color} stroke={theme.palette.background.paper} strokeWidth={3} />
              <text x={hx} y={hy - 2} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">{truncate(c.label, 10)}</text>
              <text x={hx} y={hy + 13} textAnchor="middle" fontSize={11} fill="#fff" opacity={0.85}>{c.items.length}</text>
            </g>
          </g>
        );
      })}
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect(null)}>
        <circle cx={cx} cy={cy} r={centerR} fill={theme.palette.primary.main} stroke={theme.palette.background.paper} strokeWidth={4} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight={800} fill="#fff"><tspan x={cx}>{truncate(topic, 16)}</tspan></text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="#fff" opacity={0.85}>content clusters</text>
      </g>
    </Box>
  );
}

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

  const removeInsight = async (ins: Insight) => {
    const ok = await confirm({
      title: 'Delete insight?',
      message: (<>This will permanently remove <b>&quot;{ins.text}&quot;</b> from this research&apos;s explorer.</>),
    });
    if (!ok) return;
    const prev = items;
    setItems((list) => list.filter((x) => x.id !== ins.id));
    try { await Insights.remove(ins.id); } catch { setItems(prev); }
  };

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
            <Chip icon={<BoltIcon />} label="Insight intelligence map" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Every question your audience is asking — mapped.
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 620 }}>
              Explore the content cluster web to find buyer questions, topic gaps, and content angles mined from deep research.
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
          <HubIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" fontWeight={900}>Select a research to explore</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.6 }}>Pick a client or research job above to visualise its content cluster web.</Typography>
        </Card>
      ) : items.length === 0 ? (
        <Card sx={{ borderRadius: 4, p: 4, textAlign: 'center', border: '1px dashed rgba(17,21,27,0.18)' }}>
          <HubIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" fontWeight={900}>No insights mined yet</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.6 }}>Open this research and run the deep research job to populate the insight explorer.</Typography>
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

          {/* ── Cluster web ── */}
          <Card sx={{ borderRadius: 4, border: '1px solid rgba(17,21,27,0.08)', boxShadow: '0 18px 45px rgba(17,21,27,0.06)', overflow: 'visible' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <HubIcon sx={{ color: BRAND.teal }} />
                  <Typography variant="subtitle1" fontWeight={900}>Content cluster web</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">Click a cluster to expand · click center to reset</Typography>
              </Stack>
              <ClusterWheel topic={selectedJob?.topic || 'Research'} clusters={clusters} activeKey={activeCluster} onSelect={setActiveCluster} />
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
