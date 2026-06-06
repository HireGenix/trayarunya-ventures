'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '@/lib/auth';
import { AuthShell } from '@/components/auth/AuthShell';
import { BRAND } from '@/theme/theme';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="Log in to MarketiQ AI"
      subtitle="Pick up your closed loop right where you left off."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <form onSubmit={onSubmit}>
        <Stack spacing={2.5}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" color="primary" size="large" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </Button>
        </Stack>
      </form>
      <Typography sx={{ mt: 3 }} color="text.secondary">
        No account?{' '}
        <Link href="/signup" style={{ color: BRAND.amberDeep, fontWeight: 600 }}>
          Start free
        </Link>
      </Typography>
    </AuthShell>
  );
}
