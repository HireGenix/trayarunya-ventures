'use client';

import React, { useState } from 'react';
import { Box, Container, Typography, Button, Paper, Chip, useTheme, useMediaQuery, Badge, alpha } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import StartupIcon from '@mui/icons-material/Rocket';
import HealthcareIcon from '@mui/icons-material/HealthAndSafety';
import CustomIcon from '@mui/icons-material/SettingsSuggest';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import LanguageIcon from '@mui/icons-material/Language';
import CampaignIcon from '@mui/icons-material/Campaign';

const solutions = [
  {
    id: 'enterprise',
    name: 'Enterprise Solutions',
    description: 'Tailored AI solutions for large organizations looking to optimize operations and drive innovation.',
    icon: <BusinessIcon sx={{ fontSize: 40 }} />,
    color: '#ffaf06',
    link: '/solutions/enterprise',
    benefits: ['Streamlined Operations', 'Data-Driven Insights', 'Enhanced Productivity', 'Competitive Edge'],
  },
  {
    id: 'startups',
    name: 'Startups',
    description: 'Affordable and scalable solutions to help startups grow and compete in the digital marketplace.',
    icon: <StartupIcon sx={{ fontSize: 40 }} />,
    color: '#14bb87',
    link: '/solutions/startups',
    benefits: ['Cost-Effective', 'Rapid Deployment', 'Scalable Architecture', 'Growth Support'],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Specialized solutions for healthcare providers to improve patient care and operational efficiency.',
    icon: <HealthcareIcon sx={{ fontSize: 40 }} />,
    color: '#d92c4a',
    link: '/solutions/healthcare',
    benefits: ['Improved Patient Care', 'Regulatory Compliance', 'Workflow Optimization', 'Cost Reduction'],
  },
  {
    id: 'overseas-business',
    name: 'Overseas Business Registration',
    description: 'Comprehensive services to help you establish and register your business in international markets.',
    icon: <LanguageIcon sx={{ fontSize: 40 }} />,
    color: '#0A66C2',
    link: '/solutions/overseas-business',
    benefits: ['Global Market Access', 'Legal Compliance', 'Tax Optimization', 'Local Expertise'],
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    description: 'Strategic digital marketing services to boost your online presence and drive customer engagement.',
    icon: <CampaignIcon sx={{ fontSize: 40 }} />,
    color: '#8E44AD',
    link: '/solutions/digital-marketing',
    benefits: ['Brand Awareness', 'Lead Generation', 'Conversion Optimization', 'Analytics & Reporting'],
  },
  {
    id: 'custom',
    name: 'Custom Development',
    description: 'Bespoke software development services to address your unique business challenges.',
    icon: <CustomIcon sx={{ fontSize: 40 }} />,
    color: '#000000',
    link: '/solutions/custom',
    benefits: ['Tailored Solutions', 'Dedicated Support', 'Flexible Integration', 'Future-Proof Design'],
  },
];

