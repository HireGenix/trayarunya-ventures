'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/LoginOutlined';
import { usePortalAuth } from '@/lib/portalAuth';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CANVAS = '#FAFBFC';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

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
        background: `radial-gradient(1100px 520px at 100% -8%, rgba(20,187,135,0.10), transparent 60%), radial-gradient(1000px 480px at -6% 0%, rgba(255,175,6,0.12), transparent 58%), ${CANVAS}`,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 430,
          bgcolor: '#fff',
          borderRadius: '26px',
          border: `1px solid ${LINE}`,
          boxShadow: CARD_SHADOW,
          p: { xs: 3, sm: 4.5 },
        }}
      >
        <Stack spacing={1.25} alignItems="center" sx={{ mb: 3.5 }}>
          <Box
            sx={{
              width: 54, height: 54, borderRadius: '16px',
              display: 'grid', placeItems: 'center',
              background: BRAND.gradient, color: '#fff', fontWeight: 900, fontSize: 24,
            }}
          >
            T
          </Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: '-0.025em', color: INK, textAlign: 'center' }}
          >
            Partner{' '}
            <Box
              component="span"
              sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              Portal
            </Box>
          </Typography>
          <Typography variant="body2" color={SUBTLE} textAlign="center">
            Sign in to view your marketing performance, ROI, and approvals.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
              sx={{
                borderRadius: '999px',
                fontWeight: 800,
                textTransform: 'none',
                py: 1.35,
                color: '#fff',
                background: INK,
                backgroundImage: 'none',
                boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
                '&:hover': { background: '#1B2330' },
              }}
            >
              Sign in
            </Button>
          </Stack>
        </form>

        <Typography variant="caption" color={SUBTLE} display="block" textAlign="center" sx={{ mt: 3 }}>
          Have an invite link? Open it to set up your account.
        </Typography>
      </Box>
    </Box>
  );
}
