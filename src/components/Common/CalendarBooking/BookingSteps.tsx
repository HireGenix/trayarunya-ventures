'use client';

import React, { ElementType, ReactNode } from 'react';
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  TextField,
  Grid as MuiGrid,
  Button,
  Paper,
  Divider,
  Alert,
  alpha,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { BookingStepProps, FormData, meetingTypes } from './types';

// Create a Grid component that works with MUI v5
interface GridProps {
  children: ReactNode;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  item?: boolean;
  container?: boolean;
  spacing?: number;
  key?: number | string;
  [key: string]: any;
}

const Grid = (props: GridProps) => {
  const { children, ...other } = props;
  return <MuiGrid item {...other}>{children}</MuiGrid>;
};

// Animation variants
const fadeVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3 }
  }
};

/**
 * Step 1: Meeting Type Selection
 */
export const MeetingTypeStep: React.FC<BookingStepProps> = ({
  formData,
  errors,
  handleSelectChange,
  primaryColor,
  serviceData
}) => {
  return (
    <motion.div
      key="step1"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeVariants}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: primaryColor }}>
        Select the type of meeting you'd like to schedule
      </Typography>
      
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: 2, 
          backgroundColor: alpha(primaryColor, 0.03),
          border: `1px solid ${alpha(primaryColor, 0.1)}`,
          mb: 3
        }}
      >
        <FormControl 
          fullWidth 
          error={!!errors.meetingType}
        >
          <InputLabel id="meeting-type-label">Meeting Type</InputLabel>
          <Select
            labelId="meeting-type-label"
            id="meeting-type"
            value={formData.meetingType}
            onChange={handleSelectChange('meetingType') as (event: SelectChangeEvent<string>) => void}
            label="Meeting Type"
            sx={{
              borderRadius: 2,
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
            }}
          >
            {meetingTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Typography>{type.name}</Typography>
                  <Chip 
                    label={`${type.duration} min`} 
                    size="small"
                    sx={{ 
                      backgroundColor: alpha(primaryColor, 0.1),
                      color: primaryColor,
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
          {errors.meetingType && (
            <FormHelperText>{errors.meetingType}</FormHelperText>
          )}
        </FormControl>
      </Paper>
      
      <Box sx={{ mt: 4, p: 3, bgcolor: alpha(primaryColor, 0.05), borderRadius: 2, border: `1px solid ${alpha(primaryColor, 0.1)}` }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          About this service
        </Typography>
        <Typography variant="body2" paragraph>
          Schedule a {serviceData?.serviceName} consultation with our team. We'll discuss your needs, answer your questions, and provide expert guidance on how our {serviceData?.serviceType} services can help your business grow.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon fontSize="small" sx={{ color: primaryColor }} />
          <Typography variant="body2">
            Available Monday-Friday, 9:00 AM - 5:00 PM
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
};

/**
 * Step 2: Date and Time Selection
 */
export const DateTimeStep: React.FC<BookingStepProps> = ({
  formData,
  errors,
  handleSelectChange,
  handleTimeSelect,
  primaryColor,
  availableDates,
  availableTimeSlots
}) => {
  return (
    <motion.div
      key="step2"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeVariants}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: primaryColor }}>
        Select a date and time for your meeting
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <FormControl 
          fullWidth 
          error={!!errors.date}
          sx={{ mb: 3 }}
        >
          <InputLabel id="date-label">Select Date</InputLabel>
          <Select
            labelId="date-label"
            id="date"
            value={formData.date}
            onChange={handleSelectChange('date') as (event: SelectChangeEvent<string>) => void}
            label="Select Date"
            sx={{
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
            }}
          >
            {availableDates.map((dateOption, index) => (
              <MenuItem key={index} value={dateOption.formatted}>
                {dateOption.formatted}
              </MenuItem>
            ))}
          </Select>
          {errors.date && (
            <FormHelperText>{errors.date}</FormHelperText>
          )}
        </FormControl>
      </Box>
      
      {formData.date && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ color: primaryColor }}>
            Available time slots for {formData.date}
          </Typography>
          
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              backgroundColor: alpha(primaryColor, 0.03),
              border: `1px solid ${alpha(primaryColor, 0.1)}`,
              mb: 3
            }}
          >
            <MuiGrid container spacing={2}>
              {availableTimeSlots.map((slot, index) => (
                <Grid xs={6} sm={4} md={3} key={index}>
                  <Button
                    variant={formData.time === slot.time ? 'contained' : 'outlined'}
                    fullWidth
                    onClick={() => handleTimeSelect(slot.time)}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      borderColor: formData.time === slot.time 
                        ? primaryColor 
                        : alpha(primaryColor, 0.3),
                      color: formData.time === slot.time
                        ? 'white'
                        : primaryColor,
                      backgroundColor: formData.time === slot.time
                        ? primaryColor
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: formData.time === slot.time
                          ? alpha(primaryColor, 0.9)
                          : alpha(primaryColor, 0.1),
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <TimeIcon sx={{ mr: 1, fontSize: 16 }} />
                    {slot.label}
                  </Button>
                </Grid>
              ))}
            </MuiGrid>
            {errors.time && (
              <FormHelperText error sx={{ mt: 2 }}>{errors.time}</FormHelperText>
            )}
          </Paper>
        </Box>
      )}
    </motion.div>
  );
};

