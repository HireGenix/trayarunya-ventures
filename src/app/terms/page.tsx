'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Divider, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';

export default function TermsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const sections = [
    {
      title: '1. Introduction',
      content: `
        <p>Welcome to Trayarunya Ventures. These Terms and Conditions govern your use of our website, products, and services. By accessing or using our website, products, or services, you agree to be bound by these Terms and Conditions.</p>
        <p>Please read these Terms and Conditions carefully before using our website, products, or services. If you do not agree to all the terms and conditions, you may not access or use our website, products, or services.</p>
      `,
    },
    {
      title: '2. Definitions',
      content: `
        <p>In these Terms and Conditions, the following terms shall have the following meanings:</p>
        <ul>
          <li>"Company", "we", "us", or "our" refers to Trayarunya Ventures.</li>
          <li>"Website" refers to the website operated by Trayarunya Ventures, accessible at www.trayarunyaventures.com.</li>
          <li>"Products" refers to the software products and solutions offered by Trayarunya Ventures.</li>
          <li>"Services" refers to the services provided by Trayarunya Ventures.</li>
          <li>"User", "you", or "your" refers to the individual or entity accessing or using our website, products, or services.</li>
        </ul>
      `,
    },
    {
      title: '3. Use of Website, Products, and Services',
      content: `
        <p>You agree to use our website, products, and services only for lawful purposes and in accordance with these Terms and Conditions. You agree not to use our website, products, or services:</p>
        <ul>
          <li>In any way that violates any applicable federal, state, local, or international law or regulation.</li>
          <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter", "spam", or any other similar solicitation.</li>
          <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity.</li>
          <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the website, products, or services, or which, as determined by us, may harm the Company or users of the website, products, or services, or expose them to liability.</li>
        </ul>
      `,
    },
    {
      title: '4. Intellectual Property Rights',
      content: `
        <p>The website, products, and services, and their entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof), are owned by the Company, its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>
        <p>These Terms and Conditions permit you to use the website, products, and services for your personal, non-commercial use only. You must not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our website, products, or services, except as follows:</p>
        <ul>
          <li>Your computer may temporarily store copies of such materials in RAM incidental to your accessing and viewing those materials.</li>
          <li>You may store files that are automatically cached by your Web browser for display enhancement purposes.</li>
          <li>You may print or download one copy of a reasonable number of pages of the website for your own personal, non-commercial use and not for further reproduction, publication, or distribution.</li>
          <li>If we provide desktop, mobile, or other applications for download, you may download a single copy to your computer or mobile device solely for your own personal, non-commercial use, provided you agree to be bound by our end user license agreement for such applications.</li>
        </ul>
      `,
    },
    {
      title: '5. User Accounts',
      content: `
        <p>When you create an account with us, you guarantee that the information you provide us is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account on the website, products, or services.</p>
        <p>You are responsible for maintaining the confidentiality of your account and password, including but not limited to the restriction of access to your computer and/or account. You agree to accept responsibility for any and all activities or actions that occur under your account and/or password, whether your password is with our website, products, or services or a third-party service. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
      `,
    },
    {
      title: '6. Fees and Payment',
      content: `
        <p>You agree to pay all fees or charges to your account in accordance with the fees, charges, and billing terms in effect at the time a fee or charge is due and payable. The payment provider you use may also have terms and conditions that you must follow. You are responsible for reading and understanding these separate terms and conditions.</p>
        <p>We reserve the right to modify our fees and charges at any time, upon notice through a message to your account or by email. Such notice may be provided at any time, including after the date the fee or charge has been incurred. You agree that we may charge your payment method for any such fees owed.</p>
      `,
    },
    {
      title: '7. Limitation of Liability',
      content: `
        <p>In no event shall the Company, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the website, products, or services; (ii) any conduct or content of any third party on the website, products, or services; (iii) any content obtained from the website, products, or services; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.</p>
      `,
    },
    {
      title: '8. Disclaimer',
      content: `
        <p>Your use of the website, products, and services is at your sole risk. The website, products, and services are provided on an "AS IS" and "AS AVAILABLE" basis. The website, products, and services are provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.</p>
        <p>The Company, its subsidiaries, affiliates, and its licensors do not warrant that a) the website, products, or services will function uninterrupted, secure or available at any particular time or location; b) any errors or defects will be corrected; c) the website, products, or services are free of viruses or other harmful components; or d) the results of using the website, products, or services will meet your requirements.</p>
      `,
    },
    {
      title: '9. Governing Law',
      content: `
        <p>These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.</p>
        <p>Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our website, products, and services, and supersede and replace any prior agreements we might have had between us regarding the website, products, and services.</p>
      `,
    },
    {
      title: '10. Changes to Terms and Conditions',
      content: `
        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>
        <p>By continuing to access or use our website, products, or services after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the website, products, or services.</p>
      `,
    },
    {
      title: '11. Contact Us',
      content: `
        <p>If you have any questions about these Terms and Conditions, please contact us at:</p>
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
                  Terms and Conditions
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

        {/* Terms Content */}
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
