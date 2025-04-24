'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Button, useTheme, alpha, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneIcon from '@mui/icons-material/Phone';
import { 
  HeroSection, 
  ServicesSection, 
  ROICalculator, 
  ICPGenerator,
  TrendingTechnologies,
  MarketingInsights,
  ClientTestimonials
} from '@/components/Solutions/DigitalMarketing';

// Case studies data
const caseStudies = [
  {
    title: 'E-commerce Growth Strategy',
    industry: 'Retail',
    results: ['250% increase in organic traffic', '189% increase in conversion rate', '300% ROI on ad spend'],
    color: '#4CAF50',
  },
  {
    title: 'B2B Lead Generation',
    industry: 'Technology',
    results: ['175% increase in qualified leads', '45% reduction in cost per acquisition', '320% increase in LinkedIn engagement'],
    color: '#2196F3',
  },
  {
    title: 'Local Business Expansion',
    industry: 'Hospitality',
    results: ['400% increase in local search visibility', '210% increase in bookings', '95% positive review rate'],
    color: '#FF9800',
  },
  {
    title: 'Brand Awareness Campaign',
    industry: 'Healthcare',
    results: ['1.2M social media impressions', '320% increase in website traffic', '45% increase in consultation bookings'],
    color: '#9C27B0',
  },
];

