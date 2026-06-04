'use client';

import { useCallback, useEffect, useState } from 'react';
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
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import EditNoteIcon from '@mui/icons-material/EditNoteOutlined';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import PortalShell from '@/components/PortalShell';
import { usePortalAuth } from '@/lib/portalAuth';
import { Portal, type PortalApprovalItem } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';

function fmtDate(s: string | null): string {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return s;
  }
}

function ApprovalsBody() {
  const { session } = usePortalAuth();
  const isApprover = session?.role === 'approver';

  const [items, setItems] = useState<PortalApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [changesFor, setChangesFor] = useState<PortalApprovalItem | null>(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await Portal.approvals());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(item: PortalApprovalItem) {
    setBusyId(item.id);
    try {
      await Portal.decide(item.id, { decision: 'approved' });
      setToast('Approved');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function submitChanges() {
    if (!changesFor) return;
    setBusyId(changesFor.id);
    try {
      await Portal.decide(changesFor.id, { decision: 'changes_requested', note: note.trim() || undefined });
      setToast('Changes requested');
      setChangesFor(null);
      setNote('');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={800} color={INK}>Content Approvals</Typography>
        <Typography variant="body2" color={SUBTLE}>
          {isApprover
            ? 'Review content waiting for your sign-off before it goes live.'
            : 'Content currently in review. Approver access is required to take action.'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      {!isApprover && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          You have viewer access. Ask your agency contact for approver rights to approve content.
        </Alert>
      )}

      {items.length === 0 ? (
        <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
              <FactCheckIcon sx={{ color: BRAND.teal, fontSize: 40 }} />
              <Typography variant="body2" color={SUBTLE}>
                Nothing waiting for review. You&apos;re all caught up.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => (
            <Card key={item.id} variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3 }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small" label={item.content_type} sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
                      {item.platform && (
                        <Chip size="small" variant="outlined" label={item.platform} sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
                      )}
                      {item.updated_at && (
                        <Typography variant="caption" color={SUBTLE}>Updated {fmtDate(item.updated_at)}</Typography>
                      )}
                    </Stack>
                    {item.title && (
                      <Typography variant="subtitle1" fontWeight={800} color={INK}>{item.title}</Typography>
                    )}
                    <Typography
                      variant="body2"
                      color={SUBTLE}
                      sx={{
                        mt: 0.5,
                        whiteSpace: 'pre-wrap',
                        display: '-webkit-box',
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.body}
                    </Typography>
                    {item.latest_note && (
                      <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
                        Last note: {item.latest_note}
                      </Alert>
                    )}
                  </Box>

                  {isApprover && (
                    <Stack spacing={1} sx={{ minWidth: 160 }} justifyContent="center">
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={busyId === item.id ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        disabled={busyId === item.id}
                        onClick={() => approve(item)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<EditNoteIcon />}
                        disabled={busyId === item.id}
                        onClick={() => { setChangesFor(item); setNote(''); }}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                      >
                        Request changes
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={!!changesFor} onClose={() => setChangesFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Request changes</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color={SUBTLE} sx={{ mb: 2 }}>
            Tell the team what to adjust. This sends the content back to draft.
          </Typography>
          <TextField
            label="Notes (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            autoFocus
            placeholder="e.g. Soften the CTA and add a customer proof point."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setChangesFor(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={submitChanges}
            disabled={!!busyId}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Send request
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
}

export default function PortalApprovalsPage() {
  return (
    <PortalShell>
      <ApprovalsBody />
    </PortalShell>
  );
}
