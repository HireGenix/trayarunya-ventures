'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Button, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FlightIcon from '@mui/icons-material/Flight';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import CelebrationIcon from '@mui/icons-material/Celebration';

const jobOpenings = [
  {
    id: 'ai-engineer',
    title: 'AI Engineer',
    department: 'Engineering',
    location: 'Remote (USA/India)',
    type: 'Full-time',
    description: 'We are looking for an experienced AI Engineer to join our team and help develop cutting-edge AI solutions for our SaaS products.',
    responsibilities: [
      'Design, develop, and implement AI models and algorithms',
      'Collaborate with cross-functional teams to integrate AI capabilities into our products',
      'Stay up-to-date with the latest AI research and technologies',
      'Optimize AI models for performance and scalability',
      'Participate in code reviews and contribute to engineering best practices',
    ],
    requirements: [
      "Bachelor's or Master's degree in Computer Science, AI, or related field",
      '3+ years of experience in AI/ML development',
      'Strong programming skills in Python and familiarity with AI frameworks (TensorFlow, PyTorch)',
      'Experience with natural language processing and computer vision',
      'Knowledge of cloud platforms (AWS, Azure, or GCP)',
    ],
  },
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    department: 'Engineering',
    location: 'Remote (USA/India)',
    type: 'Full-time',
    description: 'We are seeking a talented Frontend Developer to create exceptional user experiences for our SaaS applications.',
    responsibilities: [
      'Develop responsive and intuitive user interfaces using modern frontend technologies',
      'Collaborate with designers and backend developers to implement features',
      'Ensure cross-browser compatibility and optimize for performance',
      'Write clean, maintainable, and well-documented code',
      'Participate in agile development processes',
    ],
    requirements: [
      "Bachelor's degree in Computer Science or related field",
      '2+ years of experience in frontend development',
      'Proficiency in React, TypeScript, and modern CSS',
      'Experience with responsive design and cross-browser compatibility',
      'Knowledge of frontend testing frameworks',
    ],
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    department: 'Product',
    location: 'Remote (USA/India)',
    type: 'Full-time',
    description: 'We are looking for a Product Manager to lead the development and launch of new features for our SaaS products.',
    responsibilities: [
      'Define product vision, strategy, and roadmap',
      'Gather and prioritize product requirements',
      'Work closely with engineering, design, and marketing teams',
      'Analyze market trends and competitive landscape',
      'Track and measure product performance metrics',
    ],
    requirements: [
      "Bachelor's degree in Business, Computer Science, or related field",
      '3+ years of experience in product management, preferably in SaaS',
      'Strong analytical and problem-solving skills',
      'Excellent communication and stakeholder management abilities',
      'Experience with agile development methodologies',
    ],
  },
  {
    id: 'marketing-specialist',
    title: 'Marketing Specialist',
    department: 'Marketing',
    location: 'Remote (USA/India)',
    type: 'Full-time',
    description: 'We are seeking a Marketing Specialist to help grow our brand awareness and drive customer acquisition.',
    responsibilities: [
      'Develop and execute marketing campaigns across various channels',
      'Create compelling content for website, blog, and social media',
      'Analyze marketing metrics and optimize campaigns',
      'Collaborate with product and sales teams',
      'Stay up-to-date with industry trends and best practices',
    ],
    requirements: [
      "Bachelor's degree in Marketing, Communications, or related field",
      '2+ years of experience in B2B marketing, preferably in SaaS',
      'Strong content creation and copywriting skills',
      'Experience with digital marketing tools and analytics',
      'Knowledge of SEO and social media marketing',
    ],
  },
];

const benefits = [
  {
    icon: <HealthAndSafetyIcon />,
    title: 'Comprehensive Healthcare',
    description: 'We offer top-tier medical, dental, and vision coverage for you and your dependents.',
  },
  {
    icon: <WatchLaterIcon />,
    title: 'Flexible Work Hours',
    description: "Work when you're most productive with our flexible scheduling policy.",
  },
  {
    icon: <FlightIcon />,
    title: 'Generous PTO',
    description: 'Enjoy competitive paid time off, including vacation, sick days, and holidays.',
  },
  {
    icon: <SchoolIcon />,
    title: 'Learning & Development',
    description: 'We provide a budget for courses, conferences, and professional certifications.',
  },
  {
    icon: <PeopleIcon />,
    title: 'Remote-First Culture',
    description: 'Work from anywhere with our globally distributed team and collaborative culture.',
  },
  {
    icon: <CelebrationIcon />,
    title: 'Team Retreats',
    description: 'Join us for regular company retreats to connect, collaborate, and celebrate together.',
  },
];

