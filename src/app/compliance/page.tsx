'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Divider, useTheme, useMediaQuery, alpha } from '@mui/material';
import { motion } from 'framer-motion';

export default function CompliancePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const sections = [
    {
      title: '1. Introduction',
      content: `
        <p>At Trayarunya Ventures, we are committed to conducting our business in accordance with the highest standards of ethics, integrity, and compliance with all applicable laws and regulations. This Compliance Policy outlines our approach to regulatory compliance and the measures we take to ensure that our operations, products, and services meet or exceed industry standards and legal requirements.</p>
        <p>This policy applies to all employees, contractors, partners, and representatives of Trayarunya Ventures, as well as to our products and services.</p>
      `,
    },
    {
      title: '2. Our Compliance Framework',
      content: `
        <p>Our compliance framework is built on the following key principles:</p>
        <ul>
          <li><strong>Risk-Based Approach:</strong> We identify, assess, and prioritize compliance risks relevant to our business and implement appropriate controls to mitigate these risks.</li>
          <li><strong>Continuous Improvement:</strong> We regularly review and enhance our compliance program to adapt to changing regulatory landscapes and business environments.</li>
          <li><strong>Accountability:</strong> We establish clear roles and responsibilities for compliance throughout our organization.</li>
          <li><strong>Transparency:</strong> We maintain open communication with stakeholders about our compliance efforts and performance.</li>
          <li><strong>Ethical Culture:</strong> We foster a culture of integrity and ethical behavior that goes beyond mere compliance with laws and regulations.</li>
        </ul>
      `,
    },
    {
      title: '3. Data Protection and Privacy',
      content: `
        <p>We are committed to protecting the privacy and security of personal data in accordance with applicable data protection laws, including but not limited to:</p>
        <ul>
          <li>General Data Protection Regulation (GDPR)</li>
          <li>California Consumer Privacy Act (CCPA)</li>
          <li>Personal Data Protection Act (PDPA)</li>
          <li>Health Insurance Portability and Accountability Act (HIPAA)</li>
        </ul>
        <p>Our data protection measures include:</p>
        <ul>
          <li>Implementing appropriate technical and organizational security measures to protect personal data</li>
          <li>Conducting data protection impact assessments for high-risk processing activities</li>
          <li>Maintaining records of processing activities</li>
          <li>Ensuring lawful bases for processing personal data</li>
          <li>Providing transparent information to data subjects about how their data is processed</li>
          <li>Respecting data subject rights</li>
          <li>Reporting data breaches in accordance with legal requirements</li>
        </ul>
        <p>For more detailed information, please refer to our <a href="/privacy">Privacy Policy</a>.</p>
      `,
    },
    {
      title: '4. Information Security',
      content: `
        <p>We maintain a robust information security program aligned with industry standards and best practices, including:</p>
        <ul>
          <li>Implementation of ISO 27001 framework principles</li>
          <li>Regular security assessments and penetration testing</li>
          <li>Encryption of sensitive data in transit and at rest</li>
          <li>Multi-factor authentication for access to critical systems</li>
          <li>Regular security awareness training for all employees</li>
          <li>Incident response planning and testing</li>
          <li>Vendor security assessment process</li>
        </ul>
      `,
    },
    {
      title: '5. Industry-Specific Compliance',
      content: `
        <p>Depending on the specific products and services we offer, we adhere to various industry-specific regulations and standards, including:</p>
        <h4>Healthcare</h4>
        <ul>
          <li>Health Insurance Portability and Accountability Act (HIPAA)</li>
          <li>Health Information Technology for Economic and Clinical Health Act (HITECH)</li>
          <li>Good Clinical Practice (GCP) guidelines</li>
          <li>FDA regulations for medical software</li>
        </ul>
        <h4>Financial Services</h4>
        <ul>
          <li>Payment Card Industry Data Security Standard (PCI DSS)</li>
          <li>Anti-Money Laundering (AML) regulations</li>
          <li>Know Your Customer (KYC) requirements</li>
        </ul>
        <h4>Artificial Intelligence and Machine Learning</h4>
        <ul>
          <li>Ethical AI principles and guidelines</li>
          <li>Algorithmic transparency and explainability requirements</li>
          <li>Bias detection and mitigation practices</li>
        </ul>
      `,
    },
    {
      title: '6. Compliance Monitoring and Reporting',
      content: `
        <p>We maintain a comprehensive compliance monitoring program that includes:</p>
        <ul>
          <li>Regular internal audits and assessments</li>
          <li>Compliance risk assessments</li>
          <li>Key performance indicators (KPIs) for compliance</li>
          <li>Incident reporting and management procedures</li>
          <li>Whistleblower protection mechanisms</li>
        </ul>
        <p>We encourage all employees, contractors, and business partners to report any compliance concerns through our designated reporting channels. We prohibit retaliation against anyone who reports compliance concerns in good faith.</p>
      `,
    },
    {
      title: '7. Training and Awareness',
      content: `
        <p>We provide comprehensive compliance training to all employees, including:</p>
        <ul>
          <li>New hire orientation on compliance policies and procedures</li>
          <li>Role-specific compliance training</li>
          <li>Annual refresher training on key compliance topics</li>
          <li>Ad-hoc training on emerging compliance issues</li>
          <li>Regular communication on compliance matters</li>
        </ul>
      `,
    },
    {
      title: '8. Third-Party Risk Management',
      content: `
        <p>We recognize that our compliance obligations extend to our relationships with third parties. Our third-party risk management program includes:</p>
        <ul>
          <li>Due diligence procedures for selecting and onboarding third parties</li>
          <li>Contractual provisions requiring compliance with applicable laws and regulations</li>
          <li>Ongoing monitoring of third-party compliance</li>
          <li>Periodic reassessment of third-party relationships</li>
        </ul>
      `,
    },
    {
      title: '9. Certifications and Attestations',
      content: `
        <p>Trayarunya Ventures maintains the following certifications and attestations:</p>
        <ul>
          <li>ISO 27001 (Information Security Management)</li>
          <li>SOC 2 Type II (Security, Availability, and Confidentiality)</li>
          <li>HIPAA Compliance Attestation</li>
          <li>GDPR Compliance Attestation</li>
        </ul>
        <p>Copies of our certifications and attestations are available to clients and partners upon request, subject to appropriate confidentiality agreements.</p>
      `,
    },
    {
      title: '10. Contact Information',
      content: `
        <p>If you have any questions or concerns about our compliance program or would like to report a compliance issue, please contact our Compliance Team at:</p>
        <p>Email: compliance@trayarunyaventures.com<br />
        Phone: +1 (971) 512-1701 (US) / +91-8954333390 (India)</p>
        <p>For general inquiries, please contact us at:</p>
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
                  Compliance
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

        {/* Compliance Content */}
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
                      '& h4': {
                        fontWeight: 600,
                        mb: 2,
                        mt: 3,
                        color: theme.palette.text.primary,
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
