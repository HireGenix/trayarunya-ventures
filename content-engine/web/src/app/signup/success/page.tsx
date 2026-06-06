'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useAuth } from '@/lib/auth';

function SuccessInner() {
  const { completeSignup } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!sessionId) {
      setError('Missing checkout session. If you were charged, please log in or contact support.');
      return;
    }
    completeSignup(sessionId).catch((err) => {
      setError(err instanceof Error ? err.message : 'We could not finalize your account yet.');
    });
  }, [sessionId, completeSignup]);

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
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {!error ? (
            <Stack spacing={2.5} alignItems="center">
              <CheckCircleRoundedIcon sx={{ fontSize: 56, color: '#14BB87' }} />
              <Typography variant="h5" fontWeight={800}>
                Payment successful
              </Typography>
              <Typography color="text.secondary">
                Provisioning your workspace and signing you in…
              </Typography>
              <CircularProgress size={26} />
            </Stack>
          ) : (
            <Stack spacing={2.5} alignItems="center">
              <Typography variant="h5" fontWeight={800}>
                Almost there
              </Typography>
              <Alert severity="warning" sx={{ width: '100%' }}>
                {error}
              </Alert>
              <Typography color="text.secondary" variant="body2">
                Your payment may still be processing. Try logging in with the email and
                password you just chose — it can take a few seconds.
              </Typography>
              <Button component={Link} href="/login" variant="contained" size="large">
                Go to login
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
