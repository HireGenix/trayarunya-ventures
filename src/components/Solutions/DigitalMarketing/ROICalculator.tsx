'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  useTheme, 
  alpha,
  Slide,
  SelectChangeEvent,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import CalculateIcon from '@mui/icons-material/Calculate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GroupIcon from '@mui/icons-material/Group';
import BarChartIcon from '@mui/icons-material/BarChart';
import InfoIcon from '@mui/icons-material/Info';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import { TransitionProps } from '@mui/material/transitions';

// Slide transition for dialog
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const ROICalculator = () => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  // State for calculator values
  const [budget, setBudget] = useState<number>(1000); // Adjusted default
  const [conversionRate, setConversionRate] = useState<number>(2); // Adjusted default
  const [customerValue, setCustomerValue] = useState<number>(150); // Adjusted default
  
  // Calculated results
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [roi, setRoi] = useState<number>(0);
  const [cpa, setCpa] = useState<number>(0);
  const [conversions, setConversions] = useState<number>(0);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    industry: '',
    budget: '',
    goals: ''
  });
  
  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

  // Calculate ROI whenever inputs change
  useEffect(() => {
    // Calculate estimated conversions
    const estimatedConversions = Math.round((budget / 100) * conversionRate);
    setConversions(estimatedConversions);
    
    // Calculate monthly revenue
    const estimatedRevenue = estimatedConversions * customerValue;
    setMonthlyRevenue(estimatedRevenue);
    
    // Calculate ROI
    const calculatedRoi = Math.round(((estimatedRevenue - budget) / budget) * 100);
    setRoi(calculatedRoi);
    
    // Calculate CPA (Cost Per Acquisition)
    const calculatedCpa = estimatedConversions > 0 ? budget / estimatedConversions : 0;
    setCpa(calculatedCpa);
  }, [budget, conversionRate, customerValue]);

  // Handle form input changes
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });
  };

  // Handle form submission
  const handleSubmit = () => {
    // Here you would typically send the form data to your backend
    console.log('Form submitted:', formData);
    setOpenDialog(false);
    setSnackbarOpen(true);
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      company: '',
      industry: '',
      budget: '',
      goals: ''
    });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const headerVariants = {
    hidden: { y: -50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const floatVariants = {
    float: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <Box 
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      sx={{ 
        py: { xs: 8, md: 12 }, 
        background: `
          radial-gradient(circle at 20% 80%, ${alpha('#667eea', 0.15)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha('#764ba2', 0.15)} 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, ${alpha('#667eea', 0.1)} 0%, transparent 50%),
          linear-gradient(135deg, ${alpha('#f8fafc', 0.95)} 0%, ${alpha('#f1f5f9', 0.9)} 100%)
        `,
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 50% 50%, ${alpha('#667eea', 0.1)} 0%, transparent 70%),
            linear-gradient(135deg, transparent 0%, ${alpha('#764ba2', 0.05)} 100%)
          `,
          zIndex: 0,
        }
      }}
    >
      {/* Futuristic floating particles */}
      <Box
        component={motion.div}
        animate={{ 
          x: [0, 100, 0],
          y: [0, -50, 0],
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.2, 1]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 20,
          ease: "easeInOut"
        }}
        sx={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `
            conic-gradient(from 0deg at 50% 50%, 
              ${alpha('#667eea', 0.4)} 0deg, 
              ${alpha('#764ba2', 0.4)} 120deg, 
              ${alpha('#667eea', 0.4)} 240deg, 
              ${alpha('#764ba2', 0.4)} 360deg)
          `,
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />
      
      <Box
        component={motion.div}
        animate={{ 
          x: [0, -80, 0],
          y: [0, 60, 0],
          opacity: [0.05, 0.2, 0.05],
          rotate: [0, 180, 360]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 30,
          ease: "easeInOut"
        }}
        sx={{
          position: 'absolute',
          bottom: '20%',
          right: '15%',
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: `
            radial-gradient(circle at 30% 30%, 
              ${alpha('#667eea', 0.3)} 0%, 
              ${alpha('#764ba2', 0.1)} 50%, 
              transparent 100%)
          `,
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />

      {/* Floating geometric glass elements */}
      <Box
        component={motion.div}
        variants={floatVariants}
        animate="float"
        sx={{
          position: 'absolute',
          top: '25%',
          right: '20%',
          width: 80,
          height: 80,
          background: `
            linear-gradient(135deg, 
              ${alpha('#ffffff', 0.1)} 0%, 
              ${alpha('#ffffff', 0.05)} 100%)
          `,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha('#ffffff', 0.1)}`,
          borderRadius: '20px',
          zIndex: 1,
        }}
      />

      <Box
        component={motion.div}
        variants={floatVariants}
        animate="float"
        transition={{ delay: 2 }}
        sx={{
          position: 'absolute',
          bottom: '30%',
          left: '15%',
          width: 60,
          height: 60,
          background: `
            linear-gradient(45deg, 
              ${alpha('#667eea', 0.2)} 0%, 
              ${alpha('#764ba2', 0.1)} 100%)
          `,
          backdropFilter: 'blur(15px)',
          border: `1px solid ${alpha('#667eea', 0.3)}`,
          borderRadius: '50%',
          zIndex: 1,
        }}
      />

      {/* Additional glass orbs */}
      <Box
        component={motion.div}
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 8,
          ease: "easeInOut"
        }}
        sx={{
          position: 'absolute',
          top: '60%',
          right: '10%',
          width: 40,
          height: 40,
          background: `
            radial-gradient(circle at 30% 30%, 
              ${alpha('#ffffff', 0.3)} 0%, 
              ${alpha('#ffffff', 0.1)} 70%, 
              transparent 100%)
          `,
          backdropFilter: 'blur(20px)',
          borderRadius: '50%',
          border: `1px solid ${alpha('#ffffff', 0.2)}`,
          zIndex: 1,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div variants={containerVariants}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div variants={headerVariants}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <motion.div
                  variants={pulseVariants}
                  animate="pulse"
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      boxShadow: `0 8px 32px ${alpha(primaryColor, 0.3)}`,
                    }}
                  >
                    <AutoGraphIcon sx={{ fontSize: 40, color: 'white' }} />
                  </Box>
                </motion.div>
              </Box>
              
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Discover Your Marketing ROI Potential
              </Typography>
            </motion.div>
            <motion.div variants={headerVariants}>
              <Typography
                variant="h6"
                color="textSecondary"
                sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.8, mb: 4 }}
              >
                Transform your marketing investment into measurable growth. Use our intelligent calculator to explore realistic scenarios and discover what's possible for your business.
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<TrendingUpIcon />}
                  label="Real-time Calculations" 
                  sx={{ 
                    backgroundColor: alpha(primaryColor, 0.1),
                    color: primaryColor,
                    fontWeight: 600
                  }} 
                />
                <Chip 
                  icon={<BarChartIcon />}
                  label="Industry Benchmarks" 
                  sx={{ 
                    backgroundColor: alpha(secondaryColor, 0.1),
                    color: secondaryColor,
                    fontWeight: 600
                  }} 
                />
                <Chip 
                  icon={<GroupIcon />}
                  label="Personalized Analysis" 
                  sx={{ 
                    backgroundColor: alpha(primaryColor, 0.1),
                    color: primaryColor,
                    fontWeight: 600
                  }} 
                />
              </Box>
            </motion.div>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 4 }}>
            {/* Calculator Section */}
            <Box sx={{ flex: 1 }}>
              <motion.div variants={cardVariants}>
                <Card
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: '24px',
                    background: `
                      linear-gradient(135deg, 
                        ${alpha('#ffffff', 0.9)} 0%, 
                        ${alpha('#ffffff', 0.85)} 100%)
                    `,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha('#e2e8f0', 0.3)}`,
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `
                      0 20px 60px ${alpha('#000000', 0.1)},
                      inset 0 1px 0 ${alpha('#ffffff', 0.2)}
                    `,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: `linear-gradient(90deg, ${alpha('#667eea', 0.8)}, ${alpha('#764ba2', 0.8)})`,
                      borderRadius: '24px 24px 0 0',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `
                        radial-gradient(circle at 20% 20%, ${alpha('#667eea', 0.05)} 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, ${alpha('#764ba2', 0.03)} 0%, transparent 50%)
                      `,
                      borderRadius: '24px',
                      zIndex: -1,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      <CalculateIcon sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={700} gutterBottom>
                        ROI Calculator
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Adjust the parameters to explore different scenarios
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AttachMoneyIcon sx={{ color: primaryColor, mr: 1 }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Monthly Marketing Budget
                      </Typography>
                      <Tooltip title="Your total monthly marketing spend across all channels">
                        <IconButton size="small" sx={{ ml: 1 }}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(primaryColor, 0.05)}, ${alpha(secondaryColor, 0.03)})`,
                        border: `1px solid ${alpha(primaryColor, 0.1)}`,
                        mb: 2,
                      }}
                    >
                      <Typography variant="h4" fontWeight={700} color={primaryColor} textAlign="center">
                        ${budget.toLocaleString()}
                      </Typography>
                    </Box>
                    
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Typography variant="caption" color="textSecondary">$1K</Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${alpha(primaryColor, 0.2)}, ${alpha(secondaryColor, 0.2)})`,
                          position: 'relative',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${((budget - 1000) / 9000) * 100}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                            boxShadow: `0 2px 8px ${alpha(primaryColor, 0.3)}`,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">$10K</Typography>
                    </Box>
                    <Box
                      component="input"
                      type="range"
                      min="1000"
                      max="10000"
                      step="500"
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      sx={{
                        width: '100%',
                        height: 8,
                        appearance: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        outline: 'none',
                        '&::-webkit-slider-track': {
                          appearance: 'none',
                          height: '8px',
                          borderRadius: '12px',
                          background: `linear-gradient(90deg, ${alpha(primaryColor, 0.15)} 0%, ${alpha(secondaryColor, 0.15)} 100%)`,
                          border: `1px solid ${alpha(primaryColor, 0.1)}`,
                        },
                        '&::-webkit-slider-thumb': {
                          appearance: 'none',
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `
                            radial-gradient(circle at 30% 30%, ${alpha('#ffffff', 0.4)} 0%, transparent 50%),
                            linear-gradient(135deg, ${primaryColor}, ${secondaryColor})
                          `,
                          border: '4px solid #ffffff',
                          boxShadow: `
                            0 6px 20px ${alpha(primaryColor, 0.25)},
                            0 2px 8px ${alpha('#000000', 0.1)},
                            inset 0 1px 2px ${alpha('#ffffff', 0.3)}
                          `,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          position: 'relative',
                        },
                        '&::-webkit-slider-thumb:hover': {
                          transform: 'scale(1.15)',
                          boxShadow: `
                            0 8px 25px ${alpha(primaryColor, 0.35)},
                            0 4px 12px ${alpha('#000000', 0.15)},
                            inset 0 1px 2px ${alpha('#ffffff', 0.4)}
                          `,
                        },
                        '&::-webkit-slider-thumb:active': {
                          transform: 'scale(1.05)',
                          boxShadow: `
                            0 4px 15px ${alpha(primaryColor, 0.4)},
                            0 2px 6px ${alpha('#000000', 0.2)},
                            inset 0 1px 2px ${alpha('#ffffff', 0.5)}
                          `,
                        },
                        // Firefox styles
                        '&::-moz-range-track': {
                          height: '8px',
                          borderRadius: '12px',
                          background: `linear-gradient(90deg, ${alpha(primaryColor, 0.15)} 0%, ${alpha(secondaryColor, 0.15)} 100%)`,
                          border: `1px solid ${alpha(primaryColor, 0.1)}`,
                        },
                        '&::-moz-range-thumb': {
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                          border: '4px solid #ffffff',
                          cursor: 'pointer',
                        },
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <BarChartIcon sx={{ color: secondaryColor, mr: 1 }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Conversion Rate
                      </Typography>
                      <Tooltip title="Percentage of visitors who become customers">
                        <IconButton size="small" sx={{ ml: 1 }}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(secondaryColor, 0.05)}, ${alpha(primaryColor, 0.03)})`,
                        border: `1px solid ${alpha(secondaryColor, 0.1)}`,
                        mb: 2,
                      }}
                    >
                      <Typography variant="h4" fontWeight={700} color={secondaryColor} textAlign="center">
                        {conversionRate}%
                      </Typography>
                    </Box>
                    
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Typography variant="caption" color="textSecondary">1%</Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${alpha(secondaryColor, 0.2)}, ${alpha(primaryColor, 0.2)})`,
                          position: 'relative',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${((conversionRate - 1) / 9) * 100}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
                            boxShadow: `0 2px 8px ${alpha(secondaryColor, 0.3)}`,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">10%</Typography>
                    </Box>
                    <Box
                      component="input"
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={conversionRate}
                      onChange={(e) => setConversionRate(Number(e.target.value))}
                      sx={{
                        width: '100%',
                        height: 8,
                        appearance: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        outline: 'none',
                        '&::-webkit-slider-track': {
                          appearance: 'none',
                          height: '8px',
                          borderRadius: '12px',
                          background: `linear-gradient(90deg, ${alpha(secondaryColor, 0.15)} 0%, ${alpha(primaryColor, 0.15)} 100%)`,
                          border: `1px solid ${alpha(secondaryColor, 0.1)}`,
                        },
                        '&::-webkit-slider-thumb': {
                          appearance: 'none',
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `
                            radial-gradient(circle at 30% 30%, ${alpha('#ffffff', 0.4)} 0%, transparent 50%),
                            linear-gradient(135deg, ${secondaryColor}, ${primaryColor})
                          `,
                          border: '4px solid #ffffff',
                          boxShadow: `
                            0 6px 20px ${alpha(secondaryColor, 0.25)},
                            0 2px 8px ${alpha('#000000', 0.1)},
                            inset 0 1px 2px ${alpha('#ffffff', 0.3)}
                          `,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          position: 'relative',
                        },
                        '&::-webkit-slider-thumb:hover': {
                          transform: 'scale(1.15)',
                          boxShadow: `
                            0 8px 25px ${alpha(secondaryColor, 0.35)},
                            0 4px 12px ${alpha('#000000', 0.15)},
                            inset 0 1px 2px ${alpha('#ffffff', 0.4)}
                          `,
                        },
                        '&::-webkit-slider-thumb:active': {
                          transform: 'scale(1.05)',
                          boxShadow: `
                            0 4px 15px ${alpha(secondaryColor, 0.4)},
                            0 2px 6px ${alpha('#000000', 0.2)},
                            inset 0 1px 2px ${alpha('#ffffff', 0.5)}
                          `,
                        },
                        // Firefox styles
                        '&::-moz-range-track': {
                          height: '8px',
                          borderRadius: '12px',
                          background: `linear-gradient(90deg, ${alpha(secondaryColor, 0.15)} 0%, ${alpha(primaryColor, 0.15)} 100%)`,
                          border: `1px solid ${alpha(secondaryColor, 0.1)}`,
                        },
                        '&::-moz-range-thumb': {
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
                          border: '4px solid #ffffff',
                          cursor: 'pointer',
                        },
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <GroupIcon sx={{ color: primaryColor, mr: 1 }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Average Customer Value
                      </Typography>
                      <Tooltip title="Average revenue generated per customer">
                        <IconButton size="small" sx={{ ml: 1 }}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(primaryColor, 0.05)}, ${alpha(secondaryColor, 0.03)})`,
                        border: `1px solid ${alpha(primaryColor, 0.1)}`,
                        mb: 2,
                      }}
                    >
                      <Typography variant="h4" fontWeight={700} color={primaryColor} textAlign="center">
                        ${customerValue}
                      </Typography>
                    </Box>
                    
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Typography variant="caption" color="textSecondary">$50</Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${alpha(primaryColor, 0.2)}, ${alpha(secondaryColor, 0.2)})`,
                          position: 'relative',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${((customerValue - 50) / 450) * 100}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                            boxShadow: `0 2px 8px ${alpha(primaryColor, 0.3)}`,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">$500</Typography>
                    </Box>
                    <Box
                      component="input"
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={customerValue}
                      onChange={(e) => setCustomerValue(Number(e.target.value))}
                      sx={{
                        width: '100%',
                        height: 8,
                        appearance: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        outline: 'none',
                        '&::-webkit-slider-track': {
                          appearance: 'none',
                          height: '8px',
                          borderRadius: '12px',
                          background: `linear-gradient(90deg, ${alpha(primaryColor, 0.15)} 0%, ${alpha(secondaryColor, 0.15)} 100%)`,
                          border: `1px solid ${alpha(primaryColor, 0.1)}`,
                        },
                        '&::-webkit-slider-thumb': {
                          appearance: 'none',
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `
                            radial-gradient(circle at 30% 30%, ${alpha('#ffffff', 0.4)} 0%, transparent 50%),
                            linear-gradient(135deg, ${primaryColor}, ${secondaryColor})
                          `,
                          border: '4px solid #ffffff',
                          boxShadow: `
                            0 6px 20px ${alpha(primaryColor, 0.25)},
                            0 2px 8px ${alpha('#000000', 0.1)},
                            inset 0 1px 2px ${alpha('#ffffff', 0.3)}
                          `,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          position: 'relative',
                        },
                        '&::-webkit-slider-thumb:hover': {
                          transform: 'scale(1.15)',
                          boxShadow: `
                            0 8px 25px ${alpha(primaryColor, 0.35)},
                            0 4px 12px ${alpha('#000000', 0.15)},
                            inset 0 1px 2px ${alpha('#ffffff', 0.4)}
                          `,
                        },
                        '&::-webkit-slider-thumb:active': {
                          transform: 'scale(1.05)',
                          boxShadow: `
                            0 4px 15px ${alpha(primaryColor, 0.4)},
                            0 2px 6px ${alpha('#000000', 0.2)},
                            inset 0 1px 2px ${alpha('#ffffff', 0.5)}
                          `,
                        },
                        // Firefox styles
                        '&::-moz-range-track': {
                          height: '8px',
                          borderRadius: '12px',
                          background: `linear-gradient(90deg, ${alpha(primaryColor, 0.15)} 0%, ${alpha(secondaryColor, 0.15)} 100%)`,
                          border: `1px solid ${alpha(primaryColor, 0.1)}`,
                        },
                        '&::-moz-range-thumb': {
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                          border: '4px solid #ffffff',
                          cursor: 'pointer',
                        },
                      }}
                    />
                  </Box>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => setOpenDialog(true)}
                      startIcon={<TrendingUpIcon />}
                      sx={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        py: 2,
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        textTransform: 'none',
                        boxShadow: `0 8px 24px ${alpha(primaryColor, 0.3)}`,
                        '&:hover': {
                          boxShadow: `0 12px 32px ${alpha(primaryColor, 0.4)}`,
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Get Personalized ROI Analysis
                    </Button>
                  </motion.div>
                </Card>
              </motion.div>
            </Box>
            
            {/* Results Section */}
            <Box sx={{ flex: 1 }}>
              <motion.div variants={cardVariants}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    borderRadius: '24px',
                    background: `
                      linear-gradient(135deg, 
                        ${alpha('#ffffff', 0.9)} 0%, 
                        ${alpha('#ffffff', 0.85)} 100%)
                    `,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha('#e2e8f0', 0.3)}`,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `
                      0 20px 60px ${alpha('#000000', 0.1)},
                      inset 0 1px 0 ${alpha('#ffffff', 0.2)}
                    `,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: `linear-gradient(90deg, ${alpha('#764ba2', 0.8)}, ${alpha('#667eea', 0.8)})`,
                      borderRadius: '24px 24px 0 0',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `
                        radial-gradient(circle at 20% 20%, ${alpha('#764ba2', 0.05)} 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, ${alpha('#667eea', 0.03)} 0%, transparent 50%)
                      `,
                      borderRadius: '24px',
                      zIndex: -1,
                    }
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <TrendingUpIcon sx={{ color: 'white', fontSize: 24 }} />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                          Your ROI Projection
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Based on your current parameters
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, mb: 4 }}>
                      <Box>
                        <motion.div
                          key={monthlyRevenue}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4 }}
                        >
                          <Card 
                            sx={{ 
                              p: 2, 
                              textAlign: 'center',
                              borderRadius: '16px',
                              background: `
                                linear-gradient(135deg, 
                                  ${alpha('#ffffff', 0.15)} 0%, 
                                  ${alpha('#ffffff', 0.08)} 100%)
                              `,
                              backdropFilter: 'blur(15px)',
                              border: `1px solid ${alpha('#ffffff', 0.2)}`,
                              boxShadow: `
                                0 8px 32px ${alpha('#000000', 0.1)},
                                inset 0 1px 0 ${alpha('#ffffff', 0.3)}
                              `,
                            }}
                          >
                            <Typography variant="caption" color="textSecondary" fontWeight={600}>
                              Monthly Revenue
                            </Typography>
                            <Typography variant="h5" fontWeight={700} color={primaryColor}>
                              ${monthlyRevenue.toLocaleString()}
                            </Typography>
                          </Card>
                        </motion.div>
                      </Box>
                      
                      <Box>
                        <motion.div
                          key={roi}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                        >
                          <Card 
                            sx={{ 
                              p: 2, 
                              textAlign: 'center',
                              borderRadius: '16px',
                              background: `
                                linear-gradient(135deg, 
                                  ${alpha('#ffffff', 0.15)} 0%, 
                                  ${alpha('#ffffff', 0.08)} 100%)
                              `,
                              backdropFilter: 'blur(15px)',
                              border: `1px solid ${alpha('#ffffff', 0.2)}`,
                              boxShadow: `
                                0 8px 32px ${alpha('#000000', 0.1)},
                                inset 0 1px 0 ${alpha('#ffffff', 0.3)}
                              `,
                            }}
                          >
                            <Typography variant="caption" color="textSecondary" fontWeight={600}>
                              ROI
                            </Typography>
                            <Typography 
                              variant="h5" 
                              fontWeight={700} 
                              color={roi > 0 ? secondaryColor : 'error.main'}
                            >
                              {roi}%
                            </Typography>
                          </Card>
                        </motion.div>
                      </Box>
                      
                      <Box>
                        <motion.div
                          key={cpa}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                        >
                          <Card 
                            sx={{ 
                              p: 2, 
                              textAlign: 'center',
                              borderRadius: '16px',
                              background: `
                                linear-gradient(135deg, 
                                  ${alpha('#ffffff', 0.15)} 0%, 
                                  ${alpha('#ffffff', 0.08)} 100%)
                              `,
                              backdropFilter: 'blur(15px)',
                              border: `1px solid ${alpha('#ffffff', 0.2)}`,
                              boxShadow: `
                                0 8px 32px ${alpha('#000000', 0.1)},
                                inset 0 1px 0 ${alpha('#ffffff', 0.3)}
                              `,
                            }}
                          >
                            <Typography variant="caption" color="textSecondary" fontWeight={600}>
                              Cost per Customer
                            </Typography>
                            <Typography variant="h5" fontWeight={700} color={secondaryColor}>
                              ${cpa.toFixed(0)}
                            </Typography>
                          </Card>
                        </motion.div>
                      </Box>
                      
                      <Box>
                        <motion.div
                          key={conversions}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.3 }}
                        >
                          <Card 
                            sx={{ 
                              p: 2, 
                              textAlign: 'center',
                              borderRadius: '16px',
                              background: `
                                linear-gradient(135deg, 
                                  ${alpha('#ffffff', 0.15)} 0%, 
                                  ${alpha('#ffffff', 0.08)} 100%)
                              `,
                              backdropFilter: 'blur(15px)',
                              border: `1px solid ${alpha('#ffffff', 0.2)}`,
                              boxShadow: `
                                0 8px 32px ${alpha('#000000', 0.1)},
                                inset 0 1px 0 ${alpha('#ffffff', 0.3)}
                              `,
                            }}
                          >
                            <Typography variant="caption" color="textSecondary" fontWeight={600}>
                              New Customers
                            </Typography>
                            <Typography variant="h5" fontWeight={700} color={primaryColor}>
                              {conversions}
                            </Typography>
                          </Card>
                        </motion.div>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(primaryColor, 0.08)}, ${alpha(secondaryColor, 0.05)})`,
                        border: `1px solid ${alpha(primaryColor, 0.15)}`,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -20,
                          right: -20,
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${alpha(primaryColor, 0.1)}, ${alpha(secondaryColor, 0.1)})`,
                          filter: 'blur(20px)',
                        }}
                      />
                      
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                            flexShrink: 0,
                          }}
                        >
                          <InfoIcon sx={{ color: 'white', fontSize: 16 }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700} color={primaryColor} gutterBottom>
                            Pro Insight
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.6 }}>
                            These projections are based on industry averages. Our experts can help you achieve even better results through strategic optimization and targeted campaigns.
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
          </Box>
        </motion.div>
      </Container>

      {/* Enhanced ROI Analysis Request Form Dialog */}
      <Dialog
        open={openDialog}
        TransitionComponent={Transition}
        keepMounted
        onClose={() => setOpenDialog(false)}
        aria-describedby="roi-analysis-form-dialog"
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 6,
            boxShadow: `0 20px 60px ${alpha(primaryColor, 0.15)}`,
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          color: '#ffffff',
          py: 3,
          px: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
          }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
              }}
            >
              <TrendingUpIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h5" component="div" fontWeight={700} sx={{ zIndex: 1 }}>
              Get Your Personalized ROI Analysis
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setOpenDialog(false)} 
            sx={{ 
              color: 'rgba(255,255,255,0.8)', 
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 4, mt: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="body1" sx={{ mb: 2, fontSize: '1.1rem', lineHeight: 1.6 }}>
              Ready to unlock your business's true potential? Share a few details and we'll create a comprehensive ROI analysis tailored specifically for your industry and goals.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label="Industry-specific insights" color="primary" variant="outlined" />
              <Chip size="small" label="Competitive analysis" color="secondary" variant="outlined" />
              <Chip size="small" label="Growth opportunities" color="primary" variant="outlined" />
            </Box>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
            <TextField
              name="name"
              label="Full Name"
              value={formData.name}
              onChange={handleFormChange}
              fullWidth
              required
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
            <TextField
              name="email"
              label="Email Address"
              value={formData.email}
              onChange={handleFormChange}
              fullWidth
              required
              variant="outlined"
              type="email"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
            <TextField
              name="company"
              label="Company Name"
              value={formData.company}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
            <FormControl fullWidth>
              <InputLabel id="industry-label">Industry</InputLabel>
              <Select
                labelId="industry-label"
                name="industry"
                value={formData.industry}
                onChange={handleFormChange}
                label="Industry"
                sx={{
                  borderRadius: 2,
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: primaryColor,
                    borderWidth: '2px',
                  },
                }}
              >
                <MenuItem value="ecommerce">E-commerce</MenuItem>
                <MenuItem value="saas">SaaS</MenuItem>
                <MenuItem value="healthcare">Healthcare</MenuItem>
                <MenuItem value="finance">Finance</MenuItem>
                <MenuItem value="education">Education</MenuItem>
                <MenuItem value="retail">Retail</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <TextField
              name="budget"
              label="Monthly Marketing Budget"
              value={formData.budget || budget}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <TextField
              name="goals"
              label="Your Marketing Goals (Optional)"
              value={formData.goals}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              multiline
              rows={4}
              placeholder="e.g., Increase online sales, generate more leads, build brand awareness..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: primaryColor,
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 2, gap: 2 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 3,
              px: 4,
              py: 1.5,
              borderColor: alpha(primaryColor, 0.3),
              color: primaryColor,
              fontWeight: 600,
              '&:hover': {
                borderColor: primaryColor,
                backgroundColor: alpha(primaryColor, 0.05),
              }
            }}
          >
            Maybe Later
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            endIcon={<SendIcon />}
            sx={{ 
              borderRadius: 3,
              px: 4,
              py: 1.5,
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              fontWeight: 700,
              boxShadow: `0 4px 16px ${alpha(primaryColor, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha(primaryColor, 0.4)}`,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Get My Analysis
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={8000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          variant="filled"
          icon={<TrendingUpIcon />}
          sx={{ 
            width: '100%',
            borderRadius: 3,
            boxShadow: `0 8px 24px ${alpha(secondaryColor, 0.3)}`,
            '& .MuiAlert-icon': {
              fontSize: 24,
            }
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Request Submitted Successfully! 🎉
          </Typography>
          <Typography variant="body2">
            Our marketing experts will analyze your business and send you a detailed ROI projection within 24 hours.
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ROICalculator;
