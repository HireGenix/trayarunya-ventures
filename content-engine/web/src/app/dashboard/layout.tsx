'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
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
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import InsightsIcon from '@mui/icons-material/Insights';
import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import PaletteIcon from '@mui/icons-material/Palette';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import CampaignIcon from '@mui/icons-material/Campaign';
import BarChartIcon from '@mui/icons-material/BarChart';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useAuth } from '@/lib/auth';
import { Workspaces } from '@/lib/api';

const DRAWER_WIDTH = 264;

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: <DashboardIcon /> },
  { href: '/dashboard/brand', label: 'Brand Brain', icon: <PaletteIcon /> },
  { href: '/dashboard/research', label: 'Research', icon: <ScienceIcon /> },
  { href: '/dashboard/insights', label: 'Insights', icon: <TravelExploreIcon /> },
  { href: '/dashboard/strategy', label: 'Strategy', icon: <InsightsIcon /> },
  { href: '/dashboard/studio', label: 'Content Studio', icon: <AutoAwesomeIcon /> },
  { href: '/dashboard/publishing', label: 'Publishing', icon: <SendIcon /> },
  { href: '/dashboard/ads', label: 'Ads', icon: <CampaignIcon /> },
  { href: '/dashboard/analytics', label: 'Analytics', icon: <BarChartIcon /> },
  { href: '/dashboard/billing', label: 'Billing', icon: <CreditCardIcon /> },
];

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
        <CircularProgress />
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            background: 'rgba(255,255,255,0.62)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            borderRight: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '4px 0 30px rgba(14,23,38,0.05)',
          },
        }}
      >
        <Box sx={{ p: 2.5 }}>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{
              background: 'linear-gradient(135deg, #ffaf06, #14bb87)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Trayarunya
          </Typography>
          <Typography variant="caption" sx={{ color: '#d99000', fontWeight: 700, letterSpacing: 1 }}>
            CONTENT ENGINE
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(14,23,38,0.06)' }} />
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
            WORKSPACE
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Select
              size="small"
              fullWidth
              value={activeWorkspace?.id || ''}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              sx={{ background: 'rgba(255,255,255,0.6)', borderRadius: 2 }}
            >
              {workspaces.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
            <IconButton color="primary" onClick={() => setNewWsOpen(true)} aria-label="New workspace">
              <AddIcon />
            </IconButton>
          </Stack>
        </Box>
        <Divider sx={{ borderColor: 'rgba(14,23,38,0.06)' }} />
        <List sx={{ px: 1.5, flex: 1 }}>
          {NAV.map((item) => {
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={active}
                sx={{
                  borderRadius: 2.5,
                  mb: 0.5,
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, rgba(255,175,6,0.18), rgba(20,187,135,0.18))',
                    boxShadow: 'inset 0 0 0 1px rgba(255,175,6,0.4)',
                    '&:hover': {
                      background:
                        'linear-gradient(135deg, rgba(255,175,6,0.26), rgba(20,187,135,0.26))',
                    },
                  },
                  '&:hover': { background: 'rgba(14,23,38,0.04)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.dark' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: active ? 700 : 500 }}
                />
              </ListItemButton>
            );
          })}
        </List>
        <Divider sx={{ borderColor: 'rgba(14,23,38,0.06)' }} />
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {me.user.full_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {me.user.email}
          </Typography>
          <Button
            startIcon={<LogoutIcon />}
            onClick={logout}
            color="inherit"
            size="small"
            sx={{ mt: 1 }}
          >
            Log out
          </Button>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: '1px solid rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
          }}
        >
          <Toolbar>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>
              {NAV.find((n) =>
                n.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(n.href)
              )?.label || 'Dashboard'}
            </Typography>
            {activeWorkspace?.website && (
              <Typography variant="body2" color="text.secondary">
                {activeWorkspace.website}
              </Typography>
            )}
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 4 }, flexGrow: 1 }}>{children}</Box>
      </Box>

      <Dialog open={newWsOpen} onClose={() => setNewWsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New workspace</DialogTitle>
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
        <DialogActions>
          <Button onClick={() => setNewWsOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={createWs} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
