'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Divider, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';

export default function PrivacyPolicyPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const sections = [
    {
      title: '1. Introduction',
      content: `
        <p>At Trayarunya Ventures, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our products and services.</p>
        <p>Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access our website or use our products and services.</p>
      `,
    },
    {
      title: '2. Information We Collect',
      content: `
        <p>We may collect several types of information from and about users of our website, products, and services, including:</p>
        <ul>
          <li><strong>Personal Data:</strong> Personal Data means data about a living individual who can be identified from that data. This may include your name, email address, postal address, phone number, and other similar information.</li>
          <li><strong>Usage Data:</strong> We may also collect information about how you access and use our website, products, and services. This may include your IP address, browser type, browser version, the pages you visit, the time and date of your visit, the time spent on those pages, and other diagnostic data.</li>
          <li><strong>Cookies and Tracking Data:</strong> We use cookies and similar tracking technologies to track activity on our website and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.</li>
        </ul>
      `,
    },
    {
      title: '3. How We Collect Your Information',
      content: `
        <p>We collect information in the following ways:</p>
        <ul>
          <li><strong>Direct Interactions:</strong> You may provide us with your Personal Data by filling in forms, creating an account, subscribing to our services, or corresponding with us by post, phone, email, or otherwise.</li>
          <li><strong>Automated Technologies:</strong> As you interact with our website, products, or services, we may automatically collect Usage Data and Cookies and Tracking Data as specified above.</li>
          <li><strong>Third Parties:</strong> We may receive information about you from various third parties, such as analytics providers, advertising networks, and search information providers.</li>
        </ul>
      `,
    },
    {
      title: '4. How We Use Your Information',
      content: `
        <p>We may use the information we collect about you for various purposes, including:</p>
        <ul>
          <li>To provide and maintain our website, products, and services.</li>
          <li>To notify you about changes to our website, products, or services.</li>
          <li>To allow you to participate in interactive features of our website, products, or services when you choose to do so.</li>
          <li>To provide customer support.</li>
          <li>To gather analysis or valuable information so that we can improve our website, products, and services.</li>
          <li>To monitor the usage of our website, products, and services.</li>
          <li>To detect, prevent, and address technical issues.</li>
          <li>To provide you with news, special offers, and general information about other goods, services, and events which we offer that are similar to those that you have already purchased or enquired about, unless you have opted not to receive such information.</li>
        </ul>
      `,
    },
    {
      title: '5. Disclosure of Your Information',
      content: `
        <p>We may disclose your personal information in the following situations:</p>
        <ul>
          <li><strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
          <li><strong>With Affiliates:</strong> We may share your information with our affiliates, in which case we will require those affiliates to honor this Privacy Policy.</li>
          <li><strong>With Business Partners:</strong> We may share your information with our business partners to offer you certain products, services, or promotions.</li>
          <li><strong>With Service Providers:</strong> We may share your information with service providers to monitor and analyze the use of our website, products, and services, and to contact you.</li>
          <li><strong>For Business Purposes:</strong> We may share your information for our business purposes, such as data analysis, identifying usage trends, and to improve and enhance our website, products, and services.</li>
          <li><strong>With Your Consent:</strong> We may disclose your personal information for any other purpose with your consent.</li>
          <li><strong>To Comply with Legal Obligations:</strong> We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process.</li>
          <li><strong>To Protect Rights and Safety:</strong> We may disclose your information where we believe it is necessary to investigate, prevent, or take action regarding potential violations of our policies, suspected fraud, situations involving potential threats to the safety of any person, or as evidence in litigation in which we are involved.</li>
        </ul>
      `,
    },
    {
      title: '6. Security of Your Information',
      content: `
        <p>The security of your information is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.</p>
        <p>We implement a variety of security measures to maintain the safety of your personal information when you enter, submit, or access your personal information. These measures include:</p>
        <ul>
          <li>Using encryption to protect sensitive information transmitted online.</li>
          <li>Protecting your information offline by keeping it on secure servers.</li>
          <li>Limiting access to personal information to employees, contractors, and agents who need to know that information in order to operate, develop, or improve our website, products, and services.</li>
        </ul>
      `,
    },
    {
      title: '7. Your Data Protection Rights',
      content: `
        <p>Depending on your location, you may have certain rights regarding your personal information. These may include:</p>
        <ul>
          <li><strong>The right to access:</strong> You have the right to request copies of your personal data.</li>
          <li><strong>The right to rectification:</strong> You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete information you believe is incomplete.</li>
          <li><strong>The right to erasure:</strong> You have the right to request that we erase your personal data, under certain conditions.</li>
          <li><strong>The right to restrict processing:</strong> You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
          <li><strong>The right to object to processing:</strong> You have the right to object to our processing of your personal data, under certain conditions.</li>
          <li><strong>The right to data portability:</strong> You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</li>
        </ul>
        <p>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us at our email: info@trayarunyaventures.com.</p>
      `,
    },
    {
      title: '8. Children\'s Privacy',
      content: `
        <p>Our website, products, and services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us. If we become aware that we have collected personal information from children without verification of parental consent, we take steps to remove that information from our servers.</p>
      `,
    },
    {
      title: '9. Changes to This Privacy Policy',
      content: `
        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy.</p>
        <p>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>
      `,
    },
    {
      title: '10. International Transfers',
      content: `
        <p>Your information, including personal data, may be transferred to — and maintained on — computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction.</p>
        <p>If you are located outside the United States and choose to provide information to us, please note that we transfer the data, including personal data, to the United States and process it there. Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer.</p>
      `,
    },
    {
      title: '11. Contact Us',
      content: `
        <p>If you have any questions about this Privacy Policy, please contact us at:</p>
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
                  Privacy Policy
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

        {/* Privacy Policy Content */}
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
