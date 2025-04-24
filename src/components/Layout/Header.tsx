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
  Grid,
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

const solutionMenuItems = [
  { 
    category: 'Business Solutions',
    items: [
      { name: 'Enterprise', href: '/solutions/enterprise', description: 'Solutions for large organizations' },
      { name: 'Startups', href: '/solutions/startups', description: 'Solutions for growing businesses' },
      { name: 'Custom Development', href: '/solutions/custom', description: 'Bespoke software solutions' },
    ]
  },
  {
    category: 'Industry Solutions',
    items: [
      { name: 'Healthcare', href: '/solutions/healthcare', description: 'Solutions for healthcare providers' },
      { name: 'Overseas Business Registration', href: '/solutions/overseas-business', description: 'Global business setup services' },
      { name: 'Digital Marketing', href: '/solutions/digital-marketing', description: 'Comprehensive marketing services' },
    ]
  }
];

export default function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();

  const [anchorElProducts, setAnchorElProducts] = useState<null | HTMLElement>(null);
  const [anchorElSolutions, setAnchorElSolutions] = useState<null | HTMLElement>(null);
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

  const handleOpenSolutionsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElSolutions(event.currentTarget);
  };

  const handleCloseSolutionsMenu = () => {
    setAnchorElSolutions(null);
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
          background: scrolled 
            ? 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(240, 249, 255, 0.95))' 
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          transition: 'all 0.3s ease',
          borderBottom: scrolled ? '1px solid rgba(10, 102, 194, 0.1)' : 'none',
          boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.05)' : 'none',
        }}
      >
        {/* Decorative elements */}
        {scrolled && (
          <>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '2px',
                background: 'linear-gradient(90deg, #0A66C2, #FF5722)',
                zIndex: 10,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: '5%',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(10, 102, 194, 0.05) 0%, rgba(255, 255, 255, 0) 70%)',
                filter: 'blur(40px)',
                zIndex: 0,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: '10%',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 87, 34, 0.05) 0%, rgba(255, 255, 255, 0) 70%)',
                filter: 'blur(30px)',
                zIndex: 0,
              }}
            />
          </>
        )}
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
                if (page.name === 'Solutions') {
                  return (
                    <motion.div
                      key={page.name}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                    >
                      <Button
                        aria-controls="solutions-menu"
                        aria-haspopup="true"
                        onClick={handleOpenSolutionsMenu}
                        sx={{
                          mx: 1.5,
                          my: 2,
                          color: pathname.startsWith('/solutions') ? theme.palette.primary.main : 'text.primary',
                          display: 'block',
                          fontWeight: pathname.startsWith('/solutions') ? 600 : 500,
                          position: 'relative',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            color: theme.palette.primary.main,
                            transform: 'translateY(-2px)',
                          },
                          '&::after': pathname.startsWith('/solutions') ? {
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
                        id="solutions-menu"
                        anchorEl={anchorElSolutions}
                        open={Boolean(anchorElSolutions)}
                        onClose={handleCloseSolutionsMenu}
                        MenuListProps={{
                          'aria-labelledby': 'solutions-button',
                        }}
                        sx={{
                          '& .MuiPaper-root': {
                            borderRadius: 2,
                            minWidth: 650,
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                            border: '1px solid rgba(10, 102, 194, 0.1)',
                            mt: 1.5,
                            p: 2,
                            background: 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(240, 249, 255, 0.95))',
                            backdropFilter: 'blur(20px)',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '3px',
                              background: 'linear-gradient(90deg, #0A66C2, #FF5722)',
                              borderTopLeftRadius: 2,
                              borderTopRightRadius: 2,
                            },
                          },
                        }}
                      >
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                          {solutionMenuItems.map((category, idx) => (
                            <Box key={idx}>
                              <Typography 
                                variant="subtitle1" 
                                fontWeight={700} 
                                sx={{ 
                                  mb: 1.5, 
                                  color: theme.palette.primary.main,
                                  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                  pb: 0.5
                                }}
                              >
                                {category.category}
                              </Typography>
                              {category.items.map((item) => (
                                <MenuItem 
                                  key={item.name} 
                                  onClick={handleCloseSolutionsMenu}
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
                            </Box>
                          ))}
                        </Box>
                      </Menu>
                    </motion.div>
                  );
                }
                
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
                            border: '1px solid rgba(10, 102, 194, 0.1)',
                            background: 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(240, 249, 255, 0.95))',
                            backdropFilter: 'blur(20px)',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '3px',
                              background: 'linear-gradient(90deg, #0A66C2, #FF5722)',
                              borderTopLeftRadius: 2,
                              borderTopRightRadius: 2,
                            },
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
                  component={Link}
                  href="/contact"
                  sx={{
                    borderRadius: '50px',
                    px: 3,
                    py: 1,
                    fontWeight: 700,
                    background: 'linear-gradient(90deg, #0A66C2, #FF5722)',
                    boxShadow: '0 4px 14px rgba(10, 102, 194, 0.25)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(10, 102, 194, 0.4)',
                      transform: 'translateY(-2px)',
                    },
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
                  border: '1px solid rgba(10, 102, 194, 0.15)',
                  borderRadius: 2,
                  p: 1,
                  background: alpha('#0A66C2', 0.03),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: alpha('#0A66C2', 0.08),
                    transform: 'translateY(-2px)',
                  },
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
              background: 'linear-gradient(to bottom, rgba(255, 255, 255, 1), rgba(240, 249, 255, 0.95))',
              boxShadow: '0 0 30px rgba(0, 0, 0, 0.15)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                background: 'linear-gradient(90deg, #0A66C2, #FF5722)',
              },
            },
          }}
        >
          {/* Decorative elements for mobile menu */}
          <Box
            sx={{
              position: 'absolute',
              top: '10%',
              right: '-50px',
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(10, 102, 194, 0.03) 0%, rgba(255, 255, 255, 0) 70%)',
              filter: 'blur(40px)',
              zIndex: 0,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: '20%',
              left: '-50px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 87, 34, 0.03) 0%, rgba(255, 255, 255, 0) 70%)',
              filter: 'blur(30px)',
              zIndex: 0,
            }}
          />
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
              
              if (page.name === 'Solutions') {
                return (
                  <React.Fragment key={page.name}>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                      <ListItemButton
                        sx={{
                          py: 1.5,
                          px: 2,
                          borderRadius: 2,
                          backgroundColor: pathname.startsWith('/solutions') ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                          color: pathname.startsWith('/solutions') ? theme.palette.primary.main : 'text.primary',
                          borderLeft: pathname.startsWith('/solutions') ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                          },
                        }}
                      >
                        <ListItemText
                          primary={page.name}
                          primaryTypographyProps={{
                            fontWeight: pathname.startsWith('/solutions') ? 600 : 500,
                            fontSize: '1rem',
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                    <Box sx={{ pl: 4, mb: 2 }}>
                      {solutionMenuItems.map((category, idx) => (
                        <React.Fragment key={idx}>
                          <Typography 
                            variant="subtitle2" 
                            fontWeight={600} 
                            sx={{ 
                              pl: 2, 
                              mb: 1, 
                              color: theme.palette.primary.main 
                            }}
                          >
                            {category.category}
                          </Typography>
                          {category.items.map((item) => (
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
                        </React.Fragment>
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
              component={Link}
              href="/contact"
              fullWidth
              onClick={toggleMobileMenu}
              sx={{
                py: 1.5,
                borderRadius: 50,
                mt: 1,
                fontWeight: 700,
                background: 'linear-gradient(90deg, #0A66C2, #FF5722)',
                boxShadow: '0 4px 14px rgba(10, 102, 194, 0.25)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(10, 102, 194, 0.4)',
                  transform: 'translateY(-2px)',
                },
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
