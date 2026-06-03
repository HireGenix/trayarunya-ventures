'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box, Chip, CircularProgress, Grid, IconButton,
  MenuItem, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FilterListIcon from '@mui/icons-material/FilterList';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import { useAuth } from '@/lib/auth';
import { Insights, Research, type Insight, type ResearchJob } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';

/* ─── design tokens (light) ─── */
const INK      = '#11151B';
const SUBTLE   = '#6B7280';
const LINE     = '#EAECEF';
const CANVAS   = '#FAFBFC';
const WHITE    = '#FFFFFF';
const PANEL    = '#FFFFFF';

const INTENT_COLOR: Record<string, string> = {
  informational: '#3B82F6',
  commercial:    BRAND.teal,
  navigational:  '#8B5CF6',
  transactional: BRAND.amberDeep,
};
const CLUSTER_HUE = [
  '#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6',
  '#ef4444','#06b6d4','#84cc16','#f97316','#3b82f6',
  '#d946ef','#10b981','#eab308',
];
const QWORDS = ['what','why','how','when','where','which','who','can','are','will','should','is','do'];

type Cluster = { key: string; label: string; color: string; items: Insight[] };

function buildClusters(items: Insight[]): Cluster[] {
  const map = new Map<string, { key: string; label: string; items: Insight[] }>();
  for (const it of items) {
    let key: string, label: string;
    const isQ = it.kind === 'question' || /\?\s*$/.test(it.text);
    if (isQ) {
      const first = it.text.trim().toLowerCase().split(/\s+/)[0];
      if (QWORDS.includes(first)) { key = `q:${first}`; label = first; }
      else { key = 'q:other'; label = 'questions'; }
    } else { key = `k:${it.kind}`; label = it.kind; }
    if (!map.has(key)) map.set(key, { key, label, items: [] });
    map.get(key)!.items.push(it);
  }
  return Array.from(map.values())
    .sort((a, b) => b.items.length - a.items.length)
    .map((c, i) => ({ ...c, color: CLUSTER_HUE[i % CLUSTER_HUE.length] }));
}

/* ─────────── Force node type ─────────── */
type FNode = {
  id: string; text: string; score: number; intent: string | null; kind: string;
  cluster: string; clusterColor: string;
  x: number; y: number; vx: number; vy: number;
  targetX: number; targetY: number;
};

