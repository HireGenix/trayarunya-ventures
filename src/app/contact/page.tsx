'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Box, Container, Typography, Paper, Chip, Button, TextField, Grid, useTheme, useMediaQuery, alpha, Alert, Snackbar } from '@mui/material';
import { motion } from 'framer-motion';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';

const contactInfo = [
  {
    icon: <LocationOnIcon fontSize="large" />,
    title: 'USA Office',
    details: '1050 North 3rd Street, Laramie, WY 82072, USA',
  },
  {
    icon: <LocationOnIcon fontSize="large" />,
    title: 'India Office',
    details: '2/1201 Behind S.A.M Inter College, Ramnagar, Saharanpur (U.P)-247001, India',
  },
  {
    icon: <PhoneIcon fontSize="large" />,
    title: 'Phone',
    details: [
      '+1 (971) 512-1701 (US)',
      '+91-8954333390 (India)',
    ],
  },
  {
    icon: <EmailIcon fontSize="large" />,
    title: 'Email',
    details: 'info@trayarunyaventures.com',
  },
];

export default function ContactPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    company: '',
    phone: '',
  });
  
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    subject: false,
    message: false,
    company: false,
    phone: false,
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: false,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: formData.name.trim() === '',
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      subject: formData.subject.trim() === '',
      message: formData.message.trim() === '',
      company: false, // Optional field
      phone: false, // Optional field
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        // Create a lead object that matches the Lead type in the admin panel
        const leadData = {
          name: formData.name,
          email: formData.email,
          company: formData.company || undefined,
          phone: formData.phone || undefined,
          message: formData.message,
          subject: formData.subject,
          source: 'Website Contact Form',
          status: 'New',
          priority: 'Medium',
          formType: 'Contact Form',
          pageUrl: '/contact',
          date: new Date().toISOString(),
        };
        
        // Send the form data to our API endpoint with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          const response = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leadData),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to submit form');
          }
          
          // Show success message
          setSnackbar({
            open: true,
            message: 'Your message has been sent successfully! We will get back to you soon.',
            severity: 'success',
          });
          
          // Reset form
          setFormData({
            name: '',
            email: '',
            subject: '',
            message: '',
            company: '',
            phone: '',
          });
          
          // Track form submission event (in production, use analytics)
          if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
            (window as any).gtag('event', 'form_submission', {
              'event_category': 'engagement',
              'event_label': 'contact_form'
            });
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        
        // Provide more specific error messages
        let errorMessage = 'There was an error sending your message. Please try again later.';
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. Please check your internet connection and try again.';
          } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          } else if (error.message) {
            errorMessage = error.message;
          }
        }
        
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false,
    }));
  };

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
          
          {/* Animated gradient orbs */}
          <Box
            component={motion.div}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.05 }}
            transition={{ duration: 1.5 }}
            sx={{
              position: 'absolute',
              top: '20%',
              right: '10%',
              width: { xs: 150, md: 300 },
              height: { xs: 150, md: 300 },
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.palette.primary.light} 0%, rgba(255, 255, 255, 0) 70%)`,
              filter: 'blur(80px)',
              zIndex: 0,
              animation: 'heroPulse 10s ease-in-out infinite',
              '@keyframes heroPulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 0.05 },
                '50%': { transform: 'scale(1.1)', opacity: 0.08 },
              },
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
                  label="CONTACT US"
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
                  Get In Touch
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
                  Have questions or want to learn more about our products? We'd love to hear from you. Reach out to us using the form below or contact us directly.
                </Typography>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Contact Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#ffffff' }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {/* Contact Form */}
              <Box 
                sx={{ 
                  width: '100%', 
                  flex: { xs: '0 0 100%', md: '0 0 calc(60% - 24px)' },
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <Typography
                    variant="h3"
                    component="h2"
                    sx={{
                      fontWeight: 700,
                      mb: 4,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Send Us a Message
                  </Typography>
                  
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 3, md: 5 },
                      borderRadius: 4,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <Box component="form" onSubmit={handleSubmit}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
                        <Box sx={{ width: '100%', px: 1.5, mb: 3, flex: { xs: '0 0 100%', sm: '0 0 50%' } }}>
                          <TextField
                            name="name"
                            label="Your Name"
                            variant="outlined"
                            fullWidth
                            value={formData.name}
                            onChange={handleChange}
                            error={errors.name}
                            helperText={errors.name ? 'Name is required' : ''}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                        <Box sx={{ width: '100%', px: 1.5, mb: 3, flex: { xs: '0 0 100%', sm: '0 0 50%' } }}>
                          <TextField
                            name="email"
                            label="Your Email"
                            variant="outlined"
                            fullWidth
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                            helperText={errors.email ? 'Valid email is required' : ''}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                        <Box sx={{ width: '100%', px: 1.5, mb: 3, flex: { xs: '0 0 100%', sm: '0 0 50%' } }}>
                          <TextField
                            name="company"
                            label="Company (Optional)"
                            variant="outlined"
                            fullWidth
                            value={formData.company}
                            onChange={handleChange}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                        <Box sx={{ width: '100%', px: 1.5, mb: 3, flex: { xs: '0 0 100%', sm: '0 0 50%' } }}>
                          <TextField
                            name="phone"
                            label="Phone (Optional)"
                            variant="outlined"
                            fullWidth
                            value={formData.phone}
                            onChange={handleChange}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                        <Box sx={{ width: '100%', px: 1.5, mb: 3 }}>
                          <TextField
                            name="subject"
                            label="Subject"
                            variant="outlined"
                            fullWidth
                            value={formData.subject}
                            onChange={handleChange}
                            error={errors.subject}
                            helperText={errors.subject ? 'Subject is required' : ''}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                        <Box sx={{ width: '100%', px: 1.5, mb: 3 }}>
                          <TextField
                            name="message"
                            label="Your Message"
                            variant="outlined"
                            fullWidth
                            multiline
                            rows={6}
                            value={formData.message}
                            onChange={handleChange}
                            error={errors.message}
                            helperText={errors.message ? 'Message is required' : ''}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                        <Box sx={{ width: '100%', px: 1.5, mb: 3 }}>
                          <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                            endIcon={isSubmitting ? null : <SendIcon />}
                            disabled={isSubmitting}
                            sx={{
                              py: 1.5,
                              px: 4,
                              fontWeight: 600,
                              fontSize: '1rem',
                              borderRadius: '50px',
                              boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
                              '&:hover': {
                                transform: isSubmitting ? 'none' : 'translateY(-3px)',
                                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)',
                              },
                              transition: 'all 0.3s ease',
                              position: 'relative',
                            }}
                          >
                            {isSubmitting ? (
                              <>
                                <Box
                                  component="span"
                                  sx={{
                                    display: 'inline-block',
                                    width: '20px',
                                    height: '20px',
                                    mr: 1,
                                    borderRadius: '50%',
                                    border: '2px solid currentColor',
                                    borderTopColor: 'transparent',
                                    animation: 'spin 1s linear infinite',
                                    '@keyframes spin': {
                                      '0%': { transform: 'rotate(0deg)' },
                                      '100%': { transform: 'rotate(360deg)' },
                                    },
                                  }}
                                />
                                Sending...
                              </>
                            ) : (
                              'Send Message'
                            )}
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                </motion.div>
              </Box>
              
              {/* Contact Information */}
              <Box 
                sx={{ 
                  width: '100%', 
                  flex: { xs: '0 0 100%', md: '0 0 calc(40% - 24px)' },
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Typography
                    variant="h3"
                    component="h2"
                    sx={{
                      fontWeight: 700,
                      mb: 4,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Contact Information
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {contactInfo.map((info, index) => (
                      <Paper
                        key={index}
                        elevation={0}
                        sx={{
                          p: 3,
                          borderRadius: 4,
                          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 3,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            flexShrink: 0,
                          }}
                        >
                          {info.icon}
                        </Box>
                        <Box>
                          <Typography
                            variant="h6"
                            fontWeight={700}
                            gutterBottom
                            sx={{ color: theme.palette.text.primary }}
                          >
                            {info.title}
                          </Typography>
                          {Array.isArray(info.details) ? (
                            info.details.map((detail, i) => (
                              <Typography
                                key={i}
                                variant="body1"
                                sx={{ color: theme.palette.text.secondary, mb: i < info.details.length - 1 ? 1 : 0 }}
                              >
                                {detail}
                              </Typography>
                            ))
                          ) : (
                            <Typography
                              variant="body1"
                              sx={{ color: theme.palette.text.secondary }}
                            >
                              {info.details}
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </motion.div>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Map Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: theme.palette.text.primary,
                }}
              >
                Our Locations
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
                With offices in the USA and India, we serve clients globally.
              </Typography>
            </Box>
            
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  height: 450,
                  width: '100%',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  Map will be embedded here
                </Typography>
              </Paper>
            </Box>
          </Container>
        </Box>

        {/* FAQ Section */}
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
                Find answers to common questions about our products and services.
              </Typography>
            </Box>
            
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 4,
              }}
            >
              {[
                {
                  question: 'How can I request a demo of your products?',
                  answer: 'You can request a demo by filling out the contact form on this page or by emailing us directly at info@trayarunyaventures.com. Our team will get back to you within 24 hours to schedule a personalized demo.',
                },
                {
                  question: 'Do you offer custom solutions?',
                  answer: 'Yes, we offer custom solutions tailored to your specific business needs. Our team will work closely with you to understand your requirements and develop a solution that addresses your unique challenges.',
                },
                {
                  question: 'What industries do you serve?',
                  answer: 'We serve a wide range of industries including healthcare, finance, retail, manufacturing, and more. Our AI-powered solutions are designed to be adaptable to various business contexts and requirements.',
                },
                {
                  question: 'How do you handle data security?',
                  answer: 'Data security is our top priority. We implement industry-standard security measures and comply with relevant regulations to ensure your data is protected. All data is encrypted both in transit and at rest.',
                },
              ].map((faq, index) => (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    gutterBottom
                    sx={{ color: theme.palette.text.primary }}
                  >
                    {faq.question}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {faq.answer}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Container>
        </Box>
      </Box>
      
      {/* Success Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity as 'success' | 'error'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
