'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Avatar,
  Rating,
  IconButton,
  useTheme, 
  alpha,
  Button,
  Chip,
  Divider,
  useMediaQuery
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import InsightsIcon from '@mui/icons-material/Insights';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import DiamondIcon from '@mui/icons-material/Diamond';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import Link from 'next/link';

// Enhanced testimonials data with logos
const testimonials = [
  {
    id: 1,
    name: 'Deepak Jha',
    position: 'Director',
    company: 'BCCM (India)',
    image: 'https://randomuser.me/api/portraits/men/32.jpg', // Placeholder image
    logo: 'https://placehold.co/200x80/4285F4/FFFFFF/png?text=BCCM', // Placeholder logo
    quote: 'Trayarunya Ventures truly understood our vision and helped us expand our digital footprint significantly. Their team is not just skilled but also genuinely invested in our success, leading to a noticeable improvement in lead quality and engagement.',
    rating: 5,
    industry: 'Consulting',
    results: 'Saw a solid boost in qualified leads and a notable uptick in website traffic.',
    color: '#4285F4'
  },
  {
    id: 2,
    name: 'Kay Madaan',
    position: 'CEO',
    company: 'XS Worldwide',
    image: 'https://randomuser.me/api/portraits/men/64.jpg', // Placeholder image
    logo: 'https://placehold.co/200x80/34A853/FFFFFF/png?text=XS+Worldwide', // Placeholder logo
    quote: 'The campaigns from Trayarunya Ventures were a game-changer. Their fresh ideas and committed team helped us connect with a much larger audience, really making our brand stand out in a crowded field. We\'re thrilled with the increased recognition.',
    rating: 5,
    industry: 'Event Management',
    results: 'Experienced a major lift in brand visibility and better event sign-up rates.',
    color: '#34A853'
  },
  {
    id: 3,
    name: 'Fiona Hawley',
    position: 'Marketing Head',
    company: 'Digital Ninjas',
    image: 'https://randomuser.me/api/portraits/women/45.jpg', // Placeholder image
    logo: 'https://placehold.co/200x80/EA4335/FFFFFF/png?text=Digital+Ninjas', // Placeholder logo
    quote: 'Partnering with Trayarunya Ventures was like adding experts to our own team. They quickly grasped our unique market and crafted digital strategies that delivered real, measurable growth. It\'s been a fantastic collaboration.',
    rating: 5,
    industry: 'Digital Agency',
    results: 'Achieved better client acquisition and a healthy increase in social media interaction.',
    color: '#EA4335'
  },
  {
    id: 4,
    name: 'Santosh Chintakayala',
    position: 'Founder',
    company: 'Technest Ventures',
    image: 'https://randomuser.me/api/portraits/men/22.jpg', // Placeholder image
    logo: 'https://placehold.co/200x80/FBBC05/FFFFFF/png?text=Technest', // Placeholder logo
    quote: 'For our startup, finding a marketing partner who could make a big impact on a tight budget was key. Trayarunya Ventures delivered exactly that with smart, creative solutions that helped us build a strong presence fast.',
    rating: 5,
    industry: 'Technology Startup',
    results: 'Gained more user sign-ups while effectively managing our acquisition costs.',
    color: '#FBBC05'
  },
];

