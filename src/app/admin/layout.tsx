'use client';

import React, { useState, useEffect } from 'react';
import { checkAuth, logout, isSuperAdmin, User } from '@/services/auth';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
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
  CircularProgress
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
  ChevronLeft as ChevronLeftIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const drawerWidth = 260;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();
  const router = useRouter();
  
  const [open, setOpen] = useState(!isMobile);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Skip authentication check for login page
        if (pathname === '/admin/login') {
          setAuthenticated(true);
          setLoading(false);
          return;
        }
        
        const auth = checkAuth();
        setAuthenticated(auth.isAuthenticated);
        setUser(auth.user);
        setIsSuperAdminUser(isSuperAdmin(auth.user));
        setLoading(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setAuthenticated(false);
        setUser(null);
        setLoading(false);
      }
    };
    
    checkAuthentication();
  }, [pathname]);
  
  const handleDrawerToggle = () => {
    setOpen(!open);
  };
  
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
  
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };
  
  // Define menu items based on user role
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
    { text: 'SEO Management', icon: <SearchIcon />, path: '/admin/seo' },
    { text: 'Blog Posts', icon: <ArticleIcon />, path: '/admin/blog' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/admin/analytics' },
    { text: 'Lead Submissions', icon: <ContactPageIcon />, path: '/admin/leads' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
  ];
  
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: theme.palette.background.default
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!authenticated && pathname !== '/admin/login') {
    // In a real app, you would redirect to login
    // For now, we'll just show a login button
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: theme.palette.background.default,
        gap: 2
      }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Access Required
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Please log in to access the admin panel
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => router.push('/admin/login')}
          sx={{ mt: 2 }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {isSuperAdminUser ? 'Trayarunya Ventures Super Admin' : 'Trayarunya Ventures Admin'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton color="inherit">
              <NotificationsIcon />
            </IconButton>
            <IconButton color="inherit">
              {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, ml: 1 }}>
                <Avatar 
                  alt={user?.name || 'Admin User'} 
                  src="/static/images/avatar/1.jpg"
                  sx={{
                    bgcolor: isSuperAdminUser ? 'secondary.main' : 'primary.main',
                  }}
                >
                  {user?.name?.charAt(0) || 'A'}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={handleCloseUserMenu}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">
                  {user?.name || 'Profile'} {isSuperAdminUser && ' (Super Admin)'}
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleCloseUserMenu}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Settings</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={isMobile ? open : true}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {menuItems.map((item, index) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.path}
                  selected={pathname === item.path}
                  sx={{
                    borderRadius: '0 50px 50px 0',
                    mr: 2,
                    mb: 0.5,
                    position: 'relative',
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        backgroundColor: theme.palette.primary.main,
                        borderRadius: '0 4px 4px 0',
                      },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      },
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      color: pathname === item.path ? theme.palette.primary.main : theme.palette.text.secondary,
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{
                      fontWeight: pathname === item.path ? 600 : 400,
                      color: pathname === item.path ? theme.palette.primary.main : theme.palette.text.primary,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
