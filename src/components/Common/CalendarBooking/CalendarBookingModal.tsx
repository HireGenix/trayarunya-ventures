'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  alpha,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarBookingModalProps, FormData, FormErrors } from './types';
import { getAvailableDates, getServiceColor, isValidEmail, checkAvailability, formatBookingData } from './utils';
import { MeetingTypeStep, DateTimeStep, ContactInfoStep, ConfirmationStep, SuccessView } from './BookingSteps';
import { meetingTypes, timeSlots } from './types';

/**
 * Calendar Booking Modal Component
 * 
 * A multi-step form modal for booking calendar appointments with Google Calendar integration
 */
export const CalendarBookingModal: React.FC<CalendarBookingModalProps> = ({
  open,
  onClose,
  serviceData,
}) => {
  const theme = useTheme();
  const primaryColor = getServiceColor(serviceData?.serviceType);
  
  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    meetingType: '',
    date: '',
    time: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState(timeSlots);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  
  // Available dates
  const availableDates = getAvailableDates();
  
  // Steps for the booking process
  const steps = ['Meeting Type', 'Date & Time', 'Your Details', 'Confirmation'];

  /**
   * Handle input change for text fields
   */
  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };
  
  /**
   * Handle select change for dropdown fields
   */
  const handleSelectChange = (field: keyof FormData) => (
    event: SelectChangeEvent<string>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    
    // Clear error when user selects an option
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // If date field changes, fetch available time slots
    if (field === 'date' && event.target.value) {
      fetchAvailableTimeSlots(event.target.value);
    }
  };

  /**
   * Handle time slot selection
   */
  const handleTimeSelect = (time: string) => {
    setFormData(prev => ({ ...prev, time }));
    if (errors.time) {
      setErrors(prev => ({ ...prev, time: undefined }));
    }
  };

  /**
   * Fetch available time slots for a given date
   */
  const fetchAvailableTimeSlots = async (date: string) => {
    setIsLoading(true);
    try {
      const slots = await checkAvailability(date, timeSlots);
      setAvailableTimeSlots(slots);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setAvailableTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validate the current step
   */
  const validateStep = (): boolean => {
    const newErrors: FormErrors = {};

    switch (activeStep) {
      case 0:
        if (!formData.meetingType) {
          newErrors.meetingType = 'Please select a meeting type';
        }
        break;
      case 1:
        if (!formData.date) {
          newErrors.date = 'Please select a date';
        }
        if (!formData.time) {
          newErrors.time = 'Please select a time slot';
        }
        break;
      case 2:
        if (!formData.name.trim()) {
          newErrors.name = 'Name is required';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!isValidEmail(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Move to the next step
   */
  const handleNext = () => {
    if (validateStep()) {
      setActiveStep(prevStep => prevStep + 1);
    }
  };

  /**
   * Move to the previous step
   */
  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  /**
   * Submit the booking
   */
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // In a real implementation, this would:
      // 1. Create a calendar event in Google Calendar
      // 2. Send confirmation emails
      // 3. Save the booking in your database
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Format the booking data for submission
      const meetingTypeObj = meetingTypes.find(mt => mt.id === formData.meetingType);
      const bookingData = formatBookingData(
        formData,
        serviceData,
        meetingTypeObj?.name || '',
        meetingTypeObj?.duration || 30
      );
      
      // In a real implementation, you would call your API here
      // For example:
      // const response = await fetch('/api/calendar-booking', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(bookingData),
      // });
      
      setSubmitStatus('success');
      setSubmitMessage('Your meeting has been scheduled successfully! You will receive a calendar invitation and confirmation email shortly.');
      
      // Reset form after successful submission
      setTimeout(() => {
        resetForm();
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error submitting booking:', error);
      setSubmitStatus('error');
      setSubmitMessage('An error occurred while scheduling your meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reset the form to its initial state
   */
  const resetForm = () => {
    setFormData({
      meetingType: '',
      date: '',
      time: '',
      name: '',
      email: '',
      phone: '',
      company: '',
      notes: '',
    });
    setActiveStep(0);
    setErrors({});
    setSubmitStatus('idle');
    setSubmitMessage('');
  };

  /**
   * Handle closing the modal
   */
  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  /**
   * Render the current step content
   */
  const renderStepContent = () => {
    const commonProps = {
      formData,
      errors,
      handleInputChange,
      handleSelectChange,
      handleTimeSelect,
      primaryColor,
      serviceData,
      availableDates,
      availableTimeSlots,
    };

    switch (activeStep) {
      case 0:
        return <MeetingTypeStep {...commonProps} />;
      case 1:
        return <DateTimeStep {...commonProps} />;
      case 2:
        return <ContactInfoStep {...commonProps} />;
      case 3:
        return <ConfirmationStep {...commonProps} submitStatus={submitStatus} submitMessage={submitMessage} />;
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
        },
      }}
    >
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <Box
              sx={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${alpha(primaryColor, 0.8)} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background decorative elements */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  zIndex: 0,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -30,
                  left: -30,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  zIndex: 0,
                }}
              />

              <DialogTitle sx={{ position: 'relative', zIndex: 1, pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h4" component="h2" fontWeight={700} gutterBottom>
                      Schedule a Meeting
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                      Book a consultation with our {serviceData?.serviceType} team
                    </Typography>
                    <Chip
                      label={`${serviceData?.serviceName}`}
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

            {/* Content */}
            <DialogContent sx={{ p: { xs: 2, sm: 4 } }}>
              {submitStatus === 'success' ? (
                <SuccessView submitMessage={submitMessage} primaryColor={primaryColor} />
              ) : (
                <>
                  <Stepper 
                    activeStep={activeStep} 
                    alternativeLabel 
                    sx={{ 
                      mb: 4,
                      '& .MuiStepLabel-root': {
                        '& .MuiStepLabel-iconContainer': {
                          '& .MuiStepIcon-root': {
                            color: alpha(primaryColor, 0.4),
                            '&.Mui-active': {
                              color: primaryColor,
                            },
                            '&.Mui-completed': {
                              color: primaryColor,
                            },
                          },
                        },
                      },
                    }}
                  >
                    {steps.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                  
                  <Box sx={{ mt: 2, minHeight: 350 }}>
                    <AnimatePresence mode="wait">
                      {renderStepContent()}
                    </AnimatePresence>
                  </Box>
                </>
              )}
            </DialogContent>

            {/* Actions */}
            {submitStatus !== 'success' && (
              <DialogActions sx={{ p: 3, pt: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Button
                    disabled={activeStep === 0 || isSubmitting}
                    onClick={handleBack}
                    startIcon={<ArrowBackIcon />}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { backgroundColor: alpha(primaryColor, 0.05) },
                    }}
                  >
                    Back
                  </Button>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      sx={{
                        borderColor: alpha(primaryColor, 0.5),
                        color: primaryColor,
                        '&:hover': {
                          borderColor: primaryColor,
                          backgroundColor: alpha(primaryColor, 0.05),
                        },
                      }}
                    >
                      Cancel
                    </Button>
                    {activeStep === steps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
                        sx={{
                          backgroundColor: primaryColor,
                          '&:hover': {
                            backgroundColor: alpha(primaryColor, 0.9),
                          },
                          px: 3,
                          py: 1,
                        }}
                      >
                        {isSubmitting ? 'Scheduling...' : 'Confirm Booking'}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          backgroundColor: primaryColor,
                          '&:hover': {
                            backgroundColor: alpha(primaryColor, 0.9),
                          },
                          px: 3,
                          py: 1,
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </Box>
                </Box>
              </DialogActions>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default CalendarBookingModal;
