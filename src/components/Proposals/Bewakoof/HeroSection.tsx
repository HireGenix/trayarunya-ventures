'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
  Paper,
  Stack,
  Chip,
  Avatar,
  useMediaQuery
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  Groups as GroupsIcon,
  Visibility as VisibilityIcon,
  ShoppingCart as ShoppingCartIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const HeroSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    }
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

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const statsData = [
    { 
      icon: <VisibilityIcon fontSize="large" />, 
      value: '3.2M+', 
      label: 'Monthly Impressions', 
      color: theme.palette.primary.main 
    },
    { 
      icon: <GroupsIcon fontSize="large" />, 
      value: '18-34', 
      label: 'Target Age Group', 
      color: theme.palette.secondary.main 
    },
    { 
      icon: <TrendingUpIcon fontSize="large" />, 
      value: '42%', 
      label: 'Engagement Increase', 
      color: theme.palette.success.main 
    },
    { 
      icon: <ShoppingCartIcon fontSize="large" />, 
      value: '3.5x', 
      label: 'ROAS Target', 
      color: theme.palette.warning.main 
    }
  ];

  // Decorative elements
  const BackgroundPattern = () => (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        overflow: 'hidden',
        opacity: 0.4,
      }}
    >
      {/* Decorative circles */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        sx={{
          position: 'absolute',
          top: '5%',
          right: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, rgba(255,255,255,0) 70%)`,
        }}
      />
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.2 }}
        sx={{
          position: 'absolute',
          bottom: '15%',
          left: '5%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, rgba(255,255,255,0) 70%)`,
        }}
      />
      
      {/* Decorative dots pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(${alpha(theme.palette.primary.main, 0.2)} 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
          opacity: 0.3,
        }}
      />
    </Box>
  );

  return (
    <Box
      component={motion.div}
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      sx={{ 
        mb: 10,
        pt: 4,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <BackgroundPattern />
      
      {/* Main content */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Header section */}
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ position: 'relative', mb: 2 }}>
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                fontWeight: 800,
                mb: 2,
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2,
                position: 'relative',
                zIndex: 2,
              }}
            >
              Holistic Digital Marketing Strategy
            </Typography>
            
            {/* Decorative elements behind title */}
            <Box
              component={motion.div}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 0.1, scale: 1 }}
              transition={{ duration: 1 }}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120%',
                height: '120%',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${theme.palette.primary.main} 0%, rgba(255,255,255,0) 70%)`,
                zIndex: 1,
              }}
            />
          </Box>

          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              fontWeight: 700,
              mb: 4,
              color: theme.palette.text.primary,
            }}
          >
            for <Box component="span" sx={{ color: theme.palette.primary.main }}>Bewakoof.com</Box>
          </Typography>

          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.95, width: '0%' }}
            animate={{ opacity: 1, scale: 1, width: '100%' }}
            transition={{ delay: 0.3, duration: 0.8 }}
            sx={{
              mx: 'auto',
              maxWidth: 800,
              height: 5,
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              mb: 6,
              borderRadius: 2,
            }}
          />

          <Typography
            variant="h5"
            component="p"
            sx={{
              fontWeight: 500,
              mb: 4,
              maxWidth: 900,
              mx: 'auto',
              color: alpha(theme.palette.text.primary, 0.8),
              lineHeight: 1.6,
            }}
          >
            A comprehensive approach to elevate Bewakoof's digital presence, engage the target audience, 
            and drive conversions through strategic content and marketing initiatives.
          </Typography>
        </Box>
        
        {/* Key metrics */}
        <Box
          component={motion.div}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          sx={{ 
            mb: 6,
            mx: 'auto',
            maxWidth: 1100
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
            {statsData.map((stat, index) => (
              <Box key={index} sx={{ width: { xs: 'calc(50% - 24px)', md: 'calc(25% - 24px)' } }}>
                <Paper
                  component={motion.div}
                  variants={scaleIn}
                  elevation={2}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${alpha(stat.color, 0.05)} 0%, ${alpha(stat.color, 0.15)} 100%)`,
                    border: `1px solid ${alpha(stat.color, 0.2)}`,
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: `0 10px 20px ${alpha(stat.color, 0.2)}`,
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      color: stat.color,
                      mb: 1,
                      p: 1,
                      borderRadius: '50%',
                      backgroundColor: alpha(stat.color, 0.1)
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography 
                    variant="h3" 
                    component="div" 
                    sx={{ 
                      fontWeight: 700, 
                      mb: 1,
                      color: stat.color
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 500,
                      textAlign: 'center',
                      color: theme.palette.text.secondary
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* CTA Buttons */}
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 3,
              mb: 8,
            }}
          >
            <Button
              component={motion.button}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              variant="contained"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  boxShadow: '0 12px 20px rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              Explore Strategy
            </Button>
            <Button
              component={motion.button}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              variant="outlined"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                '&:hover': {
                  borderColor: theme.palette.primary.dark,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              Download Proposal
            </Button>
          </Box>
        </Box>
        
        {/* Brand showcase */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.background.paper, 0.6),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            width: '100%',
            maxWidth: 1100,
            mx: 'auto',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background decoration */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: { xs: '150px', md: '250px' },
              height: { xs: '150px', md: '250px' },
              background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, rgba(255,255,255,0) 70%)`,
              zIndex: 0,
            }}
          />
          
          {/* Content with flexbox layout instead of Grid */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'center' }}>
            {/* Left column */}
            <Box sx={{ flex: '1 1 60%' }}>
              <Stack spacing={3}>
                <Box>
                  <Chip 
                    label="PROPOSAL OVERVIEW" 
                    size="small"
                    sx={{ 
                      fontWeight: 600, 
                      mb: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    }} 
                  />
                  <Typography
                    variant="h4"
                    component="h3"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Prepared by Trayarunya Ventures
                  </Typography>
                </Box>
                
                <Typography
                  variant="body1"
                  sx={{
                    color: alpha(theme.palette.text.primary, 0.8),
                    lineHeight: 1.8,
                    fontSize: '1.1rem',
                  }}
                >
                  A strategic digital marketing proposal designed to position Bewakoof as the leading quirky fashion brand 
                  for India's youth, leveraging data-driven insights and creative content strategies.
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  {['Social Media', 'Content Strategy', 'Influencer Marketing', 'SEO', 'Analytics'].map((tag, index) => (
                    <Chip 
                      key={index}
                      label={tag} 
                      size="small"
                      sx={{ 
                        fontWeight: 500,
                        backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                        color: theme.palette.secondary.main,
                      }} 
                    />
                  ))}
                </Box>
              </Stack>
            </Box>
            
            {/* Right column */}
            <Box sx={{ flex: '1 1 40%', zIndex: 1 }}>
              <Box
                component={motion.div}
                whileHover={{ scale: 1.03, rotate: 1 }}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '5px',
                    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  }}
                />
                
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Avatar
                    sx={{ 
                      width: 60, 
                      height: 60,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      fontWeight: 700,
                      fontSize: '1.5rem',
                    }}
                  >
                    B
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>Bewakoof.com</Typography>
                    <Typography variant="body2" color="text.secondary">Fashion for the Young & Quirky</Typography>
                  </Box>
                </Stack>
                
                <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                  "Transforming casual fashion into a statement of individuality for India's youth."
                </Typography>
                
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Key Objectives:
                  </Typography>
                  <Stack spacing={1}>
                    {['Increase brand awareness', 'Boost engagement', 'Drive conversions', 'Build community'].map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            backgroundColor: theme.palette.primary.main,
                            mr: 1.5
                          }} 
                        />
                        <Typography variant="body2">{item}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
        
        {/* Scroll indicator */}
        {!isMobile && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Box
              component={motion.div}
              animate={{ 
                y: [0, 10, 0],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                repeat: Infinity,
                duration: 2
              }}
              sx={{ color: theme.palette.text.secondary }}
            >
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Scroll to explore
              </Typography>
              <ArrowDownwardIcon />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HeroSection;
