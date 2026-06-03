'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/lib/auth';

const ORG_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'company', label: 'Company' },
  { value: 'agency', label: 'Agency' },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    org_name: '',
    org_type: 'company',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 480 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Create your workspace
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Start your agentic content engine in seconds.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <TextField label="Full name" value={form.full_name} onChange={update('full_name')} required fullWidth />
              <TextField label="Work email" type="email" value={form.email} onChange={update('email')} required fullWidth autoComplete="email" />
              <TextField label="Password" type="password" value={form.password} onChange={update('password')} required fullWidth helperText="At least 8 characters" autoComplete="new-password" />
              <TextField label="Organization name" value={form.org_name} onChange={update('org_name')} required fullWidth />
              <TextField select label="You are a…" value={form.org_type} onChange={update('org_type')} fullWidth>
                {ORG_TYPES.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button type="submit" variant="contained" color="primary" size="large" disabled={loading}>
                {loading ? 'Creating…' : 'Create workspace'}
              </Button>
            </Stack>
          </form>
          <Typography sx={{ mt: 3 }} color="text.secondary">
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#d99000', fontWeight: 600 }}>
              Log in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
