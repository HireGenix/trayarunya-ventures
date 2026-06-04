'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTreeOutlined';
import PaidIcon from '@mui/icons-material/PaidOutlined';
import TimelineIcon from '@mui/icons-material/TimelineOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import GroupsIcon from '@mui/icons-material/Groups2Outlined';
import { useAuth } from '@/lib/auth';
import {
  Attribution,
  type AttributionSummary,
  type RevenueChannel,
  type RevenueStage,
  type RevenueEventInput,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

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

function fmtMoney(n: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

function fmtRoi(r: number | null): string {
  if (r === null || r === undefined) return '—';
  return `${(r * 100).toFixed(0)}%`;
}

function pretty(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type AttrModel = 'first_touch' | 'last_touch' | 'linear';

export default function AttributionPage() {
  const { activeWorkspace } = useAuth();

  const [summary, setSummary] = useState<AttributionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [model, setModel] = useState<AttrModel>('linear');

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
    Attribution.summary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  const totals = summary?.totals;
  const channels = useMemo(
    () =>
      (summary?.channels ?? [])
        .slice()
        .sort((a, b) => b.attributed_revenue[model] - a.attributed_revenue[model]),
    [summary, model],
  );
  const maxAttr = useMemo(
    () => Math.max(1, ...channels.map((c) => c.attributed_revenue[model])),
    [channels, model],
  );
  const hasData = (summary?.channels?.length ?? 0) > 0;

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

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <AccountTreeIcon sx={{ color: BRAND.teal }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: INK, letterSpacing: -0.5 }}>
              Revenue Attribution
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: SUBTLE, mt: 0.5, maxWidth: 640 }}>
            See exactly which channels create pipeline and closed revenue. Credit is computed from
            real touch-to-deal journeys — first-touch, last-touch, and linear models.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{
            bgcolor: INK,
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            '&:hover': { bgcolor: '#000' },
          }}
        >
          Add Revenue Event
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={28} sx={{ color: BRAND.teal }} />
        </Box>
      ) : !hasData ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <Stack spacing={3}>
          {/* KPI cards */}
          <Grid container spacing={2}>
            <KpiCard
              icon={<EmojiEventsIcon sx={{ color: BRAND.teal }} />}
              label="Closed Revenue"
              value={fmtMoney(totals?.revenue ?? 0)}
              accent={BRAND.teal}
            />
            <KpiCard
              icon={<TimelineIcon sx={{ color: '#2563EB' }} />}
              label="Open Pipeline"
              value={fmtMoney(totals?.pipeline ?? 0)}
              accent="#2563EB"
            />
            <KpiCard
              icon={<PaidIcon sx={{ color: BRAND.amber }} />}
              label="Total Cost"
              value={fmtMoney(totals?.cost ?? 0)}
              accent={BRAND.amber}
            />
            <KpiCard
              icon={<EmojiEventsIcon sx={{ color: BRAND.pink }} />}
              label="Deals Won"
              value={String(totals?.deals_won ?? 0)}
              accent={BRAND.pink}
            />
            <KpiCard
              icon={<TrendingUpIcon sx={{ color: '#7C3AED' }} />}
              label="Blended ROI"
              value={fmtRoi(totals?.blended_roi ?? null)}
              accent="#7C3AED"
            />
          </Grid>

          <Grid container spacing={3}>
            {/* Channel attribution */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: INK }}>
                      Channel Attribution
                    </Typography>
                    <Tabs
                      value={model}
                      onChange={(_, v) => setModel(v)}
                      sx={{
                        minHeight: 0,
                        '& .MuiTab-root': {
                          minHeight: 0,
                          py: 0.75,
                          px: 1.25,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: 13,
                          color: SUBTLE,
                        },
                        '& .Mui-selected': { color: `${INK} !important` },
                        '& .MuiTabs-indicator': { bgcolor: BRAND.teal },
                      }}
                    >
                      <Tab value="linear" label="Linear" />
                      <Tab value="first_touch" label="First" />
                      <Tab value="last_touch" label="Last" />
                    </Tabs>
                  </Stack>

                  <Stack spacing={1.75}>
                    {channels.map((c) => {
                      const attr = c.attributed_revenue[model];
                      const color = CHANNEL_COLOR[c.channel] ?? SUBTLE;
                      const roi = model === 'last_touch' ? c.roi_last_touch : c.roi_linear;
                      return (
                        <Box key={c.channel}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 0.5 }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                              <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                                {pretty(c.channel)}
                              </Typography>
                              <Chip
                                size="small"
                                label={`ROI ${fmtRoi(roi)}`}
                                sx={{
                                  height: 20,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: roi && roi >= 0 ? BRAND.teal : SUBTLE,
                                  bgcolor: roi && roi >= 0 ? `${BRAND.teal}14` : '#F3F4F6',
                                }}
                              />
                            </Stack>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: INK }}>
                              {fmtMoney(attr)}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (attr / maxAttr) * 100)}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: '#F1F3F5',
                              '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Funnel */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <GroupsIcon sx={{ color: '#2563EB' }} fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: INK }}>
                      Conversion Funnel
                    </Typography>
                  </Stack>
                  <Funnel funnel={summary?.funnel ?? {}} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detail table */}
          <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 2.5, pb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: INK }}>
                  Channel Breakdown
                </Typography>
              </Box>
              <Divider sx={{ borderColor: BORDER }} />
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 760 }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { color: SUBTLE, fontWeight: 700, borderColor: BORDER } }}>
                      <TableCell>Channel</TableCell>
                      <TableCell align="right">Touches</TableCell>
                      <TableCell align="right">Leads</TableCell>
                      <TableCell align="right">Won</TableCell>
                      <TableCell align="right">Pipeline</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">First-Touch</TableCell>
                      <TableCell align="right">Last-Touch</TableCell>
                      <TableCell align="right">Linear</TableCell>
                      <TableCell align="right">ROI</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {channels.map((c) => (
                      <TableRow key={c.channel} sx={{ '& td': { borderColor: BORDER } }}>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: CHANNEL_COLOR[c.channel] ?? SUBTLE,
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                              {pretty(c.channel)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right" sx={{ color: INK }}>{c.touches}</TableCell>
                        <TableCell align="right" sx={{ color: INK }}>{c.leads}</TableCell>
                        <TableCell align="right" sx={{ color: INK }}>{c.deals_won}</TableCell>
                        <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.pipeline)}</TableCell>
                        <TableCell align="right" sx={{ color: INK }}>{fmtMoney(c.cost)}</TableCell>
                        <TableCell align="right" sx={{ color: INK }}>
                          {fmtMoney(c.attributed_revenue.first_touch)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: INK }}>
                          {fmtMoney(c.attributed_revenue.last_touch)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: INK }}>
                          {fmtMoney(c.attributed_revenue.linear)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: c.roi_linear && c.roi_linear >= 0 ? BRAND.teal : SUBTLE,
                            }}
                          >
                            {fmtRoi(c.roi_linear)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Add event dialog */}
      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: INK }}>Add Revenue Event</DialogTitle>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 3,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, color: SUBTLE },
            '& .Mui-selected': { color: `${INK} !important` },
            '& .MuiTabs-indicator': { bgcolor: BRAND.teal },
          }}
        >
          <Tab value="single" label="Single" />
          <Tab value="bulk" label="Bulk import" />
        </Tabs>
        <DialogContent>
          {tab === 'single' ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Contact reference"
                placeholder="e.g. acme-cfo or lead@acme.com"
                value={contactRef}
                onChange={(e) => setContactRef(e.target.value)}
                fullWidth
                size="small"
                helperText="The person/account this touch belongs to. Used to stitch the journey."
              />
              <Stack direction="row" spacing={2}>
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
              </Stack>
              <TextField
                label="Campaign (optional)"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                fullWidth
                size="small"
              />
              <Stack direction="row" spacing={2}>
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
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
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
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving} sx={{ textTransform: 'none', color: SUBTLE }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={tab === 'single' ? submitSingle : submitBulk}
            disabled={saving}
            sx={{ bgcolor: INK, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#000' } }}
          >
            {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : tab === 'single' ? 'Add Event' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

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
      <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3, height: '100%' }}>
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: `${accent}14`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.25,
            }}
          >
            {icon}
          </Box>
          <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: INK, letterSpacing: -0.5 }}>
            {value}
          </Typography>
        </CardContent>
      </Card>
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
                height: 26,
                borderRadius: 1.5,
                bgcolor: '#F1F3F5',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${pct}%`,
                  bgcolor: s === 'closed_won' ? BRAND.teal : '#2563EB',
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
    <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3, bgcolor: CANVAS }}>
      <CardContent sx={{ py: 8, textAlign: 'center' }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 3,
            bgcolor: `${BRAND.teal}14`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <AccountTreeIcon sx={{ color: BRAND.teal, fontSize: 32 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: INK }}>
          No revenue events yet
        </Typography>
        <Typography variant="body2" sx={{ color: SUBTLE, maxWidth: 460, mx: 'auto', mt: 1 }}>
          Add touches, leads, and closed deals — or bulk-import from your CRM — and we&apos;ll
          attribute every dollar of pipeline and revenue back to the channels that earned it.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{
            mt: 3,
            bgcolor: INK,
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            '&:hover': { bgcolor: '#000' },
          }}
        >
          Add your first event
        </Button>
      </CardContent>
    </Card>
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
