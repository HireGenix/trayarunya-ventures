import React from 'react';
import { 
  Box, Container, Typography, Paper, useTheme, 
  Accordion, AccordionSummary, AccordionDetails, alpha 
} from '@mui/material';
import { motion } from 'framer-motion';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const faqs = [
  {
    question: 'How can I request a demo of your products?',
    answer: 'You can request a demo by filling out the contact form on this page or by emailing us directly at info@trayarunyaventures.com. Our team will get back to you within 24 hours to schedule a personalized demo tailored to your specific needs and interests.',
  },
  {
    question: 'Do you offer custom solutions?',
    answer: 'Yes, we offer custom solutions tailored to your specific business needs. Our team will work closely with you to understand your requirements and develop a solution that addresses your unique challenges. We follow a collaborative approach to ensure the final product aligns perfectly with your business goals.',
  },
  {
    question: 'What industries do you serve?',
    answer: 'We serve a wide range of industries including healthcare, finance, retail, manufacturing, education, technology, and more. Our AI-powered solutions are designed to be adaptable to various business contexts and requirements, allowing us to provide value across different sectors.',
  },
  {
    question: 'How do you handle data security?',
    answer: 'Data security is our top priority. We implement industry-standard security measures and comply with relevant regulations to ensure your data is protected. All data is encrypted both in transit and at rest. We also conduct regular security audits and follow best practices for secure development and operations.',
  },
  {
    question: 'What is your typical implementation timeline?',
    answer: 'Implementation timelines vary depending on the complexity of the solution and specific requirements. Typically, our standard implementations range from 4-8 weeks, while more complex custom solutions may take 3-6 months. We provide a detailed timeline during the initial consultation phase after understanding your specific needs.',
  },
  {
    question: 'Do you provide training and support after implementation?',
    answer: 'Yes, we provide comprehensive training and ongoing support after implementation. Our support packages include user training sessions, documentation, regular maintenance, and technical support. We also offer premium support options with dedicated account managers and 24/7 assistance.',
  },
];

const FaqSection: React.FC = () => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: theme.palette.text.primary,
            }}
          >
            Frequently Asked Questions
          </Typography>
          <Typography
            variant="body1"
            sx={{ 
              mb: 4, 
              maxWidth: 700, 
              mx: 'auto', 
              color: theme.palette.text.secondary, 
              fontSize: '1.1rem', 
              lineHeight: 1.7 
            }}
          >
            Find answers to common questions about our products and services. If you don't see your question here, feel free to contact us.
          </Typography>
        </Box>
        
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          sx={{ maxWidth: 900, mx: 'auto' }}
        >
          {faqs.map((faq, index) => (
            <Accordion
              key={index}
              expanded={expanded === `panel${index}`}
              onChange={handleChange(`panel${index}`)}
              sx={{
                mb: 2,
                borderRadius: '8px !important',
                overflow: 'hidden',
                boxShadow: expanded === `panel${index}` 
                  ? '0 10px 30px rgba(0,0,0,0.1)'
                  : '0 4px 15px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                '&:before': {
                  display: 'none',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon 
                    sx={{ 
                      color: expanded === `panel${index}` ? theme.palette.primary.main : theme.palette.text.secondary,
                      transition: 'all 0.3s ease',
                    }} 
                  />
                }
                aria-controls={`panel${index}bh-content`}
                id={`panel${index}bh-header`}
                sx={{
                  backgroundColor: expanded === `panel${index}` 
                    ? alpha(theme.palette.primary.main, 0.05)
                    : 'transparent',
                  borderLeft: expanded === `panel${index}` 
                    ? `4px solid ${theme.palette.primary.main}`
                    : '4px solid transparent',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.03),
                  },
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: expanded === `panel${index}` ? 700 : 600,
                    color: expanded === `panel${index}` ? theme.palette.primary.main : theme.palette.text.primary,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 3, px: 3 }}>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary, lineHeight: 1.7 }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default FaqSection;