/**
 * Step 3: Contact Information
 */
export const ContactInfoStep: React.FC<BookingStepProps> = ({
  formData,
  errors,
  handleInputChange,
  primaryColor
}) => {
  return (
    <motion.div
      key="step3"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeVariants}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: primaryColor }}>
        Enter your contact information
      </Typography>
      
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: 2, 
          backgroundColor: alpha(primaryColor, 0.03),
          border: `1px solid ${alpha(primaryColor, 0.1)}`,
          mb: 3
        }}
      >
        <MuiGrid container spacing={3}>
          <Grid xs={12} sm={6}>
            <TextField
              required
              id="name"
              name="name"
              label="Full Name"
              fullWidth
              value={formData.name}
              onChange={handleInputChange('name')}
              error={!!errors.name}
              helperText={errors.name}
              InputProps={{
                startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              required
              id="email"
              name="email"
              label="Email Address"
              fullWidth
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: <EmailIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              id="phone"
              name="phone"
              label="Phone Number"
              fullWidth
              value={formData.phone}
              onChange={handleInputChange('phone')}
              InputProps={{
                startAdornment: <PhoneIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField
              id="company"
              name="company"
              label="Company Name"
              fullWidth
              value={formData.company}
              onChange={handleInputChange('company')}
              InputProps={{
                startAdornment: <BusinessIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
          </Grid>
          <Grid xs={12}>
            <TextField
              id="notes"
              name="notes"
              label="Meeting Notes (Optional)"
              fullWidth
              multiline
              rows={4}
              value={formData.notes}
              onChange={handleInputChange('notes')}
              placeholder="Please share any specific topics you'd like to discuss during our meeting"
              InputProps={{
                startAdornment: <AssignmentIcon sx={{ color: 'action.active', mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
          </Grid>
        </MuiGrid>
      </Paper>
    </motion.div>
  );
};

/**
 * Step 4: Confirmation
 */
export const ConfirmationStep: React.FC<BookingStepProps & { submitStatus: 'idle' | 'success' | 'error', submitMessage: string }> = ({
  formData,
  primaryColor,
  serviceData,
  submitStatus,
  submitMessage
}) => {
  const meetingTypeObj = meetingTypes.find(mt => mt.id === formData.meetingType);
  
  return (
    <motion.div
      key="step4"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeVariants}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: primaryColor }}>
        Review and confirm your booking
      </Typography>
      
      <Paper 
        elevation={0} 
        sx={{ 
          mt: 3, 
          p: 3, 
          borderRadius: 2,
          border: `1px solid ${alpha(primaryColor, 0.2)}`,
          backgroundColor: alpha(primaryColor, 0.02)
        }}
      >
        <MuiGrid container spacing={2}>
          <Grid xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarIcon sx={{ color: primaryColor, mr: 2 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {meetingTypeObj?.name || 'Meeting'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {meetingTypeObj?.duration} minutes, {serviceData?.serviceName}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Date
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {formData.date || 'Not selected'}
            </Typography>
          </Grid>
          
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Time
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {formData.time ? formData.time.replace(':', ':') : 'Not selected'}
            </Typography>
          </Grid>
          
          <Grid xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body1">
              {formData.name}
            </Typography>
          </Grid>
          
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">
              {formData.email}
            </Typography>
          </Grid>
          
          {formData.phone && (
            <Grid xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Phone
              </Typography>
              <Typography variant="body1">
                {formData.phone}
              </Typography>
            </Grid>
          )}
          
          {formData.company && (
            <Grid xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Company
              </Typography>
              <Typography variant="body1">
                {formData.company}
              </Typography>
            </Grid>
          )}
          
          {formData.notes && (
            <Grid xs={12}>
              <Typography variant="body2" color="text.secondary">
                Meeting Notes
              </Typography>
              <Typography variant="body1">
                {formData.notes}
              </Typography>
            </Grid>
          )}
        </MuiGrid>
      </Paper>
      
      <Box sx={{ mt: 4, mb: 2 }}>
        <Alert severity="info">
          You'll receive a confirmation email with the meeting details and a Google Calendar invitation once you confirm your booking.
        </Alert>
      </Box>
      
      {submitStatus === 'error' && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {submitMessage}
        </Alert>
      )}
    </motion.div>
  );
};

/**
 * Success View
 */
export const SuccessView: React.FC<{ submitMessage: string, primaryColor: string }> = ({ 
  submitMessage,
  primaryColor
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: alpha('#4CAF50', 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          mb: 3,
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 40, color: '#4CAF50' }} />
      </Box>
      
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Meeting Scheduled!
      </Typography>
      
      <Typography variant="body1" paragraph>
        {submitMessage}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        A calendar invitation has been sent to your email address.
      </Typography>
    </Box>
  </motion.div>
);
