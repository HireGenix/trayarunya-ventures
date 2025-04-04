'use client';

import React, { useEffect, useState } from 'react';
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
  // Use state to track if we're on the client side
  const [isMounted, setIsMounted] = useState(false);
  
  // Set isMounted to true when component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Layout>
      <Box
        component={isMounted ? motion.div : 'div'}
        {...(isMounted ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.5 }
        } : {})}
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
