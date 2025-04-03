'use client';

import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Button, 
  alpha, 
  useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltIcon from '@mui/icons-material/Bolt';
import { Product } from './ProductsData';

interface ProductDetailsPanelProps {
  products: Product[];
  activeProduct: number;
  onProductChange: (event: React.SyntheticEvent, newValue: number) => void;
}

const ProductDetailsPanel: React.FC<ProductDetailsPanelProps> = ({ 
  products, 
  activeProduct, 
  onProductChange 
}) => {
  const theme = useTheme();
  const currentProduct = products[activeProduct];

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 4,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 20px 80px ${alpha(theme.palette.common.black, 0.07)}`
        }}
      >
        {/* Product tabs */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Our Products
          </Typography>
          {products.map((product, index) => (
            <Box 
              key={product.id}
              onClick={(e) => onProductChange(e as React.SyntheticEvent, index)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                mb: 1,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: activeProduct === index ? alpha(theme.palette.secondary.main, 0.05) : 'transparent',
                color: activeProduct === index ? theme.palette.secondary.main : 'inherit',
                borderLeft: activeProduct === index ? `4px solid ${theme.palette.secondary.main}` : '4px solid transparent',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                }
              }}
            >
              <Box sx={{ mr: 2, color: activeProduct === index ? theme.palette.secondary.main : 'inherit' }}>
                {product.icon}
              </Box>
              <Typography variant="subtitle1" fontWeight={activeProduct === index ? 600 : 500}>
                {product.name}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Product content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProduct}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h5" component="h3" fontWeight={700} gutterBottom>
              {currentProduct.name}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              {currentProduct.description}
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              {currentProduct.features.map((feature, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <BoltIcon sx={{ color: currentProduct.color, mr: 1.5, fontSize: 20 }} />
                  <Typography variant="body2" fontWeight={500}>
                    {feature}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              component={Link}
              href={currentProduct.link}
              sx={{ 
                mt: 2,
                borderRadius: '50px',
                px: 3,
                py: 1,
                fontWeight: 600,
                borderColor: currentProduct.color,
                color: currentProduct.color,
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: currentProduct.color,
                  backgroundColor: alpha(currentProduct.color, 0.1),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${alpha(currentProduct.color, 0.2)}`
                }
              }}
            >
              Learn More
            </Button>
          </motion.div>
        </AnimatePresence>
      </Paper>
    </motion.div>
  );
};

export default ProductDetailsPanel;
