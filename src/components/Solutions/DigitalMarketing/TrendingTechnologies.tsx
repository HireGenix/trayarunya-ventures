'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid,
  Button,
  useTheme, 
  alpha,
  Tabs,
  Tab,
  Divider,
  Chip,
  Avatar,
  IconButton
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PsychologyIcon from '@mui/icons-material/Psychology';
import DataThresholdingIcon from '@mui/icons-material/DataThresholding';
import VrpanoIcon from '@mui/icons-material/Vrpano';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BarChartIcon from '@mui/icons-material/BarChart';
import Link from 'next/link';

// Trending technologies data
const technologies = [
  {
    id: 'ai-marketing',
    title: 'AI-Powered Marketing',
    icon: <SmartToyIcon fontSize="large" />,
    color: '#4CAF50',
    description: 'Leverage artificial intelligence to personalize customer experiences, optimize campaigns in real-time, and predict consumer behavior with unprecedented accuracy.',
    benefits: [
      'Hyper-personalized customer experiences',
      'Predictive analytics for campaign optimization',
      'Automated content generation and curation',
      'Real-time bidding and ad placement optimization'
    ],
    stats: [
      { value: '37%', label: 'Conversion Increase' },
      { value: '45%', label: 'Time Saved' },
      { value: '68%', label: 'Targeting Accuracy' }
    ],
    caseStudy: 'Increased conversion rates by 37% for an e-commerce client by implementing AI-driven product recommendations and personalized email campaigns.',
    image: 'https://images.unsplash.com/photo-1677442135136-760c813028c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'voice-search',
    title: 'Voice Search Optimization',
    icon: <PsychologyIcon fontSize="large" />,
    color: '#2196F3',
    description: 'Optimize your digital presence for the rapidly growing voice search market, ensuring your brand is discoverable through smart speakers and voice assistants.',
    benefits: [
      'Capture featured snippets for voice search results',
      'Local SEO optimization for voice queries',
      'Conversational keyword strategy development',
      'Voice app and skill development for major platforms'
    ],
    stats: [
      { value: '42%', label: 'Reservation Increase' },
      { value: '58%', label: 'Local Search Visibility' },
      { value: '3.5x', label: 'ROI' }
    ],
    caseStudy: 'Helped a local restaurant chain increase reservations by 42% through voice search optimization and custom Alexa skill development.',
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'data-analytics',
    title: 'Advanced Data Analytics',
    icon: <DataThresholdingIcon fontSize="large" />,
    color: '#FF9800',
    description: 'Harness the power of big data and advanced analytics to gain deeper insights into customer behavior, campaign performance, and market trends.',
    benefits: [
      'Multi-touch attribution modeling',
      'Customer journey mapping and analysis',
      'Predictive lifetime value calculations',
      'Competitive intelligence gathering and analysis'
    ],
    stats: [
      { value: '28%', label: 'Lead Quality Increase' },
      { value: '40%', label: 'Marketing ROI' },
      { value: '52%', label: 'Decision Accuracy' }
    ],
    caseStudy: 'Developed a custom analytics dashboard for a B2B software company that revealed previously hidden conversion patterns, leading to a 28% increase in qualified leads.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'ar-vr',
    title: 'AR/VR Marketing Experiences',
    icon: <VrpanoIcon fontSize="large" />,
    color: '#9C27B0',
    description: 'Create immersive augmented and virtual reality experiences that captivate your audience and provide unique, memorable brand interactions.',
    benefits: [
      'Virtual product demonstrations and try-ons',
      'Immersive brand storytelling experiences',
      'Interactive AR advertisements and packaging',
      'Virtual showrooms and event spaces'
    ],
    stats: [
      { value: '56%', label: 'Purchase Increase' },
      { value: '23%', label: 'Return Reduction' },
      { value: '78%', label: 'Brand Engagement' }
    ],
    caseStudy: 'Created an AR furniture visualization app for a home decor brand that increased online purchases by 56% and reduced returns by 23%.',
    image: 'https://images.unsplash.com/photo-1626379953822-baec19c3accd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
];

const TrendingTechnologies = () => {
  const theme = useTheme();
  const primaryColor = '#8E44AD';
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
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

  const tabContentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      y: -20,
      transition: { 
        duration: 0.3,
        ease: "easeIn"
      }
    }
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
        backgroundColor: alpha(primaryColor, 0.03),
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
      
      <Box
        component={motion.div}
        animate={{ 
          rotate: [360, 0],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 180,
          ease: "linear"
        }}
        sx={{
          position: 'absolute',
          bottom: '-15%',
          left: '-15%',
          width: '600px',
          height: '600px',
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
            backgroundColor: alpha(technologies[i % technologies.length].color, 0.3),
            zIndex: 0,
          }}
        />
      ))}
      
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div variants={containerVariants}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div variants={itemVariants}>
              <Chip
                icon={<TrendingUpIcon />}
                label="CUTTING-EDGE TECHNOLOGIES"
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
                Trending in Digital Marketing
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
                Stay ahead of the competition with our innovative approaches to the latest marketing technologies.
                Our experts implement cutting-edge solutions that drive real business results.
              </Typography>
            </motion.div>
            
            <Box sx={{ mb: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1,
                  borderRadius: 6,
                  backgroundColor: alpha(primaryColor, 0.05),
                  border: `1px solid ${alpha(primaryColor, 0.1)}`,
                  display: 'inline-block',
                }}
              >
                <Tabs 
                  value={selectedTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{
                    '& .MuiTabs-indicator': {
                      backgroundColor: 'transparent',
                    },
                    '& .MuiTab-root': {
                      minWidth: 120,
                      fontWeight: 600,
                      fontSize: '1rem',
                      textTransform: 'none',
                      borderRadius: 5,
                      mx: 0.5,
                      transition: 'all 0.3s ease',
                      '&.Mui-selected': {
                        color: 'white',
                        backgroundColor: technologies[selectedTab].color,
                        boxShadow: `0 4px 10px ${alpha(technologies[selectedTab].color, 0.4)}`,
                      },
                    },
                  }}
                >
                  {technologies.map((tech, index) => (
                    <Tab 
                      key={tech.id} 
                      label={tech.title}
                      icon={React.cloneElement(tech.icon, { 
                        style: { color: selectedTab === index ? 'white' : tech.color } 
                      })}
                      iconPosition="start"
                    />
                  ))}
                </Tabs>
              </Paper>
            </Box>
          </Box>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={tabContentVariants}
            >
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 5 },
                  borderRadius: 4,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  border: `1px solid ${alpha(technologies[selectedTab].color, 0.2)}`,
                  backgroundColor: 'white',
                  position: 'relative',
                  overflow: 'hidden',
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
                    background: `radial-gradient(circle, ${alpha(technologies[selectedTab].color, 0.2)} 0%, rgba(255, 255, 255, 0) 70%)`,
                    filter: 'blur(40px)',
                    zIndex: 0,
                  }}
                />

                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', md: 'row' }, 
                  gap: 6, 
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                    <Box
                      sx={{
                        position: 'relative',
                        height: { xs: 300, md: 400 },
                        width: '100%',
                        borderRadius: 4,
                        overflow: 'hidden',
                        boxShadow: `0 20px 40px ${alpha(technologies[selectedTab].color, 0.2)}`,
                        border: `1px solid ${alpha(technologies[selectedTab].color, 0.1)}`,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          borderRadius: 4,
                          padding: '2px',
                          background: `linear-gradient(135deg, ${technologies[selectedTab].color}, ${alpha(technologies[selectedTab].color, 0.5)})`,
                          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          WebkitMaskComposite: 'xor',
                          maskComposite: 'exclude',
                          zIndex: 3,
                          pointerEvents: 'none'
                        }
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: alpha(technologies[selectedTab].color, 0.1),
                          zIndex: 1,
                        }}
                      />
                      <Box
                        component="img"
                        src={technologies[selectedTab].image}
                        alt={technologies[selectedTab].title}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.5s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                          },
                        }}
                      />

                      {/* Stats overlay */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          width: '100%',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                          p: 3,
                          zIndex: 2,
                          display: 'flex',
                          justifyContent: 'space-around',
                        }}
                      >
                        {technologies[selectedTab].stats.map((stat, idx) => (
                          <Box key={idx} sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" color="white" fontWeight={700}>
                              {stat.value}
                            </Typography>
                            <Typography variant="caption" color="rgba(255,255,255,0.8)">
                              {stat.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 2,
                        py: 1,
                        mb: 2,
                        borderRadius: 2,
                        backgroundColor: alpha(technologies[selectedTab].color, 0.1),
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{ 
                            bgcolor: technologies[selectedTab].color,
                            color: 'white',
                            mr: 1.5,
                            boxShadow: `0 4px 8px ${alpha(technologies[selectedTab].color, 0.4)}`,
                          }}
                        >
                          {React.cloneElement(technologies[selectedTab].icon, { 
                            style: { fontSize: '1.2rem' } 
                          })}
                        </Avatar>
                        <Typography 
                          variant="h5" 
                          component="span" 
                          fontWeight={700}
                          sx={{ color: technologies[selectedTab].color }}
                        >
                          {technologies[selectedTab].title}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem', lineHeight: 1.7 }}>
                      {technologies[selectedTab].description}
                    </Typography>
                    
                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: technologies[selectedTab].color }}>
                      Key Benefits:
                    </Typography>
                    
                    <Box component="ul" sx={{ pl: 0, listStyle: 'none', mb: 3 }}>
                      {technologies[selectedTab].benefits.map((benefit, index) => (
                        <Box 
                          component="li" 
                          key={index} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mb: 1.5 
                          }}
                        >
                          <CheckCircleIcon sx={{ color: technologies[selectedTab].color, mr: 1.5 }} />
                          <Typography variant="body1" fontWeight={500}>
                            {benefit}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        backgroundColor: alpha(technologies[selectedTab].color, 0.05),
                        border: `1px solid ${alpha(technologies[selectedTab].color, 0.2)}`,
                        mb: 3,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AutoAwesomeIcon sx={{ color: technologies[selectedTab].color, mr: 1 }} />
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: technologies[selectedTab].color }}>
                          Success Story
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {technologies[selectedTab].caseStudy}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          endIcon={<ArrowForwardIcon />}
                          sx={{
                            color: technologies[selectedTab].color,
                            '&:hover': {
                              backgroundColor: alpha(technologies[selectedTab].color, 0.1),
                            }
                          }}
                        >
                          View Case Study
                        </Button>
                      </Box>
                    </Box>

                    <Button
                      variant="contained"
                      size="large"
                      component={Link}
                      href="/contact"
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        backgroundColor: technologies[selectedTab].color,
                        py: 1.2,
                        px: 3,
                        borderRadius: '50px',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: alpha(technologies[selectedTab].color, 0.9),
                          transform: 'translateY(-3px)',
                          boxShadow: `0 8px 20px ${alpha(technologies[selectedTab].color, 0.3)}`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Implement This Technology
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </motion.div>
          </AnimatePresence>

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
                mt: 8,
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
                  Ready to Innovate?
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
                  Our team of digital marketing experts can help you implement these cutting-edge technologies
                  to give your business a competitive advantage.
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
                  Schedule a Technology Consultation
                </Button>
              </Box>
            </Paper>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default TrendingTechnologies;
