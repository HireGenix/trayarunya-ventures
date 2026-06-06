'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
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
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTreeOutlined';
import PaidIcon from '@mui/icons-material/PaidOutlined';
import TimelineIcon from '@mui/icons-material/TimelineOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import GroupsIcon from '@mui/icons-material/Groups2Outlined';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
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
  type RevenueChannel,
  type RevenueStage,
  type RevenueEventInput,
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
            See exactly which channels create pipeline and closed revenue. Credit is computed from
            real touch-to-deal journeys — first-touch, last-touch, and linear models.
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
          {/* KPI cards */}
          <Grid container spacing={2.5}>
            <KpiCard
              icon={<EmojiEventsIcon fontSize="small" />}
              label="Closed Revenue"
              value={fmtMoney(totals?.revenue ?? 0)}
              accent={BRAND.teal}
            />
            <KpiCard
              icon={<TimelineIcon fontSize="small" />}
              label="Open Pipeline"
              value={fmtMoney(totals?.pipeline ?? 0)}
              accent="#2563EB"
            />
            <KpiCard
              icon={<PaidIcon fontSize="small" />}
              label="Total Cost"
              value={fmtMoney(totals?.cost ?? 0)}
              accent={BRAND.amber}
            />
            <KpiCard
              icon={<EmojiEventsIcon fontSize="small" />}
              label="Deals Won"
              value={String(totals?.deals_won ?? 0)}
              accent={BRAND.pink}
            />
            <KpiCard
              icon={<TrendingUpIcon fontSize="small" />}
              label="Blended ROI"
              value={fmtRoi(totals?.blended_roi ?? null)}
              accent="#7C3AED"
            />
          </Grid>

          <Grid container spacing={2.5}>
            {/* Channel attribution */}
            <Grid size={{ xs: 12, md: 7 }}>
              <SoftCard sx={{ height: '100%' }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2.25 }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>
                    Channel Attribution
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {([
                      { v: 'linear', label: 'Linear' },
                      { v: 'first_touch', label: 'First' },
                      { v: 'last_touch', label: 'Last' },
                    ] as { v: AttrModel; label: string }[]).map((t) => {
                      const active = model === t.v;
                      return (
                        <Box
                          key={t.v}
                          component="button"
                          onClick={() => setModel(t.v)}
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
                </Stack>

                <Stack spacing={2}>
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
                          sx={{ mb: 0.75 }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
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
                                color: roi && roi >= 0 ? BRAND.tealDeep : SUBTLE,
                                bgcolor: roi && roi >= 0 ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                              }}
                            />
                          </Stack>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: INK }}>
                            {fmtMoney(attr)}
                          </Typography>
                        </Stack>
                        <Box
                          sx={{
                            height: 6,
                            borderRadius: '999px',
                            bgcolor: 'rgba(14,17,22,0.06)',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${Math.min(100, (attr / maxAttr) * 100)}%`,
                              borderRadius: '999px',
                              bgcolor: color,
                              transition: 'width .4s ease',
                            }}
                          />
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
                    <GroupsIcon fontSize="small" />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>
                    Conversion Funnel
                  </Typography>
                </Stack>
                <Funnel funnel={summary?.funnel ?? {}} />
              </SoftCard>
            </Grid>
          </Grid>

          {/* Detail table */}
          <SoftCard sx={{ p: 0 }}>
            <Box sx={{ p: 2.5, pb: 1.75 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>
                Channel Breakdown
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        color: SUBTLE,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        borderBottom: `1px solid ${LINE}`,
                        py: 1.5,
                      },
                    }}
                  >
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
                    <TableRow
                      key={c.channel}
                      sx={{
                        '& td': { borderBottom: `1px solid ${LINE}`, py: 1.5 },
                        '&:last-of-type td': { borderBottom: 'none' },
                        '&:hover': { bgcolor: 'rgba(14,17,22,0.02)' },
                      }}
                    >
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
                            color: c.roi_linear && c.roi_linear >= 0 ? BRAND.tealDeep : SUBTLE,
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
          </SoftCard>
        </Stack>
      )}

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
            {saving ? 'Saving…' : tab === 'single' ? 'Add event' : 'Import'}
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
