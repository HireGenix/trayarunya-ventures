import React, { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button,
  FormControlLabel, Checkbox, alpha, useTheme,
  CircularProgress, Alert, Snackbar
} from '@mui/material';
import { motion } from 'framer-motion';
import SendIcon from '@mui/icons-material/Send';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ContactFormProps {
  onSubmitSuccess?: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ onSubmitSuccess }) => {
  const theme = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    company: '',
    phone: '',
    file: null as File | null,
    subscribe: false,
    preferredContact: 'email',
  });

  const [errors, setErrors] = useState({
    name: false,
    email: false,
    subject: false,
    message: false,
    company: false,
    phone: false,
    file: false,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: false,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          file: true,
        }));
        setSnackbar({
          open: true,
          message: 'File size exceeds 5MB limit',
          severity: 'error',
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        file,
      }));
      setFileName(file.name);

      // Simulate file upload
      setFileUploading(true);
      setTimeout(() => {
        setFileUploading(false);
      }, 1500);
    }
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({
      ...prev,
      file: null,
    }));
    setFileName('');
  };

  const validateForm = () => {
    const newErrors = {
      name: formData.name.trim() === '',
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      subject: formData.subject.trim() === '',
      message: formData.message.trim() === '',
      company: false, // Optional field
      phone: formData.preferredContact === 'phone' && !formData.phone.trim() ? true : false,
      file: false, // Optional field
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
          preferredContact: formData.preferredContact,
          subscribe: formData.subscribe,
          // We would handle file upload separately in a production environment
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
            message: 'Your message has been sent successfully! You will receive a confirmation email shortly, and we will get back to you within 24-48 hours.',
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
            file: null,
            subscribe: false,
            preferredContact: 'email',
          });

          setFileName('');

          // Call the success callback if provided
          if (onSubmitSuccess) {
            onSubmitSuccess();
          }

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
    <>
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
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '5px',
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary ? theme.palette.secondary.main : theme.palette.primary.dark})`,
            },
          }}
        >
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
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
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  }}
                  required
                />
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
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  }}
                  required
                />
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
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
                <TextField
                  name="phone"
                  label={formData.preferredContact === 'phone' ? "Phone (Required)" : "Phone (Optional)"}
                  variant="outlined"
                  fullWidth
                  value={formData.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  helperText={errors.phone ? 'Phone number is required for phone contact preference' : ''}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  }}
                  required={formData.preferredContact === 'phone'}
                />
              </Box>
              <Box sx={{ mb: 3, width: '100%' }}>
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
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  }}
                  required
                />
              </Box>

              <Box sx={{ mb: 3, width: '100%' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ ml: 1 }}>
                  Preferred Contact Method
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, ml: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.preferredContact === 'email'}
                        onChange={() => setFormData(prev => ({ ...prev, preferredContact: 'email' }))}
                        name="preferredContact"
                        color="primary"
                      />
                    }
                    label="Email"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.preferredContact === 'phone'}
                        onChange={() => setFormData(prev => ({ ...prev, preferredContact: 'phone' }))}
                        name="preferredContact"
                        color="primary"
                      />
                    }
                    label="Phone"
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 3, width: '100%' }}>
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
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  }}
                  required
                />
              </Box>

              {/* File Upload */}
              <Box sx={{ mb: 3, width: '100%' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ ml: 1 }}>
                  Attach a File (Optional, Max 5MB)
                </Typography>
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    },
                    position: 'relative',
                  }}
                  component="label"
                >
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  {!fileName ? (
                    <>
                      <CloudUploadIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
                      <Typography variant="body1">
                        Drag and drop a file here or click to browse
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
                      </Typography>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      {fileUploading ? (
                        <CircularProgress size={24} sx={{ mb: 1 }} />
                      ) : (
                        <CloudUploadIcon sx={{ fontSize: 30, color: theme.palette.success.main, mb: 1 }} />
                      )}
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {fileName}
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                        sx={{ mt: 1 }}
                      >
                        Remove
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Newsletter Subscription */}
              <Box sx={{ mb: 3, width: '100%' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.subscribe}
                      onChange={handleChange}
                      name="subscribe"
                      color="primary"
                    />
                  }
                  label="Subscribe to our newsletter for updates on our products and services"
                />
              </Box>

              {/* Email Information */}
              <Box sx={{ mb: 3, width: '100%' }}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                    📧 Email Confirmation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    After submitting this form, you'll receive an email confirmation at the address you provided.
                    Our team will also be notified and will respond to your inquiry within 24-48 hours.
                  </Typography>
                </Paper>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={isSubmitting ? null : <SendIcon />}
                  disabled={isSubmitting}
                  sx={{
                    py: 1.5,
                    px: 5,
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
                    minWidth: '180px',
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

      {/* Success Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ContactForm;
