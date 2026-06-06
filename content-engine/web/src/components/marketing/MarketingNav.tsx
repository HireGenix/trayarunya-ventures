'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Logo } from './Logo';
import { nav } from '@/lib/marketing';

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AppBar
      elevation={0}
      position="fixed"
      sx={{
        bgcolor: scrolled ? 'rgba(255,255,255,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(14,17,22,0.07)' : '1px solid transparent',
        transition: 'all .25s ease',
        color: '#0E1116',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 76 } }}>
          <Logo size={24} />
          <Box sx={{ flexGrow: 1 }} />

          <Stack
            direction="row"
            spacing={3.5}
            sx={{ display: { xs: 'none', md: 'flex' }, mr: 4 }}
          >
            {nav.map((n) => (
              <Box
                key={n.href}
                component="a"
                href={n.href}
                sx={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: '#3A4250',
                  textDecoration: 'none',
                  '&:hover': { color: '#0E1116' },
                }}
              >
                {n.label}
              </Box>
            ))}
          </Stack>

          <Stack direction="row" spacing={1.25} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Button component={Link} href="/login" sx={{ color: '#3A4250', fontWeight: 700 }}>
              Log in
            </Button>
            <Button
              component={Link}
              href="/signup"
              variant="contained"
              sx={{
                px: 2.4,
                fontWeight: 700,
                borderRadius: '999px',
                color: '#0a0a0a',
                background: 'linear-gradient(135deg,#FFAF06,#14BB87)',
                boxShadow: '0 10px 24px -12px rgba(255,175,6,0.7)',
                '&:hover': { filter: 'brightness(1.05)', background: 'linear-gradient(135deg,#FFAF06,#14BB87)' },
              }}
            >
              Start free
            </Button>
          </Stack>

          <IconButton
            onClick={() => setOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#0E1116' }}
            aria-label="Open menu"
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </Container>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280, p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Logo size={22} href={null} />
            <IconButton onClick={() => setOpen(false)} aria-label="Close menu">
              <CloseIcon />
            </IconButton>
          </Stack>
          <Stack spacing={0.5}>
            {nav.map((n) => (
              <Box
                key={n.href}
                component="a"
                href={n.href}
                onClick={() => setOpen(false)}
                sx={{
                  py: 1.2,
                  px: 1,
                  borderRadius: 2,
                  fontWeight: 600,
                  color: '#3A4250',
                  textDecoration: 'none',
                  '&:hover': { bgcolor: 'rgba(14,17,22,0.04)' },
                }}
              >
                {n.label}
              </Box>
            ))}
          </Stack>
          <Stack spacing={1.25} sx={{ mt: 3 }}>
            <Button component={Link} href="/login" variant="outlined" fullWidth sx={{ fontWeight: 700, borderRadius: 999 }}>
              Log in
            </Button>
            <Button
              component={Link}
              href="/signup"
              variant="contained"
              fullWidth
              sx={{
                fontWeight: 700,
                borderRadius: 999,
                color: '#0a0a0a',
                background: 'linear-gradient(135deg,#FFAF06,#14BB87)',
              }}
            >
              Start free
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </AppBar>
  );
}
