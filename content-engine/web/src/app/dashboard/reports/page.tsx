'use client';

import { useEffect, useState } from 'react';
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
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNewOutlined';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import ShareIcon from '@mui/icons-material/ShareOutlined';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import { useAuth } from '@/lib/auth';
import { Reports, type ReportOut } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';

const ORIGIN =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : '';

function shareUrl(token: string) {
  return `${ORIGIN}/reports/${token}`;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export default function ReportsPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const [reports, setReports] = useState<ReportOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [days, setDays] = useState(30);
  const [toast, setToast] = useState<string | null>(null);

  const load = () => {
    if (!activeWorkspace) return;
    setLoading(true);
    Reports.list().then(setReports).catch(() => setReports([])).finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const r = await Reports.create({ title: title.trim(), client_name: clientName.trim() || undefined, days });
      setReports((prev) => [r, ...prev]);
      setOpen(false);
      setTitle('');
      setClientName('');
      setDays(30);
      setToast('Report created! Share link copied to clipboard.');
      await navigator.clipboard.writeText(shareUrl(r.token)).catch(() => null);
    } catch {
      setToast('Failed to create report');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(shareUrl(token));
    setToast('Share link copied!');
  };

  const handleDelete = async (r: ReportOut) => {
    const ok = await confirm({
      title: 'Delete report?',
      message: `"${r.title}" will be permanently deleted and the share link will stop working.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await Reports.delete(r.token);
    setReports((prev) => prev.filter((x) => x.token !== r.token));
    setToast('Report deleted');
  };

  const totalViews = reports.reduce((s, r) => s + r.views, 0);

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
            <Chip icon={<BoltIcon />} label="Client proof room" sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', fontWeight: 800 }} />
            <Typography variant="h3" fontWeight={950} sx={{ lineHeight: 1.05, letterSpacing: -1 }}>
              Boardroom-ready reports that close clients.
            </Typography>
            <Typography sx={{ mt: 1.4, color: 'rgba(255,255,255,0.72)', maxWidth: 620 }}>
              Package your real performance data into shareable snapshots. One link — no login required. Impress stakeholders with proof, not promises.
            </Typography>
          </Box>
          <Stack spacing={1.2} sx={{ minWidth: { md: 260 } }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}
              sx={{ borderRadius: 3, py: 1.2, textTransform: 'none', fontWeight: 900, color: '#11151B', background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)` }}>
              Generate new report
            </Button>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{reports.length}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>Reports</Typography>
                </Box>
              </Grid>
              <Grid size={6}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 950 }}>{fmt(totalViews)}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>Total views</Typography>
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </Stack>
      </Box>

      {/* ── Report list ── */}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 200 }}><CircularProgress size={28} /></Box>
      ) : reports.length === 0 ? (
        <Card sx={{ borderRadius: 4, border: '1px dashed rgba(17,21,27,0.18)', overflow: 'hidden' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
              <DescriptionIcon sx={{ fontSize: 36, color: BRAND.teal }} />
            </Box>
            <Typography fontWeight={900} variant="h6">No reports yet</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={380}>
              Create your first client report — it freezes a live snapshot of your current analytics into a premium shareable page.
            </Typography>
            <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setOpen(true)} sx={{ mt: 1, borderRadius: 3, textTransform: 'none', fontWeight: 800 }}>
              Create first report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {reports.map((r) => (
            <Grid key={r.token} size={{ xs: 12, md: 6 }}>
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
                      <AssessmentIcon sx={{ color: '#fff', fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography fontWeight={900} noWrap>{r.title}</Typography>
                        {r.client_name && <Chip label={r.client_name} size="small" sx={{ fontSize: 11, height: 22, fontWeight: 700 }} />}
                      </Stack>
                      <Stack direction="row" gap={2} sx={{ mt: 0.8 }} flexWrap="wrap">
                        {r.date_from && (
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">{r.date_from} → {r.date_to}</Typography>
                          </Stack>
                        )}
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <VisibilityIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">{fmt(r.views)} views</Typography>
                        </Stack>
                      </Stack>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: 'block' }}>
                        Created {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Button size="small" startIcon={<ShareIcon />} onClick={() => handleCopy(r.token)}
                      sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, fontSize: 12 }}>
                      Copy link
                    </Button>
                    <Stack direction="row" gap={0.5}>
                      <Tooltip title="Open report">
                        <IconButton size="small" href={shareUrl(r.token)} target="_blank" rel="noopener noreferrer" component="a" sx={{ borderRadius: 2 }}>
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copy link">
                        <IconButton size="small" onClick={() => handleCopy(r.token)} sx={{ borderRadius: 2 }}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(r)} sx={{ borderRadius: 2, color: 'error.main' }}>
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

      {/* ── Create dialog ── */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
        <Box sx={{
          p: 3, background: 'linear-gradient(135deg, #11151B 0%, #1B2330 100%)', color: '#fff',
          position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.30), transparent 65%)' }} />
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})` }}>
              <DescriptionIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography fontWeight={950} variant="h6">Generate client report</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>Freeze a snapshot of your live metrics into a shareable page.</Typography>
            </Box>
          </Stack>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField label="Report title" placeholder="e.g. Q2 2026 Performance Report" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth autoFocus required />
            <TextField label="Client name (optional)" placeholder="e.g. Acme Corp" value={clientName} onChange={(e) => setClientName(e.target.value)} fullWidth />
            <TextField label="Lookback window (days)" type="number" value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value))))}
              fullWidth helperText="Metrics from the last N days will be included in the snapshot"
              inputProps={{ min: 1, max: 365 }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)} color="inherit" disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={creating || !title.trim()}
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 900, background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})`, color: '#11151B' }}>
            {creating ? 'Generating…' : 'Generate & share'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
