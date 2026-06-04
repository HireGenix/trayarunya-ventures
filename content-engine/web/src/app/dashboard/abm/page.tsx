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
  Divider,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNewOutlined';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import { useAuth } from '@/lib/auth';
import {
  Abm,
  type AbmAccount,
  type AbmStage,
  type AbmTier,
  type Persona,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

const STAGES: { key: AbmStage; label: string; accent: string }[] = [
  { key: 'new', label: 'New', accent: SUBTLE },
  { key: 'researching', label: 'Researching', accent: '#2563EB' },
  { key: 'engaging', label: 'Engaging', accent: BRAND.amber },
  { key: 'opportunity', label: 'Opportunity', accent: BRAND.teal },
  { key: 'won', label: 'Won', accent: BRAND.tealDeep },
  { key: 'lost', label: 'Lost', accent: BRAND.pink },
];

const STAGE_LABEL: Record<AbmStage, string> = {
  new: 'New',
  researching: 'Researching',
  engaging: 'Engaging',
  opportunity: 'Opportunity',
  won: 'Won',
  lost: 'Lost',
};

const TIERS: { key: AbmTier; label: string; accent: string }[] = [
  { key: 'tier_1', label: 'Tier 1', accent: BRAND.pink },
  { key: 'tier_2', label: 'Tier 2', accent: BRAND.amber },
  { key: 'tier_3', label: 'Tier 3', accent: SUBTLE },
];

function tierMeta(t: AbmTier) {
  return TIERS.find((x) => x.key === t) ?? TIERS[2];
}

function prettyKey(k: string): string {
  return k.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map((x) => renderValue(x)).join(', ');
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default function AbmPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const [accounts, setAccounts] = useState<AbmAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Add dialog
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [creating, setCreating] = useState(false);
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [tier, setTier] = useState<AbmTier>('tier_2');
  const [notes, setNotes] = useState('');
  const [bulkText, setBulkText] = useState('');

  // Detail drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AbmAccount | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [genPersonas, setGenPersonas] = useState(false);
  const [genAssets, setGenAssets] = useState(false);

  const load = () => {
    if (!activeWorkspace) return;
    setLoading(true);
    Abm.listAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    Abm.getAccount(selectedId)
      .then((a) => {
        setDetail(a);
        setDraftNotes(a.notes ?? '');
      })
      .catch(() => setToast('Failed to load account'))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const byStage = useMemo(() => {
    const map: Record<AbmStage, AbmAccount[]> = {
      new: [],
      researching: [],
      engaging: [],
      opportunity: [],
      won: [],
      lost: [],
    };
    for (const a of accounts) map[a.stage]?.push(a);
    return map;
  }, [accounts]);

  const resetForm = () => {
    setCompany('');
    setWebsite('');
    setIndustry('');
    setTier('tier_2');
    setNotes('');
    setBulkText('');
    setMode('single');
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      if (mode === 'single') {
        if (!company.trim()) return;
        const a = await Abm.createAccount({
          company: company.trim(),
          website: website.trim() || undefined,
          industry: industry.trim() || undefined,
          tier,
          notes: notes.trim() || undefined,
        });
        setAccounts((prev) => [a, ...prev]);
        setToast('Account added');
      } else {
        const names = bulkText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (names.length === 0) return;
        const created = await Abm.bulkCreateAccounts(
          names.map((c) => ({ company: c, tier })),
        );
        setAccounts((prev) => [...created, ...prev]);
        setToast(`${created.length} accounts added`);
      }
      setOpen(false);
      resetForm();
    } catch {
      setToast('Failed to add account(s)');
    } finally {
      setCreating(false);
    }
  };

  const handleStageChange = async (acc: AbmAccount, stage: AbmStage) => {
    if (stage === acc.stage) return;
    const prev = accounts;
    setAccounts((list) => list.map((x) => (x.id === acc.id ? { ...x, stage } : x)));
    try {
      const updated = await Abm.updateAccount(acc.id, { stage });
      setAccounts((list) => list.map((x) => (x.id === acc.id ? updated : x)));
      if (detail?.id === acc.id) setDetail(updated);
    } catch {
      setAccounts(prev);
      setToast('Failed to move account');
    }
  };

  const handleDelete = async (acc: AbmAccount) => {
    const ok = await confirm({
      title: 'Delete account?',
      message: `"${acc.company}" and all its personas & assets will be permanently removed.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await Abm.deleteAccount(acc.id);
    setAccounts((prev) => prev.filter((x) => x.id !== acc.id));
    if (selectedId === acc.id) setSelectedId(null);
    setToast('Account deleted');
  };

  const handleSaveNotes = async () => {
    if (!detail) return;
    setSavingNotes(true);
    try {
      const updated = await Abm.updateAccount(detail.id, { notes: draftNotes });
      setDetail(updated);
      setAccounts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setToast('Notes saved');
    } catch {
      setToast('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleGeneratePersonas = async () => {
    if (!detail) return;
    setGenPersonas(true);
    try {
      const personas = await Abm.generatePersonas(detail.id);
      setDetail((d) => (d ? { ...d, personas } : d));
      setToast('Personas generated');
    } catch {
      setToast('Failed to generate personas');
    } finally {
      setGenPersonas(false);
    }
  };

  const handleGenerateAssets = async () => {
    if (!detail) return;
    setGenAssets(true);
    try {
      const assets = await Abm.generateAssets(detail.id);
      setDetail((d) => (d ? { ...d, assets } : d));
      setToast('Assets generated');
    } catch {
      setToast('Failed to generate assets');
    } finally {
      setGenAssets(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, maxWidth: 440 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
              <BusinessIcon sx={{ fontSize: 32, color: BRAND.teal }} />
            </Box>
            <Typography fontWeight={900} variant="h6">No workspace selected</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={320}>
              Pick a workspace to start targeting high-value accounts with Account-Based Marketing.
            </Typography>
          </CardContent>
        </Card>
      </Box>
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
          <Box maxWidth={720}>
            <Chip icon={<BoltIcon />} label="Account-based cockpit" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Account-Based Marketing
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 640 }}>
              Target high-value accounts like partners: research the buying committee, craft tailored plays, and move them stage by stage.
            </Typography>
          </Box>
          <Stack spacing={1.2} sx={{ minWidth: { md: 240 } }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => { resetForm(); setOpen(true); }}
              sx={{ borderRadius: 3, py: 1.2, textTransform: 'none', fontWeight: 900, color: INK, background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)` }}>
              Add account
            </Button>
            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{accounts.length}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>Target accounts</Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {/* ── Pipeline ── */}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}><CircularProgress size={28} /></Box>
      ) : accounts.length === 0 ? (
        <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, overflow: 'hidden' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
              <GroupsIcon sx={{ fontSize: 36, color: BRAND.teal }} />
            </Box>
            <Typography fontWeight={900} variant="h6">No target accounts yet</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
              Add the companies you want to win. Then research their buying committee and craft tailored outreach — one account at a time.
            </Typography>
            <Button startIcon={<AddIcon />} variant="outlined" onClick={() => { resetForm(); setOpen(true); }} sx={{ mt: 1, borderRadius: 3, textTransform: 'none', fontWeight: 800 }}>
              Add first account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ overflowX: 'auto', pb: 1 }}>
          <Stack direction="row" spacing={2} sx={{ minWidth: 1080 }}>
            {STAGES.map((col) => {
              const items = byStage[col.key];
              return (
                <Box key={col.key} sx={{ flex: 1, minWidth: 240 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, mb: 1.2 }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.accent }} />
                      <Typography fontWeight={900} sx={{ color: INK, fontSize: 13.5 }}>{col.label}</Typography>
                    </Stack>
                    <Chip label={items.length} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 800, bgcolor: `${col.accent}14`, color: col.accent }} />
                  </Stack>
                  <Stack
                    spacing={1.2}
                    sx={{
                      p: 1.2, borderRadius: 3, bgcolor: CANVAS, border: `1px solid ${BORDER}`,
                      minHeight: 120, borderTop: `3px solid ${col.accent}`,
                    }}
                  >
                    {items.length === 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        No accounts
                      </Typography>
                    ) : (
                      items.map((acc) => {
                        const tm = tierMeta(acc.tier);
                        return (
                          <Card
                            key={acc.id}
                            onClick={() => setSelectedId(acc.id)}
                            sx={{
                              borderRadius: 3, border: `1px solid ${BORDER}`, cursor: 'pointer',
                              boxShadow: '0 6px 16px rgba(17,21,27,0.04)',
                              transition: 'transform .15s, box-shadow .15s',
                              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 32px rgba(17,21,27,0.10)' },
                            }}
                          >
                            <CardContent sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}>
                              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                                <Typography fontWeight={900} sx={{ color: INK, fontSize: 14, lineHeight: 1.3 }}>
                                  {acc.company}
                                </Typography>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(acc); }}
                                    sx={{ mt: -0.6, mr: -0.6, color: 'error.main' }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                              <Stack direction="row" gap={0.6} flexWrap="wrap" sx={{ mt: 0.8 }}>
                                <Chip label={tm.label} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: `${tm.accent}18`, color: tm.accent }} />
                                {acc.industry && (
                                  <Chip label={acc.industry} size="small" variant="outlined" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, borderColor: BORDER, color: SUBTLE }} />
                                )}
                              </Stack>
                              <TextField
                                select
                                size="small"
                                fullWidth
                                value={acc.stage}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleStageChange(acc, e.target.value as AbmStage)}
                                sx={{ mt: 1.2, '& .MuiInputBase-input': { fontSize: 12, fontWeight: 700, py: 0.6 } }}
                              >
                                {STAGES.map((s) => (
                                  <MenuItem key={s.key} value={s.key} sx={{ fontSize: 12.5 }}>{s.label}</MenuItem>
                                ))}
                              </TextField>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* ── Add dialog ── */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
        <Box sx={{ p: 3, background: 'linear-gradient(135deg, #11151B 0%, #1B2330 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.30), transparent 65%)' }} />
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})` }}>
              <BusinessIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography fontWeight={950} variant="h6">Add target account</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>Build your named-account list to run tailored plays.</Typography>
            </Box>
          </Stack>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={(_, v) => v && setMode(v)}
            sx={{ mb: 2.5 }}
          >
            <ToggleButton value="single" sx={{ textTransform: 'none', fontWeight: 800, px: 2 }}>Single</ToggleButton>
            <ToggleButton value="bulk" sx={{ textTransform: 'none', fontWeight: 800, px: 2 }}>Bulk add</ToggleButton>
          </ToggleButtonGroup>

          {mode === 'single' ? (
            <Stack spacing={2.5}>
              <TextField label="Company" placeholder="e.g. Acme Corp" value={company} onChange={(e) => setCompany(e.target.value)} fullWidth autoFocus required />
              <TextField label="Website (optional)" placeholder="https://acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} fullWidth />
              <TextField label="Industry (optional)" placeholder="e.g. SaaS" value={industry} onChange={(e) => setIndustry(e.target.value)} fullWidth />
              <TextField select label="Tier" value={tier} onChange={(e) => setTier(e.target.value as AbmTier)} fullWidth>
                {TIERS.map((t) => (
                  <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                ))}
              </TextField>
              <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              <TextField
                label="Company names"
                placeholder={'One company per line\nAcme Corp\nGlobex\nInitech'}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                fullWidth
                multiline
                minRows={6}
                autoFocus
                helperText="Each line becomes a new account at the selected tier."
              />
              <TextField select label="Tier for all" value={tier} onChange={(e) => setTier(e.target.value as AbmTier)} fullWidth>
                {TIERS.map((t) => (
                  <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)} color="inherit" disabled={creating}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || (mode === 'single' ? !company.trim() : !bulkText.trim())}
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 900, background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})`, color: INK }}
          >
            {creating ? 'Adding…' : mode === 'single' ? 'Add account' : 'Add accounts'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail drawer ── */}
      <Drawer anchor="right" open={!!selectedId} onClose={() => setSelectedId(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480, md: 560 }, bgcolor: '#fff' } }}>
        {detailLoading || !detail ? (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}><CircularProgress size={28} /></Box>
        ) : (
          <Box>
            <Box sx={{ p: 3, background: 'linear-gradient(135deg, #11151B 0%, #1B2330 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,175,6,0.28), transparent 65%)' }} />
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ position: 'relative' }}>
                <Box>
                  <Typography variant="h5" fontWeight={950}>{detail.company}</Typography>
                  <Stack direction="row" gap={0.8} flexWrap="wrap" sx={{ mt: 1 }}>
                    <Chip label={tierMeta(detail.tier).label} size="small" sx={{ height: 22, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }} />
                    <Chip label={STAGE_LABEL[detail.stage]} size="small" sx={{ height: 22, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }} />
                    {detail.industry && <Chip label={detail.industry} size="small" sx={{ height: 22, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.10)', color: '#fff' }} />}
                  </Stack>
                  {detail.website && (
                    <Button
                      href={detail.website.startsWith('http') ? detail.website : `https://${detail.website}`}
                      target="_blank" rel="noopener noreferrer" component="a" size="small"
                      endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                      sx={{ mt: 1, textTransform: 'none', color: 'rgba(255,255,255,0.85)', p: 0, fontWeight: 700 }}
                    >
                      {detail.website}
                    </Button>
                  )}
                </Box>
                <IconButton onClick={() => setSelectedId(null)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
              </Stack>
            </Box>

            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                {/* Firmographics */}
                <Box>
                  <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Firmographics</Typography>
                  {detail.firmographics && Object.keys(detail.firmographics).length > 0 ? (
                    <Grid container spacing={1}>
                      {Object.entries(detail.firmographics).map(([k, v]) => (
                        <Grid key={k} size={{ xs: 6 }}>
                          <Box sx={{ p: 1.4, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                            <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{prettyKey(k)}</Typography>
                            <Typography sx={{ color: INK, fontSize: 13, fontWeight: 600, mt: 0.3 }}>{renderValue(v)}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No firmographic data yet.</Typography>
                  )}
                </Box>

                <Divider sx={{ borderColor: BORDER }} />

                {/* Notes */}
                <Box>
                  <Typography fontWeight={900} sx={{ color: INK, mb: 1 }}>Notes</Typography>
                  <TextField
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    fullWidth multiline minRows={3}
                    placeholder="Account context, signals, champions…"
                  />
                  <Button
                    onClick={handleSaveNotes}
                    disabled={savingNotes || draftNotes === (detail.notes ?? '')}
                    startIcon={savingNotes ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                    sx={{ mt: 1, textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                  >
                    Save notes
                  </Button>
                </Box>

                <Divider sx={{ borderColor: BORDER }} />

                {/* Personas */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography fontWeight={900} sx={{ color: INK }}>Buying committee</Typography>
                    <Button
                      onClick={handleGeneratePersonas}
                      disabled={genPersonas}
                      variant="contained"
                      size="small"
                      startIcon={genPersonas ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})`, color: INK }}
                    >
                      {genPersonas ? 'Generating…' : 'Generate personas'}
                    </Button>
                  </Stack>
                  {detail.personas && detail.personas.length > 0 ? (
                    <Stack spacing={1.5}>
                      {detail.personas.map((p: Persona, i) => (
                        <Card key={`${p.role}-${i}`} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, boxShadow: 'none' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Stack direction="row" alignItems="center" gap={1}>
                              <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
                                <GroupsIcon sx={{ fontSize: 18, color: BRAND.teal }} />
                              </Box>
                              <Box>
                                <Typography fontWeight={900} sx={{ color: INK, fontSize: 14 }}>{p.role}</Typography>
                                <Typography variant="caption" color="text.secondary">{p.title}</Typography>
                              </Box>
                            </Stack>
                            <PersonaList label="Pains" items={p.pains} accent={BRAND.pink} />
                            <PersonaList label="Priorities" items={p.priorities} accent={BRAND.teal} />
                            <PersonaList label="Objections" items={p.objections} accent={BRAND.amber} />
                            {p.message_angle && (
                              <Box sx={{ mt: 1.2, p: 1.2, borderRadius: 2, bgcolor: `${BRAND.amber}10`, border: `1px solid ${BRAND.amber}33` }}>
                                <Typography variant="caption" sx={{ color: BRAND.amberDeep, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>Message angle</Typography>
                                <Typography sx={{ color: INK, fontSize: 13, mt: 0.3 }}>{p.message_angle}</Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No personas yet. Generate the buying committee to map roles, pains and message angles.
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ borderColor: BORDER }} />

                {/* Assets */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography fontWeight={900} sx={{ color: INK }}>Outreach assets</Typography>
                    <Button
                      onClick={handleGenerateAssets}
                      disabled={genAssets}
                      variant="contained"
                      size="small"
                      startIcon={genAssets ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})`, color: INK }}
                    >
                      {genAssets ? 'Generating…' : 'Generate assets'}
                    </Button>
                  </Stack>
                  {detail.assets && Object.keys(detail.assets).length > 0 ? (
                    <Stack spacing={1.2}>
                      {Object.entries(detail.assets).map(([k, v]) => (
                        <Box key={k} sx={{ p: 1.6, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                          <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{prettyKey(k)}</Typography>
                          <Typography sx={{ color: INK, fontSize: 13, mt: 0.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {renderValue(v)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No assets yet. Generate tailored outreach copy for this account.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}

function PersonaList({ label, items, accent }: { label: string; items: string[]; accent: string }) {
  if (!items || items.length === 0) return null;
  return (
    <Box sx={{ mt: 1.2 }}>
      <Typography variant="caption" sx={{ color: accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{label}</Typography>
      <Stack component="ul" sx={{ m: 0, mt: 0.4, pl: 2.2 }} spacing={0.2}>
        {items.map((it, i) => (
          <Typography key={`${label}-${i}`} component="li" sx={{ color: INK, fontSize: 12.5, lineHeight: 1.5 }}>{it}</Typography>
        ))}
      </Stack>
    </Box>
  );
}
