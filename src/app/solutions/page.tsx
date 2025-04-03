'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Button, Grid, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import StartupIcon from '@mui/icons-material/Rocket';
import HealthcareIcon from '@mui/icons-material/HealthAndSafety';
import CustomIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const solutions = [
  {
    id: 'enterprise',
    title: 'Enterprise Solutions',
    icon: <BusinessIcon fontSize="large" />,
    description: 'Comprehensive AI-powered solutions designed for large organizations to streamline operations, enhance decision-making, and drive innovation.',
    benefits: [
      'Seamless integration with existing enterprise systems',
      'Scalable architecture to support growing business needs',
      'Advanced analytics and reporting capabilities',
      'Enterprise-grade security and compliance features',
    ],
    color: '#0A66C2',
    link: '/solutions/enterprise',
  },
  {
    id: 'startups',
    title: 'Startup Solutions',
    icon: <StartupIcon fontSize="large" />,
    description: 'Agile and cost-effective solutions tailored for startups and growing businesses to accelerate growth and maximize limited resources.',
    benefits: [
      'Flexible pricing models designed for growing businesses',
      'Quick implementation and rapid time-to-value',
      'Scalable infrastructure that grows with your business',
      'Dedicated support to help navigate challenges',
    ],
    color: '#14bb87',
    link: '/solutions/startups',
  },
  {
    id: 'healthcare',
    title: 'Healthcare Solutions',
    icon: <HealthcareIcon fontSize="large" />,
    description: 'Specialized AI solutions for healthcare providers to improve patient care, optimize operations, and ensure regulatory compliance.',
    benefits: [
      'HIPAA-compliant data handling and storage',
      'AI-powered diagnostic assistance and patient monitoring',
      'Streamlined administrative workflows',
      'Enhanced patient engagement tools',
    ],
    color: '#d92c4a',
    link: '/solutions/healthcare',
  },
  {
    id: 'custom',
    title: 'Custom Development',
    icon: <CustomIcon fontSize="large" />,
    description: 'Bespoke software solutions designed and developed to address your unique business challenges and requirements.',
    benefits: [
      'Tailored solutions built specifically for your business needs',
      'Collaborative development process with regular feedback',
      'Comprehensive documentation and knowledge transfer',
      'Ongoing support and maintenance options',
    ],
    color: '#ffaf06',
    link: '/solutions/custom',
  },
];

export default function SolutionsPage() {
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
                  label="SOLUTIONS"
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
                  Our Solutions
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
                  We offer a range of AI-powered solutions designed to address the unique challenges of different industries and business sizes.
                </Typography>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Solutions Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box
              component={motion.div}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {solutions.map((solution, index) => (
                <Box
                  key={solution.id}
                  component={motion.div}
                  variants={fadeIn}
                  sx={{ mb: 8 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 3, md: 5 },
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {/* Subtle gradient accent */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: { xs: 150, md: 300 },
                        height: { xs: 150, md: 300 },
                        borderRadius: '0 0 0 100%',
                        background: `linear-gradient(135deg, ${alpha(solution.color, 0.1)} 0%, rgba(255,255,255,0) 70%)`,
                        opacity: 0.8,
                        zIndex: 0,
                      }}
                    />
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, position: 'relative', zIndex: 1 }}>
                      <Box sx={{ flex: { xs: '0 0 100%', md: '0 0 calc(60% - 16px)' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                          <Box
                            sx={{
                              width: 60,
                              height: 60,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: alpha(solution.color, 0.1),
                              color: solution.color,
                            }}
                          >
                            {solution.icon}
                          </Box>
                          <Typography
                            variant="h3"
                            component="h2"
                            sx={{
                              fontWeight: 700,
                              color: theme.palette.text.primary,
                            }}
                          >
                            {solution.title}
                          </Typography>
                        </Box>
                        
                        <Typography
                          variant="body1"
                          sx={{ 
                            mb: 4, 
                            color: theme.palette.text.secondary, 
                            fontSize: '1.1rem', 
                            lineHeight: 1.7 
                          }}
                        >
                          {solution.description}
                        </Typography>
                        
                        <Button
                          variant="contained"
                          component={Link}
                          href={solution.link}
                          endIcon={<ArrowForwardIcon />}
                          sx={{
                            py: 1.5,
                            px: 3,
                            fontWeight: 600,
                            fontSize: '1rem',
                            borderRadius: '50px',
                            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
                            backgroundColor: solution.color,
                            '&:hover': {
                              backgroundColor: alpha(solution.color, 0.9),
                              transform: 'translateY(-3px)',
                              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)',
                            },
                            transition: 'all 0.3s ease',
                          }}
                        >
                          Learn More
                        </Button>
                      </Box>
                      
                      <Box sx={{ flex: { xs: '0 0 100%', md: '0 0 calc(40% - 16px)' } }}>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          gutterBottom
                          sx={{ color: theme.palette.text.primary }}
                        >
                          Key Benefits
                        </Typography>
                        
                        <Box component="ul" sx={{ pl: 0, listStyle: 'none' }}>
                          {solution.benefits.map((benefit, i) => (
                            <Box
                              key={i}
                              component="li"
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                mb: 2,
                                gap: 1.5,
                              }}
                            >
                              <CheckCircleIcon sx={{ color: solution.color, mt: 0.3 }} />
                              <Typography variant="body1" color="text.secondary">
                                {benefit}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        {/* CTA Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
          <Container maxWidth="lg">
            <Box
              sx={{
                p: { xs: 4, md: 8 },
                borderRadius: 4,
                backgroundColor: 'white',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: theme.palette.text.primary,
                }}
              >
                Not Sure Which Solution Is Right for You?
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
                Our team of experts is ready to help you find the perfect solution for your business needs. Contact us for a free consultation.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                component={Link}
                href="/contact"
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
                Contact Us
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>
    </Layout>
  );
}
