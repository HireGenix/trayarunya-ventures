'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import DashboardIcon from '@mui/icons-material/GridViewOutlined';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import PaletteIcon from '@mui/icons-material/PaletteOutlined';
import TravelExploreIcon from '@mui/icons-material/TravelExploreOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import BarChartIcon from '@mui/icons-material/BarChartOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCardOutlined';
import { useAuth } from '@/lib/auth';
import { Workspaces } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const DRAWER_WIDTH = 264;

type NavItem = { href: string; label: string; icon: React.ReactNode; color: string };
type NavGroup = { heading?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Overview', icon: <DashboardIcon fontSize="small" />, color: BRAND.amber },
    ],
  },
  {
    heading: 'Pipeline',
    items: [
      { href: '/dashboard/research', label: 'Research', icon: <ScienceIcon fontSize="small" />, color: BRAND.teal },
      { href: '/dashboard/insights', label: 'Insights', icon: <TravelExploreIcon fontSize="small" />, color: '#2563EB' },
      { href: '/dashboard/strategy', label: 'Strategy', icon: <InsightsIcon fontSize="small" />, color: BRAND.amber },
      { href: '/dashboard/studio', label: 'Content Studio', icon: <AutoAwesomeIcon fontSize="small" />, color: BRAND.pink },
      { href: '/dashboard/publishing', label: 'Publishing', icon: <SendIcon fontSize="small" />, color: BRAND.teal },
    ],
  },
  {
    heading: 'Brand & Growth',
    items: [
      { href: '/dashboard/brand', label: 'Brand Brain', icon: <PaletteIcon fontSize="small" />, color: BRAND.pink },
      { href: '/dashboard/ads', label: 'Ads', icon: <CampaignIcon fontSize="small" />, color: BRAND.amber },
      { href: '/dashboard/analytics', label: 'Analytics', icon: <BarChartIcon fontSize="small" />, color: BRAND.teal },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/dashboard/billing', label: 'Billing', icon: <CreditCardIcon fontSize="small" />, color: '#2563EB' },
    ],
  },
];

function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const ALL_ITEMS = NAV.flatMap((g) => g.items);

function isActive(href: string, pathname: string) {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { me, loading, workspaces, activeWorkspace, setActiveWorkspace, logout, refresh } =
    useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsSite, setWsSite] = useState('');

  useEffect(() => {
    if (!loading && !me) router.replace('/login');
  }, [loading, me, router]);

  if (loading || !me) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={26} thickness={5} sx={{ color: 'text.disabled' }} />
      </Box>
    );
  }

  const createWs = async () => {
    if (!wsName.trim()) return;
    const ws = await Workspaces.create({ name: wsName, website: wsSite || undefined });
    await refresh();
    setActiveWorkspace(ws.id);
    setNewWsOpen(false);
    setWsName('');
    setWsSite('');
  };

  const currentLabel = ALL_ITEMS.find((n) => isActive(n.href, pathname))?.label || 'Dashboard';
  const initials =
    (me.user.full_name || me.user.email || '?')
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Box
        component="aside"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          bgcolor: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(16px) saturate(160%)',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Brand */}
        <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.4}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                background: BRAND.gradient,
                color: '#fff',
                fontWeight: 800,
                fontSize: 17,
                boxShadow: '0 6px 16px rgba(20,187,135,0.28)',
              }}
            >
              T
            </Box>
            <Box sx={{ lineHeight: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>
                Trayarunya
              </Typography>
              <Typography
                sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.disabled', letterSpacing: '0.1em' }}
              >
                CONTENT ENGINE
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Workspace switcher */}
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Select
              size="small"
              fullWidth
              value={activeWorkspace?.id || ''}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              sx={{ fontSize: 13.5, fontWeight: 600, '& .MuiSelect-select': { py: 0.85 } }}
            >
              {workspaces.map((w) => (
                <MenuItem key={w.id} value={w.id} sx={{ fontSize: 13.5 }}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
            <Tooltip title="New workspace">
              <IconButton
                size="small"
                onClick={() => setNewWsOpen(true)}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  width: 34,
                  height: 34,
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Nav */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
          {NAV.map((group, gi) => (
            <Box key={gi} sx={{ mb: 1.5 }}>
              {group.heading && (
                <Typography
                  variant="overline"
                  sx={{ display: 'block', px: 1.25, pt: 1, pb: 0.5, color: 'text.disabled' }}
                >
                  {group.heading}
                </Typography>
              )}
              <Stack spacing={0.4}>
                {group.items.map((item) => {
                  const active = isActive(item.href, pathname);
                  return (
                    <Box
                      key={item.href}
                      component={Link}
                      href={item.href}
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        px: 1.25,
                        py: 0.95,
                        borderRadius: 2.5,
                        textDecoration: 'none',
                        color: active ? 'text.primary' : 'text.secondary',
                        bgcolor: active ? hexToRgba(item.color, 0.12) : 'transparent',
                        fontWeight: active ? 700 : 500,
                        fontSize: 13.5,
                        transition: 'background-color 0.14s ease, color 0.14s ease',
                        '&::before': active
                          ? {
                              content: '""',
                              position: 'absolute',
                              left: -6,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 3.5,
                              height: 20,
                              borderRadius: '0 4px 4px 0',
                              background: item.color,
                            }
                          : undefined,
                        '&:hover': {
                          bgcolor: active ? hexToRgba(item.color, 0.16) : '#F3F4F6',
                          color: 'text.primary',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          color: active ? '#fff' : 'text.disabled',
                          background: active ? item.color : 'transparent',
                          boxShadow: active ? `0 4px 10px ${hexToRgba(item.color, 0.35)}` : 'none',
                          transition: 'all 0.14s ease',
                          '.MuiBox-root:hover > &': { color: active ? '#fff' : item.color },
                        }}
                      >
                        {item.icon}
                      </Box>
                      <span>{item.label}</span>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Box>

        {/* User */}
        <Divider />
        <Box sx={{ p: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Avatar sx={{ width: 34, height: 34, background: BRAND.gradient, fontSize: 13, fontWeight: 800 }}>
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>
                {me.user.full_name || 'Member'}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }} noWrap>
                {me.user.email}
              </Typography>
            </Box>
            <Tooltip title="Log out">
              <IconButton size="small" onClick={logout} sx={{ color: 'text.disabled' }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>

      {/* Main */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            height: 56,
            px: { xs: 2, md: 3.5 },
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{currentLabel}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          {activeWorkspace?.website && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                bgcolor: '#F6F6F7',
                border: '1px solid',
                borderColor: 'divider',
                px: 1.25,
                py: 0.4,
                borderRadius: 2,
                fontSize: 12.5,
              }}
            >
              {activeWorkspace.website.replace(/^https?:\/\//, '')}
            </Typography>
          )}
        </Box>

        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 4 }, flexGrow: 1, maxWidth: 1400, width: '100%', mx: 'auto' }}>
          {children}
        </Box>
      </Box>

      {/* New workspace dialog */}
      <Dialog open={newWsOpen} onClose={() => setNewWsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>New workspace</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Workspace / brand name"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Website (optional)"
              placeholder="https://brand.com"
              value={wsSite}
              onChange={(e) => setWsSite(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setNewWsOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={createWs} variant="contained" color="primary">
            Create workspace
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