/* ─────────── Force Topology (Canvas) ─────────── */
function ForceTopology({
  clusters, activeCluster, onClusterClick, width, height,
}: {
  clusters: Cluster[]; activeCluster: string | null;
  onClusterClick: (key: string | null) => void;
  width: number; height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef  = useRef<FNode[]>([]);
  const rafRef    = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<FNode | null>(null);
  const mouseRef = useRef({ x: -999, y: -999 });

  useEffect(() => {
    if (!width || !height) return;
    const cx = width / 2, cy = height / 2;
    const N = clusters.length || 1;
    const clusterCenters: Record<string, { x: number; y: number }> = {};
    clusters.forEach((c, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / N;
      const r = Math.min(cx, cy) * (N === 1 ? 0 : 0.42);
      clusterCenters[c.key] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });

    nodesRef.current = clusters.flatMap((c) =>
      c.items.map((it, k) => {
        const center = clusterCenters[c.key] ?? { x: cx, y: cy };
        const spread = 20 + Math.min(c.items.length, 14) * 4;
        const angle  = (2 * Math.PI * k) / c.items.length;
        const ex = nodesRef.current.find((n) => n.id === it.id);
        return {
          id: it.id, text: it.text, score: it.score, intent: it.intent, kind: it.kind,
          cluster: c.key, clusterColor: c.color,
          x: ex?.x ?? cx + (Math.random() - 0.5) * 200,
          y: ex?.y ?? cy + (Math.random() - 0.5) * 200,
          vx: ex?.vx ?? 0, vy: ex?.vy ?? 0,
          targetX: center.x + spread * Math.cos(angle),
          targetY: center.y + spread * Math.sin(angle),
        };
      })
    );
  }, [clusters, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function tick() {
      if (!canvas || !ctx) return;
      const nodes = nodesRef.current;
      const { x: mx, y: my } = mouseRef.current;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.vx += (n.targetX - n.x) * 0.018;
        n.vy += (n.targetY - n.y) * 0.018;
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x, dy = n.y - m.y;
          const d2 = dx * dx + dy * dy + 1;
          if (d2 < 3600) {
            const f = 120 / d2;
            n.vx += dx * f; n.vy += dy * f;
            m.vx -= dx * f; m.vy -= dy * f;
          }
        }
        const mdx = n.x - mx, mdy = n.y - my;
        const md2 = mdx * mdx + mdy * mdy + 1;
        if (md2 < 8000) { const f = 500 / md2; n.vx += mdx * f; n.vy += mdy * f; }
        n.vx *= 0.78; n.vy *= 0.78;
        n.x = Math.max(14, Math.min(canvas.width - 14, n.x + n.vx));
        n.y = Math.max(14, Math.min(canvas.height - 14, n.y + n.vy));
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].cluster !== nodes[j].cluster) continue;
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 120) continue;
          const alpha = (1 - d / 120) * 0.22;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = nodes[i].clusterColor + Math.round(alpha * 255).toString(16).padStart(2,'0');
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // nodes
      for (const n of nodes) {
        const isActive = !activeCluster || activeCluster === n.cluster;
        const r = 5 + n.score * 8;
        const hov = Math.hypot(n.x - mx, n.y - my) < r + 5;

        ctx.save();
        ctx.globalAlpha = isActive ? 1 : 0.15;

        // shadow glow
        if (isActive) {
          ctx.shadowColor = n.clusterColor;
          ctx.shadowBlur  = hov ? 14 : 6;
        }

        // fill
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.clusterColor + (hov ? 'ee' : 'bb');
        ctx.fill();

        // stroke ring
        ctx.shadowBlur = 0;
        ctx.strokeStyle = hov ? n.clusterColor : `${n.clusterColor}44`;
        ctx.lineWidth = hov ? 2 : 1;
        ctx.stroke();

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCluster]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const found = nodesRef.current.find((n) => Math.hypot(n.x - mouseRef.current.x, n.y - mouseRef.current.y) < 5 + n.score * 8 + 5) || null;
    setHoveredNode(found);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = nodesRef.current.find((n) => Math.hypot(n.x - mx, n.y - my) < 5 + n.score * 8 + 5);
    onClusterClick(hit ? (activeCluster === hit.cluster ? null : hit.cluster) : null);
  }, [activeCluster, onClusterClick]);

  // cluster label positions (centroid)
  const clusterLabels = useMemo(() => {
    const map = new Map<string, { x: number; y: number; count: number; color: string; label: string }>();
    for (const n of nodesRef.current) {
      const e = map.get(n.cluster);
      if (!e) map.set(n.cluster, { x: n.x, y: n.y, count: 1, color: n.clusterColor, label: n.cluster.replace(/^[qk]:/,'') });
      else { e.x += n.x; e.y += n.y; e.count++; }
    }
    return Array.from(map.values()).map((e) => ({ ...e, x: e.x/e.count, y: e.y/e.count }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters]);

  return (
    <Box sx={{ position: 'relative', width, height }}>
      <canvas ref={canvasRef} width={width} height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { mouseRef.current = { x: -999, y: -999 }; setHoveredNode(null); }}
        onClick={handleClick}
        style={{ display: 'block', cursor: hoveredNode ? 'pointer' : 'default' }} />

      {/* cluster labels */}
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={width} height={height}>
        {clusterLabels.map((cl) => (
          <g key={cl.label}>
            <rect x={cl.x - 30} y={cl.y - 10} width={60} height={20} rx={10}
              fill={`${cl.color}18`} stroke={`${cl.color}55`} strokeWidth={1} />
            <text x={cl.x} y={cl.y + 4} textAnchor="middle" fontSize={10} fontWeight={800}
              fill={cl.color} style={{ textTransform: 'capitalize', letterSpacing: 0.3 }}>
              {cl.label.length > 12 ? cl.label.slice(0,11) + '…' : cl.label}
            </text>
          </g>
        ))}
      </svg>

      {hoveredNode && (
        <Box sx={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          bgcolor: WHITE, border: `1px solid ${LINE}`,
          borderLeft: `3px solid ${hoveredNode.clusterColor}`,
          borderRadius: 2.5, px: 2, py: 1.2, maxWidth: 300, pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
        }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.4 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: hoveredNode.clusterColor }} />
            <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'capitalize', color: hoveredNode.clusterColor }}>
              {hoveredNode.cluster.replace(/^[qk]:/,'')}
            </Typography>
            <Typography sx={{ fontSize: 10, color: SUBTLE, ml: 'auto !important', fontWeight: 700 }}>
              {Math.round(hoveredNode.score * 100)}%
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 12, color: INK, lineHeight: 1.5 }}>
            {hoveredNode.text.length > 90 ? hoveredNode.text.slice(0,89) + '…' : hoveredNode.text}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/* ─────────── Score Ring ─────────── */
