'use client';

import React from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
  Paper,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  ArrowForward as ArrowForwardIcon,
  BusinessCenter as BusinessCenterIcon,
  Insights as InsightsIcon,
  MedicalServices as MedicalServicesIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { motion } from 'framer-motion';

const HeroSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  // Products data
  const products = [
    {
      icon: <BusinessCenterIcon sx={{ fontSize: '1.5rem', color: '#ffaf06' }} />,
      title: 'HireGenix',
      description: 'AI-powered recruitment platform',
    },
    {
      icon: <InsightsIcon sx={{ fontSize: '1.5rem', color: '#14bb87' }} />,
      title: 'MarketIQ',
      description: 'Market intelligence solution',
    },
    {
      icon: <MedicalServicesIcon sx={{ fontSize: '1.5rem', color: '#d92c4a' }} />,
      title: 'MedCodeX',
      description: 'AI medical coding platform',
    },
  ];

  // Stats data
  const stats = [
    { value: '3', label: 'AI Products' },
    { value: '2', label: 'Global Offices' },
    { value: '2024', label: 'Founded' },
  ];

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: { xs: 'auto', md: '100vh' },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: '#000000',
        color: 'white',
        pt: { xs: 12, md: 0 },
        pb: { xs: 10, md: 0 },
      }}
    >
      {/* Geometric pattern overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          zIndex: 1,
        }}
      />

      {/* Animated gradient orbs */}
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
        transition={{ duration: 1.5 }}
        sx={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: { xs: 200, md: 400 },
          height: { xs: 200, md: 400 },
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255, 175, 6, 0.5) 0%, rgba(0, 0, 0, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 1,
          animation: 'pulse 8s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.2 },
            '50%': { transform: 'scale(1.1)', opacity: 0.3 },
          },
        }}
      />

      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.15 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        sx={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(20, 187, 135, 0.5) 0%, rgba(0, 0, 0, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 1,
          animation: 'pulse2 10s ease-in-out infinite',
          '@keyframes pulse2': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.15 },
            '50%': { transform: 'scale(1.15)', opacity: 0.25 },
          },
        }}
      />

      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.15 }}
        transition={{ duration: 1.5, delay: 0.6 }}
        sx={{
          position: 'absolute',
          top: '40%',
          left: '15%',
          width: { xs: 100, md: 200 },
          height: { xs: 100, md: 200 },
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(217, 44, 74, 0.5) 0%, rgba(0, 0, 0, 0) 70%)`,
          filter: 'blur(60px)',
          zIndex: 1,
          animation: 'pulse3 12s ease-in-out infinite',
          '@keyframes pulse3': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.15 },
            '50%': { transform: 'scale(1.2)', opacity: 0.25 },
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {/* Left Content */}
          <Box 
            sx={{ 
              width: '100%', 
              flex: { xs: '0 0 100%', md: '0 0 calc(50% - 24px)' },
              order: { xs: 2, md: 1 }
            }}
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Chip
                label="AI-POWERED SAAS APPLICATIONS"
                sx={{
                  mb: 3,
                  py: 2,
                  px: 2,
                  borderRadius: '50px',
                  background: `linear-gradient(90deg, #ffaf06, #14bb87)`,
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                  fontWeight: 800,
                  mb: 2,
                  background: `linear-gradient(90deg, #FFFFFF 0%, #CCCCCC 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                Innovating with{' '}
                <Box component="span" sx={{ color: '#ffaf06', WebkitTextFillColor: '#ffaf06' }}>
                  AI-Powered
                </Box>{' '}
                SaaS Solutions
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  fontWeight: 400,
                  mb: 4,
                  color: 'rgba(255, 255, 255, 0.8)',
                  maxWidth: 550,
                  lineHeight: 1.6,
                }}
              >
                Trayarunya Ventures builds intelligent applications that streamline operations and enhance productivity for businesses worldwide.
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mb: 6 }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  component={Link}
                  href="/products"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    py: 1.5,
                    px: 4,
                    fontSize: '1rem',
                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
                    borderRadius: '50px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 6px 15px rgba(0, 0, 0, 0.3)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  Explore Our Products
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  color="inherit"
                  size="large"
                  component={Link}
                  href="/contact"
                  sx={{
                    py: 1.5,
                    px: 4,
                    fontSize: '1rem',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    borderRadius: '50px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  Get in Touch
                </Button>
              </Stack>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <Box 
                sx={{ 
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  mb: 4 
                }}
              >
                {stats.map((stat, index) => (
                  <Box 
                    key={index}
                    sx={{
                      flex: '1 1 auto',
                      minWidth: { xs: 'calc(50% - 8px)', sm: 'auto' }
                    }}
                  >
                    <motion.div variants={fadeIn}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          p: 2,
                          borderRadius: '16px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Typography
                          variant="h3"
                          sx={{
                            fontWeight: 800,
                            color: index === 0 ? '#ffaf06' : index === 1 ? '#14bb87' : '#d92c4a',
                            mb: 0.5,
                            fontSize: { xs: '1.75rem', md: '2.25rem' },
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 500,
                          }}
                        >
                          {stat.label}
                        </Typography>
                      </Box>
                    </motion.div>
                  </Box>
                ))}
              </Box>
            </motion.div>
          </Box>

          {/* Right Content - Products Preview */}
          <Box 
            sx={{ 
              width: '100%', 
              flex: { xs: '0 0 100%', md: '0 0 calc(50% - 24px)' },
              order: { xs: 1, md: 2 }
            }}
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <Box
              sx={{
                position: 'relative',
                height: { xs: 400, md: 550 },
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                perspective: '1200px',
              }}
            >
              {/* Main logo with 3D effect */}
              <Box
                component={motion.div}
                initial={{ opacity: 0, y: 20, rotateY: -15, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateY: -8, rotateX: 5 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.5s ease',
                  '&:hover': {
                    transform: 'rotateY(-4deg) rotateX(2deg)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    zIndex: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#1E1E1E',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  <Typography
                    variant="h1"
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                      color: '#FFFFFF',
                      textAlign: 'center',
                      mb: 2,
                    }}
                  >
                    TRAYARUNYA
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 400,
                      color: 'rgba(255, 255, 255, 0.7)',
                      textAlign: 'center',
                      mb: 6,
                    }}
                  >
                    VENTURES
                  </Typography>
                  
                  <Box
                    sx={{
                      width: '80%',
                      height: 8,
                      background: 'linear-gradient(90deg, #ffaf06, #14bb87, #d92c4a)',
                      borderRadius: 4,
                      mb: 6,
                    }}
                  />
                  
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      textAlign: 'center',
                      mb: 4,
                    }}
                  >
                    Established October 2024
                  </Typography>
                  
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#ffaf06',
                      }}
                    />
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#14bb87',
                      }}
                    />
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#d92c4a',
                      }}
                    />
                  </Box>
                </Box>

                {/* Glow effect behind image */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80%',
                    height: '80%',
                    borderRadius: '16px',
                    background: `radial-gradient(circle, rgba(255, 175, 6, 0.2) 0%, rgba(0, 0, 0, 0) 70%)`,
                    filter: 'blur(30px)',
                    zIndex: 1,
                  }}
                />
              </Box>

              {/* Product cards */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {products.map((product, index) => {
                  // Calculate positions for each product card
                  const positions = [
                    { top: '10%', right: '-5%', rotate: '5deg' },
                    { top: '50%', left: '-5%', rotate: '-3deg', translateY: '-50%' },
                    { bottom: '10%', right: '-5%', rotate: '2deg' },
                  ];

                  return (
                    <Box
                      key={index}
                      component={motion.div}
                      variants={fadeIn}
                      custom={index}
                      sx={{
                        position: 'absolute',
                        ...positions[index],
                        zIndex: 3,
                        maxWidth: 220,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: '12px',
                          background: 'rgba(30, 30, 30, 0.8)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          transform: `rotate(${positions[index].rotate})`,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: `rotate(${positions[index].rotate}) translateY(-5px)`,
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {product.icon}
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 600,
                              ml: 1,
                              color: 'white',
                            }}
                          >
                            {product.title}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            display: 'block',
                          }}
                        >
                          {product.description}
                        </Typography>
                      </Paper>
                    </Box>
                  );
                })}
              </motion.div>
            </Box>
          </Box>
        </Box>

        {/* Scroll down indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'white',
            opacity: 0.7,
            cursor: 'pointer',
            '&:hover': {
              opacity: 1,
            },
          }}
          component={motion.div}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          onClick={() => {
            window.scrollTo({
              top: window.innerHeight,
              behavior: 'smooth',
            });
          }}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            Scroll Down
          </Typography>
          <ArrowDownwardIcon
            sx={{
              animation: 'bounce 2s infinite',
              '@keyframes bounce': {
                '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
                '40%': { transform: 'translateY(-10px)' },
                '60%': { transform: 'translateY(-5px)' },
              },
            }}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default HeroSection;
