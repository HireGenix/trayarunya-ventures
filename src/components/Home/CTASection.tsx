'use client';

import React, { useState } from 'react';
import { Box, Container, Typography, Button, Paper, Chip, useTheme, useMediaQuery, Badge, alpha, TextField, InputAdornment } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

const CTASection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [email, setEmail] = useState('');

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

  const itemVariant = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Email submitted:', email);
    setEmail('');
  };

  return (
    <Box
      sx={{
        py: { xs: 10, md: 14 },
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000000',
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
          opacity: 0.1,
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          zIndex: 0,
        }}
      />

      {/* Animated gradient orbs */}
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.15 }}
        transition={{ duration: 1.5 }}
        sx={{
          position: 'absolute',
          top: '30%',
          right: '10%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255, 175, 6, 0.5) 0%, rgba(0, 0, 0, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'pulse 10s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.15 },
            '50%': { transform: 'scale(1.1)', opacity: 0.2 },
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
          bottom: '20%',
          left: '10%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(20, 187, 135, 0.5) 0%, rgba(0, 0, 0, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'pulse2 12s ease-in-out infinite',
          '@keyframes pulse2': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.15 },
            '50%': { transform: 'scale(1.15)', opacity: 0.25 },
          },
        }}
      />

      {/* Colored Bar at Bottom */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          background: 'linear-gradient(90deg, #ffaf06, #14bb87, #d92c4a)',
          zIndex: 1,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          component={motion.div}
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          sx={{
            textAlign: 'center',
            maxWidth: 800,
            mx: 'auto',
          }}
        >
          {/* Floating elements */}
          <Box
            component={motion.div}
            animate={{ 
              y: ['-5px', '5px', '-5px'],
              rotate: ['-2deg', '2deg', '-2deg']
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 5,
              ease: "easeInOut"
            }}
            sx={{
              position: 'absolute',
              top: { xs: '-50px', md: '-80px' },
              right: { xs: '10%', md: '5%' },
              zIndex: 2,
              display: { xs: 'none', sm: 'block' }
            }}
          >
            <Box
              sx={{
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              }}
            >
              <RocketLaunchIcon 
                sx={{ 
                  fontSize: { xs: 30, md: 40 }, 
                  color: '#ffaf06',
                  filter: 'drop-shadow(0 0 10px rgba(255, 175, 6, 0.5))'
                }} 
              />
            </Box>
          </Box>
          
          <Box
            component={motion.div}
            animate={{ 
              y: ['5px', '-5px', '5px'],
              rotate: ['2deg', '-2deg', '2deg']
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 6,
              ease: "easeInOut"
            }}
            sx={{
              position: 'absolute',
              bottom: { xs: '-30px', md: '-50px' },
              left: { xs: '10%', md: '15%' },
              zIndex: 2,
              display: { xs: 'none', sm: 'block' }
            }}
          >
            <Box
              sx={{
                width: { xs: 50, md: 70 },
                height: { xs: 50, md: 70 },
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              }}
            >
              <LightbulbIcon 
                sx={{ 
                  fontSize: { xs: 25, md: 35 }, 
                  color: '#14bb87',
                  filter: 'drop-shadow(0 0 10px rgba(20, 187, 135, 0.5))'
                }} 
              />
            </Box>
          </Box>
          <Chip
            label="GET STARTED"
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
          
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontWeight: 800,
              mb: 3,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              background: `linear-gradient(90deg, #FFFFFF 0%, #CCCCCC 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            Ready to Transform Your Business?
          </Typography>
          <Typography
            variant="h5"
            component="p"
            sx={{ mb: 6, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}
          >
            Get in touch with our team to discover how our AI-powered solutions can help your organization work smarter and achieve more.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 3,
              justifyContent: 'center',
              mb: 8,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              size="large"
              component={Link}
              href="/contact"
              endIcon={<ArrowForwardIcon />}
              sx={{
                py: 1.5,
                px: 4,
                fontWeight: 600,
                fontSize: '1rem',
                borderRadius: '50px',
                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.3)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Contact Us
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              href="/products"
              sx={{
                py: 1.5,
                px: 4,
                fontWeight: 600,
                fontSize: '1rem',
                borderColor: '#ffffff',
                color: '#ffffff',
                borderRadius: '50px',
                '&:hover': {
                  borderColor: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-3px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Explore Products
            </Button>
          </Box>

          {/* Business Benefits */}
          <Box
            component={motion.div}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
              justifyContent: 'center',
              mb: 8,
            }}
          >
            {[
              {
                title: 'Increased Efficiency',
                description: 'Our AI solutions automate repetitive tasks, allowing your team to focus on high-value activities',
                icon: <AutoAwesomeIcon sx={{ fontSize: 30, color: '#ffaf06' }} />,
                color: '#ffaf06',
              },
              {
                title: 'Data-Driven Insights',
                description: 'Transform raw data into actionable intelligence to make better business decisions',
                icon: <LightbulbIcon sx={{ fontSize: 30, color: '#14bb87' }} />,
                color: '#14bb87',
              },
              {
                title: 'Seamless Integration',
                description: 'Our products integrate with your existing systems for a smooth implementation process',
                icon: <RocketLaunchIcon sx={{ fontSize: 30, color: '#d92c4a' }} />,
                color: '#d92c4a',
              },
            ].map((item, index) => (
              <Paper
                key={index}
                elevation={0}
                component={motion.div}
                variants={itemVariant}
                whileHover={{ 
                  y: -8,
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)',
                  background: 'rgba(255, 255, 255, 0.07)',
                }}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  width: { xs: '100%', sm: 'calc(33.33% - 16px)' },
                  minWidth: { xs: '100%', sm: 250 },
                  maxWidth: { xs: '100%', sm: 350 },
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                {/* Glowing border effect */}
                <Box
                  component={motion.div}
                  animate={{ 
                    boxShadow: [
                      `0 0 10px rgba(${item.color === '#ffaf06' ? '255,175,6' : item.color === '#14bb87' ? '20,187,135' : '217,44,74'},0.3)`, 
                      `0 0 20px rgba(${item.color === '#ffaf06' ? '255,175,6' : item.color === '#14bb87' ? '20,187,135' : '217,44,74'},0.2)`, 
                      `0 0 10px rgba(${item.color === '#ffaf06' ? '255,175,6' : item.color === '#14bb87' ? '20,187,135' : '217,44,74'},0.3)`
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 4,
                    pointerEvents: 'none',
                    border: `1px solid rgba(${item.color === '#ffaf06' ? '255,175,6' : item.color === '#14bb87' ? '20,187,135' : '217,44,74'},0.2)`,
                  }}
                />
                
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    backgroundColor: `rgba(${item.color === '#ffaf06' ? '255,175,6' : item.color === '#14bb87' ? '20,187,135' : '217,44,74'},0.15)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    position: 'relative',
                    zIndex: 1,
                    boxShadow: `0 8px 16px rgba(${item.color === '#ffaf06' ? '255,175,6' : item.color === '#14bb87' ? '20,187,135' : '217,44,74'},0.2)`,
                    border: `2px solid rgba(${item.color === '#ffaf06' ? '255,175,6' : item.color === '#14bb87' ? '20,187,135' : '217,44,74'},0.3)`,
                  }}
                >
                  {item.icon}
                </Box>
                
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 1.5, 
                    color: 'white',
                    fontWeight: 600,
                  }}
                >
                  {item.title}
                </Typography>
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.6,
                  }}
                >
                  {item.description}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              justifyContent: 'center',
            }}
          >
            <Paper
              elevation={0}
              component={motion.div}
              whileHover={{ 
                y: -5,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                transition: { duration: 0.3 }
              }}
              sx={{
                p: 3,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Glowing border effect */}
              <Box
                component={motion.div}
                animate={{ 
                  boxShadow: [
                    '0 0 10px rgba(255,175,6,0.3)', 
                    '0 0 20px rgba(255,175,6,0.2)', 
                    '0 0 10px rgba(255,175,6,0.3)'
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 4,
                  pointerEvents: 'none',
                  border: '1px solid rgba(255,175,6,0.2)',
                }}
              />
              
              {/* Subtle gradient accent in corner */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 100,
                  height: 100,
                  borderRadius: '0 0 0 100%',
                  background: 'linear-gradient(135deg, rgba(255,175,6,0.1) 0%, rgba(30, 30, 30, 0) 70%)',
                  opacity: 0.5,
                  zIndex: 0,
                }}
              />
              
              <Box
                component={motion.div}
                whileHover={{ 
                  rotate: 10,
                  scale: 1.1,
                  transition: { duration: 0.3 }
                }}
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 175, 6, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: '0 8px 16px rgba(255, 175, 6, 0.2)',
                  border: '2px solid rgba(255, 175, 6, 0.3)',
                }}
              >
                <EmailIcon sx={{ color: '#ffaf06', fontSize: 28 }} />
              </Box>
              
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.85rem',
                    mb: 0.5
                  }}
                >
                  Email Us
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'white', 
                    fontWeight: 600,
                    textShadow: '0 0 10px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  info@trayarunyaventures.com
                </Typography>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              component={motion.div}
              whileHover={{ 
                y: -5,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                transition: { duration: 0.3 }
              }}
              sx={{
                p: 3,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Glowing border effect */}
              <Box
                component={motion.div}
                animate={{ 
                  boxShadow: [
                    '0 0 10px rgba(20,187,135,0.3)', 
                    '0 0 20px rgba(20,187,135,0.2)', 
                    '0 0 10px rgba(20,187,135,0.3)'
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 4,
                  pointerEvents: 'none',
                  border: '1px solid rgba(20,187,135,0.2)',
                }}
              />
              
              {/* Subtle gradient accent in corner */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 100,
                  height: 100,
                  borderRadius: '0 0 0 100%',
                  background: 'linear-gradient(135deg, rgba(20,187,135,0.1) 0%, rgba(30, 30, 30, 0) 70%)',
                  opacity: 0.5,
                  zIndex: 0,
                }}
              />
              
              <Box
                component={motion.div}
                whileHover={{ 
                  rotate: 10,
                  scale: 1.1,
                  transition: { duration: 0.3 }
                }}
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(20, 187, 135, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: '0 8px 16px rgba(20, 187, 135, 0.2)',
                  border: '2px solid rgba(20, 187, 135, 0.3)',
                }}
              >
                <PhoneIcon sx={{ color: '#14bb87', fontSize: 28 }} />
              </Box>
              
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.85rem',
                    mb: 0.5
                  }}
                >
                  Call Us
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'white', 
                    fontWeight: 600,
                    textShadow: '0 0 10px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  +1 (971) 512-1701
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CTASection;
