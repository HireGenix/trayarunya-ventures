'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  AttachMoney as AttachMoneyIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const ExecutiveSummarySection = () => {
  const theme = useTheme();

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

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  // Key metrics data
  const keyMetrics = [
    {
      title: "Projected ROI",
      value: "3.5x",
      description: "Expected return on marketing investment",
      icon: <TrendingUpIcon fontSize="large" />,
      color: theme.palette.success.main,
    },
    {
      title: "Timeline",
      value: "6 Months",
      description: "Implementation and optimization period",
      icon: <TimelineIcon fontSize="large" />,
      color: theme.palette.primary.main,
    },
    {
      title: "Investment",
      value: "₹15-20L",
      description: "Recommended marketing budget range",
      icon: <AttachMoneyIcon fontSize="large" />,
      color: theme.palette.warning.main,
    },
    {
      title: "Performance Boost",
      value: "+45%",
      description: "Projected engagement increase",
      icon: <SpeedIcon fontSize="large" />,
      color: theme.palette.secondary.main,
    },
  ];

  // Key benefits
  const keyBenefits = [
    "Enhanced brand visibility among Gen Z and young millennials",
    "Increased conversion rates through targeted funnel optimization",
    "Stronger brand loyalty and repeat purchase behavior",
    "Improved competitive positioning against fast fashion brands",
    "Data-driven insights for continuous campaign optimization",
    "Scalable marketing framework for future expansion"
  ];

  // Key challenges
  const keyProblems = [
    "Declining engagement rates on social platforms",
    "Increasing customer acquisition costs in a competitive market",
    "Limited brand differentiation in the casual wear segment",
    "Inconsistent messaging across marketing channels",
    "Underutilized customer data for personalization"
  ];

  return (
    <Box
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeIn}
    >
      <Typography
        variant="h3"
        component="h2"
        sx={{
          mb: 2,
          fontWeight: 700,
          background: `linear-gradient(90deg, #000000 0%, #333333 100%)`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Executive Summary
      </Typography>

      <Typography
        variant="h5"
        component="h3"
        sx={{
          mb: 4,
          fontWeight: 600,
          color: theme.palette.primary.main,
        }}
      >
        Strategic Marketing Proposal for Bewakoof.com
      </Typography>

      {/* Overview Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="body1" sx={{ mb: 3 }}>
          This proposal outlines a comprehensive marketing strategy designed to elevate Bewakoof's brand presence, 
          engage its target audience more effectively, and drive sustainable growth in the competitive casual wear market. 
          Our approach combines data-driven insights with creative execution to create a full-funnel marketing strategy 
          that addresses Bewakoof's unique challenges and capitalizes on its strengths.
        </Typography>
        
        <Typography variant="body1">
          After thorough analysis of Bewakoof's current market position, target audience, and competitive landscape, 
          we've developed a tailored strategy that focuses on enhancing brand differentiation, optimizing the customer journey, 
          and leveraging Bewakoof's unique value proposition of quirky, affordable fashion for young Indians.
        </Typography>
      </Box>

      {/* Key Metrics Cards */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          component="h3"
          sx={{
            mb: 3,
            fontWeight: 700,
          }}
        >
          Key Metrics & Deliverables
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
          {keyMetrics.map((metric, index) => (
            <Box key={index.toString()} sx={{ width: { xs: '100%', sm: '50%', md: '25%' }, px: 1.5, mb: 3 }}>
              <Card
                component={motion.div}
                variants={fadeIn}
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.1)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: alpha(metric.color, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        color: metric.color,
                      }}
                    >
                      {metric.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      {metric.title}
                    </Typography>
                  </Box>
                  
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 700,
                      color: metric.color
                    }}
                  >
                    {metric.value}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    {metric.description}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Problem and Solution Section */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -2 }}>
          {/* Problem Statement */}
          <Box sx={{ width: { xs: '100%', md: '50%' }, px: 2, mb: { xs: 4, md: 0 } }}>
            <motion.div variants={fadeIn}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.1)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    backgroundColor: alpha(theme.palette.error.main, 0.05),
                    borderBottom: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      color: theme.palette.error.main,
                    }}
                  >
                    <AssignmentIcon />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    Current Challenges
                  </Typography>
                </Box>
                
                <CardContent sx={{ p: 3 }}>
                  <List disablePadding>
                    {keyProblems.map((problem, index) => (
                      <ListItem key={index} disableGutters sx={{ pb: 2 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Chip 
                            size="small" 
                            label={index + 1} 
                            sx={{ 
                              backgroundColor: alpha(theme.palette.error.main, 0.1),
                              color: theme.palette.error.main,
                              fontWeight: 'bold',
                              height: 24,
                              width: 24
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText primary={problem} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </motion.div>
          </Box>
          
          {/* Solution Benefits */}
          <Box sx={{ width: { xs: '100%', md: '50%' }, px: 2 }}>
            <motion.div variants={fadeIn}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.1)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    backgroundColor: alpha(theme.palette.success.main, 0.05),
                    borderBottom: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      color: theme.palette.success.main,
                    }}
                  >
                    <CheckCircleIcon />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    Key Benefits
                  </Typography>
                </Box>
                
                <CardContent sx={{ p: 3 }}>
                  <List disablePadding>
                    {keyBenefits.map((benefit, index) => (
                      <ListItem key={index} disableGutters sx={{ pb: 2 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Chip 
                            size="small" 
                            label="✓" 
                            sx={{ 
                              backgroundColor: alpha(theme.palette.success.main, 0.1),
                              color: theme.palette.success.main,
                              fontWeight: 'bold',
                              height: 24,
                              width: 24
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText primary={benefit} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </motion.div>
          </Box>
        </Box>
      </Box>

      {/* Approach Summary */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h3"
          sx={{
            mb: 3,
            fontWeight: 700,
          }}
        >
          Our Approach
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.background.paper, 0.6),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -2 }}>
            <Box sx={{ width: { xs: '100%', md: '33.33%' }, px: 2, mb: { xs: 4, md: 0 } }}>
              <motion.div variants={fadeIn}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    1. Audience-First Strategy
                  </Typography>
                  <Typography variant="body2">
                    We've developed detailed personas of Bewakoof's ideal customers, analyzing their behaviors, preferences, and pain points. 
                    This deep understanding informs all aspects of our marketing strategy, ensuring messaging and channels are perfectly aligned with your target audience.
                  </Typography>
                </Box>
              </motion.div>
            </Box>
            
            <Box sx={{ width: { xs: '100%', md: '33.33%' }, px: 2, mb: { xs: 4, md: 0 } }}>
              <motion.div variants={fadeIn}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    2. Full-Funnel Optimization
                  </Typography>
                  <Typography variant="body2">
                    Our comprehensive approach addresses every stage of the customer journey, from initial awareness through consideration to purchase and beyond. 
                    We've designed specific tactics for each funnel stage to maximize engagement and conversion opportunities.
                  </Typography>
                </Box>
              </motion.div>
            </Box>
            
            <Box sx={{ width: { xs: '100%', md: '33.33%' }, px: 2 }}>
              <motion.div variants={fadeIn}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.05),
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    3. Data-Driven Execution
                  </Typography>
                  <Typography variant="body2">
                    All recommendations are backed by market research, competitive analysis, and industry benchmarks. 
                    Our implementation plan includes continuous monitoring and optimization based on performance data, 
                    ensuring the highest possible ROI for your marketing investment.
                  </Typography>
                </Box>
              </motion.div>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Call to Action */}
      <Box
        sx={{
          mt: 6,
          p: 4,
          borderRadius: 4,
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
          Ready to Transform Bewakoof's Marketing Strategy?
        </Typography>
        <Typography variant="body1" sx={{ mb: 0 }}>
          The following sections provide a detailed breakdown of our analysis and recommendations. 
          We're excited to partner with Bewakoof to implement this strategy and drive exceptional results.
        </Typography>
      </Box>
    </Box>
  );
};

export default ExecutiveSummarySection;
