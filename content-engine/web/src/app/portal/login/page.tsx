'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/LoginOutlined';
import { usePortalAuth } from '@/lib/portalAuth';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const CANVAS = '#FAFBFC';

export default function PortalLoginPage() {
  const { login } = usePortalAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
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
        background: `radial-gradient(1200px 600px at 50% -10%, ${BRAND.tealSoft} 0%, ${CANVAS} 60%)`,
      }}
    >
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 420, borderRadius: 4, borderColor: '#EAECEF' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
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
            <Typography variant="h5" fontWeight={800} color={INK}>
              Partner Portal
            </Typography>
            <Typography variant="body2" color={SUBTLE} textAlign="center">
              Sign in to view your marketing performance, ROI, and approvals.
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                autoFocus
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
                sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', py: 1.25 }}
              >
                Sign in
              </Button>
            </Stack>
          </form>

          <Typography variant="caption" color={SUBTLE} display="block" textAlign="center" sx={{ mt: 3 }}>
            Have an invite link? Open it to set up your account.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
