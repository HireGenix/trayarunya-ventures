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
  Stack,
  Paper,
  Grid,
  Divider
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import CampaignIcon from '@mui/icons-material/Campaign';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import VerifiedIcon from '@mui/icons-material/Verified';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Enhanced stats data
const stats = [
  {
    value: 'Up to 3X',
    label: 'Typical ROI Boost',
    icon: <TrendingUpIcon />,
    color: '#FF6B6B',
    description: 'Our tailored strategies often help clients achieve up to a 3X return on their marketing spend.'
  },
  {
    value: 'Thousands',
    label: 'Quality Leads Delivered',
    icon: <PeopleIcon />,
    color: '#4ECDC4',
    description: 'We focus on generating genuinely interested leads that convert, numbering in the thousands for our partners.'
  },
  {
    value: 'High',
    label: 'Client Retention',
    icon: <RocketLaunchIcon />,
    color: '#FFD166',
    description: 'We build lasting relationships, reflected in our high client retention rate year after year.'
  }
];

// Digital marketing services
const services = [
  {
    title: 'SEO',
    icon: <SearchIcon />,
    color: '#4CAF50'
  },
  {
    title: 'PPC',
    icon: <CampaignIcon />,
    color: '#2196F3'
  },
  {
    title: 'Social',
    icon: <PeopleIcon />,
    color: '#FF9800'
  },
  {
    title: 'Analytics',
    icon: <AnalyticsIcon />,
    color: '#9C27B0'
  }
];

