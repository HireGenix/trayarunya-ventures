'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Button, Grid, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';

export default function CustomDevelopmentPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const solutionColor = '#ffaf06'; // Custom development amber
  
  // Features and benefits specific to this solution
  const features = [
    'Tailored solutions built specifically for your business needs',
    'Collaborative development process with regular feedback',
    'Comprehensive documentation and knowledge transfer',
    'Ongoing support and maintenance options',
    'Agile development methodology for faster delivery',
    'Scalable architecture designed for future growth',
    'Integration with existing systems and workflows',
    'Rigorous testing and quality assurance',
  ];
  
  const benefits = [
    {
      title: 'Perfect Fit Solutions',
      description: 'Get software that precisely matches your unique business processes and requirements, without compromise.',
    },
    {
      title: 'Competitive Advantage',
      description: 'Gain an edge with proprietary solutions that differentiate your business from competitors using off-the-shelf products.',
    },
    {
      title: 'Ownership and Control',
      description: 'Maintain full ownership of your custom software, with the freedom to modify and enhance it as your business evolves.',
    },
    {
      title: 'Optimized ROI',
      description: 'Maximize return on investment with solutions that address your specific challenges and eliminate unnecessary features.',
    },
  ];

  const process = [
    {
      title: 'Discovery & Analysis',
      description: 'We work closely with your team to understand your business processes, challenges, and objectives.',
    },
    {
      title: 'Design & Planning',
      description: 'Our experts create detailed specifications and architectural designs tailored to your requirements.',
    },
    {
      title: 'Development & Testing',
      description: 'We build your solution using agile methodologies, with regular demos and feedback cycles to ensure alignment.',
    },
    {
      title: 'Deployment & Support',
      description: 'We handle implementation, training, and provide ongoing maintenance and support to ensure long-term success.',
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
                  label="CUSTOM DEVELOPMENT"
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
                  Bespoke Software Solutions
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
                  Bespoke software solutions designed and developed to address your unique business challenges and requirements.
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
                Custom Development Features
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
                Our custom development services are designed to deliver solutions that perfectly match your business requirements and objectives.
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
                Business Benefits
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
                Discover how custom development can provide unique advantages for your business that off-the-shelf solutions cannot match.
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

        {/* Development Process Section */}
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
                Our Development Process
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
                We follow a proven methodology to ensure your custom solution is delivered on time, within budget, and exceeds your expectations.
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
              {process.map((step, index) => (
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
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: alpha(solutionColor, 0.1),
                          color: solutionColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.2rem',
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Typography
                        variant="h5"
                        component="h3"
                        fontWeight={700}
                        sx={{ color: theme.palette.text.primary }}
                      >
                        {step.title}
                      </Typography>
                    </Box>
                    <Typography variant="body1" color="text.secondary">
                      {step.description}
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
                <BuildIcon sx={{ fontSize: 40 }} />
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
                Ready to Build Your Custom Solution?
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
                Our team of expert developers, designers, and project managers is ready to bring your vision to life. Contact us today to discuss your project requirements and explore how we can create a tailored solution for your business.
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
