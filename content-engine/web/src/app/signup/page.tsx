'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useAuth } from '@/lib/auth';
import { AuthShell } from '@/components/auth/AuthShell';

const ORG_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'company', label: 'Company' },
  { value: 'agency', label: 'Agency' },
];

const MONTHLY = 499;
const YEARLY_PER_MONTH = Math.round(MONTHLY * 0.75); // 25% off
const YEARLY_TOTAL = Math.round(MONTHLY * 12 * 0.75);
const INTRO_MONTHLY = Math.round(MONTHLY * 0.5); // launch: 50% off year 1
const INTRO_YEARLY_PER_MONTH = Math.round(YEARLY_PER_MONTH * 0.5);
const INTRO_YEARLY_TOTAL = Math.round(YEARLY_TOTAL * 0.5);
const TAPER_NOTE = '50% off year 1 · 25% off years 2-3 · then standard price';

function SignupInner() {
  const { startCheckout, signup } = useAuth();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('checkout') === 'cancel';

  const [plan, setPlan] = useState<'pro' | 'free'>(
    searchParams.get('plan') === 'free' ? 'free' : 'pro',
  );
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
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
      if (plan === 'free') {
        await signup(form);
      } else {
        await startCheckout({ ...form, interval });
      }
      // Free: redirects to dashboard. Paid: redirects to Stripe Checkout.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
      setLoading(false);
    }
  };

  const introNow = interval === 'yearly' ? INTRO_YEARLY_PER_MONTH : INTRO_MONTHLY;
  const introList = interval === 'yearly' ? YEARLY_PER_MONTH : MONTHLY;

  return (
    <AuthShell
      eyebrow="GET STARTED"
      title="Start your MarketiQ AI"
      subtitle={
        plan === 'free'
          ? 'Create your free workspace — no card required. Upgrade anytime.'
          : 'Choose your billing, then complete secure checkout. Your workspace is created the moment payment succeeds.'
      }
    >

          {canceled && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Checkout canceled — you have not been charged. Pick up where you left off.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <ToggleButtonGroup
            exclusive
            fullWidth
            value={plan}
            onChange={(_, v) => v && setPlan(v)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="pro" sx={{ fontWeight: 700, textTransform: 'none' }}>
              Pro · 50% off
            </ToggleButton>
            <ToggleButton value="free" sx={{ fontWeight: 700, textTransform: 'none' }}>
              Free
            </ToggleButton>
          </ToggleButtonGroup>

          {plan === 'pro' ? (
            <>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={interval}
                onChange={(_, v) => v && setInterval(v)}
                sx={{ mb: 1 }}
              >
                <ToggleButton value="monthly" sx={{ fontWeight: 700, textTransform: 'none' }}>
                  Monthly
                </ToggleButton>
                <ToggleButton value="yearly" sx={{ fontWeight: 700, textTransform: 'none' }}>
                  Yearly · save 25%
                </ToggleButton>
              </ToggleButtonGroup>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1 }}>
                <Typography
                  component="span"
                  sx={{ fontWeight: 700, color: 'text.disabled', textDecoration: 'line-through' }}
                >
                  ${introList}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.4rem' }}>${introNow}</Typography>
                <Typography variant="body2" color="text.secondary">
                  /mo{interval === 'yearly' ? ` · billed yearly at $${INTRO_YEARLY_TOTAL.toLocaleString()}` : ''}
                </Typography>
              </Stack>
              <Typography sx={{ mb: 3, fontSize: 12.5, fontWeight: 600, color: 'success.main' }}>
                {TAPER_NOTE}
              </Typography>
            </>
          ) : (
            <Typography sx={{ mb: 3, fontSize: 13.5, color: 'text.secondary' }}>
              Includes 1 workspace, 2 research runs, 1 strategy, 1 content calendar and 5 posts.
            </Typography>
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
              <Button type="submit" variant="contained" color="primary" size="large" disabled={loading} startIcon={<LockRoundedIcon />}>
                {loading
                  ? plan === 'free'
                    ? 'Creating your workspace…'
                    : 'Redirecting to secure checkout…'
                  : plan === 'free'
                    ? 'Create free account'
                    : `Continue to payment · $${introNow}/mo`}
              </Button>
            </Stack>
          </form>

          <Typography sx={{ mt: 2 }} variant="caption" color="text.secondary" display="block">
            Secured by Stripe. Cancel anytime. Need seats for a team?{' '}
            <a href="mailto:info@trayarunyaventures.com?subject=MarketiQ%20AI%20Teams" style={{ color: '#E59400', fontWeight: 600 }}>
              Contact sales
            </a>
            .
          </Typography>
          <Typography sx={{ mt: 3 }} color="text.secondary">
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#E59400', fontWeight: 600 }}>
              Log in
            </Link>
          </Typography>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
