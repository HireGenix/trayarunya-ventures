'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Avatar,
  Chip,
  useTheme, 
  alpha,
  Divider,
  IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Link from 'next/link';
import { MarketingNewsletter } from '.';

// Marketing insights data
const insights = [
  {
    id: 'content-marketing-2025',
    title: 'Future-Proof Your Content: Key Trends for 2025',
    excerpt: 'Stay ahead of the curve. We explore the content strategies that will captivate audiences and drive results in the coming year and beyond.',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'Priya Sharma',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      title: 'Head of Content Strategy'
    },
    category: 'Content Marketing',
    readTime: '6 min read',
    date: 'Apr 15, 2025',
    views: '2.1K', // Adjusted
    trending: true
  },
  {
    id: 'seo-algorithm-updates',
    title: 'Decoding Search Algorithms: Stay Visible, Stay Ahead',
    excerpt: 'Search engines are always evolving. Learn how to adapt your SEO approach to the latest algorithm shifts and keep your rankings strong.',
    image: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'Rahul Kapoor',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      title: 'Senior SEO Strategist'
    },
    category: 'SEO',
    readTime: '8 min read',
    date: 'Apr 8, 2025',
    views: '1.6K', // Adjusted
    trending: false
  },
  {
    id: 'social-media-engagement',
    title: 'Connect & Convert: Mastering Social Media Engagement Today',
    excerpt: 'It\'s a noisy world out there. Discover fresh, innovative ways to truly connect with your audience on social media and turn engagement into growth.',
    image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
    author: {
      name: 'Ananya Desai',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
      title: 'Social Media Lead'
    },
    category: 'Social Media',
    readTime: '7 min read',
    date: 'Mar 29, 2025',
    views: '2.9K', // Adjusted
    trending: true
  }
];

// Featured insight data
const featuredInsight = {
  id: 'ai-marketing-revolution',
  title: 'AI in Marketing: Separating Hype from Real Impact',
  excerpt: 'Artificial intelligence is reshaping how businesses reach customers. We cut through the noise to show you how AI tools, from smart analytics to content creation, are practically changing digital marketing. See how smart companies are using AI to get ahead.',
  image: 'https://images.unsplash.com/photo-1633613286991-611fe299c4be?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
  author: {
    name: 'Vikram Mehta',
    avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
    title: 'Lead Digital Innovator'
  },
  category: 'AI & Marketing Tech',
  readTime: '9 min read',
  date: 'Apr 20, 2025',
  views: '4.8K', // Adjusted
  highlights: [
    'Practical ways AI can personalize your customer interactions.',
    'Using predictive insights for smarter campaign decisions.',
    'How machine learning helps you get more from your ad budget.',
    'Important ethical points to consider with AI in marketing.'
  ]
};

