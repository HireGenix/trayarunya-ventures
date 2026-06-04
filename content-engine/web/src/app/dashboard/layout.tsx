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
  Drawer,
  IconButton,
  Menu,
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
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCardOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import BiotechIcon from '@mui/icons-material/BiotechOutlined';
import AutoGraphIcon from '@mui/icons-material/AutoGraphOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import RadarIcon from '@mui/icons-material/RadarOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunchOutlined';
import HubIcon from '@mui/icons-material/HubOutlined';
import AccountTreeIcon from '@mui/icons-material/AccountTreeOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import MenuIcon from '@mui/icons-material/MenuOutlined';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import { useAuth } from '@/lib/auth';
import { Workspaces, Calendar } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import NotificationBell from '@/components/NotificationBell';

const INK = BRAND.ink;

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
      { href: '/dashboard/calendar', label: 'Content Calendar', icon: <CalendarMonthIcon fontSize="small" />, color: '#2563EB' },
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
      { href: '/dashboard/reports', label: 'Reports', icon: <AssessmentIcon fontSize="small" />, color: '#7C3AED' },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { href: '/dashboard/creative', label: 'Creative Intel', icon: <AutoGraphIcon fontSize="small" />, color: BRAND.pink },
      { href: '/dashboard/experiments', label: 'Experiments', icon: <BiotechIcon fontSize="small" />, color: BRAND.teal },
      { href: '/dashboard/forecast', label: 'Forecast', icon: <TrendingUpIcon fontSize="small" />, color: BRAND.amber },
      { href: '/dashboard/watchtower', label: 'Watchtower', icon: <RadarIcon fontSize="small" />, color: '#7C3AED' },
    ],
  },
  {
    heading: 'B2B Engine',
    items: [
      { href: '/dashboard/abm', label: 'ABM Accounts', icon: <BusinessIcon fontSize="small" />, color: '#2563EB' },
      { href: '/dashboard/campaigns', label: 'Campaign Builder', icon: <RocketLaunchIcon fontSize="small" />, color: BRAND.amber },
      { href: '/dashboard/attribution', label: 'Revenue Attribution', icon: <AccountTreeIcon fontSize="small" />, color: BRAND.teal },
    ],
  },
  {
    heading: 'Automation',
    items: [
      { href: '/dashboard/automations', label: 'Workflows', icon: <BoltIcon fontSize="small" />, color: BRAND.amber },
      { href: '/dashboard/tasks', label: 'Tasks', icon: <TaskAltIcon fontSize="small" />, color: BRAND.teal },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/dashboard/clients', label: 'Client Portal', icon: <GroupsIcon fontSize="small" />, color: BRAND.pink },
      { href: '/dashboard/integrations', label: 'Integrations', icon: <HubIcon fontSize="small" />, color: BRAND.teal },
      { href: '/dashboard/billing', label: 'Billing', icon: <CreditCardIcon fontSize="small" />, color: '#2563EB' },
    ],
  },
];

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
  const [userMenuEl, setUserMenuEl] = useState<null | HTMLElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !me) router.replace('/login');
  }, [loading, me, router]);

  useEffect(() => {
    if (!activeWorkspace) return;
    let cancelled = false;
    Calendar.list()
      .then((cals) => {
        if (cancelled) return;
        const pending = cals.reduce(
          (acc, c) => acc + c.entries.filter((e) => e.status !== 'generated').length,
          0,
        );
        setPendingCount(pending);
      })
      .catch(() => setPendingCount(0));
    return () => { cancelled = true; };
  }, [activeWorkspace, pathname]);

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
    <ConfirmProvider>
      <Box
        sx={{
          height: '100vh',
          overflow: 'hidden',
          background: 'linear-gradient(180deg,#EAF0EC 0%,#E6ECE8 100%)',
          p: { xs: 1, md: 2 },
        }}
      >
        {/* One unified app card */}
        <Box
          sx={{
            display: 'flex',
            height: { xs: 'calc(100vh - 16px)', md: 'calc(100vh - 32px)' },
            overflow: 'hidden',
            bgcolor: '#fff',
            borderRadius: { xs: '24px', md: '32px' },
            border: '1px solid rgba(14,17,22,0.06)',
            boxShadow: '0 30px 60px rgba(14,17,22,0.10)',
          }}
        >
      {/* Sidebar — dark icon rail (inside card) */}
      <Box
        component="aside"
        sx={{
          width: 84,
          flexShrink: 0,
          alignSelf: 'stretch',
          height: '100%',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          p: 1.5,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            bgcolor: INK,
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            boxShadow: '0 12px 30px rgba(14,17,22,0.22)',
          }}
        >
          {/* Logo */}
          <Tooltip title="Trayarunya — Overview" placement="right" arrow>
            <Box
              component={Link}
              href="/dashboard"
              sx={{
                flexShrink: 0,
                width: 52,
                height: 52,
                borderRadius: '17px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(255,255,255,0.07)',
                textDecoration: 'none',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '11px',
                  display: 'grid',
                  placeItems: 'center',
                  background: BRAND.gradient,
                  color: '#fff',
                  boxShadow: '0 6px 16px rgba(20,187,135,0.4)',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 19 }} />
              </Box>
            </Box>
          </Tooltip>

          {/* Nav icons */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(255,255,255,0.18)',
                borderRadius: 4,
              },
              '&:hover::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            {NAV.map((group, gi) => (
              <Box
                key={gi}
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                {gi > 0 && (
                  <Box sx={{ width: 26, height: '1px', bgcolor: 'rgba(255,255,255,0.10)', my: 0.75 }} />
                )}
                {group.items.map((item) => {
                  const active = isActive(item.href, pathname);
                  const badge = item.href === '/dashboard/studio' && pendingCount > 0 ? pendingCount : 0;
                  return (
                    <Tooltip
                      key={item.href}
                      title={badge ? `${item.label} · ${badge} planned to generate` : item.label}
                      placement="right"
                      arrow
                    >
                      <Box
                        component={Link}
                        href={item.href}
                        aria-label={item.label}
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: '15px',
                          display: 'grid',
                          placeItems: 'center',
                          textDecoration: 'none',
                          position: 'relative',
                          color: active ? INK : 'rgba(255,255,255,0.55)',
                          bgcolor: active ? '#fff' : 'transparent',
                          boxShadow: active ? '0 6px 16px rgba(0,0,0,0.30)' : 'none',
                          transition: 'all .15s ease',
                          '&:hover': {
                            bgcolor: active ? '#fff' : 'rgba(255,255,255,0.09)',
                            color: active ? INK : '#fff',
                          },
                        }}
                      >
                        {item.icon}
                        {badge > 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 3,
                              right: 3,
                              minWidth: 17,
                              height: 17,
                              px: 0.4,
                              borderRadius: '999px',
                              bgcolor: BRAND.pink,
                              color: '#fff',
                              fontSize: 10.5,
                              fontWeight: 800,
                              lineHeight: '17px',
                              textAlign: 'center',
                              border: '2px solid',
                              borderColor: INK,
                              boxShadow: '0 2px 6px rgba(217,44,74,0.5)',
                            }}
                          >
                            {badge > 9 ? '9+' : badge}
                          </Box>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            ))}
          </Box>

          {/* User avatar + menu */}
          <Box sx={{ flexShrink: 0, mt: 1.5, width: '100%', px: 1 }}>
            <Tooltip title="Account" placement="right" arrow>
              <IconButton
                onClick={(e) => setUserMenuEl(e.currentTarget)}
                sx={{
                  p: 0.75,
                  width: '100%',
                  borderRadius: '18px',
                  bgcolor: '#fff',
                  '&:hover': { bgcolor: '#fff' },
                  boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '13px',
                    background: BRAND.gradient,
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  {initials}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Account menu */}
      <Menu
        anchorEl={userMenuEl}
        open={!!userMenuEl}
        onClose={() => setUserMenuEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { borderRadius: 2.5, minWidth: 220, mt: -1 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700 }} noWrap>
            {me.user.full_name || 'Member'}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.disabled' }} noWrap>
            {me.user.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setUserMenuEl(null);
            setNewWsOpen(true);
          }}
          sx={{ fontSize: 13.5 }}
        >
          <AddIcon fontSize="small" sx={{ mr: 1.25, color: 'text.disabled' }} />
          New workspace
        </MenuItem>
        <MenuItem
          onClick={() => {
            setUserMenuEl(null);
            logout();
          }}
          sx={{ fontSize: 13.5 }}
        >
          <LogoutIcon fontSize="small" sx={{ mr: 1.25, color: 'text.disabled' }} />
          Log out
        </MenuItem>
      </Menu>

      {/* Mobile navigation drawer */}
      <Drawer
        anchor="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
        slotProps={{ paper: { sx: { width: 280, bgcolor: INK, color: '#fff', p: 2 } } }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2, px: 0.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              background: BRAND.gradient,
              color: '#fff',
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 19 }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Trayarunya</Typography>
        </Stack>
        <Box sx={{ overflowY: 'auto' }}>
          {NAV.map((group, gi) => (
            <Box key={gi} sx={{ mb: 1.5 }}>
              {group.heading && (
                <Typography
                  sx={{
                    px: 1,
                    py: 0.5,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {group.heading}
                </Typography>
              )}
              {group.items.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <Box
                    key={item.href}
                    component={Link}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      px: 1,
                      py: 1,
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: active ? INK : 'rgba(255,255,255,0.75)',
                      bgcolor: active ? '#fff' : 'transparent',
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                      '&:hover': { bgcolor: active ? '#fff' : 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    <Box sx={{ display: 'grid', placeItems: 'center', color: active ? item.color : 'inherit' }}>
                      {item.icon}
                    </Box>
                    {item.label}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Drawer>

      {/* Main */}
      <Box sx={{ flexGrow: 1, minWidth: 0, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <Box
          sx={{
            height: 60,
            flexShrink: 0,
            px: { xs: 2, md: 4 },
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'rgba(14,17,22,0.06)',
          }}
        >
          <IconButton
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1, ml: -0.5 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{currentLabel}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          {activeWorkspace?.website && (
            <Typography
              variant="body2"
              sx={{
                display: { xs: 'none', sm: 'block' },
                color: 'text.secondary',
                bgcolor: '#F6F6F7',
                border: '1px solid',
                borderColor: 'divider',
                px: 1.25,
                py: 0.4,
                borderRadius: 2,
                fontSize: 12.5,
                mr: 1.5,
              }}
            >
              {activeWorkspace.website.replace(/^https?:\/\//, '')}
            </Typography>
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            <NotificationBell />
            <Select
              size="small"
              value={activeWorkspace?.id || ''}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              sx={{
                fontSize: 13.5,
                fontWeight: 600,
                minWidth: 160,
                borderRadius: 2,
                '& .MuiSelect-select': { py: 0.7 },
              }}
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

        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 3.5 }, flexGrow: 1, minHeight: 0, width: '100%', overflowY: 'auto' }}>
          {children}
        </Box>
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
    </ConfirmProvider>
  );
}
