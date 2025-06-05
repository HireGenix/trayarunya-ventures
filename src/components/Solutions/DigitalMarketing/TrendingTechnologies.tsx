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
    title: 'AI-Driven Marketing',
    icon: <SmartToyIcon fontSize="large" />,
    color: '#4CAF50',
    description: 'Unlock the power of AI to deeply understand your customers, personalize their journeys, and make your campaigns smarter and more effective than ever.',
    benefits: [
      'Create truly personal customer connections',
      'Make smarter decisions with predictive insights',
      'Automate tasks and free up your team',
      'Optimize ad spend for better returns'
    ],
    stats: [
      { value: 'Up to 25%', label: 'Conversion Lift' }, // Adjusted
      { value: 'Measurable', label: 'Time Savings' }, // Adjusted
      { value: 'Improved', label: 'Targeting' } // Adjusted
    ],
    caseStudy: 'For an e-commerce partner, our AI-powered recommendations and personalized emails led to a notable increase in conversion rates and customer engagement.',
    image: 'https://images.unsplash.com/photo-1677442135136-760c813028c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'voice-search',
    title: 'Voice Search Readiness',
    icon: <PsychologyIcon fontSize="large" />,
    color: '#2196F3',
    description: 'As more people use voice assistants, make sure your business is heard. We help you optimize for voice search so customers can find you effortlessly.',
    benefits: [
      'Be found in voice search results',
      'Boost local discovery via voice',
      'Align with natural, conversational queries',
      'Explore voice apps for deeper engagement'
    ],
    stats: [
      { value: 'Increased', label: 'Local Inquiries' }, // Adjusted
      { value: 'Better', label: 'Visibility' }, // Adjusted
      { value: 'Positive', label: 'User Experience' } // Adjusted
    ],
    caseStudy: 'We helped a local service business see a clear rise in inquiries by optimizing for voice search and developing a helpful Alexa skill.',
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'data-analytics',
    title: 'Insightful Data Analytics',
    icon: <DataThresholdingIcon fontSize="large" />,
    color: '#FF9800',
    description: 'Turn your data into your superpower. We help you uncover valuable insights about your customers, campaigns, and market to make smarter, data-backed decisions.',
    benefits: [
      'Understand what truly drives conversions',
      'Map and improve customer journeys',
      'Predict future trends and customer needs',
      'Gain an edge with competitor insights'
    ],
    stats: [
      { value: 'Improved', label: 'Lead Quality' }, // Adjusted
      { value: 'Enhanced', label: 'Marketing ROI' }, // Adjusted
      { value: 'Smarter', label: 'Decisions' } // Adjusted
    ],
    caseStudy: 'For a B2B client, our custom analytics dashboard highlighted key conversion pathways, leading to a significant improvement in lead quality and campaign focus.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'ar-vr',
    title: 'Immersive AR/VR Experiences',
    icon: <VrpanoIcon fontSize="large" />,
    color: '#9C27B0',
    description: 'Step into the future of customer engagement. We create captivating AR and VR experiences that let your audience interact with your brand in unforgettable ways.',
    benefits: [
      'Offer virtual product try-ons & demos',
      'Tell your brand story in immersive ways',
      'Create buzz with interactive AR ads',
      'Build virtual showrooms or event experiences'
    ],
    stats: [
      { value: 'Higher', label: 'Purchase Intent' }, // Adjusted
      { value: 'Reduced', label: 'Return Rates' }, // Adjusted
      { value: 'Memorable', label: 'Brand Interaction' } // Adjusted
    ],
    caseStudy: 'An AR app allowing customers to visualize products in their own space helped a retail client boost online sales and see fewer returns.',
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
                The Future of Marketing is Here
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
                We're passionate about leveraging the latest marketing technologies to give your business an edge. 
                Explore how these innovations can create real results and exciting opportunities for growth.
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
                      {/* Interactive Technology Demonstration */}
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          background: `linear-gradient(135deg, 
                            ${alpha('#0F1419', 0.95)} 0%, 
                            ${alpha('#1A2332', 0.9)} 30%, 
                            ${alpha('#2C3E50', 0.85)} 70%, 
                            ${alpha(technologies[selectedTab].color, 0.9)} 100%)`,
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                        }}
                      >
                        {/* AI-Powered Marketing Demo */}
                        {selectedTab === 0 && (
                          <>
                            {/* AI Interface Header */}
                            <Box
                              sx={{
                                p: 2,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                              }}
                            >
                              <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                                AI Marketing Engine
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4CAF50' }} />
                                <Typography variant="caption" sx={{ color: '#4CAF50' }}>ACTIVE</Typography>
                              </Box>
                            </Box>

                            {/* AI Processing Animation */}
                            <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {/* Customer Segments */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                                {[
                                  { label: 'High-Value Customers', count: '1,247', color: '#4CAF50' },
                                  { label: 'At-Risk Customers', count: '89', color: '#FF9800' },
                                  { label: 'New Prospects', count: '2,156', color: '#2196F3' },
                                  { label: 'Champions', count: '312', color: '#9C27B0' },
                                ].map((segment, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.3, duration: 0.5 }}
                                  >
                                    <Paper
                                      sx={{
                                        p: 1.5,
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                        border: `1px solid ${alpha(segment.color, 0.3)}`,
                                        borderRadius: 2,
                                        textAlign: 'center',
                                      }}
                                    >
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        {segment.label}
                                      </Typography>
                                      <Typography variant="h6" sx={{ color: segment.color, fontWeight: 700 }}>
                                        {segment.count}
                                      </Typography>
                                    </Paper>
                                  </motion.div>
                                ))}
                              </Box>

                              {/* AI Recommendations */}
                              <Box
                                sx={{
                                  flex: 1,
                                  backgroundColor: 'rgba(255,255,255,0.05)',
                                  borderRadius: 2,
                                  p: 1.5,
                                }}
                              >
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1, display: 'block' }}>
                                  AI Recommendations
                                </Typography>
                                
                                {[
                                  { text: 'Send personalized email to high-value segment', confidence: 94 },
                                  { text: 'Increase retargeting budget by 15%', confidence: 87 },
                                  { text: 'A/B test new creative for millennials', confidence: 82 },
                                ].map((rec, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1 + idx * 0.4, duration: 0.6 }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                      <SmartToyIcon sx={{ color: '#4CAF50', fontSize: '1rem', mr: 1 }} />
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.7rem' }}>
                                          {rec.text}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#4CAF50', fontSize: '0.6rem', display: 'block' }}>
                                          {rec.confidence}% confidence
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </motion.div>
                                ))}
                              </Box>
                            </Box>
                          </>
                        )}

                        {/* Voice Search Demo */}
                        {selectedTab === 1 && (
                          <>
                            <Box
                              sx={{
                                p: 2,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                              }}
                            >
                              <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                                Voice Search Analytics
                              </Typography>
                              <motion.div
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.7, 1, 0.7],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2196F3' }} />
                              </motion.div>
                            </Box>

                            <Box sx={{ flex: 1, p: 2 }}>
                              {/* Voice Query Visualization */}
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1, display: 'block' }}>
                                  Top Voice Queries
                                </Typography>
                                {[
                                  { query: '"Best Italian restaurant near me"', volume: 85 },
                                  { query: '"Coffee shop open now"', volume: 72 },
                                  { query: '"Book a table for two"', volume: 68 },
                                ].map((item, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: '100%' }}
                                    transition={{ delay: idx * 0.5, duration: 1 }}
                                  >
                                    <Box sx={{ mb: 1.5 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.7rem' }}>
                                          {item.query}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#2196F3' }}>
                                          {item.volume}%
                                        </Typography>
                                      </Box>
                                      <Box sx={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${item.volume}%` }}
                                          transition={{ delay: idx * 0.5 + 0.5, duration: 1 }}
                                          style={{
                                            height: '100%',
                                            backgroundColor: '#2196F3',
                                            borderRadius: '2px',
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  </motion.div>
                                ))}
                              </Box>

                              {/* Voice Assistant Icons */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 3 }}>
                                {['Alexa', 'Google', 'Siri'].map((assistant, idx) => (
                                  <motion.div
                                    key={idx}
                                    animate={{
                                      y: [0, -5, 0],
                                      rotate: [0, 5, 0],
                                    }}
                                    transition={{
                                      duration: 2 + idx,
                                      repeat: Infinity,
                                      ease: "easeInOut"
                                    }}
                                  >
                                    <Paper
                                      sx={{
                                        p: 1.5,
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        borderRadius: 2,
                                        textAlign: 'center',
                                      }}
                                    >
                                      <PsychologyIcon sx={{ color: '#2196F3', mb: 0.5 }} />
                                      <Typography variant="caption" sx={{ color: '#fff', display: 'block' }}>
                                        {assistant}
                                      </Typography>
                                    </Paper>
                                  </motion.div>
                                ))}
                              </Box>
                            </Box>
                          </>
                        )}

                        {/* Data Analytics Demo */}
                        {selectedTab === 2 && (
                          <>
                            <Box
                              sx={{
                                p: 2,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                              }}
                            >
                              <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                                Advanced Analytics Dashboard
                              </Typography>
                              <Chip size="small" label="Real-time" sx={{ backgroundColor: '#FF9800', color: '#fff' }} />
                            </Box>

                            <Box sx={{ flex: 1, p: 2 }}>
                              {/* Interactive Chart */}
                              <Box sx={{ height: '50%', mb: 2, position: 'relative' }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1, display: 'block' }}>
                                  Customer Journey Analytics
                                </Typography>
                                <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                                  {/* Animated flow lines */}
                                  <motion.path
                                    d="M 10 80 Q 50 40 100 60 T 200 30 T 280 50"
                                    stroke="#FF9800"
                                    strokeWidth="3"
                                    fill="none"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    style={{ filter: 'drop-shadow(0 0 6px #FF9800)' }}
                                  />
                                  {/* Data points */}
                                  {[
                                    { x: 50, y: 50, label: 'Awareness' },
                                    { x: 120, y: 40, label: 'Interest' },
                                    { x: 190, y: 35, label: 'Decision' },
                                    { x: 260, y: 45, label: 'Purchase' },
                                  ].map((point, idx) => (
                                    <motion.circle
                                      key={idx}
                                      cx={point.x}
                                      cy={point.y}
                                      r="6"
                                      fill="#FF9800"
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: idx * 0.5, duration: 0.5 }}
                                      style={{ filter: 'drop-shadow(0 0 8px #FF9800)' }}
                                    />
                                  ))}
                                </svg>
                              </Box>

                              {/* Attribution Model */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                {[
                                  { channel: 'Social', attribution: 35, color: '#4CAF50' },
                                  { channel: 'Email', attribution: 28, color: '#2196F3' },
                                  { channel: 'Paid', attribution: 37, color: '#FF9800' },
                                ].map((item, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1 + idx * 0.3, duration: 0.6 }}
                                  >
                                    <Paper
                                      sx={{
                                        p: 1,
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                        textAlign: 'center',
                                        borderTop: `3px solid ${item.color}`,
                                      }}
                                    >
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        {item.channel}
                                      </Typography>
                                      <Typography variant="h6" sx={{ color: item.color, fontWeight: 700 }}>
                                        {item.attribution}%
                                      </Typography>
                                    </Paper>
                                  </motion.div>
                                ))}
                              </Box>
                            </Box>
                          </>
                        )}

                        {/* AR/VR Demo */}
                        {selectedTab === 3 && (
                          <>
                            <Box
                              sx={{
                                p: 2,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                              }}
                            >
                              <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                                AR Experience Preview
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <VrpanoIcon sx={{ color: '#9C27B0', fontSize: '1rem' }} />
                                <Typography variant="caption" sx={{ color: '#9C27B0' }}>LIVE</Typography>
                              </Box>
                            </Box>

                            <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {/* AR Product Visualization */}
                              <Box
                                sx={{
                                  flex: 1,
                                  backgroundColor: 'rgba(255,255,255,0.05)',
                                  borderRadius: 2,
                                  p: 2,
                                  position: 'relative',
                                  overflow: 'hidden',
                                }}
                              >
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1, display: 'block' }}>
                                  Virtual Product Placement
                                </Typography>

                                {/* 3D Visualization Simulation */}
                                <Box sx={{ position: 'relative', height: '80px', mt: 1 }}>
                                  {/* Room outline */}
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: '20%',
                                      left: '10%',
                                      right: '10%',
                                      bottom: '20%',
                                      border: '2px solid rgba(255,255,255,0.3)',
                                      borderRadius: 1,
                                    }}
                                  />
                                  
                                  {/* Animated furniture pieces */}
                                  {[
                                    { x: '20%', y: '30%', size: 20, color: '#9C27B0' },
                                    { x: '60%', y: '40%', size: 15, color: '#FF9800' },
                                    { x: '40%', y: '60%', size: 12, color: '#4CAF50' },
                                  ].map((item, idx) => (
                                    <motion.div
                                      key={idx}
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ 
                                        opacity: 1, 
                                        scale: 1,
                                        y: [0, -2, 0]
                                      }}
                                      transition={{ 
                                        delay: idx * 0.5,
                                        duration: 0.8,
                                        y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                      }}
                                      style={{
                                        position: 'absolute',
                                        left: item.x,
                                        top: item.y,
                                        width: item.size,
                                        height: item.size,
                                        backgroundColor: item.color,
                                        borderRadius: '2px',
                                        boxShadow: `0 4px 8px ${alpha(item.color, 0.4)}`,
                                      }}
                                    />
                                  ))}
                                </Box>
                              </Box>

                              {/* AR Metrics */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                                {[
                                  { label: 'Try-on Rate', value: '78%' },
                                  { label: 'Conversion', value: '+56%' },
                                ].map((metric, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 2 + idx * 0.3, duration: 0.6 }}
                                  >
                                    <Paper
                                      sx={{
                                        p: 1,
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                        textAlign: 'center',
                                        border: `1px solid ${alpha('#9C27B0', 0.3)}`,
                                      }}
                                    >
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        {metric.label}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: '#9C27B0', fontWeight: 700 }}>
                                        {metric.value}
                                      </Typography>
                                    </Paper>
                                  </motion.div>
                                ))}
                              </Box>
                            </Box>
                          </>
                        )}
                      </Box>

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
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + idx * 0.2, duration: 0.6 }}
                          >
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h5" color="white" fontWeight={700}>
                                {stat.value}
                              </Typography>
                              <Typography variant="caption" color="rgba(255,255,255,0.8)">
                                {stat.label}
                              </Typography>
                            </Box>
                          </motion.div>
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
                      Explore This Technology With Us
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
                  Ready to Innovate Your Marketing?
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
                  Our team is excited to show you how these cutting-edge technologies can give your business a real competitive advantage. 
                  Let's talk about your goals.
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
                  Discuss Your Tech Strategy
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
