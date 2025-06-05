'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  useTheme, 
  alpha,
  Button,
  Chip,
  Grid,
  Stack,
  LinearProgress,
  Avatar,
  AvatarGroup
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CampaignIcon from '@mui/icons-material/Campaign';
import SearchIcon from '@mui/icons-material/Search';
import LanguageIcon from '@mui/icons-material/Language';
import BarChartIcon from '@mui/icons-material/BarChart';
import BrushIcon from '@mui/icons-material/Brush';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import GroupsIcon from '@mui/icons-material/Groups';
import LaunchIcon from '@mui/icons-material/Launch';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Link from 'next/link';

// Enhanced service data with new structure
const services = [
  {
    id: 'seo',
    title: 'Search Engine Optimization',
    shortTitle: 'SEO',
    description: 'Dominate search results with our proven SEO strategies. We help your business rank higher, attract quality traffic, and convert visitors into customers.',
    icon: <SearchIcon />,
    color: '#4CAF50',
    bgGradient: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    features: [
      'Keyword Research & Strategy',
      'On-Page Optimization',
      'Technical SEO Audits',
      'Link Building Campaigns',
      'Local SEO Enhancement',
      'Performance Tracking'
    ],
    metrics: {
      avgIncrease: '250%',
      timeframe: '6 months',
      successRate: '94%'
    },
    clientLogos: ['/api/placeholder/32/32', '/api/placeholder/32/32', '/api/placeholder/32/32'],
    isPopular: true
  },
  {
    id: 'social',
    title: 'Social Media Marketing',
    shortTitle: 'Social Media',
    description: 'Build authentic connections and grow your community across all major social platforms with engaging content and strategic campaigns.',
    icon: <CampaignIcon />,
    color: '#2196F3',
    bgGradient: 'linear-gradient(135deg, #2196F3 0%, #1976d2 100%)',
    features: [
      'Content Strategy & Creation',
      'Community Management',
      'Paid Social Advertising',
      'Influencer Partnerships',
      'Social Commerce Setup',
      'Analytics & Reporting'
    ],
    metrics: {
      avgIncrease: '180%',
      timeframe: '3 months',
      successRate: '91%'
    },
    clientLogos: ['/api/placeholder/32/32', '/api/placeholder/32/32', '/api/placeholder/32/32'],
    isPopular: false
  },
  {
    id: 'content',
    title: 'Content Marketing',
    shortTitle: 'Content',
    description: 'Transform your brand story into compelling content that educates, engages, and converts your target audience across all channels.',
    icon: <BrushIcon />,
    color: '#FF9800',
    bgGradient: 'linear-gradient(135deg, #FF9800 0%, #f57c00 100%)',
    features: [
      'Content Strategy Development',
      'Blog Writing & SEO',
      'Video Content Production',
      'Email Campaigns',
      'Whitepapers & eBooks',
      'Content Distribution'
    ],
    metrics: {
      avgIncrease: '320%',
      timeframe: '4 months',
      successRate: '96%'
    },
    clientLogos: ['/api/placeholder/32/32', '/api/placeholder/32/32', '/api/placeholder/32/32'],
    isPopular: true
  },
  {
    id: 'webdev',
    title: 'Website Design & Development',
    shortTitle: 'Web Development',
    description: 'Create stunning, high-converting websites that represent your brand perfectly and provide exceptional user experiences across all devices.',
    icon: <LanguageIcon />,
    color: '#9C27B0',
    bgGradient: 'linear-gradient(135deg, #9C27B0 0%, #7b1fa2 100%)',
    features: [
      'Custom Website Design',
      'Mobile-First Development',
      'E-commerce Integration',
      'CMS Implementation',
      'Performance Optimization',
      'Ongoing Maintenance'
    ],
    metrics: {
      avgIncrease: '200%',
      timeframe: '2 months',
      successRate: '98%'
    },
    clientLogos: ['/api/placeholder/32/32', '/api/placeholder/32/32', '/api/placeholder/32/32'],
    isPopular: false
  },
  {
    id: 'analytics',
    title: 'Data Analytics & Insights',
    shortTitle: 'Analytics',
    description: 'Make data-driven decisions with comprehensive analytics, reporting, and insights that reveal what\'s working and what needs improvement.',
    icon: <BarChartIcon />,
    color: '#F44336',
    bgGradient: 'linear-gradient(135deg, #F44336 0%, #d32f2f 100%)',
    features: [
      'Advanced Analytics Setup',
      'Custom Dashboard Creation',
      'Conversion Tracking',
      'A/B Testing Framework',
      'ROI Measurement',
      'Strategic Recommendations'
    ],
    metrics: {
      avgIncrease: '280%',
      timeframe: '1 month',
      successRate: '99%'
    },
    clientLogos: ['/api/placeholder/32/32', '/api/placeholder/32/32', '/api/placeholder/32/32'],
    isPopular: false
  },
  {
    id: 'ppc',
    title: 'Pay-Per-Click Advertising',
    shortTitle: 'PPC Ads',
    description: 'Maximize your advertising ROI with expertly managed PPC campaigns across Google, Facebook, LinkedIn, and other platforms.',
    icon: <AutoGraphIcon />,
    color: '#607D8B',
    bgGradient: 'linear-gradient(135deg, #607D8B 0%, #455a64 100%)',
    features: [
      'Campaign Strategy & Setup',
      'Keyword Research & Bidding',
      'Ad Creative Development',
      'Landing Page Optimization',
      'Conversion Tracking',
      'Performance Optimization'
    ],
    metrics: {
      avgIncrease: '340%',
      timeframe: '1 month',
      successRate: '93%'
    },
    clientLogos: ['/api/placeholder/32/32', '/api/placeholder/32/32', '/api/placeholder/32/32'],
    isPopular: true
  }
];

