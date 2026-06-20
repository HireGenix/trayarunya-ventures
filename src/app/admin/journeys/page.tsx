'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material/Alert';
import type { SelectChangeEvent } from '@mui/material/Select';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EmailIcon from '@mui/icons-material/Email';
import HubIcon from '@mui/icons-material/Hub';
import LogoutIcon from '@mui/icons-material/Logout';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import TuneIcon from '@mui/icons-material/Tune';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { AnimatePresence, motion } from 'framer-motion';

import { DashSectionHeading, GlassCard, IconBadge, SoftHero } from '@/components/dashboard/primitives';
import { CARD, DASH, PASTEL, SOFT, type PastelKey } from '@/components/dashboard/tokens';
import type {
  Audience,
  Journey,
  JourneyChannel,
  JourneyDefinition,
  JourneyEdge,
  JourneyMetrics,
  JourneyNode,
  JourneyNodeConfig,
  JourneyNodeKind,
  JourneyOptimizeResult,
} from '@/lib/marketingOs/types';

const CHANNELS: JourneyChannel[] = ['Email', 'SMS', 'Ads', 'Push', 'In-app'];
const MESSAGE_KINDS: JourneyNodeKind[] = ['send', 'upsell', 'remarketing'];
const PALETTE_KINDS: JourneyNodeKind[] = ['split', 'offer', 'holdout', 'send', 'wait', 'condition', 'upsell', 'remarketing', 'exit'];
const REMARKETING_PLATFORMS = ['Meta', 'Google', 'LinkedIn', 'TikTok'] as const;
const WAIT_UNITS: NonNullable<JourneyNodeConfig['waitUnit']>[] = ['minutes', 'hours', 'days'];

type JourneyStatus = Journey['status'];
type ToastState = { open: boolean; message: string; severity: AlertColor };
type ApiErrorBody = { error?: string };
type CopyPayload = { subject?: string; body?: string; cta?: string };
type NodeLayout = { node: JourneyNode; row: number; column: 0 | 1 | 2; x: number; y: number };

type LoadingKey = 'initial' | 'creating' | 'saving' | 'designing' | 'optimizing' | 'deleting';

const KIND_META: Record<JourneyNodeKind, { label: string; tone: PastelKey; icon: React.ReactElement }> = {
  start: { label: 'Start', tone: 'mint', icon: <PlayArrowIcon /> },
  split: { label: 'A/B split', tone: 'sky', icon: <CallSplitIcon /> },
  offer: { label: 'Offer', tone: 'mint', icon: <VisibilityIcon /> },
  holdout: { label: 'Holdout', tone: 'sage', icon: <VisibilityOffIcon /> },
  send: { label: 'Send', tone: 'sky', icon: <SendIcon /> },
  wait: { label: 'Wait', tone: 'peach', icon: <PauseIcon /> },
  condition: { label: 'Condition', tone: 'coral', icon: <TuneIcon /> },
  upsell: { label: 'Upsell', tone: 'sky', icon: <EmailIcon /> },
  remarketing: { label: 'Remarketing', tone: 'lavender', icon: <HubIcon /> },
  exit: { label: 'Exit', tone: 'sage', icon: <LogoutIcon /> },
};

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function starterDefinition(): JourneyDefinition {
  return { nodes: [{ id: uid('start'), kind: 'start', label: 'Start', branch: null, config: { enabled: true } }], edges: [] };
}

function normalizeDefinition(definition?: JourneyDefinition | null): JourneyDefinition {
  const nodes = Array.isArray(definition?.nodes) ? definition.nodes : [];
  const edges = Array.isArray(definition?.edges) ? definition.edges : [];
  return {
    nodes: nodes.map((node) => ({ ...node, branch: node.branch ?? null, config: node.config ?? {} })),
    edges: edges.map((edge) => ({ ...edge, kind: edge.kind ?? 'solid' })),
  };
}

function isMessageKind(kind: JourneyNodeKind) {
  return MESSAGE_KINDS.includes(kind);
}

