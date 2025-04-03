'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Avatar, Grid, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import EmailIcon from '@mui/icons-material/Email';

const leadershipTeam = [
  {
    name: 'John Smith',
    role: 'Chief Executive Officer',
    bio: 'John has over 15 years of experience in the technology industry, with a focus on AI and machine learning. Prior to founding Trayarunya Ventures, he held leadership positions at several Fortune 500 companies.',
    image: '/images/team/placeholder.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/',
      twitter: 'https://twitter.com/',
      email: 'john@trayarunyaventures.com',
    },
  },
  {
    name: 'Priya Patel',
    role: 'Chief Technology Officer',
    bio: 'Priya brings extensive expertise in AI and software development with a Ph.D. in Computer Science. She leads our technical strategy and oversees all product development initiatives.',
    image: '/images/team/placeholder.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/',
      twitter: 'https://twitter.com/',
      email: 'priya@trayarunyaventures.com',
    },
  },
  {
    name: 'Michael Chen',
    role: 'Chief Product Officer',
    bio: 'Michael has a proven track record of building successful SaaS products. He focuses on ensuring our solutions deliver exceptional value and user experience to our customers.',
    image: '/images/team/placeholder.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/',
      twitter: 'https://twitter.com/',
      email: 'michael@trayarunyaventures.com',
    },
  },
  {
    name: 'Sarah Johnson',
    role: 'Chief Marketing Officer',
    bio: 'Sarah is a seasoned marketing executive with experience in both B2B and B2C environments. She leads our global marketing strategy and brand development initiatives.',
    image: '/images/team/placeholder.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/',
      twitter: 'https://twitter.com/',
      email: 'sarah@trayarunyaventures.com',
    },
  },
];

const advisors = [
  {
    name: 'Dr. Robert Williams',
    role: 'AI Research Advisor',
    bio: 'Dr. Williams is a leading researcher in artificial intelligence with numerous publications in top journals. He provides strategic guidance on our AI research and development.',
    image: '/images/team/placeholder.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/',
    },
  },
  {
    name: 'Jennifer Lee',
    role: 'Business Strategy Advisor',
    bio: 'Jennifer is a venture capitalist with expertise in scaling technology startups. She advises on business strategy, market positioning, and growth opportunities.',
    image: '/images/team/placeholder.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/',
    },
  },
];

