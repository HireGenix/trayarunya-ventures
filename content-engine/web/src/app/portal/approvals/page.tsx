'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import EditNoteIcon from '@mui/icons-material/EditNoteOutlined';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import PortalShell from '@/components/PortalShell';
import { usePortalAuth } from '@/lib/portalAuth';
import { Portal, type PortalApprovalItem } from '@/lib/api';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

const cardSx = {
  bgcolor: '#fff',
  border: `1px solid ${LINE}`,
  borderRadius: CARD_RADIUS,
  boxShadow: CARD_SHADOW,
  p: 2.5,
} as const;

const inkPill = {
  background: INK,
  backgroundImage: 'none',
  borderRadius: '999px',
  fontWeight: 700,
  textTransform: 'none',
  color: '#fff',
  boxShadow: 'none',
  '&:hover': { background: '#1B2330' },
} as const;

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
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        spacing={2}
        sx={{ mb: 2.5, px: 0.5 }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12, fontSize: { xs: 26, md: 34 }, color: INK }}
          >
            Content{' '}
            <Box
              component="span"
              sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              Approvals
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {isApprover
              ? 'Review content waiting for your sign-off before it goes live.'
              : 'Content currently in review. Approver access is required to take action.'}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
        {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}

        {!isApprover && (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            You have viewer access. Ask your agency contact for approver rights to approve content.
          </Alert>
        )}

        {items.length === 0 ? (
          <Box sx={cardSx}>
            <Stack spacing={1.25} alignItems="center" sx={{ py: 4 }}>
              <Box
                sx={{
                  width: 48, height: 48, borderRadius: '14px',
                  display: 'grid', placeItems: 'center',
                  bgcolor: BRAND.tealSoft, color: BRAND.tealDeep,
                }}
              >
                <FactCheckIcon />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Nothing waiting for review. You&apos;re all caught up.
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={2}>
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  ...cardSx,
                  transition: 'transform .16s ease, box-shadow .16s ease, border-color .16s ease',
                  '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(14,17,22,0.12)' },
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} justifyContent="space-between">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={item.content_type}
                        sx={{ fontWeight: 700, fontSize: 12, textTransform: 'capitalize', bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE }}
                      />
                      {item.platform && (
                        <Chip
                          size="small"
                          label={item.platform}
                          sx={{ fontWeight: 700, fontSize: 12, textTransform: 'capitalize', bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }}
                        />
                      )}
                      {item.updated_at && (
                        <Typography variant="caption" color="text.secondary">Updated {fmtDate(item.updated_at)}</Typography>
                      )}
                    </Stack>
                    {item.title && (
                      <Typography sx={{ fontWeight: 800, fontSize: 17, color: INK }}>{item.title}</Typography>
                    )}
                    <Typography
                      variant="body2"
                      color="text.secondary"
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
                      <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 3 }}>
                        Last note: {item.latest_note}
                      </Alert>
                    )}
                  </Box>

                  {isApprover && (
                    <Stack spacing={1.25} sx={{ minWidth: 168 }} justifyContent="center">
                      <Button
                        variant="contained"
                        startIcon={busyId === item.id ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        disabled={busyId === item.id}
                        onClick={() => approve(item)}
                        sx={inkPill}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<EditNoteIcon />}
                        disabled={busyId === item.id}
                        onClick={() => { setChangesFor(item); setNote(''); }}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: '999px',
                          color: INK,
                          borderColor: LINE,
                          '&:hover': { borderColor: INK, bgcolor: 'rgba(14,17,22,0.04)' },
                        }}
                      >
                        Request changes
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        <PremiumDialog open={!!changesFor} onClose={() => setChangesFor(null)} maxWidth="sm">
          <DialogHero
            icon={<EditNoteRoundedIcon />}
            title="Request changes"
            subtitle="Tell the team what to adjust. This sends the content back to draft."
            onClose={() => setChangesFor(null)}
            tint={BRAND.amberDeep}
            tintSoft={BRAND.amberSoft}
          />
          <DialogBody>
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
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setChangesFor(null)} sx={ghostPillSx}>
              Cancel
            </Button>
            <Button onClick={submitChanges} disabled={!!busyId} sx={inkPillSx}>
              Send request
            </Button>
          </DialogFooter>
        </PremiumDialog>

        <Snackbar
          open={!!toast}
          autoHideDuration={2600}
          onClose={() => setToast(null)}
          message={toast}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Stack>
    </Box>
  );
}

export default function PortalApprovalsPage() {
  return (
    <PortalShell>
      <ApprovalsBody />
    </PortalShell>
  );
}
