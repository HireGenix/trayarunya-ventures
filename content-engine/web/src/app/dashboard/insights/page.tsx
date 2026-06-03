'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box, Chip, CircularProgress, Grid, IconButton,
  MenuItem, Stack, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useAuth } from '@/lib/auth';
import { Insights, Research, type Insight, type ResearchJob } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';

/* ─────────── tokens ─────────── */
const BG       = '#08090D';
const SURFACE  = 'rgba(255,255,255,0.045)';
const BORDER   = 'rgba(255,255,255,0.08)';
const INTENT_COLOR: Record<string, string> = {
  informational: '#3B82F6',
  commercial:    '#14BB87',
  navigational:  '#A78BFA',
  transactional: '#FBBF24',
};
const CLUSTER_HUE = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6',
                     '#ef4444','#06b6d4','#84cc16','#f97316','#3b82f6',
                     '#d946ef','#10b981','#eab308'];
const QWORDS = ['what','why','how','when','where','which','who',
                'can','are','will','should','is','do'];

/* ─────────── types ─────────── */
type Cluster = { key: string; label: string; color: string; items: Insight[] };

/* ─────────── clustering ─────────── */
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

/* ─────────── force graph node type ─────────── */
type FNode = {
  id: string; text: string; score: number; intent: string | null; kind: string;
  cluster: string; clusterColor: string;
  x: number; y: number; vx: number; vy: number;
  targetX: number; targetY: number;
};

