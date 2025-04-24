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
  Grid
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';

// Enhanced testimonials data with logos
const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    position: 'Marketing Director',
    company: 'TechNova Solutions',
    image: 'https://randomuser.me/api/portraits/women/32.jpg',
    logo: 'https://placehold.co/200x80/4285F4/FFFFFF/png?text=TechNova',
    quote: 'Working with Trayarunya Ventures transformed our digital marketing strategy. Their data-driven approach and creative campaigns increased our lead generation by 175% and reduced our cost per acquisition by 40%. They truly understand our business goals and deliver exceptional results.',
    rating: 5,
    industry: 'Technology',
    results: 'Increased lead generation by 175%, reduced cost per acquisition by 40%',
    color: '#4285F4'
  },
  {
    id: 2,
    name: 'Michael Chen',
    position: 'CEO',
    company: 'GreenLeaf Organics',
    image: 'https://randomuser.me/api/portraits/men/64.jpg',
    logo: 'https://placehold.co/200x80/34A853/FFFFFF/png?text=GreenLeaf',
    quote: 'As a growing e-commerce business, we needed a partner who could help us stand out in a crowded market. Trayarunya Ventures delivered beyond our expectations. Their SEO and content strategy increased our organic traffic by 230% and our conversion rate improved significantly. Their team is responsive, innovative, and truly invested in our success.',
    rating: 5,
    industry: 'E-commerce',
    results: 'Increased organic traffic by 230%, improved conversion rate by 45%',
    color: '#34A853'
  },
  {
    id: 3,
    name: 'Priya Patel',
    position: 'Head of Digital',
    company: 'Horizon Healthcare',
    image: 'https://randomuser.me/api/portraits/women/45.jpg',
    logo: 'https://placehold.co/200x80/EA4335/FFFFFF/png?text=Horizon',
    quote: 'In the highly regulated healthcare industry, finding a marketing partner who understands compliance while delivering results is challenging. Trayarunya Ventures excels at both. Their targeted campaigns and thought leadership strategy positioned us as industry leaders and generated high-quality leads for our services.',
    rating: 5,
    industry: 'Healthcare',
    results: 'Established thought leadership position, increased qualified leads by 120%',
    color: '#EA4335'
  },
  {
    id: 4,
    name: 'David Wilson',
    position: 'Founder',
    company: 'Velocity Fitness',
    image: 'https://randomuser.me/api/portraits/men/22.jpg',
    logo: 'https://placehold.co/200x80/FBBC05/FFFFFF/png?text=Velocity',
    quote: 'As a small business owner, I was skeptical about investing in digital marketing. Trayarunya Ventures changed my perspective completely. Their localized SEO strategy and social media campaigns helped us compete with much larger chains. Our class bookings increased by 85% within just three months of working together.',
    rating: 5,
    industry: 'Fitness',
    results: 'Increased class bookings by 85%, grew social media following by 200%',
    color: '#FBBC05'
  },
];