export default function LeadershipPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

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
                  label="LEADERSHIP"
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
                  Our Leadership Team
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
                  Meet the talented individuals who drive our vision and lead our company to success.
                </Typography>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Leadership Team Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box
              component={motion.div}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              sx={{ mb: 10 }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {leadershipTeam.map((leader, index) => (
                  <Box
                    key={index}
                    component={motion.div}
                    variants={fadeIn}
                    sx={{
                      width: '100%',
                      flex: { xs: '0 0 100%', sm: '0 0 calc(50% - 16px)', lg: '0 0 calc(25% - 16px)' },
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 0,
                        height: '100%',
                        borderRadius: 4,
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                        transition: 'all 0.3s ease',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        '&:hover': {
                          transform: 'translateY(-10px)',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: 300,
                          backgroundColor: '#f5f5f5',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          component="div"
                          sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          }}
                        >
                          <Typography
                            variant="h2"
                            sx={{
                              color: alpha(theme.palette.primary.main, 0.2),
                              fontWeight: 800,
                            }}
                          >
                            {leader.name.split(' ').map(n => n[0]).join('')}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ p: 4 }}>
                        <Typography
                          variant="h5"
                          component="h2"
                          fontWeight={700}
                          gutterBottom
                          sx={{ color: theme.palette.text.primary }}
                        >
                          {leader.name}
                        </Typography>
                        
                        <Chip
                          label={leader.role}
                          size="small"
                          sx={{
                            mb: 2,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                          }}
                        />
                        
                        <Typography
                          variant="body2"
                          sx={{
                            mb: 3,
                            color: theme.palette.text.secondary,
                            lineHeight: 1.6,
                          }}
                        >
                          {leader.bio}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {leader.social.linkedin && (
                            <Box
                              component="a"
                              href={leader.social.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#0A66C2',
                                color: 'white',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  transform: 'translateY(-3px)',
                                  boxShadow: '0 5px 10px rgba(0,0,0,0.2)',
                                },
                              }}
                            >
                              <LinkedInIcon fontSize="small" />
                            </Box>
                          )}
                          
                          {leader.social.twitter && (
                            <Box
                              component="a"
                              href={leader.social.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#1DA1F2',
                                color: 'white',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  transform: 'translateY(-3px)',
                                  boxShadow: '0 5px 10px rgba(0,0,0,0.2)',
                                },
                              }}
                            >
                              <TwitterIcon fontSize="small" />
                            </Box>
                          )}
                          
                          {leader.social.email && (
                            <Box
                              component="a"
                              href={`mailto:${leader.social.email}`}
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: theme.palette.primary.main,
                                color: 'white',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  transform: 'translateY(-3px)',
                                  boxShadow: '0 5px 10px rgba(0,0,0,0.2)',
                                },
                              }}
                            >
                              <EmailIcon fontSize="small" />
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Advisors Section */}
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 6,
                  textAlign: 'center',
                  color: theme.palette.text.primary,
                }}
              >
                Our Advisors
              </Typography>
              
              <Box
                component={motion.div}
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}
              >
                {advisors.map((advisor, index) => (
                  <Box
                    key={index}
                    component={motion.div}
                    variants={fadeIn}
                    sx={{
                      width: '100%',
                      flex: { xs: '0 0 100%', sm: '0 0 calc(50% - 16px)', lg: '0 0 calc(33.333% - 16px)' },
                      maxWidth: 400,
                    }}
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
                      <Avatar
                        sx={{
                          width: 120,
                          height: 120,
                          mb: 3,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontSize: '2.5rem',
                          fontWeight: 700,
                        }}
                      >
                        {advisor.name.split(' ').map(n => n[0]).join('')}
                      </Avatar>
                      
                      <Typography
                        variant="h5"
                        component="h3"
                        fontWeight={700}
                        gutterBottom
                        sx={{ color: theme.palette.text.primary }}
                      >
                        {advisor.name}
                      </Typography>
                      
                      <Chip
                        label={advisor.role}
                        size="small"
                        sx={{
                          mb: 2,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                        }}
                      />
                      
                      <Typography
                        variant="body2"
                        sx={{
                          mb: 3,
                          color: theme.palette.text.secondary,
                          lineHeight: 1.6,
                        }}
                      >
                        {advisor.bio}
                      </Typography>
                      
                      {advisor.social.linkedin && (
                        <Box
                          component="a"
                          href={advisor.social.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#0A66C2',
                            color: 'white',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-3px)',
                              boxShadow: '0 5px 10px rgba(0,0,0,0.2)',
                            },
                          }}
                        >
                          <LinkedInIcon fontSize="small" />
                        </Box>
                      )}
                    </Paper>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Company Values */}
            <Box sx={{ mt: 10, textAlign: 'center' }}>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: theme.palette.text.primary,
                }}
              >
                Our Leadership Principles
              </Typography>
              
              <Typography
                variant="body1"
                sx={{ 
                  mb: 6, 
                  maxWidth: 700, 
                  mx: 'auto', 
                  color: theme.palette.text.secondary, 
                  fontSize: '1.1rem', 
                  lineHeight: 1.7 
                }}
              >
                These are the guiding principles that shape our leadership approach and company culture.
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
                {['Innovation', 'Integrity', 'Excellence', 'Customer Focus', 'Collaboration', 'Accountability'].map((value, index) => (
                  <Chip
                    key={index}
                    label={value}
                    sx={{
                      py: 2.5,
                      px: 2,
                      borderRadius: '50px',
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      fontSize: '1rem',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.2),
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>
    </Layout>
  );
}
