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
  Divider,
  Grid,
  Rating,
  Avatar,
  IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import CampaignIcon from '@mui/icons-material/Campaign';
import SearchIcon from '@mui/icons-material/Search';
import LanguageIcon from '@mui/icons-material/Language';
import BarChartIcon from '@mui/icons-material/BarChart';
import BrushIcon from '@mui/icons-material/Brush';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SpeedIcon from '@mui/icons-material/Speed';
import PeopleIcon from '@mui/icons-material/People';
import Link from 'next/link';

// Service data
const services = [
  {
    title: 'Search Engine Optimization',
    description: 'Improve your website visibility in search engines with our comprehensive SEO strategies tailored to your business goals.',
    icon: <SearchIcon fontSize="large" />,
    color: '#4CAF50',
    benefits: [
      'Higher organic search rankings',
      'Increased website traffic',
      'Better user experience',
      'Improved conversion rates'
    ],
    results: '35% average increase in organic traffic within 3 months',
    rating: 4.9,
    clients: 124
  },
  {
    title: 'Social Media Marketing',
    description: 'Build a strong social media presence with targeted campaigns that engage your audience and drive conversions.',
    icon: <CampaignIcon fontSize="large" />,
    color: '#2196F3',
    benefits: [
      'Increased brand awareness',
      'Better audience engagement',
      'Higher conversion rates',
      'Improved customer loyalty'
    ],
    results: '320% average increase in social engagement and 45% increase in leads',
    rating: 4.8,
    clients: 98
  },
  {
    title: 'Content Marketing',
    description: 'Create compelling content that resonates with your audience and establishes your brand as an industry authority.',
    icon: <BrushIcon fontSize="large" />,
    color: '#FF9800',
    benefits: [
      'Establish thought leadership',
      'Build brand credibility',
      'Increase organic traffic',
      'Generate quality leads'
    ],
    results: '210% average increase in content engagement and 45% increase in lead quality',
    rating: 4.9,
    clients: 87
  },
  {
    title: 'Website Development',
    description: 'Get a custom-designed, responsive website that provides an exceptional user experience and drives conversions.',
    icon: <LanguageIcon fontSize="large" />,
    color: '#9C27B0',
    benefits: [
      'Professional brand image',
      'Improved user experience',
      'Higher conversion rates',
      'Mobile-friendly design'
    ],
    results: '85% average increase in conversion rates after website redesign',
    rating: 4.8,
    clients: 76
  },
  {
    title: 'Analytics & Reporting',
    description: 'Gain valuable insights into your digital marketing performance with comprehensive analytics and regular reporting.',
    icon: <BarChartIcon fontSize="large" />,
    color: '#F44336',
    benefits: [
      'Data-driven decision making',
      'Performance optimization',
      'ROI measurement',
      'Competitive insights'
    ],
    results: '42% average improvement in marketing ROI through data-driven optimization',
    rating: 4.7,
    clients: 65
  },
];

