'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  alpha,
  Avatar,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Favorite as FavoriteIcon,
  EmojiEvents as EmojiEventsIcon,
  SentimentDissatisfied as SentimentDissatisfiedIcon,
  Info as InfoIcon,
  Interests as InterestsIcon,
  Chat as ChatIcon,
  Campaign as CampaignIcon,
  Smartphone as SmartphoneIcon,
  LocationOn as LocationOnIcon,
  Devices as DevicesIcon,
  LocalMall as LocalMallIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const ICPSection = () => {
  const theme = useTheme();
  const [expandedCards, setExpandedCards] = React.useState<Record<number, boolean>>({});

  // Toggle card expansion
  const toggleCardExpansion = (index: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
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

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const icpData = [
    {
      title: "Demographics",
      icon: <PersonIcon sx={{ fontSize: 30, color: theme.palette.primary.main }} />,
      content: "Young adults 18-34 (core 16-24) from metro and Tier II/III cities, both male and female. They are students or early-career professionals, digitally savvy and social-media active, with a moderate disposable income.",
      color: theme.palette.primary.main,
      tags: ["18-34 Age Group", "Students", "Early Professionals", "Metro Cities", "Tier II/III Cities"],
      iconBg: alpha(theme.palette.primary.main, 0.1)
    },
    {
      title: "Goals & Values",
      icon: <EmojiEventsIcon sx={{ fontSize: 30, color: theme.palette.secondary.main }} />,
      content: "Seeking self-expression through fashion – they love quirky, pop culture-inspired apparel that reflects their personality. Value affordability and quality, wanting stylish looks on a budget. They appreciate brands with a fun, relatable voice and a sense of community (feeling part of a \"tribe\"). Many are eco-aware, so sustainable touches (organic cotton, minimal packaging) are a bonus.",
      color: theme.palette.secondary.main,
      tags: ["Self-expression", "Affordability", "Quality", "Community", "Sustainability"],
      iconBg: alpha(theme.palette.secondary.main, 0.1)
    },
    {
      title: "Challenges & Pain Points",
      icon: <SentimentDissatisfiedIcon sx={{ fontSize: 30, color: theme.palette.error.main }} />,
      content: "Budget constraints – they want the latest trends without breaking the bank. Overwhelmed by too many options online; need help finding relevant, trendy pieces. Concern about quality and fit when shopping online (will that ₹499 graphic tee last and fit well?). FOMO – fear of missing out on limited-edition fandom merch or drops. Parents or older generation might not \"get\" their quirky style, so they seek validation from peers.",
      color: theme.palette.error.main,
      tags: ["Budget Constraints", "Choice Overload", "Quality Concerns", "FOMO", "Peer Validation"],
      iconBg: alpha(theme.palette.error.main, 0.1)
    },
    {
      title: "Sources of Information",
      icon: <InfoIcon sx={{ fontSize: 30, color: theme.palette.info.main }} />,
      content: "Heavily influenced by Instagram and YouTube – they follow fashion meme pages, influencers, and YouTubers for style inspo. Scroll through Instagram Reels and YouTube hauls (e.g. \"Outfit Haul\" videos) for new ideas. They engage in pop culture communities on Reddit and follow brand handles on Facebook/Instagram for updates. Word-of-mouth from friends and campus trends also guide them.",
      color: theme.palette.info.main,
      tags: ["Instagram", "YouTube", "Reddit", "Influencers", "Word-of-mouth"],
      iconBg: alpha(theme.palette.info.main, 0.1)
    },
    {
      title: "Interests & Passions",
      icon: <InterestsIcon sx={{ fontSize: 30, color: theme.palette.success.main }} />,
      content: "Immersed in pop culture – Marvel and anime marathons, Netflix binges, and trending memes are their language. They love attending comic-cons, music festivals, and college fests (wearing fandom tees proudly). Into gaming, gadgets, movies, and cricket, as these topics dominate the content they engage with on social media. They prefer a casual lifestyle – hoodies, tees, and joggers for daily wear.",
      color: theme.palette.success.main,
      tags: ["Pop Culture", "Marvel/Anime", "Gaming", "Music Festivals", "Casual Fashion"],
      iconBg: alpha(theme.palette.success.main, 0.1)
    },
    {
      title: "Key Messaging Hooks",
      icon: <ChatIcon sx={{ fontSize: 30, color: theme.palette.warning.main }} />,
      content: "\"Wear Your Fandom\" – tap into their love for movies/series; \"Trendy looks under ₹599\" – emphasize affordability; \"Express Yourself\" – highlight individuality; \"Join the Bewakoof Tribe\" – invite them into the community. Messaging should be quirky, witty, and meme-friendly, aligning with Bewakoof's playful brand tone. For example, referencing a viral meme or film quote on a t-shirt and saying \"Limited Edition – Don't let FOMO strike!\".",
      color: theme.palette.warning.main,
      tags: ["Wear Your Fandom", "Trendy & Affordable", "Express Yourself", "Join the Tribe", "Meme-friendly"],
      iconBg: alpha(theme.palette.warning.main, 0.1)
    },
    {
      title: "Preferred CTAs",
      icon: <CampaignIcon sx={{ fontSize: 30, color: theme.palette.primary.dark }} />,
      content: "Clear and value-driven CTAs work best. Examples: \"Shop New Arrivals\", \"Get My Quirky Tee\", \"Join TriBe for Exclusive Perks\" (leveraging Bewakoof's TriBe membership program), \"Swipe Up to Steal the Look\", or \"Limited Time: Grab 2 for ₹999\". These CTAs combine urgency with the promise of value or community, addressing the ICP's desire for trendy yet affordable fashion.",
      color: theme.palette.primary.dark,
      tags: ["Shop New Arrivals", "Get My Quirky Tee", "Join TriBe", "Limited Time Offers", "Value-driven"],
      iconBg: alpha(theme.palette.primary.dark, 0.1)
    }
  ];

  // Persona traits for the visual representation
  const personaTraits = [
    { icon: <SmartphoneIcon />, label: "Digital Native" },
    { icon: <LocationOnIcon />, label: "Urban & Tier II/III" },
    { icon: <SchoolIcon />, label: "Student/Early Career" },
    { icon: <DevicesIcon />, label: "Tech & Social Media Savvy" },
    { icon: <FavoriteIcon />, label: "Pop Culture Enthusiast" },
    { icon: <LocalMallIcon />, label: "Budget-Conscious Shopper" },
  ];

  return (
    <Box
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeIn}
      sx={{ 
        mb: 10,
        position: 'relative',
        pt: 2
      }}
    >
      {/* Decorative background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.05)} 0%, rgba(255,255,255,0) 70%)`,
          zIndex: -1,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -50,
          left: -100,
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.05)} 0%, rgba(255,255,255,0) 70%)`,
          zIndex: -1,
        }}
      />

      {/* Section header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography
          variant="h3"
          component="h2"
          sx={{
            mb: 2,
            fontWeight: 700,
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Ideal Customer Persona (ICP)
        </Typography>

        <Typography
          variant="h5"
          component="h3"
          sx={{
            mb: 3,
            fontWeight: 600,
            color: theme.palette.text.secondary,
          }}
        >
          "The Trendy Tribe Member"
        </Typography>

        <Box
          component={motion.div}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          sx={{
            height: 3,
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            mx: 'auto',
            maxWidth: 100,
            mb: 4,
            borderRadius: 2,
          }}
        />

        <Typography
          variant="body1"
          sx={{
            maxWidth: 800,
            mx: 'auto',
            color: alpha(theme.palette.text.primary, 0.8),
          }}
        >
          Understanding our target audience is crucial for creating effective marketing strategies. 
          Our ideal customer persona represents the core demographic we aim to reach with our campaigns.
        </Typography>
      </Box>

      {/* Persona visual representation */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, mb: 8 }}>
        <Box 
          sx={{ 
            flex: { xs: '1 1 100%', md: '0 0 40%' },
            position: 'relative',
            zIndex: 1
          }}
        >
          <Box
            component={motion.div}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              position: 'relative',
            }}
          >
            {/* Decorative circle behind avatar */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 240,
                height: 240,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, rgba(255,255,255,0) 70%)`,
                zIndex: -1,
              }}
            />
            
            <Avatar
              component={motion.div}
              whileHover={{ scale: 1.05 }}
              sx={{
                width: 200,
                height: 200,
                mb: 3,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <PersonIcon sx={{ fontSize: 100, color: theme.palette.primary.main }} />
            </Avatar>
            
            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative top border */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                }}
              />
              
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Profile Summary
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Young, digitally-savvy individuals who express their personality through fashion. 
                They're budget-conscious but style-focused, seeking unique pieces that reflect their 
                interests in pop culture, gaming, and trending content.
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Key Traits
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {personaTraits.map((trait, index) => (
                  <Chip
                    key={index}
                    icon={trait.icon}
                    label={trait.label}
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      '& .MuiChip-icon': {
                        color: theme.palette.primary.main,
                      },
                    }}
                  />
                ))}
              </Box>
              
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <SchoolIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Students & Early Professionals" 
                    secondary="Ages 18-34 (core 16-24)"
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FavoriteIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Pop Culture Enthusiasts" 
                    secondary="Marvel, Anime, Netflix, Gaming"
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>
        </Box>
        
        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 60%' } }}>
          <Box
            component={motion.div}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            sx={{ height: '100%' }}
          >
            <Card
              component={motion.div}
              variants={scaleIn}
              sx={{
                height: '100%',
                borderRadius: 4,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                overflow: 'visible',
                position: 'relative',
                transition: 'all 0.3s ease',
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" component="h3" fontWeight={700} sx={{ mb: 3 }}>
                  Understanding Our Target Audience
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  The "Trendy Tribe Member" represents Bewakoof's core audience - young, fashion-forward 
                  individuals who use clothing as a form of self-expression. They're digital natives who 
                  are highly active on social media and influenced by online trends, memes, and pop culture.
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  This persona values both style and affordability, seeking unique pieces that help them 
                  stand out while staying within budget. They're drawn to brands that understand their 
                  interests and speak their language, preferring authentic, relatable communication over 
                  traditional marketing.
                </Typography>
                <Typography variant="body1">
                  By deeply understanding this persona, we can craft marketing strategies that resonate 
                  with their needs, preferences, and behaviors, effectively engaging them across channels 
                  and driving both acquisition and loyalty.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* ICP Data Cards */}
      <Typography
        variant="h4"
        component="h3"
        sx={{
          mb: 4,
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        Detailed Persona Insights
      </Typography>

      <Box 
        component={motion.div}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
      >
        {icpData.map((item, index) => (
          <Box key={index} sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' } }}>
            <Card
              component={motion.div}
              variants={scaleIn}
              sx={{
                borderRadius: 4,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                overflow: 'visible',
                position: 'relative',
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: `0 16px 40px ${alpha(item.color, 0.15)}`,
                },
                border: `1px solid ${alpha(item.color, 0.1)}`,
              }}
            >
              {/* Colored top border */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  backgroundColor: item.color,
                }}
              />
              
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      backgroundColor: item.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography variant="h5" component="h3" fontWeight={700}>
                    {item.title}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Tooltip title={expandedCards[index] ? "Show less" : "Show more"}>
                    <IconButton 
                      size="small" 
                      onClick={() => toggleCardExpansion(index)}
                      sx={{ color: item.color }}
                    >
                      {expandedCards[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Typography 
                  variant="body1" 
                  sx={{ 
                    mb: 2,
                    display: expandedCards[index] ? 'block' : '-webkit-box',
                    WebkitLineClamp: expandedCards[index] ? 'unset' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.content}
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {item.tags.map((tag, tagIndex) => (
                    <Chip
                      key={tagIndex}
                      label={tag}
                      size="small"
                      sx={{
                        backgroundColor: alpha(item.color, 0.1),
                        color: item.color,
                        fontWeight: 500,
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ICPSection;
