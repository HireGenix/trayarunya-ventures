'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const ConclusionSection = () => {
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

  const keyPoints = [
    {
      title: "Targeted Approach",
      icon: <CheckCircleIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      description: "A well-defined ICP ensures all messaging speaks directly to the needs and desires of the young, pop culture-savvy shopper."
    },
    {
      title: "Competitive Edge",
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      description: "Deep insights into competitor strategies mean we can match and outmaneuver them – adopting successful tactics while doubling down on Bewakoof's unique quirks and community focus."
    },
    {
      title: "Full-Funnel Strategy",
      icon: <PeopleIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      description: "Our comprehensive approach ensures no potential customer slips through the cracks – we attract them widely at the top, engage them in the middle, and convert them with smart prompts at the bottom."
    },
    {
      title: "Actionable Plan",
      icon: <FavoriteIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      description: "A robust content calendar keeps execution on track, blending creativity with strategic objectives on every channel for sustainable, community-driven growth."
    }
  ];

  return (
    <Box
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeIn}
      sx={{ mb: 10 }}
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
        Conclusion
      </Typography>

      <Box sx={{ mb: 6 }}>
        <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem' }}>
          By implementing this holistic digital marketing approach, Bewakoof can strengthen its position as the go-to brand for India's youth fashion.
          Our strategy doesn't just aim to sell more t-shirts – it's about growing the Bewakoof Tribe and turning casual buyers into lifelong brand ambassadors.
        </Typography>
      </Box>

      <Box 
        component={motion.div}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        sx={{ mb: 6, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}
      >
        {keyPoints.map((point, index) => (
          <Box key={index}>
            <Card
              component={motion.div}
              variants={fadeIn}
              sx={{
                height: '100%',
                borderRadius: 4,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                overflow: 'visible',
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.1)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {point.icon}
                  <Typography variant="h5" component="h3" fontWeight={700} sx={{ ml: 2 }}>
                    {point.title}
                  </Typography>
                </Box>
                <Typography variant="body1">
                  {point.description}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 6,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.15)} 100%)`,
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

        <Typography variant="h4" component="h3" fontWeight={700} sx={{ mb: 3 }}>
          Let's Make Bewakoof the Reigning King of Quirky Fashion
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, fontSize: '1.1rem' }}>
          With this plan, Trayarunya Ventures can confidently deliver a strategy that will boost brand awareness, 
          deepen customer loyalty, and drive sales growth in a sustainable, community-driven way. 
          Our approach is tailored specifically to Bewakoof's unique brand identity and target audience, 
          ensuring that every marketing effort resonates with the young, pop-culture savvy consumers you want to reach.
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, fontSize: '1.1rem' }}>
          We're excited about the opportunity to help Bewakoof dominate both the online space and the hearts of its customers. 
          Our team is ready to implement this comprehensive strategy and adapt it as we gather real-time performance data.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            sx={{
              px: 6,
              py: 1.5,
              borderRadius: 3,
              fontSize: '1.1rem',
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
            Let's Get Started
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ConclusionSection;
