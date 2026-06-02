'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  TrendingUp as TrendingUpIcon,
  Bolt as BoltIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { login, checkAuth } from '@/services/auth';

const GOLD = '#ffaf06';
const SIDE_BG = '#0e1726';

const HIGHLIGHTS = [
  { icon: <TrendingUpIcon />, title: 'Real-time growth analytics', desc: 'Track leads, traffic & conversions live.' },
  { icon: <BoltIcon />, title: 'AI marketing copilot', desc: 'Research, write & strategize in seconds.' },
  { icon: <VerifiedUserIcon />, title: 'Secure & role-based', desc: 'Admin and super-admin access control.' },
];

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = checkAuth();
    if (auth.isAuthenticated) router.push('/admin');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.isAuthenticated) router.push('/admin');
      else setError(result.error || 'Invalid email or password');
    } catch {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#f6f7f9' }}>
      {/* Left brand panel */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '48%',
          maxWidth: 620,
          position: 'relative',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          bgcolor: SIDE_BG,
          color: '#fff',
          overflow: 'hidden',
        }}
      >
        {/* gradient orbs */}
        <Box
          component={motion.div}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 1.4 }}
          sx={{
            position: 'absolute',
            top: '-15%',
            right: '-10%',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(GOLD, 0.5)} 0%, rgba(0,0,0,0) 70%)`,
            filter: 'blur(60px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-20%',
            left: '-15%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha('#14bb87', 0.35)} 0%, rgba(0,0,0,0) 70%)`,
            filter: 'blur(70px)',
          }}
        />

        {/* Brand */}
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '13px',
              background: `linear-gradient(135deg, ${GOLD}, #ff8a00)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: SIDE_BG,
              fontSize: 24,
            }}
          >
            T
          </Box>
          <Box sx={{ lineHeight: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Trayarunya</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 13, color: GOLD, letterSpacing: 1.5 }}>
              VENTURES
            </Typography>
          </Box>
        </Box>

        {/* Headline + highlights */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Typography sx={{ fontSize: 34, fontWeight: 800, lineHeight: 1.2, mb: 1.5 }}>
              Your B2B growth,
              <Box component="span" sx={{ color: GOLD }}>
                {' '}
                command centre.
              </Box>
            </Typography>
            <Typography sx={{ color: alpha('#fff', 0.7), mb: 4, maxWidth: 420 }}>
              Manage leads, content, SEO and AI-driven strategy — all in one place.
            </Typography>
          </motion.div>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {HIGHLIGHTS.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      bgcolor: alpha(GOLD, 0.14),
                      color: GOLD,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {h.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{h.title}</Typography>
                    <Typography sx={{ color: alpha('#fff', 0.6), fontSize: 13 }}>{h.desc}</Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Box>

        <Typography sx={{ position: 'relative', zIndex: 1, color: alpha('#fff', 0.4), fontSize: 12 }}>
          © {new Date().getFullYear()} Trayarunya Ventures. All rights reserved.
        </Typography>
      </Box>

      {/* Right form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: 420 }}
        >
          {/* Mobile brand */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.25,
              mb: 4,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${GOLD}, #ff8a00)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: SIDE_BG,
                fontSize: 22,
              }}
            >
              T
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Trayarunya Ventures</Typography>
          </Box>

          <Typography sx={{ fontSize: 28, fontWeight: 800, mb: 0.5 }}>Welcome back</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Sign in to your admin dashboard.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.75 }}>Email address</Typography>
            <TextField
              fullWidth
              required
              autoFocus
              placeholder="you@trayarunyaventures.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: 'text.disabled' }} fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.75 }}>Password</Typography>
            <TextField
              fullWidth
              required
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'text.disabled' }} fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.4,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: 16,
                bgcolor: GOLD,
                color: '#0e1726',
                boxShadow: `0 8px 22px ${alpha(GOLD, 0.4)}`,
                '&:hover': { bgcolor: '#e69e00', boxShadow: `0 10px 28px ${alpha(GOLD, 0.5)}` },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#0e1726' }} /> : 'Sign in'}
            </Button>
          </Box>

          <Box
            sx={{
              mt: 4,
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(GOLD, 0.07),
              border: `1px dashed ${alpha(GOLD, 0.4)}`,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
              DEMO CREDENTIALS
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              admin@trayarunyaventures.com / admin123
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              superadmin@trayarunyaventures.com / superadmin123
            </Typography>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
}
