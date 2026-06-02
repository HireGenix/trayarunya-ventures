'use client';

import React, { useState, useEffect } from 'react';
import { checkAuth, logout, isSuperAdmin, User } from '@/services/auth';
import {
  Box,
  Drawer,
  Typography,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  alpha,
  Button,
  CircularProgress,
  InputBase,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Article as ArticleIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  ContactPage as ContactPageIcon,
  People as PeopleIcon,
  SmartToy as SmartToyIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  ChevronLeft as ChevronLeftIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const SIDEBAR_WIDTH = 268;
const SIDEBAR_COLLAPSED = 78;
const SIDEBAR_BG = '#0e1726';
const SIDEBAR_BG_HOVER = '#16223a';
const GOLD = '#ffaf06';

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  superOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/admin/analytics' },
      { text: 'Leads', icon: <ContactPageIcon />, path: '/admin/leads' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { text: 'AI Assistant', icon: <SmartToyIcon />, path: '/admin/assistant' },
      { text: 'SEO', icon: <SearchIcon />, path: '/admin/seo' },
    ],
  },
  {
    label: 'Content',
    items: [{ text: 'Blog Posts', icon: <ArticleIcon />, path: '/admin/blog' }],
  },
  {
    label: 'System',
    items: [
      { text: 'Users', icon: <PeopleIcon />, path: '/admin/users', superOnly: true },
      { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
    ],
  },
];

