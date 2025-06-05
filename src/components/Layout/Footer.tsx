'use client';

import React, { useEffect, useState } from 'react';
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
  Chip,
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
  Code as CodeIcon,
  Cloud as CloudIcon,
  Psychology as AIIcon,
  DataObject as DataIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  AutoGraph as AnalyticsIcon,
  Rocket as RocketIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useAnimation } from 'framer-motion';

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
  { icon: <LocationOnIcon />, text: '1050 North 3rd Street Ste B, Laramie, WY 82072' },
  { icon: <LocationOnIcon />, text: '2/1201 Behind S.A.M Inter College, Ramnagar, Saharanpur (U.P)-247001' },
  { icon: <PhoneIcon />, text: '+1 (971) 512-1701 (US)' },
  { icon: <PhoneIcon />, text: '+91-8954333390 (India)' },
  { icon: <EmailIcon />, text: 'info@trayarunyaventures.com' },
];

const techStack = [
  { icon: <AIIcon />, label: 'AI/ML', color: '#FF6B35' },
  { icon: <CloudIcon />, label: 'Cloud', color: '#4285F4' },
  { icon: <CodeIcon />, label: 'Full Stack', color: '#00D4AA' },
  { icon: <DataIcon />, label: 'Data Science', color: '#9C27B0' },
  { icon: <SecurityIcon />, label: 'Cybersecurity', color: '#F44336' },
  { icon: <AnalyticsIcon />, label: 'Analytics', color: '#FF9800' },
];

// Floating particles component
const FloatingParticles = () => {
  const [positions, setPositions] = useState<{ x: number; y: number; size: number; duration: number }[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPositions(
        Array.from({ length: 12 }, () => ({
          x: Math.random() * window.innerWidth,
          y: Math.random() * 800 + 800,
          size: Math.random() * 4 + 2,
          duration: Math.random() * 10 + 10,
        }))
      );
    }
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {positions.map((particle, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: `linear-gradient(45deg, #00D4AA, #0066CC)`,
            boxShadow: '0 0 10px rgba(0, 212, 170, 0.5)',
            left: particle.x,
            top: particle.y,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: -1000,
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.2,
          }}
        />
      ))}
    </Box>
  );
};

// Binary rain effect
const BinaryRain = () => {
  const [binaryStrings, setBinaryStrings] = useState<string[]>([]);

  useEffect(() => {
    const generateBinary = () => {
      const strings = Array.from({ length: 15 }, () => {
        return Array.from({ length: 8 }, () => Math.round(Math.random())).join('');
      });
      setBinaryStrings(strings);
    };

    generateBinary();
    const interval = setInterval(generateBinary, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.03,
      }}
    >
      {binaryStrings.map((binary, index) => (
        <motion.div
          key={index}
          style={{
            position: 'absolute',
            left: `${(index * 7) % 100}%`,
            color: '#00ff41',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: '100vh', opacity: [0, 1, 0] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: index * 0.5,
            ease: 'linear',
          }}
        >
          {binary}
        </motion.div>
      ))}
    </Box>
  );
};

