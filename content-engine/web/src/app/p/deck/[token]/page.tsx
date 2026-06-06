'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// DeckViewer exports the per-slide renderer and the fullscreen presenter.
import { Slide, PresentMode } from '@/components/DeckViewer';
import { DeckPublic, ApiError } from '@/lib/api';
import type { Deck, DeckShareMeta } from '@/lib/api';

// SSR-safe slide visibility tracker. IntersectionObserver is browser-only, so
// it is created inside a useEffect (never at module/component top level) and is
// cleaned up when the slide unmounts.
function SlideTracker({
  index,
  onVisible,
  children,
}: {
  index: number;
  onVisible: (idx: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof IntersectionObserver === 'undefined') return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(index);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, onVisible]);

  return (
    <Box
      ref={ref}
      sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.45)' }}
    >
      {children}
    </Box>
  );
}

export default function SharedDeckPage() {
  const params = useParams();
  const token = params.token as string;

  const [meta, setMeta] = useState<DeckShareMeta | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [present, setPresent] = useState(false);

  // Unlock gate state
  const [gated, setGated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // Analytics beacon state
  const sessionIdRef = useRef<string>('');
  const currentSlideRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load meta first
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const m = await DeckPublic.meta(token);
        if (cancelled) return;
        setMeta(m);
        if (m.expired) {
          setError('This share link has expired.');
          setLoading(false);
          return;
        }
        if (m.require_email || m.require_password) {
          setGated(true);
          setLoading(false);
          return;
        }
        // No gate — load deck directly
        const d = await DeckPublic.get(token);
        if (!cancelled) setDeck(d);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Failed to load deck');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Record view + start heartbeat when deck loads
  useEffect(() => {
    if (!deck || !token) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    (async () => {
      try {
        const { session_id } = await DeckPublic.recordView(token);
        if (!cancelled) {
          sessionIdRef.current = session_id;
        }
      } catch {
        // non-critical
      }
    })();

    // Heartbeat every 5 seconds
    heartbeatRef.current = setInterval(() => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      DeckPublic.heartbeat(token, {
        session_id: sid,
        slide_index: currentSlideRef.current,
        delta_seconds: 5,
      }).catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [deck, token]);

  const handleUnlock = useCallback(async () => {
    if (!token) return;
    setUnlocking(true);
    setUnlockError('');
    try {
      const d = await DeckPublic.unlock(token, {
        email: email || undefined,
        password: password || undefined,
      });
      setDeck(d);
      setGated(false);
    } catch (e) {
      setUnlockError(e instanceof ApiError ? e.message : 'Could not unlock deck');
    } finally {
      setUnlocking(false);
    }
  }, [token, email, password]);

  // Track which slide the user scrolls to (for heartbeat)
  const handleSlideVisible = useCallback((idx: number) => {
    currentSlideRef.current = idx;
  }, []);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FAFAFA' }}>
        <CircularProgress sx={{ color: '#14BB87' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#FAFAFA', gap: 2 }}>
        <Typography sx={{ fontSize: 48, color: '#E5E7EB' }}>⏱️</Typography>
        <Typography sx={{ fontSize: 16, color: '#6B7280' }}>{error}</Typography>
      </Box>
    );
  }

  // Unlock gate
  if (gated && !deck) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0E1116' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            mx: 2,
            p: 4,
            borderRadius: 3,
            bgcolor: '#1A1D23',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Stack spacing={3} alignItems="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
              }}
            >
              <LockOutlinedIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#fff', textAlign: 'center' }}>
              {meta?.title || 'Shared Presentation'}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
              {meta?.require_password && meta?.require_email
                ? 'Enter your email and the password to view this deck.'
                : meta?.require_password
                  ? 'Enter the password to view this deck.'
                  : 'Enter your email to view this deck.'}
            </Typography>
            {meta?.require_email && (
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                }}
              />
            )}
            {meta?.require_password && (
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                }}
              />
            )}
            {unlockError && (
              <Typography sx={{ fontSize: 13, color: '#F87171' }}>{unlockError}</Typography>
            )}
            <Button
              variant="contained"
              fullWidth
              disabled={
                unlocking ||
                (meta?.require_email && !email) ||
                (meta?.require_password && !password) ||
                false
              }
              onClick={handleUnlock}
              sx={{
                background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
                fontWeight: 700,
                textTransform: 'none',
                py: 1.2,
              }}
            >
              {unlocking ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'View Deck'}
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  if (!deck) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#FAFAFA', gap: 2 }}>
        <Typography sx={{ fontSize: 48, color: '#E5E7EB' }}>404</Typography>
        <Typography sx={{ fontSize: 16, color: '#6B7280' }}>Deck not found</Typography>
      </Box>
    );
  }

  const slides = deck.slides || [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0E1116', display: 'flex', flexDirection: 'column' }}>
      {present && slides.length > 0 && (
        <PresentMode slides={slides} theme={deck.theme} onClose={() => setPresent(false)} />
      )}

      <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
          {deck.title || 'Shared Deck'}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', ml: 1 }}>
          — shared presentation
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          startIcon={<SlideshowIcon />}
          disabled={!slides.length}
          onClick={() => setPresent(true)}
          sx={{ textTransform: 'none', color: '#14BB87' }}
        >
          Present
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', py: { xs: 2, md: 4 } }}>
        {slides.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
            <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
              This deck has no slides yet.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={{ xs: 2, md: 4 }} sx={{ width: '100%', maxWidth: 1280, mx: 'auto', px: { xs: 1.5, md: 3 } }}>
            {slides.map((slide, idx) => (
              <SlideTracker key={slide.id || idx} index={idx} onVisible={handleSlideVisible}>
                <Slide slide={slide} theme={deck.theme} index={idx} total={slides.length} />
              </SlideTracker>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