function titleForPath(pathname: string): string {
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      if (it.path === pathname) return it.text;
    }
  }
  if (pathname.startsWith('/admin/blog')) return 'Blog Posts';
  return 'Dashboard';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setAuthenticated(true);
      setLoading(false);
      return;
    }
    const auth = checkAuth();
    setAuthenticated(auth.isAuthenticated);
    setUser(auth.user);
    setIsSuper(isSuperAdmin(auth.user));
    setLoading(false);
  }, [pathname, isLoginPage]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  // Login page renders standalone (no shell).
  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: GOLD }} />
      </Box>
    );
  }

  if (!authenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          gap: 2,
          bgcolor: '#f6f7f9',
        }}
      >
        <Typography variant="h4" fontWeight={800}>
          Admin Access Required
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please sign in to continue.
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push('/admin/login')}
          sx={{ mt: 1, bgcolor: GOLD, color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#e69e00' } }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  const railWidth = collapsed && !isMobile ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;
  const showLabels = !(collapsed && !isMobile);

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        bgcolor: SIDEBAR_BG,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: showLabels ? 2.5 : 0,
          justifyContent: showLabels ? 'flex-start' : 'center',
          height: 72,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${GOLD}, #ff8a00)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#0e1726',
            fontSize: 20,
            flexShrink: 0,
            boxShadow: `0 6px 16px ${alpha(GOLD, 0.4)}`,
          }}
        >
          T
        </Box>
        {showLabels && (
          <Box sx={{ lineHeight: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1.1 }}>
              Trayarunya
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 12, color: GOLD, letterSpacing: 1 }}>
              VENTURES
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: showLabels ? 1.5 : 1, py: 1 }}>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((it) => !it.superOnly || isSuper);
          if (items.length === 0) return null;
          return (
            <Box key={group.label} sx={{ mb: 1.5 }}>
              {showLabels && (
                <Typography
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    color: alpha('#fff', 0.38),
                  }}
                >
                  {group.label}
                </Typography>
              )}
              <List disablePadding>
                {items.map((item) => {
                  const active =
                    item.path === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(item.path);
                  const button = (
                    <ListItemButton
                      component={Link}
                      href={item.path}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        minHeight: 44,
                        px: showLabels ? 1.5 : 0,
                        justifyContent: showLabels ? 'flex-start' : 'center',
                        color: active ? '#fff' : alpha('#fff', 0.62),
                        bgcolor: active ? alpha(GOLD, 0.16) : 'transparent',
                        position: 'relative',
                        transition: 'all .18s ease',
                        '&::before': active
                          ? {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: '22%',
                              bottom: '22%',
                              width: 3,
                              borderRadius: 4,
                              bgcolor: GOLD,
                            }
                          : {},
                        '&:hover': {
                          bgcolor: active ? alpha(GOLD, 0.2) : SIDEBAR_BG_HOVER,
                          color: '#fff',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: showLabels ? 38 : 'auto',
                          color: active ? GOLD : 'inherit',
                          justifyContent: 'center',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {showLabels && (
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }}
                        />
                      )}
                    </ListItemButton>
                  );
                  return showLabels ? (
                    <Box key={item.path}>{button}</Box>
                  ) : (
                    <Tooltip key={item.path} title={item.text} placement="right">
                      <Box>{button}</Box>
                    </Tooltip>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* User card */}
      <Box sx={{ p: showLabels ? 1.5 : 1, flexShrink: 0 }}>
        <Divider sx={{ borderColor: alpha('#fff', 0.08), mb: 1.5 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: showLabels ? 1 : 0,
            justifyContent: showLabels ? 'flex-start' : 'center',
            borderRadius: 2,
            bgcolor: showLabels ? alpha('#fff', 0.04) : 'transparent',
          }}
        >
          <Avatar sx={{ width: 36, height: 36, bgcolor: GOLD, color: '#0e1726', fontWeight: 800 }}>
            {user?.name?.charAt(0) || 'A'}
          </Avatar>
          {showLabels && (
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {user?.name || 'Admin'}
              </Typography>
              <Typography noWrap sx={{ fontSize: 11, color: alpha('#fff', 0.5) }}>
                {isSuper ? 'Super Admin' : 'Administrator'}
              </Typography>
            </Box>
          )}
          {showLabels && (
            <Tooltip title="Logout">
              <IconButton size="small" onClick={handleLogout} sx={{ color: alpha('#fff', 0.6) }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f6f7f9' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Box
          sx={{
            width: railWidth,
            flexShrink: 0,
            transition: 'width .22s ease',
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            zIndex: theme.zIndex.drawer,
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, border: 'none' } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main column */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          ml: isMobile ? 0 : `${railWidth}px`,
          transition: 'margin .22s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Topbar */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: theme.zIndex.appBar,
            height: 64,
            px: { xs: 2, md: 3 },
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: alpha('#ffffff', 0.85),
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <IconButton
            onClick={() => (isMobile ? setMobileOpen(true) : setCollapsed((c) => !c))}
            sx={{ color: 'text.secondary' }}
          >
            {isMobile ? <MenuIcon /> : collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
          </IconButton>

          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1 }}>
              Admin
            </Typography>
            <Typography noWrap sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>
              {titleForPath(pathname)}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Search */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              height: 40,
              width: 240,
              borderRadius: 2,
              bgcolor: '#f1f2f4',
              color: 'text.secondary',
            }}
          >
            <SearchIcon fontSize="small" />
            <InputBase placeholder="Search…" sx={{ fontSize: 14, flex: 1 }} />
          </Box>

          <Tooltip title="Notifications">
            <IconButton sx={{ color: 'text.secondary' }}>
              <Badge color="error" variant="dot">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Account">
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                cursor: 'pointer',
                pl: 1,
                pr: { xs: 0, sm: 1 },
                py: 0.5,
                borderRadius: 2,
                '&:hover': { bgcolor: '#f1f2f4' },
              }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: GOLD, color: '#0e1726', fontWeight: 800 }}>
                {user?.name?.charAt(0) || 'A'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>
                  {user?.name || 'Admin'}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                  {isSuper ? 'Super Admin' : 'Administrator'}
                </Typography>
              </Box>
              <ArrowDownIcon
                fontSize="small"
                sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
              />
            </Box>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{ mt: 1 }}
          >
            <MenuItem disabled>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              {user?.email}
            </MenuItem>
            <MenuItem component={Link} href="/admin/settings" onClick={() => setAnchorEl(null)}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>

        {/* Page content */}
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}
