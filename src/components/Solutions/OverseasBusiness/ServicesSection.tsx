'use client';

import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  useTheme, 
  alpha,
  Button,
  Chip
} from '@mui/material';
import { motion } from 'framer-motion';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DescriptionIcon from '@mui/icons-material/Description';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PaidIcon from '@mui/icons-material/Paid';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Link from 'next/link';

// Service data
const services = [
  {
    title: 'Business Entity Formation',
    description: 'We handle the complete process of establishing your business entity in foreign markets, including company registration, documentation, and legal compliance.',
    icon: <BusinessIcon fontSize="large" />,
    color: '#3f51b5',
    benefits: ['Limited liability protection', 'Legal recognition', 'Credibility with clients'],
  },
  {
    title: 'Regulatory Compliance',
    description: 'Our experts ensure your business meets all local regulatory requirements, helping you navigate complex legal frameworks across different jurisdictions.',
    icon: <AccountBalanceIcon fontSize="large" />,
    color: '#f44336',
    benefits: ['Avoid penalties', 'Maintain good standing', 'Smooth operations'],
  },
  {
    title: 'Documentation & Licensing',
    description: 'We prepare and process all necessary documentation, permits, and licenses required to operate your business legally in international markets.',
    icon: <DescriptionIcon fontSize="large" />,
    color: '#4caf50',
    benefits: ['Proper authorization', 'Industry-specific permits', 'Intellectual property protection'],
  },
  {
    title: 'Local Support & Representation',
    description: 'Get access to local representatives and support services to help establish your presence and handle day-to-day operations in foreign markets.',
    icon: <SupportAgentIcon fontSize="large" />,
    color: '#ff9800',
    benefits: ['Local expertise', 'Cultural navigation', 'Business relationship building'],
  },
  {
    title: 'Tax Planning & Optimization',
    description: 'Our tax experts develop strategies to optimize your global tax position, ensuring compliance while maximizing efficiency across multiple jurisdictions.',
    icon: <PaidIcon fontSize="large" />,
    color: '#e91e63',
    benefits: ['Minimize tax burden', 'Prevent double taxation', 'Strategic financial planning'],
  },
];

const ServicesSection = () => {
  const theme = useTheme();
  const primaryColor = '#0A66C2';
  const secondaryColor = '#FF5722';

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const headerVariants = {
    hidden: { y: -50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    hover: {
      y: -10,
      boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  return (
    <Box 
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      sx={{ 
        py: { xs: 8, md: 12 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(primaryColor, 0.05)} 0%, rgba(255,255,255,0) 70%)`,
          filter: 'blur(50px)',
          zIndex: 0,
        }}
      />
      
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div variants={containerVariants}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div variants={headerVariants}>
              <Typography
                variant="overline"
                sx={{
                  color: secondaryColor,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  mb: 1,
                  display: 'block'
                }}
              >
                COMPREHENSIVE SOLUTIONS
              </Typography>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textAlign: 'center',
                }}
              >
                Our Global Registration Services
              </Typography>
            </motion.div>
            <motion.div variants={headerVariants}>
              <Typography
                variant="h6"
                color="textSecondary"
                sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}
              >
                Comprehensive solutions to establish and grow your business in international markets
              </Typography>
            </motion.div>
            
            <Box component={motion.div} 
              variants={headerVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              sx={{ display: 'inline-block' }}
            >
              <Button
                variant="outlined"
                component={Link}
                href="/contact"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  borderColor: primaryColor,
                  color: primaryColor,
                  borderWidth: 2,
                  py: 1,
                  px: 3,
                  borderRadius: '50px',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: primaryColor,
                    backgroundColor: alpha(primaryColor, 0.05),
                    transform: 'translateY(-3px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Schedule a Consultation
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4 }}>
            {services.map((service, index) => (
              <Box key={index} sx={{ gridColumn: { xs: '1', md: index === 0 || index === services.length - 1 ? '1 / span 2' : 'auto' } }}>
                <motion.div
                  variants={cardVariants}
                  whileHover="hover"
                  custom={index}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 0,
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: { xs: 'column', md: index === 0 || index === services.length - 1 ? 'row' : 'column' },
                    }}
                  >
                    {/* Service header with gradient */}
                    <Box
                      sx={{
                        p: 3,
                        background: `linear-gradient(135deg, ${service.color} 0%, ${alpha(service.color, 0.7)} 100%)`,
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                        width: { xs: '100%', md: index === 0 || index === services.length - 1 ? '30%' : '100%' },
                      }}
                    >
                      {/* Background pattern */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0.1,
                          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                        }}
                      />
                      
                      <Box sx={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            width: 'fit-content',
                          }}
                        >
                          {service.icon}
                        </Box>
                        <Typography variant="h5" component="h3" fontWeight={700} gutterBottom>
                          {service.title}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* Service content */}
                    <Box sx={{ p: 3, flex: 1 }}>
                      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                        {service.description}
                      </Typography>
                      
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: service.color }}>
                        Key Benefits:
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {service.benefits.map((benefit, idx) => (
                          <Chip 
                            key={idx} 
                            label={benefit} 
                            size="small" 
                            icon={<CheckCircleIcon />}
                            sx={{ 
                              backgroundColor: alpha(service.color, 0.1),
                              color: service.color,
                              fontWeight: 500,
                              '& .MuiChip-icon': { color: service.color }
                            }} 
                          />
                        ))}
                      </Box>
                    </Box>
                    
                    {/* Animated gradient background */}
                    <Box
                      component={motion.div}
                      animate={{ 
                        opacity: [0.05, 0.1, 0.05],
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 5,
                        ease: "easeInOut"
                      }}
                      sx={{
                        position: 'absolute',
                        bottom: -50,
                        right: -50,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${service.color} 0%, rgba(255, 255, 255, 0) 70%)`,
                        filter: 'blur(40px)',
                        zIndex: 0,
                        opacity: 0.05,
                      }}
                    />
                  </Paper>
                </motion.div>
              </Box>
            ))}
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ServicesSection;