const ServicesSection = () => {
  const theme = useTheme();
  const primaryColor = '#8E44AD';
  const [activeService, setActiveService] = useState<number | null>(null);

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

  const headerVariants = {
    hidden: { y: -50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    hover: {
      y: -10,
      boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

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
        background: `linear-gradient(135deg, ${alpha(primaryColor, 0.05)} 0%, rgba(255,255,255,1) 100%)`,
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div variants={containerVariants}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div variants={headerVariants}>
              <Chip
                label="PREMIUM SERVICES"
                sx={{
                  mb: 3,
                  py: 1.5,
                  px: 2,
                  borderRadius: '50px',
                  background: `linear-gradient(90deg, ${primaryColor}, #6C3483)`,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
              />
            </motion.div>
            
            <motion.div variants={headerVariants}>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  background: `linear-gradient(90deg, ${primaryColor} 0%, #333333 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Digital Marketing Solutions
              </Typography>
            </motion.div>
            
            <motion.div variants={headerVariants}>
              <Typography
                variant="h6"
                color="textSecondary"
                sx={{ 
                  maxWidth: 800, 
                  mx: 'auto',
                  mb: 4,
                  fontSize: '1.1rem',
                  lineHeight: 1.6
                }}
              >
                Comprehensive digital marketing strategies tailored to your business goals.
                Our data-driven approach ensures measurable results and maximum ROI.
              </Typography>
            </motion.div>

            {/* Service highlights */}
            <Box 
              sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: 3,
                mb: 6
              }}
            >
              {[
                { icon: <SpeedIcon />, text: 'Data-Driven Approach', color: '#4CAF50' },
                { icon: <PeopleIcon />, text: 'Expert Team', color: '#2196F3' },
                { icon: <StarIcon />, text: 'Proven Results', color: '#FF9800' },
                { icon: <LocalOfferIcon />, text: 'Competitive Pricing', color: '#F44336' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  whileHover={{ scale: 1.05 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2.5,
                      py: 1.5,
                      borderRadius: 6,
                      backgroundColor: alpha(item.color, 0.1),
                      border: `1px solid ${alpha(item.color, 0.2)}`,
                    }}
                  >
                    <Box 
                      component={motion.div}
                      animate={{ 
                        rotate: [0, 10, 0, -10, 0],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 5,
                        ease: "easeInOut"
                      }}
                      sx={{ color: item.color }}
                    >
                      {item.icon}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {item.text}
                    </Typography>
                  </Paper>
                </motion.div>
              ))}
            </Box>
          </Box>

          {/* Service cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 4, mb: 8 }}>
            {services.map((service, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover="hover"
                custom={index}
              >
                <Paper
                  elevation={0}
                  onClick={() => setActiveService(activeService === index ? null : index)}
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    border: `1px solid ${alpha(service.color, activeService === index ? 0.3 : 0.1)}`,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: activeService === index ? alpha(service.color, 0.05) : 'white',
                    '&:hover': {
                      borderColor: alpha(service.color, 0.3),
                    }
                  }}
                >
                  {/* Colored accent */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 6,
                      height: '100%',
                      backgroundColor: service.color,
                    }}
                  />
                  
                  {/* Service badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      zIndex: 2,
                    }}
                  >
                    <Chip
                      size="small"
                      label={`${service.clients}+ Clients`}
                      sx={{
                        backgroundColor: alpha(service.color, 0.1),
                        color: service.color,
                        fontWeight: 600,
                        border: `1px solid ${alpha(service.color, 0.2)}`,
                      }}
                    />
                  </Box>
                  
                  {/* Header section */}
                  <Box sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, pl: 2 }}>
                      <Box
                        sx={{
                          mr: 2,
                          p: 2,
                          borderRadius: '16px',
                          backgroundColor: alpha(service.color, 0.1),
                          color: service.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: activeService === index ? `0 10px 20px ${alpha(service.color, 0.2)}` : 'none',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {service.icon}
                      </Box>
                      <Box>
                        <Typography 
                          variant="h5" 
                          component="h3" 
                          fontWeight={600} 
                          gutterBottom
                          sx={{ 
                            color: activeService === index ? service.color : 'inherit',
                            transition: 'color 0.3s ease'
                          }}
                        >
                          {service.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {service.description}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Rating */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pl: 2 }}>
                      <Rating 
                        value={service.rating} 
                        precision={0.1} 
                        readOnly 
                        size="small"
                        sx={{ color: service.color }}
                      />
                      <Typography variant="body2" sx={{ ml: 1, fontWeight: 600 }}>
                        {service.rating}
                      </Typography>
                    </Box>

                    {/* Results highlight */}
                    <Box 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        backgroundColor: alpha(service.color, 0.05),
                        border: `1px solid ${alpha(service.color, 0.1)}`,
                        mb: 2
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} sx={{ color: service.color }}>
                        <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                        {service.results}
                      </Typography>
                    </Box>
                    
                    <Button
                      variant="contained"
                      size="medium"
                      component={Link}
                      href="/contact"
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        mt: 2,
                        backgroundColor: service.color,
                        '&:hover': {
                          backgroundColor: alpha(service.color, 0.9),
                          transform: 'translateY(-3px)',
                          boxShadow: `0 8px 20px ${alpha(service.color, 0.3)}`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Get Started
                    </Button>
                  </Box>
                </Paper>
              </motion.div>
            ))}
          </Box>
          
          {/* CTA Section */}
          <motion.div
            variants={cardVariants}
            whileHover={{ 
              y: -5,
              transition: { duration: 0.3 }
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 5,
                borderRadius: 4,
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                border: `1px solid ${alpha(primaryColor, 0.1)}`,
                background: `linear-gradient(135deg, ${alpha(primaryColor, 0.05)} 0%, rgba(255,255,255,0.9) 100%)`,
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h3"
                component="h3"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: primaryColor,
                }}
              >
                Ready to Grow Your Business?
              </Typography>
              
              <Typography
                variant="h6"
                color="textSecondary"
                sx={{ 
                  maxWidth: 800,
                  mx: 'auto',
                  mb: 4,
                  fontSize: '1.1rem',
                  lineHeight: 1.6
                }}
              >
                Our team of digital marketing experts is ready to help you achieve your business goals.
                Get in touch today for a free consultation and personalized strategy.
              </Typography>
              
              <Button
                variant="contained"
                size="large"
                component={Link}
                href="/contact"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  backgroundColor: primaryColor,
                  py: 1.5,
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
                Schedule a Consultation
              </Button>
            </Paper>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ServicesSection;