const MarketingInsights = () => {
  const theme = useTheme();
  const primaryColor = '#8E44AD';
  const [savedArticles, setSavedArticles] = useState<string[]>([]);

  const toggleSaveArticle = (id: string) => {
    setSavedArticles(prev => 
      prev.includes(id) 
        ? prev.filter(articleId => articleId !== id) 
        : [...prev, id]
    );
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

  const cardVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    hover: {
      y: -10,
      boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
      transition: { duration: 0.3, ease: "easeOut" }
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
                icon={<LightbulbIcon />}
                label="EXPERT INSIGHTS"
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
                Stay Ahead: Marketing Insights & Trends
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
                The digital world moves fast. Our experts share their latest thinking on strategies, trends, and best practices 
                to help your business not just keep up, but lead the way.
              </Typography>
            </motion.div>
          </Box>

          {/* Featured Insight */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5, transition: { duration: 0.3 } }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 0,
                mb: 8,
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                border: `1px solid ${alpha(primaryColor, 0.1)}`,
                transition: 'all 0.3s ease',
                position: 'relative',
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
                  background: `radial-gradient(circle, ${alpha(primaryColor, 0.1)} 0%, rgba(255, 255, 255, 0) 70%)`,
                  filter: 'blur(40px)',
                  zIndex: 0,
                }}
              />
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, position: 'relative', zIndex: 1 }}>
                <Box 
                  sx={{ 
                    width: { xs: '100%', md: '50%' },
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: { xs: 250, md: 'auto' }
                  }}
                >
                  <Box
                    component="img"
                    src={featuredInsight.image}
                    alt={featuredInsight.title}
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
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      zIndex: 1,
                    }}
                  >
                    <Chip
                      label="Featured"
                      sx={{
                        backgroundColor: primaryColor,
                        color: 'white',
                        fontWeight: 600,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                      }}
                    />
                  </Box>
                  
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                      p: 3,
                      zIndex: 1,
                      display: { xs: 'none', md: 'flex' },
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <VisibilityIcon sx={{ color: 'white', fontSize: 18, mr: 1 }} />
                      <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
                        {featuredInsight.views} views
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        sx={{ 
                          color: 'white',
                          backgroundColor: alpha('#fff', 0.1),
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.2),
                          }
                        }}
                        onClick={() => toggleSaveArticle(featuredInsight.id)}
                      >
                        {savedArticles.includes(featuredInsight.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{ 
                          color: 'white',
                          backgroundColor: alpha('#fff', 0.1),
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.2),
                          }
                        }}
                      >
                        <ShareIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
                
                <Box 
                  sx={{ 
                    width: { xs: '100%', md: '50%' },
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      <Chip
                        label={featuredInsight.category}
                        size="small"
                        sx={{
                          backgroundColor: alpha(primaryColor, 0.1),
                          color: primaryColor,
                          fontWeight: 600,
                        }}
                      />
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          ml: { xs: 0, sm: 1 },
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 10,
                          backgroundColor: alpha('#FF9800', 0.1),
                        }}
                      >
                        <TrendingUpIcon sx={{ color: '#FF9800', fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption" fontWeight={600} sx={{ color: '#FF9800' }}>
                          Trending
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="h4" component="h3" fontWeight={700} gutterBottom>
                      {featuredInsight.title}
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ mb: 3, fontSize: '1.1rem', lineHeight: 1.7 }}>
                      {featuredInsight.excerpt}
                    </Typography>
                  </Box>
                  
                  <Box 
                    sx={{ 
                      mb: 3,
                      p: 3,
                      borderRadius: 3,
                      backgroundColor: alpha(primaryColor, 0.05),
                      border: `1px solid ${alpha(primaryColor, 0.1)}`,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: primaryColor }}>
                      Key Highlights:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                      {featuredInsight.highlights.map((highlight, index) => (
                        <Box 
                          component="li" 
                          key={index} 
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="body2" fontWeight={500}>
                            {highlight}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <VisibilityIcon sx={{ color: 'text.secondary', fontSize: 18, mr: 1 }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {featuredInsight.views} views
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        sx={{ 
                          color: primaryColor,
                          backgroundColor: alpha(primaryColor, 0.1),
                          '&:hover': {
                            backgroundColor: alpha(primaryColor, 0.2),
                          }
                        }}
                        onClick={() => toggleSaveArticle(featuredInsight.id)}
                      >
                        {savedArticles.includes(featuredInsight.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                      </IconButton>
                      <IconButton 
                        size="small" 
                        sx={{ 
                          color: primaryColor,
                          backgroundColor: alpha(primaryColor, 0.1),
                          '&:hover': {
                            backgroundColor: alpha(primaryColor, 0.2),
                          }
                        }}
                      >
                        <ShareIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mt: 'auto' }}>
                    <Divider sx={{ mb: 3 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          src={featuredInsight.author.avatar} 
                          alt={featuredInsight.author.name}
                          sx={{ 
                            width: 48, 
                            height: 48, 
                            mr: 2,
                            border: `2px solid ${alpha(primaryColor, 0.3)}`,
                          }}
                        />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {featuredInsight.author.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {featuredInsight.author.title}
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          {featuredInsight.date} • {featuredInsight.readTime}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Button
                      variant="contained"
                      size="medium"
                      component={Link}
                      href="#"
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        mt: 3,
                        backgroundColor: primaryColor,
                        py: 1.2,
                        px: 3,
                        borderRadius: '50px',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: alpha(primaryColor, 0.9),
                          transform: 'translateY(-3px)',
                          boxShadow: `0 8px 20px ${alpha(primaryColor, 0.3)}`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Read Full Article
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </motion.div>

          {/* Recent Insights */}
          <Box sx={{ mb: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" component="h3" fontWeight={700}>
                Recent Insights
              </Typography>
              <Button
                variant="text"
                component={Link}
                href="#"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  color: primaryColor,
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: alpha(primaryColor, 0.05),
                  },
                }}
              >
                View All
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: -2 }}>
              {insights.map((insight) => (
                <Box 
                  key={insight.id} 
                  sx={{ 
                    width: { xs: '100%', md: '33.33%' },
                    padding: 2
                  }}
                >
                  <motion.div
                    variants={cardVariants}
                    whileHover="hover"
                  >
                    <Card
                      elevation={0}
                      sx={{
                        height: '100%',
                        borderRadius: 4,
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                        border: `1px solid ${alpha(primaryColor, 0.1)}`,
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          height="200"
                          image={insight.image}
                          alt={insight.title}
                          sx={{
                            transition: 'transform 0.5s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                            },
                          }}
                        />
                        
                        {insight.trending && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 16,
                              right: 16,
                              zIndex: 1,
                            }}
                          >
                            <Box 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 10,
                                backgroundColor: alpha('#FF9800', 0.9),
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                              }}
                            >
                              <TrendingUpIcon sx={{ color: 'white', fontSize: 16, mr: 0.5 }} />
                              <Typography variant="caption" fontWeight={600} sx={{ color: 'white' }}>
                                Trending
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                      
                      <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Chip
                            label={insight.category}
                            size="small"
                            sx={{
                              backgroundColor: alpha(primaryColor, 0.1),
                              color: primaryColor,
                              fontWeight: 600,
                            }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <VisibilityIcon sx={{ color: 'text.secondary', fontSize: 16, mr: 0.5 }} />
                            <Typography variant="caption" color="textSecondary">
                              {insight.views}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Typography variant="h5" component="h3" fontWeight={700} gutterBottom>
                          {insight.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                          {insight.excerpt}
                        </Typography>
                        
                        <Divider sx={{ mb: 2 }} />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar 
                              src={insight.author.avatar} 
                              alt={insight.author.name}
                              sx={{ 
                                width: 32, 
                                height: 32, 
                                mr: 1,
                                border: `1px solid ${alpha(primaryColor, 0.3)}`,
                              }}
                            />
                            <Typography variant="caption" fontWeight={600}>
                              {insight.author.name}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="textSecondary">
                            {insight.date}
                          </Typography>
                        </Box>
                      </CardContent>
                      
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          p: 2, 
                          pt: 0,
                          borderTop: `1px solid ${alpha('#000', 0.05)}`,
                        }}
                      >
                        <Button
                          size="small"
                          component={Link}
                          href="#"
                          endIcon={<ArrowForwardIcon />}
                          sx={{
                            color: primaryColor,
                            fontWeight: 600,
                            '&:hover': {
                              backgroundColor: alpha(primaryColor, 0.05),
                            },
                          }}
                        >
                          Read More
                        </Button>
                        <Box>
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: savedArticles.includes(insight.id) ? primaryColor : 'text.secondary',
                              '&:hover': {
                                backgroundColor: alpha(primaryColor, 0.1),
                              }
                            }}
                            onClick={() => toggleSaveArticle(insight.id)}
                          >
                            {savedArticles.includes(insight.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                          </IconButton>
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'text.secondary',
                              '&:hover': {
                                backgroundColor: alpha(primaryColor, 0.1),
                              }
                            }}
                          >
                            <ShareIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </Card>
                  </motion.div>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Newsletter Section */}
          <MarketingNewsletter />
        </motion.div>
      </Container>
    </Box>
  );
};

export default MarketingInsights;
