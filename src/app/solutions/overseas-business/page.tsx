'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  useTheme, 
  alpha, 
  Grid,
  Divider,
  Avatar,
  Chip
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PublicIcon from '@mui/icons-material/Public';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import LanguageIcon from '@mui/icons-material/Language';
import StarIcon from '@mui/icons-material/Star';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { 
  HeroSection, 
  ServicesSection, 
  BusinessEntityComparison 
} from '@/components/Solutions/OverseasBusiness';

// Countries data
const countries = [
  {
    name: 'United States',
    advantages: ['World\'s largest economy', 'Access to venture capital', 'Innovation ecosystem'],
    timeframe: '2-4 weeks',
    color: '#3f51b5',
    icon: <BusinessCenterIcon />,
    flag: '🇺🇸',
    gdp: '$25.5 trillion',
    rank: '#1'
  },
  {
    name: 'United Kingdom',
    advantages: ['Gateway to European markets', 'Strong legal framework', 'English-speaking business environment'],
    timeframe: '1-2 weeks',
    color: '#f44336',
    icon: <LanguageIcon />,
    flag: '🇬🇧',
    gdp: '$3.1 trillion',
    rank: '#6'
  },
  {
    name: 'Singapore',
    advantages: ['Strategic location in Asia', 'Business-friendly regulations', 'Low tax rates'],
    timeframe: '1-3 weeks',
    color: '#4caf50',
    icon: <PublicIcon />,
    flag: '🇸🇬',
    gdp: '$466 billion',
    rank: '#36'
  },
  {
    name: 'UAE (Dubai)',
    advantages: ['Tax-free zones', 'Strategic location between East and West', 'Modern infrastructure'],
    timeframe: '2-4 weeks',
    color: '#ff9800',
    icon: <FlightTakeoffIcon />,
    flag: '🇦🇪',
    gdp: '$507 billion',
    rank: '#32'
  },
  {
    name: 'Canada',
    advantages: ['Stable economy', 'Skilled workforce', 'Favorable immigration policies for entrepreneurs'],
    timeframe: '3-5 weeks',
    color: '#e91e63',
    icon: <BusinessCenterIcon />,
    flag: '🇨🇦',
    gdp: '$2.2 trillion',
    rank: '#9'
  },
  {
    name: 'Australia',
    advantages: ['Strong economy', 'Gateway to Asia-Pacific', 'High quality of life'],
    timeframe: '2-4 weeks',
    color: '#009688',
    icon: <LanguageIcon />,
    flag: '🇦🇺',
    gdp: '$1.7 trillion',
    rank: '#13'
  },
];

// Testimonials data
const testimonials = [
  {
    name: 'Sarah Johnson',
    company: 'TechVision Inc.',
    position: 'CEO',
    image: 'https://randomuser.me/api/portraits/women/32.jpg',
    quote: 'Expanding our tech business to Singapore was seamless with Trayarunya Ventures. Their expertise in navigating international regulations saved us months of research and potential compliance issues.',
    country: 'Singapore',
    rating: 5
  },
  {
    name: 'Michael Chen',
    company: 'Global Trade Solutions',
    position: 'Founder',
    image: 'https://randomuser.me/api/portraits/men/45.jpg',
    quote: 'The team at Trayarunya Ventures provided exceptional guidance for our UK expansion. Their knowledge of local business practices and tax optimization strategies has been invaluable to our growth.',
    country: 'United Kingdom',
    rating: 5
  },
  {
    name: 'Priya Sharma',
    company: 'Innovate Health',
    position: 'Managing Director',
    image: 'https://randomuser.me/api/portraits/women/68.jpg',
    quote: 'Setting up our healthcare business in Dubai seemed daunting until we partnered with Trayarunya Ventures. Their step-by-step approach and local connections made the entire process smooth and efficient.',
    country: 'UAE (Dubai)',
    rating: 5
  }
];