const ServicesSection = () => {
  const theme = useTheme();
  const primaryColor = '#8E44AD';
  const [activeService, setActiveService] = useState<string | null>('seo');
  const [hoveredService, setHoveredService] = useState<string | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const activeService_data = services.find(s => s.id === activeService) || services[0];

  return (
    <Box 
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      sx={{ 
        py: { xs: 8, md: 12 },
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${alpha('#1a1a2e', 0.95)} 0%, ${alpha('#16213e', 0.95)} 50%, ${alpha('#0f3460', 0.95)} 100%)`,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 20%, rgba(138, 68, 173, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(33, 150, 243, 0.1) 0%, transparent 50%)',
          zIndex: 0
        }
      }}
    >
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div variants={containerVariants}>
          {/* Header Section */}
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div variants={cardVariants}>
              <Chip
                label="OUR DIGITAL MARKETING TOOLKIT"
                icon={<StarIcon />}
                sx={{
                  mb: 3,
                  py: 1.5,
                  px: 3,
                  borderRadius: '50px',
                  background: `linear-gradient(90deg, ${primaryColor}, #6C3483)`,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '0 8px 32px rgba(142, 68, 173, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 800,
                  mb: 3,
                  background: `linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: { xs: '2.5rem', md: '3.5rem' }
                }}
              >
                Powerful Tools for Digital Growth
              </Typography>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Typography
                variant="h6"
                sx={{ 
                  maxWidth: 700, 
                  mx: 'auto',
                  mb: 6,
                  fontSize: '1.2rem',
                  lineHeight: 1.7,
                  color: 'rgba(255, 255, 255, 0.8)'
                }}
              >
                Choose from our comprehensive suite of digital marketing services, each designed to drive measurable results and accelerate your business growth.
              </Typography>
            </motion.div>

            {/* Stats Row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 4, mb: 6 }}>
              {[
                { label: 'Active Clients', value: '500+', icon: <GroupsIcon /> },
                { label: 'Avg ROI Increase', value: '280%', icon: <TrendingUpIcon /> },
                { label: 'Success Rate', value: '96%', icon: <SecurityIcon /> },
                { label: 'Avg Growth Time', value: '3 Months', icon: <SpeedIcon /> }
              ].map((stat, index) => (
                <motion.div key={index} variants={cardVariants}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 3,
                    }}
                  >
                    <Box sx={{ color: primaryColor, mb: 1 }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="h4" fontWeight={700} color="white" gutterBottom>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                      {stat.label}
                    </Typography>
                  </Paper>
                </motion.div>
              ))}
            </Box>
          </Box>

          {/* Main Services Section */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, gap: 4 }}>
            {/* Service Navigation */}
            <Box>
              <Box sx={{ position: 'sticky', top: 100 }}>
                <Typography variant="h5" fontWeight={600} color="white" gutterBottom sx={{ mb: 3 }}>
                  Select a Service
                </Typography>
                <Stack spacing={2}>
                  {services.map((service) => (
                    <motion.div
                      key={service.id}
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Paper
                        onClick={() => setActiveService(service.id)}
                        onMouseEnter={() => setHoveredService(service.id)}
                        onMouseLeave={() => setHoveredService(null)}
                        elevation={0}
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          background: activeService === service.id 
                            ? `linear-gradient(135deg, ${alpha(service.color, 0.2)} 0%, ${alpha(service.color, 0.1)} 100%)`
                            : 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(10px)',
                          border: activeService === service.id 
                            ? `2px solid ${service.color}`
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 3,
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': {
                            background: `linear-gradient(135deg, ${alpha(service.color, 0.15)} 0%, ${alpha(service.color, 0.05)} 100%)`,
                            borderColor: service.color,
                          }
                        }}
                      >
                        {service.isPopular && (
                          <Chip
                            label="Popular"
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: service.color,
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              background: alpha(service.color, 0.2),
                              color: service.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {service.icon}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={600} color="white" gutterBottom>
                              {service.shortTitle}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={parseInt(service.metrics.successRate)}
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: service.color,
                                }
                              }}
                            />
                            <Typography variant="caption" color="rgba(255, 255, 255, 0.7)" sx={{ mt: 0.5 }}>
                              {service.metrics.successRate} Success Rate
                            </Typography>
                          </Box>
                          <ArrowForwardIcon 
                            sx={{ 
                              color: activeService === service.id ? service.color : 'rgba(255, 255, 255, 0.5)',
                              transform: hoveredService === service.id ? 'translateX(5px)' : 'translateX(0)',
                              transition: 'all 0.3s ease'
                            }} 
                          />
                        </Box>
                      </Paper>
                    </motion.div>
                  ))}
                </Stack>
              </Box>
            </Box>

            {/* Service Details */}
            <Box>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeService}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 5,
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(activeService_data.color, 0.3)}`,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Background Pattern */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '200px',
                        height: '200px',
                        background: activeService_data.bgGradient,
                        borderRadius: '50%',
                        opacity: 0.1,
                        transform: 'translate(50%, -50%)',
                      }}
                    />

                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 3,
                              background: activeService_data.bgGradient,
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 8px 32px ${alpha(activeService_data.color, 0.3)}`
                            }}
                          >
                            {activeService_data.icon}
                          </Box>
                          <Box>
                            <Typography variant="h4" fontWeight={700} color="white" gutterBottom>
                              {activeService_data.title}
                            </Typography>
                            <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                              {activeService_data.clientLogos.map((logo, index) => (
                                <Avatar key={index} src={logo} sx={{ width: 24, height: 24 }} />
                              ))}
                            </AvatarGroup>
                          </Box>
                        </Box>
                        <Typography variant="body1" color="rgba(255, 255, 255, 0.8)" sx={{ lineHeight: 1.7, mb: 3 }}>
                          {activeService_data.description}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Metrics */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, mb: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" fontWeight={700} color={activeService_data.color}>
                          {activeService_data.metrics.avgIncrease}
                        </Typography>
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                          Avg. Growth
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" fontWeight={700} color={activeService_data.color}>
                          {activeService_data.metrics.timeframe}
                        </Typography>
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                          Timeframe
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" fontWeight={700} color={activeService_data.color}>
                          {activeService_data.metrics.successRate}
                        </Typography>
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                          Success Rate
                        </Typography>
                      </Box>
                    </Box>

                    {/* Features */}
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h6" fontWeight={600} color="white" gutterBottom sx={{ mb: 2 }}>
                        What's Included
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                        {activeService_data.features.map((feature, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <CheckCircleIcon sx={{ color: activeService_data.color, fontSize: 20 }} />
                            <Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
                              {feature}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        size="large"
                        component={Link}
                        href="/contact"
                        startIcon={<LaunchIcon />}
                        sx={{
                          background: activeService_data.bgGradient,
                          py: 1.5,
                          px: 4,
                          borderRadius: 3,
                          fontWeight: 600,
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: `0 8px 32px ${alpha(activeService_data.color, 0.4)}`,
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Get Started
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<PlayArrowIcon />}
                        sx={{
                          borderColor: activeService_data.color,
                          color: activeService_data.color,
                          py: 1.5,
                          px: 4,
                          borderRadius: 3,
                          fontWeight: 600,
                          '&:hover': {
                            backgroundColor: alpha(activeService_data.color, 0.1),
                            borderColor: activeService_data.color,
                          },
                        }}
                      >
                        View Case Study
                      </Button>
                    </Box>
                  </Paper>
                </motion.div>
              </AnimatePresence>
            </Box>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ServicesSection;