const SolutionsSection = () => {
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
        backgroundColor: '#f9f9f9',
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
          backgroundImage: 'radial-gradient(circle, #000000 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          zIndex: 0,
        }}
      />

      {/* Animated gradient orb */}
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.05 }}
        transition={{ duration: 1.5 }}
        sx={{
          position: 'absolute',
          top: '50%',
          right: '10%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(0, 0, 0, 0.5) 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'pulse 10s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.05 },
            '50%': { transform: 'scale(1.1)', opacity: 0.08 },
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 10 }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Chip
              label="OUR SOLUTIONS"
              sx={{
                mb: 3,
                py: 1.5,
                px: 2,
                borderRadius: '50px',
                background: `linear-gradient(90deg, #000000, #333333)`,
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
              Tailored for Your Business
            </Typography>
            <Typography
              variant="h5"
              component="p"
              sx={{ mb: 2, maxWidth: 700, mx: 'auto', fontWeight: 400, color: 'text.secondary' }}
            >
              Customized approaches to meet the unique needs of different industries and organizations
            </Typography>
          </motion.div>
        </Box>

        <Box
          component={motion.div}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(2, 1fr)',
            },
            gap: 4,
          }}
        >
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.id}
              variants={fadeIn}
              custom={index}
            >
              <Paper
                elevation={0}
                component={motion.div}
                whileHover={{ 
                  y: -10,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                  transition: { duration: 0.3 }
                }}
                sx={{
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                }}
              >
                {/* Colored accent border */}
                <Box
                  component={motion.div}
                  animate={{ 
                    boxShadow: [
                      `0 0 20px ${solution.color}40`,
                      `0 0 30px ${solution.color}20`,
                      `0 0 20px ${solution.color}40`
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 6,
                    background: solution.color,
                    borderRadius: '4px 0 0 4px',
                  }}
                />
                
                {/* Subtle gradient accent in corner */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 150,
                    height: 150,
                    borderRadius: '0 0 0 100%',
                    background: `linear-gradient(135deg, ${solution.color}10 0%, rgba(255,255,255,0) 70%)`,
                    opacity: 0.8,
                    zIndex: 0,
                  }}
                />
                
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 3,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Box
                    component={motion.div}
                    whileHover={{ 
                      rotate: 10,
                      scale: 1.1,
                      transition: { duration: 0.3 }
                    }}
                    sx={{
                      width: 70,
                      height: 70,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${solution.color}15`,
                      color: solution.color,
                      mr: 2,
                      boxShadow: `0 10px 20px ${solution.color}20`,
                      border: `2px solid ${solution.color}30`,
                    }}
                  >
                    {solution.icon}
                  </Box>
                  <Box>
                    <Badge
                      badgeContent={
                        <Box
                          component={motion.div}
                          animate={{ rotate: [0, 10, 0] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          sx={{ display: 'flex' }}
                        >
                          <AutoAwesomeIcon fontSize="small" sx={{ color: solution.color }} />
                        </Box>
                      }
                      sx={{
                        '& .MuiBadge-badge': {
                          right: -15,
                          top: 5,
                          border: `2px solid ${theme.palette.background.paper}`,
                          padding: '0 4px',
                        }
                      }}
                    >
                      <Typography 
                        variant="h4" 
                        component="h3" 
                        fontWeight={700}
                        sx={{
                          background: `linear-gradient(90deg, ${solution.color} 0%, #333333 100%)`,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          fontSize: { xs: '1.5rem', md: '1.75rem' },
                        }}
                      >
                        {solution.name}
                      </Typography>
                    </Badge>
                  </Box>
                </Box>

                <Typography 
                  variant="body1" 
                  sx={{ 
                    mb: 3, 
                    color: 'text.secondary',
                    position: 'relative',
                    zIndex: 1,
                    fontSize: '1rem',
                    lineHeight: 1.6,
                  }}
                >
                  {solution.description}
                </Typography>

                <Box sx={{ mb: 4, flexGrow: 1, position: 'relative', zIndex: 1 }}>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight={600} 
                    sx={{ 
                      mb: 2,
                      color: '#333333',
                      display: 'flex',
                      alignItems: 'center',
                      '&::before': {
                        content: '""',
                        display: 'inline-block',
                        width: 4,
                        height: 16,
                        backgroundColor: solution.color,
                        marginRight: 1,
                        borderRadius: 4,
                      }
                    }}
                  >
                    Key Benefits
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {solution.benefits.map((benefit, idx) => (
                      <Chip
                        key={idx}
                        label={benefit}
                        size="small"
                        sx={{
                          backgroundColor: `${solution.color}10`,
                          color: solution.color === '#000000' ? '#333333' : solution.color,
                          fontWeight: 500,
                          mb: 1,
                          borderRadius: '50px',
                          border: `1px solid ${solution.color}30`,
                          '&:hover': {
                            backgroundColor: `${solution.color}20`,
                          },
                          transition: 'all 0.3s ease',
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  component={Link}
                  href={solution.link}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    alignSelf: 'flex-start',
                    backgroundColor: solution.color,
                    color: solution.color === '#000000' ? '#ffffff' : '#ffffff',
                    '&:hover': {
                      backgroundColor: solution.color,
                      transform: 'translateY(-3px)',
                      boxShadow: `0 10px 20px ${solution.color}40`,
                    },
                    transition: 'all 0.3s ease',
                    borderRadius: '50px',
                    py: 1,
                    px: 2,
                    fontWeight: 600,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  Learn More
                </Button>
              </Paper>
            </motion.div>
          ))}
        </Box>

        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              variant="contained"
              color="primary"
              size="large"
              component={Link}
              href="/solutions"
              endIcon={<ArrowForwardIcon />}
              sx={{
                py: 1.5,
                px: 4,
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
              Explore All Solutions
            </Button>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default SolutionsSection;
