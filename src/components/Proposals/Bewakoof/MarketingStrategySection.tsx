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
  Grid,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  FilterAlt as FilterAltIcon,
  Campaign as CampaignIcon,
  Visibility as VisibilityIcon,
  ShoppingCart as ShoppingCartIcon,
  Loyalty as LoyaltyIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowForward as ArrowForwardIcon,
  Movie as MovieIcon,
  Image as ImageIcon,
  Article as ArticleIcon,
  Mic as MicIcon,
  Forum as ForumIcon,
  EmojiEmotions as EmojiIcon,
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
      id={`funnel-tabpanel-${index}`}
      aria-labelledby={`funnel-tab-${index}`}
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
    id: `funnel-tab-${index}`,
    'aria-controls': `funnel-tabpanel-${index}`,
  };
}

const MarketingStrategySection = () => {
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

  // Marketing funnel data
  const funnelStages = [
    {
      name: "Top of Funnel (Awareness)",
      tagline: "Reach & Inspire",
      description: "Capture attention and build brand awareness among young potential customers who may not know Bewakoof or its latest collections. Content should be entertaining, shareable, and aligned with the audience's interests.",
      strategies: [
        {
          title: "Social Media Virality",
          points: [
            "Ramp up Instagram and Facebook with high-reach, viral content",
            "Post meme series around trending shows or events (IPL cricket season meme with a quirky twist)",
            "Create short Reels/TikToks with models or influencers in Bewakoof tees performing trending challenges",
            "Use popular audio clips and add captions like \"When your outfit speaks your mind 😜 #OOTD\""
          ]
        },
        {
          title: "Moment Marketing",
          points: [
            "Stay agile and inject Bewakoof into ongoing conversations",
            "If a Marvel trailer drops, post a witty image of a Bewakoof Marvel tee with caption \"When you are the post-credits scene. 😎 #Marvel #Bewakoof\"",
            "Quick, culturally relevant posts keep the brand top-of-mind"
          ]
        },
        {
          title: "Influencer Buzz",
          points: [
            "Collaborate with micro and macro influencers to tap into their follower base",
            "Run a campaign with a mix of nano influencers (college content creators) and bigger youth icons",
            "Challenge them to style Bewakoof outfits in their unique way – maybe a #DIYYourTee challenge",
            "Encourage authentic reviews or humorous skits featuring the clothing",
            "Ensure influencers tag @bewakoofofficial and use a campaign hashtag (e.g., #BewakoofTribe)"
          ]
        },
        {
          title: "Content Marketing & SEO",
          points: [
            "Publish engaging blog articles or listicles on Bewakoof's site (and share via social)",
            "Titles like \"10 Quirky Outfit Ideas for College Freshers\", \"How to Rock Graphic Tees at Work-From-Home\"",
            "Optimize for SEO keywords like \"affordable trendy t-shirts India\", \"cool anime hoodies\"",
            "Contribute guest posts or features on youth-oriented online magazines with linkbacks to Bewakoof"
          ]
        },
        {
          title: "YouTube & Video Content",
          points: [
            "Produce a series of \"Bewakoof IRL\" YouTube shorts – 30-60 second videos of people reacting to witty t-shirt slogans",
            "Consider YouTube ads (TrueView) targeting fashion, comedy, and pop culture channels",
            "Run short non-skippable ads that are humorous skits highlighting a product's theme"
          ]
        }
      ],
      tip: "At TOFU, consistency and creativity are key. Post frequently (at least daily on IG/FB) and maintain a unified, youthful voice. The goal is to have our ICP think \"Haha I love this brand's posts!\" before we ever ask them to buy anything."
    },
    {
      name: "Middle of Funnel (Consideration)",
      tagline: "Engage & Educate",
      description: "Now that the audience is aware of Bewakoof and entertained by it, we need to nurture their interest and build trust so they consider purchasing. This stage focuses on engagement, education about the brand/product quality, and addressing any hesitations.",
      strategies: [
        {
          title: "Community Building & UGC",
          points: [
            "Launch a UGC campaign where existing customers/fans share photos of themselves in Bewakoof outfits",
            "Run a #MyBewakoofStyle contest: users post their best look with a Bewakoof product",
            "Feature the best entries on Bewakoof's official page (Instagram carousel or Stories shoutouts)",
            "Create a \"Bewakoof Tribe\" private group for fans to share behind-the-scenes content and run polls"
          ]
        },
        {
          title: "Educational Content & Social Proof",
          points: [
            "Develop a short \"About Our Quality\" video for YouTube/IGTV – show the making of a Bewakoof t-shirt",
            "Write blog posts or Instagram carousel infographics on topics like \"How to Style Graphic Tees for Any Occasion\"",
            "Incorporate facts (e.g., use of organic cotton or eco-friendly packaging) to appeal to conscious shoppers",
            "Share testimonials or short interviews of happy customers (maybe from the TriBe loyalty base)"
          ]
        },
        {
          title: "Interactive Engagement",
          points: [
            "Host an Instagram Live Q&A with Bewakoof's design team or founders",
            "Promote it as \"Ask Us Anything – Design, Sizing, or Which Marvel character we love!\"",
            "Run polls and quizzes on Instagram Stories. Example: \"Which tagline should go on our next tee?\"",
            "Consider a Webinar or Workshop format (if appropriate for the audience)"
          ]
        },
        {
          title: "Email Marketing & Personalization",
          points: [
            "Implement an email drip campaign that welcomes new subscribers with a fun welcome email",
            "Send weekly newsletters featuring new arrivals (with lifestyle images), blog highlights, and a meme of the week",
            "Use segmentation to personalize – if someone browsed female categories, send lookbooks of women's outfits",
            "If someone engaged with Marvel items, send them an alert when the new Marvel collection launches"
          ]
        },
        {
          title: "Middle-Funnel Social Ads",
          points: [
            "Use retargeting ads on Facebook/Instagram to those who engaged with awareness content",
            "Show them carousel ads of best-selling products, with captions like \"Fan Favorite: 10,000+ sold\"",
            "Perhaps an ad that says \"Liked our meme? You'll love our merch 😉 Check out these trending picks.\""
          ]
        }
      ],
      tip: "At MOFU, the tone can start mixing fun with facts – continue the quirky, friendly voice, but also answer the question \"Why Bewakoof?\" at every touch. We want to gently push the ICP from \"I enjoy this brand\" to \"I trust this brand and need something from it.\""
    },
    {
      name: "Bottom of Funnel (Decision)",
      tagline: "Convert & Re-engage",
      description: "Convert interested prospects into customers by giving them the final nudges – clear CTAs, incentives, and reassurance. Also, ensure recent buyers stay engaged (for loyalty/advocacy, feeding back into the funnel).",
      strategies: [
        {
          title: "Promotions & Urgency",
          points: [
            "Launch a limited-time offer or sale targeted at high-intent users",
            "Promote across channels: banner on website, email blast, and social media countdown posts",
            "Use scarcity and urgency (flashed via countdown timers in Instagram Stories and email)",
            "Provide personalized discount codes for abandoned carts",
            "Leverage the TriBe membership program: \"Join TriBe for exclusive 2X discounts and priority access\""
          ]
        },
        {
          title: "Remarketing & Search Ads",
          points: [
            "Bid on high-intent keywords like \"buy graphic tees online\", \"Bewakoof coupon code\"",
            "Ad copy should highlight USPs: \"Bewakoof – Quirky Tees from ₹299, COD Available, Free Exchanges\"",
            "Use Google Shopping ads with product images and prices for specific product searches",
            "Implement dynamic retargeting ads to show users the exact items they viewed on Bewakoof",
            "Show skippable YouTube ads to users who visited the site, featuring a compilation of best-sellers"
          ]
        },
        {
          title: "Conversion Rate Optimization (CRO)",
          points: [
            "Ensure product pages have rich reviews and ratings visible (social proof for final reassurance)",
            "Use exit-intent popups: \"Wait! Here's ₹100 off your first purchase. Use code WELCOME100\"",
            "Add live chat or chatbot on the website/app to answer last-minute doubts",
            "Simplify checkout for mobile users and highlight \"Free Returns\" clearly to eliminate fear of purchase"
          ]
        },
        {
          title: "Post-Purchase Engagement",
          points: [
            "Send a thank you email after purchase with a fun note",
            "Include a referral link: \"Share with a friend and you BOTH get ₹100 off next time\"",
            "Encourage them to post their purchase on social media",
            "If they joined TriBe, send periodic exclusive deals to make them feel special",
            "Plan re-engagement campaigns for customers who haven't bought again in 3 months"
          ]
        }
      ],
      tip: "At BOFU, make the decision a no-brainer – remove friction, add urgency, and reinforce trust. By now the prospect should feel emotionally connected; now appeal to logic: great deal, risk-free purchase, and immediate gratification are what closes the sale."
    }
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
        Full-Funnel Marketing Strategy
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
        Targeted Approach for Bewakoof.com
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{ mb: 3 }}>
          With our ICP defined and competition mapped, we propose a full-funnel strategy to attract, engage, and convert Bewakoof's target audience. 
          This approach covers the Top, Middle, and Bottom of the funnel – ensuring we guide a potential customer from initial awareness all the way to purchase (and beyond).
        </Typography>
      </Box>

      <Box sx={{ width: '100%', mb: 6 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="marketing funnel tabs"
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
            <Tab 
              icon={<VisibilityIcon sx={{ mb: 0.5 }} />} 
              iconPosition="start" 
              label="Awareness" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<FilterAltIcon sx={{ mb: 0.5 }} />} 
              iconPosition="start" 
              label="Consideration" 
              {...a11yProps(1)} 
            />
            <Tab 
              icon={<ShoppingCartIcon sx={{ mb: 0.5 }} />} 
              iconPosition="start" 
              label="Decision" 
              {...a11yProps(2)} 
            />
          </Tabs>
        </Box>

        {funnelStages.map((stage, stageIndex) => (
          <TabPanel key={stageIndex} value={value} index={stageIndex}>
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
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        backgroundColor: stageIndex === 0 
                          ? alpha(theme.palette.primary.main, 0.1)
                          : stageIndex === 1 
                            ? alpha(theme.palette.secondary.main, 0.1)
                            : alpha(theme.palette.warning.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      {stageIndex === 0 ? (
                        <VisibilityIcon sx={{ 
                          color: theme.palette.primary.main,
                          fontSize: '1.8rem'
                        }} />
                      ) : stageIndex === 1 ? (
                        <FilterAltIcon sx={{ 
                          color: theme.palette.secondary.main,
                          fontSize: '1.8rem'
                        }} />
                      ) : (
                        <ShoppingCartIcon sx={{ 
                          color: theme.palette.warning.main,
                          fontSize: '1.8rem'
                        }} />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="h4" component="h3" fontWeight={700}>
                        {stage.name}
                      </Typography>
                      <Chip 
                        label={stage.tagline} 
                        size="small"
                        sx={{ 
                          mt: 0.5,
                          fontWeight: 600,
                          backgroundColor: stageIndex === 0 
                            ? alpha(theme.palette.primary.main, 0.1)
                            : stageIndex === 1 
                              ? alpha(theme.palette.secondary.main, 0.1)
                              : alpha(theme.palette.warning.main, 0.1),
                          color: stageIndex === 0 
                            ? theme.palette.primary.main
                            : stageIndex === 1 
                              ? theme.palette.secondary.main
                              : theme.palette.warning.main,
                        }} 
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 4 }}>
                    {stage.description}
                  </Typography>
                  
                  <Box sx={{ mb: 4 }}>
                    {stage.strategies.map((strategy, index) => (
                      <Box key={index} sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                          {strategy.title}
                        </Typography>
                        
                        <List disablePadding>
                          {strategy.points.map((point, idx) => (
                            <ListItem key={idx} disableGutters sx={{ pb: 1 }}>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <Chip 
                                  size="small" 
                                  label="•" 
                                  sx={{ 
                                    backgroundColor: stageIndex === 0 
                                      ? theme.palette.primary.light
                                      : stageIndex === 1 
                                        ? theme.palette.secondary.light
                                        : theme.palette.warning.light,
                                    color: stageIndex === 0 
                                      ? theme.palette.primary.contrastText
                                      : stageIndex === 1 
                                        ? theme.palette.secondary.contrastText
                                        : theme.palette.warning.contrastText,
                                    fontWeight: 'bold',
                                    height: 24,
                                    width: 24
                                  }} 
                                />
                              </ListItemIcon>
                              <ListItemText primary={point} />
                            </ListItem>
                          ))}
                        </List>
                        
                        {index < stage.strategies.length - 1 && (
                          <Divider sx={{ my: 3 }} />
                        )}
                      </Box>
                    ))}
                  </Box>
                  
                  <Box 
                    sx={{ 
                      mt: 3, 
                      p: 3, 
                      backgroundColor: stageIndex === 0 
                        ? alpha(theme.palette.primary.main, 0.05)
                        : stageIndex === 1 
                          ? alpha(theme.palette.secondary.main, 0.05)
                          : alpha(theme.palette.warning.main, 0.05),
                      borderRadius: 2,
                      borderLeft: `4px solid ${
                        stageIndex === 0 
                          ? theme.palette.primary.main
                          : stageIndex === 1 
                            ? theme.palette.secondary.main
                            : theme.palette.warning.main
                      }`
                    }}
                  >
                    <Typography variant="body1" fontWeight={500}>
                      <strong>Key Tip:</strong> {stage.tip}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        ))}
      </Box>

      {/* Funnel Visualization */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          component="h3"
          sx={{
            mb: 4,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Full-Funnel Visualization
        </Typography>

        <Box
          sx={{
            maxWidth: 800,
            mx: 'auto',
            position: 'relative',
            height: 400,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top of Funnel */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            sx={{
              width: '100%',
              height: 100,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              border: `2px solid ${theme.palette.primary.main}`,
              borderBottom: 'none',
            }}
          >
            <Typography variant="h6" fontWeight={600} color={theme.palette.primary.main}>
              Awareness
            </Typography>
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <ArrowDownwardIcon sx={{ color: theme.palette.primary.main, fontSize: 30 }} />
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: -120,
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" fontWeight={600} color={theme.palette.text.secondary}>
                Social Media Virality
              </Typography>
              <ArrowForwardIcon sx={{ color: theme.palette.text.secondary, ml: 1 }} />
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                right: -120,
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ArrowForwardIcon sx={{ color: theme.palette.text.secondary, mr: 1, transform: 'rotate(180deg)' }} />
              <Typography variant="body2" fontWeight={600} color={theme.palette.text.secondary}>
                Influencer Buzz
              </Typography>
            </Box>
          </Box>

          {/* Middle of Funnel */}
          <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            sx={{
              width: '80%',
              height: 100,
              backgroundColor: alpha(theme.palette.secondary.main, 0.1),
              mx: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              border: `2px solid ${theme.palette.secondary.main}`,
              borderTop: 'none',
              borderBottom: 'none',
            }}
          >
            <Typography variant="h6" fontWeight={600} color={theme.palette.secondary.main}>
              Consideration
            </Typography>
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <ArrowDownwardIcon sx={{ color: theme.palette.secondary.main, fontSize: 30 }} />
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: -150,
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" fontWeight={600} color={theme.palette.text.secondary}>
                Community Building & UGC
              </Typography>
              <ArrowForwardIcon sx={{ color: theme.palette.text.secondary, ml: 1 }} />
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                right: -150,
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ArrowForwardIcon sx={{ color: theme.palette.text.secondary, mr: 1, transform: 'rotate(180deg)' }} />
              <Typography variant="body2" fontWeight={600} color={theme.palette.text.secondary}>
                Educational Content
              </Typography>
            </Box>
          </Box>

          {/* Bottom of Funnel */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            sx={{
              width: '60%',
              height: 100,
              backgroundColor: alpha(theme.palette.warning.main, 0.1),
              mx: 'auto',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              border: `2px solid ${theme.palette.warning.main}`,
              borderTop: 'none',
            }}
          >
            <Typography variant="h6" fontWeight={600} color={theme.palette.warning.main}>
              Decision
            </Typography>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: -120,
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" fontWeight={600} color={theme.palette.text.secondary}>
                Promotions & Urgency
              </Typography>
              <ArrowForwardIcon sx={{ color: theme.palette.text.secondary, ml: 1 }} />
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                right: -150,
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ArrowForwardIcon sx={{ color: theme.palette.text.secondary, mr: 1, transform: 'rotate(180deg)' }} />
              <Typography variant="body2" fontWeight={600} color={theme.palette.text.secondary}>
                Post-Purchase Engagement
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Content Buckets Section */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          component="h3"
          sx={{
            mb: 4,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Content Buckets for Bewakoof
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
          To maintain a consistent and engaging content strategy, we've identified key content buckets that will resonate with Bewakoof's target audience while supporting marketing objectives across the funnel.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {[
            {
              title: "Entertaining Videos",
              icon: <MovieIcon fontSize="large" />,
              color: theme.palette.primary.main,
              description: "Short-form video content designed to entertain and build brand awareness",
              examples: [
                "Humorous skits featuring Bewakoof products",
                "Behind-the-scenes of photoshoots",
                "Customer reaction videos to quirky designs",
                "Trending challenges with Bewakoof merchandise"
              ]
            },
            {
              title: "Visual Storytelling",
              icon: <ImageIcon fontSize="large" />,
              color: theme.palette.secondary.main,
              description: "Eye-catching imagery that showcases products in lifestyle contexts",
              examples: [
                "Product styling lookbooks",
                "User-generated content features",
                "Themed photoshoots (festival, college life)",
                "Before/after outfit transformations"
              ]
            },
            {
              title: "Educational Content",
              icon: <ArticleIcon fontSize="large" />,
              color: theme.palette.info.main,
              description: "Informative content that provides value while subtly promoting products",
              examples: [
                "Style guides for different body types",
                "Fabric care instructions",
                "Sustainability practices at Bewakoof",
                "Fashion trend forecasts"
              ]
            },
            {
              title: "Audio Content",
              icon: <MicIcon fontSize="large" />,
              color: theme.palette.warning.main,
              description: "Podcast-style content and audio snippets for multi-channel engagement",
              examples: [
                "Mini-interviews with designers",
                "Customer testimonial snippets",
                "Fashion hot takes in 30 seconds",
                "Bewakoof jingles for reels"
              ]
            },
            {
              title: "Community Engagement",
              icon: <ForumIcon fontSize="large" />,
              color: theme.palette.success.main,
              description: "Interactive content that encourages audience participation",
              examples: [
                "Polls on next design themes",
                "Caption contests for product images",
                "Q&A sessions with the design team",
                "User style challenges with prizes"
              ]
            },
            {
              title: "Meme Marketing",
              icon: <EmojiIcon fontSize="large" />,
              color: theme.palette.error.main,
              description: "Humorous, shareable content that taps into internet culture",
              examples: [
                "Product-themed memes",
                "Relatable fashion struggles",
                "Pop culture references with Bewakoof twist",
                "Trending meme formats featuring products"
              ]
            }
          ].map((bucket, index) => (
            <Box key={index} sx={{ display: 'flex', width: '100%' }}>
              <Card
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.1)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: `1px solid ${alpha(bucket.color, 0.2)}`,
                    backgroundColor: alpha(bucket.color, 0.05),
                  }}
                >
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      backgroundColor: alpha(bucket.color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      color: bucket.color,
                    }}
                  >
                    {bucket.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    {bucket.title}
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3, flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {bucket.description}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Content Ideas:
                  </Typography>
                  <List disablePadding dense>
                    {bucket.examples.map((example, idx) => (
                      <ListItem key={idx} disableGutters sx={{ pb: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <Chip 
                            size="small" 
                            label="•" 
                            sx={{ 
                              backgroundColor: alpha(bucket.color, 0.1),
                              color: bucket.color,
                              fontWeight: 'bold',
                              height: 20,
                              width: 20,
                              fontSize: '0.75rem'
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={example} 
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default MarketingStrategySection;