const ClientTestimonials = () => {
  const theme = useTheme();
  const primaryColor = '#8E44AD'; // Keeping the Digital Marketing theme color
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  // Calculate visible testimonials based on screen size
  const getVisibleCount = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };

  const visibleCount = getVisibleCount();
  const maxIndex = testimonials.length > visibleCount ? testimonials.length - visibleCount : 0;


  // Handle navigation
  const handleNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  };

  // Auto-rotate testimonials
  useEffect(() => {
    if (testimonials.length <= visibleCount) return; // No rotation if all items are visible
    const interval = setInterval(() => {
      handleNext();
    }, 8000);
    
    return () => clearInterval(interval);
  }, [activeIndex, maxIndex, visibleCount]);

  // Get current visible testimonials
  const visibleTestimonials = () => {
    if (testimonials.length === 0) return [];
    const items = [];
    for (let i = 0; i < visibleCount; i++) {
      if (testimonials.length > i) { // Ensure we don't go out of bounds
         const index = (activeIndex + i) % testimonials.length;
         items.push(testimonials[index]);
      }
    }
    return items;
  };

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

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.5,
      },
    }),
    exit: { opacity: 0, y: -50, transition: { duration: 0.3 } },
  };

  return (
    <Box 
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      sx={{ 
        py: { xs: 10, md: 14 },
        backgroundColor: alpha(primaryColor, 0.03),
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Section Divider */}
      <Box 
        sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 80,
          background: 'linear-gradient(to bottom, white, transparent)',
          zIndex: 1,
        }}
      />

      {/* Background Elements */}
      <Box
        component={motion.div}
        animate={{ 
          rotate: [0, 360],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 120,
          ease: "linear"
        }}
        sx={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          border: `2px dashed ${alpha(primaryColor, 0.1)}`,
          zIndex: 0,
        }}
      />

      {/* Background dot pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          backgroundImage: `radial-gradient(circle, ${primaryColor} 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
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
          top: '30%',
          left: '10%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(primaryColor, 0.3)} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'pulse 10s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.1 },
            '50%': { transform: 'scale(1.1)', opacity: 0.15 },
          },
        }}
      />
      
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.08 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        sx={{
          position: 'absolute',
          bottom: '20%',
          right: '10%',
          width: { xs: 120, md: 250 },
          height: { xs: 120, md: 250 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(primaryColor, 0.2)} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'pulse2 12s ease-in-out infinite',
          '@keyframes pulse2': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.08 },
            '50%': { transform: 'scale(1.15)', opacity: 0.12 },
          },
        }}
      />
      
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div variants={containerVariants}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div variants={itemVariants}>
              <Chip
                icon={<FormatQuoteIcon />}
                label="CLIENT SUCCESS STORIES"
                sx={{
                  mb: 3,
                  py: 1.5,
                  px: 2,
                  borderRadius: '50px',
                  background: `linear-gradient(90deg, ${primaryColor}, #6C3483)`,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  '& .MuiChip-icon': {
                    color: 'white'
                  }
                }}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  background: `linear-gradient(90deg, ${primaryColor} 0%, #333333 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Real Stories, Real Results
              </Typography>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Typography
                variant="h6"
                color="textSecondary"
                sx={{ 
                  maxWidth: 800, 
                  mx: 'auto', 
                  mb: 6,
                  fontSize: '1.1rem',
                  lineHeight: 1.7 // Increased for readability
                }}
              >
                We're proud of the partnerships we build and the growth we help create. 
                Here's what some of our clients have to say about their journey with us.
              </Typography>
            </motion.div>
          </Box>

          {/* Testimonial Grid */}
          <Box sx={{ position: 'relative', mb: { xs: 8, md: 12 } }}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                justifyContent: 'center',
                mb: 4,
                minHeight: 450, // Ensure consistent height for the card area
              }}
            >
              <AnimatePresence mode="wait">
                {visibleTestimonials().map((testimonial, index) => (
                  <motion.div
                    key={`${testimonial.id}-${activeIndex}`} // Ensure key changes for re-animation
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ 
                      width: '100%', 
                      maxWidth: isMobile ? '100%' : isTablet ? 'calc(50% - 16px)' : 'calc(33.333% - 16px)',
                      flex: isMobile ? '0 0 100%' : isTablet ? '0 0 calc(50% - 16px)' : '0 0 calc(33.333% - 16px)'
                    }}
                  >
                    <Paper
                      elevation={0}
                      component={motion.div}
                      whileHover={{ 
                        y: -15,
                        boxShadow: `0 30px 60px ${alpha(testimonial.color, 0.2)}`,
                        transition: { duration: 0.4, ease: "easeOut" }
                      }}
                      sx={{
                        p: 0,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: `0 15px 35px ${alpha(testimonial.color, 0.1)}`,
                        transition: 'all 0.4s ease',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f9f9ff 100%)',
                        border: `1px solid ${alpha(testimonial.color, 0.08)}`,
                        position: 'relative',
                      }}
                    >
                      {/* Glowing border effect */}
                      <Box
                        component={motion.div}
                        animate={{ 
                          boxShadow: [
                            `0 0 10px ${testimonial.color}40`,
                            `0 0 20px ${testimonial.color}20`,
                            `0 0 10px ${testimonial.color}40`
                          ]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          borderRadius: 4,
                          pointerEvents: 'none',
                          border: `1px solid ${testimonial.color}30`,
                        }}
                      />
                      
                      {/* Quote icon with animation */}
                      <Box
                        component={motion.div}
                        initial={{ opacity: 0.05, scale: 1 }}
                        animate={{ 
                          opacity: [0.05, 0.1, 0.05],
                          scale: [1, 1.05, 1],
                          rotate: [-2, 2, -2]
                        }}
                        transition={{ 
                          duration: 8, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        sx={{
                          position: 'absolute',
                          top: 20,
                          left: 20,
                          color: alpha(testimonial.color, 0.1),
                        }}
                      >
                        <FormatQuoteIcon sx={{ fontSize: 70 }} />
                      </Box>

                      {/* Subtle gradient accent in corner */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: 150,
                          height: 150,
                          borderRadius: '0 0 0 100%',
                          background: `linear-gradient(135deg, ${testimonial.color}15 0%, rgba(30, 30, 30, 0) 70%)`,
                          opacity: 0.5,
                          zIndex: 0,
                        }}
                      />

                      {/* Card Content */}
                      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
                        {/* Company logo and industry */}
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            mb: 3
                          }}
                        >
                          <Box
                            component="img"
                            src={testimonial.logo}
                            alt={testimonial.company}
                            sx={{
                              maxWidth: 100,
                              maxHeight: 30,
                              objectFit: 'contain'
                            }}
                          />
                          
                          <Box
                            sx={{
                              px: 2,
                              py: 0.75,
                              borderRadius: '12px',
                              background: `linear-gradient(135deg, ${testimonial.color}15, ${testimonial.color}30)`,
                              border: `1px solid ${testimonial.color}40`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: testimonial.color,
                                fontWeight: 700,
                                letterSpacing: '0.5px'
                              }}
                            >
                              {testimonial.industry}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Testimonial text */}
                        <Typography
                          variant="body1"
                          sx={{
                            mb: 3,
                            fontStyle: 'italic',
                            flexGrow: 1,
                            position: 'relative',
                            zIndex: 1,
                            color: '#333333',
                            lineHeight: 1.7,
                            fontSize: '1rem',
                            '&::before': {
                              content: '"\\201C"',
                              fontSize: '1.5rem',
                              color: testimonial.color,
                              marginRight: '0.2rem',
                              fontFamily: 'serif',
                              fontWeight: 700,
                            },
                            '&::after': {
                              content: '"\\201D"',
                              fontSize: '1.5rem',
                              color: testimonial.color,
                              marginLeft: '0.2rem',
                              fontFamily: 'serif',
                              fontWeight: 700,
                            }
                          }}
                        >
                          {testimonial.quote}
                        </Typography>

                        {/* Results box */}
                        <Box
                          sx={{
                            p: 2,
                            mb: 3,
                            borderRadius: 3,
                            backgroundColor: alpha(testimonial.color, 0.05),
                            border: `1px solid ${alpha(testimonial.color, 0.2)}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                          }}
                        >
                          <Box
                            component={motion.div}
                            animate={{ 
                              rotate: [0, 10, 0],
                              scale: [1, 1.1, 1]
                            }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: alpha(testimonial.color, 0.1),
                              flexShrink: 0
                            }}
                          >
                            <TrendingUpIcon sx={{ color: testimonial.color }} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} color={testimonial.color} gutterBottom>
                              Results Achieved:
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {testimonial.results}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Divider with animation */}
                        <Box
                          component={motion.div}
                          animate={{ 
                            width: ['40%', '60%', '40%'],
                            opacity: [0.6, 0.8, 0.6]
                          }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          sx={{
                            height: 2,
                            background: `linear-gradient(90deg, ${testimonial.color}50, ${testimonial.color}10)`,
                            mb: 3,
                            borderRadius: 4,
                          }}
                        />

                        {/* Author info with animated avatar */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box
                              component={motion.div}
                              whileHover={{ 
                                scale: 1.1,
                                rotate: 5,
                                transition: { duration: 0.3 }
                              }}
                            >
                              <Avatar
                                src={testimonial.image}
                                alt={testimonial.name}
                                sx={{
                                  width: 50,
                                  height: 50,
                                  mr: 2,
                                  boxShadow: `0 4px 15px ${alpha(testimonial.color, 0.3)}`,
                                  border: `2px solid ${alpha(testimonial.color, 0.3)}`,
                                }}
                              />
                            </Box>
                            <Box>
                              <Typography 
                                variant="subtitle1" 
                                fontWeight={700} 
                                sx={{
                                  color: '#333333',
                                }}
                              >
                                {testimonial.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {testimonial.position}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              backgroundColor: alpha('#4CAF50', 0.1),
                            }}
                          >
                            <VerifiedIcon sx={{ color: '#4CAF50', fontSize: 16, mr: 0.5 }} />
                            <Typography variant="caption" fontWeight={600} sx={{ color: '#4CAF50' }}>
                              Verified
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Box>

            {/* Navigation Controls */}
            {testimonials.length > visibleCount && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 3,
                    mt: 6,
                  }}
                >
                  <IconButton
                    component={motion.button}
                    whileHover={{ 
                      scale: 1.1,
                      boxShadow: `0 5px 15px ${alpha(primaryColor, 0.2)}`,
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePrev}
                    disabled={activeIndex === 0}
                    sx={{
                      width: 50,
                      height: 50,
                      backgroundColor: 'white',
                      color: primaryColor,
                      boxShadow: `0 4px 12px ${alpha(primaryColor, 0.15)}`,
                      border: `2px solid ${alpha(primaryColor, 0.1)}`,
                      '&:hover': {
                        backgroundColor: 'white',
                      },
                      transition: 'all 0.3s ease',
                      opacity: activeIndex === 0 ? 0.5 : 1,
                    }}
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                  
                  <IconButton
                    component={motion.button}
                    whileHover={{ 
                      scale: 1.1,
                      boxShadow: `0 5px 15px ${alpha(primaryColor, 0.2)}`,
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNext}
                    disabled={activeIndex === maxIndex}
                    sx={{
                      width: 50,
                      height: 50,
                      backgroundColor: 'white',
                      color: primaryColor,
                      boxShadow: `0 4px 12px ${alpha(primaryColor, 0.15)}`,
                      border: `2px solid ${alpha(primaryColor, 0.1)}`,
                      '&:hover': {
                        backgroundColor: 'white',
                      },
                      transition: 'all 0.3s ease',
                      opacity: activeIndex === maxIndex ? 0.5 : 1,
                    }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                {/* Testimonial Indicators */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                  {[...Array(maxIndex + 1)].map((_, index) => (
                    <Box
                      key={index}
                      component="button"
                      onClick={() => {
                        setDirection(index > activeIndex ? 1 : -1);
                        setActiveIndex(index);
                      }}
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: index === activeIndex ? primaryColor : alpha(primaryColor, 0.2),
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: index === activeIndex ? primaryColor : alpha(primaryColor, 0.4),
                        },
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
          </Box>

          {/* Stats Section - Completely Redesigned */}
          <Box 
            sx={{ 
              mt: { xs: 16, md: 24 }, 
              mb: { xs: 16, md: 24 },
              position: 'relative',
              background: `
                radial-gradient(ellipse 80% 50% at 50% 0%, ${alpha('#667eea', 0.08)} 0%, transparent 60%),
                radial-gradient(ellipse 80% 50% at 50% 100%, ${alpha('#764ba2', 0.08)} 0%, transparent 60%),
                linear-gradient(135deg, 
                  ${alpha('#f093fb', 0.02)} 0%, 
                  ${alpha('#f5576c', 0.03)} 25%, 
                  ${alpha('#4facfe', 0.02)} 50%, 
                  ${alpha('#00f2fe', 0.03)} 75%, 
                  ${alpha('#c471f5', 0.02)} 100%
                )
              `,
              overflow: 'hidden',
            }}
          >
            {/* Floating Geometric Background Elements */}
            <Box
              component={motion.div}
              animate={{ 
                rotate: [0, 180, 360],
                x: [0, 50, -50, 0],
                y: [0, -30, 30, 0],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 40,
                ease: "linear"
              }}
              sx={{
                position: 'absolute',
                top: '10%',
                left: '5%',
                width: '120px',
                height: '120px',
                background: `linear-gradient(45deg, ${alpha('#667eea', 0.1)}, ${alpha('#764ba2', 0.1)})`,
                borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                filter: 'blur(20px)',
                zIndex: 0,
              }}
            />
            
            <Box
              component={motion.div}
              animate={{ 
                rotate: [360, 180, 0],
                x: [0, -40, 40, 0],
                y: [0, 40, -40, 0],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 35,
                ease: "linear"
              }}
              sx={{
                position: 'absolute',
                top: '60%',
                right: '8%',
                width: '100px',
                height: '100px',
                background: `linear-gradient(45deg, ${alpha('#f093fb', 0.12)}, ${alpha('#f5576c', 0.12)})`,
                borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                filter: 'blur(25px)',
                zIndex: 0,
              }}
            />

            <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 12 } }}>
              {/* Section Header */}
              <Box sx={{ textAlign: 'center', mb: { xs: 10, md: 16 } }}>
                <motion.div
                  initial={{ scale: 0.7, opacity: 0, y: 30 }}
                  whileInView={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "backOut" }}
                  viewport={{ once: true }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 4,
                      px: 4,
                      py: 2,
                      borderRadius: '60px',
                      background: `linear-gradient(135deg, 
                        ${alpha('#667eea', 0.9)} 0%, 
                        ${alpha('#764ba2', 0.9)} 30%,
                        ${alpha('#f093fb', 0.9)} 60%,
                        ${alpha('#f5576c', 0.9)} 100%
                      )`,
                      color: 'white',
                      boxShadow: `0 12px 40px ${alpha('#667eea', 0.3)}`,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <InsightsIcon sx={{ fontSize: '1.8rem' }} />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: '0.9rem', md: '1.1rem' },
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Success Metrics That Matter
                    </Typography>
                    <RocketLaunchIcon sx={{ fontSize: '1.8rem' }} />
                  </Box>
                </motion.div>

                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                  viewport={{ once: true }}
                >
                  <Typography
                    variant="h1"
                    component="h2"
                    sx={{
                      fontWeight: 900,
                      mb: 4,
                      fontSize: { xs: '3rem', sm: '4rem', md: '5.5rem', lg: '6.5rem' },
                      lineHeight: 0.9,
                      letterSpacing: '-0.04em',
                      textAlign: 'center',
                      background: `linear-gradient(135deg, 
                        #667eea 0%, 
                        #764ba2 20%, 
                        #f093fb 40%, 
                        #f5576c 60%, 
                        #4facfe 80%, 
                        #00f2fe 100%
                      )`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 8px 32px rgba(0,0,0,0.1)',
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '120px',
                        height: '6px',
                        background: `linear-gradient(90deg, #667eea, #f5576c)`,
                        borderRadius: '3px',
                      }
                    }}
                  >
                    Numbers Don't Lie
                  </Typography>
                </motion.div>

                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  <Typography
                    variant="h4"
                    sx={{ 
                      maxWidth: 800, 
                      mx: 'auto', 
                      mb: 2,
                      fontSize: { xs: '1.3rem', md: '1.8rem' },
                      fontWeight: 600,
                      color: '#2c3e50',
                      lineHeight: 1.4,
                    }}
                  >
                    Transforming Businesses Through Data-Driven Excellence
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ 
                      maxWidth: 700, 
                      mx: 'auto',
                      fontSize: { xs: '1rem', md: '1.2rem' },
                      color: 'text.secondary',
                      lineHeight: 1.6,
                      fontWeight: 400,
                    }}
                  >
                    Every metric tells a story of partnership, innovation, and measurable success
                  </Typography>
                </motion.div>
              </Box>

              {/* Stats Grid with New Design */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { 
                    xs: '1fr', 
                    sm: 'repeat(2, 1fr)', 
                    lg: 'repeat(4, 1fr)' 
                  },
                  gap: { xs: 4, md: 6 },
                  mb: { xs: 8, md: 12 },
                }}
              >
                  {[
                    {
                      value: '75+',
                      suffix: '',
                      label: 'Happy Clients',
                      subtitle: 'Businesses Empowered',
                      description: 'Partnering with diverse businesses, from startups to established names, to achieve their digital goals.',
                      icon: <HandshakeIcon sx={{ fontSize: { xs: 50, md: 60 } }} />,
                      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      shadowColor: '#667eea',
                      pattern: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    },
                    {
                      value: 'Up to 3X',
                      suffix: '',
                      label: 'Typical ROI',
                      subtitle: 'Value Delivered',
                      description: 'Our focused strategies consistently aim for and achieve significant returns on marketing investment.',
                      icon: <ShowChartIcon sx={{ fontSize: { xs: 50, md: 60 } }} />,
                      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      shadowColor: '#f093fb',
                      pattern: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)',
                    },
                    {
                      value: 'Millions',
                      suffix: '',
                      label: 'Reached Annually',
                      subtitle: 'Expanding Horizons',
                      description: 'Helping our clients connect with millions of potential customers through targeted digital outreach.',
                      icon: <VisibilityIcon sx={{ fontSize: { xs: 50, md: 60 } }} />,
                      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      shadowColor: '#4facfe',
                      pattern: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)',
                    },
                    {
                      value: 'High',
                      suffix: '',
                      label: 'Client Retention',
                      subtitle: 'Lasting Partnerships',
                      description: 'We pride ourselves on building strong, long-term relationships based on trust and mutual success.',
                      icon: <GroupsIcon sx={{ fontSize: { xs: 50, md: 60 } }} />,
                      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                      shadowColor: '#a8edea',
                      pattern: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                    },
                  ].map((stat, index) => (
                    <motion.div
                    key={index}
                    initial={{ 
                      opacity: 0, 
                      y: 60,
                      scale: 0.8,
                      rotateY: -15 
                    }}
                    whileInView={{ 
                      opacity: 1, 
                      y: 0,
                      scale: 1,
                      rotateY: 0 
                    }}
                    transition={{ 
                      duration: 0.8, 
                      delay: index * 0.2,
                      ease: "backOut"
                    }}
                    viewport={{ once: true, amount: 0.3 }}
                    style={{ perspective: '1000px' }}
                  >
                    <Paper
                      elevation={0}
                      component={motion.div}
                      whileHover={{
                        y: -20,
                        rotateY: 5,
                        scale: 1.05,
                        transition: { duration: 0.4, ease: "circOut" }
                      }}
                      sx={{
                        p: { xs: 4, md: 5 },
                        height: '100%',
                        borderRadius: '32px',
                        background: `
                          linear-gradient(145deg, 
                            rgba(255, 255, 255, 0.95) 0%, 
                            rgba(255, 255, 255, 0.8) 100%
                          )
                        `,
                        backdropFilter: 'blur(20px)',
                        border: `3px solid transparent`,
                        backgroundClip: 'padding-box',
                        boxShadow: `
                          0 20px 50px ${alpha(stat.shadowColor, 0.15)},
                          0 10px 25px ${alpha(stat.shadowColor, 0.1)},
                          inset 0 1px 0 rgba(255, 255, 255, 0.8)
                        `,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        '&:hover': {
                          boxShadow: `
                            0 40px 80px ${alpha(stat.shadowColor, 0.25)},
                            0 20px 40px ${alpha(stat.shadowColor, 0.15)},
                            inset 0 1px 0 rgba(255, 255, 255, 0.9)
                          `,
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '8px',
                          background: stat.gradient,
                          borderRadius: '32px 32px 0 0',
                        },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: '20%',
                          right: '-20%',
                          width: '150px',
                          height: '150px',
                          background: `linear-gradient(45deg, ${alpha(stat.shadowColor, 0.08)}, transparent)`,
                          clipPath: stat.pattern,
                          filter: 'blur(10px)',
                        }
                      }}
                    >
                      <Box sx={{ position: 'relative', zIndex: 1 }}>
                        {/* Icon Section */}
                        <Box
                          component={motion.div}
                          whileHover={{ 
                            rotate: [0, -10, 10, 0],
                            scale: [1, 1.2, 1],
                          }}
                          transition={{ duration: 0.6 }}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: { xs: 100, md: 120 },
                            height: { xs: 100, md: 120 },
                            borderRadius: '28px',
                            background: stat.gradient,
                            color: 'white',
                            mb: 4,
                            mx: 'auto',
                            boxShadow: `0 15px 40px ${alpha(stat.shadowColor, 0.4)}`,
                            position: 'relative',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              inset: '3px',
                              borderRadius: '25px',
                              background: `linear-gradient(145deg, ${alpha('#ffffff', 0.2)}, transparent)`,
                              pointerEvents: 'none',
                            }
                          }}
                        >
                          {stat.icon}
                        </Box>

                        {/* Value Display */}
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                          <motion.div
                            initial={{ scale: 0.3, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            transition={{ 
                              duration: 1, 
                              delay: index * 0.2 + 0.5,
                              ease: "backOut"
                            }}
                            viewport={{ once: true }}
                          >
                            <Typography
                              variant="h1"
                              component="div"
                              sx={{
                                fontWeight: 900,
                                fontSize: { xs: '3rem', md: '4rem' },
                                lineHeight: 0.9,
                                letterSpacing: '-0.03em',
                                background: stat.gradient,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 1,
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'center',
                                gap: 0.5,
                              }}
                            >
                              {stat.value}
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: { xs: '1.5rem', md: '2rem' },
                                  fontWeight: 700,
                                  background: stat.gradient,
                                  backgroundClip: 'text',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                }}
                              >
                                {stat.suffix}
                              </Typography>
                            </Typography>
                          </motion.div>

                          <Typography 
                            variant="h4" 
                            component="h3" 
                            sx={{ 
                              fontWeight: 800,
                              mb: 0.5,
                              fontSize: { xs: '1.3rem', md: '1.5rem' },
                              color: '#2c3e50',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {stat.label}
                          </Typography>

                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 600,
                              mb: 2,
                              fontSize: { xs: '0.9rem', md: '1rem' },
                              color: stat.shadowColor,
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                            }}
                          >
                            {stat.subtitle}
                          </Typography>
                          
                          <Typography 
                            variant="body1" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: { xs: '0.9rem', md: '1rem' }, 
                              lineHeight: 1.7,
                              fontWeight: 500,
                            }}
                          >
                            {stat.description}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </motion.div>
                ))}
              </Box>

              {/* Bottom CTA Section */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                viewport={{ once: true }}
              >
                <Box
                  sx={{
                    textAlign: 'center',
                    p: { xs: 6, md: 8 },
                    borderRadius: '40px',
                    background: `
                      linear-gradient(135deg, 
                        ${alpha('#667eea', 0.08)} 0%, 
                        ${alpha('#764ba2', 0.08)} 50%,
                        ${alpha('#f093fb', 0.08)} 100%
                      )
                    `,
                    border: `2px solid ${alpha('#667eea', 0.1)}`,
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(45deg, ${alpha('#f093fb', 0.05)}, ${alpha('#4facfe', 0.05)})`,
                      pointerEvents: 'none',
                    }
                  }}
                >
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography
                      variant="h2"
                      component="h3"
                      sx={{
                        fontWeight: 800,
                        mb: 3,
                        fontSize: { xs: '2rem', md: '3rem' },
                        background: `linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Let's Write Your Success Story Together
                    </Typography>
                    
                    <Typography
                      variant="h5"
                      sx={{ 
                        maxWidth: 700,
                        mx: 'auto',
                        mb: 4,
                        fontSize: { xs: '1.1rem', md: '1.3rem' },
                        color: 'text.secondary',
                        lineHeight: 1.7, // Increased for readability
                        fontWeight: 500,
                      }}
                    >
                      Inspired by these results? We're ready to help your business achieve its own digital marketing milestones.
                    </Typography>
                    
                    <Button
                      variant="contained"
                      size="large"
                      component={Link}
                      href="/contact"
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        py: 2,
                        px: 6,
                        borderRadius: '50px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                        boxShadow: `0 8px 25px ${alpha('#667eea', 0.35)}`,
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: `0 12px 35px ${alpha('#667eea', 0.45)}`,
                          background: `linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Discuss Your Project
                    </Button>
                  </Box>
                </Box>
              </motion.div>
            </Container>
          </Box>
          
          {/* CTA Section */}
          <motion.div
            variants={itemVariants}
            whileHover={{ 
              y: -5,
              transition: { duration: 0.3 }
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 5,
                borderRadius: 4,
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                border: `1px solid ${alpha(primaryColor, 0.1)}`,
                background: `linear-gradient(135deg, ${alpha(primaryColor, 0.05)} 0%, rgba(255,255,255,0.9) 100%)`,
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'center',
              }}
            >
              <Box
                component={motion.div}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.1 }}
                transition={{ duration: 1.5, delay: 0.5 }}
                sx={{
                  position: 'absolute',
                  top: -100,
                  right: -100,
                  width: 400,
                  height: 400,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${alpha(primaryColor, 0.2)} 0%, rgba(255, 255, 255, 0) 70%)`,
                  filter: 'blur(40px)',
                  zIndex: 0,
                }}
              />

              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography
                  variant="h3"
                  component="h3"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    color: primaryColor,
                  }}
                >
                  Ready to Start Your Growth Story?
                </Typography>
                
                <Typography
                  variant="h6"
                  color="textSecondary"
                  sx={{ 
                    maxWidth: 800,
                    mx: 'auto',
                    mb: 4,
                    fontSize: '1.1rem',
                    lineHeight: 1.7 // Increased for readability
                  }}
                >
                  We're excited to learn about your business and explore how our digital marketing services can help you reach new heights. 
                  A friendly chat is just a click away.
                </Typography>
                
                <Button
                  variant="contained"
                  size="large"
                  component={Link}
                  href="/contact"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    backgroundColor: primaryColor,
                    py: 1.5,
                    px: 4,
                    borderRadius: '50px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    '&:hover': {
                      backgroundColor: alpha(primaryColor, 0.9),
                      transform: 'translateY(-3px)',
                      boxShadow: `0 8px 20px ${alpha(primaryColor, 0.4)}`,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Talk to Our Experts
                </Button>
              </Box>
            </Paper>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ClientTestimonials;
