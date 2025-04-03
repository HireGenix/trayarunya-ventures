'use client';

import React, { useState, useRef } from 'react';
import { Box, Container, Typography, Paper, Avatar, Rating, Chip, IconButton, useTheme, useMediaQuery, Badge, Divider } from '@mui/material';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import StarIcon from '@mui/icons-material/Star';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    position: 'CTO, TechCorp',
    avatar: '/images/avatar1.jpg', // We'll create placeholder images later
    rating: 5,
    text: 'HireGenix has completely transformed our recruitment process. The AI-powered matching has saved us countless hours and helped us find candidates who are a perfect fit for our company culture.',
    product: 'HireGenix',
    productColor: '#ffaf06',
  },
  {
    id: 2,
    name: 'Michael Chen',
    position: 'Marketing Director, GrowthBrand',
    avatar: '/images/avatar2.jpg',
    rating: 5,
    text: 'MarketIQ provides insights that we couldn\'t get anywhere else. The platform has helped us identify market trends early and adjust our strategy accordingly. It\'s been a game-changer for our business.',
    product: 'MarketIQ',
    productColor: '#14bb87',
  },
  {
    id: 3,
    name: 'Dr. Emily Rodriguez',
    position: 'Medical Director, HealthFirst',
    avatar: '/images/avatar3.jpg',
    rating: 5,
    text: 'MedCodeX has significantly reduced our coding errors and accelerated our billing process. The AI is remarkably accurate and the interface is intuitive even for staff with minimal technical experience.',
    product: 'MedCodeX',
    productColor: '#d92c4a',
  },
  {
    id: 4,
    name: 'James Wilson',
    position: 'HR Manager, Enterprise Solutions',
    avatar: '/images/avatar4.jpg',
    rating: 5,
    text: 'As someone who has tried multiple recruitment platforms, I can confidently say that HireGenix stands out from the crowd. The AI recommendations are spot-on, and the interface is incredibly user-friendly.',
    product: 'HireGenix',
    productColor: '#ffaf06',
  },
  {
    id: 5,
    name: 'Sophia Garcia',
    position: 'CEO, StartupVision',
    avatar: '/images/avatar5.jpg',
    rating: 5,
    text: 'MarketIQ has been instrumental in helping our startup navigate a competitive market. The insights we\'ve gained have directly contributed to our growth strategy and success.',
    product: 'MarketIQ',
    productColor: '#14bb87',
  },
];

const TestimonialsSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [activeIndex, setActiveIndex] = useState(0);

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

  // Calculate visible testimonials based on screen size
  const getVisibleCount = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };

  const visibleCount = getVisibleCount();
  const maxIndex = testimonials.length - visibleCount;

  const handleNext = () => {
    setActiveIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  };

  // Get current visible testimonials
  const visibleTestimonials = () => {
    const wrappedIndex = activeIndex % testimonials.length;
    const items = [];
    
    for (let i = 0; i < visibleCount; i++) {
      const index = (wrappedIndex + i) % testimonials.length;
      items.push(testimonials[index]);
    }
    
    return items;
  };

  return (
    <Box>
      {/* Section Divider */}
      <Box 
        sx={{ 
          height: 100, 
          background: 'linear-gradient(to bottom, #f9f9f9, #e6f7ff)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          component={motion.div}
          initial={{ y: 100 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          sx={{
            position: 'absolute',
            bottom: -2,
            left: 0,
            right: 0,
            height: 80,
            background: '#e6f7ff',
            clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 75% 50%, 50% 0, 25% 50%, 0 0)',
            zIndex: 1,
          }}
        />
      </Box>
      
      {/* Main Section */}
      <Box
        sx={{
          py: { xs: 10, md: 14 },
          backgroundColor: '#e6f7ff', // Different background color
          position: 'relative',
          overflow: 'hidden',
          color: '#333333',
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
            opacity: 0.05,
            backgroundImage: 'radial-gradient(circle, #0078d4 1px, transparent 1px)',
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
            background: `radial-gradient(circle, rgba(0, 120, 212, 0.3) 0%, rgba(255, 255, 255, 0) 70%)`,
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
            background: `radial-gradient(circle, rgba(0, 120, 212, 0.2) 0%, rgba(255, 255, 255, 0) 70%)`,
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
          <Box sx={{ textAlign: 'center', mb: 10 }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Chip
                label="TESTIMONIALS"
                sx={{
                  mb: 3,
                  py: 1.5,
                  px: 2,
                  borderRadius: '50px',
                  background: `linear-gradient(90deg, #0078d4, #0078d4)`,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  color: '#333333',
                }}
              >
                What Our Clients Say
              </Typography>
              <Typography
                variant="h5"
                component="p"
                sx={{ mb: 2, maxWidth: 700, mx: 'auto', fontWeight: 400, color: 'text.secondary' }}
              >
                Hear from businesses that have transformed their operations with our solutions
              </Typography>
            </motion.div>
          </Box>

          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                justifyContent: 'center',
                mb: 4,
              }}
            >
              <AnimatePresence>
                {visibleTestimonials().map((testimonial, index) => (
                  <motion.div
                    key={`${testimonial.id}-${index}`}
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
                        boxShadow: '0 30px 60px rgba(0,120,212,0.2)',
                        transition: { duration: 0.4, ease: "easeOut" }
                      }}
                      sx={{
                        p: 0,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: '0 15px 35px rgba(0,120,212,0.1)',
                        transition: 'all 0.4s ease',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
                        border: '1px solid rgba(0, 120, 212, 0.08)',
                        position: 'relative',
                      }}
                    >
                      {/* Glowing border effect */}
                      <Box
                        component={motion.div}
                        animate={{ 
                          boxShadow: [
                            `0 0 10px ${testimonial.productColor}40`,
                            `0 0 20px ${testimonial.productColor}20`,
                            `0 0 10px ${testimonial.productColor}40`
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
                          border: `1px solid ${testimonial.productColor}30`,
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
                          color: 'rgba(255, 255, 255, 0.05)',
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
                          background: `linear-gradient(135deg, ${testimonial.productColor}15 0%, rgba(30, 30, 30, 0) 70%)`,
                          opacity: 0.5,
                          zIndex: 0,
                        }}
                      />

                      {/* Card Content */}
                      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Product header */}
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            mb: 3
                          }}
                        >
                          <Box
                            sx={{
                              px: 2,
                              py: 0.75,
                              borderRadius: '12px',
                              background: `linear-gradient(135deg, ${testimonial.productColor}15, ${testimonial.productColor}30)`,
                              border: `1px solid ${testimonial.productColor}40`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <Box
                              component={motion.div}
                              animate={{ rotate: [0, 10, 0] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                            >
                              <AutoAwesomeIcon fontSize="small" sx={{ color: testimonial.productColor }} />
                            </Box>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                color: testimonial.productColor,
                                fontWeight: 700,
                                letterSpacing: '0.5px'
                              }}
                            >
                              {testimonial.product}
                            </Typography>
                          </Box>
                          
                          <Rating
                            value={testimonial.rating}
                            readOnly
                            size="small"
                            icon={<StarIcon fontSize="inherit" sx={{ color: testimonial.productColor }} />}
                            emptyIcon={<StarIcon fontSize="inherit" sx={{ color: 'rgba(0, 0, 0, 0.2)' }} />}
                          />
                        </Box>
                        
                        {/* Testimonial text */}
                        <Typography
                          variant="body1"
                          sx={{
                            mb: 4,
                            fontStyle: 'italic',
                            flexGrow: 1,
                            position: 'relative',
                            zIndex: 1,
                            color: '#333333',
                            lineHeight: 1.7,
                            fontSize: '1.05rem',
                            '&::before': {
                              content: '"\\201C"',
                              fontSize: '1.5rem',
                              color: testimonial.productColor,
                              marginRight: '0.2rem',
                              fontFamily: 'serif',
                              fontWeight: 700,
                            },
                            '&::after': {
                              content: '"\\201D"',
                              fontSize: '1.5rem',
                              color: testimonial.productColor,
                              marginLeft: '0.2rem',
                              fontFamily: 'serif',
                              fontWeight: 700,
                            }
                          }}
                        >
                          {testimonial.text}
                        </Typography>

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
                            background: `linear-gradient(90deg, ${testimonial.productColor}50, ${testimonial.productColor}10)`,
                            mb: 3,
                            borderRadius: 4,
                          }}
                        />

                        {/* Author info with animated avatar */}
                        <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                          <Box
                            component={motion.div}
                            whileHover={{ 
                              scale: 1.1,
                              rotate: 5,
                              transition: { duration: 0.3 }
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 60,
                                height: 60,
                                mr: 2,
                                backgroundColor: testimonial.productColor,
                                color: testimonial.productColor === '#ffaf06' ? '#000000' : '#ffffff',
                                fontWeight: 'bold',
                                boxShadow: `0 4px 15px ${testimonial.productColor}30`,
                                border: `2px solid ${testimonial.productColor}30`,
                              }}
                            >
                              {testimonial.name.charAt(0)}
                            </Avatar>
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
                            <Box
                              component={motion.div}
                              whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
                            >
                              <Rating
                                value={testimonial.rating}
                                readOnly
                                size="small"
                                sx={{ mt: 0.5 }}
                                icon={<StarIcon fontSize="inherit" sx={{ color: testimonial.productColor }} />}
                                emptyIcon={<StarIcon fontSize="inherit" sx={{ color: 'rgba(0, 0, 0, 0.2)' }} />}
                              />
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Box>

            {/* Navigation Controls */}
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
                  boxShadow: '0 5px 15px rgba(0,120,212,0.2)',
                }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePrev}
                sx={{
                  width: 50,
                  height: 50,
                  backgroundColor: 'white',
                  color: '#0078d4',
                  boxShadow: '0 4px 12px rgba(0,120,212,0.15)',
                  border: '2px solid rgba(0,120,212,0.1)',
                  '&:hover': {
                    backgroundColor: 'white',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <ArrowBackIosNewIcon fontSize="small" />
              </IconButton>
              
              <IconButton
                component={motion.button}
                whileHover={{ 
                  scale: 1.1,
                  boxShadow: '0 5px 15px rgba(0,120,212,0.2)',
                }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                sx={{
                  width: 50,
                  height: 50,
                  backgroundColor: 'white',
                  color: '#0078d4',
                  boxShadow: '0 4px 12px rgba(0,120,212,0.15)',
                  border: '2px solid rgba(0,120,212,0.1)',
                  '&:hover': {
                    backgroundColor: 'white',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <ArrowForwardIosIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default TestimonialsSection;
