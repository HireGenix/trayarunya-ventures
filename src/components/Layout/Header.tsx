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
import { TEXT, LINE, CARD } from '@/components/cinematic/surfaces';

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
      <BrandLogo variant="dark" size={38} />
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(18px)',
          borderBottom: scrolled
            ? `1px solid ${LINE.soft}`
            : `1px solid ${LINE.softer}`,
          boxShadow: scrolled ? '0 4px 24px rgba(15,23,42,0.08)' : 'none',
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
                                background: '#ffffff',
                                backdropFilter: 'blur(20px)',
                                border: `1px solid ${LINE.soft}`,
                                boxShadow: CARD.shadow,
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
                                    '&:hover': { background: 'rgba(15,23,42,0.04)' },
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
                                      background: `${s.color}14`,
                                      color: s.color,
                                    }}
                                  >
                                    <ServiceIcon name={s.icon} fontSize="small" />
                                  </Box>
                                  <Box>
                                    <Typography
                                      sx={{ color: TEXT.heading, fontWeight: 600, fontSize: '0.88rem' }}
                                    >
                                      {s.shortName}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        color: TEXT.muted,
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
                  sx={{ color: TEXT.body, ml: 1, '&:hover': { color: '#0A66C2' } }}
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
                sx={{ color: TEXT.heading }}
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
            background: '#ffffff',
            borderLeft: `1px solid ${LINE.soft}`,
          },
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {Logo}
          <IconButton onClick={() => setMobileOpen(false)} sx={{ color: TEXT.heading }} aria-label="Close menu">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: LINE.soft }} />
        <List sx={{ px: 1 }}>
          {navLinks.map((link) =>
            link.mega ? (
              <Box key={link.name}>
                <ListItemButton onClick={() => setMobileServicesOpen((o) => !o)}>
                  <ListItemText
                    primary="Services"
                    primaryTypographyProps={{ sx: { color: TEXT.heading, fontWeight: 600 } }}
                  />
                  {mobileServicesOpen ? (
                    <ExpandLessIcon sx={{ color: TEXT.heading }} />
                  ) : (
                    <ExpandMoreIcon sx={{ color: TEXT.heading }} />
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
                              sx: { color: TEXT.body, fontSize: '0.85rem' },
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
                    primaryTypographyProps={{ sx: { color: TEXT.heading, fontWeight: 600 } }}
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
  color: active ? '#ffaf06' : TEXT.body,
  fontWeight: 600,
  fontSize: '0.92rem',
  textTransform: 'none' as const,
  '&:hover': { color: TEXT.heading, background: 'transparent' },
});