function Ring({ v, size, color }: { v: number; size: number; color: string }) {
  const r  = (size - 5) / 2;
  const C  = 2 * Math.PI * r;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}22`} strokeWidth={2.5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={2.5}
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, v))} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <Typography sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size > 42 ? 11 : 9, fontWeight: 900, color, lineHeight: 1 }}>
        {Math.round(v * 100)}
      </Typography>
    </Box>
  );
}

/* ─────────── Signal Feed ─────────── */
function SignalFeed({ items, onDelete }: { items: Insight[]; onDelete: (id: string) => void }) {
  const sorted = [...items].sort((a, b) => b.score - a.score).slice(0, 22);
  return (
    <Box sx={{ overflowY: 'auto', height: '100%',
      '&::-webkit-scrollbar': { width: 4 },
      '&::-webkit-scrollbar-thumb': { bgcolor: LINE, borderRadius: 2 },
    }}>
      {sorted.map((ins, idx) => {
        const color = (ins.intent && INTENT_COLOR[ins.intent]) || '#94a3b8';
        return (
          <Box key={ins.id} sx={{
            px: 2, py: 1.4, borderBottom: `1px solid ${LINE}`,
            transition: 'background .12s',
            '&:hover': { bgcolor: CANVAS, '& .del': { opacity: 1 } },
            animation: `slideIn .25s ease ${idx * 0.02}s both`,
          }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Typography sx={{ fontSize: 10, fontWeight: 900, color: LINE, mt: 0.2, minWidth: 18, textAlign: 'right', userSelect: 'none' }}>
                {String(idx + 1).padStart(2,'0')}
              </Typography>
              <Box sx={{ mt: 0.9, width: 3, minHeight: 28, borderRadius: 2, bgcolor: color, opacity: 0.55 + ins.score * 0.45, alignSelf: 'stretch' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, color: INK, lineHeight: 1.45, fontWeight: 500 }}>
                  {ins.text.length > 85 ? ins.text.slice(0,84) + '…' : ins.text}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.6 }}>
                  {ins.intent && (
                    <Box sx={{ px: 0.9, py: 0.1, borderRadius: 1, bgcolor: `${color}14`, border: `1px solid ${color}28` }}>
                      <Typography sx={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6, color }}>
                        {ins.intent}
                      </Typography>
                    </Box>
                  )}
                  <Typography sx={{ fontSize: 10, color: SUBTLE, fontWeight: 700 }}>
                    {(ins.score * 100).toFixed(0)}%
                  </Typography>
                </Stack>
              </Box>
              <IconButton size="small" className="del" onClick={() => onDelete(ins.id)}
                sx={{ opacity: 0, transition: 'opacity .12s', color: SUBTLE,
                  '&:hover': { color: '#ef4444', bgcolor: '#fef2f2' } }}
                aria-label="delete">
                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}

/* ─────────── Insight Card ─────────── */
function InsightCard({ ins, onDelete }: { ins: Insight; onDelete: () => void }) {
  const color  = (ins.intent && INTENT_COLOR[ins.intent]) || '#94a3b8';
  const isHigh = ins.score >= 0.7;
  return (
    <Box sx={{
      p: 2.2, borderRadius: 3, bgcolor: WHITE, position: 'relative',
      border: `1px solid ${LINE}`, borderLeft: `3px solid ${color}`,
      transition: 'all .18s',
      '&:hover': {
        boxShadow: `0 6px 28px ${color}18`,
        transform: 'translateY(-2px)',
        '& .del-btn': { opacity: 1 },
      },
    }}>
      {isHigh && (
        <Box sx={{ position: 'absolute', top: 10, right: 10,
          px: 0.9, py: 0.2, borderRadius: 1,
          bgcolor: `${BRAND.amber}20`, border: `1px solid ${BRAND.amber}40` }}>
          <Typography sx={{ fontSize: 8.5, fontWeight: 900, color: BRAND.amberDeep, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            priority
          </Typography>
        </Box>
      )}

      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Ring v={ins.score} size={38} color={color} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {ins.intent && (
            <Box sx={{ display: 'inline-flex', mb: 0.6, px: 1, py: 0.15, borderRadius: 1,
              bgcolor: `${color}12`, border: `1px solid ${color}28` }}>
              <Typography sx={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, color }}>
                {ins.intent}
              </Typography>
            </Box>
          )}
          <Typography sx={{ fontSize: 13, color: INK, lineHeight: 1.5, fontWeight: 500 }}>
            {ins.text}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box sx={{ px: 0.9, py: 0.2, borderRadius: 1, bgcolor: CANVAS }}>
          <Typography sx={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: SUBTLE }}>
            {ins.kind}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onDelete} className="del-btn"
          sx={{ opacity: 0, transition: 'opacity .15s', color: SUBTLE,
            '&:hover': { color: '#ef4444', bgcolor: '#fef2f2' } }}
          aria-label="delete insight">
          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════ */
export default function InsightsPage() {
  const { activeWorkspace } = useAuth();
  const [jobs, setJobs]               = useState<ResearchJob[]>([]);
  const [jobId, setJobId]             = useState('');
  const [items, setItems]             = useState<Insight[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loading, setLoading]         = useState(false);
  const [q, setQ]                     = useState('');
  const [intentFilter, setIntentFilter] = useState('');
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize]     = useState({ w: 700, h: 460 });
  const confirm = useConfirm();

  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setGraphSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoadingJobs(true);
    Research.list()
      .then((list) => { setJobs(list); setJobId((p) => p || list[0]?.id || ''); })
      .catch(() => setJobs([]))
      .finally(() => setLoadingJobs(false));
  }, [activeWorkspace]);

  useEffect(() => {
    if (!jobId) { setItems([]); return; }
    setLoading(true); setActiveCluster(null);
    Research.insights(jobId).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [jobId]);

  const handleDelete = useCallback(async (ins: Insight) => {
    const ok = await confirm({ title: 'Delete insight?', message: (<>Remove <b>"{ins.text.slice(0,70)}…"</b>?</>) });
    if (!ok) return;
    const prev = items;
    setItems((l) => l.filter((x) => x.id !== ins.id));
    try { await Insights.remove(ins.id); } catch { setItems(prev); }
  }, [confirm, items]);

  const selectedJob = jobs.find((j) => j.id === jobId) || null;
  const intents     = useMemo(() => Array.from(new Set(items.map((i) => i.intent).filter(Boolean))) as string[], [items]);
  const clusters    = useMemo(() => buildClusters(items), [items]);

  const filtered = useMemo(() => items.filter((i) => {
    if (intentFilter && i.intent !== intentFilter) return false;
    if (q && !i.text.toLowerCase().includes(q.toLowerCase())) return false;
    if (activeCluster) {
      const c = clusters.find((cl) => cl.key === activeCluster);
      if (c && !c.items.some((it) => it.id === i.id)) return false;
    }
    return true;
  }), [items, intentFilter, q, activeCluster, clusters]);

  const avgScore   = items.length ? items.reduce((s, i) => s + i.score, 0) / items.length : 0;
  const highCount  = items.filter((i) => i.score >= 0.7).length;
  const topCluster = clusters[0];
  const topIntent  = (() => {
    const cnt: Record<string,number> = {};
    items.forEach((i) => { if (i.intent) cnt[i.intent] = (cnt[i.intent] || 0) + 1; });
    return Object.entries(cnt).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
  })();

  /* ── render ── */
  return (
    <Box>
      {/* ══ PAGE HEADER ══ */}
      <Box sx={{
        mb: 3, pb: 2.5, borderBottom: `1px solid ${LINE}`,
        display: 'flex', flexDirection: { xs: 'column', md: 'row' },
        gap: 2, alignItems: { md: 'center' }, justifyContent: 'space-between',
      }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: 2,
              background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.amberDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AutoAwesomeIcon sx={{ fontSize: 17, color: WHITE }} />
            </Box>
            <Typography variant="h5" fontWeight={950} sx={{ color: INK, letterSpacing: -0.5 }}>
              Intelligence Insights
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13, color: SUBTLE }}>
            {selectedJob ? `Research: ${selectedJob.topic}` : 'Select a research job to explore insights'}
          </Typography>
        </Box>

        {/* Controls */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
          <TextField select value={jobId} onChange={(e) => setJobId(e.target.value)} size="small"
            disabled={loadingJobs || jobs.length === 0}
            sx={{ minWidth: 210 }}>
            <MenuItem value="" disabled>Select research…</MenuItem>
            {jobs.map((j) => <MenuItem key={j.id} value={j.id} sx={{ fontSize: 13 }}>{j.topic}</MenuItem>)}
          </TextField>
          <TextField size="small" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 0.5, fontSize: 17, color: SUBTLE }} /> }}
            sx={{ minWidth: 180 }} />
          <TextField select value={intentFilter} onChange={(e) => setIntentFilter(e.target.value)} size="small"
            InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 0.5, fontSize: 17, color: SUBTLE }} /> }}
            sx={{ minWidth: 150 }}>
            <MenuItem value="">All intents</MenuItem>
            {intents.map((it) => <MenuItem key={it} value={it} sx={{ textTransform: 'capitalize', fontSize: 13 }}>{it}</MenuItem>)}
          </TextField>
        </Stack>
      </Box>

      {loadingJobs || loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 360 }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : !jobId || items.length === 0 ? (
        <Box sx={{ p: 8, textAlign: 'center', bgcolor: WHITE, borderRadius: 4, border: `1px dashed ${LINE}` }}>
          <PsychologyAltIcon sx={{ fontSize: 52, color: LINE, mb: 2 }} />
          <Typography variant="h6" fontWeight={900} sx={{ color: SUBTLE }}>
            {!jobId ? 'Select a research job to begin' : 'No insights found'}
          </Typography>
          <Typography sx={{ color: '#9CA3AF', mt: 1, fontSize: 13 }}>
            {!jobId ? 'Choose a research from the dropdown above.' : 'Run deep research to generate intelligence signals.'}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={3}>
          {/* ── STAT ROW ── */}
          <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 0.5 }}>
            {[
              { value: items.length, label: 'Total signals', sub: `${clusters.length} clusters`, color: '#6366f1' },
              { value: `${(avgScore * 100).toFixed(0)}%`, label: 'Avg relevance', sub: `${highCount} high-value`, color: BRAND.teal },
              { value: topIntent || '—', label: 'Dominant intent', sub: 'audience signal', color: BRAND.amberDeep, cap: true },
              { value: topCluster?.label || '—', label: 'Lead cluster', sub: `${topCluster?.items.length ?? 0} signals`, color: '#ec4899', cap: true },
            ].map((s) => (
              <Box key={s.label} sx={{
                flexShrink: 0, px: 2.5, py: 1.8, borderRadius: 3, minWidth: 150,
                bgcolor: WHITE, border: `1px solid ${LINE}`, borderTop: `3px solid ${s.color}`,
              }}>
                <Typography sx={{ fontSize: String(s.value).length > 8 ? 17 : 26, fontWeight: 950, color: INK,
                  textTransform: s.cap ? 'capitalize' : 'none', lineHeight: 1.15 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: s.color }}>
                  {s.label}
                </Typography>
                <Typography sx={{ fontSize: 11, color: SUBTLE }}>{s.sub}</Typography>
              </Box>
            ))}
          </Stack>

          {/* ── CLUSTER CHIPS ── */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label="All" size="small" onClick={() => setActiveCluster(null)}
              color={!activeCluster ? 'secondary' : 'default'}
              variant={!activeCluster ? 'filled' : 'outlined'}
              sx={{ fontWeight: 800, fontSize: 11 }} />
            {clusters.map((c) => (
              <Chip key={c.key} label={`${c.label} · ${c.items.length}`} size="small"
                onClick={() => setActiveCluster(activeCluster === c.key ? null : c.key)}
                variant={activeCluster === c.key ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 800, fontSize: 11, textTransform: 'capitalize',
                  borderColor: c.color, color: activeCluster === c.key ? WHITE : c.color,
                  bgcolor: activeCluster === c.key ? c.color : 'transparent',
                  '&:hover': { bgcolor: `${c.color}18` },
                }} />
            ))}
          </Stack>

          {/* ── MAIN SPLIT VIEW ── */}
          <Grid container spacing={2}>
            {/* Force topology */}
            <Grid size={{ xs: 12, lg: 7 }}>
              <Box sx={{
                borderRadius: 4, border: `1px solid ${LINE}`, overflow: 'hidden',
                bgcolor: CANVAS, height: { xs: 340, md: 460 }, position: 'relative',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}>
                {/* mac-style header bar */}
                <Box sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${LINE}`, bgcolor: WHITE,
                  display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Stack direction="row" spacing={0.6}>
                    {['#ef4444','#f59e0b','#22c55e'].map((c) => (
                      <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c, opacity: 0.8 }} />
                    ))}
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: SUBTLE, fontWeight: 700 }}>
                    topology · {filtered.length} signals active
                  </Typography>
                  {activeCluster && (
                    <Chip label={`cluster: ${activeCluster.replace(/^[qk]:/,'')}`} size="small"
                      onDelete={() => setActiveCluster(null)}
                      sx={{ ml: 'auto', fontSize: 10, height: 22, fontWeight: 700,
                        bgcolor: CANVAS, borderColor: LINE,
                      }} />
                  )}
                </Box>
                <Box ref={graphContainerRef} sx={{ height: 'calc(100% - 42px)' }}>
                  {graphSize.w > 0 && (
                    <ForceTopology
                      clusters={clusters}
                      activeCluster={activeCluster}
                      onClusterClick={setActiveCluster}
                      width={graphSize.w}
                      height={graphSize.h}
                    />
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Signal feed */}
            <Grid size={{ xs: 12, lg: 5 }}>
              <Box sx={{
                borderRadius: 4, border: `1px solid ${LINE}`, overflow: 'hidden',
                bgcolor: WHITE, height: { xs: 340, md: 460 }, display: 'flex', flexDirection: 'column',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}>
                <Box sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${LINE}`, bgcolor: WHITE,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 11, color: SUBTLE, fontWeight: 700 }}>
                    top signals · by relevance
                  </Typography>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: BRAND.teal }} />
                    <Typography sx={{ fontSize: 10, color: SUBTLE }}>live</Typography>
                  </Stack>
                </Box>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <SignalFeed items={filtered} onDelete={(id) => {
                    const ins = items.find((i) => i.id === id);
                    if (ins) handleDelete(ins);
                  }} />
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* ── AI INTELLIGENCE BRIEF ── */}
          <Box sx={{
            p: 2.5, borderRadius: 4, bgcolor: WHITE, border: `1px solid ${LINE}`,
            borderLeft: `4px solid ${BRAND.teal}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <PsychologyAltIcon sx={{ fontSize: 20, color: BRAND.teal }} />
              <Typography sx={{ fontWeight: 900, fontSize: 14, color: INK }}>AI intelligence brief</Typography>
              <Typography sx={{ fontSize: 11, color: SUBTLE }}>
                — {items.length} signals · {clusters.length} clusters
              </Typography>
            </Stack>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              {[
                topCluster && `"${topCluster.label}" is the dominant cluster with ${topCluster.items.length} signals`,
                `${highCount} priority signals detected (relevance ≥ 70%)`,
                topIntent && `Dominant intent: ${topIntent} — ${topIntent === 'commercial' ? 'audience is purchase-ready' : topIntent === 'informational' ? 'create educational content to win' : 'diverse intent signals'}`,
                `Average relevance: ${(avgScore * 100).toFixed(0)}/100 — ${avgScore > 0.65 ? 'strong research quality' : 'moderate signal density'}`,
              ].filter(Boolean).map((f, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start" sx={{ flex: '1 1 200px' }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: BRAND.teal, mt: 0.8, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{f}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* ── INSIGHT CARDS ── */}
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: INK }}>
                {activeCluster
                  ? `${clusters.find((c) => c.key === activeCluster)?.label}`
                  : 'All insights'}
              </Typography>
              <Typography sx={{ fontSize: 13, color: SUBTLE }}>· {filtered.length} signals</Typography>
              {activeCluster && (
                <Box sx={{ width: 10, height: 10, borderRadius: '50%',
                  bgcolor: clusters.find((c) => c.key === activeCluster)?.color }} />
              )}
            </Stack>

            {filtered.length === 0 ? (
              <Typography sx={{ color: SUBTLE, py: 4, textAlign: 'center' }}>
                No insights match current filters.
              </Typography>
            ) : (
              <Grid container spacing={1.5}>
                {filtered.map((ins) => (
                  <Grid key={ins.id} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
                    <InsightCard ins={ins} onDelete={() => handleDelete(ins)} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Stack>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </Box>
  );
}