/* ─────────── Force Topology Graph ─────────── */
function ForceTopology({
  clusters, activeCluster, onClusterClick, width, height,
}: {
  clusters: Cluster[];
  activeCluster: string | null;
  onClusterClick: (key: string | null) => void;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef  = useRef<FNode[]>([]);
  const rafRef    = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<FNode | null>(null);
  const mouseRef = useRef({ x: -999, y: -999 });

  // Build nodes + assign cluster target positions
  useEffect(() => {
    if (!width || !height) return;
    const cx = width / 2, cy = height / 2;
    const N = clusters.length || 1;

    // cluster centers evenly distributed
    const clusterCenters: Record<string, { x: number; y: number; color: string }> = {};
    clusters.forEach((c, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / N;
      const r = Math.min(cx, cy) * (N === 1 ? 0 : 0.46);
      clusterCenters[c.key] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), color: c.color };
    });

    const newNodes: FNode[] = clusters.flatMap((c) =>
      c.items.map((it, k) => {
        const center = clusterCenters[c.key] || { x: cx, y: cy };
        const angle = (2 * Math.PI * k) / c.items.length;
        const spread = 20 + Math.min(c.items.length, 14) * 4;
        const existing = nodesRef.current.find((n) => n.id === it.id);
        return {
          id: it.id, text: it.text, score: it.score, intent: it.intent, kind: it.kind,
          cluster: c.key, clusterColor: c.color,
          x: existing?.x ?? cx + (Math.random() - 0.5) * 200,
          y: existing?.y ?? cy + (Math.random() - 0.5) * 200,
          vx: existing?.vx ?? 0, vy: existing?.vy ?? 0,
          targetX: center.x + spread * Math.cos(angle),
          targetY: center.y + spread * Math.sin(angle),
        };
      })
    );
    nodesRef.current = newNodes;
  }, [clusters, width, height]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function tick() {
      if (!canvas || !ctx) return;
      const nodes = nodesRef.current;
      const mx = mouseRef.current.x, my = mouseRef.current.y;

      // Physics step
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        // attract to target
        n.vx += (n.targetX - n.x) * 0.018;
        n.vy += (n.targetY - n.y) * 0.018;
        // repel neighbours
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist2 = dx * dx + dy * dy + 1;
          if (dist2 < 3600) {
            const f = 120 / dist2;
            n.vx += dx * f; n.vy += dy * f;
            m.vx -= dx * f; m.vy -= dy * f;
          }
        }
        // mouse repel
        const mdx = n.x - mx, mdy = n.y - my;
        const md2 = mdx * mdx + mdy * mdy + 1;
        if (md2 < 10000) { const f = 600 / md2; n.vx += mdx * f; n.vy += mdy * f; }
        // dampen
        n.vx *= 0.78; n.vy *= 0.78;
        n.x += n.vx; n.y += n.vy;
        // bounds
        n.x = Math.max(12, Math.min(canvas.width - 12, n.x));
        n.y = Math.max(12, Math.min(canvas.height - 12, n.y));
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw edges (same cluster)
      ctx.save();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].cluster !== nodes[j].cluster) continue;
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 140) continue;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          const alpha2 = (1 - d / 140) * 0.18;
          ctx.strokeStyle = nodes[i].clusterColor + Math.round(alpha2 * 255).toString(16).padStart(2,'0');
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      ctx.restore();

      // Draw nodes
      for (const n of nodes) {
        const isActive = activeCluster === null || activeCluster === n.cluster;
        const r = 4 + n.score * 8;
        const mx2 = mouseRef.current.x, my2 = mouseRef.current.y;
        const hovered2 = Math.abs(n.x - mx2) < r + 4 && Math.abs(n.y - my2) < r + 4;

        // glow
        ctx.save();
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.8);
        grd.addColorStop(0, n.clusterColor + (hovered2 ? 'aa' : '44'));
        grd.addColorStop(1, n.clusterColor + '00');
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = isActive ? 1 : 0.12;
        ctx.fill();
        ctx.restore();

        // circle
        ctx.save();
        ctx.globalAlpha = isActive ? (hovered2 ? 1 : 0.85) : 0.1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.clusterColor;
        ctx.fill();
        if (hovered2) {
          ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCluster]);

  // Mouse move to find hovered
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    mouseRef.current = { x: mx, y: my };
    const found = nodesRef.current.find((n) => {
      const r = 4 + n.score * 8 + 4;
      return Math.hypot(n.x - mx, n.y - my) < r;
    }) || null;
    setHoveredNode(found);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = nodesRef.current.find((n) => {
      const r = 4 + n.score * 8 + 4;
      return Math.hypot(n.x - mx, n.y - my) < r;
    });
    if (hit) onClusterClick(activeCluster === hit.cluster ? null : hit.cluster);
    else onClusterClick(null);
  }, [activeCluster, onClusterClick]);

  // Cluster labels
  const clusterLabels = useMemo(() => {
    if (!nodesRef.current.length) return [];
    const map = new Map<string, { x: number; y: number; count: number; color: string; label: string }>();
    for (const n of nodesRef.current) {
      const e = map.get(n.cluster);
      if (!e) map.set(n.cluster, { x: n.x, y: n.y, count: 1, color: n.clusterColor, label: n.cluster.replace(/^[qk]:/, '') });
      else { e.x += n.x; e.y += n.y; e.count++; }
    }
    return Array.from(map.values()).map((e) => ({ ...e, x: e.x / e.count, y: e.y / e.count }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters]);

  return (
    <Box sx={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { mouseRef.current = { x: -999, y: -999 }; setHoveredNode(null); }}
        onClick={handleClick}
        style={{ display: 'block', cursor: hoveredNode ? 'pointer' : 'default' }}
      />
      {/* SVG overlay for cluster labels */}
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={width} height={height}>
        {clusterLabels.map((cl) => (
          <g key={cl.label}>
            <rect x={cl.x - 28} y={cl.y - 9} width={56} height={18} rx={9}
              fill={cl.color + '22'} stroke={cl.color + '55'} strokeWidth={0.8} />
            <text x={cl.x} y={cl.y + 4} textAnchor="middle" fontSize={10} fontWeight={800}
              fill={cl.color} style={{ textTransform: 'capitalize', pointerEvents: 'none', letterSpacing: 0.3 }}>
              {cl.label.length > 11 ? cl.label.slice(0, 10) + '…' : cl.label}
            </text>
          </g>
        ))}
      </svg>
      {/* Hover tooltip */}
      {hoveredNode && (
        <Box sx={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          bgcolor: 'rgba(8,9,13,0.95)', backdropFilter: 'blur(20px)',
          border: `1px solid ${hoveredNode.clusterColor}44`, borderRadius: 3,
          px: 2, py: 1.2, maxWidth: 320, pointerEvents: 'none',
          boxShadow: `0 8px 32px ${hoveredNode.clusterColor}22`,
        }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: hoveredNode.clusterColor, boxShadow: `0 0 6px ${hoveredNode.clusterColor}` }} />
            <Typography sx={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: hoveredNode.clusterColor }}>{hoveredNode.cluster.replace(/^[qk]:/,'')}</Typography>
            <Box sx={{ ml: 'auto !important', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
              {Math.round(hoveredNode.score * 100)}%
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
            {hoveredNode.text.length > 100 ? hoveredNode.text.slice(0, 99) + '…' : hoveredNode.text}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/* ─────────── Signal Feed (right panel) ─────────── */
function SignalFeed({ items, onDelete }: { items: Insight[]; onDelete: (id: string) => void }) {
  const sorted = [...items].sort((a, b) => b.score - a.score).slice(0, 20);
  return (
    <Stack spacing={0} sx={{ height: '100%', overflowY: 'auto', pr: 0.5,
      '&::-webkit-scrollbar': { width: 4 },
      '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
    }}>
      {sorted.map((ins, idx) => {
        const color = (ins.intent && INTENT_COLOR[ins.intent]) || '#64748b';
        return (
          <Box key={ins.id} sx={{
            px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}`,
            transition: 'all .15s', cursor: 'default',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
            animation: `slideIn .3s ease ${idx * 0.025}s both`,
          }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              {/* rank */}
              <Typography sx={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.18)', mt: 0.2, minWidth: 20, textAlign: 'right' }}>
                {String(idx + 1).padStart(2, '0')}
              </Typography>
              {/* score bar */}
              <Box sx={{ mt: 0.8, width: 3, borderRadius: 2, bgcolor: color, opacity: 0.6 + ins.score * 0.4, alignSelf: 'stretch', minHeight: 32 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.45, fontWeight: 500 }}>
                  {ins.text.length > 90 ? ins.text.slice(0, 89) + '…' : ins.text}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.8 }}>
                  {ins.intent && (
                    <Box sx={{ px: 1, py: 0.1, borderRadius: 1, bgcolor: `${color}18`, border: `1px solid ${color}30` }}>
                      <Typography sx={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6, color }}>
                        {ins.intent}
                      </Typography>
                    </Box>
                  )}
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                    {(ins.score * 100).toFixed(0)}%
                  </Typography>
                </Stack>
              </Box>
              <IconButton size="small" onClick={() => onDelete(ins.id)}
                sx={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0, mt: -0.5,
                  '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' } }}
                aria-label="delete">
                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

/* ─────────── Score Ring ─────────── */
function Ring({ v, size, color }: { v: number; size: number; color: string }) {
  const r = (size - 5) / 2;
  const C = 2 * Math.PI * r;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={2.5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={2.5}
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, v))} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <Typography sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size > 44 ? 11 : 9, fontWeight: 900, color, lineHeight: 1 }}>
        {Math.round(v * 100)}
      </Typography>
    </Box>
  );
}

/* ─────────── Insight Card ─────────── */
function InsightCard({ ins, onDelete }: { ins: Insight; onDelete: () => void }) {
  const color = (ins.intent && INTENT_COLOR[ins.intent]) || '#64748b';
  const isHigh = ins.score >= 0.7;
  return (
    <Box sx={{
      position: 'relative', p: 2.2, borderRadius: 3, overflow: 'hidden',
      bgcolor: SURFACE, border: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${color}`,
      transition: 'all .2s ease',
      '&:hover': {
        bgcolor: 'rgba(255,255,255,0.07)',
        transform: 'translateY(-2px)',
        boxShadow: `0 12px 40px ${color}14`,
        '& .del-btn': { opacity: 1 },
      },
    }}>
      {isHigh && (
        <Box sx={{
          position: 'absolute', top: 8, right: 8,
          px: 0.8, py: 0.2, borderRadius: 1,
          bgcolor: `${BRAND.amber}22`, border: `1px solid ${BRAND.amber}44`,
        }}>
          <Typography sx={{ fontSize: 8.5, fontWeight: 900, color: BRAND.amber, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            priority
          </Typography>
        </Box>
      )}

      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Ring v={ins.score} size={38} color={color} />
        <Box sx={{ flex: 1, minWidth: 0, mt: 0.3 }}>
          {ins.intent && (
            <Box sx={{ display: 'inline-block', mb: 0.6, px: 1, py: 0.15, borderRadius: 1,
              bgcolor: `${color}18`, border: `1px solid ${color}30` }}>
              <Typography sx={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8, color }}>
                {ins.intent}
              </Typography>
            </Box>
          )}
          <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, fontWeight: 500 }}>
            {ins.text}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.05)' }}>
          <Typography sx={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.35)' }}>
            {ins.kind}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onDelete} className="del-btn"
          sx={{ opacity: 0, transition: 'opacity .15s', color: 'rgba(255,255,255,0.3)',
            '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' } }}
          aria-label="delete insight">
          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════ */
export default function InsightsPage() {
  const { activeWorkspace } = useAuth();
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [jobId, setJobId] = useState('');
  const [items, setItems] = useState<Insight[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [intentFilter, setIntentFilter] = useState('');
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ w: 700, h: 480 });
  const confirm = useConfirm();

  /* ── resize observer for graph ── */
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

  /* ── load jobs ── */
  useEffect(() => {
    if (!activeWorkspace) return;
    setLoadingJobs(true);
    Research.list()
      .then((list) => { setJobs(list); setJobId((p) => p || list[0]?.id || ''); })
      .catch(() => setJobs([]))
      .finally(() => setLoadingJobs(false));
  }, [activeWorkspace]);

  /* ── load insights ── */
  useEffect(() => {
    if (!jobId) { setItems([]); return; }
    setLoading(true); setActiveCluster(null);
    Research.insights(jobId).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [jobId]);

  /* ── delete handler ── */
  const handleDelete = useCallback(async (ins: Insight) => {
    const ok = await confirm({
      title: 'Delete insight?',
      message: (<>Remove <b>"{ins.text.slice(0, 70)}…"</b>?</>),
    });
    if (!ok) return;
    const prev = items;
    setItems((list) => list.filter((x) => x.id !== ins.id));
    try { await Insights.remove(ins.id); } catch { setItems(prev); }
  }, [confirm, items]);

  /* ── computed ── */
  const selectedJob = jobs.find((j) => j.id === jobId) || null;
  const intents = useMemo(() => Array.from(new Set(items.map((i) => i.intent).filter(Boolean))) as string[], [items]);
  const clusters = useMemo(() => buildClusters(items), [items]);

  const filtered = useMemo(() => items.filter((i) => {
    if (intentFilter && i.intent !== intentFilter) return false;
    if (q && !i.text.toLowerCase().includes(q.toLowerCase())) return false;
    if (activeCluster) {
      const c = clusters.find((cl) => cl.key === activeCluster);
      if (c && !c.items.some((it) => it.id === i.id)) return false;
    }
    return true;
  }), [items, intentFilter, q, activeCluster, clusters]);

  const topCluster   = clusters[0];
  const avgScore     = items.length ? items.reduce((s, i) => s + i.score, 0) / items.length : 0;
  const highCount    = items.filter((i) => i.score >= 0.7).length;
  const topIntent    = (() => {
    const cnt: Record<string, number> = {};
    items.forEach((i) => { if (i.intent) cnt[i.intent] = (cnt[i.intent] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  })();

  /* ─────────────────────────────────────────────── */
  return (
    <Box sx={{ mx: -3, mt: -3, mb: -3, minHeight: '100vh', bgcolor: BG, color: '#fff',
      fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* ══ TOP STRIP ══ */}
      <Box sx={{
        px: { xs: 3, md: 4 }, py: 2.5,
        borderBottom: `1px solid ${BORDER}`,
        backdropFilter: 'blur(20px)',
        background: 'rgba(8,9,13,0.9)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
          {/* Left */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{
              width: 34, height: 34, borderRadius: 2,
              background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.amber})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AutoAwesomeIcon sx={{ fontSize: 18, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 950, fontSize: 17, letterSpacing: -0.5, lineHeight: 1.1 }}>Intelligence Insights</Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                {selectedJob ? selectedJob.topic : 'Select a research job'}
              </Typography>
            </Box>
            {items.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
                {[
                  { label: `${items.length} insights`, color: '#6366f1' },
                  { label: `${clusters.length} clusters`, color: BRAND.teal },
                  { label: `${highCount} priority`, color: BRAND.amber },
                ].map((b) => (
                  <Box key={b.label} sx={{ px: 1.2, py: 0.3, borderRadius: 1.5,
                    bgcolor: `${b.color}18`, border: `1px solid ${b.color}30` }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: b.color }}>{b.label}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>

          {/* Controls */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField select value={jobId} onChange={(e) => setJobId(e.target.value)} size="small"
              disabled={loadingJobs || jobs.length === 0}
              sx={{ minWidth: 200, '& .MuiInputBase-root': { bgcolor: SURFACE, color: '#fff', fontSize: 13 },
                '& .MuiInputLabel-root': { display: 'none' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
              }}>
              <MenuItem value="" disabled>Select research…</MenuItem>
              {jobs.map((j) => <MenuItem key={j.id} value={j.id} sx={{ fontSize: 13 }}>{j.topic}</MenuItem>)}
            </TextField>
            <TextField size="small" placeholder="Search insights…" value={q} onChange={(e) => setQ(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 0.5, fontSize: 16, color: 'rgba(255,255,255,0.3)' }} /> }}
              sx={{ minWidth: 200, '& .MuiInputBase-root': { bgcolor: SURFACE, color: '#fff', fontSize: 13 },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                '& ::placeholder': { color: 'rgba(255,255,255,0.3)' },
              }} />
            <TextField select value={intentFilter} onChange={(e) => setIntentFilter(e.target.value)} size="small"
              InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 0.5, fontSize: 16, color: 'rgba(255,255,255,0.3)' }} /> }}
              sx={{ minWidth: 140, '& .MuiInputBase-root': { bgcolor: SURFACE, color: '#fff', fontSize: 13 },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER } }}>
              <MenuItem value="">All intents</MenuItem>
              {intents.map((it) => <MenuItem key={it} value={it} sx={{ textTransform: 'capitalize', fontSize: 13 }}>{it}</MenuItem>)}
            </TextField>
          </Stack>
        </Stack>
      </Box>

      {/* ══ BODY ══ */}
      {loadingJobs || loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 400 }}>
          <CircularProgress sx={{ color: BRAND.teal }} />
        </Box>
      ) : !jobId || items.length === 0 ? (
        <Box sx={{ p: 8, textAlign: 'center' }}>
          <Box sx={{ fontSize: 48, mb: 2, opacity: 0.15 }}>⬡</Box>
          <Typography sx={{ fontWeight: 900, fontSize: 22, color: 'rgba(255,255,255,0.4)' }}>
            {!jobId ? 'Select a research job to begin' : 'No insights yet'}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.25)', mt: 1 }}>
            {!jobId ? 'Choose a research from the selector above.' : 'Run deep research to generate intelligence signals.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>

          {/* ── STAT ROW ── */}
          <Stack direction="row" spacing={2} sx={{ mb: 3, overflowX: 'auto', pb: 0.5 }}>
            {[
              { v: items.length.toString(), label: 'Total signals', sub: `from ${clusters.length} topic clusters`, color: '#6366f1' },
              { v: `${(avgScore * 100).toFixed(0)}%`, label: 'Avg relevance', sub: `${highCount} high-value (≥70%)`, color: BRAND.teal },
              { v: topIntent || '—', label: 'Top intent', sub: `dominant audience signal`, color: BRAND.amber, cap: true },
              { v: topCluster?.label || '—', label: 'Lead cluster', sub: `${topCluster?.items.length || 0} insights`, color: '#ec4899', cap: true },
            ].map((s) => (
              <Box key={s.label} sx={{
                flexShrink: 0, px: 2.5, py: 1.8, borderRadius: 3, minWidth: 160,
                bgcolor: SURFACE, border: `1px solid ${BORDER}`,
                borderTop: `2px solid ${s.color}`,
              }}>
                <Typography sx={{ fontSize: s.v.length > 10 ? 16 : 26, fontWeight: 950, color: '#fff',
                  textTransform: s.cap ? 'capitalize' : 'none', lineHeight: 1.2 }}>
                  {s.v}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {s.label}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', mt: 0.2 }}>{s.sub}</Typography>
              </Box>
            ))}
          </Stack>

          {/* ── CLUSTER CHIPS ── */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
            <Chip label="All" size="small" onClick={() => setActiveCluster(null)}
              variant={!activeCluster ? 'filled' : 'outlined'}
              sx={{ fontWeight: 800, fontSize: 11,
                bgcolor: !activeCluster ? 'rgba(255,255,255,0.15)' : 'transparent',
                borderColor: BORDER, color: '#fff' }} />
            {clusters.map((c) => (
              <Chip key={c.key} label={`${c.label} · ${c.items.length}`} size="small"
                onClick={() => setActiveCluster(activeCluster === c.key ? null : c.key)}
                variant={activeCluster === c.key ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 800, fontSize: 11, textTransform: 'capitalize',
                  borderColor: `${c.color}55`,
                  color: activeCluster === c.key ? '#fff' : c.color,
                  bgcolor: activeCluster === c.key ? c.color : 'transparent',
                  '&:hover': { bgcolor: `${c.color}22` },
                }} />
            ))}
          </Stack>

          {/* ── MAIN SPLIT LAYOUT ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Force graph */}
            <Grid size={{ xs: 12, lg: 7 }}>
              <Box sx={{
                borderRadius: 4, overflow: 'hidden',
                border: `1px solid ${BORDER}`,
                background: 'linear-gradient(145deg, #0B0D16 0%, #0D1120 50%, #0A0C15 100%)',
                height: { xs: 360, md: 480 },
                position: 'relative',
              }}>
                {/* Header bar */}
                <Box sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 0.6 }}>
                    {['#ef4444','#f59e0b','#22c55e'].map((c) => (
                      <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c, opacity: 0.7 }} />
                    ))}
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                    topology · {filtered.length} nodes active
                  </Typography>
                  {activeCluster && (
                    <Chip label={`cluster: ${activeCluster.replace(/^[qk]:/,'')}`} size="small"
                      onDelete={() => setActiveCluster(null)}
                      sx={{ ml: 'auto', fontSize: 10, height: 22, bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }} />
                  )}
                </Box>
                <Box ref={graphContainerRef} sx={{ flex: 1, height: 'calc(100% - 44px)' }}>
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
                borderRadius: 4, border: `1px solid ${BORDER}`,
                bgcolor: SURFACE, height: { xs: 360, md: 480 }, overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}>
                <Box sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                    top signals · ranked by score
                  </Typography>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: BRAND.teal, boxShadow: `0 0 8px ${BRAND.teal}` }}>
                    <Box component="span" sx={{ display: 'block', width: 6, height: 6, borderRadius: '50%', bgcolor: BRAND.teal,
                      animation: 'ping 1.5s ease-in-out infinite', opacity: 0.6 }} />
                  </Box>
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

          {/* ── AI BRIEF ── */}
          <Box sx={{
            mb: 3, p: 3, borderRadius: 4,
            background: `linear-gradient(135deg, rgba(20,187,135,0.06) 0%, rgba(99,102,241,0.04) 100%)`,
            border: `1px solid rgba(20,187,135,0.12)`,
          }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: BRAND.teal, boxShadow: `0 0 8px ${BRAND.teal}` }} />
              <Typography sx={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: BRAND.teal }}>
                AI intelligence brief
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', ml: 1 }}>
                {items.length} signals · {clusters.length} clusters analysed
              </Typography>
            </Stack>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              {[
                topCluster && `"${topCluster.label}" is the dominant topic cluster (${topCluster.items.length} signals)`,
                `${highCount} high-value signals detected with relevance ≥ 70%`,
                topIntent && `Primary intent is ${topIntent} — ${topIntent === 'commercial' ? 'audience is close to purchasing' : topIntent === 'informational' ? 'education-first content will win' : 'diverse buying signals present'}`,
                `Average signal strength: ${(avgScore * 100).toFixed(0)}/100 — ${avgScore > 0.65 ? 'strong research quality' : 'moderate signal density'}`,
              ].filter(Boolean).map((f, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 200, flex: '1 1 220px' }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: BRAND.teal, mt: 0.85, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{f}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* ── INSIGHT CARDS ── */}
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15 }}>
                {activeCluster
                  ? `${clusters.find((c) => c.key === activeCluster)?.label} — ${filtered.length} insights`
                  : `All insights · ${filtered.length}`}
              </Typography>
              {activeCluster && (
                <Box sx={{ ml: 1, width: 10, height: 10, borderRadius: '50%',
                  bgcolor: clusters.find((c) => c.key === activeCluster)?.color || BRAND.teal }} />
              )}
            </Stack>

            {filtered.length === 0 ? (
              <Typography sx={{ color: 'rgba(255,255,255,0.3)', py: 4, textAlign: 'center' }}>
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
        </Box>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
        @keyframes ping { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(2); opacity: 0; } }
      `}</style>
    </Box>
  );
}
