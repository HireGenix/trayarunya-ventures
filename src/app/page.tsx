'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  HeroSection, 
  ProductsSection, 
  AboutSection, 
  SolutionsSection, 
  TestimonialsSection, 
  CTASection 
} from '@/components/Home';

export default function HomePage() {
  return (
    <Layout>
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Hero Section */}
        <HeroSection />

        {/* Products Section */}
        <ProductsSection />

        {/* About Section */}
        <AboutSection />

        {/* Solutions Section */}
        <SolutionsSection />

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* CTA Section */}
        <CTASection />
      </Box>
    </Layout>
  );
}
