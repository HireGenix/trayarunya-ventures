'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell,
} from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTreeOutlined';
import PaidIcon from '@mui/icons-material/PaidOutlined';
import TimelineIcon from '@mui/icons-material/TimelineOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import GroupsIcon from '@mui/icons-material/Groups2Outlined';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import CompareArrowsIcon from '@mui/icons-material/CompareArrowsOutlined';
import RouteIcon from '@mui/icons-material/RouteOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
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
import { useAuth } from '@/lib/auth';
import {
  Attribution,
  type AttributionSummary,
  type PathExplorerData,
  type ModelComparisonData,
  type RevenueChannel,
  type RevenueStage,
  type RevenueEventInput,
  type RevenueEvent,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

const CHANNELS: RevenueChannel[] = [
  'linkedin', 'content', 'ads', 'email', 'organic', 'referral', 'events', 'other',
];
const STAGES: RevenueStage[] = [
  'touch', 'lead', 'mql', 'sql', 'opportunity', 'closed_won', 'closed_lost',
];

const CHANNEL_COLOR: Record<string, string> = {
  linkedin: '#2563EB',
  content: BRAND.teal,
  ads: BRAND.amber,
  email: '#7C3AED',
  organic: '#0EA5A4',
  referral: BRAND.pink,
  events: '#F97316',
  other: SUBTLE,
};

const FUNNEL_STAGES = ['lead', 'mql', 'sql', 'opportunity', 'closed_won'];
const FUNNEL_LABEL: Record<string, string> = {
  lead: 'Leads',
  mql: 'MQL',
  sql: 'SQL',
  opportunity: 'Opportunity',
  closed_won: 'Won',
};

type AttrModel = 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' | 'markov' | 'shapley';

const ALL_MODELS: { v: AttrModel; label: string }[] = [
  { v: 'linear', label: 'Linear' },
  { v: 'first_touch', label: 'First' },
  { v: 'last_touch', label: 'Last' },
  { v: 'time_decay', label: 'Time Decay' },
  { v: 'position_based', label: 'U-Shaped' },
  { v: 'markov', label: 'Markov' },
  { v: 'shapley', label: 'Shapley' },
];

const MODEL_COLORS: Record<string, string> = {
  first_touch: '#2563EB',
  last_touch: '#7C3AED',
  linear: BRAND.teal,
  time_decay: BRAND.amber,
  position_based: '#F97316',
  markov: BRAND.pink,
  shapley: '#0EA5A4',
};

type DashTab = 'overview' | 'comparison' | 'paths' | 'events';

function fmtMoney(n: number): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

function fmtRoi(r: number | null): string {
  if (r === null || r === undefined) return '\u2014';
  return `${(r * 100).toFixed(0)}%`;
}

function pretty(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/* Pill toggle (reusable)                                              */
/* ------------------------------------------------------------------ */
function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {options.map((t) => {
        const active = value === t.v;
        return (
          <Box
            key={t.v}
            component="button"
            onClick={() => onChange(t.v)}
            sx={{
              border: 'none',
              cursor: 'pointer',
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: 13,
              textTransform: 'none',
              px: 2,
              py: 0.75,
              lineHeight: 1,
              bgcolor: active ? INK : 'transparent',
              color: active ? '#fff' : SUBTLE,
              transition: 'all .15s ease',
              '&:hover': {
                bgcolor: active ? INK : 'rgba(14,17,22,0.05)',
                color: active ? '#fff' : INK,
              },
            }}
          >
            {t.label}
          </Box>
        );
      })}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */
export default function AttributionPage() {
  const { activeWorkspace } = useAuth();

  const [summary, setSummary] = useState<AttributionSummary | null>(null);
  const [pathData, setPathData] = useState<PathExplorerData | null>(null);
  const [compData, setCompData] = useState<ModelComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [model, setModel] = useState<AttrModel>('linear');
  const [dashTab, setDashTab] = useState<DashTab>('overview');

  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);

  // Path explorer dialog
  const [pathOpen, setPathOpen] = useState(false);

  // Add event dialog
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'single' | 'bulk'>('single');
  const [saving, setSaving] = useState(false);
  const [contactRef, setContactRef] = useState('');
  const [channel, setChannel] = useState<RevenueChannel>('linkedin');
  const [stage, setStage] = useState<RevenueStage>('lead');
  const [campaign, setCampaign] = useState('');
  const [value, setValue] = useState('');
  const [cost, setCost] = useState('');
  const [bulkText, setBulkText] = useState('');

  const load = () => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([
      Attribution.summary().catch(() => null),
      Attribution.paths().catch(() => null),
      Attribution.comparison().catch(() => null),
    ]).then(([s, p, c]) => {
      setSummary(s);
      setPathData(p);
      setCompData(c);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  useEffect(() => {
    if (dashTab === 'events' && activeWorkspace) {
      setEventsLoading(true);
      Attribution.events({ limit: 200 })
        .then(setEvents)
        .catch(() => setEvents([]))
        .finally(() => setEventsLoading(false));
    }
  }, [dashTab, activeWorkspace]);

  const deleteEvent = async (id: string) => {
    setDeletingEvent(id);
    try {
      await Attribution.remove(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setToast('Event deleted');
      load();
    } catch {
      setToast('Failed to delete event');
    } finally {
      setDeletingEvent(null);
    }
  };

  const totals = summary?.totals;
  const channels = useMemo(
    () =>
      (summary?.channels ?? [])
        .slice()
        .sort((a, b) => (b.attributed_revenue[model] ?? 0) - (a.attributed_revenue[model] ?? 0)),
    [summary, model],
  );
  const maxAttr = useMemo(
    () => Math.max(1, ...channels.map((c) => c.attributed_revenue[model] ?? 0)),
    [channels, model],
  );
  const hasData = (summary?.channels?.length ?? 0) > 0;
  const lowData = summary?.low_data ?? {};

  const resetForm = () => {
    setContactRef('');
    setChannel('linkedin');
    setStage('lead');
    setCampaign('');
    setValue('');
    setCost('');
    setBulkText('');
    setTab('single');
  };

  const submitSingle = async () => {
    if (!contactRef.trim()) {
      setToast('Contact reference is required.');
      return;
    }
    setSaving(true);
    try {
      const body: RevenueEventInput = {
        contact_ref: contactRef.trim(),
        channel,
        stage,
        campaign: campaign.trim() || null,
        value: value ? Number(value) : 0,
        cost: cost ? Number(cost) : 0,
      };
      await Attribution.create(body);
      setToast('Revenue event added.');
      setOpen(false);
      resetForm();
      load();
    } catch {
      setToast('Failed to add event.');
    } finally {
      setSaving(false);
    }
  };

  const submitBulk = async () => {
    const rows = parseBulk(bulkText);
    if (!rows.length) {
      setToast('No valid rows. Format: contact_ref, channel, stage, value, cost, campaign');
      return;
    }
    setSaving(true);
    try {
      const res = await Attribution.createBulk(rows);
      setToast(`Imported ${res.created} event${res.created === 1 ? '' : 's'}.`);
      setOpen(false);
      resetForm();
      load();
    } catch {
      setToast('Bulk import failed. Check channel/stage values.');
    } finally {
      setSaving(false);
    }
  };

  /* ---- recharts data for channel bar chart ---- */
  const barData = useMemo(() =>
    channels.map((c) => ({
      channel: pretty(c.channel),
      value: Math.round(c.attributed_revenue[model] ?? 0),
      color: CHANNEL_COLOR[c.channel] ?? SUBTLE,
    })),
    [channels, model],
  );

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2.5, px: 0.5 }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.12,
              fontSize: { xs: 28, md: 38 },
              color: INK,
            }}
          >
            Revenue{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Attribution
            </Box>
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, maxWidth: 640 }}>
            See exactly which channels create pipeline and closed revenue. Seven attribution models
            including Markov chain and Shapley value — all computed from real journeys.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{
            px: 2.5,
            py: 1.25,
            borderRadius: '999px',
            fontWeight: 700,
            color: '#fff',
            background: INK,
            backgroundImage: 'none',
            textTransform: 'none',
            boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
            '&:hover': { background: '#1B2330', backgroundImage: 'none' },
          }}
        >
          Add revenue
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={28} sx={{ color: BRAND.teal }} />
        </Box>
      ) : !hasData ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <Stack spacing={2.5}>
          {/* Tab selector */}
          <PillToggle<DashTab>
            options={[
              { v: 'overview', label: 'Overview' },
              { v: 'comparison', label: 'Model Comparison' },
              { v: 'paths', label: 'Path Explorer' },
              { v: 'events', label: 'Events' },
            ]}
            value={dashTab}
            onChange={setDashTab}
          />

          {dashTab === 'overview' && (
            <>
              {/* KPI cards */}
              <Grid container spacing={2.5}>
                <KpiCard icon={<EmojiEventsIcon fontSize="small" />} label="Closed Revenue" value={fmtMoney(totals?.revenue ?? 0)} accent={BRAND.teal} />
                <KpiCard icon={<TimelineIcon fontSize="small" />} label="Open Pipeline" value={fmtMoney(totals?.pipeline ?? 0)} accent="#2563EB" />
                <KpiCard icon={<PaidIcon fontSize="small" />} label="Total Cost" value={fmtMoney(totals?.cost ?? 0)} accent={BRAND.amber} />
                <KpiCard icon={<EmojiEventsIcon fontSize="small" />} label="Deals Won" value={String(totals?.deals_won ?? 0)} accent={BRAND.pink} />
                <KpiCard icon={<TrendingUpIcon fontSize="small" />} label="Blended ROI" value={fmtRoi(totals?.blended_roi ?? null)} accent="#7C3AED" />
              </Grid>

              <Grid container spacing={2.5}>
                {/* Channel attribution with model selector */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <SoftCard sx={{ height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.25 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Channel Attribution</Typography>
                      <PillToggle<AttrModel> options={ALL_MODELS} value={model} onChange={setModel} />
                    </Stack>

                    {lowData[model] && (
                      <Alert severity="warning" sx={{ borderRadius: 2, mb: 2, fontSize: 13 }}>
                        Insufficient conversion paths for {pretty(model)} — add more journey data for accurate results.
                      </Alert>
                    )}

                    {/* Recharts bar chart */}
                    {barData.length > 0 && (
                      <Box sx={{ width: '100%', height: 220, mb: 2.5 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                            <XAxis type="number" tick={{ fontSize: 12, fill: SUBTLE }} tickFormatter={(v: number) => fmtMoney(v)} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="channel" tick={{ fontSize: 12, fill: INK, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                            <RTooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                              {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    )}

                    <Stack spacing={2}>
                      {channels.map((c) => {
                        const attr = c.attributed_revenue[model] ?? 0;
                        const color = CHANNEL_COLOR[c.channel] ?? SUBTLE;
                        const roi = model === 'last_touch' ? c.roi_last_touch : c.roi_linear;
                        return (
                          <Box key={c.channel}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                                <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>{pretty(c.channel)}</Typography>
                                <Chip
                                  size="small"
                                  label={`ROI ${fmtRoi(roi)}`}
                                  sx={{
                                    height: 20, fontSize: 11, fontWeight: 700,
                                    color: roi && roi >= 0 ? BRAND.tealDeep : SUBTLE,
                                    bgcolor: roi && roi >= 0 ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                                  }}
                                />
                              </Stack>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: INK }}>{fmtMoney(attr)}</Typography>
                            </Stack>
                            <Box sx={{ height: 6, borderRadius: '999px', bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${Math.min(100, (attr / maxAttr) * 100)}%`, borderRadius: '999px', bgcolor: color, transition: 'width .4s ease' }} />
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </SoftCard>
                </Grid>

                {/* Funnel */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <SoftCard sx={{ height: '100%' }}>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2.25 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(14,17,22,0.05)', color: INK }}>
                        <GroupsIcon fontSize="small" />
                      </Box>
                      <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Conversion Funnel</Typography>
                    </Stack>
                    <Funnel funnel={summary?.funnel ?? {}} />
                  </SoftCard>
                </Grid>
              </Grid>

              {/* Detail table */}
              <SoftCard sx={{ p: 0 }}>
                <Box sx={{ p: 2.5, pb: 1.75 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Channel Breakdown</Typography>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow sx={{ '& th': { color: SUBTLE, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${LINE}`, py: 1.5 } }}>
                        <TableCell>Channel</TableCell>
                        <TableCell align="right">Touches</TableCell>
                        <TableCell align="right">Leads</TableCell>
                        <TableCell align="right">Won</TableCell>
                        <TableCell align="right">Pipeline</TableCell>
                        <TableCell align="right">Cost</TableCell>
                        <TableCell align="right">First</TableCell>
                        <TableCell align="right">Last</TableCell>
                        <TableCell align="right">Linear</TableCell>
                        <TableCell align="right">T-Decay</TableCell>
                        <TableCell align="right">U-Shape</TableCell>
                        <TableCell align="right">Markov</TableCell>
                        <TableCell align="right">Shapley</TableCell>
                        <TableCell align="right">ROI</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {channels.map((c) => (
                        <TableRow key={c.channel} sx={{ '& td': { borderBottom: `1px solid ${LINE}`, py: 1.5 }, '&:last-of-type td': { borderBottom: 'none' }, '&:hover': { bgcolor: 'rgba(14,17,22,0.02)' } }}>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CHANNEL_COLOR[c.channel] ?? SUBTLE }} />
                              <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>{pretty(c.channel)}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{c.touches}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{c.leads}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{c.deals_won}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.pipeline)}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.cost)}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.attributed_revenue.first_touch ?? 0)}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.attributed_revenue.last_touch ?? 0)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: INK }}>{fmtMoney(c.attributed_revenue.linear ?? 0)}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.attributed_revenue.time_decay ?? 0)}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.attributed_revenue.position_based ?? 0)}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.attributed_revenue.markov ?? 0)}</TableCell>
                          <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.attributed_revenue.shapley ?? 0)}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 700, color: c.roi_linear && c.roi_linear >= 0 ? BRAND.tealDeep : SUBTLE }}>{fmtRoi(c.roi_linear)}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </SoftCard>
            </>
          )}

          {/* Model Comparison */}
          {dashTab === 'comparison' && (
            <ModelComparisonView data={compData} />
          )}

          {/* Path Explorer */}
          {dashTab === 'paths' && (
            <PathExplorerView data={pathData} onOpenDetail={() => setPathOpen(true)} />
          )}

          {/* Events audit */}
          {dashTab === 'events' && (
            <SoftCard sx={{ p: 0 }}>
              <Box sx={{ p: 2.5, pb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: INK, fontSize: 18 }}>
                  Revenue events
                </Typography>
                <Typography variant="body2" sx={{ color: SUBTLE, mt: 0.25 }}>
                  Audit and correct attribution input data
                </Typography>
              </Box>
              {eventsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={28} sx={{ color: BRAND.teal }} />
                </Box>
              ) : events.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: SUBTLE }}>
                    No revenue events recorded yet.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { color: SUBTLE, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${LINE}`, py: 1.5 } }}>
                        <TableCell>Contact</TableCell>
                        <TableCell>Channel</TableCell>
                        <TableCell>Stage</TableCell>
                        <TableCell>Campaign</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell align="right">Cost</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {events.map((ev) => (
                        <TableRow key={ev.id} sx={{ '& td': { borderBottom: `1px solid ${LINE}`, py: 1.25 }, '&:hover': { bgcolor: 'rgba(14,17,22,0.02)' } }}>
                          <TableCell sx={{ fontWeight: 600, color: INK }}>{ev.contact_ref}</TableCell>
                          <TableCell>
                            <Chip size="small" label={pretty(ev.channel)} sx={{ fontSize: 12, fontWeight: 600, bgcolor: CHANNEL_COLOR[ev.channel] ? `${CHANNEL_COLOR[ev.channel]}18` : 'rgba(14,17,22,0.05)', color: CHANNEL_COLOR[ev.channel] ?? INK }} />
                          </TableCell>
                          <TableCell sx={{ color: INK }}>{pretty(ev.stage)}</TableCell>
                          <TableCell sx={{ color: SUBTLE }}>{ev.campaign ?? '\u2014'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: INK }}>{fmtMoney(ev.value)}</TableCell>
                          <TableCell align="right" sx={{ color: SUBTLE }}>{fmtMoney(ev.cost)}</TableCell>
                          <TableCell sx={{ color: SUBTLE, whiteSpace: 'nowrap' }}>
                            {new Date(ev.occurred_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              disabled={deletingEvent === ev.id}
                              onClick={() => deleteEvent(ev.id)}
                              sx={{ color: SUBTLE, '&:hover': { color: BRAND.pink } }}
                            >
                              {deletingEvent === ev.id ? (
                                <CircularProgress size={16} sx={{ color: BRAND.pink }} />
                              ) : (
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              )}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </SoftCard>
          )}
        </Stack>
      )}

      {/* Path detail dialog */}
      <PremiumDialog open={pathOpen} onClose={() => setPathOpen(false)} maxWidth="lg">
        <DialogHero icon={<RouteIcon />} title="Conversion Paths" subtitle="All converting journeys with channel sequence, count and value." onClose={() => setPathOpen(false)} tint={BRAND.teal} tintSoft={BRAND.tealSoft} />
        <DialogBody>
          {pathData && pathData.top_paths.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: SUBTLE, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${LINE}`, py: 1.5 } }}>
                    <TableCell>Path</TableCell>
                    <TableCell align="right">Conversions</TableCell>
                    <TableCell align="right">Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pathData.top_paths.map((p, i) => (
                    <TableRow key={i} sx={{ '& td': { borderBottom: `1px solid ${LINE}`, py: 1.25 }, '&:hover': { bgcolor: 'rgba(14,17,22,0.02)' } }}>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          {p.path.map((ch, j) => (
                            <Chip key={j} size="small" label={pretty(ch)} sx={{ fontSize: 12, fontWeight: 600, bgcolor: CHANNEL_COLOR[ch] ? `${CHANNEL_COLOR[ch]}18` : 'rgba(14,17,22,0.05)', color: CHANNEL_COLOR[ch] ?? INK }} />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: INK }}>{p.conversions}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: INK }}>{fmtMoney(p.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No converting paths yet.</Typography>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setPathOpen(false)} sx={ghostPillSx}>Close</Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Add event dialog */}
      <PremiumDialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<PaymentsRoundedIcon />}
          title="Add revenue event"
          subtitle="Log a touch or import a batch to stitch the journey."
          onClose={() => !saving && setOpen(false)}
        />
        <DialogBody>
          <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
            {([
              { v: 'single', label: 'Single' },
              { v: 'bulk', label: 'Bulk import' },
            ] as { v: 'single' | 'bulk'; label: string }[]).map((t) => {
              const active = tab === t.v;
              return (
                <Box
                  key={t.v}
                  component="button"
                  onClick={() => setTab(t.v)}
                  sx={{
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '999px',
                    fontWeight: 600,
                    fontSize: 13.5,
                    textTransform: 'none',
                    px: 2.25,
                    py: 0.85,
                    lineHeight: 1,
                    bgcolor: active ? INK : 'transparent',
                    color: active ? '#fff' : SUBTLE,
                    transition: 'all .15s ease',
                    '&:hover': {
                      bgcolor: active ? INK : 'rgba(14,17,22,0.05)',
                      color: active ? '#fff' : INK,
                    },
                  }}
                >
                  {t.label}
                </Box>
              );
            })}
          </Stack>
          {tab === 'single' ? (
            <>
              <SectionLabel>Touch details</SectionLabel>
              <FieldGrid columns={2}>
                <FullSpan>
                  <TextField
                    label="Contact reference"
                    placeholder="e.g. acme-cfo or lead@acme.com"
                    value={contactRef}
                    onChange={(e) => setContactRef(e.target.value)}
                    fullWidth
                    size="small"
                    helperText="The person/account this touch belongs to. Used to stitch the journey."
                  />
                </FullSpan>
                <TextField
                  select
                  label="Channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as RevenueChannel)}
                  fullWidth
                  size="small"
                >
                  {CHANNELS.map((c) => (
                    <MenuItem key={c} value={c}>{pretty(c)}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value as RevenueStage)}
                  fullWidth
                  size="small"
                >
                  {STAGES.map((s) => (
                    <MenuItem key={s} value={s}>{pretty(s)}</MenuItem>
                  ))}
                </TextField>
                <FullSpan>
                  <TextField
                    label="Campaign (optional)"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </FullSpan>
                <TextField
                  label="Value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="Deal value (for won/pipeline stages)"
                />
                <TextField
                  label="Cost"
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="Spend attributed to this touch"
                />
              </FieldGrid>
            </>
          ) : (
            <>
              <SectionLabel>Bulk import</SectionLabel>
              <Stack spacing={1.5}>
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  One event per line:{' '}
                  <code>contact_ref, channel, stage, value, cost, campaign</code>. Channel &amp; stage
                  must be valid values. Up to 1000 rows.
                </Alert>
                <TextField
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={'acme-cfo, linkedin, lead, 0, 50, Q1 ABM\nacme-cfo, content, closed_won, 24000, 0, Q1 ABM'}
                  multiline
                  minRows={8}
                  fullWidth
                  size="small"
                  sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
                />
              </Stack>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} disabled={saving} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={tab === 'single' ? submitSingle : submitBulk}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            {saving ? 'Saving\u2026' : tab === 'single' ? 'Add event' : 'Import'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast(null)} severity="info" sx={{ borderRadius: 2 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Model Comparison View                                                */
/* ------------------------------------------------------------------ */
function ModelComparisonView({ data }: { data: ModelComparisonData | null }) {
  if (!data || data.channels.length === 0) {
    return (
      <SoftCard sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">No comparison data available.</Typography>
      </SoftCard>
    );
  }

  const models = data.models;
  const labels = data.model_labels;
  const lowData = data.low_data ?? {};

  // Recharts grouped bar data
  const chartData = data.channels.map((row) => {
    const d: Record<string, string | number> = { channel: pretty(String(row.channel)) };
    for (const m of models) {
      d[m] = Math.round(Number(row[m] ?? 0));
    }
    return d;
  });

  return (
    <Stack spacing={2.5}>
      <SoftCard>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(14,17,22,0.05)', color: INK }}>
            <CompareArrowsIcon fontSize="small" />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Model Comparison</Typography>
        </Stack>

        {(lowData.markov || lowData.shapley) && (
          <Alert severity="info" sx={{ borderRadius: 2, mb: 2, fontSize: 13 }}>
            {lowData.markov && lowData.shapley
              ? 'Markov and Shapley models have insufficient data (low_data flag).'
              : lowData.markov
                ? 'Markov model has insufficient data for reliable results.'
                : 'Shapley model has insufficient data for reliable results.'}
          </Alert>
        )}

        <Box sx={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
              <XAxis dataKey="channel" tick={{ fontSize: 12, fill: INK, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: SUBTLE }} tickFormatter={(v: number) => fmtMoney(v)} axisLine={false} tickLine={false} />
              <RTooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }} />
              {models.map((m) => (
                <Bar key={m} dataKey={m} name={labels[m] ?? m} fill={MODEL_COLORS[m] ?? SUBTLE} radius={[4, 4, 0, 0]} barSize={12} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </SoftCard>

      {/* Comparison table */}
      <SoftCard sx={{ p: 0 }}>
        <Box sx={{ p: 2.5, pb: 1.75 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Credit Matrix</Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ '& th': { color: SUBTLE, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${LINE}`, py: 1.5 } }}>
                <TableCell>Channel</TableCell>
                {models.map((m) => (
                  <TableCell key={m} align="right">{labels[m] ?? pretty(m)}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.channels.map((row, i) => (
                <TableRow key={i} sx={{ '& td': { borderBottom: `1px solid ${LINE}`, py: 1.5 }, '&:last-of-type td': { borderBottom: 'none' }, '&:hover': { bgcolor: 'rgba(14,17,22,0.02)' } }}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CHANNEL_COLOR[String(row.channel)] ?? SUBTLE }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>{pretty(String(row.channel))}</Typography>
                    </Stack>
                  </TableCell>
                  {models.map((m) => (
                    <TableCell key={m} align="right" sx={{ color: INK, fontWeight: 600 }}>{fmtMoney(Number(row[m] ?? 0))}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </SoftCard>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Path Explorer View                                                   */
/* ------------------------------------------------------------------ */
function PathExplorerView({ data, onOpenDetail }: { data: PathExplorerData | null; onOpenDetail: () => void }) {
  if (!data) {
    return (
      <SoftCard sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">No path data available.</Typography>
      </SoftCard>
    );
  }

  const lengthChart = data.path_length_distribution.map((d) => ({
    name: `${d.length} steps`,
    count: d.count,
  }));
  const ttcChart = data.time_to_convert_distribution.map((d) => ({
    name: d.range,
    count: d.count,
  }));

  return (
    <Stack spacing={2.5}>
      {/* KPI row */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SoftCard>
            <Typography sx={{ color: SUBTLE, fontWeight: 700, fontSize: 13 }}>Converting Paths</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: INK, mt: 0.5 }}>{data.total_converting_paths}</Typography>
          </SoftCard>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SoftCard>
            <Typography sx={{ color: SUBTLE, fontWeight: 700, fontSize: 13 }}>Avg Path Length</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: INK, mt: 0.5 }}>{data.avg_path_length} steps</Typography>
          </SoftCard>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SoftCard>
            <Typography sx={{ color: SUBTLE, fontWeight: 700, fontSize: 13 }}>Avg Time to Convert</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: INK, mt: 0.5 }}>{data.avg_time_to_convert_days}d</Typography>
          </SoftCard>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SoftCard sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Button onClick={onOpenDetail} startIcon={<RouteIcon />} sx={{ ...inkPillSx, width: '100%' }}>View all paths</Button>
          </SoftCard>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Path length distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SoftCard>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 2 }}>Path Length Distribution</Typography>
            <Box sx={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lengthChart} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: INK }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: SUBTLE }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }} />
                  <Bar dataKey="count" fill={BRAND.teal} radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </SoftCard>
        </Grid>
        {/* Time to convert distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SoftCard>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 2 }}>Time to Convert</Typography>
            <Box sx={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ttcChart} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: INK }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12, fill: SUBTLE }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 13 }} />
                  <Bar dataKey="count" fill={BRAND.amber} radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </SoftCard>
        </Grid>
      </Grid>

      {/* Top paths table */}
      <SoftCard sx={{ p: 0 }}>
        <Box sx={{ p: 2.5, pb: 1.75 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>Top Conversion Paths</Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow sx={{ '& th': { color: SUBTLE, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${LINE}`, py: 1.5 } }}>
                <TableCell>Path</TableCell>
                <TableCell align="right">Conversions</TableCell>
                <TableCell align="right">Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.top_paths.slice(0, 15).map((p, i) => (
                <TableRow key={i} sx={{ '& td': { borderBottom: `1px solid ${LINE}`, py: 1.25 }, '&:last-of-type td': { borderBottom: 'none' }, '&:hover': { bgcolor: 'rgba(14,17,22,0.02)' } }}>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {p.path.map((ch, j) => (
                        <Chip key={j} size="small" label={pretty(ch)} sx={{ fontSize: 12, fontWeight: 600, bgcolor: CHANNEL_COLOR[ch] ? `${CHANNEL_COLOR[ch]}18` : 'rgba(14,17,22,0.05)', color: CHANNEL_COLOR[ch] ?? INK }} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: INK }}>{p.conversions}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: INK }}>{fmtMoney(p.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </SoftCard>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Shared components                                                    */
/* ------------------------------------------------------------------ */
function SoftCard({ children, sx }: { children: React.ReactNode; sx?: SxProps<Theme> }) {
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

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
      <SoftCard sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(14,17,22,0.05)',
              color: INK,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent }} />
        </Stack>
        <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 13, mt: 1.75 }}>
          {label}
        </Typography>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 28,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: INK,
            mt: 0.5,
          }}
        >
          {value}
        </Typography>
      </SoftCard>
    </Grid>
  );
}

function Funnel({ funnel }: { funnel: Record<string, number> }) {
  const top = Math.max(1, funnel[FUNNEL_STAGES[0]] ?? 0);
  return (
    <Stack spacing={1.25}>
      {FUNNEL_STAGES.map((s, i) => {
        const count = funnel[s] ?? 0;
        const pct = Math.min(100, (count / top) * 100);
        const prev = i === 0 ? count : funnel[FUNNEL_STAGES[i - 1]] ?? 0;
        const conv = prev > 0 ? (count / prev) * 100 : 0;
        return (
          <Box key={s}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                {FUNNEL_LABEL[s]}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {i > 0 && (
                  <Typography variant="caption" sx={{ color: SUBTLE }}>
                    {conv.toFixed(0)}%
                  </Typography>
                )}
                <Typography variant="body2" sx={{ fontWeight: 800, color: INK }}>
                  {count}
                </Typography>
              </Stack>
            </Stack>
            <Box
              sx={{
                height: 24,
                borderRadius: '999px',
                bgcolor: 'rgba(14,17,22,0.06)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: '999px',
                  bgcolor: s === 'closed_won' ? BRAND.teal : INK,
                  opacity: s === 'closed_won' ? 1 : 0.35 + i * 0.16,
                  transition: 'width .4s ease',
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <SoftCard sx={{ py: 8, textAlign: 'center' }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '16px',
          bgcolor: 'rgba(14,17,22,0.05)',
          color: INK,
          display: 'grid',
          placeItems: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <AccountTreeIcon sx={{ fontSize: 32 }} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 800, color: INK }}>
        No revenue events yet
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460, mx: 'auto', mt: 1 }}>
        Add touches, leads, and closed deals — or bulk-import from your CRM — and we&apos;ll
        attribute every dollar of pipeline and revenue back to the channels that earned it.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAdd}
        sx={{
          mt: 3,
          px: 2.5,
          py: 1.25,
          borderRadius: '999px',
          background: INK,
          backgroundImage: 'none',
          textTransform: 'none',
          fontWeight: 700,
          color: '#fff',
          boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
          '&:hover': { background: '#1B2330', backgroundImage: 'none' },
        }}
      >
        Add your first event
      </Button>
    </SoftCard>
  );
}

function parseBulk(text: string): RevenueEventInput[] {
  const out: RevenueEventInput[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(',').map((p) => p.trim());
    const [contact_ref, channel, stage, value, cost, campaign] = parts;
    if (!contact_ref || !channel || !stage) continue;
    out.push({
      contact_ref,
      channel: channel as RevenueChannel,
      stage: stage as RevenueStage,
      value: value ? Number(value) || 0 : 0,
      cost: cost ? Number(cost) || 0 : 0,
      campaign: campaign || null,
    });
  }
  return out;
}
