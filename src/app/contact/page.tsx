'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Box, Breadcrumbs, Typography, Link as MuiLink, useTheme, IconButton, Fab, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ChatIcon from '@mui/icons-material/Chat';
import Link from 'next/link';

import {
  HeroSection,
  ContactForm,
  ContactInfo,
  MapSection,
  FaqSection,
  ScheduleMeeting
} from '@/components/Contact';

export default function ContactPage() {
  const theme = useTheme();
  const [showChatbot, setShowChatbot] = useState(false);

  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
  };

  return (
    <Layout>
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Breadcrumb Navigation */}
        <Box sx={{ backgroundColor: '#ffffff', py: 2 }}>
          <Box sx={{ maxWidth: 'lg', mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
            <Breadcrumbs 
              separator={<NavigateNextIcon fontSize="small" />} 
              aria-label="breadcrumb"
            >
              <Link href="/" passHref>
                <MuiLink 
                  underline="hover" 
                  sx={{ display: 'flex', alignItems: 'center' }}
                  color="inherit"
                >
                  <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                  Home
                </MuiLink>
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                Contact Us
              </Typography>
            </Breadcrumbs>
          </Box>
        </Box>

        {/* Hero Section */}
        <HeroSection />

        {/* Contact Form and Info Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Box sx={{ maxWidth: 'lg', mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {/* Contact Form */}
              <Box 
                sx={{ 
                  width: '100%', 
                  flex: { xs: '0 0 100%', md: '0 0 calc(60% - 24px)' },
                }}
              >
                <ContactForm />
              </Box>
              
              {/* Contact Information */}
              <Box 
                sx={{ 
                  width: '100%', 
                  flex: { xs: '0 0 100%', md: '0 0 calc(40% - 24px)' },
                }}
              >
                <ContactInfo />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Schedule Meeting Section */}
        <ScheduleMeeting />

        {/* Map Section */}
        <MapSection />

        {/* FAQ Section */}
        <FaqSection />
        
        {/* Floating Chat Button */}
        <Fab
          color="primary"
          aria-label="chat"
          sx={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
            },
            transition: 'all 0.3s ease',
          }}
          onClick={toggleChatbot}
        >
          <ChatIcon />
        </Fab>
        
        {/* Chatbot (placeholder) */}
        {showChatbot && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 100,
              right: 30,
              width: 350,
              height: 450,
              backgroundColor: '#ffffff',
              borderRadius: 2,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              zIndex: 1000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                p: 2,
                backgroundColor: theme.palette.primary.main,
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="h6">Chat with us</Typography>
              <IconButton size="small" onClick={toggleChatbot} sx={{ color: '#ffffff' }}>
                <NavigateNextIcon />
              </IconButton>
            </Box>
            <Box
              sx={{
                p: 2,
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              }}
            >
              <Typography variant="body1" color="text.secondary" align="center">
                Chat functionality would be implemented here. This is a placeholder for demonstration purposes.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Layout>
  );
}