function defaultNode(kind: JourneyNodeKind): JourneyNode {
  const base: JourneyNode = { id: uid(kind), kind, label: KIND_META[kind].label, branch: null, config: { enabled: true } };
  if (isMessageKind(kind)) return { ...base, channel: kind === 'remarketing' ? 'Ads' : 'Email', config: { ...base.config, frequencyCap: 2, businessHoursOnly: true, adPlatform: kind === 'remarketing' ? 'Meta' : undefined } };
  if (kind === 'split') return { ...base, label: 'A/B split', config: { ...base.config, splitPercent: 50 } };
  if (kind === 'holdout') return { ...base, label: 'Holdout control', branch: 'b', config: { ...base.config, holdoutPercent: 10 } };
  if (kind === 'wait') return { ...base, label: 'Wait for intent', config: { ...base.config, waitValue: 2, waitUnit: 'days' } };
  return base;
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error === 'not_configured' ? 'AI is not configured yet.' : body.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

function nextStatus(status: JourneyStatus): JourneyStatus {
  if (status === 'active') return 'paused';
  return 'active';
}

function statusColor(status: JourneyStatus) {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'default';
}

function buildLayout(definition: JourneyDefinition): NodeLayout[] {
  let row = 0;
  let branchRow = -1;
  return definition.nodes.map((node) => {
    const isBranch = node.branch === 'a' || node.branch === 'b';
    if (isBranch) {
      if (branchRow < 0) branchRow = row;
      const column = node.branch === 'a' ? 0 : 2;
      const layout = { node, row: branchRow, column, x: column === 0 ? 26 : 74, y: 78 + branchRow * 112 } satisfies NodeLayout;
      if (node.branch === 'b') {
        row = branchRow + 1;
        branchRow = -1;
      }
      return layout;
    }
    const layout = { node, row, column: 1, x: 50, y: 78 + row * 112 } satisfies NodeLayout;
    row += 1;
    branchRow = -1;
    return layout;
  });
}

function StatStrip({ journey }: { journey: Journey | null }) {
  const metrics = journey?.metrics;
  const nodes = journey?.definition?.nodes ?? [];
  const channelCount = new Set(nodes.map((node) => node.channel).filter(Boolean)).size;
  const converted = metrics ? `${metrics.conversionRate.toFixed(1)}%` : `${Math.max(1, nodes.filter((node) => isMessageKind(node.kind)).length * 1.4).toFixed(1)}% est.`;
  const stats = [
    { label: 'In journey', value: metrics ? metrics.inJourney.toLocaleString() : `${nodes.length} live steps`, tone: 'mint' as PastelKey },
    { label: 'Conversion', value: converted, tone: 'sky' as PastelKey },
    { label: 'Channels', value: metrics?.byChannel?.length ? `${metrics.byChannel.length} active` : `${channelCount || 1} planned`, tone: 'lavender' as PastelKey },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
      {stats.map((stat) => (
        <GlassCard key={stat.label} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ color: DASH.faint, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>{stat.label}</Typography>
            <Typography sx={{ color: DASH.ink, fontSize: 24, fontWeight: 900, mt: 0.4 }}>{stat.value}</Typography>
          </Box>
          <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: PASTEL[stat.tone].bg, border: `1px solid ${DASH.line}` }} />
        </GlassCard>
      ))}
    </Box>
  );
}

function CanvasConnectors({ layout, edges }: { layout: NodeLayout[]; edges: JourneyEdge[] }) {
  const byId = new Map(layout.map((item) => [item.node.id, item]));
  const height = Math.max(420, ...layout.map((item) => item.y + 92));
  return (
    <Box component="svg" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" sx={{ position: 'absolute', inset: 0, display: { xs: 'none', md: 'block' }, pointerEvents: 'none', zIndex: 0 }}>
      {edges.map((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return null;
        const y1 = from.y + 48;
        const y2 = to.y - 8;
        const mid = (y1 + y2) / 2;
        const d = from.x === to.x ? `M ${from.x} ${y1} V ${y2}` : `M ${from.x} ${y1} V ${mid} H ${to.x} V ${y2}`;
        return <path key={edge.id} d={d} stroke="rgba(15,23,42,0.32)" strokeWidth="0.5" strokeDasharray={edge.kind === 'dashed' ? '2 2' : undefined} fill="none" />;
      })}
    </Box>
  );
}

