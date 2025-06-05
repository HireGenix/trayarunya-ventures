'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  Chip,
  CircularProgress,
  alpha,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Card,
  CardContent,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Grid,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceContactModalData } from '@/hooks/useServiceContactModal';

interface ServiceContactModalProps {
  open: boolean;
  onClose: () => void;
  serviceData: ServiceContactModalData | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  projectType: string;
  budget: number;
  timeline: string;
  description: string;
  meetingType: string;
  preferredDate: string;
  preferredTime: string;
  timezone: string;
}

interface FormErrors {
  [key: string]: string;
}

const steps = ['Contact Info', 'Project Details', 'Schedule Meeting'];

const budgetRanges = [
  { value: 5000, label: '$5K - $10K' },
  { value: 15000, label: '$10K - $25K' },
  { value: 35000, label: '$25K - $50K' },
  { value: 75000, label: '$50K - $100K' },
  { value: 150000, label: '$100K+' },
];

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

const timezones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'
];

export const ServiceContactModal: React.FC<ServiceContactModalProps> = ({
  open,
  onClose,
  serviceData,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    projectType: '',
    budget: 15000,
    timeline: '',
    description: '',
    meetingType: 'video',
    preferredDate: '',
    preferredTime: '',
    timezone: 'Asia/Kolkata',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const primaryColor = serviceData?.serviceType === 'Digital Marketing' ? '#8E44AD' :
                      serviceData?.serviceType === 'Overseas Business' ? '#2E86AB' :
                      serviceData?.serviceType === 'Enterprise' ? '#F18F01' :
                      serviceData?.serviceType === 'Healthcare' ? '#C73E1D' :
                      serviceData?.serviceType === 'Startups' ? '#4CAF50' :
                      '#6C3483';

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target ? event.target.value : event;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 0:
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.company.trim()) newErrors.company = 'Company is required';
        break;
      
      case 1:
        if (!formData.projectType) newErrors.projectType = 'Project type is required';
        if (!formData.timeline) newErrors.timeline = 'Timeline is required';
        if (!formData.description.trim()) newErrors.description = 'Project description is required';
        break;
      
      case 2:
        if (!formData.preferredDate) newErrors.preferredDate = 'Preferred date is required';
        if (!formData.preferredTime) newErrors.preferredTime = 'Preferred time is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep) || !serviceData) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const meetingData = {
        summary: `${serviceData.serviceName} Consultation - ${formData.company}`,
        description: `
Project Type: ${formData.projectType}
Budget: ${budgetRanges.find(b => b.value === formData.budget)?.label}
Timeline: ${formData.timeline}
Meeting Type: ${formData.meetingType === 'video' ? 'Video Call' : 'Phone Call'}

Project Description:
${formData.description}

Contact Information:
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Company: ${formData.company}
        `.trim(),
        start: {
          dateTime: `${formData.preferredDate}T${formData.preferredTime}:00`,
          timeZone: formData.timezone,
        },
        end: {
          dateTime: `${formData.preferredDate}T${String(parseInt(formData.preferredTime.split(':')[0]) + 1).padStart(2, '0')}:${formData.preferredTime.split(':')[1]}:00`,
          timeZone: formData.timezone,
        },
        attendees: [
          { email: formData.email },
          { email: 'meetings@trayarunya.com' }
        ],
        conferenceData: formData.meetingType === 'video' ? {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        } : undefined,
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          company: formData.company,
          subject: `${serviceData.serviceName} Consultation Request`,
          message: `
Project Type: ${formData.projectType}
Budget: ${budgetRanges.find(b => b.value === formData.budget)?.label}
Timeline: ${formData.timeline}
Meeting Scheduled: ${formData.preferredDate} at ${formData.preferredTime} (${formData.timezone})
Meeting Type: ${formData.meetingType === 'video' ? 'Video Call' : 'Phone Call'}

Project Description:
${formData.description}
          `.trim(),
          source: serviceData.source,
          formType: `${serviceData.formType} - Multi-step with Calendar`,
          pageUrl: serviceData.pageUrl,
          priority: 'High',
          formData: {
            projectType: formData.projectType,
            budget: formData.budget,
            timeline: formData.timeline,
            meetingType: formData.meetingType,
            preferredDate: formData.preferredDate,
            preferredTime: formData.preferredTime,
            timezone: formData.timezone,
            meetingData: meetingData,
          }
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage('Perfect! Your consultation has been scheduled. You\'ll receive a calendar invite shortly with meeting details.');
        
        setTimeout(() => {
          setFormData({
            name: '',
            email: '',
            phone: '',
            company: '',
            projectType: '',
            budget: 15000,
            timeline: '',
            description: '',
            meetingType: 'video',
            preferredDate: '',
            preferredTime: '',
            timezone: 'Asia/Kolkata',
          });
          setActiveStep(0);
          setSubmitStatus('idle');
          onClose();
        }, 4000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule consultation');
      }
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        projectType: '',
        budget: 15000,
        timeline: '',
        description: '',
        meetingType: 'video',
        preferredDate: '',
        preferredTime: '',
        timezone: 'Asia/Kolkata',
      });
      setErrors({});
      setActiveStep(0);
      setSubmitStatus('idle');
      setSubmitMessage('');
      onClose();
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: primaryColor, fontWeight: 600 }}>
              Let's start with your contact information
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
                <TextField
                  label="Full Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': { borderColor: primaryColor },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: primaryColor },
                  }}
                />
                <TextField
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': { borderColor: primaryColor },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: primaryColor },
                  }}
                />
                <TextField
                  label="Phone Number"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  fullWidth
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': { borderColor: primaryColor },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: primaryColor },
                  }}
                />
                <TextField
                  label="Company Name"
                  value={formData.company}
                  onChange={handleInputChange('company')}
                  error={!!errors.company}
                  helperText={errors.company}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: <BusinessIcon sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': { borderColor: primaryColor },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: primaryColor },
                  }}
                />
              </Box>
            </Box>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: primaryColor, fontWeight: 600 }}>
              Tell us about your project
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3, mt: 3 }}>
                <FormControl fullWidth error={!!errors.projectType}>
                  <InputLabel>Project Type</InputLabel>
                  <Select
                    value={formData.projectType}
                    onChange={handleInputChange('projectType')}
                    label="Project Type"
                    sx={{
                      borderRadius: 2,
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                        borderColor: primaryColor,
                        borderWidth: '2px',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: 2,
                          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                        },
                      },
                    }}
                  >
                    {serviceData?.serviceType === 'Digital Marketing' ? [
                      <MenuItem key="seo" value="SEO & Content Marketing">SEO & Content Marketing</MenuItem>,
                      <MenuItem key="ppc" value="PPC & Paid Advertising">PPC & Paid Advertising</MenuItem>,
                      <MenuItem key="social" value="Social Media Marketing">Social Media Marketing</MenuItem>,
                      <MenuItem key="email" value="Email Marketing">Email Marketing</MenuItem>,
                      <MenuItem key="full" value="Full Digital Marketing Strategy">Full Digital Marketing Strategy</MenuItem>,
                    ] : [
                      <MenuItem key="web" value="Website Development">Website Development</MenuItem>,
                      <MenuItem key="app" value="Mobile App Development">Mobile App Development</MenuItem>,
                      <MenuItem key="ecommerce" value="E-commerce Platform">E-commerce Platform</MenuItem>,
                      <MenuItem key="custom" value="Custom Software">Custom Software</MenuItem>,
                      <MenuItem key="consulting" value="Consulting">Consulting</MenuItem>,
                    ]}
                  </Select>
                  {errors.projectType && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.projectType}
                    </Typography>
                  )}
                </FormControl>
                
                <Box>
                  <Typography gutterBottom sx={{ color: primaryColor, fontWeight: 600 }}>
                    Project Budget: {budgetRanges.find(b => b.value === formData.budget)?.label}
                  </Typography>
                  <Slider
                    value={formData.budget}
                    onChange={(_, value) => handleInputChange('budget')(value)}
                    step={null}
                    marks={budgetRanges.map(range => ({ value: range.value, label: range.label }))}
                    min={5000}
                    max={150000}
                    sx={{
                      color: primaryColor,
                      '& .MuiSlider-thumb': { backgroundColor: primaryColor },
                      '& .MuiSlider-track': { backgroundColor: primaryColor },
                      '& .MuiSlider-rail': { backgroundColor: alpha(primaryColor, 0.3) },
                    }}
                  />
                </Box>

                <FormControl fullWidth error={!!errors.timeline}>
                  <InputLabel>Project Timeline</InputLabel>
                  <Select
                    value={formData.timeline}
                    onChange={handleInputChange('timeline')}
                    label="Project Timeline"
                    sx={{
                      borderRadius: 2,
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                        borderColor: primaryColor,
                        borderWidth: '2px',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: 2,
                          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                        },
                      },
                    }}
                  >
                    <MenuItem value="ASAP">ASAP (Rush Project)</MenuItem>
                    <MenuItem value="1-2 months">1-2 months</MenuItem>
                    <MenuItem value="3-6 months">3-6 months</MenuItem>
                    <MenuItem value="6+ months">6+ months</MenuItem>
                    <MenuItem value="Flexible">Flexible timeline</MenuItem>
                  </Select>
                  {errors.timeline && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.timeline}
                    </Typography>
                  )}
                </FormControl>

                <TextField
                  label="Project Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  error={!!errors.description}
                  helperText={errors.description || 'Describe your project goals, requirements, and any specific features you need'}
                  required
                  fullWidth
                  multiline
                  rows={4}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&.Mui-focused fieldset': { 
                        borderColor: primaryColor,
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: primaryColor },
                  }}
                  InputProps={{
                    sx: {
                      alignItems: 'flex-start',
                      '& .MuiInputAdornment-root': {
                        mt: 2,
                        ml: 1,
                      }
                    }
                  }}
                />
              </Box>
            </Box>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: primaryColor, fontWeight: 600 }}>
              Schedule your free consultation
            </Typography>
            
            <Card sx={{ mb: 3, border: `1px solid ${alpha(primaryColor, 0.2)}` }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ color: primaryColor }}>
                  Meeting Type
                </Typography>
                <RadioGroup
                  value={formData.meetingType}
                  onChange={handleInputChange('meetingType')}
                  row
                >
                  <FormControlLabel
                    value="video"
                    control={<Radio sx={{ color: primaryColor, '&.Mui-checked': { color: primaryColor } }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <VideoCallIcon sx={{ mr: 1, color: primaryColor }} />
                        Video Call (Google Meet)
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="phone"
                    control={<Radio sx={{ color: primaryColor, '&.Mui-checked': { color: primaryColor } }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon sx={{ mr: 1, color: primaryColor }} />
                        Phone Call
                      </Box>
                    }
                  />
                </RadioGroup>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3, mt: 3 }}>
                <TextField
                  label="Preferred Date"
                  type="date"
                  value={formData.preferredDate}
                  onChange={handleInputChange('preferredDate')}
                  error={!!errors.preferredDate}
                  helperText={errors.preferredDate}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().split('T')[0] }}
                  InputProps={{
                    startAdornment: <CalendarIcon sx={{ color: 'action.active', mr: 1 }} />,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&.Mui-focused fieldset': { 
                        borderColor: primaryColor,
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: primaryColor },
                  }}
                />
                
                <FormControl fullWidth error={!!errors.preferredTime}>
                  <InputLabel>Preferred Time</InputLabel>
                  <Select
                    value={formData.preferredTime}
                    onChange={handleInputChange('preferredTime')}
                    label="Preferred Time"
                    sx={{
                      borderRadius: 2,
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                        borderColor: primaryColor,
                        borderWidth: '2px',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: 2,
                          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                        },
                      },
                    }}
                  >
                    {timeSlots.map(time => (
                      <MenuItem key={time} value={time}>{time}:00</MenuItem>
                    ))}
                  </Select>
                  {errors.preferredTime && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.preferredTime}
                    </Typography>
                  )}
                </FormControl>
              </Box>

              <Box sx={{ mt: 3, width: '100%' }}>
                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={formData.timezone}
                    onChange={handleInputChange('timezone')}
                    label="Timezone"
                    sx={{
                      borderRadius: 2,
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                        borderColor: primaryColor,
                        borderWidth: '2px',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: 2,
                          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                          maxHeight: 300,
                        },
                      },
                    }}
                  >
                    {timezones.map(tz => (
                      <MenuItem key={tz} value={tz}>{tz.replace('_', ' ')}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Paper sx={{ mt: 3, p: 3, backgroundColor: alpha(primaryColor, 0.05), border: `1px solid ${alpha(primaryColor, 0.2)}` }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: primaryColor }}>
                What to expect in your consultation:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon sx={{ color: primaryColor, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="30-minute strategy session" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon sx={{ color: primaryColor, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Project scope and requirements review" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon sx={{ color: primaryColor, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Custom solution recommendations" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon sx={{ color: primaryColor, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Timeline and budget discussion" />
                </ListItem>
              </List>
            </Paper>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
          minHeight: 600,
        },
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${alpha(primaryColor, 0.8)} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <DialogTitle sx={{ position: 'relative', zIndex: 1, pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h4" component="h2" fontWeight={700} gutterBottom>
                      {submitStatus === 'success' ? 'Consultation Scheduled!' : `Book ${serviceData?.serviceName} Consultation`}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                      {submitStatus === 'success' 
                        ? 'We\'ll send you a calendar invite with all the details'
                        : 'Let\'s discuss your project and schedule a free consultation'
                      }
                    </Typography>
                    <Chip
                      label={`${serviceData?.serviceType} Service`}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontWeight: 600,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                      }}
                    />
                  </Box>
                  <IconButton
                    onClick={handleClose}
                    disabled={isSubmitting}
                    sx={{
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              </DialogTitle>
            </Box>

            <DialogContent sx={{ p: 4 }}>
              {submitStatus === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#4CAF50', mx: 'auto', mb: 2 }}>
                      <CalendarIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight={700} gutterBottom color="#4CAF50">
                      Consultation Scheduled Successfully!
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
                      {submitMessage}
                    </Typography>
                    <Paper sx={{ p: 3, backgroundColor: alpha('#4CAF50', 0.05), border: `1px solid ${alpha('#4CAF50', 0.2)}` }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Meeting Details:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Date:</strong> {formData.preferredDate}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Time:</strong> {formData.preferredTime}:00 ({formData.timezone})
                      </Typography>
                      <Typography variant="body2">
                        <strong>Type:</strong> {formData.meetingType === 'video' ? 'Video Call (Google Meet)' : 'Phone Call'}
                      </Typography>
                    </Paper>
                  </Box>
                </motion.div>
              ) : (
                <>
                  <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label, index) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>

                  <AnimatePresence mode="wait">
                    {renderStepContent(activeStep)}
                  </AnimatePresence>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button
                      onClick={handleBack}
                      disabled={activeStep === 0 || isSubmitting}
                      startIcon={<ArrowBackIcon />}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { backgroundColor: alpha(primaryColor, 0.05) },
                      }}
                    >
                      Back
                    </Button>
                    <Box>
                      {activeStep === steps.length - 1 ? (
                        <Button
                          onClick={handleSubmit}
                          variant="contained"
                          disabled={isSubmitting}
                          endIcon={isSubmitting ? <CircularProgress size={20} /> : <CalendarIcon />}
                          sx={{
                            backgroundColor: primaryColor,
                            '&:hover': { backgroundColor: alpha(primaryColor, 0.9) },
                          }}
                        >
                          {isSubmitting ? 'Scheduling...' : 'Schedule Consultation'}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          variant="contained"
                          endIcon={<ArrowForwardIcon />}
                          sx={{
                            backgroundColor: primaryColor,
                            '&:hover': { backgroundColor: alpha(primaryColor, 0.9) },
                          }}
                        >
                          Next
                        </Button>
                      )}
                    </Box>
                  </Box>
                </>
              )}
              
              {submitStatus === 'error' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {submitMessage}
                </Alert>
              )}
            </DialogContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
};