interface HeroSectionProps {
  onContactClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onContactClick }) => {
  const theme = useTheme();
  const primaryColor = '#8E44AD';

  // Enhanced animation variants
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
  
  const floatingVariants = {
    animate: {
      y: [0, -15, 0],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const rotateVariants = {
    animate: {
      rotate: [0, 360],
      transition: {
        duration: 30,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        background: `linear-gradient(135deg, ${alpha(primaryColor, 0.1)} 0%, ${alpha(primaryColor, 0.05)} 100%)`,
        pt: { xs: 12, md: 16 },
        pb: { xs: 8, md: 12 },
        overflow: 'hidden',
      }}
    >
      {/* Enhanced background pattern */}
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
      
      {/* Enhanced animated gradient orbs */}
      <motion.div
        animate={{ 
          x: [0, 30, 0],
          y: [0, 15, 0],
          opacity: [0.4, 0.6, 0.4]
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
          y: [0, 25, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 12,
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,107,0.4) 0%, rgba(255,255,255,0) 70%)',
          filter: 'blur(80px)',
          zIndex: 0,
        }}
      />
      
      {/* Enhanced floating shapes */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0 }}>
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.7 }}
            animate={{ 
              y: [0, -15, 0],
              rotate: [0, i % 2 === 0 ? 10 : -10, 0],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 3 + i,
              ease: "easeInOut",
              delay: i * 0.5
            }}
            style={{
              position: 'absolute',
              width: 40 + i * 10,
              height: 40 + i * 10,
              borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '30%' : '0%',
              background: i % 4 === 0 ? alpha(primaryColor, 0.1) : 
                         i % 4 === 1 ? alpha('#FF6B6B', 0.1) : 
                         i % 4 === 2 ? alpha('#4ECDC4', 0.1) : alpha('#FFD166', 0.1),
              border: `2px solid ${i % 4 === 0 ? alpha(primaryColor, 0.2) : 
                                    i % 4 === 1 ? alpha('#FF6B6B', 0.2) : 
                                    i % 4 === 2 ? alpha('#4ECDC4', 0.2) : alpha('#FFD166', 0.2)}`,
              top: `${5 + (i * 12)}%`,
              left: `${5 + (i * 12)}%`,
              transform: `rotate(${i * 45}deg)`,
              zIndex: 0,
            }}
          />
        ))}
      </Box>

      {/* Rotating circle decoration */}
      <motion.div
        variants={rotateVariants}
        animate="animate"
        style={{
          position: 'absolute',
          top: '15%',
          right: '15%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          border: `2px dashed ${alpha(primaryColor, 0.2)}`,
          zIndex: 0,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Enhanced accent label */}
          <motion.div variants={itemVariants}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Chip
                label="YOUR PARTNER IN DIGITAL GROWTH"
                sx={{
                  py: 2.5,
                  px: 2,
                  borderRadius: '50px',
                  background: `linear-gradient(90deg, ${primaryColor}, #6C3483)`,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  '& .MuiChip-label': {
                    px: 1.5
                  }
                }}
              />
            </Box>
          </motion.div>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 6, alignItems: 'center' }}>
            <Box sx={{ width: { xs: '100%', md: '50%' } }}>
              <motion.div variants={itemVariants}>
                <Typography
                  component="h1"
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.75rem', md: '3.8rem' }, // Slightly adjusted for better fit with new text
                    fontWeight: 800,
                    mb: 2,
                    textAlign: { xs: 'center', md: 'left' },
                    background: `linear-gradient(90deg, ${primaryColor} 0%, #333333 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Real Digital Marketing That Drives Real Results
                </Typography>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Typography
                  variant="h5"
                  color="textSecondary"
                  sx={{ 
                    mb: 4, 
                    lineHeight: 1.7, // Increased for readability
                    textAlign: { xs: 'center', md: 'left' },
                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                  }}
                >
                  Tired of empty promises? We craft genuine digital marketing strategies that connect you with your audience, build trust, and deliver measurable growth. Let's make your brand shine online, authentically.
                </Typography>
              </motion.div>

              {/* Service badges */}
              <motion.div variants={itemVariants}>
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: 1.5, 
                  mb: 4,
                  justifyContent: { xs: 'center', md: 'flex-start' }
                }}>
                  {services.map((service, index) => (
                    <Chip
                      key={index}
                      icon={React.cloneElement(service.icon, { style: { color: service.color } })}
                      label={service.title}
                      sx={{
                        py: 2,
                        px: 1,
                        backgroundColor: alpha(service.color, 0.1),
                        color: service.color,
                        fontWeight: 600,
                        border: `1px solid ${alpha(service.color, 0.3)}`,
                        '& .MuiChip-icon': {
                          color: service.color
                        }
                      }}
                    />
                  ))}
                </Box>
              </motion.div>

              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                mb: 6,
                justifyContent: { xs: 'center', md: 'flex-start' }
              }}>
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={onContactClick}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      backgroundColor: primaryColor,
                      py: 1.8,
                      px: 4,
                      borderRadius: '50px',
                      fontWeight: 600,
                      fontSize: '1rem',
                      '&:hover': {
                        backgroundColor: alpha(primaryColor, 0.9),
                        transform: 'translateY(-3px)',
                        boxShadow: `0 8px 20px ${alpha(primaryColor, 0.4)}`,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Start Your Growth Journey
                  </Button>
                </motion.div>
                
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    href="/solutions/digital-marketing#case-studies"
                    sx={{
                      borderColor: primaryColor,
                      color: primaryColor,
                      py: 1.8,
                      px: 4,
                      borderRadius: '50px',
                      fontWeight: 600,
                      fontSize: '1rem',
                      borderWidth: 2,
                      '&:hover': {
                        borderColor: primaryColor,
                        backgroundColor: alpha(primaryColor, 0.05),
                        transform: 'translateY(-3px)',
                        boxShadow: `0 8px 20px ${alpha(primaryColor, 0.1)}`,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    See Our Success Stories
                  </Button>
                </motion.div>
              </Box>
              
              {/* Enhanced Stats Cards */}
              <motion.div variants={itemVariants}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {stats.map((stat, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{ 
                        p: 2.5,
                        borderRadius: 3,
                        backgroundColor: alpha(stat.color, 0.08),
                        border: `1px solid ${alpha(stat.color, 0.2)}`,
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: `0 10px 20px ${alpha(stat.color, 0.2)}`,
                          backgroundColor: alpha(stat.color, 0.12),
                        },
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        minWidth: { xs: '100%', sm: '30%' }
                      }}>
                        <Box 
                          sx={{ 
                            color: 'white',
                            backgroundColor: stat.color,
                            borderRadius: '50%',
                            width: 40,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 1.5,
                            boxShadow: `0 4px 8px ${alpha(stat.color, 0.4)}`,
                          }}
                        >
                          {stat.icon}
                        </Box>
                        <Box>
                          <Typography 
                            variant="h4" 
                            component="div" 
                            sx={{ 
                              fontWeight: 700, 
                              color: stat.color,
                              fontSize: { xs: '1.75rem', sm: '2rem' },
                              lineHeight: 1.2
                            }}
                          >
                            {stat.value}
                          </Typography>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              color: 'text.primary',
                              fontWeight: 600,
                            }}
                          >
                            {stat.label}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.9rem',
                          flex: 1
                        }}
                      >
                        {stat.description}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </motion.div>
            </Box>
            
            <Box sx={{ width: { xs: '100%', md: '50%' }, position: 'relative' }}>
              {/* Decorative elements */}
              <Box
                component={motion.div}
                variants={floatingVariants}
                animate="animate"
                sx={{
                  position: 'absolute',
                  top: -30,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                  background: `linear-gradient(135deg, ${alpha('#FF6B6B', 0.2)} 0%, ${alpha('#FFD166', 0.2)} 100%)`,
                  border: `2px solid ${alpha('#FF6B6B', 0.3)}`,
                  zIndex: 2,
                }}
              />
              
              <Box
                component={motion.div}
                variants={floatingVariants}
                animate="animate"
                sx={{
                  position: 'absolute',
                  bottom: -20,
                  left: -10,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${alpha('#4ECDC4', 0.2)} 0%, ${alpha(primaryColor, 0.2)} 100%)`,
                  border: `2px solid ${alpha('#4ECDC4', 0.3)}`,
                  zIndex: 2,
                }}
              />
              
              {/* Enhanced main image with frame */}
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
                    height: { xs: 350, md: 450 },
                    width: '100%',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: `0 20px 40px ${alpha(primaryColor, 0.25)}`,
                    border: `1px solid ${alpha(primaryColor, 0.1)}`,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: 8,
                      padding: '2px',
                      background: `linear-gradient(135deg, ${primaryColor}, #FF6B6B)`,
                      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                      zIndex: 3,
                      pointerEvents: 'none'
                    }
                  }}
                >
                  {/* Enhanced gradient overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${alpha(primaryColor, 0.3)} 0%, rgba(0,0,0,0) 50%, ${alpha('#FF6B6B', 0.3)} 100%)`,
                      zIndex: 1,
                    }}
                  />
                  
                  {/* Interactive Digital Marketing Dashboard */}
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, 
                        ${alpha('#0F1419', 0.95)} 0%, 
                        ${alpha('#1A2332', 0.9)} 30%, 
                        ${alpha('#2C3E50', 0.85)} 70%, 
                        ${alpha(primaryColor, 0.9)} 100%)`,
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Dashboard Header */}
                    <Box
                      sx={{
                        p: 2,
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                        Digital Marketing Dashboard
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF6B6B' }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FFD166' }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4CAF50' }} />
                      </Box>
                    </Box>

                    {/* Main Dashboard Content */}
                    <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Top Metrics Row */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                        {[
                          { label: 'Traffic', value: '142K', change: '+25%', color: '#4CAF50' },
                          { label: 'Conversions', value: '3.2K', change: '+18%', color: '#2196F3' },
                          { label: 'Revenue', value: '$89K', change: '+31%', color: '#FF9800' },
                        ].map((metric, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + idx * 0.2, duration: 0.6 }}
                          >
                            <Paper
                              sx={{
                                p: 1.5,
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                border: `1px solid ${alpha(metric.color, 0.3)}`,
                                borderRadius: 2,
                                textAlign: 'center',
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                {metric.label}
                              </Typography>
                              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                                {metric.value}
                              </Typography>
                              <Typography variant="caption" sx={{ color: metric.color, fontWeight: 600 }}>
                                {metric.change}
                              </Typography>
                            </Paper>
                          </motion.div>
                        ))}
                      </Box>

                      {/* Animated Chart Area */}
                      <Box
                        sx={{
                          flex: 1,
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          borderRadius: 2,
                          p: 1.5,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1, display: 'block' }}>
                          Campaign Performance
                        </Typography>
                        
                        {/* Animated Chart Lines */}
                        <Box sx={{ position: 'relative', height: '120px', mt: 1 }}>
                          {/* Grid Lines */}
                          {[...Array(4)].map((_, i) => (
                            <Box
                              key={i}
                              sx={{
                                position: 'absolute',
                                top: `${i * 25}%`,
                                left: 0,
                                right: 0,
                                height: '1px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                              }}
                            />
                          ))}
                          
                          {/* Animated Performance Line */}
                          <Box
                            component={motion.div}
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 3, delay: 1 }}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                            }}
                          >
                            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                              <motion.path
                                d="M 0 80 Q 30 60 60 40 T 120 30 T 180 20 T 240 10"
                                stroke="#4CAF50"
                                strokeWidth="3"
                                fill="none"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 3, delay: 1 }}
                                style={{
                                  filter: 'drop-shadow(0 0 6px #4CAF50)',
                                }}
                              />
                              <motion.path
                                d="M 0 70 Q 30 65 60 50 T 120 45 T 180 35 T 240 25"
                                stroke="#2196F3"
                                strokeWidth="2"
                                fill="none"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 3, delay: 1.5 }}
                                style={{
                                  filter: 'drop-shadow(0 0 4px #2196F3)',
                                }}
                              />
                            </svg>
                          </Box>
                          
                          {/* Animated Data Points */}
                          {[
                            { x: '15%', y: '60%', color: '#4CAF50', delay: 2 },
                            { x: '35%', y: '40%', color: '#4CAF50', delay: 2.2 },
                            { x: '55%', y: '25%', color: '#4CAF50', delay: 2.4 },
                            { x: '75%', y: '15%', color: '#4CAF50', delay: 2.6 },
                          ].map((point, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: point.delay, duration: 0.5 }}
                              style={{
                                position: 'absolute',
                                left: point.x,
                                top: point.y,
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: point.color,
                                boxShadow: `0 0 10px ${point.color}`,
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>

                      {/* Bottom Analytics Cards */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 3, duration: 0.6 }}
                        >
                          <Paper
                            sx={{
                              p: 1.5,
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 2,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <SearchIcon sx={{ color: '#4CAF50', fontSize: '1rem', mr: 0.5 }} />
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                SEO Ranking
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                              #3 → #1
                            </Typography>
                          </Paper>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 3.2, duration: 0.6 }}
                        >
                          <Paper
                            sx={{
                              p: 1.5,
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 2,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <CampaignIcon sx={{ color: '#FF9800', fontSize: '1rem', mr: 0.5 }} />
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                Ad Spend ROI
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                              4.2x Return
                            </Typography>
                          </Paper>
                        </motion.div>
                      </Box>
                    </Box>

                    {/* Floating Notification */}
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 4, duration: 0.8 }}
                      style={{
                        position: 'absolute',
                        bottom: '20px',
                        right: '20px',
                        zIndex: 10,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1.5,
                          backgroundColor: 'rgba(76, 175, 80, 0.9)',
                          borderRadius: 2,
                          boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                          border: '1px solid rgba(76, 175, 80, 0.5)',
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleIcon sx={{ color: '#fff', fontSize: '1rem', mr: 1 }} />
                          <Box>
                            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, display: 'block' }}>
                              Campaign Optimized
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              CTR increased by 23%
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </motion.div>

                    {/* Pulsing Activity Indicator */}
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.7, 1, 0.7],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#4CAF50',
                        boxShadow: '0 0 10px #4CAF50',
                      }}
                    />
                  </Box>
                  
                  {/* Enhanced bottom caption */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                      p: 3,
                      zIndex: 2,
                    }}
                  >
                    <Typography variant="h6" color="#ffffff" fontWeight={700}>
                      Smart Strategies, Clear Results, Happy Clients
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)" sx={{ mt: 0.5 }}>
                      We're committed to transparent, effective marketing that truly benefits your business.
                    </Typography>
                  </Box>
                  
                  {/* Enhanced floating badges */}
                  <Box
                    component={motion.div}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1, duration: 0.8 }}
                    sx={{
                      position: 'absolute',
                      top: 20,
                      left: 20,
                      zIndex: 3,
                    }}
                  >
                    <Chip
                      icon={<SearchIcon fontSize="small" />}
                      label="SEO Experts"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        color: primaryColor,
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        '& .MuiChip-icon': {
                          color: primaryColor
                        }
                      }}
                    />
                  </Box>
                  
                  <Box
                    component={motion.div}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3, duration: 0.8 }}
                    sx={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      zIndex: 3,
                    }}
                  >
                    <Chip
                      icon={<CampaignIcon fontSize="small" />}
                      label="PPC Specialists"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        color: '#FF6B6B',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        '& .MuiChip-icon': {
                          color: '#FF6B6B'
                        }
                      }}
                    />
                  </Box>
                  
                  <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6, duration: 0.8 }}
                    sx={{
                      position: 'absolute',
                      bottom: 80,
                      right: 20,
                      zIndex: 3,
                    }}
                  >
                    <Chip
                      icon={<PeopleIcon fontSize="small" />}
                      label="Social Media Pros"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        color: '#4ECDC4',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        '& .MuiChip-icon': {
                          color: '#4ECDC4'
                        }
                      }}
                    />
                  </Box>
                  
                  <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.9, duration: 0.8 }}
                    sx={{
                      position: 'absolute',
                      bottom: 80,
                      left: 20,
                      zIndex: 3,
                    }}
                  >
                    <Chip
                      icon={<AnalyticsIcon fontSize="small" />}
                      label="Analytics Experts"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        color: '#9C27B0',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        '& .MuiChip-icon': {
                          color: '#9C27B0'
                        }
                      }}
                    />
                  </Box>
                </Box>
              </motion.div>
              
              {/* Trust indicators */}
              <Box
                component={motion.div}
                variants={itemVariants}
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VerifiedIcon sx={{ color: primaryColor, mr: 1 }} />
                  <Typography variant="body2" fontWeight={600}>Proven Expertise</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ height: 20 }} />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SpeedIcon sx={{ color: '#FF6B6B', mr: 1 }} />
                  <Typography variant="body2" fontWeight={600}>Efficient Campaigns</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ height: 20 }} />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#4CAF50', mr: 1 }} />
                  <Typography variant="body2" fontWeight={600}>Focus on Your ROI</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default HeroSection;