function NodeCard({ item, selected, onSelect, index }: { item: NodeLayout; selected: boolean; onSelect: (id: string) => void; index: number }) {
  const { node, x, y } = item;
  const meta = KIND_META[node.kind];
  return (
    <Box
      component={motion.button}
      type="button"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.045 }}
      whileHover={{ y: -3 }}
      onClick={() => onSelect(node.id)}
      sx={{
        position: { xs: 'relative', md: 'absolute' },
        left: { md: `${x}%` },
        top: { md: y },
        transform: { md: 'translateX(-50%)' },
        zIndex: 1,
        width: { xs: '100%', sm: node.branch ? 'calc(50% - 8px)' : '100%', md: 196 },
        minHeight: 68,
        p: 1.25,
        borderRadius: 3,
        border: selected ? `2px solid ${DASH.neon}` : `1px solid ${DASH.lineStrong}`,
        bgcolor: '#fff',
        boxShadow: selected ? `0 0 0 5px ${DASH.neonGlow}, ${CARD.shadowHover}` : CARD.shadow,
        display: 'flex',
        alignItems: 'center',
        gap: 1.2,
        cursor: 'pointer',
        textAlign: 'left',
        font: 'inherit',
        color: DASH.ink,
        '&:focus-visible': { outline: `3px solid ${DASH.neonGlow}`, outlineOffset: 3 },
      }}
    >
      <IconBadge tone={meta.tone} size={38}>{meta.icon}</IconBadge>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap sx={{ fontWeight: 850, fontSize: 14.5, color: DASH.ink, lineHeight: 1.2 }}>{node.label}</Typography>
        <Stack direction="row" spacing={0.6} sx={{ mt: 0.65, flexWrap: 'wrap' }}>
          <Chip size="small" label={meta.label} sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: PASTEL[meta.tone].bg, color: PASTEL[meta.tone].fg }} />
          {node.channel && <Chip size="small" label={node.channel} sx={{ height: 20, fontSize: 10.5, fontWeight: 800 }} />}
        </Stack>
      </Box>
    </Box>
  );
}

function OptimizePanel({ optimization }: { optimization: JourneyOptimizeResult | null }) {
  if (!optimization) return null;
  return (
    <GlassCard sx={{ p: 2.2, mt: 2, bgcolor: 'rgba(255,255,255,0.92)' }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress variant="determinate" value={Math.min(100, Math.max(0, optimization.score))} size={64} thickness={5} sx={{ color: DASH.neon }} />
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <Typography sx={{ fontWeight: 900, color: DASH.ink }}>{optimization.score}</Typography>
          </Box>
        </Box>
        <Box>
          <Typography sx={{ color: DASH.ink, fontWeight: 900 }}>AI journey score</Typography>
          <Typography sx={{ color: DASH.muted, fontSize: 13.5, lineHeight: 1.5 }}>{optimization.summary}</Typography>
        </Box>
      </Stack>
      <Stack spacing={1.2} sx={{ mt: 2 }}>
        {(optimization.improvements ?? []).map((item) => (
          <Box key={`${item.title}-${item.impact}`} sx={{ p: 1.3, borderRadius: 2, bgcolor: DASH.bgSoft, border: `1px solid ${DASH.line}` }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ flex: 1, color: DASH.ink, fontWeight: 850, fontSize: 13.5 }}>{item.title}</Typography>
              <Chip size="small" label={item.impact} color={item.impact === 'high' ? 'success' : item.impact === 'medium' ? 'warning' : 'default'} />
            </Stack>
            <Typography sx={{ mt: 0.6, color: DASH.muted, fontSize: 12.5, lineHeight: 1.45 }}>{item.detail}</Typography>
          </Box>
        ))}
      </Stack>
      {!!optimization.missingChannels?.length && (
        <Stack direction="row" spacing={0.8} sx={{ mt: 2, flexWrap: 'wrap' }}>
          {optimization.missingChannels.map((channel) => <Chip key={channel} size="small" label={`Add ${channel}`} />)}
        </Stack>
      )}
    </GlassCard>
  );
}

