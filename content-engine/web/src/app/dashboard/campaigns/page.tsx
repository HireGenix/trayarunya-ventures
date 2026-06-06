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
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import { useAuth } from '@/lib/auth';
import { Campaigns, type CampaignPlan } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
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
  softPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';

const CHANNEL_OPTIONS = ['LinkedIn', 'Email', 'Instagram', 'Google Ads', 'Blog', 'X/Twitter', 'YouTube'];

const STATUS_OPTIONS: CampaignPlan['status'][] = ['draft', 'active', 'completed', 'archived'];

function statusChipSx(status: CampaignPlan['status']) {
  switch (status) {
    case 'active':
      return { bgcolor: `${BRAND.teal}1A`, color: BRAND.tealDeep, border: `1px solid ${BRAND.teal}40` };
    case 'completed':
      return { bgcolor: `${BRAND.amber}24`, color: BRAND.amberDeep, border: `1px solid ${BRAND.amber}55` };
    case 'archived':
      return { bgcolor: 'rgba(107,114,128,0.12)', color: '#6B7280', border: '1px solid #EAECEF' };
    case 'draft':
    default:
      return { bgcolor: 'rgba(17,21,27,0.05)', color: '#6B7280', border: '1px solid #EAECEF' };
  }
}

function fmtBudget(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function fmtDate(d: string): string {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return d;
  return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function titleize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function PlanValue({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined) {
    return <Typography variant="body2" color="text.disabled">—</Typography>;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <Typography variant="body2" sx={{ color: '#11151B', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
        {String(value)}
      </Typography>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Typography variant="body2" color="text.disabled">—</Typography>;
    }
    return (
      <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
        {value.map((item, i) => (
          <Box component="li" key={i} sx={{ color: '#6B7280' }}>
            <PlanValue value={item} depth={depth + 1} />
          </Box>
        ))}
      </Stack>
    );
  }
  if (isPlainObject(value)) {
    return <PlanObject obj={value} depth={depth + 1} />;
  }
  return (
    <Typography variant="body2" sx={{ color: '#11151B' }}>
      {String(value)}
    </Typography>
  );
}

function PlanObject({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return <Typography variant="body2" color="text.disabled">Nothing to show here yet.</Typography>;
  }
  return (
    <Stack spacing={depth === 0 ? 2.5 : 1.25}>
      {entries.map(([key, val]) => {
        const nested = isPlainObject(val) || Array.isArray(val);
        return (
          <Box
            key={key}
            sx={
              depth === 0
                ? {
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#FAFBFC',
                    border: '1px solid #EAECEF',
                  }
                : {
                    pl: depth > 1 ? 1.5 : 0,
                    borderLeft: depth > 1 ? '2px solid #EAECEF' : 'none',
                  }
            }
          >
            <Typography
              sx={{
                fontWeight: depth === 0 ? 900 : 800,
                fontSize: depth === 0 ? 14 : 12.5,
                color: depth === 0 ? '#11151B' : '#6B7280',
                textTransform: depth === 0 ? 'none' : 'uppercase',
                letterSpacing: depth === 0 ? 0 : 0.5,
                mb: nested ? 0.75 : 0.25,
              }}
            >
              {titleize(key)}
            </Typography>
            <PlanValue value={val} depth={depth} />
          </Box>
        );
      })}
    </Stack>
  );
}

export default function CampaignsPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const [campaigns, setCampaigns] = useState<CampaignPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const [viewing, setViewing] = useState<CampaignPlan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [goal, setGoal] = useState('');
  const [name, setName] = useState('');
  const [audience, setAudience] = useState('');
  const [offer, setOffer] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = () => {
    if (!activeWorkspace) return;
    setLoading(true);
    Campaigns.list()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  const resetForm = () => {
    setGoal('');
    setName('');
    setAudience('');
    setOffer('');
    setChannels([]);
    setBudget('');
    setStartDate('');
    setEndDate('');
  };

  const handleBuild = async () => {
    if (!goal.trim()) return;
    setBuilding(true);
    try {
      const budgetNum = budget.trim() ? Number(budget) : undefined;
      const created = await Campaigns.build({
        goal: goal.trim(),
        name: name.trim() || undefined,
        audience: audience.trim() || undefined,
        offer: offer.trim() || undefined,
        channels: channels.length ? channels : undefined,
        budget: budgetNum !== undefined && !Number.isNaN(budgetNum) ? budgetNum : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setCampaigns((prev) => [created, ...prev]);
      setOpen(false);
      resetForm();
      setToast({ msg: 'Campaign plan built!', severity: 'success' });
      setViewing(created);
    } catch {
      setToast({ msg: 'Failed to build campaign', severity: 'error' });
    } finally {
      setBuilding(false);
    }
  };

  const handleStatusChange = async (c: CampaignPlan, status: CampaignPlan['status']) => {
    setBusyId(c.id);
    try {
      const updated = await Campaigns.update(c.id, { status });
      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      setViewing((v) => (v && v.id === c.id ? updated : v));
    } catch {
      setToast({ msg: 'Failed to update status', severity: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleToContent = async (c: CampaignPlan) => {
    setBusyId(c.id);
    try {
      const res = await Campaigns.toContent(c.id);
      setToast({
        msg: `${res.count} draft${res.count === 1 ? '' : 's'} sent to Content Studio`,
        severity: 'success',
      });
    } catch {
      setToast({ msg: 'Failed to send to content', severity: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (c: CampaignPlan) => {
    const ok = await confirm({
      title: 'Delete campaign?',
      message: `"${c.name}" and its full plan will be permanently deleted.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await Campaigns.remove(c.id);
      setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
      setViewing((v) => (v && v.id === c.id ? null : v));
      setToast({ msg: 'Campaign deleted', severity: 'success' });
    } catch {
      setToast({ msg: 'Failed to delete campaign', severity: 'error' });
    }
  };

  const activeCount = useMemo(() => campaigns.filter((c) => c.status === 'active').length, [campaigns]);

  if (!activeWorkspace) {
    return (
      <Card sx={{ borderRadius: 4, border: '1px dashed rgba(17,21,27,0.18)' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
            <CampaignIcon sx={{ fontSize: 36, color: BRAND.teal }} />
          </Box>
          <Typography fontWeight={900} variant="h6">No workspace selected</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={380}>
            Choose or create a workspace to start architecting multi-channel campaigns.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* ── Hero ── */}
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
            <Chip icon={<AutoAwesomeIcon />} label="Campaign architect" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Campaign Builder
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 620 }}>
              Describe the goal — we architect a full multi-channel campaign plan, then turn it into content with one click.
            </Typography>
          </Box>
          <Stack spacing={1.2} sx={{ minWidth: { md: 260 } }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}
              sx={{ borderRadius: 3, py: 1.2, textTransform: 'none', fontWeight: 900, color: '#11151B', background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)` }}>
              Build campaign
            </Button>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{campaigns.length}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>Campaigns</Typography>
                </Box>
              </Grid>
              <Grid size={6}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{activeCount}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>Active</Typography>
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </Stack>
      </Box>

      {/* ── List ── */}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 200 }}><CircularProgress size={28} /></Box>
      ) : campaigns.length === 0 ? (
        <Card sx={{ borderRadius: 4, border: '1px dashed rgba(17,21,27,0.18)', overflow: 'hidden' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
              <CampaignIcon sx={{ fontSize: 36, color: BRAND.teal }} />
            </Box>
            <Typography fontWeight={900} variant="h6">No campaigns yet</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={380}>
              Describe your goal and we&apos;ll architect a complete multi-channel campaign plan — phases, messaging and a content calendar.
            </Typography>
            <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setOpen(true)} sx={{ mt: 1, borderRadius: 3, textTransform: 'none', fontWeight: 800 }}>
              Build first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {campaigns.map((c) => (
            <Grid key={c.id} size={{ xs: 12, md: 6 }}>
              <Card sx={{
                height: '100%', borderRadius: 4, border: '1px solid rgba(17,21,27,0.08)',
                boxShadow: '0 18px 45px rgba(17,21,27,0.06)',
                transition: 'transform .15s, box-shadow .15s',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 22px 55px rgba(17,21,27,0.12)' },
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{
                      width: 50, height: 50, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center',
                      background: 'linear-gradient(135deg, #14BB87 0%, #0d8f66 100%)',
                      boxShadow: '0 6px 18px rgba(20,187,135,0.35)',
                    }}>
                      <CampaignIcon sx={{ color: '#fff', fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography fontWeight={900} noWrap sx={{ maxWidth: '100%' }}>{c.name}</Typography>
                        <Chip label={c.status} size="small" sx={{ fontSize: 11, height: 22, fontWeight: 800, textTransform: 'capitalize', ...statusChipSx(c.status) }} />
                      </Stack>
                      {c.goal && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {c.goal}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  {c.channels && c.channels.length > 0 && (
                    <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1.5 }}>
                      {c.channels.map((ch) => (
                        <Chip key={ch} label={ch} size="small" variant="outlined"
                          sx={{ fontSize: 11, height: 22, fontWeight: 700, borderColor: '#EAECEF', color: '#6B7280' }} />
                      ))}
                    </Stack>
                  )}

                  <Stack direction="row" gap={2} sx={{ mt: 1.5 }} flexWrap="wrap">
                    {typeof c.budget === 'number' && (
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <PaymentsIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">{fmtBudget(c.budget)}</Typography>
                      </Stack>
                    )}
                    {(c.start_date || c.end_date) && (
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {c.start_date ? fmtDate(c.start_date) : '—'} → {c.end_date ? fmtDate(c.end_date) : '—'}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      <Button size="small" startIcon={<VisibilityIcon />} onClick={() => setViewing(c)}
                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 12 }}>
                        View plan
                      </Button>
                      <Button size="small" startIcon={busyId === c.id ? <CircularProgress size={13} color="inherit" /> : <SendIcon />}
                        onClick={() => handleToContent(c)} disabled={busyId === c.id}
                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 12, color: BRAND.tealDeep }}>
                        Send to Content
                      </Button>
                    </Stack>
                    <Stack direction="row" gap={0.75} alignItems="center">
                      <Select
                        size="small"
                        value={c.status}
                        onChange={(e: SelectChangeEvent) => handleStatusChange(c, e.target.value as CampaignPlan['status'])}
                        disabled={busyId === c.id}
                        sx={{ fontSize: 12, height: 32, minWidth: 118, borderRadius: 2, textTransform: 'capitalize', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#EAECEF' } }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <MenuItem key={s} value={s} sx={{ fontSize: 13, textTransform: 'capitalize' }}>{s}</MenuItem>
                        ))}
                      </Select>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(c)} sx={{ borderRadius: 2, color: 'error.main' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Build dialog ── */}
      <PremiumDialog open={open} onClose={building ? () => {} : () => setOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<AutoAwesomeRoundedIcon />}
          title="Build a campaign"
          subtitle="Describe the goal — we architect the full multi-channel plan."
          onClose={building ? undefined : () => setOpen(false)}
        />
        <DialogBody>
          <SectionLabel>Strategy brief</SectionLabel>
          <FieldGrid>
            <FullSpan>
              <TextField label="Campaign goal" placeholder="e.g. Drive 200 demo signups for our new analytics suite in 6 weeks"
                value={goal} onChange={(e) => setGoal(e.target.value)} fullWidth size="small" autoFocus required multiline minRows={2} />
            </FullSpan>
            <FullSpan>
              <TextField label="Audience (optional)" placeholder="e.g. Heads of Growth at B2B SaaS, 50–500 employees"
                value={audience} onChange={(e) => setAudience(e.target.value)} fullWidth size="small" />
            </FullSpan>
            <FullSpan>
              <TextField label="Offer (optional)" placeholder="e.g. Free 30-day trial + onboarding workshop"
                value={offer} onChange={(e) => setOffer(e.target.value)} fullWidth size="small" />
            </FullSpan>
          </FieldGrid>

          <SectionLabel sx={{ mt: 2.5 }}>Channels</SectionLabel>
          <Select<string[]>
            multiple
            fullWidth
            size="small"
            displayEmpty
            value={channels}
            onChange={(e: SelectChangeEvent<string[]>) => setChannels(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            renderValue={(selected) =>
              selected.length === 0 ? (
                <Typography variant="body2" color="text.disabled">Select channels…</Typography>
              ) : (
                <Stack direction="row" gap={0.5} flexWrap="wrap">
                  {selected.map((s) => (
                    <Chip key={s} label={s} size="small" sx={{ fontSize: 11, height: 22, fontWeight: 700, bgcolor: `${BRAND.teal}14`, color: BRAND.tealDeep }} />
                  ))}
                </Stack>
              )
            }
            sx={{ borderRadius: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#EAECEF' } }}
          >
            {CHANNEL_OPTIONS.map((ch) => (
              <MenuItem key={ch} value={ch}>
                <ListItemText primary={ch} />
              </MenuItem>
            ))}
          </Select>

          <SectionLabel sx={{ mt: 2.5 }}>Budget &amp; schedule</SectionLabel>
          <FieldGrid>
            <FullSpan>
              <TextField label="Budget (optional)" type="number" value={budget}
                onChange={(e) => setBudget(e.target.value)} fullWidth size="small"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </FullSpan>
            <TextField label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
            <TextField label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
            <FullSpan>
              <TextField label="Campaign name (optional)" placeholder="Auto-named if left blank"
                value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
            </FullSpan>
          </FieldGrid>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} disabled={building} sx={ghostPillSx}>Cancel</Button>
          <Button onClick={handleBuild} disabled={building || !goal.trim()}
            startIcon={building ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeRoundedIcon />}
            sx={inkPillSx}>
            {building ? 'Architecting…' : 'Build plan'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* ── Plan viewer ── */}
      <PremiumDialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="md">
        {viewing && (
          <>
            <DialogHero
              icon={<CampaignRoundedIcon />}
              title={viewing.name}
              subtitle={viewing.goal || 'Campaign plan'}
              onClose={() => setViewing(null)}
              tint={BRAND.tealDeep}
              tintSoft={BRAND.tealSoft}
              right={
                <Chip
                  label={viewing.status}
                  size="small"
                  sx={{ fontSize: 11, height: 22, fontWeight: 800, textTransform: 'capitalize', mt: 0.5, ...statusChipSx(viewing.status) }}
                />
              }
            />
            <DialogBody>
              <Stack spacing={2}>
                {(viewing.audience || viewing.offer || (viewing.channels && viewing.channels.length > 0)) && (
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {viewing.audience && <Chip label={`Audience: ${viewing.audience}`} size="small" sx={{ fontWeight: 700 }} />}
                    {viewing.offer && <Chip label={`Offer: ${viewing.offer}`} size="small" sx={{ fontWeight: 700 }} />}
                    {viewing.channels?.map((ch) => (
                      <Chip key={ch} label={ch} size="small" variant="outlined" sx={{ fontWeight: 700, borderColor: '#EAECEF', color: '#6B7280' }} />
                    ))}
                  </Stack>
                )}
                {viewing.plan && Object.keys(viewing.plan).length > 0 ? (
                  <PlanObject obj={viewing.plan} depth={0} />
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">This campaign doesn&apos;t have a detailed plan yet.</Typography>
                  </Box>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => handleToContent(viewing)} startIcon={<SendIcon />} disabled={busyId === viewing.id} sx={softPillSx}>
                Send to Content
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button onClick={() => setViewing(null)} sx={inkPillSx}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </PremiumDialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast.msg}</Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
