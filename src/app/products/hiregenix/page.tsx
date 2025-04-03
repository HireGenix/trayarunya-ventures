'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Button, Grid, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import ProductDashboardPreview from '@/components/Home/ProductDashboardPreview';
import { products } from '@/components/Home/ProductsData';

export default function HireGenixPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Find the HireGenix product data
  const product = products.find(p => p.id === 'hiregenix')!;
  
  // Additional features and benefits specific to this page
  const features = [
    'AI-powered candidate matching with 95% accuracy',
    'Automated resume screening and ranking',
    'Video interview platform with sentiment analysis',
    'Customizable assessment tools for technical and soft skills',
    'Collaborative hiring workflows for team decision making',
    'Advanced analytics dashboard for hiring insights',
    'Integration with popular ATS and HRIS systems',
    'Mobile app for on-the-go recruitment management',
  ];
  
  const benefits = [
    {
      title: 'Reduce Time-to-Hire',
      description: 'Cut your hiring time by up to 50% with automated screening and intelligent candidate matching.',
    },
    {
      title: 'Improve Quality of Hire',
      description: 'Find candidates who are not just qualified but are the perfect fit for your company culture and values.',
    },
    {
      title: 'Eliminate Bias',
      description: 'Our AI algorithms are designed to focus on skills and qualifications, helping to reduce unconscious bias in the hiring process.',
    },
    {
      title: 'Enhance Candidate Experience',
      description: 'Provide a seamless, responsive recruitment process that leaves a positive impression on all applicants.',
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
            background: `linear-gradient(135deg, ${alpha(product.color, 0.1)} 0%, ${alpha('#ffffff', 0.05)} 100%)`,
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
              background: `radial-gradient(circle, ${product.color} 0%, rgba(255, 255, 255, 0) 70%)`,
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
                  label="HIREGENIX"
                  sx={{
                    mb: 3,
                    py: 1.5,
                    px: 2,
                    borderRadius: '50px',
                    background: `linear-gradient(90deg, ${product.color}, ${alpha(product.color, 0.7)})`,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    boxShadow: `0 4px 20px ${alpha(product.color, 0.3)}`,
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
                  AI-Powered Recruitment Platform
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
                  Streamline your hiring process with our AI-powered recruitment platform. HireGenix helps you find the right candidates faster, reduce bias in hiring, and improve candidate experience.
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
                      boxShadow: `0 10px 20px ${alpha(product.color, 0.3)}`,
                      backgroundColor: product.color,
                      '&:hover': {
                        backgroundColor: alpha(product.color, 0.9),
                        transform: 'translateY(-3px)',
                        boxShadow: `0 15px 30px ${alpha(product.color, 0.4)}`,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Request a Demo
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
                      borderColor: product.color,
                      color: product.color,
                      '&:hover': {
                        borderColor: product.color,
                        backgroundColor: alpha(product.color, 0.05),
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

        {/* Dashboard Preview Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box sx={{ mb: 8 }}>
              <Typography
                variant="h2"
                component="h2"
                align="center"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: theme.palette.text.primary,
                }}
              >
                Powerful Recruitment Dashboard
              </Typography>
              <Typography
                variant="body1"
                align="center"
                sx={{ 
                  mb: 6, 
                  maxWidth: 800, 
                  mx: 'auto', 
                  color: theme.palette.text.secondary, 
                  fontSize: '1.1rem', 
                  lineHeight: 1.7 
                }}
              >
                Get real-time insights into your recruitment process with our intuitive dashboard. Track key metrics, manage candidates, and make data-driven decisions.
              </Typography>
              
              <ProductDashboardPreview product={product} />
            </Box>
          </Container>
        </Box>

        {/* Features Section */}
        <Box id="features" sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(product.color, 0.05) }}>
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
                Key Features
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
                HireGenix offers a comprehensive suite of tools designed to transform your recruitment process from start to finish.
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
                      <CheckCircleIcon sx={{ color: product.color, mt: 0.3 }} />
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
                Benefits
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
                Discover how HireGenix can transform your recruitment process and deliver tangible results for your organization.
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
                      sx={{ color: product.color }}
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

        {/* CTA Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(product.color, 0.05) }}>
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
                  backgroundColor: alpha(product.color, 0.1),
                  color: product.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <BusinessCenterIcon sx={{ fontSize: 40 }} />
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
                Ready to Transform Your Hiring Process?
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
                Join hundreds of companies that have revolutionized their recruitment with HireGenix. Schedule a demo today to see how our platform can work for your organization.
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
                  boxShadow: `0 10px 20px ${alpha(product.color, 0.3)}`,
                  backgroundColor: product.color,
                  '&:hover': {
                    backgroundColor: alpha(product.color, 0.9),
                    transform: 'translateY(-3px)',
                    boxShadow: `0 15px 30px ${alpha(product.color, 0.4)}`,
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Request a Demo
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>
    </Layout>
  );
}
