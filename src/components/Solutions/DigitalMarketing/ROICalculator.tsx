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
  SelectChangeEvent
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import CalculateIcon from '@mui/icons-material/Calculate';
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
  const primaryColor = '#8E44AD';

  // State for calculator values
  const [budget, setBudget] = useState<number>(5000);
  const [conversionRate, setConversionRate] = useState<number>(3);
  const [customerValue, setCustomerValue] = useState<number>(200);
  
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

  return (
    <Box 
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      sx={{ 
        py: { xs: 8, md: 12 }, 
        backgroundColor: alpha(primaryColor, 0.03),
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background elements */}
      <Box
        component={motion.div}
        animate={{ 
          x: [0, 30, 0],
          y: [0, -20, 0],
          opacity: [0.05, 0.08, 0.05]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 15,
          ease: "easeInOut"
        }}
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />
      
      <Box
        component={motion.div}
        animate={{ 
          x: [0, -20, 0],
          y: [0, 30, 0],
          opacity: [0.03, 0.06, 0.03]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 18,
          ease: "easeInOut"
        }}
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '5%',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div variants={containerVariants}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div variants={headerVariants}>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                }}
              >
                Calculate Your Marketing ROI
              </Typography>
            </motion.div>
            <motion.div variants={headerVariants}>
              <Typography
                variant="h6"
                color="textSecondary"
                sx={{ maxWidth: 800, mx: 'auto' }}
              >
                Use our interactive calculator to estimate the potential return on investment for your digital marketing campaigns
              </Typography>
            </motion.div>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 6 }}>
            <Box sx={{ width: { xs: '100%', md: '50%' } }}>
              <motion.div variants={cardVariants}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    height: '100%',
                  }}
                >
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    ROI Calculator
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
                    Adjust the parameters below to estimate your marketing ROI.
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Monthly Marketing Budget: ${budget.toLocaleString()}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" color="textSecondary">$1,000</Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: `linear-gradient(to right, ${primaryColor}, ${alpha(primaryColor, 0.3)})`,
                        }}
                      />
                      <Typography variant="body2" color="textSecondary">$10,000</Typography>
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
                        '&::-webkit-slider-thumb': {
                          appearance: 'none',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: primaryColor,
                          border: '2px solid #ffffff',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        },
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Average Conversion Rate: {conversionRate}%
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" color="textSecondary">1%</Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: `linear-gradient(to right, ${primaryColor}, ${alpha(primaryColor, 0.3)})`,
                        }}
                      />
                      <Typography variant="body2" color="textSecondary">10%</Typography>
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
                        '&::-webkit-slider-thumb': {
                          appearance: 'none',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: primaryColor,
                          border: '2px solid #ffffff',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        },
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Average Customer Value: ${customerValue}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" color="textSecondary">$50</Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: `linear-gradient(to right, ${primaryColor}, ${alpha(primaryColor, 0.3)})`,
                        }}
                      />
                      <Typography variant="body2" color="textSecondary">$500</Typography>
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
                        '&::-webkit-slider-thumb': {
                          appearance: 'none',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: primaryColor,
                          border: '2px solid #ffffff',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        },
                      }}
                    />
                  </Box>
                  
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => setOpenDialog(true)}
                      startIcon={<CalculateIcon />}
                      sx={{
                        backgroundColor: primaryColor,
                        py: 1.5,
                        borderRadius: '50px',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: alpha(primaryColor, 0.9),
                          transform: 'translateY(-3px)',
                          boxShadow: `0 8px 20px ${alpha(primaryColor, 0.4)}`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Get Detailed ROI Analysis
                    </Button>
                  </motion.div>
                </Paper>
              </motion.div>
            </Box>
            
            <Box sx={{ width: { xs: '100%', md: '50%' } }}>
              <motion.div variants={cardVariants}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    borderRadius: 4,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Estimated Results
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
                    Based on your inputs, here's what you can expect:
                  </Typography>
                  
                  <Box sx={{ mb: 4, flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, pb: 2, borderBottom: '1px dashed rgba(0, 0, 0, 0.1)' }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Monthly Revenue:
                      </Typography>
                      <motion.div
                        key={monthlyRevenue}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Typography variant="subtitle1" fontWeight={600}>
                          ${monthlyRevenue.toLocaleString()}
                        </Typography>
                      </motion.div>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, pb: 2, borderBottom: '1px dashed rgba(0, 0, 0, 0.1)' }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        ROI:
                      </Typography>
                      <motion.div
                        key={roi}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Typography variant="subtitle1" fontWeight={600} color={roi > 0 ? primaryColor : 'error.main'}>
                          {roi}%
                        </Typography>
                      </motion.div>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, pb: 2, borderBottom: '1px dashed rgba(0, 0, 0, 0.1)' }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Cost per Acquisition:
                      </Typography>
                      <motion.div
                        key={cpa}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Typography variant="subtitle1" fontWeight={600}>
                          ${cpa.toFixed(2)}
                        </Typography>
                      </motion.div>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Estimated Conversions:
                      </Typography>
                      <motion.div
                        key={conversions}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Typography variant="subtitle1" fontWeight={600}>
                          {conversions}
                        </Typography>
                      </motion.div>
                    </Box>
                  </Box>
                  
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      backgroundColor: alpha(primaryColor, 0.05),
                      border: `1px solid ${alpha(primaryColor, 0.2)}`,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Pro Tip:
                    </Typography>
                    <Typography variant="body2">
                      Increasing your conversion rate by just 1% can significantly boost your ROI. Our digital marketing strategies focus on optimizing conversion rates through data-driven insights and continuous testing.
                    </Typography>
                  </Box>
                </Paper>
              </motion.div>
            </Box>
          </Box>
        </motion.div>
      </Container>

      {/* ROI Analysis Request Form Dialog */}
      <Dialog
        open={openDialog}
        TransitionComponent={Transition}
        keepMounted
        onClose={() => setOpenDialog(false)}
        aria-describedby="roi-analysis-form-dialog"
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: primaryColor, 
          color: '#ffffff',
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h5" component="div" fontWeight={600}>
            Request Detailed ROI Analysis
          </Typography>
          <Button 
            onClick={() => setOpenDialog(false)} 
            sx={{ color: '#ffffff', minWidth: 'auto', p: 1 }}
          >
            <CloseIcon />
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: 4, mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Fill out the form below to receive a personalized ROI analysis for your digital marketing campaigns.
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
            <Box>
              <TextField
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleFormChange}
                fullWidth
                required
                variant="outlined"
                margin="normal"
              />
            </Box>
            <Box>
              <TextField
                name="email"
                label="Email Address"
                value={formData.email}
                onChange={handleFormChange}
                fullWidth
                required
                variant="outlined"
                margin="normal"
                type="email"
              />
            </Box>
            <Box>
              <TextField
                name="company"
                label="Company Name"
                value={formData.company}
                onChange={handleFormChange}
                fullWidth
                variant="outlined"
                margin="normal"
              />
            </Box>
            <Box>
              <FormControl fullWidth margin="normal">
                <InputLabel id="industry-label">Industry</InputLabel>
                <Select
                  labelId="industry-label"
                  name="industry"
                  value={formData.industry}
                  onChange={handleFormChange}
                  label="Industry"
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
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <TextField
              name="budget"
              label="Monthly Marketing Budget"
              value={formData.budget || budget}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              margin="normal"
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <TextField
              name="goals"
              label="Marketing Goals"
              value={formData.goals}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              margin="normal"
              multiline
              rows={4}
              placeholder="Describe your marketing goals and challenges..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 50,
              px: 3,
              borderColor: alpha(primaryColor, 0.5),
              color: primaryColor
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            endIcon={<SendIcon />}
            sx={{ 
              borderRadius: 50,
              px: 3,
              backgroundColor: primaryColor,
              '&:hover': {
                backgroundColor: alpha(primaryColor, 0.9),
              }
            }}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          Your ROI analysis request has been submitted successfully! We'll contact you shortly.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ROICalculator;