function Inspector({
  node,
  onUpdate,
  onDelete,
  onGenerateCopy,
  copyLoading,
}: {
  node?: JourneyNode;
  onUpdate: (id: string, patch: Partial<JourneyNode>) => void;
  onDelete: (id: string) => void;
  onGenerateCopy: (node: JourneyNode) => void;
  copyLoading: boolean;
}) {
  const updateConfig = (patch: Partial<JourneyNodeConfig>) => {
    if (!node) return;
    onUpdate(node.id, { config: { ...node.config, ...patch } });
  };
  const updateCopy = (patch: CopyPayload) => {
    if (!node) return;
    onUpdate(node.id, { copy: { ...(node.copy ?? {}), ...patch } });
  };

  return (
    <AnimatePresence mode="wait">
      <Box key={node?.id ?? 'empty'} component={motion.div} initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}>
        <GlassCard sx={{ p: 3, minHeight: 520 }}>
          <Typography sx={{ color: DASH.faint, fontWeight: 900, letterSpacing: 1.2, fontSize: 12, textTransform: 'uppercase' }}>Inspector</Typography>
          {!node ? (
            <Box sx={{ mt: 8, textAlign: 'center' }}>
              <IconBadge tone="lavender" size={64}><HubIcon /></IconBadge>
              <Typography sx={{ mt: 2, color: DASH.ink, fontWeight: 850, fontSize: 20 }}>Select a step to configure it</Typography>
              <Typography sx={{ mt: 1, color: DASH.muted, lineHeight: 1.6 }}>Choose any journey node to edit rules, copy, and channel orchestration.</Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2.2 }}>
              <TextField label="Step name" value={node.label} onChange={(event) => onUpdate(node.id, { label: event.target.value })} fullWidth size="small" />
              <Box>
                <Typography sx={{ color: DASH.faint, fontSize: 12, fontWeight: 800, mb: 0.6 }}>Kind</Typography>
                <Chip label={KIND_META[node.kind].label} sx={{ fontWeight: 800, bgcolor: PASTEL[KIND_META[node.kind].tone].bg, color: PASTEL[KIND_META[node.kind].tone].fg }} />
              </Box>
              {isMessageKind(node.kind) && (
                <FormControl fullWidth size="small">
                  <InputLabel id="journey-channel-label">Channel</InputLabel>
                  <Select<JourneyChannel> labelId="journey-channel-label" label="Channel" value={node.channel ?? 'Email'} onChange={(event: SelectChangeEvent<JourneyChannel>) => onUpdate(node.id, { channel: event.target.value as JourneyChannel })}>
                    {CHANNELS.map((channel) => <MenuItem key={channel} value={channel}>{channel}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              {node.kind === 'split' && (
                <Box>
                  <Typography sx={{ color: DASH.ink, fontWeight: 800, mb: 1 }}>Branch A: {node.config.splitPercent ?? 50}%</Typography>
                  <Slider value={node.config.splitPercent ?? 50} min={0} max={100} onChange={(_, value) => updateConfig({ splitPercent: Array.isArray(value) ? value[0] : value })} />
                  <TextField type="number" size="small" label="Split percent" value={node.config.splitPercent ?? 50} onChange={(event) => updateConfig({ splitPercent: Number(event.target.value) })} fullWidth />
                </Box>
              )}
              {node.kind === 'holdout' && (
                <Box>
                  <Typography sx={{ color: DASH.ink, fontWeight: 800, mb: 1 }}>Holdout: {node.config.holdoutPercent ?? 10}%</Typography>
                  <Slider value={node.config.holdoutPercent ?? 10} min={0} max={100} onChange={(_, value) => updateConfig({ holdoutPercent: Array.isArray(value) ? value[0] : value })} />
                  <TextField type="number" size="small" label="Holdout percent" value={node.config.holdoutPercent ?? 10} onChange={(event) => updateConfig({ holdoutPercent: Number(event.target.value) })} fullWidth />
                </Box>
              )}
              {node.kind === 'wait' && (
                <Stack direction="row" spacing={1.2}>
                  <TextField type="number" size="small" label="Wait" value={node.config.waitValue ?? 1} onChange={(event) => updateConfig({ waitValue: Number(event.target.value) })} fullWidth />
                  <FormControl size="small" fullWidth>
                    <InputLabel id="wait-unit-label">Unit</InputLabel>
                    <Select labelId="wait-unit-label" label="Unit" value={node.config.waitUnit ?? 'days'} onChange={(event: SelectChangeEvent) => updateConfig({ waitUnit: event.target.value as JourneyNodeConfig['waitUnit'] })}>
                      {WAIT_UNITS.map((unit) => <MenuItem key={unit} value={unit}>{unit}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>
              )}
              {isMessageKind(node.kind) && (
                <>
                  <Divider />
                  <TextField type="number" size="small" label="Frequency cap" value={node.config.frequencyCap ?? 1} onChange={(event) => updateConfig({ frequencyCap: Number(event.target.value) })} fullWidth />
                  <FormControlLabel control={<Switch checked={Boolean(node.config.businessHoursOnly)} onChange={(event) => updateConfig({ businessHoursOnly: event.target.checked })} />} label="Business hours only" />
                  <FormControlLabel control={<Switch checked={node.config.enabled !== false} onChange={(event) => updateConfig({ enabled: event.target.checked })} />} label="Enabled" />
                  {node.kind === 'remarketing' && (
                    <FormControl fullWidth size="small">
                      <InputLabel id="ad-platform-label">Ad platform</InputLabel>
                      <Select labelId="ad-platform-label" label="Ad platform" value={node.config.adPlatform ?? 'Meta'} onChange={(event: SelectChangeEvent) => updateConfig({ adPlatform: event.target.value })}>
                        {REMARKETING_PLATFORMS.map((platform) => <MenuItem key={platform} value={platform}>{platform}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}
                  <Button variant="outlined" startIcon={copyLoading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />} onClick={() => onGenerateCopy(node)} disabled={copyLoading} sx={{ borderRadius: 999, fontWeight: 850 }}>
                    AI generate copy
                  </Button>
                  <TextField size="small" label="Subject" value={node.copy?.subject ?? ''} onChange={(event) => updateCopy({ subject: event.target.value })} fullWidth />
                  <TextField size="small" label="Body" value={node.copy?.body ?? ''} onChange={(event) => updateCopy({ body: event.target.value })} multiline minRows={3} fullWidth />
                  <TextField size="small" label="CTA" value={node.copy?.cta ?? ''} onChange={(event) => updateCopy({ cta: event.target.value })} fullWidth />
                </>
              )}
              {node.kind !== 'start' && (
                <Button color="error" variant="text" startIcon={<DeleteOutlineIcon />} onClick={() => onDelete(node.id)} sx={{ alignSelf: 'flex-start', fontWeight: 850 }}>
                  Delete node
                </Button>
              )}
            </Box>
          )}
        </GlassCard>
      </Box>
    </AnimatePresence>
  );
}

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [optimization, setOptimization] = useState<JourneyOptimizeResult | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState<Record<LoadingKey, boolean>>({ initial: true, creating: false, saving: false, designing: false, optimizing: false, deleting: false });
  const [copyLoadingId, setCopyLoadingId] = useState<string>('');
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedJourney = useMemo(() => journeys.find((journey) => journey.id === selectedJourneyId) ?? null, [journeys, selectedJourneyId]);
  const definition = useMemo(() => normalizeDefinition(selectedJourney?.definition), [selectedJourney]);
  const selectedNode = useMemo(() => definition.nodes.find((node) => node.id === selectedNodeId), [definition.nodes, selectedNodeId]);
  const layout = useMemo(() => buildLayout(definition), [definition]);
  const canvasHeight = Math.max(560, ...layout.map((item) => item.y + 120));

  const setLoad = (key: LoadingKey, value: boolean) => setLoading((current) => ({ ...current, [key]: value }));
  const showToast = useCallback((message: string, severity: AlertColor = 'success') => setToast({ open: true, message, severity }), []);

  const patchJourney = useCallback(async (id: string, body: Partial<Pick<Journey, 'name' | 'goal' | 'status' | 'audienceId' | 'definition' | 'metrics'>>, quiet = false) => {
    const data = await apiJson<{ journey: Journey }>(`/api/admin/journeys/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    setJourneys((current) => current.map((journey) => (journey.id === id ? { ...data.journey, definition: normalizeDefinition(data.journey.definition) } : journey)));
    if (!quiet) showToast('Journey saved.');
    return data.journey;
  }, [showToast]);

  const scheduleSave = useCallback((journey: Journey) => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      patchJourney(journey.id, { name: journey.name, goal: journey.goal, audienceId: journey.audienceId, definition: normalizeDefinition(journey.definition) }, true).catch((error: unknown) => showToast(error instanceof Error ? error.message : 'Autosave failed.', 'error'));
    }, 650);
  }, [patchJourney, showToast]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiJson<{ journeys: Journey[] }>('/api/admin/journeys'),
      apiJson<{ audiences: Audience[] }>('/api/admin/audiences'),
    ])
      .then(([journeysResult, audiencesResult]) => {
        if (!active) return;
        if (journeysResult.status === 'fulfilled') {
          const loaded = journeysResult.value.journeys.map((journey) => ({ ...journey, definition: normalizeDefinition(journey.definition) }));
          setJourneys(loaded);
          setSelectedJourneyId(loaded[0]?.id ?? '');
          setSelectedNodeId(loaded[0]?.definition.nodes[0]?.id ?? '');
        } else {
          showToast(journeysResult.reason instanceof Error ? journeysResult.reason.message : 'Could not load journeys.', 'error');
        }
        if (audiencesResult.status === 'fulfilled') setAudiences(audiencesResult.value.audiences ?? []);
        else showToast(audiencesResult.reason instanceof Error ? audiencesResult.reason.message : 'Could not load audiences.', 'error');
      })
      .finally(() => active && setLoad('initial', false));
    return () => {
      active = false;
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, [showToast]);

  const updateSelectedJourney = (patch: Partial<Journey>, persist = true) => {
    if (!selectedJourney) return;
    const updated = { ...selectedJourney, ...patch, definition: normalizeDefinition(patch.definition ?? selectedJourney.definition) };
    setJourneys((current) => current.map((journey) => (journey.id === updated.id ? updated : journey)));
    if (persist) scheduleSave(updated);
  };

  const updateDefinition = (nextDefinition: JourneyDefinition, persist = true) => {
    updateSelectedJourney({ definition: normalizeDefinition(nextDefinition) }, persist);
  };

  const updateNode = (id: string, patch: Partial<JourneyNode>) => {
    const nextDefinition = {
      ...definition,
      nodes: definition.nodes.map((node) => (node.id === id ? { ...node, ...patch, config: patch.config ?? node.config ?? {} } : node)),
    };
    updateDefinition(nextDefinition);
  };

  const createJourney = async () => {
    setLoad('creating', true);
    try {
      const data = await apiJson<{ journey: Journey }>('/api/admin/journeys', {
        method: 'POST',
        body: JSON.stringify({ name: 'Untitled journey', goal: 'Convert qualified visitors into customers', status: 'draft', definition: starterDefinition() }),
      });
      const journey = { ...data.journey, definition: normalizeDefinition(data.journey.definition) };
      setJourneys((current) => [journey, ...current]);
      setSelectedJourneyId(journey.id);
      setSelectedNodeId(journey.definition.nodes[0]?.id ?? '');
      setOptimization(null);
      showToast('New journey created.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not create journey.', 'error');
    } finally {
      setLoad('creating', false);
    }
  };

  const saveJourney = async () => {
    if (!selectedJourney) return;
    setLoad('saving', true);
    try {
      await patchJourney(selectedJourney.id, { name: selectedJourney.name, goal: selectedJourney.goal, audienceId: selectedJourney.audienceId, definition });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save journey.', 'error');
    } finally {
      setLoad('saving', false);
    }
  };

  const deleteJourney = async () => {
    if (!selectedJourney || !window.confirm(`Delete ${selectedJourney.name}?`)) return;
    setLoad('deleting', true);
    try {
      await apiJson<{ ok: true }>(`/api/admin/journeys/${selectedJourney.id}`, { method: 'DELETE' });
      const remaining = journeys.filter((journey) => journey.id !== selectedJourney.id);
      setJourneys(remaining);
      setSelectedJourneyId(remaining[0]?.id ?? '');
      setSelectedNodeId(remaining[0]?.definition.nodes[0]?.id ?? '');
      showToast('Journey deleted.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not delete journey.', 'error');
    } finally {
      setLoad('deleting', false);
    }
  };

  const toggleStatus = async () => {
    if (!selectedJourney) return;
    try {
      await patchJourney(selectedJourney.id, { status: nextStatus(selectedJourney.status) });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update status.', 'error');
    }
  };

  const addNode = (kind: JourneyNodeKind) => {
    if (!selectedJourney) return;
    const node = defaultNode(kind);
    const from = selectedNodeId || definition.nodes[definition.nodes.length - 1]?.id;
    const edges = from ? [...definition.edges, { id: uid('edge'), from, to: node.id, kind: node.branch ? 'dashed' : 'solid' } satisfies JourneyEdge] : definition.edges;
    updateDefinition({ nodes: [...definition.nodes, node], edges });
    setSelectedNodeId(node.id);
  };

  const deleteNode = (id: string) => {
    const node = definition.nodes.find((item) => item.id === id);
    if (!node || node.kind === 'start') return;
    updateDefinition({ nodes: definition.nodes.filter((item) => item.id !== id), edges: definition.edges.filter((edge) => edge.from !== id && edge.to !== id) });
    setSelectedNodeId(definition.nodes.find((item) => item.id !== id)?.id ?? '');
  };

  const designJourney = async () => {
    if (!selectedJourney) return;
    const goal = window.prompt('What should this journey achieve?', selectedJourney.goal || 'Convert high-intent visitors');
    if (!goal) return;
    setLoad('designing', true);
    try {
      const audience = audiences.find((item) => item.id === selectedJourney.audienceId);
      const data = await apiJson<{ definition: JourneyDefinition }>('/api/admin/journeys/agent', {
        method: 'POST',
        body: JSON.stringify({ mode: 'design', goal, audienceName: audience?.name, persona: audience?.insights?.persona }),
      });
      const normalized = normalizeDefinition(data.definition);
      updateSelectedJourney({ goal, definition: normalized });
      setSelectedNodeId(normalized.nodes[0]?.id ?? '');
      setOptimization(null);
      showToast('AI designed a new journey.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'AI design failed.', 'error');
    } finally {
      setLoad('designing', false);
    }
  };

  const generateCopy = async (node: JourneyNode) => {
    if (!selectedJourney) return;
    setCopyLoadingId(node.id);
    try {
      const audience = audiences.find((item) => item.id === selectedJourney.audienceId);
      const data = await apiJson<{ copy: CopyPayload }>('/api/admin/journeys/agent', {
        method: 'POST',
        body: JSON.stringify({ mode: 'copy', node: { kind: node.kind, channel: node.channel, label: node.label }, goal: selectedJourney.goal, audienceName: audience?.name, persona: audience?.insights?.persona }),
      });
      updateNode(node.id, { copy: data.copy });
      showToast('AI copy generated.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'AI copy failed.', 'error');
    } finally {
      setCopyLoadingId('');
    }
  };

  const optimizeJourney = async () => {
    if (!selectedJourney) return;
    setLoad('optimizing', true);
    try {
      const data = await apiJson<{ optimization: JourneyOptimizeResult }>('/api/admin/journeys/agent', {
        method: 'POST',
        body: JSON.stringify({ mode: 'optimize', goal: selectedJourney.goal, definition, metrics: selectedJourney.metrics }),
      });
      setOptimization(data.optimization);
      showToast('AI optimization complete.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'AI optimize failed.', 'error');
    } finally {
      setLoad('optimizing', false);
    }
  };

  const handleAudienceChange = async (event: SelectChangeEvent<string>) => {
    if (!selectedJourney) return;
    const audienceId = event.target.value || null;
    updateSelectedJourney({ audienceId });
    try {
      await patchJourney(selectedJourney.id, { audienceId }, true);
      showToast('Audience attached.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not attach audience.', 'error');
    }
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SoftHero
        eyebrow="Agentic journey orchestration"
        title={
          <Stack spacing={1.3} component="span" sx={{ display: 'flex' }}>
            <TextField
              variant="standard"
              value={selectedJourney?.name ?? 'Journeys'}
              onChange={(event) => updateSelectedJourney({ name: event.target.value })}
              disabled={!selectedJourney}
              InputProps={{ disableUnderline: true, sx: { fontSize: { xs: 27, md: 38 }, fontWeight: 900, color: DASH.ink, letterSpacing: '-0.03em' } }}
            />
            <TextField
              size="small"
              placeholder="Journey goal"
              value={selectedJourney?.goal ?? ''}
              onChange={(event) => updateSelectedJourney({ goal: event.target.value })}
              disabled={!selectedJourney}
              sx={{ maxWidth: 620, bgcolor: 'rgba(255,255,255,0.62)', borderRadius: 2 }}
            />
          </Stack>
        }
        subtitle="Design, test, optimize, and activate omni-channel customer journeys powered by data and AI agents."
        gradient={SOFT.lavender}
        right={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={loading.creating ? <CircularProgress color="inherit" size={16} /> : <AddIcon />} onClick={createJourney} disabled={loading.creating} sx={{ borderRadius: 999, px: 2.1, bgcolor: DASH.pillActive, color: '#fff', fontWeight: 850 }}>
              New journey
            </Button>
            <Button variant="outlined" startIcon={loading.saving ? <CircularProgress size={16} /> : <SaveIcon />} onClick={saveJourney} disabled={!selectedJourney || loading.saving} sx={{ borderRadius: 999, fontWeight: 850 }}>
              Save
            </Button>
          </Stack>
        }
      />

      {loading.initial && <LinearProgress sx={{ borderRadius: 999 }} />}
      <StatStrip journey={selectedJourney} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr 340px' }, gap: 3, alignItems: 'start' }}>
        <GlassCard sx={{ p: 2.2 }}>
          <Typography sx={{ color: DASH.faint, fontWeight: 900, letterSpacing: 1.1, fontSize: 12, textTransform: 'uppercase', mb: 1.5 }}>Journeys</Typography>
          <Stack spacing={1.1}>
            {journeys.map((journey) => (
              <Box key={journey.id} component="button" type="button" onClick={() => { setSelectedJourneyId(journey.id); setSelectedNodeId(journey.definition.nodes[0]?.id ?? ''); setOptimization(null); }} sx={{ width: '100%', p: 1.25, borderRadius: 3, border: journey.id === selectedJourneyId ? `2px solid ${DASH.neon}` : `1px solid ${DASH.line}`, bgcolor: '#fff', textAlign: 'left', cursor: 'pointer', boxShadow: journey.id === selectedJourneyId ? `0 0 0 4px ${DASH.neonGlow}` : 'none' }}>
                <Typography noWrap sx={{ fontWeight: 850, color: DASH.ink, fontSize: 14 }}>{journey.name}</Typography>
                <Chip size="small" label={journey.status} color={statusColor(journey.status)} sx={{ mt: 0.8, height: 22, fontWeight: 800 }} />
              </Box>
            ))}
            {!journeys.length && !loading.initial && <Typography sx={{ color: DASH.muted, fontSize: 13 }}>No journeys yet. Create one to start.</Typography>}
          </Stack>
        </GlassCard>

        <GlassCard sx={{ p: { xs: 2, md: 3 }, minHeight: 560, position: 'relative', overflow: 'hidden', backgroundColor: '#fff', backgroundImage: `radial-gradient(${DASH.lineStrong} 1px, transparent 1px)`, backgroundSize: '22px 22px' }}>
          <DashSectionHeading eyebrow="Live flow" title={selectedJourney?.name ?? 'Select a journey'} subtitle="Click a step to tune its orchestration rules, copy, and delivery controls." align="left" />
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 190, bgcolor: '#fff' }}>
              <InputLabel id="audience-label">Audience</InputLabel>
              <Select labelId="audience-label" label="Audience" value={selectedJourney?.audienceId ?? ''} onChange={handleAudienceChange} disabled={!selectedJourney}>
                <MenuItem value="">No audience</MenuItem>
                {audiences.map((audience) => <MenuItem key={audience.id} value={audience.id}>{audience.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={loading.designing ? <CircularProgress size={16} /> : <AutoAwesomeIcon />} onClick={designJourney} disabled={!selectedJourney || loading.designing} sx={{ borderRadius: 999, fontWeight: 850 }}>AI design journey</Button>
            <Button variant="outlined" startIcon={loading.optimizing ? <CircularProgress size={16} /> : <TuneIcon />} onClick={optimizeJourney} disabled={!selectedJourney || loading.optimizing} sx={{ borderRadius: 999, fontWeight: 850 }}>AI optimize</Button>
            <Button variant="contained" onClick={toggleStatus} disabled={!selectedJourney} sx={{ borderRadius: 999, bgcolor: DASH.pillActive, fontWeight: 850 }}>{selectedJourney?.status === 'active' ? 'Pause' : 'Activate'}</Button>
            <Tooltip title="Delete journey"><span><IconButton color="error" onClick={deleteJourney} disabled={!selectedJourney || loading.deleting}>{loading.deleting ? <CircularProgress size={18} /> : <DeleteOutlineIcon />}</IconButton></span></Tooltip>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {PALETTE_KINDS.map((kind) => <Button key={kind} size="small" startIcon={<AddIcon />} onClick={() => addNode(kind)} disabled={!selectedJourney} sx={{ borderRadius: 999, bgcolor: PASTEL[KIND_META[kind].tone].bg, color: PASTEL[KIND_META[kind].tone].fg, fontWeight: 850 }}>{KIND_META[kind].label}</Button>)}
          </Stack>

          <Box sx={{ position: 'relative', height: { xs: 'auto', md: canvasHeight }, display: { xs: 'flex', md: 'block' }, flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: { xs: 1.6, sm: 2, md: 0 }, alignItems: 'stretch', pb: 2 }}>
            <CanvasConnectors layout={layout} edges={definition.edges} />
            {layout.map((item, index) => <NodeCard key={item.node.id} item={item} selected={item.node.id === selectedNodeId} onSelect={setSelectedNodeId} index={index} />)}
          </Box>
          <OptimizePanel optimization={optimization} />
        </GlassCard>

        <Inspector node={selectedNode} onUpdate={updateNode} onDelete={deleteNode} onGenerateCopy={generateCopy} copyLoading={copyLoadingId === selectedNode?.id} />
      </Box>

      <Snackbar open={toast.open} autoHideDuration={4200} onClose={() => setToast((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((current) => ({ ...current, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
