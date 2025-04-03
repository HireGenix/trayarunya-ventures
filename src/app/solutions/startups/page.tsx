'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Button, Grid, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketIcon from '@mui/icons-material/Rocket';

export default function StartupSolutionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const solutionColor = '#14bb87'; // Startup green
  
  // Features and benefits specific to this solution
  const features = [
    'Flexible pricing models designed for growing businesses',
    'Quick implementation and rapid time-to-value',
    'Scalable infrastructure that grows with your business',
    'Dedicated support to help navigate challenges',
    'Modular architecture for selective implementation',
    'Low-code customization options',
    'Intuitive user interfaces requiring minimal training',
    'Regular updates with new features and improvements',
  ];
  
  const benefits = [
    {
      title: 'Accelerate Growth',
      description: 'Leverage AI-powered tools to identify opportunities, optimize processes, and scale your business faster.',
    },
    {
      title: 'Maximize Limited Resources',
      description: 'Do more with less by automating routine tasks and focusing your team on high-value strategic activities.',
    },
    {
      title: 'Compete with Larger Players',
      description: 'Level the playing field with enterprise-grade capabilities tailored to startup budgets and operational realities.',
    },
    {
      title: 'Adapt Quickly',
      description: 'Respond rapidly to market changes and customer feedback with agile, flexible solutions that evolve with your needs.',
    },
  ];

  const useCases = [
    {
      title: 'Customer Acquisition',
      description: 'Identify and target high-value prospects with AI-powered lead generation and conversion optimization tools.',
    },
    {
      title: 'Product Development',
      description: 'Accelerate innovation cycles with data-driven insights and automated testing frameworks.',
    },
    {
      title: 'Operational Efficiency',
      description: 'Streamline workflows and reduce overhead with intelligent automation and process optimization.',
    },
    {
      title: 'Market Intelligence',
      description: 'Stay ahead of trends and competition with real-time market analysis and predictive insights.',
    },
  ];

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
            background: `linear-gradient(135deg, ${alpha(solutionColor, 0.1)} 0%, ${alpha('#ffffff', 0.05)} 100%)`,
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
            animate={{ scale: 1, opacity: 0.1 }}
            transition={{ duration: 1.5 }}
            sx={{
              position: 'absolute',
              top: '20%',
              right: '10%',
              width: { xs: 150, md: 300 },
              height: { xs: 150, md: 300 },
              borderRadius: '50%',
              background: `radial-gradient(circle, ${solutionColor} 0%, rgba(255, 255, 255, 0) 70%)`,
              filter: 'blur(80px)',
              zIndex: 0,
              animation: 'heroPulse 10s ease-in-out infinite',
              '@keyframes heroPulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 0.1 },
                '50%': { transform: 'scale(1.1)', opacity: 0.15 },
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
                  label="STARTUP SOLUTIONS"
                  sx={{
                    mb: 3,
                    py: 1.5,
                    px: 2,
                    borderRadius: '50px',
                    background: `linear-gradient(90deg, ${solutionColor}, ${alpha(solutionColor, 0.7)})`,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    boxShadow: `0 4px 20px ${alpha(solutionColor, 0.3)}`,
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
                  AI Solutions for Growing Startups
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
                  Agile and cost-effective solutions tailored for startups and growing businesses to accelerate growth and maximize limited resources.
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
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
                      boxShadow: `0 10px 20px ${alpha(solutionColor, 0.3)}`,
                      backgroundColor: solutionColor,
                      '&:hover': {
                        backgroundColor: alpha(solutionColor, 0.9),
                        transform: 'translateY(-3px)',
                        boxShadow: `0 15px 30px ${alpha(solutionColor, 0.4)}`,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Request a Consultation
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    href="#features"
                    sx={{
                      py: 1.5,
                      px: 3,
                      fontWeight: 600,
                      fontSize: '1rem',
                      borderRadius: '50px',
                      borderColor: solutionColor,
                      color: solutionColor,
                      '&:hover': {
                        borderColor: solutionColor,
                        backgroundColor: alpha(solutionColor, 0.05),
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
          </Container>
        </Box>

        {/* Features Section */}
        <Box id="features" sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: theme.palette.text.primary,
                }}
              >
                Startup-Friendly Features
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
                Our solutions are designed with the unique needs of startups in mind, offering flexibility, scalability, and rapid implementation.
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
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 4,
              }}
            >
              {features.map((feature, index) => (
                <Box
                  key={index}
                  component={motion.div}
                  variants={fadeIn}
                  sx={{ height: '100%' }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <CheckCircleIcon sx={{ color: solutionColor, mt: 0.3 }} />
                      <Typography variant="body1" color="text.secondary">
                        {feature}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        {/* Benefits Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(solutionColor, 0.05) }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: theme.palette.text.primary,
                }}
              >
                Growth Benefits
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
                Discover how our startup solutions can help you scale faster and compete more effectively in your market.
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
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 4,
              }}
            >
              {benefits.map((benefit, index) => (
                <Box
                  key={index}
                  component={motion.div}
                  variants={fadeIn}
                  sx={{ height: '100%' }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <Typography
                      variant="h5"
                      component="h3"
                      fontWeight={700}
                      gutterBottom
                      sx={{ color: solutionColor }}
                    >
                      {benefit.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {benefit.description}
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        {/* Use Cases Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: theme.palette.text.primary,
                }}
              >
                Startup Use Cases
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
                Our solutions address key challenges faced by startups across various stages of growth and industry sectors.
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
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 4,
              }}
            >
              {useCases.map((useCase, index) => (
                <Box
                  key={index}
                  component={motion.div}
                  variants={fadeIn}
                  sx={{ height: '100%' }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <Typography
                      variant="h5"
                      component="h3"
                      fontWeight={700}
                      gutterBottom
                      sx={{ color: theme.palette.text.primary }}
                    >
                      {useCase.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {useCase.description}
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        {/* CTA Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(solutionColor, 0.05) }}>
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
              <Box
                component={motion.div}
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: alpha(solutionColor, 0.1),
                  color: solutionColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <RocketIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: theme.palette.text.primary,
                }}
              >
                Ready to Accelerate Your Startup?
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
                Our team understands the unique challenges startups face. Let us help you implement AI-powered solutions that drive growth without breaking the bank. Contact us today for a free consultation.
              </Typography>
              <Button
                variant="contained"
                size="large"
                component={Link}
                href="/contact"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  py: 1.5,
                  px: 4,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  borderRadius: '50px',
                  boxShadow: `0 10px 20px ${alpha(solutionColor, 0.3)}`,
                  backgroundColor: solutionColor,
                  '&:hover': {
                    backgroundColor: alpha(solutionColor, 0.9),
                    transform: 'translateY(-3px)',
                    boxShadow: `0 15px 30px ${alpha(solutionColor, 0.4)}`,
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
