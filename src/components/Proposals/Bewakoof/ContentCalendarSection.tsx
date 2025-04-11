'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  YouTube as YouTubeIcon,
  Email as EmailIcon,
  Twitter as TwitterIcon,
  Article as ArticleIcon,
  Campaign as CampaignIcon,
  Visibility as VisibilityIcon,
  FilterAlt as FilterAltIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface ContentItem {
  date: string;
  channel: string;
  icon: React.ReactNode;
  content: string;
  funnelStage: 'TOFU' | 'MOFU' | 'BOFU';
  cta: string;
}

const ContentCalendarSection = () => {
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

  // Content calendar data
  const contentCalendar: ContentItem[] = [
    {
      date: "Week 1 - Mon",
      channel: "Instagram (Reel)",
      icon: <InstagramIcon />,
      content: "Trend Reel: A fun 15-sec reel of a student transforming from \"boring\" to \"quirky\" by changing into a Bewakoof t-shirt mid-dance (transition effect). Uses a currently viral song. Caption: \"When you switch to #BewakoofMode 😎\".",
      funnelStage: "TOFU",
      cta: "Follow us (brand awareness)"
    },
    {
      date: "Week 1 - Wed",
      channel: "Blog (Website)",
      icon: <ArticleIcon />,
      content: "Article: \"Top 5 New Year Resolutions for Your Wardrobe\" featuring casual fashion tips. Naturally include Bewakoof products in suggestions (e.g., \"Express yourself with graphic tees\"). SEO keywords integrated.",
      funnelStage: "TOFU",
      cta: "Read more (drive site traffic)"
    },
    {
      date: "Week 1 - Fri",
      channel: "Instagram & FB",
      icon: <FacebookIcon />,
      content: "Meme Post: Image meme referencing a current Bollywood movie dialogue, relating it to fashion (e.g., \"When bae asks you to dress up: quirky movie quote\"). Bewakoof logo subtly on image.",
      funnelStage: "TOFU",
      cta: "Share/Tag friends (increase reach)"
    },
    {
      date: "Week 1 - Sat",
      channel: "Email Newsletter",
      icon: <EmailIcon />,
      content: "Newsletter: \"🎉 New Year, New Drip!\" – Show 3 new arrivals (with images), a short customer quote (\"Love the quality!\"), and a blog highlight. Fun copy, e.g., \"No more boring outfits in 2025!\"",
      funnelStage: "MOFU",
      cta: "Shop New Arrivals"
    },
    {
      date: "Week 2 - Tue",
      channel: "Facebook (Video)",
      icon: <FacebookIcon />,
      content: "Customer Spotlight: 30-sec montage video of real customers (UGC clips) wearing Bewakoof and giving one-liners (\"This tee gets me compliments!\"). Builds trust via peer endorsement.",
      funnelStage: "MOFU",
      cta: "See Collection (social proof to site)"
    },
    {
      date: "Week 2 - Thu",
      channel: "Instagram (Stories)",
      icon: <InstagramIcon />,
      content: "Poll & Teaser: Series of Stories teasing two upcoming t-shirt designs (blurred images or sketches). Poll: \"Which theme excites you more? A) Space Odyssey, B) Vintage Cricket\". Follows with a countdown sticker to launch.",
      funnelStage: "MOFU",
      cta: "Engagement; build anticipation for launch"
    },
    {
      date: "Week 2 - Fri",
      channel: "YouTube",
      icon: <YouTubeIcon />,
      content: "How-To Video: \"5 Ways to Style One Graphic Tee for 5 Days.\" A upbeat video tutorial mixing casual and semi-formal looks using the same Bewakoof tee. Ends with tagline \"One tee, endless possibilities – available now\".",
      funnelStage: "MOFU",
      cta: "Subscribe (soft sell styles, link to product in description)"
    },
    {
      date: "Week 2 - Sun",
      channel: "Instagram (Live)",
      icon: <InstagramIcon />,
      content: "Live Q&A: Featuring a fashion influencer + Bewakoof designer discussing styling tips and answering viewer questions live (30 min session). Promote this Live throughout the week.",
      funnelStage: "MOFU",
      cta: "Shop looks below (use IG live product tagging for showcased items)"
    },
    {
      date: "Week 3 - Mon",
      channel: "Instagram (Post)",
      icon: <InstagramIcon />,
      content: "Product Carousel: \"Fresh Launch: Retro Collection🌟.\" Swipe carousel with 5 images – each a new retro-themed product on a model, with fun captions referencing 90s pop culture.",
      funnelStage: "TOFU",
      cta: "Swipe Up to Buy (if using IG Shopping) or link in bio"
    },
    {
      date: "Week 3 - Wed",
      channel: "Facebook & Twitter",
      icon: <TwitterIcon />,
      content: "Contest: Announce a #BewakoofMemeContest – users submit their best fashion meme. Prize: ₹1000 gift card + feature on our page. (Cross-post on Twitter for wider reach).",
      funnelStage: "TOFU",
      cta: "Participation (generate UGC)"
    },
    {
      date: "Week 3 - Fri",
      channel: "Email (Targeted)",
      icon: <EmailIcon />,
      content: "Cart Abandonment Email: Subject: \"Your cart misses you 😢\". Body: Shows image of item left behind, \"Complete your purchase in style!\" + 10% off code.",
      funnelStage: "BOFU",
      cta: "Complete Purchase (recover cart)"
    },
    {
      date: "Week 3 - Sat",
      channel: "Instagram (Reel)",
      icon: <InstagramIcon />,
      content: "Influencer Collab Reel: Micro-influencer does a comedy skit \"Types of people in college\" wearing different Bewakoof outfits for each type. Tag @bewakoofofficial and use #CollegeDiaries.",
      funnelStage: "TOFU",
      cta: "Follow/Share (brand discovery via influencer)"
    },
    {
      date: "Week 4 - Tue",
      channel: "Blog (Website)",
      icon: <ArticleIcon />,
      content: "Brand Story Blog: \"The Bewakoof Journey – From 2012 to Today\". A behind-the-scenes story with photos of founders, office fun culture, and community initiatives. Humanizes brand for those researching.",
      funnelStage: "MOFU",
      cta: "Read/Comment (deepen brand connection)"
    },
    {
      date: "Week 4 - Thu",
      channel: "Instagram & FB Ads",
      icon: <CampaignIcon />,
      content: "Flash Sale Ad: Creative: \"48-Hour Flash Sale 🔥 – Tees & Hoodies at ₹X.\" Use a countdown graphic. Target: website visitors & engagers. Copy: \"Your wishlist items are on sale, ending soon!\"",
      funnelStage: "BOFU",
      cta: "Shop Sale (drive conversions with urgency)"
    },
    {
      date: "Week 4 - Fri",
      channel: "SMS/WhatsApp",
      icon: <CampaignIcon />,
      content: "Broadcast Message: \"Last day! Grab your Bewakoof faves at up to 50% off. Don't miss out – sale ends midnight! 🛍️\" (Include short link to sale page).",
      funnelStage: "BOFU",
      cta: "Shop Now (immediate action via mobile)"
    },
    {
      date: "Week 4 - Sun",
      channel: "YouTube",
      icon: <YouTubeIcon />,
      content: "User Testimonial Mashup: 1-minute video of compiled customer unboxing reactions (pulled from Instagram tags and permissions granted) + overlay text \"Over 1 Million Happy Customers\".",
      funnelStage: "BOFU",
      cta: "Join the Tribe – Shop Bewakoof (reinforce trust)"
    },
    {
      date: "Ongoing (Daily)",
      channel: "Twitter",
      icon: <TwitterIcon />,
      content: "Tweets: Daily witty one-liners or interactions (e.g., polls, trending hashtag jokes) to maintain presence. Example: \"Mood today: Wearing PJs to a Zoom meeting. Don't tell HR. #WFH 😂\" with a link to loungewear category.",
      funnelStage: "TOFU",
      cta: "Engagement (likes/retweets, light traffic to site)"
    },
    {
      date: "Ongoing (Weekly)",
      channel: "SEO Content",
      icon: <ArticleIcon />,
      content: "Forum/Quora Participation: Answer questions like \"Where to get cool t-shirts in India?\" providing helpful info and subtly mention Bewakoof as an option.",
      funnelStage: "TOFU",
      cta: "Referral traffic from links"
    },
    {
      date: "End of Month",
      channel: "Analytics Review",
      icon: <CalendarIcon />,
      content: "(Internal) Assess metrics: follower growth, engagement rate, site traffic, conversion rate. Identify top-performing content (e.g., the meme contest UGC, or the flash sale CTR) to refine next month's plan.",
      funnelStage: "MOFU",
      cta: "Optimize strategy iteratively"
    }
  ];

  const getFunnelStageColor = (stage: string) => {
    switch (stage) {
      case 'TOFU':
        return {
          bg: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          icon: <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />
        };
      case 'MOFU':
        return {
          bg: alpha(theme.palette.secondary.main, 0.1),
          color: theme.palette.secondary.main,
          icon: <FilterAltIcon fontSize="small" sx={{ mr: 0.5 }} />
        };
      case 'BOFU':
        return {
          bg: alpha(theme.palette.warning.main, 0.1),
          color: theme.palette.warning.main,
          icon: <ShoppingCartIcon fontSize="small" sx={{ mr: 0.5 }} />
        };
      default:
        return {
          bg: alpha(theme.palette.grey[500], 0.1),
          color: theme.palette.grey[500],
          icon: <CalendarIcon fontSize="small" sx={{ mr: 0.5 }} />
        };
    }
  };

  return (
    <Box
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeIn}
      sx={{ mb: 8 }}
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
        One-Month Content Calendar
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
        Integrated Funnel Plan
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Below is a 30-day content plan mapping specific content ideas to channels and funnel stages. 
          This ensures a cohesive omni-channel strategy where each week's activities cover awareness, consideration, 
          and conversion-focused content. The plan can be adjusted based on real-time performance, but serves as a 
          blueprint for consistent execution.
        </Typography>
      </Box>

      <Box
        component={motion.div}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        sx={{ mb: 6 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip 
              icon={<VisibilityIcon />} 
              label="Awareness (TOFU)" 
              size="small"
              sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontWeight: 500
              }} 
            />
            <Chip 
              icon={<FilterAltIcon />} 
              label="Consideration (MOFU)" 
              size="small"
              sx={{ 
                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                color: theme.palette.secondary.main,
                fontWeight: 500
              }} 
            />
            <Chip 
              icon={<ShoppingCartIcon />} 
              label="Decision (BOFU)" 
              size="small"
              sx={{ 
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                color: theme.palette.warning.main,
                fontWeight: 500
              }} 
            />
          </Box>
        </Box>

        <TableContainer 
          component={Paper} 
          elevation={2}
          sx={{ 
            borderRadius: 4,
            overflow: 'hidden',
            '& .MuiTableCell-root': {
              py: 2.5,
              px: 3,
            }
          }}
        >
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell width="15%"><Typography variant="subtitle1" fontWeight={700}>Date/Week</Typography></TableCell>
                <TableCell width="15%"><Typography variant="subtitle1" fontWeight={700}>Channel</Typography></TableCell>
                <TableCell width="50%"><Typography variant="subtitle1" fontWeight={700}>Content & Theme</Typography></TableCell>
                <TableCell width="10%"><Typography variant="subtitle1" fontWeight={700}>Funnel Stage</Typography></TableCell>
                <TableCell width="10%"><Typography variant="subtitle1" fontWeight={700}>CTA/Goal</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contentCalendar.map((item, index) => {
                const stageStyle = getFunnelStageColor(item.funnelStage);
                
                return (
                  <TableRow 
                    key={index}
                    sx={{ 
                      '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.background.default, 0.5) },
                      '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.03) },
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{item.date}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          sx={{ 
                            mr: 1.5, 
                            color: theme.palette.text.secondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Typography variant="body2">{item.channel}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.content}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={stageStyle.icon}
                        label={item.funnelStage} 
                        size="small"
                        sx={{ 
                          backgroundColor: stageStyle.bg,
                          color: stageStyle.color,
                          fontWeight: 600,
                          fontSize: '0.7rem'
                        }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{item.cta}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box 
        sx={{ 
          p: 4, 
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Notes on Content Calendar Implementation
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          This content calendar ensures a healthy mix across the funnel each week – early week posts for awareness, 
          mid-week engagement builders, and end-week pushes for conversion. Key campaigns (e.g., Retro Collection launch in Week 3, 
          Flash Sale in Week 4) are supported by multi-channel promotion (social + email + ads) for maximum impact.
        </Typography>
        <Typography variant="body1">
          All content maintains Bewakoof's signature tone – fun, youthful, and inclusive, while steadily driving the audience 
          from just laughing at a meme to clicking "Buy Now" on the website. The calendar can be adjusted based on real-time 
          performance metrics, with top-performing content types receiving additional focus in subsequent months.
        </Typography>
      </Box>
    </Box>
  );
};

export default ContentCalendarSection;
