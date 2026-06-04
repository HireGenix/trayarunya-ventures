'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import { Portal, setPortalToken, type PortalInvitePreview } from '@/lib/api';
import { usePortalAuth } from '@/lib/portalAuth';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const CANVAS = '#FAFBFC';

export default function PortalAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { refresh } = usePortalAuth();

  const [preview, setPreview] = useState<PortalInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await Portal.previewInvite(token);
        if (active) setPreview(p);
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : 'This invite link is invalid or expired.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await Portal.accept({ token, full_name: fullName.trim(), password });
      setPortalToken(res.access_token);
      await refresh();
      router.push('/portal/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept the invite.');
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: CANVAS,
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background: `radial-gradient(1200px 600px at 50% -10%, ${BRAND.amberSoft} 0%, ${CANVAS} 60%)`,
      }}
    >
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 460, borderRadius: 4, borderColor: '#EAECEF' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : loadError || !preview || !preview.valid ? (
            <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
              <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>
                {loadError || 'This invite link is invalid, revoked, or expired.'}
              </Alert>
              <Button onClick={() => router.push('/portal/login')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Go to sign in
              </Button>
            </Stack>
          ) : (
            <>
              <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <Box
                  sx={{
                    width: 52, height: 52, borderRadius: 2.5,
                    display: 'grid', placeItems: 'center',
                    background: BRAND.gradient, color: '#fff', fontWeight: 900, fontSize: 22,
                  }}
                >
                  T
                </Box>
                <Typography variant="h5" fontWeight={800} color={INK} textAlign="center">
                  Join {preview.workspace_name}
                </Typography>
                <Typography variant="body2" color={SUBTLE} textAlign="center">
                  {preview.agency_name ? `${preview.agency_name} has invited you` : 'You have been invited'} as a marketing partner.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Chip size="small" label={preview.email} sx={{ fontWeight: 600 }} />
                  <Chip
                    size="small"
                    color="secondary"
                    label={preview.role === 'approver' ? 'Approver access' : 'Viewer access'}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
              </Stack>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={submit}>
                <Stack spacing={2}>
                  <TextField
                    label="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    fullWidth
                    required
                    autoFocus
                  />
                  <TextField
                    label="Create password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                    helperText="At least 8 characters."
                  />
                  <TextField
                    label="Confirm password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    fullWidth
                    required
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                    sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', py: 1.25 }}
                  >
                    Accept &amp; continue
                  </Button>
                </Stack>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
