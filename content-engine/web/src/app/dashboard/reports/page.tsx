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
import { useAuth } from '@/lib/auth';
import { Reports, type ReportOut } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';

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

  // create dialog
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [days, setDays] = useState(30);

  // snackbar
  const [toast, setToast] = useState<string | null>(null);

  const load = () => {
    if (!activeWorkspace) return;
    setLoading(true);
    Reports.list()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const r = await Reports.create({
        title: title.trim(),
        client_name: clientName.trim() || undefined,
        days,
      });
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

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Client Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Shareable performance snapshots — send a link, clients view without logging in
          </Typography>
        </Box>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setOpen(true)}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2.5 }}
        >
          New report
        </Button>
      </Stack>

      {/* List */}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <CircularProgress size={28} />
        </Box>
      ) : reports.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 3, borderStyle: 'dashed' }}>
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
              py: 6,
            }}
          >
            <AssessmentIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography fontWeight={700} color="text.secondary">
              No reports yet
            </Typography>
            <Typography variant="body2" color="text.disabled" textAlign="center" maxWidth={320}>
              Create your first client report — it freezes a snapshot of your current metrics and
              gives you a shareable link.
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={() => setOpen(true)}
              sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Create report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {reports.map((r) => (
            <Card
              key={r.token}
              variant="outlined"
              sx={{
                borderRadius: 3,
                transition: 'box-shadow .15s',
                '&:hover': { boxShadow: '0 4px 18px rgba(14,17,22,0.09)' },
              }}
            >
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
                  {/* Icon */}
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2.5,
                      bgcolor: 'primary.main',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      background: 'linear-gradient(135deg,#14BB87 0%,#0d8f66 100%)',
                    }}
                  >
                    <AssessmentIcon sx={{ color: '#fff', fontSize: 22 }} />
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography fontWeight={700} sx={{ fontSize: 15 }} noWrap>
                        {r.title}
                      </Typography>
                      {r.client_name && (
                        <Chip
                          label={r.client_name}
                          size="small"
                          sx={{ fontSize: 11, height: 20 }}
                        />
                      )}
                    </Stack>
                    <Stack direction="row" gap={2} sx={{ mt: 0.5 }} flexWrap="wrap">
                      {r.date_from && (
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <CalendarTodayIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">
                            {r.date_from} → {r.date_to}
                          </Typography>
                        </Stack>
                      )}
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <VisibilityIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {fmt(r.views)} views
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.disabled">
                        Created {new Date(r.created_at).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Actions */}
                  <Stack direction="row" gap={0.5} flexShrink={0}>
                    <Tooltip title="Open report">
                      <IconButton
                        size="small"
                        href={shareUrl(r.token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        component="a"
                        sx={{ borderRadius: 2 }}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copy share link">
                      <IconButton
                        size="small"
                        onClick={() => handleCopy(r.token)}
                        sx={{ borderRadius: 2 }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(r)}
                        sx={{ borderRadius: 2, color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Create dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Create client report</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Report title"
              placeholder="e.g. Q2 2026 Performance Report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              autoFocus
              required
            />
            <TextField
              label="Client name (optional)"
              placeholder="e.g. Acme Corp"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Lookback window (days)"
              type="number"
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value))))}
              fullWidth
              helperText="Metrics from the last N days will be included in the snapshot"
              inputProps={{ min: 1, max: 365 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)} color="inherit" disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !title.trim()}
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {creating ? 'Generating…' : 'Generate & share'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
