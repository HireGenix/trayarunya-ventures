'use client';

import { useEffect, useState } from 'react';
import {
  Box,
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
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '@/lib/auth';
import { Billing, type Plan, type BillingSummary } from '@/lib/api';

export default function BillingPage() {
  const { activeWorkspace } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([Billing.plans().catch(() => []), Billing.summary().catch(() => null)]).then(
      ([p, s]) => {
        setPlans(p);
        setSummary(s);
        setLoading(false);
      },
    );
  }, [activeWorkspace]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentCode = summary?.plan?.code;

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
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
          return (
            <Grid key={p.id} size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  border: active ? '2px solid' : '1px solid rgba(0,0,0,0.1)',
                  borderColor: active ? 'primary.main' : undefined,
                }}
              >
                <CardContent sx={{ p: 3 }}>
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
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
