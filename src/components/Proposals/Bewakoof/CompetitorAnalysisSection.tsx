'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Language as LanguageIcon,
  CheckCircle as CheckCircleIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  YouTube as YouTubeIcon,
  ArrowUpward as ArrowUpwardIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`competitor-tabpanel-${index}`}
      aria-labelledby={`competitor-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `competitor-tab-${index}`,
    'aria-controls': `competitor-tabpanel-${index}`,
  };
}

const CompetitorAnalysisSection = () => {
  const theme = useTheme();
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
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

  // Competitor data
  const indianCompetitors = [
    {
      name: 'The Souled Store (TSS)',
      description: 'A direct rival known for pop culture merchandise.',
      strategies: [
        'Invests 90% of marketing budget in digital channels (Facebook, Instagram, Google, YouTube)',
        'Excels on Instagram with visual storytelling and a fun, quirky brand personality similar to Bewakoof',
        'Content is heavily fandom-driven: weekly new design drops, memes, and references to trending movies and sports',
        'Uses hashtags like #CelebrateFandom and #ExpressYourself, fostering a community of fans',
        'Average engagement on Instagram is solid (~4.5k likes, 14k video views per post)',
        'Facebook mirrors Instagram content for broader reach',
        'YouTube is utilized for video ads and longer-form content to showcase new collections'
      ],
      insight: "TSS's strategy shows the power of consistent pop culture content and a unified cross-platform voice in engaging Gen Z audiences."
    },
    {
      name: 'Myntra',
      description: "India's largest fashion e-commerce platform (now Flipkart-owned) competes on breadth of selection.",
      strategies: [
        'Leans on influencer marketing and social media campaigns',
        'Launched a Gen-Z focused line "Myntra FWD" promoted via an Instagram influencer mega-campaign with 15,000 influencers, yielding over 60 million views',
        'Leverages Instagram and YouTube influencers for style tips and unboxing videos',
        'Integrates influencer content into the Myntra app via features like "Myntra Studio"',
        'Content trends: celebrity partnerships, fashion challenges (e.g., #MyntraFashionWeekend), and big sale countdowns',
        'Facebook is used for mass reach and retargeting, often with product collages and carousels of deals',
        'YouTube houses style guide series and brand ads'
      ],
      insight: "Myntra's scale shows in its campaigns – they saturate social media during key events, combining top-tier influencer endorsements with thousands of micro-influencers to dominate the conversation."
    },
    {
      name: 'Ajio',
      description: "Reliance's fashion e-comm, Ajio, targets a similar demographic with edgy youth fashion.",
      strategies: [
        'Social media is commerce-driven: frequent Instagram/Facebook posts highlighting ongoing sales',
        'Uses #AjioFlashSale tags and influencer tie-ins during the famous Reliance events',
        'Often uses Instagram Stories for flash deals',
        'Strong YouTube presence for showcasing lookbooks and celeb-led collections',
        'Not as community-meme driven as Bewakoof',
        'Competes via aggressive digital ads and app notifications'
      ],
      insight: "Ajio ensures they stay in customers' view during purchase consideration through aggressive promotions and celebrity partnerships."
    },
    {
      name: 'Niche D2C Brands',
      description: 'A wave of smaller quirky apparel startups also contend with Bewakoof.',
      strategies: [
        'Beyoung – Founded 2017, focusing on affordable graphic tees; active on Instagram with frequent contest posts',
        'Redwolf – Pop culture streetwear brand known for collaborating with independent artists; highlights artist stories and limited-edition drops',
        'Urban Monkey – Streetwear & accessories with an urban youth vibe; Instagram content is heavy on urban lifestyle reels and user-generated content',
        'Chumbak – Started with Indian graphic souvenirs, now in apparel; strong on Instagram aesthetics with vibrant, design-centric images'
      ],
      insight: "Many Indian competitors echo Bewakoof's playbook – trendy designs + social media buzz. However, Bewakoof currently leads in social media reach (4.6M Facebook followers vs ~1.1M for TSS; 581k Instagram vs 239k for TSS)."
    }
  ];

  const globalCompetitors = [
    {
      name: 'H&M',
      description: 'The global fast-fashion giant competes for the same young, budget-fashion consumers.',
      strategies: [
        'Highly sophisticated and content-rich digital marketing',
        'Extremely active Instagram presence, posting around 3-4 times per day (over 100 posts per month consistently)',
        'Content includes new collection spotlights, influencer partnerships, and user-generated content campaigns',
        'Formed a Gen-Z consumer panel to inform their influencer content strategy',
        'Massive engagement at scale – e.g., 485 posts in a year yielded 38 million interactions for Zara (a similar fast-fashion peer)',
        'On YouTube, uploads polished campaign videos and behind-the-scenes clips'
      ],
      insight: 'Global players like H&M leverage heavy content volume plus data-driven social listening to stay culturally relevant – a tactic Bewakoof can emulate on a smaller scale.'
    },
    {
      name: 'Shein',
      description: "The Chinese online-only fashion juggernaut (hugely popular globally among Gen Z).",
      strategies: [
        'Growth is a case study in social media domination – with ~30 million Instagram followers worldwide',
        'Became the most talked-about fashion brand by 2022',
        'Strategy centers on a flood of micro-influencers and haul videos',
        'Partners with countless influencers on Instagram/TikTok to post #SHEINhaul videos',
        "Before Shein's app was banned in India, they reportedly worked with ~2,000 Indian influencers for local reach",
        'On Facebook and YouTube, invests heavily in ads and even launched a reality show co-hosted by a celebrity (Khloé Kardashian)'
      ],
      insight: 'Even without physical stores, Shein built a global community through aggressive social media challenges, discount codes via influencers, and an unrivaled stream of fresh content (posting thousands of new products daily).'
    },
    {
      name: 'Global Pop-Culture Labels',
      description: "Brands like Hot Topic (US), Uniqlo's UT line (global), or Threadless offer pop culture or graphic apparel internationally.",
      strategies: [
        "Often collaborate on official merchandise (e.g., Uniqlo's Pokémon or Marvel t-shirts collections)",
        'Use social media to tap fandom communities',
        "Hot Topic's Instagram targets alternative youth culture (rock music, anime fandoms) with a mix of product posts and fan art shares",
        'These brands thrive by aligning with fan communities'
      ],
      insight: "These brands thrive by aligning with fan communities – a principle Bewakoof already uses and can expand (e.g., more official collabs or fan art contests to engage global audiences)."
    }
  ];

  const competitorTrends = [
    {
      category: 'Content Themes',
      trends: [
        'Pop culture references, memes, lifestyle inspiration, and user-generated content are key across competitors',
        'TSS mixes pop culture and fashion "seamlessly" in products and posts',
        'H&M and Zara ride general fashion trends with high-volume posting',
        'Shein and Myntra leverage influencer-generated lifestyle content at scale'
      ]
    },
    {
      category: 'Frequency & Channels',
      trends: [
        'Almost all competitors prioritize Instagram (for visual youth engagement) and Facebook (for reach and retargeting)',
        'YouTube is used for longer videos (ads, lookbooks, influencer challenges)',
        'Posting frequency ranges from daily to multiple times daily for big brands',
        'Consistency is vital – brands that stay top-of-mind with regular posts and stories retain higher engagement'
      ]
    },
    {
      category: 'Engagement Strategies',
      trends: [
        'Hashtag campaigns (e.g., #thesouledstore #SHEINhaul) to encourage audience participation',
        'Contests/giveaways (tag-a-friend to win merch) to boost sharing',
        'Influencer takeovers (Instagram lives or reels by influencers wearing the brand) to lend authenticity',
        "Community building – some create exclusive groups or memberships (e.g., Bewakoof's TriBe, Hot Topic's fandom clubs) to nurture loyalty"
      ]
    },
    {
      category: 'Creative Campaign Ideas',
      trends: [
        "Trend-jacking: Bewakoof's own \"Save the Billionaire – #MyDorkyIdea\" campaign piggybacked on Avengers buzz",
        "Challenges: Myntra's Gen-Z campaign built content buckets like \"FWD Made Me Buy It\" (spoofing the \"TikTok made me buy it\" trend)",
        'Collaborations: Many partner with celebrities or pop icons (Bewakoof with actress Sanya Malhotra, Uniqlo with artists) to gain credibility and reach new fans'
      ]
    }
  ];

  // Social media platform icons with colors
  const socialPlatforms = [
    { name: 'Instagram', icon: <InstagramIcon />, color: '#E1306C' },
    { name: 'Facebook', icon: <FacebookIcon />, color: '#4267B2' },
    { name: 'YouTube', icon: <YouTubeIcon />, color: '#FF0000' }
  ];

  return (
    <Box
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeIn}
      sx={{ 
        position: 'relative',
        pt: 2
      }}
    >
      {/* Decorative background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -80,
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.05)} 0%, rgba(255,255,255,0) 70%)`,
          zIndex: -1,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 100,
          left: -100,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.05)} 0%, rgba(255,255,255,0) 70%)`,
          zIndex: -1,
        }}
      />
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
        Competitor Analysis
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
        India & Global Landscape
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Bewakoof operates in a competitive casual fashion space, facing both local D2C rivals and global giants. 
          We dissect key players and their digital strategies on Instagram, Facebook, and YouTube:
        </Typography>
      </Box>

      <Box sx={{ width: '100%', mb: 6 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="competitor analysis tabs"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                minWidth: 120,
              },
              '& .Mui-selected': {
                color: theme.palette.primary.main,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
                height: 3,
              },
            }}
          >
            <Tab label="Indian Competitors" {...a11yProps(0)} />
            <Tab label="Global Competitors" {...a11yProps(1)} />
            <Tab label="Key Trends" {...a11yProps(2)} />
          </Tabs>
        </Box>

        {/* Indian Competitors Tab */}
        <TabPanel value={value} index={0}>
          <Box
            component={motion.div}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            {indianCompetitors.map((competitor, index) => (
              <Card
                key={index}
                component={motion.div}
                variants={fadeIn}
                sx={{
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
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      <LanguageIcon sx={{ color: theme.palette.primary.main }} />
                    </Box>
                    <Typography variant="h5" component="h3" fontWeight={700}>
                      {competitor.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 500 }}>
                    {competitor.description}
                  </Typography>
                  
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Digital Strategy:
                  </Typography>
                  
                  <List disablePadding>
                    {competitor.strategies.map((strategy, idx) => (
                      <ListItem key={idx} disableGutters sx={{ pb: 1 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Chip 
                            size="small" 
                            label="•" 
                            sx={{ 
                              backgroundColor: theme.palette.primary.light,
                              color: theme.palette.primary.contrastText,
                              fontWeight: 'bold',
                              height: 24,
                              width: 24
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText primary={strategy} />
                      </ListItem>
                    ))}
                  </List>
                  
                  {/* Social Media Platforms */}
                  <Box sx={{ display: 'flex', gap: 2, mt: 3, mb: 3 }}>
                    {socialPlatforms.map((platform) => (
                      <Tooltip key={platform.name} title={`Active on ${platform.name}`}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: alpha(platform.color, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: platform.color,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: alpha(platform.color, 0.2),
                              transform: 'scale(1.1)',
                            }
                          }}
                        >
                          {platform.icon}
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                  
                  <Box 
                    component={motion.div}
                    whileHover={{ x: 5 }}
                    sx={{ 
                      mt: 3, 
                      p: 2, 
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: 2,
                      borderLeft: `4px solid ${theme.palette.primary.main}`
                    }}
                  >
                    <Typography variant="body1" fontWeight={500}>
                      <strong>Key Insight:</strong> {competitor.insight}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </TabPanel>

        {/* Global Competitors Tab */}
        <TabPanel value={value} index={1}>
          <Box
            component={motion.div}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            {globalCompetitors.map((competitor, index) => (
              <Card
                key={index}
                component={motion.div}
                variants={fadeIn}
                sx={{
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
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      <LanguageIcon sx={{ color: theme.palette.secondary.main }} />
                    </Box>
                    <Typography variant="h5" component="h3" fontWeight={700}>
                      {competitor.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 500 }}>
                    {competitor.description}
                  </Typography>
                  
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Digital Strategy:
                  </Typography>
                  
                  <List disablePadding>
                    {competitor.strategies.map((strategy, idx) => (
                      <ListItem key={idx} disableGutters sx={{ pb: 1 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Chip 
                            size="small" 
                            label="•" 
                            sx={{ 
                              backgroundColor: theme.palette.secondary.light,
                              color: theme.palette.secondary.contrastText,
                              fontWeight: 'bold',
                              height: 24,
                              width: 24
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText primary={strategy} />
                      </ListItem>
                    ))}
                  </List>
                  
                  {/* Social Media Platforms */}
                  <Box sx={{ display: 'flex', gap: 2, mt: 3, mb: 3 }}>
                    {socialPlatforms.map((platform) => (
                      <Tooltip key={platform.name} title={`Active on ${platform.name}`}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: alpha(platform.color, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: platform.color,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: alpha(platform.color, 0.2),
                              transform: 'scale(1.1)',
                            }
                          }}
                        >
                          {platform.icon}
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                  
                  <Box 
                    component={motion.div}
                    whileHover={{ x: 5 }}
                    sx={{ 
                      mt: 3, 
                      p: 2, 
                      backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                      borderRadius: 2,
                      borderLeft: `4px solid ${theme.palette.secondary.main}`
                    }}
                  >
                    <Typography variant="body1" fontWeight={500}>
                      <strong>Key Insight:</strong> {competitor.insight}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </TabPanel>

        {/* Key Trends Tab */}
        <TabPanel value={value} index={2}>
          <Box
            component={motion.div}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <Card
              component={motion.div}
              variants={fadeIn}
              sx={{
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
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: alpha(theme.palette.warning.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <TrendingUpIcon sx={{ color: theme.palette.warning.main }} />
                  </Box>
                  <Typography variant="h5" component="h3" fontWeight={700}>
                    Summary of Trends
                  </Typography>
                </Box>
                
                <Typography variant="body1" sx={{ mb: 4 }}>
                  Competitors in India and abroad are harnessing social media trends, influencer networks, and rapid content production to engage the youth:
                </Typography>
                
                {competitorTrends.map((trend, index) => (
                  <Box key={index} sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      {trend.category}
                    </Typography>
                    
                    <List disablePadding>
                      {trend.trends.map((item, idx) => (
                        <ListItem key={idx} disableGutters sx={{ pb: 1 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Chip 
                              size="small" 
                              label="•" 
                              sx={{ 
                                backgroundColor: theme.palette.warning.light,
                                color: theme.palette.warning.contrastText,
                                fontWeight: 'bold',
                                height: 24,
                                width: 24
                              }} 
                            />
                          </ListItemIcon>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                    
                    {index < competitorTrends.length - 1 && (
                      <Divider sx={{ my: 3 }} />
                    )}
                  </Box>
                ))}
                
                <Box 
                  sx={{ 
                    mt: 3, 
                    p: 3, 
                    backgroundColor: alpha(theme.palette.warning.main, 0.05),
                    borderRadius: 2,
                    borderLeft: `4px solid ${theme.palette.warning.main}`
                  }}
                >
                  <Typography variant="body1" fontWeight={500}>
                    <strong>Strategic Implication:</strong> Bewakoof's strategy must learn from these insights – embrace pop culture and influencer collaborations like rivals, while doubling down on its quirky, community-centric identity to stand out. The next section outlines a full-funnel plan to do exactly that.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default CompetitorAnalysisSection;
