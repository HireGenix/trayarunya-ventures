'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Button, Grid, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InsightsIcon from '@mui/icons-material/Insights';
import ProductDashboardPreview from '@/components/Home/ProductDashboardPreview';
import { products } from '@/components/Home/ProductsData';

export default function MarketIQPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Find the MarketIQ product data
  const product = products.find(p => p.id === 'marketiq')!;
  
  // Additional features and benefits specific to this page
  const features = [
    'Real-time market trend analysis and forecasting',
    'Competitive intelligence and benchmarking',
    'Customer sentiment analysis across digital channels',
    'Predictive analytics for market opportunities',
    'Industry-specific insights and recommendations',
    'Customizable dashboards and visualization tools',
    'Automated reporting and insights generation',
    'Integration with CRM and business intelligence platforms',
  ];
  
  const benefits = [
    {
      title: 'Identify Market Opportunities',
      description: 'Discover emerging trends and untapped market segments before your competitors do.',
    },
    {
      title: 'Optimize Pricing Strategies',
      description: 'Set optimal pricing based on real-time market dynamics, competitor analysis, and customer willingness to pay.',
    },
    {
      title: 'Enhance Customer Understanding',
      description: 'Gain deep insights into customer needs, pain points, and behaviors to inform product development and marketing strategies.',
    },
    {
      title: 'Make Data-Driven Decisions',
      description: 'Replace guesswork with actionable intelligence, enabling confident strategic decision-making across your organization.',
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
                  label="MARKETIQ"
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
                  Intelligent Market Analysis Platform
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
                  Gain actionable insights from market data with our AI-powered analytics platform. MarketIQ helps businesses understand market trends, customer behavior, and competitive landscapes to make informed decisions.
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
                Market Intelligence Dashboard
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
                Visualize market trends, track competitive intelligence, and discover growth opportunities with our intuitive analytics dashboard.
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
                MarketIQ provides a comprehensive suite of market intelligence tools to help you stay ahead of the competition.
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
                Discover how MarketIQ can transform your business strategy and drive growth through data-driven insights.
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
                <InsightsIcon sx={{ fontSize: 40 }} />
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
                Ready to Unlock Market Insights?
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
                Join leading companies that are leveraging MarketIQ to gain a competitive edge. Schedule a demo today to see how our platform can transform your business strategy.
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
