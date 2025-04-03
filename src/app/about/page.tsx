'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Grid, Paper, Chip, Avatar, Button, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import CodeIcon from '@mui/icons-material/Code';
import PeopleIcon from '@mui/icons-material/People';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TimelineIcon from '@mui/icons-material/Timeline';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

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

const values = [
  {
    icon: <AutoAwesomeIcon />,
    title: 'Innovation',
    description: 'We constantly push boundaries to create cutting-edge solutions that transform businesses.',
  },
  {
    icon: <WorkspacePremiumIcon />,
    title: 'Excellence',
    description: 'We are committed to delivering the highest quality in everything we do.',
  },
  {
    icon: <TimelineIcon />,
    title: 'Growth',
    description: 'We believe in continuous improvement and helping our clients grow.',
  },
  {
    icon: <EmojiObjectsIcon />,
    title: 'Integrity',
    description: 'We operate with transparency, honesty, and ethical business practices.',
  },
];

const timeline = [
  {
    year: '2024',
    title: 'Company Founded',
    description: 'Trayarunya Ventures was established with offices in USA and India.',
  },
  {
    year: '2024',
    title: 'First Product Launch',
    description: 'Successfully launched our first AI-powered SaaS application.',
  },
  {
    year: '2025',
    title: 'Expansion',
    description: 'Expanded our team and product offerings to serve more industries.',
  },
  {
    year: '2025',
    title: 'Global Partnerships',
    description: 'Formed strategic partnerships to enhance our global presence.',
  },
];

