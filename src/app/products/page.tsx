'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Button, Grid, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ProductDashboardPreview from '@/components/Home/ProductDashboardPreview';
import { products } from '@/components/Home/ProductsData';

export default function ProductsPage() {
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
                  label="OUR PRODUCTS"
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
                  AI-Powered SaaS Products
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
                  Discover our suite of innovative AI-powered products designed to transform your business operations, enhance decision-making, and drive growth.
                </Typography>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Products Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box
              component={motion.div}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {products.map((product, index) => (
                <Box
                  key={product.id}
                  component={motion.div}
                  variants={fadeIn}
                  sx={{ mb: 10 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: index % 2 === 0 ? 'row' : 'row-reverse' } }}>
                      {/* Product Dashboard Preview */}
                      <Box 
                        sx={{ 
                          flex: '0 0 50%',
                          position: 'relative',
                          p: { xs: 2, md: 4 },
                          backgroundColor: alpha(product.color, 0.05),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <Box sx={{ width: '100%', transform: 'scale(0.85)' }}>
                          <ProductDashboardPreview product={product} />
                        </Box>
                      </Box>
                      
                      {/* Product Content */}
                      <Box 
                        sx={{ 
                          flex: '0 0 50%',
                          p: { xs: 4, md: 6 },
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
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
                          {product.name}
                        </Typography>
                        
                        <Typography
                          variant="body1"
                          sx={{ 
                            mb: 4, 
                            color: theme.palette.text.secondary, 
                            fontSize: '1.1rem', 
                            lineHeight: 1.7 
                          }}
                        >
                          {product.description}
                        </Typography>
                        
                        <Box sx={{ mb: 4 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight={600}
                            sx={{ mb: 2 }}
                          >
                            Key Features:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {product.features.map((feature, idx) => (
                              <Chip
                                key={idx}
                                label={feature}
                                size="medium"
                                sx={{
                                  backgroundColor: alpha(product.color, 0.1),
                                  color: product.color,
                                  fontWeight: 500,
                                  mb: 1,
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                        
                        <Button
                          variant="contained"
                          component={Link}
                          href={product.link}
                          endIcon={<ArrowForwardIcon />}
                          sx={{
                            py: 1.5,
                            px: 3,
                            fontWeight: 600,
                            fontSize: '1rem',
                            borderRadius: '50px',
                            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
                            backgroundColor: product.color,
                            alignSelf: 'flex-start',
                            '&:hover': {
                              backgroundColor: alpha(product.color, 0.9),
                              transform: 'translateY(-3px)',
                              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)',
                            },
                            transition: 'all 0.3s ease',
                          }}
                        >
                          Learn More
                        </Button>
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
                Ready to Transform Your Business?
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
                Our team of experts is ready to help you find the perfect product for your business needs. Contact us for a free consultation and demo.
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
