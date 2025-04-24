'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, Button, Paper, Chip, useTheme, useMediaQuery, Badge, alpha } from '@mui/material';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';
import CodeIcon from '@mui/icons-material/Code';
import PeopleIcon from '@mui/icons-material/People';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const features = [
  {
    icon: <BusinessIcon />,
    title: 'Global Presence',
    description: 'Founded in October 2024 with offices in USA and India',
  },
  {
    icon: <CodeIcon />,
    title: 'AI Expertise',
    description: 'Specializing in AI-powered SaaS applications',
  },
  {
    icon: <PeopleIcon />,
    title: 'Expert Team',
    description: 'Team of experienced engineers and AI specialists',
  },
  {
    icon: <LightbulbIcon />,
    title: 'Innovation Focus',
    description: 'Committed to innovation and excellence',
  },
];

const AboutSection = () => {
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

  return (
    <Box
      sx={{
        py: { xs: 10, md: 14 },
        backgroundColor: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: 'radial-gradient(circle, #d92c4a 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          zIndex: 0,
        }}
      />

      {/* Animated gradient orbs */}
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.1 }}
        transition={{ duration: 1.5 }}
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '10%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(217, 44, 74, 0.4) 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'pulse 10s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.1 },
            '50%': { transform: 'scale(1.1)', opacity: 0.15 },
          },
        }}
      />
      
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.08 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        sx={{
          position: 'absolute',
          top: '15%',
          right: '10%',
          width: { xs: 120, md: 250 },
          height: { xs: 120, md: 250 },
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(20, 187, 135, 0.4) 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'pulse2 12s ease-in-out infinite',
          '@keyframes pulse2': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.08 },
            '50%': { transform: 'scale(1.15)', opacity: 0.12 },
          },
        }}
      />
      
      {/* Floating particles - Client-side only rendering */}
      <FloatingParticles count={15} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 10 }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Chip
              label="ABOUT US"
              sx={{
                mb: 3,
                py: 1.5,
                px: 2,
                borderRadius: '50px',
                background: `linear-gradient(90deg, #d92c4a, #d92c4a)`,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.75rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              }}
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontWeight: 700,
                mb: 2,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                color: '#000000',
              }}
            >
              Our Story
            </Typography>
            <Typography
              variant="h5"
              component="p"
              sx={{ mb: 2, maxWidth: 700, mx: 'auto', fontWeight: 400, color: 'text.secondary' }}
            >
              Trayarunya Ventures is a forward-thinking technology company dedicated to creating innovative AI-powered SaaS applications that solve real-world business challenges.
            </Typography>
          </motion.div>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', mb: 10 }}>
          <Box 
            sx={{ 
              width: '100%', 
              flex: { xs: '0 0 100%', md: '0 0 calc(50% - 24px)' },
              order: { xs: 2, md: 1 }
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Typography
                variant="h3"
                component="h3"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: '#000000',
                }}
              >
                Our Mission
              </Typography>
              <Typography
                variant="body1"
                sx={{ mb: 4, color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1.7 }}
              >
                At Trayarunya Ventures, we're on a mission to transform businesses through intelligent software solutions. We believe that AI has the power to revolutionize how companies operate, making them more efficient, data-driven, and competitive in today's rapidly evolving marketplace.
              </Typography>
              <Typography
                variant="body1"
                sx={{ mb: 4, color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1.7 }}
              >
                Founded in October 2024, our company brings together expertise from both the USA and India, combining global perspectives with deep technical knowledge to create products that truly make a difference.
              </Typography>

              <Button
                variant="contained"
                color="error"
                size="large"
                component={Link}
                href="/about"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  py: 1.5,
                  px: 3,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: '50px',
                  boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)',
                  },
                  transition: 'all 0.3s ease',
                  backgroundColor: '#d92c4a',
                }}
              >
                Learn More About Us
              </Button>
            </motion.div>
          </Box>

          <Box 
            sx={{ 
              width: '100%', 
              flex: { xs: '0 0 100%', md: '0 0 calc(50% - 24px)' },
              order: { xs: 1, md: 2 }
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: { xs: 300, md: 450 },
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                  background: 'linear-gradient(135deg, #111111 0%, #000000 100%)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'column',
                  p: 4,
                  perspective: '1000px',
                }}
              >
                {/* 3D Rotating Logo */}
                <Box
                  component={motion.div}
                  animate={{ 
                    rotateY: [0, 10, 0, -10, 0],
                    rotateX: [0, 5, 0, -5, 0]
                  }}
                  transition={{ 
                    duration: 8, 
                    ease: "easeInOut", 
                    repeat: Infinity 
                  }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <Typography 
                    variant="h2" 
                    sx={{ 
                      color: '#ffffff', 
                      fontWeight: 800,
                      textAlign: 'center',
                      mb: 2,
                      textShadow: '0 0 20px rgba(255,255,255,0.3)',
                      background: 'linear-gradient(90deg, #ffffff, #aaaaaa)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    TRAYARUNYA
                  </Typography>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: '#ffffff', 
                      fontWeight: 400,
                      textAlign: 'center',
                      opacity: 0.8
                    }}
                  >
                    VENTURES
                  </Typography>
                </Box>
                
                {/* Animated particles inside the box - Client-side only rendering */}
                <BoxParticles count={20} />
                
                {/* Glowing border */}
                <Box
                  component={motion.div}
                  animate={{ 
                    boxShadow: [
                      '0 0 10px rgba(255,175,6,0.5)', 
                      '0 0 20px rgba(20,187,135,0.5)', 
                      '0 0 10px rgba(217,44,74,0.5)',
                      '0 0 10px rgba(255,175,6,0.5)'
                    ]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 4,
                    pointerEvents: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                
                {/* Gradient bar at bottom */}
                <Box
                  component={motion.div}
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 8,
                    background: 'linear-gradient(90deg, #ffaf06, #14bb87, #d92c4a, #ffaf06)',
                    backgroundSize: '300% 100%',
                  }}
                />
              </Box>
            </motion.div>
          </Box>
        </Box>

        {/* Features Grid */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h3"
            component="h3"
            sx={{
              fontWeight: 700,
              mb: 6,
              textAlign: 'center',
            }}
          >
            What Sets Us Apart
          </Typography>
          
          <Box
            component={motion.div}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 4,
            }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                custom={index}
              >
                <Paper
                  elevation={0}
                  component={motion.div}
                  whileHover={{ 
                    y: -10,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    transition: { duration: 0.3 }
                  }}
                  sx={{
                    p: 4,
                    height: '100%',
                    borderRadius: 4,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Subtle gradient accent in corner */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: 100,
                      height: 100,
                      borderRadius: '0 0 0 100%',
                      background: index === 0 ? 'linear-gradient(135deg, rgba(255,175,6,0.1) 0%, rgba(255,255,255,0) 70%)' : 
                                index === 1 ? 'linear-gradient(135deg, rgba(20,187,135,0.1) 0%, rgba(255,255,255,0) 70%)' : 
                                index === 2 ? 'linear-gradient(135deg, rgba(217,44,74,0.1) 0%, rgba(255,255,255,0) 70%)' : 
                                'linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(255,255,255,0) 70%)',
                      opacity: 0.8,
                      zIndex: 0,
                    }}
                  />
                  
                  <Box
                    component={motion.div}
                    whileHover={{ 
                      scale: 1.1,
                      rotate: 5,
                      transition: { duration: 0.3 }
                    }}
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: index === 0 ? '#ffaf0615' : 
                                      index === 1 ? '#14bb8715' : 
                                      index === 2 ? '#d92c4a15' : 
                                      '#00000015',
                      color: index === 0 ? '#ffaf06' : 
                             index === 1 ? '#14bb87' : 
                             index === 2 ? '#d92c4a' : 
                             '#000000',
                      mb: 3,
                      position: 'relative',
                      zIndex: 1,
                      boxShadow: index === 0 ? '0 10px 20px rgba(255,175,6,0.1)' : 
                                index === 1 ? '0 10px 20px rgba(20,187,135,0.1)' : 
                                index === 2 ? '0 10px 20px rgba(217,44,74,0.1)' : 
                                '0 10px 20px rgba(0,0,0,0.05)',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        right: -2,
                        bottom: -2,
                        borderRadius: '50%',
                        background: index === 0 ? 'linear-gradient(135deg, #ffaf06, transparent)' : 
                                   index === 1 ? 'linear-gradient(135deg, #14bb87, transparent)' : 
                                   index === 2 ? 'linear-gradient(135deg, #d92c4a, transparent)' : 
                                   'linear-gradient(135deg, #000000, transparent)',
                        opacity: 0.2,
                        zIndex: -1,
                      },
                      '& svg': {
                        fontSize: 36,
                      },
                    }}
                  >
                    {feature.icon}
                  </Box>
                  
                  <Typography 
                    variant="h6" 
                    fontWeight={700} 
                    gutterBottom
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      color: index === 0 ? '#ffaf06' : 
                             index === 1 ? '#14bb87' : 
                             index === 2 ? '#d92c4a' : 
                             '#000000',
                    }}
                  >
                    {feature.title}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Paper>
              </motion.div>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