export default function AboutPage() {
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
    <Layout>
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Hero Section */}
        <Box
          sx={{
            py: { xs: 10, md: 14 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary ? theme.palette.secondary.main : '#000', 0.05)} 100%)`,
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
              animation: 'heroPulse 10s ease-in-out infinite',
              '@keyframes heroPulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 0.05 },
                '50%': { transform: 'scale(1.1)', opacity: 0.08 },
              },
            }}
          />

          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Chip
                  label="ABOUT US"
                  sx={{
                    mb: 3,
                    py: 1.5,
                    px: 2,
                    borderRadius: '50px',
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  }}
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '4rem' },
                    color: theme.palette.text.primary,
                  }}
                >
                  Our Story
                </Typography>
                <Typography
                  variant="h5"
                  component="p"
                  sx={{ 
                    mb: 4, 
                    maxWidth: 800, 
                    mx: 'auto', 
                    fontWeight: 400, 
                    color: theme.palette.text.secondary,
                    lineHeight: 1.6,
                  }}
                >
                  Trayarunya Ventures is a forward-thinking technology company dedicated to creating innovative AI-powered SaaS applications that solve real-world business challenges.
                </Typography>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Mission Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
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
                    component="h2"
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Our Mission
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ 
                      mb: 4, 
                      color: theme.palette.text.secondary, 
                      fontSize: '1.1rem', 
                      lineHeight: 1.7 
                    }}
                  >
                    At Trayarunya Ventures, we're on a mission to transform businesses through intelligent software solutions. We believe that AI has the power to revolutionize how companies operate, making them more efficient, data-driven, and competitive in today's rapidly evolving marketplace.
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ 
                      mb: 4, 
                      color: theme.palette.text.secondary, 
                      fontSize: '1.1rem', 
                      lineHeight: 1.7 
                    }}
                  >
                    Founded in October 2024, our company brings together expertise from both the USA and India, combining global perspectives with deep technical knowledge to create products that truly make a difference.
                  </Typography>
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
                      height: { xs: 300, md: 400 },
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
                    
                    {/* Animated particles inside the box */}
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
                      {[...Array(20)].map((_, i) => (
                        <Box
                          key={i}
                          component={motion.div}
                          initial={{ 
                            x: Math.random() * 100, 
                            y: Math.random() * 100,
                            opacity: Math.random() * 0.3 + 0.1
                          }}
                          animate={{ 
                            x: [
                              Math.random() * 300, 
                              Math.random() * 300,
                              Math.random() * 300
                            ],
                            y: [
                              Math.random() * 300, 
                              Math.random() * 300,
                              Math.random() * 300
                            ],
                          }}
                          transition={{ 
                            duration: Math.random() * 15 + 15, 
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          sx={{
                            position: 'absolute',
                            width: Math.random() * 3 + 1,
                            height: Math.random() * 3 + 1,
                            borderRadius: '50%',
                            backgroundColor: i % 3 === 0 ? theme.palette.primary.main : i % 3 === 1 ? theme.palette.secondary?.main || '#14bb87' : '#ffaf06',
                            boxShadow: i % 3 === 0 ? `0 0 5px ${theme.palette.primary.main}` : i % 3 === 1 ? `0 0 5px ${theme.palette.secondary?.main || '#14bb87'}` : '0 0 5px #ffaf06',
                          }}
                        />
                      ))}
                    </Box>
                    
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
                        background: `linear-gradient(90deg, #ffaf06, ${theme.palette.secondary?.main || '#14bb87'}, ${theme.palette.primary.main}, #ffaf06)`,
                        backgroundSize: '300% 100%',
                      }}
                    />
                  </Box>
                </motion.div>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Features Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: theme.palette.text.primary,
                }}
              >
                What Sets Us Apart
              </Typography>
              <Typography
                variant="body1"
                sx={{ 
                  mb: 4, 
                  maxWidth: 700, 
                  mx: 'auto', 
                  color: theme.palette.text.secondary, 
                  fontSize: '1.1rem', 
                  lineHeight: 1.7 
                }}
              >
                Our unique approach combines cutting-edge technology with deep industry expertise to deliver solutions that drive real business value.
              </Typography>
            </Box>
            
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
                                  index === 2 ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, rgba(255,255,255,0) 70%)` : 
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
                                        index === 2 ? alpha(theme.palette.primary.main, 0.1) : 
                                        '#00000015',
                        color: index === 0 ? '#ffaf06' : 
                               index === 1 ? '#14bb87' : 
                               index === 2 ? theme.palette.primary.main : 
                               '#000000',
                        mb: 3,
                        position: 'relative',
                        zIndex: 1,
                        boxShadow: index === 0 ? '0 10px 20px rgba(255,175,6,0.1)' : 
                                  index === 1 ? '0 10px 20px rgba(20,187,135,0.1)' : 
                                  index === 2 ? `0 10px 20px ${alpha(theme.palette.primary.main, 0.1)}` : 
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
                                     index === 2 ? `linear-gradient(135deg, ${theme.palette.primary.main}, transparent)` : 
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
                               index === 2 ? theme.palette.primary.main : 
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
          </Container>
        </Box>

        {/* Values Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: theme.palette.text.primary,
                }}
              >
                Our Core Values
              </Typography>
              <Typography
                variant="body1"
                sx={{ 
                  mb: 4, 
                  maxWidth: 700, 
                  mx: 'auto', 
                  color: theme.palette.text.secondary, 
                  fontSize: '1.1rem', 
                  lineHeight: 1.7 
                }}
              >
                These principles guide everything we do and shape our company culture.
              </Typography>
            </Box>
            
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
              {values.map((value, index) => (
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
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        mb: 3,
                        position: 'relative',
                        zIndex: 1,
                        boxShadow: `0 10px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: -2,
                          left: -2,
                          right: -2,
                          bottom: -2,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.palette.primary.main}, transparent)`,
                          opacity: 0.2,
                          zIndex: -1,
                        },
                        '& svg': {
                          fontSize: 36,
                        },
                      }}
                    >
                      {value.icon}
                    </Box>
                    
                    <Typography 
                      variant="h6" 
                      fontWeight={700} 
                      gutterBottom
                      sx={{
                        position: 'relative',
                        zIndex: 1,
                        color: theme.palette.primary.main,
                      }}
                    >
                      {value.title}
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
                      {value.description}
                    </Typography>
                  </Paper>
                </motion.div>
              ))}
            </Box>
          </Container>
        </Box>

        {/* Timeline Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: theme.palette.text.primary,
                }}
              >
                Our Journey
              </Typography>
              <Typography
                variant="body1"
                sx={{ 
                  mb: 4, 
                  maxWidth: 700, 
                  mx: 'auto', 
                  color: theme.palette.text.secondary, 
                  fontSize: '1.1rem', 
                  lineHeight: 1.7 
                }}
              >
                A brief timeline of our company's growth and achievements.
              </Typography>
            </Box>
            
            <Box sx={{ position: 'relative' }}>
              {/* Timeline line */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: { xs: 20, md: '50%' },
                  width: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  transform: { xs: 'none', md: 'translateX(-1px)' },
                  zIndex: 1,
                }}
              />
              
              {/* Timeline events */}
              <Box sx={{ position: 'relative', zIndex: 2 }}>
                {timeline.map((event, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'row', md: index % 2 === 0 ? 'row' : 'row-reverse' },
                      mb: 6,
                      position: 'relative',
                    }}
                  >
                    {/* Year marker */}
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        position: 'absolute',
                        left: { xs: 0, md: 'calc(50% - 20px)' },
                        zIndex: 3,
                        boxShadow: '0 0 0 4px white, 0 0 0 5px rgba(0,0,0,0.1)',
                      }}
                    >
                      {event.year.slice(-2)}
                    </Box>
                    
                    {/* Content */}
                    <Box
                      sx={{
                        flex: 1,
                        ml: { xs: 6, md: index % 2 === 0 ? 6 : 0 },
                        mr: { xs: 0, md: index % 2 === 0 ? 0 : 6 },
                        textAlign: { xs: 'left', md: index % 2 === 0 ? 'left' : 'right' },
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                          border: '1px solid rgba(0,0,0,0.05)',
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 20,
                            [index % 2 === 0 ? 'left' : 'right']: { xs: -12, md: -12 },
                            width: 0,
                            height: 0,
                            borderTop: '12px solid transparent',
                            borderBottom: '12px solid transparent',
                            [index % 2 === 0 ? 'borderRight' : 'borderLeft']: '12px solid white',
                            display: { xs: index % 2 === 0 ? 'block' : 'none', md: 'block' },
                            zIndex: 1,
                          },
                        }}
                      >
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          {event.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {event.description}
                        </Typography>
                        <Chip
                          label={event.year}
                          size="small"
                          sx={{
                            mt: 2,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                          }}
                        />
                      </Paper>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Container>
        </Box>

        {/* CTA Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                p: { xs: 4, md: 8 },
                borderRadius: 4,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary ? theme.palette.secondary.main : '#000', 0.05)} 100%)`,
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h3"
                  component="h2"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    color: theme.palette.text.primary,
                  }}
                >
                  Join Our Team
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ 
                    mb: 4, 
                    color: theme.palette.text.secondary, 
                    fontSize: '1.1rem', 
                    lineHeight: 1.7 
                  }}
                >
                  We're always looking for talented individuals to join our team. Check out our current openings and become part of our journey.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  component={Link}
                  href="/careers"
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
                  }}
                >
                  View Careers
                </Button>
              </Box>
              <Box
                sx={{
                  flex: { xs: '1 1 100%', md: '0 0 40%' },
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Box
                  component={motion.div}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 400,
                    height: 300,
                    borderRadius: 4,
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    background: 'linear-gradient(135deg, #111111 0%, #333333 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 4,
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      textAlign: 'center',
                      zIndex: 2,
                    }}
                  >
                    Build The Future With Us
                  </Typography>
                  
                  {/* Animated particles */}
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
                    {[...Array(20)].map((_, i) => (
                      <Box
                        key={i}
                        component={motion.div}
                        initial={{ 
                          x: Math.random() * 100, 
                          y: Math.random() * 100,
                          opacity: Math.random() * 0.3 + 0.1
                        }}
                        animate={{ 
                          x: [
                            Math.random() * 400, 
                            Math.random() * 400,
                            Math.random() * 400
                          ],
                          y: [
                            Math.random() * 300, 
                            Math.random() * 300,
                            Math.random() * 300
                          ],
                        }}
                        transition={{ 
                          duration: Math.random() * 15 + 15, 
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        sx={{
                          position: 'absolute',
                          width: Math.random() * 3 + 1,
                          height: Math.random() * 3 + 1,
                          borderRadius: '50%',
                          backgroundColor: i % 3 === 0 ? theme.palette.primary.main : i % 3 === 1 ? theme.palette.secondary?.main || '#14bb87' : '#ffaf06',
                          boxShadow: i % 3 === 0 ? `0 0 5px ${theme.palette.primary.main}` : i % 3 === 1 ? `0 0 5px ${theme.palette.secondary?.main || '#14bb87'}` : '0 0 5px #ffaf06',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>
    </Layout>
  );
}