export default function Footer() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const controls = useAnimation();

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
        borderTop: `3px solid transparent`,
        borderImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'}, ${theme.palette.primary.main}) 1`,
      }}
    >
      {/* Animated Background Effects */}
      <FloatingParticles />
      <BinaryRain />
      
      {/* Glowing Grid Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.02,
          backgroundImage: `
            linear-gradient(rgba(0, 212, 170, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 170, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          zIndex: 0,
          animation: 'gridPulse 4s ease-in-out infinite',
          '@keyframes gridPulse': {
            '0%, 100%': { opacity: 0.02 },
            '50%': { opacity: 0.05 },
          },
        }}
      />
      
      {/* Dynamic gradient orbs */}
      {[1, 2, 3].map((orb) => (
        <Box
          key={orb}
          component={motion.div}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.2, 0.8], 
            opacity: [0.03, 0.08, 0.03],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ 
            duration: 15 + orb * 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          sx={{
            position: 'absolute',
            top: `${20 + orb * 15}%`,
            right: `${5 + orb * 20}%`,
            width: { xs: 100 + orb * 50, md: 200 + orb * 100 },
            height: { xs: 100 + orb * 50, md: 200 + orb * 100 },
            borderRadius: '50%',
            background: `conic-gradient(from ${orb * 120}deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'}, ${theme.palette.primary.main})`,
            filter: 'blur(100px)',
            zIndex: 0,
          }}
        />
      ))}

      {/* Tech Stack Showcase Section */}
      <Box
        sx={{
          py: 6,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary?.main || '#14bb87', 0.03)} 100%)`,
          position: 'relative',
          zIndex: 1,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                variant="h5"
                component="h3"
                fontWeight={700}
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                <RocketIcon sx={{ color: theme.palette.primary.main }} />
                Powered by Cutting-Edge Technology
                <SpeedIcon sx={{ color: theme.palette.secondary?.main || '#14bb87' }} />
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                We leverage the latest technologies to build innovative AI-powered solutions that drive digital transformation
              </Typography>
            </Box>
            
            <Box 
              sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 2, 
                justifyContent: 'center',
                alignItems: 'center' 
              }}
            >
              {techStack.map((tech, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100,
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    y: -5,
                  }}
                >
                  <Chip
                    icon={tech.icon}
                    label={tech.label}
                    variant="outlined"
                    sx={{
                      borderColor: tech.color,
                      color: tech.color,
                      backgroundColor: alpha(tech.color, 0.05),
                      borderWidth: 2,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      padding: '8px 12px',
                      height: 'auto',
                      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      boxShadow: `0 4px 12px ${alpha(tech.color, 0.2)}`,
                      '&:hover': {
                        backgroundColor: alpha(tech.color, 0.1),
                        borderColor: tech.color,
                        boxShadow: `0 8px 25px ${alpha(tech.color, 0.3)}`,
                        transform: 'translateY(-2px)',
                      },
                      '& .MuiChip-icon': {
                        color: tech.color,
                        fontSize: '1.2rem',
                      },
                    }}
                  />
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Enhanced Newsletter Section */}
      <Box
        sx={{
          py: 8,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary?.main || '#14bb87', 0.08)} 100%)`,
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: '700px', textAlign: 'center' }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <SendIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                  </motion.div>
                  <Typography
                    variant="h3"
                    component="h2"
                    fontWeight={800}
                    sx={{
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Stay Ahead of the Curve
                  </Typography>
                </Box>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7, fontWeight: 400 }}>
                  Get exclusive insights on AI innovations, industry trends, and cutting-edge technology updates delivered straight to your inbox
                </Typography>
                <Box
                  component="form"
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 2, sm: 0 },
                    maxWidth: 500,
                    mx: 'auto',
                  }}
                  onSubmit={(e) => e.preventDefault()}
                >
                  <TextField
                    placeholder="Enter your email for tech updates"
                    variant="outlined"
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: { xs: 3, sm: '50px 0 0 50px' },
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        '& fieldset': {
                          border: 'none',
                        },
                        '&:hover': {
                          border: `2px solid ${theme.palette.primary.main}`,
                          boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.2)}`,
                        },
                        '&.Mui-focused': {
                          border: `2px solid ${theme.palette.primary.main}`,
                          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <EmailIcon color="primary" />
                          </motion.div>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      type="submit"
                      size="large"
                      sx={{
                        borderRadius: { xs: 3, sm: '0 50px 50px 0' },
                        px: 4,
                        py: 2,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'})`,
                        boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.3)}`,
                        transition: 'all 0.3s ease',
                        fontWeight: 700,
                        fontSize: '1rem',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: `0 10px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                      }}
                    >
                      Subscribe Now
                    </Button>
                  </motion.div>
                </Box>
              </motion.div>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Enhanced Main Footer */}
      <Box
        sx={{
          pt: 12,
          pb: 6,
          position: 'relative',
          zIndex: 1,
          background: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {/* Enhanced Logo and Description */}
            <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: '35%' } }}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Box sx={{ mb: 4 }}>
                  <Link href="/" passHref style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary?.main || '#14bb87', 0.05)})`,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                        }
                      }}
                    >
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
                
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontWeight: 700,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Building Tomorrow's Technology Today
                </Typography>
                
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, lineHeight: 1.8 }}>
                  Trayarunya Ventures is at the forefront of AI innovation, creating intelligent SaaS solutions that transform how businesses operate. We combine cutting-edge technology with human insight to build the future of work.
                </Typography>

                <Box sx={{ mb: 4 }}>
                  {contactInfo.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          mb: 2.5, 
                          alignItems: 'flex-start',
                          p: 1.5,
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            transform: 'translateX(5px)',
                          }
                        }}
                      >
                        <Box sx={{
                          color: theme.palette.primary.main,
                          mr: 2,
                          mt: 0.5,
                          p: 1,
                          borderRadius: '50%',
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        }}>
                          {item.icon}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          {item.text}
                        </Typography>
                      </Box>
                    </motion.div>
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
                    variant="h6" 
                    sx={{ 
                      mb: 3, 
                      color: 'text.primary',
                      fontWeight: 700,
                      position: 'relative',
                      display: 'inline-block',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -8,
                        left: 0,
                        width: '50px',
                        height: '3px',
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'})`,
                        borderRadius: '2px',
                      }
                    }}
                  >
                    Connect & Collaborate
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
                    sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}
                  >
                    {socialLinks.map((link, index) => (
                      <motion.div
                        key={index}
                        variants={{
                          hidden: { opacity: 0, scale: 0.5, rotate: -180 },
                          visible: { 
                            opacity: 1, 
                            scale: 1,
                            rotate: 0,
                            transition: {
                              type: "spring",
                              stiffness: 200,
                              damping: 15,
                              delay: index * 0.05
                            }
                          }
                        }}
                        whileHover={{ 
                          scale: 1.2, 
                          rotate: 5,
                          transition: { duration: 0.2 }
                        }}
                      >
                        <Tooltip title={`Follow us on ${link.label}`} arrow>
                          <IconButton
                            component="a"
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={link.label}
                            sx={{
                              color: 'white',
                              background: `linear-gradient(135deg, ${link.color}, ${alpha(link.color, 0.8)})`,
                              width: 50,
                              height: 50,
                              '&:hover': {
                                background: `linear-gradient(135deg, ${alpha(link.color, 0.9)}, ${link.color})`,
                                transform: 'translateY(-4px) rotate(5deg)',
                                boxShadow: `0 12px 30px ${alpha(link.color, 0.5)}`,
                              },
                              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                              boxShadow: `0 6px 15px ${alpha(link.color, 0.3)}`,
                            }}
                          >
                            {link.icon}
                          </IconButton>
                        </Tooltip>
                      </motion.div>
                    ))}
                  </Box>
                </Box>
              </motion.div>
            </Box>

            {/* Enhanced Footer Links */}
            {footerLinks.map((section, index) => (
              <Box 
                key={index} 
                component={motion.div}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                sx={{ width: { xs: '50%', sm: '25%', md: '16.25%' } }}
              >
                <Typography
                  variant="h6"
                  color="text.primary"
                  fontWeight={700}
                  gutterBottom
                  sx={{ 
                    mb: 4,
                    position: 'relative',
                    display: 'inline-block',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: -12,
                      left: 0,
                      width: '60px',
                      height: '4px',
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'})`,
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
                        hidden: { opacity: 0, x: -20 },
                        visible: { 
                          opacity: 1, 
                          x: 0,
                          transition: {
                            type: "spring",
                            stiffness: 120,
                            damping: 12
                          }
                        }
                      }}
                      sx={{ mb: 2.5 }}
                    >
                      <MuiLink
                        component={Link}
                        href={link.href}
                        color="text.secondary"
                        sx={{
                          textDecoration: 'none',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          position: 'relative',
                          pl: 3,
                          py: 1,
                          borderRadius: 2,
                          fontWeight: 500,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: alpha(theme.palette.primary.main, 0.4),
                            transition: 'all 0.3s ease',
                          },
                          '&:hover': {
                            color: theme.palette.primary.main,
                            transform: 'translateX(8px)',
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            '&::before': {
                              backgroundColor: theme.palette.primary.main,
                              width: '12px',
                              height: '12px',
                              boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}`,
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

          <Divider 
            sx={{ 
              my: 6, 
              background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'}, transparent)`,
              height: 2,
              border: 'none',
            }} 
          />

          {/* Enhanced Bottom Footer */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: isTablet ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isTablet ? 'center' : 'center',
              textAlign: isTablet ? 'center' : 'left',
              gap: 3,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                © {new Date().getFullYear()} Trayarunya Ventures. 
                <Box component="span" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                  {' '}Innovating the Future
                </Box>
              </Typography>
            </motion.div>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 3, md: 4 },
                justifyContent: 'center',
              }}
            >
              {['Terms', 'Privacy', 'Cookies', 'Compliance'].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -2 }}
                >
                  <MuiLink
                    component={Link}
                    href={`/${item.toLowerCase()}`}
                    color="text.secondary"
                    sx={{
                      textDecoration: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      transition: 'all 0.3s ease',
                      padding: '6px 12px',
                      borderRadius: 2,
                      border: `1px solid transparent`,
                      '&:hover': {
                        color: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    {item}
                  </MuiLink>
                </motion.div>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Enhanced Scroll to top button */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 30,
          right: 30,
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.1, y: -5 }}
          whileTap={{ scale: 0.9 }}
        >
          <Tooltip title="Back to Top" arrow placement="left">
            <IconButton
              onClick={scrollToTop}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'})`,
                color: 'white',
                width: 60,
                height: 60,
                boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark || theme.palette.primary.main}, ${theme.palette.secondary?.dark || '#0ea571'})`,
                  transform: 'translateY(-5px) rotate(5deg)',
                  boxShadow: `0 15px 35px ${alpha(theme.palette.primary.main, 0.5)}`,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  padding: '2px',
                  background: `conic-gradient(from 0deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#14bb87'}, ${theme.palette.primary.main})`,
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  maskComposite: 'exclude',
                  animation: 'spin 3s linear infinite',
                },
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              <KeyboardArrowUpIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        </motion.div>
      </Box>
    </Box>
  );
}
