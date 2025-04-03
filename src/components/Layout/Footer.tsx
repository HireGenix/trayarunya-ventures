'use client';

import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link as MuiLink,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  Button,
  TextField,
  InputAdornment,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  YouTube as YouTubeIcon,
  Send as SendIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const footerLinks = [
  {
    title: 'Company',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Leadership', href: '/about/leadership' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
    ]
  },
  {
    title: 'Solutions',
    links: [
      { name: 'Enterprise Solutions', href: '/solutions/enterprise' },
      { name: 'Startups', href: '/solutions/startups' },
      { name: 'Healthcare', href: '/solutions/healthcare' },
      { name: 'Custom Development', href: '/solutions/custom' },
    ]
  },
  {
    title: 'Products',
    links: [
      { name: 'HireGenix', href: '/products/hiregenix' },
      { name: 'MarketIQ', href: '/products/marketiq' },
      { name: 'MedCodeX', href: '/products/medcodex' },
      { name: 'All Products', href: '/products' },
    ]
  },
  {
    title: 'Legal',
    links: [
      { name: 'Terms and Conditions', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Compliance', href: '/compliance' },
    ]
  },
];

const socialLinks = [
  { icon: <FacebookIcon />, href: 'https://facebook.com/trayarunyaventures', label: 'Facebook', color: '#1877F2' },
  { icon: <TwitterIcon />, href: 'https://twitter.com/trayarunyaventures', label: 'Twitter', color: '#1DA1F2' },
  { icon: <LinkedInIcon />, href: 'https://linkedin.com/company/trayarunya-ventures', label: 'LinkedIn', color: '#0A66C2' },
  { icon: <InstagramIcon />, href: 'https://instagram.com/trayarunyaventures', label: 'Instagram', color: '#E4405F' },
  { icon: <YouTubeIcon />, href: 'https://youtube.com/trayarunyaventures', label: 'YouTube', color: '#FF0000' },
];

const contactInfo = [
  { icon: <LocationOnIcon />, text: '1050 North 3rd Street, Laramie, WY 82072' },
  { icon: <LocationOnIcon />, text: '2/1201 Behind S.A.M Inter College, Ramnagar, Saharanpur (U.P)-247001' },
  { icon: <PhoneIcon />, text: '+1 (971) 512-1701 (US)' },
  { icon: <PhoneIcon />, text: '+91-8954333390 (India)' },
  { icon: <EmailIcon />, text: 'info@trayarunyaventures.com' },
];

