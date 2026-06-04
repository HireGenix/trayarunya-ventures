'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useAuth } from '@/lib/auth';
import { Billing, ApiError, type Plan, type BillingSummary } from '@/lib/api';
import { BRAND } from '@/theme/theme';

function BillingPageInner() {
  const { activeWorkspace } = useAuth();
  const searchParams = useSearchParams();
  const checkoutParam = searchParams.get('checkout');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [portalPending, setPortalPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([
      Billing.plans().catch(() => []),
      Billing.summary().catch(() => null),
      Billing.checkoutStatus().catch(() => ({ configured: false })),
    ]).then(([p, s, st]) => {
      setPlans(p);
      setSummary(s);
      setStripeConfigured(Boolean(st?.configured));
      setLoading(false);
    });
  }, [activeWorkspace]);

  const handleUpgrade = useCallback(async (code: string) => {
    setError(null);
    setPendingCode(code);
    try {
      const res = await Billing.checkout(code);
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to start checkout');
      setPendingCode(null);
    }
  }, []);

  const handlePortal = useCallback(async () => {
    setError(null);
    setPortalPending(true);
    try {
      const res = await Billing.portal();
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to open billing portal');
      setPortalPending(false);
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentCode = summary?.plan?.code;
  const isPaidCurrent = Boolean(
    summary?.plan && summary.plan.price_monthly > 0 && summary.plan.code !== 'free',
  );

  return (
    <Stack spacing={3}>
      {checkoutParam === 'success' && (
        <Alert severity="success">
          Payment successful — your subscription is being activated. It may take a
          moment for your new plan to appear here.
        </Alert>
      )}
      {checkoutParam === 'cancel' && (
        <Alert severity="info">Checkout cancelled. No changes were made.</Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {!stripeConfigured && (
        <Alert severity="info">
          Stripe is not connected. Plan upgrades are disabled until billing is
          configured.
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
          >
            <Box>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Current plan
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h4" fontWeight={800}>
                  {summary?.plan?.name || 'Free'}
                </Typography>
                {summary?.plan && (
                  <Chip
                    color="primary"
                    label={
                      summary.plan.price_monthly === 0
                        ? 'Free'
                        : `$${summary.plan.price_monthly}/mo`
                    }
                  />
                )}
              </Stack>
            </Box>
            {isPaidCurrent && stripeConfigured && (
              <Button
                variant="outlined"
                startIcon={<CreditCardIcon />}
                onClick={handlePortal}
                disabled={portalPending}
              >
                {portalPending ? 'Opening…' : 'Manage billing'}
              </Button>
            )}
          </Stack>

          {summary && summary.usage.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                THIS PERIOD
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {summary.usage.map((u) => (
                  <Chip key={u.metric} label={`${u.metric}: ${u.quantity}`} variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {plans.map((p) => {
          const active = p.code === currentCode;
          const isFree = p.price_monthly === 0 || p.code === 'free';
          const canUpgrade = !active && !isFree;
          const upgrading = pendingCode === p.code;
          return (
            <Grid key={p.id} size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: active ? '2px solid' : '1px solid rgba(0,0,0,0.1)',
                  borderColor: active ? 'primary.main' : undefined,
                }}
              >
                <CardContent sx={{ p: 3, flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={800}>
                      {p.name}
                    </Typography>
                    {active && <Chip size="small" color="primary" label="Current" />}
                  </Stack>
                  <Typography variant="h4" fontWeight={800} sx={{ my: 1 }}>
                    {p.price_monthly === 0 ? 'Free' : `$${p.price_monthly}`}
                    {p.price_monthly > 0 && (
                      <Typography component="span" variant="body2" color="text.secondary">
                        {' '}
                        /mo
                      </Typography>
                    )}
                  </Typography>

                  {p.limits && Object.keys(p.limits).length > 0 && (
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                      {Object.entries(p.limits).map(([k, v]) => (
                        <Chip
                          key={k}
                          size="small"
                          variant="outlined"
                          label={`${k.replace(/_/g, ' ')}: ${v}`}
                        />
                      ))}
                    </Stack>
                  )}

                  {p.features && p.features.length > 0 && (
                    <List dense disablePadding>
                      {p.features.map((f, i) => (
                        <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CheckCircleIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={typeof f === 'string' ? f : JSON.stringify(f)}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>

                {canUpgrade && (
                  <Box sx={{ px: 3, pb: 3 }}>
                    {stripeConfigured ? (
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<RocketLaunchIcon />}
                        onClick={() => handleUpgrade(p.code)}
                        disabled={upgrading || Boolean(pendingCode)}
                        sx={{
                          background: BRAND.gradient,
                          color: '#fff',
                          fontWeight: 700,
                          '&:hover': { background: BRAND.gradientWarm },
                        }}
                      >
                        {upgrading ? 'Redirecting…' : 'Upgrade'}
                      </Button>
                    ) : (
                      <Tooltip title="Connect Stripe to enable checkout">
                        <span>
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<RocketLaunchIcon />}
                            disabled
                          >
                            Upgrade
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
          <CircularProgress />
        </Box>
      }
    >
      <BillingPageInner />
    </Suspense>
  );
}
