'use client';

import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  useTheme, 
  alpha,
  Chip,
  Stack
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PublicIcon from '@mui/icons-material/Public';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import LanguageIcon from '@mui/icons-material/Language';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const HeroSection = () => {
  const theme = useTheme();
  const primaryColor = '#0A66C2';
  const secondaryColor = '#FF5722';

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const imageVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 1, ease: "easeOut" }
    }
  };

  const floatingIconVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        background: `linear-gradient(135deg, ${alpha(primaryColor, 0.08)} 0%, ${alpha(secondaryColor, 0.05)} 100%)`,
        pt: { xs: 12, md: 16 },
        pb: { xs: 8, md: 12 },
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
      <motion.div
        animate={{ 
          x: [0, 30, 0],
          y: [0, 15, 0],
          opacity: [0.5, 0.7, 0.5]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 10,
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          top: '30%',
          right: '5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
        }}
      />
      
      <motion.div
        animate={{ 
          x: [0, -20, 0],
          y: [0, 20, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 15,
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${secondaryColor} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
        }}
      />

      {/* Floating icons */}
      <motion.div
        variants={floatingIconVariants}
        animate="animate"
        style={{
          position: 'absolute',
          top: '15%',
          right: '15%',
          zIndex: 0,
          opacity: 0.1,
          fontSize: '4rem',
        }}
      >
        <PublicIcon sx={{ fontSize: 'inherit', color: primaryColor }} />
      </motion.div>
      
      <motion.div
        variants={floatingIconVariants}
        animate="animate"
        transition={{ delay: 1 }}
        style={{
          position: 'absolute',
          top: '40%',
          left: '10%',
          zIndex: 0,
          opacity: 0.1,
          fontSize: '3rem',
        }}
      >
        <BusinessCenterIcon sx={{ fontSize: 'inherit', color: secondaryColor }} />
      </motion.div>
      
      <motion.div
        variants={floatingIconVariants}
        animate="animate"
        transition={{ delay: 2 }}
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '25%',
          zIndex: 0,
          opacity: 0.1,
          fontSize: '3.5rem',
        }}
      >
        <LanguageIcon sx={{ fontSize: 'inherit', color: primaryColor }} />
      </motion.div>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'center' }}>
            <Box sx={{ width: { xs: '100%', md: '50%' } }}>
              <motion.div variants={itemVariants}>
                <Chip 
                  label="GLOBAL EXPANSION" 
                  size="medium"
                  icon={<PublicIcon />}
                  sx={{ 
                    mb: 2, 
                    fontWeight: 600, 
                    backgroundColor: alpha(secondaryColor, 0.1),
                    color: secondaryColor,
                    '& .MuiChip-icon': { color: secondaryColor }
                  }} 
                />
                <Typography
                  component="h1"
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.75rem' },
                    fontWeight: 800,
                    mb: 2,
                    background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2,
                  }}
                >
                  Overseas Business Registration
                </Typography>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Typography
                  variant="h5"
                  color="textSecondary"
                  sx={{ mb: 4, lineHeight: 1.6, fontSize: { xs: '1.1rem', md: '1.25rem' } }}
                >
                  Expand your business globally with our comprehensive international business registration services. We handle the complexities so you can focus on growth.
                </Typography>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                  {[
                    { text: "50+ Countries", icon: <PublicIcon /> },
                    { text: "Expert Guidance", icon: <BusinessCenterIcon /> },
                    { text: "Compliance Assured", icon: <CheckCircleIcon /> }
                  ].map((item, index) => (
                    <Box 
                      key={index}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        backgroundColor: alpha(primaryColor, 0.05),
                        borderRadius: 2,
                        px: 2,
                        py: 1
                      }}
                    >
                      <Box sx={{ color: primaryColor }}>{item.icon}</Box>
                      <Typography variant="subtitle2" fontWeight={600}>{item.text}</Typography>
                    </Box>
                  ))}
                </Stack>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    href="/contact"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      background: `linear-gradient(90deg, ${primaryColor} 0%, ${alpha(secondaryColor, 0.8)} 100%)`,
                      py: 1.5,
                      px: 3,
                      borderRadius: '50px',
                      fontWeight: 700,
                      '&:hover': {
                        background: `linear-gradient(90deg, ${primaryColor} 20%, ${alpha(secondaryColor, 0.8)} 100%)`,
                        transform: 'translateY(-3px)',
                        boxShadow: `0 8px 20px ${alpha(primaryColor, 0.4)}`,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Get Started
                  </Button>
                  
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    href="/solutions"
                    sx={{
                      borderColor: primaryColor,
                      color: primaryColor,
                      py: 1.5,
                      px: 3,
                      borderRadius: '50px',
                      fontWeight: 600,
                      borderWidth: 2,
                      '&:hover': {
                        borderColor: primaryColor,
                        backgroundColor: alpha(primaryColor, 0.05),
                        transform: 'translateY(-3px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Learn More
                  </Button>
                </Box>
              </motion.div>
            </Box>
            <Box sx={{ width: { xs: '100%', md: '50%' } }}>
              <motion.div
                variants={imageVariants}
                whileHover={{ 
                  scale: 1.03,
                  transition: { duration: 0.3 }
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: { xs: 300, md: 450 },
                    width: '100%',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: `0 20px 40px ${alpha(primaryColor, 0.2)}`,
                    border: `1px solid ${alpha(primaryColor, 0.1)}`,
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${alpha(primaryColor, 0.2)} 0%, ${alpha(secondaryColor, 0.1)} 100%)`,
                      zIndex: 1,
                    }}
                  />
                  <Box
                    component="img"
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                    alt="Global Business"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                      p: 4,
                      zIndex: 2,
                    }}
                  >
                    <Typography variant="h5" color="#ffffff" fontWeight={700} gutterBottom>
                      Global Business Expansion
                    </Typography>
                    <Typography variant="body1" color="rgba(255,255,255,0.9)" sx={{ mb: 2 }}>
                      Expand your business to over 50+ countries worldwide with our expert guidance
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {['USA', 'UK', 'Singapore', 'UAE', 'Canada', 'Australia'].map((country, idx) => (
                        <Chip 
                          key={idx} 
                          label={country} 
                          size="small" 
                          sx={{ 
                            backgroundColor: 'rgba(255,255,255,0.2)', 
                            color: 'white',
                            fontWeight: 500
                          }} 
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </motion.div>
            </Box>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default HeroSection;
