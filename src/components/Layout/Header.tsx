'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Button,
  MenuItem,
  useScrollTrigger,
  Slide,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

interface HideOnScrollProps {
  children: React.ReactElement;
}

function HideOnScroll(props: HideOnScrollProps) {
  const { children } = props;
  const trigger = useScrollTrigger();

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

const pages = [
  { name: 'Home', href: '/' },
  { name: 'Solutions', href: '/solutions' },
  { name: 'Products', href: '/products' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

const productMenuItems = [
  { name: 'HireGenix', href: '/products/hiregenix', description: 'AI-Powered Recruitment Platform' },
  { name: 'MarketIQ', href: '/products/marketiq', description: 'Market Intelligence Solution' },
  { name: 'MedCodeX', href: '/products/medcodex', description: 'AI Medical Coding Platform' },
];

export default function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();

  const [anchorElProducts, setAnchorElProducts] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const handleOpenProductsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElProducts(event.currentTarget);
  };

  const handleCloseProductsMenu = () => {
    setAnchorElProducts(null);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <HideOnScroll>
      <AppBar
        position="fixed"
        color="default"
        elevation={scrolled ? 4 : 0}
        sx={{
          backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          transition: 'all 0.3s ease',
          borderBottom: scrolled ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ height: 80 }}>
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/" passHref style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  <Image 
                    src="/Trayarunya-ventures-logo-Transparent.png" 
                    alt="Trayarunya Ventures Logo" 
                    width={180} 
                    height={50} 
                    priority
                    style={{ objectFit: 'contain' }}
                  />
                </Box>
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
              {pages.map((page, index) => {
                if (page.name === 'Products') {
                  return (
                    <motion.div
                      key={page.name}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                    >
                      <Button
                        aria-controls="products-menu"
                        aria-haspopup="true"
                        onClick={handleOpenProductsMenu}
                        sx={{
                          mx: 1.5,
                          my: 2,
                          color: pathname.startsWith('/products') ? theme.palette.primary.main : 'text.primary',
                          display: 'block',
                          fontWeight: pathname.startsWith('/products') ? 600 : 500,
                          position: 'relative',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            color: theme.palette.primary.main,
                            transform: 'translateY(-2px)',
                          },
                          '&::after': pathname.startsWith('/products') ? {
                            content: '""',
                            position: 'absolute',
                            bottom: -2,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '40%',
                            height: 3,
                            backgroundColor: theme.palette.primary.main,
                            borderRadius: 1.5,
                          } : {}
                        }}
                      >
                        {page.name}
                      </Button>
                      <Menu
                        id="products-menu"
                        anchorEl={anchorElProducts}
                        open={Boolean(anchorElProducts)}
                        onClose={handleCloseProductsMenu}
                        MenuListProps={{
                          'aria-labelledby': 'products-button',
                        }}
                        sx={{
                          '& .MuiPaper-root': {
                            borderRadius: 2,
                            minWidth: 280,
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                          },
                        }}
                      >
                        {productMenuItems.map((item) => (
                          <MenuItem 
                            key={item.name} 
                            onClick={handleCloseProductsMenu}
                            component={Link}
                            href={item.href}
                            sx={{ 
                              py: 1.5,
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                              }
                            }}
                          >
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {item.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {item.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Menu>
                    </motion.div>
                  );
                }
                
                return (
                  <motion.div
                    key={page.name}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                  >
                    <Button
                      component={Link}
                      href={page.href}
                      sx={{
                        mx: 1.5,
                        my: 2,
                        color: pathname === page.href ? theme.palette.primary.main : 'text.primary',
                        display: 'block',
                        fontWeight: pathname === page.href ? 600 : 500,
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          color: theme.palette.primary.main,
                          transform: 'translateY(-2px)',
                        },
                        '&::after': pathname === page.href ? {
                          content: '""',
                          position: 'absolute',
                          bottom: -2,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '40%',
                          height: 3,
                          backgroundColor: theme.palette.primary.main,
                          borderRadius: 1.5,
                        } : {}
                      }}
                    >
                      {page.name}
                    </Button>
                  </motion.div>
                );
              })}
            </Box>

            {/* Desktop Action Buttons */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  component={Link}
                  href="/contact"
                  sx={{
                    borderRadius: '50px',
                    px: 3,
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  Get in Touch
                </Button>
              </motion.div>
            </Box>

            {/* Mobile Menu Button */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, ml: 'auto' }}>
              <IconButton
                size="large"
                aria-label="menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={toggleMobileMenu}
                color="inherit"
                sx={{
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: 2,
                  p: 1,
                }}
              >
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            </Box>
          </Toolbar>
        </Container>

        {/* Mobile Menu Drawer */}
        <Drawer
          anchor="right"
          open={mobileMenuOpen}
          onClose={toggleMobileMenu}
          sx={{
            '& .MuiDrawer-paper': {
              width: '80%',
              maxWidth: 360,
              boxSizing: 'border-box',
              pt: 2,
              borderTopLeftRadius: 20,
              borderBottomLeftRadius: 20,
            },
          }}
        >
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Image 
              src="/Trayarunya-ventures-logo-Transparent.png" 
              alt="Trayarunya Ventures Logo" 
              width={150} 
              height={40} 
              priority
              style={{ objectFit: 'contain' }}
            />
            <IconButton onClick={toggleMobileMenu} sx={{ p: 1 }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <List sx={{ px: 1.5 }}>
            {pages.map((page) => {
              if (page.name === 'Products') {
                return (
                  <React.Fragment key={page.name}>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                      <ListItemButton
                        sx={{
                          py: 1.5,
                          px: 2,
                          borderRadius: 2,
                          backgroundColor: pathname.startsWith('/products') ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                          color: pathname.startsWith('/products') ? theme.palette.primary.main : 'text.primary',
                          borderLeft: pathname.startsWith('/products') ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                          },
                        }}
                      >
                        <ListItemText
                          primary={page.name}
                          primaryTypographyProps={{
                            fontWeight: pathname.startsWith('/products') ? 600 : 500,
                            fontSize: '1rem',
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                    <Box sx={{ pl: 4, mb: 2 }}>
                      {productMenuItems.map((item) => (
                        <ListItem key={item.name} disablePadding sx={{ mb: 1 }}>
                          <ListItemButton
                            component={Link}
                            href={item.href}
                            onClick={toggleMobileMenu}
                            sx={{
                              py: 1,
                              px: 2,
                              borderRadius: 2,
                              backgroundColor: pathname === item.href ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                              color: pathname === item.href ? theme.palette.primary.main : 'text.secondary',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                              },
                            }}
                          >
                            <ListItemText
                              primary={item.name}
                              secondary={item.description}
                              primaryTypographyProps={{
                                fontWeight: pathname === item.href ? 600 : 500,
                                fontSize: '0.9rem',
                              }}
                              secondaryTypographyProps={{
                                fontSize: '0.75rem',
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </Box>
                  </React.Fragment>
                );
              }
              
              return (
                <ListItem key={page.name} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    component={Link}
                    href={page.href}
                    onClick={toggleMobileMenu}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderRadius: 2,
                      backgroundColor: pathname === page.href ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      color: pathname === page.href ? theme.palette.primary.main : 'text.primary',
                      borderLeft: pathname === page.href ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                  >
                    <ListItemText
                      primary={page.name}
                      primaryTypographyProps={{
                        fontWeight: pathname === page.href ? 600 : 500,
                        fontSize: '1rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ p: 3 }}>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              href="/contact"
              fullWidth
              onClick={toggleMobileMenu}
              sx={{
                py: 1.5,
                borderRadius: 50,
                mt: 1,
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              }}
            >
              Get in Touch
            </Button>
          </Box>
        </Drawer>
      </AppBar>
    </HideOnScroll>
  );
}
