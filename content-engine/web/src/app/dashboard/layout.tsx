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
import { useAuth } from '@/lib/auth';
import { Workspaces } from '@/lib/api';

const DRAWER_WIDTH = 264;

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: <DashboardIcon /> },
  { href: '/dashboard/research', label: 'Research', icon: <ScienceIcon /> },
  { href: '/dashboard/strategy', label: 'Strategy', icon: <InsightsIcon /> },
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(14,23,38,0.08)',
          },
        }}
      >
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={800}>
            Trayarunya
          </Typography>
          <Typography variant="caption" sx={{ color: '#d99000', fontWeight: 700 }}>
            CONTENT ENGINE
          </Typography>
        </Box>
        <Divider />
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
        <Divider />
        <List sx={{ px: 1, flex: 1 }}>
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
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.dark' : undefined }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
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
          sx={{ borderBottom: '1px solid rgba(14,23,38,0.08)', bgcolor: 'background.paper' }}
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
