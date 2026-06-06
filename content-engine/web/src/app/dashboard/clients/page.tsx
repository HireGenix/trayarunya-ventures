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
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups2Outlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import BlockIcon from '@mui/icons-material/BlockOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAltOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUserOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useAuth } from '@/lib/auth';
import {
  PortalAdmin,
  type PortalInvite,
  type PortalMember,
  type PortalRole,
  type PortalInviteCreated,
} from '@/lib/api';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';

function originBase(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function fmtDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return s;
  }
}

const ROLE_LABEL: Record<PortalRole, string> = {
  viewer: 'Viewer',
  approver: 'Approver',
};

export default function ClientsPage() {
  const { activeWorkspace } = useAuth();
  const [invites, setInvites] = useState<PortalInvite[]>([]);
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PortalRole>('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<PortalInviteCreated | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, mem] = await Promise.all([PortalAdmin.invites(), PortalAdmin.members()]);
      setInvites(inv);
      setMembers(mem);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load client portal data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  function inviteLink(token: string): string {
    return `${originBase()}/portal/accept/${token}`;
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Copied to clipboard');
    } catch {
      setToast('Copy failed — select and copy manually');
    }
  }

  async function submitInvite() {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await PortalAdmin.createInvite({ email: email.trim().toLowerCase(), role });
      setCreated(res);
      setEmail('');
      setRole('viewer');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invite');
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeInvite(id: string) {
    try {
      await PortalAdmin.revokeInvite(id);
      setToast('Invite revoked');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Revoke failed');
    }
  }

  async function toggleMember(m: PortalMember) {
    try {
      if (m.is_active) {
        await PortalAdmin.revokeMember(m.id);
        setToast('Client access revoked');
      } else {
        await PortalAdmin.restoreMember(m.id);
        setToast('Client access restored');
      }
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Update failed');
    }
  }

  const pendingInvites = invites.filter((i) => i.status === 'pending');

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2,
              display: 'grid', placeItems: 'center',
              background: BRAND.gradient, color: '#fff',
            }}
          >
            <GroupsIcon />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color={INK}>
              Client Portal
            </Typography>
            <Typography variant="body2" color={SUBTLE}>
              Invite clients as partners — a branded, read-only ROI view and content approvals.
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setCreated(null); setDialogOpen(true); }}
          sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
        >
          Invite Client
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <VerifiedUserIcon sx={{ color: BRAND.teal }} fontSize="small" />
                <Typography variant="subtitle1" fontWeight={800} color={INK}>
                  Client Members
                </Typography>
                <Chip size="small" label={members.length} sx={{ ml: 0.5, fontWeight: 700 }} />
              </Stack>
              {members.length === 0 ? (
                <Typography variant="body2" color={SUBTLE} sx={{ py: 2 }}>
                  No clients have joined yet. Send an invite to bring your first partner on board.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Client</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Role</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Joined</TableCell>
                      <TableCell align="right" sx={{ color: SUBTLE, fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color={INK}>
                            {m.full_name || '—'}
                          </Typography>
                          <Typography variant="caption" color={SUBTLE}>{m.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={m.role === 'approver' ? <VerifiedUserIcon /> : <VisibilityIcon />}
                            label={ROLE_LABEL[m.role]}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={m.is_active ? 'Active' : 'Revoked'}
                            color={m.is_active ? 'success' : 'default'}
                            variant={m.is_active ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={SUBTLE}>{fmtDate(m.created_at)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color={m.is_active ? 'error' : 'success'}
                            startIcon={m.is_active ? <BlockIcon /> : <RestartAltIcon />}
                            onClick={() => toggleMember(m)}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                          >
                            {m.is_active ? 'Revoke' : 'Restore'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <MailOutlineIcon sx={{ color: BRAND.amberDeep }} fontSize="small" />
                <Typography variant="subtitle1" fontWeight={800} color={INK}>
                  Pending Invites
                </Typography>
                <Chip size="small" label={pendingInvites.length} sx={{ ml: 0.5, fontWeight: 700 }} />
              </Stack>
              {pendingInvites.length === 0 ? (
                <Typography variant="body2" color={SUBTLE} sx={{ py: 2 }}>
                  No pending invites.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Email</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Role</TableCell>
                      <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Expires</TableCell>
                      <TableCell align="right" sx={{ color: SUBTLE, fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingInvites.map((inv) => (
                      <TableRow key={inv.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color={INK}>{inv.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={ROLE_LABEL[inv.role]} sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={SUBTLE}>{fmtDate(inv.expires_at)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="error"
                            startIcon={<BlockIcon />}
                            onClick={() => revokeInvite(inv.id)}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      <PremiumDialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm">
        {created ? (
          <DialogHero
            icon={<CheckCircleRoundedIcon />}
            title="Invite created"
            subtitle="Share the secure link below — it is shown only once."
            onClose={() => { setCreated(null); setDialogOpen(false); }}
            tint={BRAND.tealDeep}
            tintSoft={BRAND.tealSoft}
          />
        ) : (
          <DialogHero
            icon={<PersonAddAlt1RoundedIcon />}
            title="Invite a client"
            subtitle="Bring a partner on board with a branded, read-only portal."
            onClose={() => setDialogOpen(false)}
          />
        )}
        <DialogBody>
          {created ? (
            <Stack spacing={2}>
              <SectionLabel>Secure invite link</SectionLabel>
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Share this secure link with <strong>{created.invite.email}</strong>. It is shown once.
              </Alert>
              <TextField
                label="Invite link"
                value={inviteLink(created.token)}
                fullWidth
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Copy link">
                        <IconButton onClick={() => copy(inviteLink(created.token))} edge="end">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color={SUBTLE}>
                The client sets their own password on first sign-in. The link expires automatically.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              <SectionLabel>Invite details</SectionLabel>
              <TextField
                label="Client email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                autoFocus
                placeholder="founder@clientco.com"
              />
              <TextField
                label="Access level"
                select
                value={role}
                onChange={(e) => setRole(e.target.value as PortalRole)}
                fullWidth
                helperText={
                  role === 'approver'
                    ? 'Can view dashboards and approve / request changes on content.'
                    : 'Can view dashboards and reports only (no approvals).'
                }
              >
                <MenuItem value="viewer">Viewer — read-only dashboards &amp; reports</MenuItem>
                <MenuItem value="approver">Approver — can approve content</MenuItem>
              </TextField>
            </Stack>
          )}
        </DialogBody>
        <DialogFooter>
          {created ? (
            <>
              <Button onClick={() => copy(inviteLink(created.token))} startIcon={<ContentCopyIcon />} sx={ghostPillSx}>
                Copy link
              </Button>
              <Button onClick={() => { setCreated(null); setDialogOpen(false); }} sx={inkPillSx}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setDialogOpen(false)} sx={ghostPillSx}>
                Cancel
              </Button>
              <Button
                onClick={submitInvite}
                disabled={submitting || !email.trim()}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <MailOutlineIcon />}
                sx={inkPillSx}
              >
                Send invite
              </Button>
            </>
          )}
        </DialogFooter>
      </PremiumDialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