// Define types for our particle configurations
interface FloatingParticleConfig {
  initialX: number;
  initialY: number;
  initialOpacity: number;
  animateX: number[];
  animateY: number[];
  animateOpacity: number[];
  duration: number;
  width: number;
  height: number;
  color: string;
}

interface BoxParticleConfig {
  initialX: number;
  initialY: number;
  initialOpacity: number;
  animateX: number[];
  animateY: number[];
  duration: number;
  width: number;
  height: number;
  color: string;
}

// Client-side only component for floating particles
const FloatingParticles = ({ count }: { count: number }) => {
  const [isClient, setIsClient] = useState(false);
  const particlesConfig = useRef<FloatingParticleConfig[]>([]);

  // Pre-generate random values on component mount
  useEffect(() => {
    particlesConfig.current = Array(count).fill(0).map((_, i) => ({
      initialX: Math.random() * 100,
      initialY: Math.random() * 100,
      initialOpacity: Math.random() * 0.5 + 0.3,
      animateX: [
        Math.random() * 500,
        Math.random() * 500,
        Math.random() * 500
      ],
      animateY: [
        Math.random() * 500,
        Math.random() * 500,
        Math.random() * 500
      ],
      animateOpacity: [
        Math.random() * 0.5 + 0.3,
        Math.random() * 0.5 + 0.3,
        Math.random() * 0.5 + 0.3
      ],
      duration: Math.random() * 20 + 20,
      width: Math.random() * 6 + 2,
      height: Math.random() * 6 + 2,
      color: i % 3 === 0 ? '#d92c4a' : i % 3 === 1 ? '#14bb87' : '#ffaf06'
    }));
    setIsClient(true);
  }, [count]);

  if (!isClient) return null;

  return (
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0 }}>
      {particlesConfig.current.map((config, i) => (
        <Box
          key={i}
          component={motion.div}
          initial={{ 
            x: config.initialX, 
            y: config.initialY,
            opacity: config.initialOpacity
          }}
          animate={{ 
            x: config.animateX,
            y: config.animateY,
            opacity: config.animateOpacity
          }}
          transition={{ 
            duration: config.duration, 
            repeat: Infinity,
            ease: "linear"
          }}
          sx={{
            position: 'absolute',
            width: config.width,
            height: config.height,
            borderRadius: '50%',
            backgroundColor: config.color,
            boxShadow: `0 0 10px ${config.color}`,
          }}
        />
      ))}
    </Box>
  );
};

