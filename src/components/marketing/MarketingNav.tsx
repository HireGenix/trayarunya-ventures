'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppBar, Box, Button, Container, Drawer, IconButton, Stack, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Logo } from './Logo';
import { nav } from '@/lib/marketing';
import { DAY } from './primitives';
import { LaunchBanner } from './ProductHunt';

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
    <AppBar elevation={0} position="fixed" sx={{ bgcolor: 'transparent', transition: 'padding .3s ease' }}>
      <LaunchBanner collapsed={scrolled} />
      <Container maxWidth="lg">
        <Box
          sx={{
            mt: scrolled ? 1.25 : 0,
            borderRadius: scrolled ? '999px' : 0,
            border: `1px solid ${scrolled ? DAY.line : 'transparent'}`,
            background: scrolled ? 'rgba(255,255,255,0.78)' : 'transparent',
            backdropFilter: scrolled ? 'saturate(160%) blur(18px)' : 'none',
            boxShadow: scrolled ? '0 18px 44px -18px rgba(12,20,36,0.2)' : 'none',
            px: scrolled ? { xs: 2, md: 2.75 } : 0,
            transition: 'all .35s cubic-bezier(.22,1,.36,1)',
          }}
        >
          <Toolbar disableGutters sx={{ minHeight: { xs: 60, md: scrolled ? 60 : 76 }, transition: 'min-height .3s ease' }}>
            <Logo size={22} />
            <Box sx={{ flexGrow: 1 }} />

            <Stack direction="row" spacing={3.25} sx={{ display: { xs: 'none', md: 'flex' }, mr: 4 }}>
              {nav.map((n) => (
                <Box
                  key={n.href}
                  component="a"
                  href={n.href}
                  sx={{
                    position: 'relative',
                    fontSize: 14,
                    fontWeight: 600,
                    color: DAY.sub,
                    textDecoration: 'none',
                    py: 0.5,
                    transition: 'color .2s ease',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      bottom: 0,
                      width: '100%',
                      height: 1.5,
                      borderRadius: 2,
                      background: DAY.gradient,
                      transform: 'scaleX(0)',
                      transformOrigin: 'left',
                      transition: 'transform .3s cubic-bezier(.22,1,.36,1)',
                    },
                    '&:hover': { color: DAY.text },
                    '&:hover::after': { transform: 'scaleX(1)' },
                  }}
                >
                  {n.label}
                </Box>
              ))}
            </Stack>

            <Stack direction="row" spacing={1.25} sx={{ display: { xs: 'none', md: 'flex' } }}>
              <Button component={Link} href="https://mymarketiq.online" sx={{ color: DAY.sub, fontWeight: 700, '&:hover': { color: DAY.text, background: 'rgba(13,23,44,0.05)' } }}>
                Log in
              </Button>
              <Button
                component={Link}
                href="https://mymarketiq.online"
                variant="contained"
                sx={{
                  px: 2.5,
                  fontWeight: 700,
                  borderRadius: '999px',
                  color: '#0E1422',
                  background: DAY.gradient,
                  boxShadow: '0 10px 28px -10px rgba(14,164,122,0.45),  0 6px 18px -8px rgba(255,157,0,0.4)',
                  transition: 'all .25s ease',
                  '&:hover': { filter: 'brightness(1.07)', background: DAY.gradient, transform: 'translateY(-1px)' },
                }}
              >
                Start free
              </Button>
            </Stack>

            <IconButton
              onClick={() => setOpen(true)}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, color: DAY.text }}
              aria-label="Open menu"
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Box>
      </Container>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: { background: DAY.bg2, borderLeft: `1px solid ${DAY.line}`, backgroundImage: 'none' } } }}
      >
        <Box sx={{ width: 290, p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Logo size={20} href={null} />
            <IconButton onClick={() => setOpen(false)} aria-label="Close menu" sx={{ color: DAY.text }}>
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
                  py: 1.3,
                  px: 1.25,
                  borderRadius: '10px',
                  fontWeight: 600,
                  color: DAY.sub,
                  textDecoration: 'none',
                  transition: 'all .2s ease',
                  '&:hover': { bgcolor: 'rgba(13,23,44,0.05)', color: DAY.text, pl: 1.75 },
                }}
              >
                {n.label}
              </Box>
            ))}
          </Stack>
          <Stack spacing={1.25} sx={{ mt: 3 }}>
            <Button
              component={Link}
              href="https://mymarketiq.online"
              variant="outlined"
              fullWidth
              sx={{ fontWeight: 700, borderRadius: 999, color: DAY.text, borderColor: 'rgba(13,23,44,0.18)', '&:hover': { borderColor: 'rgba(13,23,44,0.34)', background: 'rgba(13,23,44,0.04)' } }}
            >
              Log in
            </Button>
            <Button
              component={Link}
              href="https://mymarketiq.online"
              variant="contained"
              fullWidth
              sx={{ fontWeight: 700, borderRadius: 999, color: '#0E1422', background: DAY.gradient, '&:hover': { background: DAY.gradient, filter: 'brightness(1.07)' } }}
            >
              Start free
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </AppBar>
  );
}