export default function CareersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedJob, setExpandedJob] = useState<string | false>(false);

  const handleJobChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedJob(isExpanded ? panel : false);
  };

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

  return (
    <Layout>
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Hero Section */}
        <Box
          sx={{
            py: { xs: 10, md: 14 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary ? theme.palette.secondary.main : '#000', 0.05)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
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
              opacity: 0.03,
              backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              zIndex: 0,
            }}
          />
          
          {/* Animated gradient orbs */}
          <Box
            component={motion.div}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.05 }}
            transition={{ duration: 1.5 }}
            sx={{
              position: 'absolute',
              top: '20%',
              right: '10%',
              width: { xs: 150, md: 300 },
              height: { xs: 150, md: 300 },
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.palette.primary.light} 0%, rgba(255, 255, 255, 0) 70%)`,
              filter: 'blur(80px)',
              zIndex: 0,
              animation: 'heroPulse 10s ease-in-out infinite',
              '@keyframes heroPulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 0.05 },
                '50%': { transform: 'scale(1.1)', opacity: 0.08 },
              },
            }}
          />

          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Chip
                  label="CAREERS"
                  sx={{
                    mb: 3,
                    py: 1.5,
                    px: 2,
                    borderRadius: '50px',
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  }}
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '4rem' },
                    color: theme.palette.text.primary,
                  }}
                >
                  Join Our Team
                </Typography>
                <Typography
                  variant="h5"
                  component="p"
                  sx={{ 
                    mb: 4, 
                    maxWidth: 800, 
                    mx: 'auto', 
                    fontWeight: 400, 
                    color: theme.palette.text.secondary,
                    lineHeight: 1.6,
                  }}
                >
                  We're building the future of AI-powered SaaS applications and we're looking for talented individuals to join us on this journey.
                </Typography>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Why Join Us Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: theme.palette.text.primary,
                }}
              >
                Why Join Trayarunya Ventures?
              </Typography>
              <Typography
                variant="body1"
                sx={{ 
                  mb: 4, 
                  maxWidth: 700, 
                  mx: 'auto', 
                  color: theme.palette.text.secondary, 
                  fontSize: '1.1rem', 
                  lineHeight: 1.7 
                }}
              >
                We're a team of passionate individuals working together to create innovative solutions that make a difference. Here's what you can expect when you join us:
              </Typography>
            </Box>
            
            <Box
              component={motion.div}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 4,
                mb: 10,
              }}
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  variants={fadeIn}
                  custom={index}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      transition: 'all 0.3s ease',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      '&:hover': {
                        transform: 'translateY(-10px)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 70,
                        height: 70,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        mb: 3,
                        '& svg': {
                          fontSize: 32,
                        },
                      }}
                    >
                      {benefit.icon}
                    </Box>
                    
                    <Typography 
                      variant="h6" 
                      fontWeight={700} 
                      gutterBottom
                      sx={{ color: theme.palette.text.primary }}
                    >
                      {benefit.title}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: '0.95rem', lineHeight: 1.6 }}
                    >
                      {benefit.description}
                    </Typography>
                  </Paper>
                </motion.div>
              ))}
            </Box>

            {/* Culture Section */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', mb: 10 }}>
              <Box 
                sx={{ 
                  width: '100%', 
                  flex: { xs: '0 0 100%', md: '0 0 calc(50% - 24px)' },
                }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <Typography
                    variant="h3"
                    component="h2"
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Our Culture
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ 
                      mb: 4, 
                      color: theme.palette.text.secondary, 
                      fontSize: '1.1rem', 
                      lineHeight: 1.7 
                    }}
                  >
                    At Trayarunya Ventures, we believe in fostering a culture of innovation, collaboration, and continuous learning. We value diversity of thought and background, and we're committed to creating an inclusive environment where everyone can thrive.
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ 
                      mb: 4, 
                      color: theme.palette.text.secondary, 
                      fontSize: '1.1rem', 
                      lineHeight: 1.7 
                    }}
                  >
                    We're a remote-first company with team members across the globe. We believe in work-life balance and provide the flexibility and support our team needs to do their best work, wherever they are.
                  </Typography>
                </motion.div>
              </Box>
              <Box 
                sx={{ 
                  width: '100%', 
                  flex: { xs: '0 0 100%', md: '0 0 calc(50% - 24px)' },
                }}
              >
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: { xs: 300, md: 400 },
                      borderRadius: 4,
                      overflow: 'hidden',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                      background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      p: 4,
                    }}
                  >
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 700,
                        color: alpha(theme.palette.primary.main, 0.8),
                        textAlign: 'center',
                        mb: 2,
                      }}
                    >
                      Our Values
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                      {['Innovation', 'Collaboration', 'Excellence', 'Integrity', 'Growth', 'Diversity'].map((value, index) => (
                        <Chip
                          key={index}
                          label={value}
                          sx={{
                            py: 2,
                            px: 1.5,
                            borderRadius: '50px',
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.2),
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </motion.div>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Open Positions Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: theme.palette.text.primary,
                }}
              >
                Open Positions
              </Typography>
              <Typography
                variant="body1"
                sx={{ 
                  mb: 4, 
                  maxWidth: 700, 
                  mx: 'auto', 
                  color: theme.palette.text.secondary, 
                  fontSize: '1.1rem', 
                  lineHeight: 1.7 
                }}
              >
                We're always looking for talented individuals to join our team. Check out our current openings below.
              </Typography>
            </Box>
            
            <Box
              component={motion.div}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              sx={{ mb: 10 }}
            >
              {jobOpenings.map((job, index) => (
                <Box
                  key={job.id}
                  component={motion.div}
                  variants={fadeIn}
                  custom={index}
                  sx={{ mb: 3 }}
                >
                  <Accordion
                    expanded={expandedJob === job.id}
                    onChange={handleJobChange(job.id)}
                    sx={{
                      borderRadius: '16px !important',
                      overflow: 'hidden',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      mb: 3,
                      '&:before': {
                        display: 'none',
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        backgroundColor: 'white',
                        '& .MuiAccordionSummary-content': {
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'space-between',
                          gap: 2,
                        },
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {job.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {job.department}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          icon={<LocationOnIcon fontSize="small" />}
                          label={job.location}
                          size="small"
                          sx={{
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                          }}
                        />
                        <Chip
                          icon={<AccessTimeIcon fontSize="small" />}
                          label={job.type}
                          size="small"
                          sx={{
                            backgroundColor: alpha(theme.palette.secondary ? theme.palette.secondary.main : '#14bb87', 0.1),
                            color: theme.palette.secondary ? theme.palette.secondary.main : '#14bb87',
                          }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.02), p: 4 }}>
                      <Typography variant="body1" sx={{ mb: 3 }}>
                        {job.description}
                      </Typography>
                      
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                        Responsibilities:
                      </Typography>
                      <Box component="ul" sx={{ mb: 3, pl: 2 }}>
                        {job.responsibilities.map((item, i) => (
                          <Box component="li" key={i} sx={{ mb: 1 }}>
                            <Typography variant="body2">{item}</Typography>
                          </Box>
                        ))}
                      </Box>
                      
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                        Requirements:
                      </Typography>
                      <Box component="ul" sx={{ mb: 4, pl: 2 }}>
                        {job.requirements.map((item, i) => (
                          <Box component="li" key={i} sx={{ mb: 1 }}>
                            <Typography variant="body2">{item}</Typography>
                          </Box>
                        ))}
                      </Box>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          py: 1.5,
                          px: 3,
                          fontWeight: 600,
                          fontSize: '1rem',
                          borderRadius: '50px',
                          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Apply Now
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              ))}
            </Box>

            {/* Don't See a Fit Section */}
            <Box
              sx={{
                p: { xs: 4, md: 6 },
                borderRadius: 4,
                backgroundColor: 'white',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h4"
                component="h3"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: theme.palette.text.primary,
                }}
              >
                Don't See a Position That Fits?
              </Typography>
              <Typography
                variant="body1"
                sx={{ 
                  mb: 4, 
                  maxWidth: 700, 
                  mx: 'auto', 
                  color: theme.palette.text.secondary, 
                  fontSize: '1.1rem', 
                  lineHeight: 1.7 
                }}
              >
                We're always on the lookout for exceptional talent. If you don't see a position that matches your skills but believe you'd be a great addition to our team, we'd love to hear from you.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  py: 1.5,
                  px: 3,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: '50px',
                  boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Send Us Your Resume
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>
    </Layout>
  );
}