// Client-side only component for box particles
const BoxParticles = ({ count }: { count: number }) => {
  const [isClient, setIsClient] = useState(false);
  const particlesConfig = useRef<BoxParticleConfig[]>([]);

  // Pre-generate random values on component mount
  useEffect(() => {
    particlesConfig.current = Array(count).fill(0).map((_, i) => ({
      initialX: Math.random() * 100,
      initialY: Math.random() * 100,
      initialOpacity: Math.random() * 0.3 + 0.1,
      animateX: [
        Math.random() * 300,
        Math.random() * 300,
        Math.random() * 300
      ],
      animateY: [
        Math.random() * 300,
        Math.random() * 300,
        Math.random() * 300
      ],
      duration: Math.random() * 15 + 15,
      width: Math.random() * 3 + 1,
      height: Math.random() * 3 + 1,
      color: i % 3 === 0 ? '#d92c4a' : i % 3 === 1 ? '#14bb87' : '#ffaf06'
    }));
    setIsClient(true);
  }, [count]);

  if (!isClient) return null;

  return (
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {particlesConfig.current.map((config, i) => (
        <Box
          key={i}
          component={motion.div}
          initial={{ 
            x: config.initialX, 
            y: config.initialY,
            opacity: config.initialOpacity
          }}
          animate={{ 
            x: config.animateX,
            y: config.animateY,
          }}
          transition={{ 
            duration: config.duration, 
            repeat: Infinity,
            ease: "linear"
          }}
          sx={{
            position: 'absolute',
            width: config.width,
            height: config.height,
            borderRadius: '50%',
            backgroundColor: config.color,
            boxShadow: `0 0 5px ${config.color}`,
          }}
        />
      ))}
    </Box>
  );
};

export default AboutSection;