const ClientTestimonials = () => {
  const theme = useTheme();
  const primaryColor = '#8E44AD';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
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

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 }
      }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -1000 : 1000,
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 }
      }
    })
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const floatVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
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
        backgroundColor: alpha(primaryColor, 0.02),
        position: 'relative',
        overflow: 'hidden'
      }}
    >
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

      {/* Floating elements */}
      {[...Array(5)].map((_, i) => (
        <Box
          key={i}
          component={motion.div}
          variants={floatVariants}
          animate="animate"
          sx={{
            position: 'absolute',
            top: `${10 + i * 15}%`,
            left: `${70 + i * 5}%`,
            width: 10 + i * 5,
            height: 10 + i * 5,
            borderRadius: '50%',
            backgroundColor: alpha(primaryColor, 0.3),
            zIndex: 0,
          }}
        />
      ))}
      
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
                  background: `linear-gradient(90deg, ${primaryColor} 0%, #333333 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                What Our Clients Say
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
                  lineHeight: 1.6
                }}
              >
                Hear directly from our clients about their experiences and the results we've delivered.
                Our success is measured by the success of our clients.
              </Typography>
            </motion.div>
          </Box>

          {/* Testimonial Carousel */}
          <Box sx={{ position: 'relative', mb: 6 }}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 3, md: 6 },
                    borderRadius: 4,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                    border: `1px solid ${alpha(testimonials[currentIndex].color, 0.2)}`,
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: { xs: 'auto', md: 400 },
                    backgroundColor: 'white',
                  }}
                >
                  {/* Animated gradient background */}
                  <Box
                    component={motion.div}
                    variants={pulseVariants}
                    animate="animate"
                    sx={{
                      position: 'absolute',
                      top: -100,
                      right: -100,
                      width: 400,
                      height: 400,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${alpha(testimonials[currentIndex].color, 0.1)} 0%, rgba(255, 255, 255, 0) 70%)`,
                      filter: 'blur(40px)',
                      zIndex: 0,
                    }}
                  />
                  
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 40,
                      left: 40,
                      color: alpha(testimonials[currentIndex].color, 0.1),
                      transform: 'scale(4)',
                      transformOrigin: 'top left',
                      zIndex: 0,
                    }}
                  >
                    <FormatQuoteIcon fontSize="large" />
                  </Box>
                  
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 6 }}>
                      <Box sx={{ width: { xs: '100%', md: '70%' } }}>
                        <Typography
                          variant="h4"
                          component="blockquote"
                          sx={{
                            fontStyle: 'italic',
                            lineHeight: 1.6,
                            mb: 4,
                            fontWeight: 500,
                            color: 'text.primary',
                            position: 'relative',
                            pl: { xs: 0, md: 5 },
                            '&::before': {
                              content: '"""',
                              position: { xs: 'relative', md: 'absolute' },
                              left: 0,
                              top: 0,
                              fontSize: '4rem',
                              lineHeight: 1,
                              color: testimonials[currentIndex].color,
                              fontFamily: 'Georgia, serif',
                              opacity: 0.5,
                              display: { xs: 'none', md: 'block' }
                            }
                          }}
                        >
                          {testimonials[currentIndex].quote}
                        </Typography>
                        
                        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                          <Rating
                            value={testimonials[currentIndex].rating}
                            readOnly
                            icon={<StarIcon fontSize="inherit" sx={{ color: '#FFD700' }} />}
                            emptyIcon={<StarIcon fontSize="inherit" sx={{ color: alpha('#FFD700', 0.3) }} />}
                            precision={0.5}
                            size="large"
                          />
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              ml: 2,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              backgroundColor: alpha('#4CAF50', 0.1),
                            }}
                          >
                            <VerifiedIcon sx={{ color: '#4CAF50', fontSize: 16, mr: 0.5 }} />
                            <Typography variant="caption" fontWeight={600} sx={{ color: '#4CAF50' }}>
                              Verified Client
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            backgroundColor: alpha(testimonials[currentIndex].color, 0.05),
                            border: `1px solid ${alpha(testimonials[currentIndex].color, 0.2)}`,
                            display: 'inline-block',
                            mb: { xs: 3, md: 0 }
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={700} color={testimonials[currentIndex].color} gutterBottom>
                            Results Achieved:
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {testimonials[currentIndex].results}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ 
                        width: { xs: '100%', md: '30%' }, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        position: 'relative'
                      }}>
                        <Box
                          component={motion.div}
                          variants={floatVariants}
                          animate="animate"
                          sx={{
                            position: 'absolute',
                            top: -20,
                            right: -20,
                            width: 80,
                            height: 80,
                            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                            background: `linear-gradient(135deg, ${alpha(testimonials[currentIndex].color, 0.2)} 0%, ${alpha(primaryColor, 0.1)} 100%)`,
                            border: `2px solid ${alpha(testimonials[currentIndex].color, 0.3)}`,
                            zIndex: 0,
                          }}
                        />
                        
                        <Avatar
                          src={testimonials[currentIndex].image}
                          alt={testimonials[currentIndex].name}
                          sx={{
                            width: 120,
                            height: 120,
                            mb: 2,
                            border: `4px solid ${alpha(testimonials[currentIndex].color, 0.3)}`,
                            boxShadow: `0 8px 20px ${alpha(testimonials[currentIndex].color, 0.2)}`,
                          }}
                        />
                        <Typography variant="h6" fontWeight={700} align="center" gutterBottom>
                          {testimonials[currentIndex].name}
                        </Typography>
                        <Typography variant="body1" align="center" gutterBottom>
                          {testimonials[currentIndex].position}
                        </Typography>
                        
                        <Box 
                          component="img"
                          src={testimonials[currentIndex].logo}
                          alt={testimonials[currentIndex].company}
                          sx={{
                            maxWidth: 120,
                            maxHeight: 40,
                            my: 2,
                            objectFit: 'contain'
                          }}
                        />
                        
                        <Box
                          sx={{
                            mt: 1,
                            px: 2,
                            py: 0.5,
                            borderRadius: 10,
                            backgroundColor: alpha(testimonials[currentIndex].color, 0.1),
                            color: testimonials[currentIndex].color,
                            display: 'inline-block',
                          }}
                        >
                          <Typography variant="caption" fontWeight={600}>
                            {testimonials[currentIndex].industry}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation Buttons */}
            <IconButton
              onClick={handlePrev}
              sx={{
                position: 'absolute',
                top: '50%',
                left: { xs: -16, md: -24 },
                transform: 'translateY(-50%)',
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                '&:hover': {
                  backgroundColor: alpha(primaryColor, 0.1),
                },
                zIndex: 2,
              }}
            >
              <ArrowBackIosNewIcon sx={{ color: primaryColor }} />
            </IconButton>
            
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                top: '50%',
                right: { xs: -16, md: -24 },
                transform: 'translateY(-50%)',
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                '&:hover': {
                  backgroundColor: alpha(primaryColor, 0.1),
                },
                zIndex: 2,
              }}
            >
              <ArrowForwardIosIcon sx={{ color: primaryColor }} />
            </IconButton>
          </Box>
          
          {/* Testimonial Indicators */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 10 }}>
            {testimonials.map((_, index) => (
              <Box
                key={index}
                component="button"
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1);
                  setCurrentIndex(index);
                }}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: index === currentIndex ? testimonials[currentIndex].color : alpha(testimonials[currentIndex].color, 0.2),
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: index === currentIndex ? testimonials[currentIndex].color : alpha(testimonials[currentIndex].color, 0.4),
                  },
                }}
              />
            ))}
          </Box>
          
          {/* Stats Section */}
          <Box sx={{ mt: 6 }}>
            <motion.div variants={itemVariants}>
              <Typography
                variant="h3"
                component="h3"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  textAlign: 'center',
                  color: primaryColor
                }}
              >
                Our Impact by the Numbers
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
                  textAlign: 'center',
                  fontSize: '1.1rem',
                  lineHeight: 1.6
                }}
              >
                We measure our success by the results we deliver for our clients.
                Here's a snapshot of what we've achieved.
              </Typography>
            </motion.div>
            
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 4,
                mb: 10
              }}
            >
              {[
                {
                  value: '200+',
                  label: 'Clients Served',
                  description: 'Across various industries and business sizes',
                  color: '#4CAF50',
                  icon: '🏢'
                },
                {
                  value: '85%',
                  label: 'Average ROI',
                  description: 'Return on marketing investment for our clients',
                  color: '#2196F3',
                  icon: '📈'
                },
                {
                  value: '150M+',
                  label: 'Impressions Generated',
                  description: 'Across digital campaigns in the last year',
                  color: '#FF9800',
                  icon: '👁️'
                },
                {
                  value: '92%',
                  label: 'Client Retention',
                  description: 'Our clients stay with us for the long term',
                  color: '#9C27B0',
                  icon: '🤝'
                },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  custom={index}
                  whileHover={{ 
                    y: -10,
                    transition: { duration: 0.3 }
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: `1px solid ${alpha(stat.color, 0.2)}`,
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: `0 15px 40px ${alpha(stat.color, 0.2)}`,
                        borderColor: alpha(stat.color, 0.4),
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: 6,
                        backgroundColor: stat.color,
                      }}
                    />
                    <Box
                      sx={{
                        fontSize: '2rem',
                        mb: 2,
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Typography
                      variant="h2"
                      component="div"
                      sx={{
                        fontWeight: 800,
                        color: stat.color,
                        mb: 1,
                        fontSize: { xs: '2.5rem', md: '3rem' }
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      {stat.label}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {stat.description}
                    </Typography>
                  </Paper>
                </motion.div>
              ))}
            </Box>
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
                variants={pulseVariants}
                animate="animate"
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
                  Ready to Join Our Success Stories?
                </Typography>
                
                <Typography
                  variant="h6"
                  color="textSecondary"
                  sx={{ 
                    maxWidth: 800,
                    mx: 'auto',
                    mb: 4,
                    fontSize: '1.1rem',
                    lineHeight: 1.6
                  }}
                >
                  Let's discuss how our digital marketing expertise can help your business achieve remarkable results.
                  Schedule a free consultation with our team today.
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
                  Schedule a Free Consultation
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