export default function DigitalMarketingPage() {
  const theme = useTheme();
  const primaryColor = '#8E44AD';

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

        {/* Our Approach Section */}
        <Box 
          sx={{ 
            py: { xs: 8, md: 12 }, 
            background: `linear-gradient(135deg, ${alpha(primaryColor, 0.05)} 0%, rgba(255,255,255,0.8) 100%)`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Background decorative elements */}
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
              right: '-5%',
              width: { xs: 300, md: 500 },
              height: { xs: 300, md: 500 },
              borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
              border: `2px dashed ${alpha(primaryColor, 0.1)}`,
              opacity: 0.6,
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
              left: '-10%',
              width: { xs: 250, md: 400 },
              height: { xs: 250, md: 400 },
              borderRadius: '50%',
              border: `2px dashed ${alpha('#FF9800', 0.1)}`,
              opacity: 0.4,
              zIndex: 0,
            }}
          />
          
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Chip
                  label="OUR METHODOLOGY"
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
                  }}
                />
                <Typography
                  variant="h2"
                  component="h2"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                  }}
                >
                  Our Approach
                </Typography>
                <Typography
                  variant="h6"
                  color="textSecondary"
                  sx={{ maxWidth: 800, mx: 'auto', mb: 2 }}
                >
                  We believe in a data-driven approach to digital marketing. Our strategies are built on thorough research, continuous optimization, and transparent reporting.
                </Typography>
              </motion.div>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 6, alignItems: 'center' }}>
              <Box sx={{ width: { xs: '100%', md: '41.66%' } }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <Box
                    sx={{
                      p: 4,
                      borderRadius: 4,
                      backgroundColor: 'white',
                      boxShadow: '0 15px 40px rgba(0,0,0,0.08)',
                      border: `1px solid ${alpha(primaryColor, 0.1)}`,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 8,
                        height: '100%',
                        background: `linear-gradient(to bottom, ${primaryColor}, ${alpha(primaryColor, 0.6)})`,
                      }}
                    />
                    
                    <Typography variant="h5" fontWeight={700} gutterBottom sx={{ pl: 2 }}>
                      Why choose our digital marketing services?
                    </Typography>
                    
                    <Box component="ul" sx={{ pl: 0, listStyle: 'none', mt: 3 }}>
                      {[
                        {
                          text: 'Increased brand visibility and awareness',
                          color: '#4CAF50'
                        },
                        {
                          text: 'Higher quality website traffic and leads',
                          color: '#2196F3'
                        },
                        {
                          text: 'Improved conversion rates and ROI',
                          color: '#FF9800'
                        },
                        {
                          text: 'Enhanced customer engagement and loyalty',
                          color: '#9C27B0'
                        },
                        {
                          text: 'Data-driven insights for strategic decision making',
                          color: '#F44336'
                        },
                        {
                          text: 'Competitive advantage in your industry',
                          color: '#009688'
                        },
                      ].map((benefit, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                          <Box 
                            component="li" 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              mb: 2.5,
                              p: 1.5,
                              borderRadius: 2,
                              backgroundColor: alpha(benefit.color, 0.05),
                              border: `1px solid ${alpha(benefit.color, 0.1)}`,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                backgroundColor: alpha(benefit.color, 0.1),
                                transform: 'translateX(5px)',
                              }
                            }}
                          >
                            <CheckCircleIcon sx={{ color: benefit.color, mr: 1.5, fontSize: 22 }} />
                            <Typography variant="body1" fontWeight={500}>{benefit.text}</Typography>
                          </Box>
                        </motion.div>
                      ))}
                    </Box>
                    
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
                        background: `radial-gradient(circle, ${primaryColor} 0%, rgba(255, 255, 255, 0) 70%)`,
                        filter: 'blur(40px)',
                        zIndex: 0,
                      }}
                    />
                  </Box>
                </motion.div>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '58.33%' } }}>
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
                      backgroundColor: 'white',
                      boxShadow: '0 15px 40px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Typography
                      variant="h4"
                      component="h3"
                      sx={{
                        fontWeight: 700,
                        mb: 4,
                        textAlign: 'center',
                        background: `linear-gradient(90deg, ${primaryColor} 0%, #333333 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Our Process
                    </Typography>
                    
                    <Box 
                      sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
                        gap: 3,
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      {[
                        {
                          step: '01',
                          title: 'Research & Analysis',
                          description: 'We analyze your business, competitors, and target audience to develop a strategic roadmap.',
                          color: '#4CAF50',
                          icon: '🔍'
                        },
                        {
                          step: '02',
                          title: 'Strategy Development',
                          description: 'We create a customized digital marketing strategy aligned with your business goals.',
                          color: '#2196F3',
                          icon: '📝'
                        },
                        {
                          step: '03',
                          title: 'Implementation',
                          description: 'Our team executes the strategy across all relevant digital channels.',
                          color: '#FF9800',
                          icon: '🚀'
                        },
                        {
                          step: '04',
                          title: 'Monitoring & Optimization',
                          description: 'We continuously track performance and optimize for better results.',
                          color: '#9C27B0',
                          icon: '📊'
                        },
                      ].map((process, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.1 * index }}
                          whileHover={{ 
                            y: -8, 
                            transition: { duration: 0.2 } 
                          }}
                        >
                          <Paper
                            elevation={0}
                            sx={{
                              p: 3,
                              height: '100%',
                              borderRadius: 3,
                              border: `1px solid ${alpha(process.color, 0.3)}`,
                              position: 'relative',
                              overflow: 'hidden',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                boxShadow: `0 15px 30px ${alpha(process.color, 0.2)}`,
                                borderColor: alpha(process.color, 0.5),
                              },
                            }}
                          >
                            <Box 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                mb: 2 
                              }}
                            >
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  backgroundColor: alpha(process.color, 0.1),
                                  color: process.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  mr: 2,
                                  fontSize: '1.5rem'
                                }}
                              >
                                {process.icon}
                              </Box>
                              <Typography 
                                variant="h6" 
                                fontWeight={600} 
                                sx={{ color: process.color }}
                              >
                                {process.title}
                              </Typography>
                            </Box>
                            
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.secondary',
                                pl: 7
                              }}
                            >
                              {process.description}
                            </Typography>
                            
                            <Typography
                              variant="h2"
                              sx={{
                                fontWeight: 800,
                                color: alpha(process.color, 0.07),
                                position: 'absolute',
                                bottom: -15,
                                right: -5,
                                fontSize: '5rem',
                                lineHeight: 1,
                              }}
                            >
                              {process.step}
                            </Typography>
                          </Paper>
                        </motion.div>
                      ))}
                    </Box>
                    
                    {/* Decorative elements */}
                    <Box
                      component={motion.div}
                      animate={{ 
                        rotate: [0, 360],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 20,
                        ease: "linear"
                      }}
                      sx={{
                        position: 'absolute',
                        top: '10%',
                        right: '5%',
                        width: 80,
                        height: 80,
                        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                        border: `2px dashed ${alpha(primaryColor, 0.2)}`,
                        opacity: 0.4,
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
                        duration: 25,
                        ease: "linear"
                      }}
                      sx={{
                        position: 'absolute',
                        bottom: '10%',
                        left: '5%',
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        border: `2px dashed ${alpha('#FF9800', 0.2)}`,
                        opacity: 0.4,
                        zIndex: 0,
                      }}
                    />
                  </Box>
                </motion.div>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Trending Technologies Section */}
        <TrendingTechnologies />

        {/* ROI Calculator Section */}
        <ROICalculator />

        {/* Client Testimonials Section */}
        <ClientTestimonials />

        {/* Know Your ICP Section */}
        <ICPGenerator />

        {/* Marketing Insights Section */}
        <MarketingInsights />

        {/* Case Studies Section */}
        <Box 
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          sx={{ 
            py: { xs: 8, md: 12 },
            background: `linear-gradient(135deg, ${alpha(primaryColor, 0.03)} 0%, rgba(255,255,255,1) 100%)`,
            position: 'relative',
            overflow: 'hidden'
          }}
          id="case-studies"
        >
          {/* Background decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.03,
              backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              zIndex: 0,
            }}
          />
          
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <motion.div variants={itemVariants}>
                <Chip
                  label="SUCCESS STORIES"
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
                  }}
                >
                  Client Success Stories
                </Typography>
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <Typography
                  variant="h6"
                  color="textSecondary"
                  sx={{ maxWidth: 800, mx: 'auto', mb: 6 }}
                >
                  Real results we've achieved for our clients through strategic digital marketing campaigns
                </Typography>
              </motion.div>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 4 }}>
              {caseStudies.map((study, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ 
                    y: -10, 
                    transition: { duration: 0.3 },
                    boxShadow: `0 20px 40px ${alpha(study.color, 0.2)}`
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 0,
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: `1px solid ${alpha(study.color, 0.2)}`,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Header */}
                    <Box
                      sx={{
                        p: 3,
                        borderBottom: `1px solid ${alpha(study.color, 0.1)}`,
                        backgroundColor: alpha(study.color, 0.05),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: alpha(study.color, 0.1),
                            color: study.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            mr: 2,
                            fontSize: '1.2rem'
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Typography variant="h5" component="h3" fontWeight={700} sx={{ color: study.color }}>
                          {study.title}
                        </Typography>
                      </Box>
                      <Chip
                        label={study.industry}
                        sx={{
                          backgroundColor: alpha(study.color, 0.1),
                          color: study.color,
                          fontWeight: 600,
                          border: `1px solid ${alpha(study.color, 0.3)}`,
                        }}
                      />
                    </Box>
                    
                    {/* Content */}
                    <Box sx={{ p: 4, flexGrow: 1 }}>
                      <Box
                        sx={{
                          p: 3,
                          borderRadius: 3,
                          backgroundColor: 'white',
                          boxShadow: `0 5px 15px ${alpha(study.color, 0.1)}`,
                          border: `1px solid ${alpha(study.color, 0.1)}`,
                          mb: 3,
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: study.color }}>
                          Challenge
                        </Typography>
                        <Typography variant="body2">
                          {study.industry === 'Retail' ? 
                            'An e-commerce client struggling with low organic traffic and poor conversion rates needed to increase their online visibility and sales.' :
                          study.industry === 'Technology' ?
                            'A B2B SaaS company was facing high customer acquisition costs and needed to generate more qualified leads while reducing marketing spend.' :
                          study.industry === 'Hospitality' ?
                            'A local hospitality business wanted to expand their customer base and increase bookings in a highly competitive market.' :
                            'A healthcare provider needed to build brand awareness and increase consultation bookings in their target market.'
                          }
                        </Typography>
                      </Box>
                      
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: study.color, mb: 2 }}>
                        Results Achieved:
                      </Typography>
                      
                      <Box component="ul" sx={{ pl: 0, listStyle: 'none', mb: 0 }}>
                        {study.results.map((result, idx) => (
                          <Box 
                            component="li" 
                            key={idx} 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              mb: 2,
                              p: 1.5,
                              borderRadius: 2,
                              backgroundColor: alpha(study.color, 0.05),
                              border: `1px solid ${alpha(study.color, 0.1)}`,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                backgroundColor: alpha(study.color, 0.1),
                                transform: 'translateX(5px)',
                              }
                            }}
                          >
                            <CheckCircleIcon sx={{ fontSize: 20, color: study.color, mr: 1.5 }} />
                            <Typography variant="body2" fontWeight={500}>
                              {result}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    
                    {/* Footer */}
                    <Box
                      sx={{
                        p: 3,
                        borderTop: `1px solid ${alpha(study.color, 0.1)}`,
                        backgroundColor: alpha(study.color, 0.05),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 'auto',
                      }}
                    >
                      <Typography variant="caption" fontWeight={600} sx={{ color: study.color }}>
                        Implementation Time: {index % 2 === 0 ? '3 months' : '4 months'}
                      </Typography>
                      <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        sx={{ 
                          color: study.color,
                          '&:hover': {
                            backgroundColor: alpha(study.color, 0.1),
                          }
                        }}
                      >
                        Full Case Study
                      </Button>
                    </Box>
                    
                    {/* Animated gradient background */}
                    <Box
                      component={motion.div}
                      animate={{ 
                        opacity: [0.03, 0.06, 0.03],
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
                        background: `radial-gradient(circle, ${study.color} 0%, rgba(255, 255, 255, 0) 70%)`,
                        filter: 'blur(40px)',
                        zIndex: 0,
                      }}
                    />
                  </Paper>
                </motion.div>
              ))}
            </Box>
            
            <Box sx={{ textAlign: 'center', mt: 6 }}>
              <motion.div
                variants={itemVariants}
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
                    backgroundColor: primaryColor,
                    py: 1.5,
                    px: 4,
                    borderRadius: '50px',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: alpha(primaryColor, 0.9),
                      transform: 'translateY(-3px)',
                      boxShadow: `0 8px 20px ${alpha(primaryColor, 0.4)}`,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Discuss Your Project
                </Button>
              </motion.div>
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
            background: `linear-gradient(135deg, ${primaryColor} 0%, #6C3483 100%)`,
            color: '#ffffff',
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
              zIndex: 0,
            }}
          />

          {/* Animated shapes */}
          <Box
            component={motion.div}
            animate={{ 
              rotate: [0, 360],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 20,
              ease: "linear"
            }}
            sx={{
              position: 'absolute',
              top: '5%',
              left: '5%',
              width: { xs: 150, md: 300 },
              height: { xs: 150, md: 300 },
              borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
              border: '2px dashed rgba(255, 255, 255, 0.2)',
              zIndex: 0,
            }}
          />
          
          <Box
            component={motion.div}
            animate={{ 
              rotate: [360, 0],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 25,
              ease: "linear"
            }}
            sx={{
              position: 'absolute',
              bottom: '5%',
              right: '5%',
              width: { xs: 100, md: 200 },
              height: { xs: 100, md: 200 },
              borderRadius: '50%',
              border: '2px dashed rgba(255, 255, 255, 0.2)',
              zIndex: 0,
            }}
          />

          {/* Animated gradient orbs */}
          <Box
            component={motion.div}
            animate={{ 
              x: [0, 30, 0],
              y: [0, -20, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 15,
              ease: "easeInOut"
            }}
            sx={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              width: { xs: 150, md: 300 },
              height: { xs: 150, md: 300 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
              filter: 'blur(60px)',
              zIndex: 0,
            }}
          />
          
          <Box
            component={motion.div}
            animate={{ 
              x: [0, -20, 0],
              y: [0, 30, 0],
              opacity: [0.05, 0.15, 0.05]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 18,
              ease: "easeInOut"
            }}
            sx={{
              position: 'absolute',
              bottom: '10%',
              right: '10%',
              width: { xs: 120, md: 250 },
              height: { xs: 120, md: 250 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
              filter: 'blur(60px)',
              zIndex: 0,
            }}
          />

          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Chip
                  label="GET STARTED TODAY"
                  sx={{
                    mb: 3,
                    py: 1.5,
                    px: 2,
                    borderRadius: '50px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  }}
                />
              </motion.div>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'center' }}>
              <Box sx={{ width: { xs: '100%', md: '58.33%' } }}>
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
                      fontWeight: 700,
                      mb: 2,
                      color: '#ffffff',
                      textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    Ready to Grow Your Business?
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ mb: 4, color: alpha('#ffffff', 0.9), lineHeight: 1.6 }}
                  >
                    Let's discuss how our digital marketing services can help you achieve your business goals. Contact us today for a free consultation and strategy session.
                  </Typography>
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
                        py: 1.8,
                        px: 4,
                        borderRadius: '50px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        '&:hover': {
                          backgroundColor: alpha('#ffffff', 0.9),
                          transform: 'translateY(-3px)',
                          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Schedule a Consultation
                    </Button>
                  </motion.div>
                </motion.div>
              </Box>
              <Box sx={{ width: { xs: '100%', md: '41.66%' } }}>
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
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Decorative elements */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        zIndex: 0,
                      }}
                    />
                    
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -30,
                        left: -30,
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        zIndex: 0,
                      }}
                    />
                    
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                          }}
                        >
                          <PhoneIcon sx={{ fontSize: 28, color: '#ffffff' }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700} color="#ffffff">
                          Free Strategy Session
                        </Typography>
                      </Box>
                      
                      <Box sx={{ borderBottom: `1px solid ${alpha('#ffffff', 0.2)}`, mb: 3, pb: 1 }} />
                      
                      <Box component="ul" sx={{ pl: 0, listStyle: 'none', mb: 0 }}>
                        {[
                          'Comprehensive digital marketing audit',
                          'Competitor analysis',
                          'Custom strategy recommendations',
                          'ROI projections',
                          'Implementation timeline',
                        ].map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 * index }}
                          >
                            <Box 
                              component="li" 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                mb: 2.5,
                                p: 1.5,
                                borderRadius: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  transform: 'translateX(5px)',
                                }
                              }}
                            >
                              <CheckCircleIcon sx={{ color: '#ffffff', mr: 1.5 }} />
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  color: '#ffffff',
                                  fontWeight: 500
                                }}
                              >
                                {item}
                              </Typography>
                            </Box>
                          </motion.div>
                        ))}
                      </Box>
                      
                      <Box sx={{ mt: 4, textAlign: 'center' }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            display: 'block',
                            mb: 2
                          }}
                        >
                          No obligation • 30-minute session • Actionable insights
                        </Typography>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outlined"
                            size="large"
                            component={Link}
                            href="/contact"
                            sx={{
                              color: '#ffffff',
                              borderColor: 'rgba(255, 255, 255, 0.5)',
                              py: 1,
                              px: 3,
                              borderRadius: '50px',
                              fontWeight: 600,
                              '&:hover': {
                                borderColor: '#ffffff',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              },
                              transition: 'all 0.3s ease',
                            }}
                          >
                            Book Now
                          </Button>
                        </motion.div>
                      </Box>
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