export default function OverseasBusinessPage() {
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

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <Layout>
      <Box component="main">
        {/* Hero Section */}
        <HeroSection />

        {/* Services Section */}
        <ServicesSection />

        {/* Business Entity Comparison */}
        <BusinessEntityComparison />

        {/* Countries Section */}
        <Box 
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          sx={{ 
            py: { xs: 8, md: 12 },
            background: `linear-gradient(180deg, ${alpha(primaryColor, 0.03)} 0%, rgba(255,255,255,1) 100%)`,
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <motion.div variants={itemVariants}>
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
                  GLOBAL OPPORTUNITIES
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
                  Popular Destinations
                </Typography>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Typography
                  variant="h6"
                  color="textSecondary"
                  sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}
                >
                  Explore some of the most advantageous countries for business registration
                </Typography>
              </motion.div>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 4 }}>
              {countries.map((country, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -10, transition: { duration: 0.3 } }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 0,
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: `0 15px 40px ${alpha(country.color, 0.2)}`,
                      },
                    }}
                  >
                    {/* Header with gradient */}
                    <Box
                      sx={{
                        p: 3,
                        background: `linear-gradient(135deg, ${country.color} 0%, ${alpha(country.color, 0.7)} 100%)`,
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
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
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                        <Box>
                          <Typography variant="h5" component="h3" fontWeight={700} gutterBottom>
                            {country.flag} {country.name}
                          </Typography>
                          <Chip 
                            label={`Setup: ${country.timeframe}`}
                            size="small"
                            sx={{ 
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                              fontWeight: 500,
                            }}
                          />
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>Economy Rank</Typography>
                          <Typography variant="h6" fontWeight={800}>{country.rank}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>GDP</Typography>
                          <Typography variant="body2" fontWeight={600}>{country.gdp}</Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    {/* Content */}
                    <Box sx={{ p: 3 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: country.color }}>
                        Key Advantages:
                      </Typography>
                      <Box component="ul" sx={{ pl: 0, listStyle: 'none', mb: 0 }}>
                        {country.advantages.map((advantage, idx) => (
                          <Box 
                            component="li" 
                            key={idx} 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              mb: 2,
                              pb: idx !== country.advantages.length - 1 ? 2 : 0,
                              borderBottom: idx !== country.advantages.length - 1 ? `1px dashed ${alpha(country.color, 0.3)}` : 'none',
                            }}
                          >
                            <CheckCircleIcon sx={{ fontSize: 20, color: country.color, mr: 1.5, mt: 0.3 }} />
                            <Typography variant="body2" fontWeight={500}>
                              {advantage}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                </motion.div>
              ))}
            </Box>
          </Container>
        </Box>

        {/* Process Section */}
        <Box 
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
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
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(secondaryColor, 0.2)} 0%, rgba(255,255,255,0) 70%)`,
              filter: 'blur(50px)',
              zIndex: 0,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -100,
              left: -100,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(primaryColor, 0.2)} 0%, rgba(255,255,255,0) 70%)`,
              filter: 'blur(50px)',
              zIndex: 0,
            }}
          />
          
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <motion.div variants={itemVariants}>
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
                  STREAMLINED APPROACH
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
                  Our Registration Process
                </Typography>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Typography
                  variant="h6"
                  color="textSecondary"
                  sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}
                >
                  A proven methodology to establish your business internationally with minimal friction
                </Typography>
              </motion.div>
            </Box>

            <Box sx={{ position: 'relative' }}>
              {/* Vertical line connecting steps with animated gradient */}
              <Box
                sx={{
                  position: 'absolute',
                  left: { xs: 30, md: '50%' },
                  top: 0,
                  bottom: 0,
                  width: 4,
                  ml: { xs: 0, md: -2 },
                  background: `linear-gradient(to bottom, ${primaryColor}, ${secondaryColor})`,
                  zIndex: 0,
                  display: { xs: 'none', md: 'block' },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: -3,
                    right: -3,
                    bottom: 0,
                    background: `linear-gradient(to bottom, ${alpha(primaryColor, 0.2)}, ${alpha(secondaryColor, 0.2)})`,
                    filter: 'blur(4px)',
                    borderRadius: 4,
                  }
                }}
              />
              
              {/* Animated dots along the timeline */}
              {[0.2, 0.4, 0.6, 0.8].map((position, idx) => (
                <Box
                  key={idx}
                  component={motion.div}
                  animate={{ 
                    y: [0, 10, 0],
                    opacity: [0.4, 0.8, 0.4]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 3 + idx,
                    delay: idx * 0.5,
                    ease: "easeInOut"
                  }}
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: `${position * 100}%`,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    boxShadow: `0 0 10px ${primaryColor}`,
                    transform: 'translateX(-50%)',
                    zIndex: 1,
                    display: { xs: 'none', md: 'block' }
                  }}
                />
              ))}

              <Box sx={{ position: 'relative', zIndex: 1 }}>
                {[
                  {
                    step: '01',
                    title: 'Initial Consultation',
                    description: 'We begin with a comprehensive consultation to understand your business goals, target markets, and specific requirements for international expansion.',
                    icon: <BusinessCenterIcon />,
                  },
                  {
                    step: '02',
                    title: 'Strategy Development',
                    description: 'Our experts develop a tailored strategy for your business, recommending the most suitable countries, entity types, and operational structures based on your objectives.',
                    icon: <LanguageIcon />,
                  },
                  {
                    step: '03',
                    title: 'Documentation Preparation',
                    description: 'We handle all necessary documentation, including company registration forms, director/shareholder information, and any specialized permits or licenses required.',
                    icon: <PublicIcon />,
                  },
                  {
                    step: '04',
                    title: 'Registration & Compliance',
                    description: 'Our team manages the entire registration process with local authorities, ensuring all regulatory requirements are met and compliance standards are established.',
                    icon: <CheckCircleIcon />,
                  },
                  {
                    step: '05',
                    title: 'Operational Setup',
                    description: 'Once registered, we assist with setting up essential business operations, including bank accounts, tax registrations, and local representation services.',
                    icon: <FlightTakeoffIcon />,
                  },
                ].map((process, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    custom={index}
                  >
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', md: index % 2 === 0 ? 'row' : 'row-reverse' },
                        mb: 6,
                        alignItems: { xs: 'flex-start', md: 'center' },
                      }}
                    >
                      {/* Step number circle with animated gradient border */}
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          color: primaryColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.75rem',
                          flexShrink: 0,
                          boxShadow: `0 10px 30px ${alpha(primaryColor, 0.3)}`,
                          position: { xs: 'relative', md: 'absolute' },
                          left: { xs: 'auto', md: 'calc(50% - 40px)' },
                          zIndex: 2,
                          mb: { xs: 3, md: 0 },
                          padding: '4px',
                          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: '4px',
                            borderRadius: '50%',
                            background: 'white',
                            zIndex: -1,
                          },
                        }}
                      >
                        {process.step}
                      </Box>
                      
                      {/* Content card with gradient accent */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 0,
                          borderRadius: 4,
                          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                          },
                          width: { xs: '100%', md: '45%' },
                          ml: { xs: 0, md: index % 2 === 0 ? 0 : 'auto' },
                          mr: { xs: 0, md: index % 2 === 0 ? 'auto' : 0 },
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Top gradient accent */}
                        <Box 
                          sx={{ 
                            height: 6, 
                            width: '100%', 
                            background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                          }} 
                        />
                        <Box sx={{ p: 4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: '12px',
                                background: `linear-gradient(135deg, ${alpha(primaryColor, 0.2)} 0%, ${alpha(secondaryColor, 0.2)} 100%)`,
                                color: primaryColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: `0 4px 15px ${alpha(primaryColor, 0.15)}`,
                              }}
                            >
                              {process.icon}
                            </Box>
                            <Box>
                              <Typography variant="h5" component="h3" fontWeight={700} gutterBottom>
                                {process.title}
                              </Typography>
                              <Typography variant="body1" color="textSecondary">
                                {process.description}
                              </Typography>
                              
                              {/* Visual indicator of completion */}
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                <Box sx={{ 
                                  width: '100%', 
                                  height: 4, 
                                  backgroundColor: alpha(primaryColor, 0.1),
                                  borderRadius: 2,
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}>
                                  <Box 
                                    sx={{ 
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      height: '100%',
                                      width: `${(parseInt(process.step) / 5) * 100}%`,
                                      background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                                      borderRadius: 2,
                                    }}
                                  />
                                </Box>
                                <Typography variant="caption" fontWeight={600} sx={{ ml: 1, color: primaryColor }}>
                                  {`${(parseInt(process.step) / 5) * 100}%`}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Testimonials Section */}
        <Box 
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          sx={{ 
            py: { xs: 8, md: 12 },
            background: `linear-gradient(180deg, rgba(255,255,255,1) 0%, ${alpha(primaryColor, 0.05)} 100%)`,
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <motion.div variants={itemVariants}>
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
                  SUCCESS STORIES
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
                  Client Testimonials
                </Typography>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Typography
                  variant="h6"
                  color="textSecondary"
                  sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}
                >
                  Hear from businesses that have successfully expanded globally with our services
                </Typography>
              </motion.div>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -10, transition: { duration: 0.3 } }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: 20, right: 20, color: secondaryColor }}>
                      <FormatQuoteIcon sx={{ fontSize: 40, opacity: 0.2 }} />
                    </Box>
                    
                    <Box sx={{ mb: 3, flex: 1 }}>
                      <Typography variant="body1" sx={{ fontStyle: 'italic', mb: 3 }}>
                        "{testimonial.quote}"
                      </Typography>
                      
                      <Box sx={{ display: 'flex', mb: 1 }}>
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <StarIcon key={i} sx={{ color: '#FFD700', fontSize: 18 }} />
                        ))}
                      </Box>
                      
                      <Chip 
                        label={`Expanded to: ${testimonial.country}`}
                        size="small"
                        sx={{ 
                          backgroundColor: alpha(primaryColor, 0.1),
                          color: primaryColor,
                          fontWeight: 500,
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', pt: 2, borderTop: `1px solid ${alpha('#000', 0.1)}` }}>
                      <Avatar src={testimonial.image} alt={testimonial.name} sx={{ width: 50, height: 50, mr: 2 }} />
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {testimonial.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {testimonial.position}, {testimonial.company}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </motion.div>
              ))}
            </Box>
          </Container>
        </Box>

        {/* CTA Section */}
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          sx={{
            py: { xs: 8, md: 12 },
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${alpha(secondaryColor, 0.8)} 100%)`,
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background elements */}
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
              zIndex: 0,
            }}
          />
          
          <Box
            component={motion.div}
            animate={{ 
              y: [0, -15, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 5,
              ease: "easeInOut"
            }}
            sx={{
              position: 'absolute',
              top: -100,
              right: '10%',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)`,
              filter: 'blur(60px)',
              zIndex: 0,
            }}
          />

          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 4, alignItems: 'center' }}>
              <Box>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <Typography
                    variant="h2"
                    component="h2"
                    sx={{
                      fontWeight: 800,
                      mb: 2,
                      color: '#ffffff',
                      textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    }}
                  >
                    Ready to Expand Globally?
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ mb: 4, color: alpha('#ffffff', 0.9), maxWidth: 600 }}
                  >
                    Take the first step toward international growth with our expert business registration services. Contact us today for a personalized consultation.
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="contained"
                        size="large"
                        component={Link}
                        href="/contact"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          backgroundColor: '#ffffff',
                          color: primaryColor,
                          py: 1.5,
                          px: 3,
                          borderRadius: '50px',
                          fontWeight: 700,
                          '&:hover': {
                            backgroundColor: alpha('#ffffff', 0.9),
                            transform: 'translateY(-3px)',
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Start Your Global Journey
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outlined"
                        size="large"
                        component={Link}
                        href="/solutions"
                        sx={{
                          borderColor: '#ffffff',
                          color: '#ffffff',
                          py: 1.5,
                          px: 3,
                          borderRadius: '50px',
                          fontWeight: 600,
                          borderWidth: 2,
                          '&:hover': {
                            borderColor: '#ffffff',
                            backgroundColor: alpha('#ffffff', 0.1),
                            transform: 'translateY(-3px)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Explore Other Solutions
                      </Button>
                    </motion.div>
                  </Box>
                </motion.div>
              </Box>
              
              <Box>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Box
                    sx={{
                      p: 4,
                      borderRadius: 4,
                      backgroundColor: alpha('#ffffff', 0.1),
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <PublicIcon sx={{ fontSize: 40, mr: 2, color: '#ffffff' }} />
                      <Typography variant="h5" fontWeight={700} color="#ffffff">
                        Global Expansion Benefits
                      </Typography>
                    </Box>
                    <Divider sx={{ borderColor: alpha('#ffffff', 0.2), mb: 3 }} />
                    <Box component="ul" sx={{ pl: 0, listStyle: 'none', mb: 0 }}>
                      {[
                        'Access to new markets and customer bases',
                        'Diversification of business risk',
                        'Tax optimization opportunities',
                        'Enhanced brand reputation and credibility',
                        'Competitive advantage in your industry',
                      ].map((item, index) => (
                        <Box 
                          component="li" 
                          key={index} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mb: 2.5,
                            pb: index !== 4 ? 1 : 0,
                            borderBottom: index !== 4 ? `1px dashed ${alpha('#ffffff', 0.2)}` : 'none',
                          }}
                        >
                          <CheckCircleIcon sx={{ color: '#ffffff', mr: 1.5 }} />
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: alpha('#ffffff', 0.9),
                              fontWeight: 500
                            }}
                          >
                            {item}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </motion.div>
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>
    </Layout>
  );
}