export default function Footer() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'background.paper',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          zIndex: 0,
        }}
      />
      
      {/* Animated gradient orbs */}
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.05 }}
        transition={{ duration: 1.5 }}
        sx={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.palette.primary.light} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'footerPulse 10s ease-in-out infinite',
          '@keyframes footerPulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.05 },
            '50%': { transform: 'scale(1.1)', opacity: 0.08 },
          },
        }}
      />

      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.05 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        sx={{
          position: 'absolute',
          bottom: '30%',
          left: '5%',
          width: { xs: 100, md: 250 },
          height: { xs: 100, md: 250 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.palette.secondary ? theme.palette.secondary.light : '#14bb87'} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'footerPulse2 12s ease-in-out infinite',
          '@keyframes footerPulse2': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.05 },
            '50%': { transform: 'scale(1.15)', opacity: 0.08 },
          },
        }}
      />

      {/* Newsletter Section */}
      <Box
        sx={{
          py: 6,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary ? theme.palette.secondary.main : '#000', 0.05)} 100%)`,
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: '600px' }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Typography
                  variant="h4"
                  component="h2"
                  fontWeight={800}
                  gutterBottom
                >
                  Stay Updated with Trayarunya Ventures
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                  Subscribe to our newsletter for the latest industry insights, product updates, and innovation news delivered directly to your inbox.
                </Typography>
                <Box
                  component="form"
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 2, sm: 0 },
                  }}
                  onSubmit={(e) => e.preventDefault()}
                >
                  <TextField
                    placeholder="Enter your email"
                    variant="outlined"
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: { xs: 2, sm: '50px 0 0 50px' },
                        backgroundColor: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(0, 0, 0, 0.1)',
                          borderRight: { sm: 0 },
                        },
                        '&:hover fieldset': {
                          borderColor: theme.palette.primary.main,
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    sx={{
                      borderRadius: { xs: 2, sm: '0 50px 50px 0' },
                      px: 3,
                      py: 1.5,
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                      },
                    }}
                  >
                    Subscribe
                  </Button>
                </Box>
              </motion.div>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Footer */}
      <Box
        sx={{
          pt: 10,
          pb: 6,
          position: 'relative',
          zIndex: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          background: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.default, 0.8)} 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {/* Logo and Description */}
            <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: '33%' } }}>
              <Box sx={{ mb: 3 }}>
                <Link href="/" passHref style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 350, lineHeight: 1.7 }}>
                Trayarunya Ventures builds AI-powered SaaS applications to streamline and enhance business operations. Our innovative solutions help organizations work smarter and achieve more.
              </Typography>

              <Box sx={{ mb: 4 }}>
                {contactInfo.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', mb: 2, alignItems: 'flex-start' }}>
                    <Box sx={{
                      color: theme.palette.primary.main,
                      mr: 1.5,
                      mt: 0.5,
                    }}>
                      {item.icon}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.text}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box 
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2, 
                    color: 'text.secondary',
                    fontWeight: 600,
                    position: 'relative',
                    display: 'inline-block',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: -4,
                      left: 0,
                      width: '30px',
                      height: '2px',
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: '1px',
                    }
                  }}
                >
                  Connect With Us
                </Typography>
                <Box 
                  component={motion.div}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                      },
                    },
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  sx={{ display: 'flex', gap: 1.5 }}
                >
                  {socialLinks.map((link, index) => (
                    <motion.div
                      key={index}
                      variants={{
                        hidden: { opacity: 0, scale: 0.8 },
                        visible: { 
                          opacity: 1, 
                          scale: 1,
                          transition: {
                            type: "spring",
                            stiffness: 100,
                            damping: 10,
                            delay: index * 0.05
                          }
                        }
                      }}
                    >
                      <Tooltip title={link.label} arrow>
                        <IconButton
                          component="a"
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={link.label}
                          sx={{
                            color: 'white',
                            backgroundColor: alpha(link.color, 0.8),
                            '&:hover': {
                              backgroundColor: link.color,
                              transform: 'translateY(-3px) scale(1.1)',
                              boxShadow: `0 8px 20px ${alpha(link.color, 0.4)}`,
                            },
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            boxShadow: `0 4px 10px ${alpha(link.color, 0.3)}`,
                          }}
                        >
                          {link.icon}
                        </IconButton>
                      </Tooltip>
                    </motion.div>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Footer Links */}
            {footerLinks.map((section, index) => (
              <Box 
                key={index} 
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                sx={{ width: { xs: '50%', sm: '25%', md: '16.66%' } }}
              >
                <Typography
                  variant="subtitle1"
                  color="text.primary"
                  fontWeight={700}
                  gutterBottom
                  sx={{ 
                    mb: 3,
                    position: 'relative',
                    display: 'inline-block',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: -8,
                      left: 0,
                      width: '40px',
                      height: '3px',
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: '2px',
                    }
                  }}
                >
                  {section.title}
                </Typography>
                <Box 
                  component={motion.ul}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.2,
                      },
                    },
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  sx={{ listStyle: 'none', p: 0, m: 0 }}
                >
                  {section.links.map((link, linkIndex) => (
                    <Box 
                      component={motion.li} 
                      key={linkIndex} 
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { 
                          opacity: 1, 
                          x: 0,
                          transition: {
                            type: "spring",
                            stiffness: 100,
                            damping: 10
                          }
                        }
                      }}
                      sx={{ mb: 2 }}
                    >
                      <MuiLink
                        component={Link}
                        href={link.href}
                        color="text.secondary"
                        sx={{
                          textDecoration: 'none',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          position: 'relative',
                          pl: 2,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: alpha(theme.palette.primary.main, 0.5),
                            transition: 'all 0.2s ease',
                          },
                          '&:hover': {
                            color: theme.palette.primary.main,
                            transform: 'translateX(5px)',
                            '&::before': {
                              backgroundColor: theme.palette.primary.main,
                              width: '8px',
                              height: '8px',
                            }
                          },
                        }}
                      >
                        {link.name}
                      </MuiLink>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 5 }} />

          {/* Bottom Footer */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: isTablet ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isTablet ? 'center' : 'center',
              textAlign: isTablet ? 'center' : 'left',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Trayarunya Ventures. All rights reserved.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 2, md: 3 },
                mt: isTablet ? 2 : 0,
                justifyContent: 'center',
              }}
            >
              {['Terms', 'Privacy', 'Cookies', 'Compliance'].map((item, index) => (
                <MuiLink
                  key={index}
                  component={Link}
                  href={`/${item.toLowerCase()}`}
                  color="text.secondary"
                  sx={{
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.2s ease',
                    '&:hover': {
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  {item}
                </MuiLink>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Scroll to top button */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.1 }}
        >
          <IconButton
            onClick={scrollToTop}
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                transform: 'translateY(-3px)',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
              },
              transition: 'all 0.3s ease',
              width: 50,
              height: 50,
            }}
          >
            <KeyboardArrowUpIcon fontSize="medium" />
          </IconButton>
        </motion.div>
      </Box>
    </Box>
  );
}
