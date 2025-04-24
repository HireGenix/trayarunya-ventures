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
    value: '250%',
    label: 'Average ROI',
    icon: <TrendingUpIcon />,
    color: '#FF6B6B',
    description: 'Our clients see an average return of 250% on their marketing investment'
  },
  {
    value: '10K+',
    label: 'Leads Generated',
    icon: <PeopleIcon />,
    color: '#4ECDC4',
    description: 'We have generated over 10,000 qualified leads for our clients in the past year'
  },
  {
    value: '98%',
    label: 'Client Satisfaction',
    icon: <RocketLaunchIcon />,
    color: '#FFD166',
    description: '98% of our clients continue working with us after their initial campaign'
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

const HeroSection = () => {
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
                label="PREMIUM DIGITAL MARKETING SERVICES"
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
                    fontSize: { xs: '2.75rem', md: '4rem' },
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
                  Elevate Your Digital Marketing Strategy
                </Typography>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Typography
                  variant="h5"
                  color="textSecondary"
                  sx={{ 
                    mb: 4, 
                    lineHeight: 1.6,
                    textAlign: { xs: 'center', md: 'left' },
                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                  }}
                >
                  Transform your online presence with our comprehensive digital marketing solutions. We help businesses grow their audience, increase conversions, and maximize ROI through data-driven strategies and innovative campaigns.
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
                    component={Link}
                    href="/contact"
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
                    Get Started
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
                    View Case Studies
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
                  
                  <Box
                    component="img"
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                    alt="Digital Marketing"
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
                      Data-driven strategies for measurable results
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)" sx={{ mt: 0.5 }}>
                      We focus on ROI and performance metrics that matter to your business
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
                  <Typography variant="body2" fontWeight={600}>Certified Experts</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ height: 20 }} />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SpeedIcon sx={{ color: '#FF6B6B', mr: 1 }} />
                  <Typography variant="body2" fontWeight={600}>Fast Results</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ height: 20 }} />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#4CAF50', mr: 1 }} />
                  <Typography variant="body2" fontWeight={600}>Guaranteed ROI</Typography>
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
