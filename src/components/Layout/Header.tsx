'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Container,
  Button,
  useScrollTrigger,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
  Popper,
  Paper,
  Grow,
  Typography,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowForward as ArrowForwardIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { services } from '@/data/servicesData';
import { companyInfo } from '@/data/websiteInfo';
import ServiceIcon from '@/components/cinematic/ServiceIcon';
import BrandLogo from '@/components/cinematic/BrandLogo';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Services', href: '/services', mega: true },
  { name: 'How We Work', href: '/how-we-work' },
  { name: 'Insights', href: '/insights' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

export default function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 20 });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [servicesAnchor, setServicesAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setServicesAnchor(null);
  }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const Logo = (
    <Box
      component={Link}
      href="/"
      sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
    >
      <BrandLogo variant="light" size={38} />
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: scrolled ? 'rgba(8,8,10,0.82)' : 'rgba(8,8,10,0.4)',
          backdropFilter: 'blur(18px)',
          borderBottom: scrolled
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(255,255,255,0.04)',
          transition: 'all 0.4s ease',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, gap: 2 }}>
            {Logo}

            <Box sx={{ flexGrow: 1 }} />

            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {navLinks.map((link) =>
                  link.mega ? (
                    <Box
                      key={link.name}
                      onMouseEnter={(e) => setServicesAnchor(e.currentTarget)}
                      onMouseLeave={() => setServicesAnchor(null)}
                    >
                      <Button
                        component={Link}
                        href={link.href}
                        endIcon={<ExpandMoreIcon />}
                        sx={navBtnSx(isActive(link.href))}
                      >
                        {link.name}
                      </Button>
                      <Popper
                        open={Boolean(servicesAnchor)}
                        anchorEl={servicesAnchor}
                        placement="bottom-start"
                        transition
                        sx={{ zIndex: 1300 }}
                      >
                        {({ TransitionProps }) => (
                          <Grow {...TransitionProps} style={{ transformOrigin: 'top left' }}>
                            <Paper
                              elevation={0}
                              sx={{
                                mt: 1.5,
                                p: 1.5,
                                width: 560,
                                borderRadius: 3,
                                background: 'rgba(14,14,18,0.96)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 0.5,
                              }}
                            >
                              {services.map((s) => (
                                <Box
                                  key={s.slug}
                                  component={Link}
                                  href={`/services/${s.slug}`}
                                  sx={{
                                    display: 'flex',
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: 2,
                                    textDecoration: 'none',
                                    transition: 'background 0.2s ease',
                                    '&:hover': { background: 'rgba(255,255,255,0.06)' },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 38,
                                      height: 38,
                                      flexShrink: 0,
                                      borderRadius: 1.5,
                                      display: 'grid',
                                      placeItems: 'center',
                                      background: `${s.color}1f`,
                                      color: s.color,
                                    }}
                                  >
                                    <ServiceIcon name={s.icon} fontSize="small" />
                                  </Box>
                                  <Box>
                                    <Typography
                                      sx={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}
                                    >
                                      {s.shortName}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        color: 'rgba(255,255,255,0.55)',
                                        fontSize: '0.74rem',
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {s.tagline}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))}
                            </Paper>
                          </Grow>
                        )}
                      </Popper>
                    </Box>
                  ) : (
                    <Button
                      key={link.name}
                      component={Link}
                      href={link.href}
                      sx={navBtnSx(isActive(link.href))}
                    >
                      {link.name}
                    </Button>
                  ),
                )}

                <IconButton
                  component="a"
                  href={companyInfo.contact.socialMedia.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'rgba(255,255,255,0.7)', ml: 1, '&:hover': { color: '#0A66C2' } }}
                  aria-label="LinkedIn"
                >
                  <LinkedInIcon />
                </IconButton>

                <Button
                  component={Link}
                  href="/contact"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    ml: 1,
                    px: 2.5,
                    py: 1,
                    borderRadius: '50px',
                    fontWeight: 700,
                    color: '#0a0a0a',
                    background: 'linear-gradient(95deg, #ffaf06, #14bb87)',
                    boxShadow: '0 8px 24px rgba(255,175,6,0.3)',
                    '&:hover': {
                      background: 'linear-gradient(95deg, #ffc046, #4dcca3)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  Book a Strategy Call
                </Button>
              </Box>
            )}

            {isMobile && (
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{ color: '#fff' }}
                aria-label="Open menu"
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: '85%',
            maxWidth: 360,
            background: '#0a0a0c',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
          },
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {Logo}
          <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#fff' }} aria-label="Close menu">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <List sx={{ px: 1 }}>
          {navLinks.map((link) =>
            link.mega ? (
              <Box key={link.name}>
                <ListItemButton onClick={() => setMobileServicesOpen((o) => !o)}>
                  <ListItemText
                    primary="Services"
                    primaryTypographyProps={{ sx: { color: '#fff', fontWeight: 600 } }}
                  />
                  {mobileServicesOpen ? (
                    <ExpandLessIcon sx={{ color: '#fff' }} />
                  ) : (
                    <ExpandMoreIcon sx={{ color: '#fff' }} />
                  )}
                </ListItemButton>
                <Collapse in={mobileServicesOpen}>
                  <List disablePadding>
                    <ListItem disablePadding>
                      <ListItemButton component={Link} href="/services" sx={{ pl: 3 }}>
                        <ListItemText
                          primary="All Services"
                          primaryTypographyProps={{ sx: { color: '#ffaf06', fontSize: '0.9rem' } }}
                        />
                      </ListItemButton>
                    </ListItem>
                    {services.map((s) => (
                      <ListItem key={s.slug} disablePadding>
                        <ListItemButton component={Link} href={`/services/${s.slug}`} sx={{ pl: 3 }}>
                          <ListItemText
                            primary={s.shortName}
                            primaryTypographyProps={{
                              sx: { color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' },
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
            ) : (
              <ListItem key={link.name} disablePadding>
                <ListItemButton component={Link} href={link.href}>
                  <ListItemText
                    primary={link.name}
                    primaryTypographyProps={{ sx: { color: '#fff', fontWeight: 600 } }}
                  />
                </ListItemButton>
              </ListItem>
            ),
          )}
        </List>
        <Box sx={{ p: 2.5, mt: 'auto' }}>
          <Button
            fullWidth
            component={Link}
            href="/contact"
            endIcon={<ArrowForwardIcon />}
            sx={{
              py: 1.4,
              borderRadius: '50px',
              fontWeight: 700,
              color: '#0a0a0a',
              background: 'linear-gradient(95deg, #ffaf06, #14bb87)',
            }}
          >
            Book a Strategy Call
          </Button>
        </Box>
      </Drawer>
    </>
  );
}

const navBtnSx = (active: boolean) => ({
  px: 1.6,
  color: active ? '#ffaf06' : 'rgba(255,255,255,0.82)',
  fontWeight: 600,
  fontSize: '0.92rem',
  textTransform: 'none' as const,
  '&:hover': { color: '#fff', background: 'transparent' },
});
