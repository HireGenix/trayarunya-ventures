'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Divider, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';

export default function CookiePolicyPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const sections = [
    {
      title: '1. Introduction',
      content: `
        <p>This Cookie Policy explains how Trayarunya Ventures ("we", "us", or "our") uses cookies and similar technologies to recognize you when you visit our website. It explains what these technologies are and why we use them, as well as your rights to control our use of them.</p>
        <p>Please read this Cookie Policy carefully. If you do not agree with the terms of this Cookie Policy, please do not access our website.</p>
      `,
    },
    {
      title: '2. What Are Cookies?',
      content: `
        <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
        <p>Cookies set by the website owner (in this case, Trayarunya Ventures) are called "first-party cookies". Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics). The parties that set these third-party cookies can recognize your computer both when it visits the website in question and also when it visits certain other websites.</p>
      `,
    },
    {
      title: '3. Why Do We Use Cookies?',
      content: `
        <p>We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our website to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our website. Third parties serve cookies through our website for advertising, analytics, and other purposes. This is described in more detail below.</p>
      `,
    },
    {
      title: '4. Types of Cookies We Use',
      content: `
        <p>The specific types of first and third-party cookies served through our website and the purposes they perform are described below:</p>
        <ul>
          <li><strong>Essential Cookies:</strong> These cookies are strictly necessary to provide you with services available through our website and to use some of its features, such as access to secure areas. Because these cookies are strictly necessary to deliver the website, you cannot refuse them without impacting how our website functions.</li>
          <li><strong>Performance and Functionality Cookies:</strong> These cookies are used to enhance the performance and functionality of our website but are non-essential to their use. However, without these cookies, certain functionality may become unavailable.</li>
          <li><strong>Analytics and Customization Cookies:</strong> These cookies collect information that is used either in aggregate form to help us understand how our website is being used or how effective our marketing campaigns are, or to help us customize our website for you in order to enhance your experience.</li>
          <li><strong>Advertising Cookies:</strong> These cookies are used to make advertising messages more relevant to you. They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed, and in some cases selecting advertisements that are based on your interests.</li>
          <li><strong>Social Media Cookies:</strong> These cookies are used to enable you to share pages and content that you find interesting on our website through third-party social networking and other websites. These cookies may also be used for advertising purposes.</li>
        </ul>
      `,
    },
    {
      title: '5. How Can You Control Cookies?',
      content: `
        <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by following the instructions provided in the "Cookie Settings" section of our website.</p>
        <p>You can also set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted. As the means by which you can refuse cookies through your web browser controls vary from browser to browser, you should visit your browser's help menu for more information.</p>
        <p>In addition, most advertising networks offer you a way to opt out of targeted advertising. If you would like to find out more information, please visit <a href="http://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">http://www.aboutads.info/choices/</a> or <a href="http://www.youronlinechoices.com" target="_blank" rel="noopener noreferrer">http://www.youronlinechoices.com</a>.</p>
      `,
    },
    {
      title: '6. Specific Information About the Cookies We Use',
      content: `
        <p>The table below provides more information about the cookies we use and why:</p>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Provider</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Purpose</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Expiry</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">_ga</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Google Analytics</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Used to distinguish users.</td>
              <td style="border: 1px solid #ddd; padding: 8px;">2 years</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">_gid</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Google Analytics</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Used to distinguish users.</td>
              <td style="border: 1px solid #ddd; padding: 8px;">24 hours</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">_gat</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Google Analytics</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Used to throttle request rate.</td>
              <td style="border: 1px solid #ddd; padding: 8px;">1 minute</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">session_id</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Trayarunya Ventures</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Used to maintain user session.</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Session</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">user_preferences</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Trayarunya Ventures</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Used to remember user preferences.</td>
              <td style="border: 1px solid #ddd; padding: 8px;">1 year</td>
            </tr>
          </tbody>
        </table>
      `,
    },
    {
      title: '7. What About Other Tracking Technologies?',
      content: `
        <p>Cookies are not the only way to recognize or track visitors to a website. We may use other, similar technologies from time to time, like web beacons (sometimes called "tracking pixels" or "clear gifs"). These are tiny graphics files that contain a unique identifier that enables us to recognize when someone has visited our website or opened an email that we have sent them. This allows us, for example, to monitor the traffic patterns of users from one page within our website to another, to deliver or communicate with cookies, to understand whether you have come to our website from an online advertisement displayed on a third-party website, to improve site performance, and to measure the success of email marketing campaigns. In many instances, these technologies are reliant on cookies to function properly, and so declining cookies will impair their functioning.</p>
      `,
    },
    {
      title: '8. Do You Serve Targeted Advertising?',
      content: `
        <p>Third parties may serve cookies on your computer or mobile device to serve advertising through our website. These companies may use information about your visits to this and other websites in order to provide relevant advertisements about goods and services that you may be interested in. They may also employ technology that is used to measure the effectiveness of advertisements. This can be accomplished by them using cookies or web beacons to collect information about your visits to this and other sites in order to provide relevant advertisements about goods and services of potential interest to you. The information collected through this process does not enable us or them to identify your name, contact details, or other personally identifying details unless you choose to provide these.</p>
      `,
    },
    {
      title: '9. How Often Will We Update This Cookie Policy?',
      content: `
        <p>We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.</p>
        <p>The date at the top of this Cookie Policy indicates when it was last updated.</p>
      `,
    },
    {
      title: '10. Where Can You Get Further Information?',
      content: `
        <p>If you have any questions about our use of cookies or other technologies, please contact us at:</p>
        <p>Trayarunya Ventures<br />
        Email: info@trayarunyaventures.com<br />
        Phone: +1 (971) 512-1701 (US) / +91-8954333390 (India)</p>
      `,
    },
  ];

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

          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Chip
                  label="LEGAL"
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
                  Cookie Policy
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
                  Last Updated: March 1, 2025
                </Typography>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Cookie Policy Content */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 6 },
                borderRadius: 4,
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
              }}
            >
              {sections.map((section, index) => (
                <Box key={index} sx={{ mb: 6 }}>
                  <Typography
                    variant="h4"
                    component="h2"
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                      color: theme.palette.text.primary,
                    }}
                  >
                    {section.title}
                  </Typography>
                  <Box
                    dangerouslySetInnerHTML={{ __html: section.content }}
                    sx={{
                      '& p': {
                        mb: 2,
                        color: theme.palette.text.secondary,
                        lineHeight: 1.7,
                      },
                      '& ul': {
                        pl: 4,
                        mb: 2,
                      },
                      '& li': {
                        mb: 1,
                        color: theme.palette.text.secondary,
                        lineHeight: 1.7,
                      },
                      '& a': {
                        color: theme.palette.primary.main,
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      },
                      '& table': {
                        width: '100%',
                        borderCollapse: 'collapse',
                        mb: 3,
                      },
                      '& th, & td': {
                        border: `1px solid ${alpha('#000', 0.1)}`,
                        p: 2,
                        color: theme.palette.text.secondary,
                      },
                      '& th': {
                        fontWeight: 600,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                  />
                  {index < sections.length - 1 && <Divider sx={{ mt: 4 }} />}
                </Box>
              ))}
            </Paper>
          </Container>
        </Box>
      </Box>
    </Layout>
  );
}
