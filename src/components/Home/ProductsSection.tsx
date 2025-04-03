'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Chip, 
  Grid, 
  useTheme, 
  useMediaQuery, 
  alpha, 
  Badge
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { products } from './ProductsData';
import ProductDetailsPanel from './ProductDetailsPanel';
import ProductDashboardPreview from './ProductDashboardPreview';

const ProductsSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [activeProduct, setActiveProduct] = useState(0);

  const handleProductChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveProduct(newValue);
  };

  const currentProduct = products[activeProduct];

  return (
    <Box
      sx={{
        py: { xs: 10, md: 16 },
        backgroundColor: '#f8faff',
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
          backgroundImage: 'radial-gradient(circle, #14bb87 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          zIndex: 0,
        }}
      />

      {/* Animated gradient orbs */}
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.07 }}
        transition={{ duration: 1.5 }}
        sx={{
          position: 'absolute',
          top: '20%',
          right: '5%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.palette.primary.light} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'pulse 10s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.07 },
            '50%': { transform: 'scale(1.1)', opacity: 0.1 },
          },
        }}
      />

      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.05 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        sx={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: { xs: 100, md: 250 },
          height: { xs: 100, md: 250 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.palette.secondary.light} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'pulse2 12s ease-in-out infinite',
          '@keyframes pulse2': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.05 },
            '50%': { transform: 'scale(1.15)', opacity: 0.08 },
          },
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 10 } }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              badgeContent={
                <Box
                  component={motion.div}
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  sx={{ display: 'flex' }}
                >
                  <AutoAwesomeIcon fontSize="small" sx={{ color: theme.palette.warning.main }} />
                </Box>
              }
              sx={{
                '& .MuiBadge-badge': {
                  right: -10,
                  top: 5,
                  border: `2px solid ${theme.palette.background.paper}`,
                  padding: '0 4px',
                }
              }}
            >
              <Chip
                label="OUR PRODUCTS"
                color="secondary"
                size="medium"
                sx={{
                  mb: 2,
                  fontWeight: 700,
                  background: alpha(theme.palette.secondary.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                  color: theme.palette.secondary.main,
                  px: 2,
                  py: 2.5,
                  '& .MuiChip-label': {
                    px: 1,
                  }
                }}
              />
            </Badge>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontWeight: 800,
                mb: 2,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2
              }}
            >
              AI-Powered Solutions
            </Typography>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.9 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Typography
              variant="h5"
              component="p"
              color="text.secondary"
              sx={{
                maxWidth: '800px',
                mx: 'auto',
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                fontWeight: 400,
                mb: 6,
                lineHeight: 1.6
              }}
            >
              Innovative solutions designed to transform how businesses operate
            </Typography>
          </motion.div>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 6, alignItems: 'center' }}>
          <Box sx={{ width: { xs: '100%', md: '40%', lg: '33.33%' } }}>
            <ProductDetailsPanel 
              products={products} 
              activeProduct={activeProduct} 
              onProductChange={handleProductChange} 
            />
          </Box>
          
          <Box sx={{ width: { xs: '100%', md: '60%', lg: '66.67%' } }}>
            <ProductDashboardPreview product={currentProduct} />
          </Box>
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
              href="/products"
              endIcon={<ArrowForwardIcon />}
              sx={{
                py: 1.5,
                px: 4,
                fontWeight: 600,
                fontSize: '1rem',
                borderRadius: '50px',
                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.3)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              View All Products
            </Button>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default ProductsSection;
