'use client';

import React, { useState, useEffect } from 'react';
import { generateICP } from '@/services/azureOpenAI';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button,
  TextField,
  Chip,
  alpha,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Slider,
  FormControlLabel,
  Checkbox,
  useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const ICPGenerator = () => {
  const primaryColor = '#8E44AD';
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState<number[]>([50, 500]);
  const [budget, setBudget] = useState<number[]>([5000, 20000]);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [icpData, setIcpData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIndustryChange = (event: SelectChangeEvent) => {
    setIndustry(event.target.value as string);
  };

  const handleCompanySizeChange = (event: Event, newValue: number | number[]) => {
    setCompanySize(newValue as number[]);
  };

  const handleBudgetChange = (event: Event, newValue: number | number[]) => {
    setBudget(newValue as number[]);
  };

  const handleChallengeChange = (challenge: string) => {
    setChallenges(prev => 
      prev.includes(challenge) 
        ? prev.filter(c => c !== challenge) 
        : [...prev, challenge]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare the parameters for the API call
      const params = {
        industry: industry,
        companySize: `${companySize[0]}-${companySize[1]} employees`,
        targetMarket: 'Global', // Default value
        productType: 'Digital Marketing Services', // Default value
        businessGoals: challenges.join(', '),
        competitorInfo: `Budget range: $${budget[0]}-$${budget[1]} per month`, // Using budget as competitor info
      };
      
      // Call the Azure OpenAI service
      const result = await generateICP(params);
      setIcpData(result);
      setShowResults(true);
    } catch (err) {
      console.error('Error generating ICP:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIndustry('');
    setCompanySize([50, 500]);
    setBudget([5000, 20000]);
    setChallenges([]);
    setShowResults(false);
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

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const challengeOptions = [
    'Increasing website traffic',
    'Generating quality leads',
    'Improving conversion rates',
    'Building brand awareness',
    'Reducing customer acquisition cost',
    'Expanding to new markets',
    'Retaining existing customers',
    'Measuring marketing ROI'
  ];

  return (
    <Box 
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
      sx={{ 
        py: { xs: 8, md: 12 },
        backgroundColor: alpha(primaryColor, 0.02),
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Elements */}
      <Box
        component={motion.div}
        animate={{ 
          rotate: [0, 360],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 120,
          ease: "linear"
        }}
        sx={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          border: `2px dashed ${alpha(primaryColor, 0.1)}`,
          zIndex: 0,
        }}
      />
      
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <motion.div variants={itemVariants}>
            <Chip
              icon={<PersonIcon />}
              label="IDEAL CUSTOMER PROFILE"
              sx={{
                mb: 3,
                py: 1.5,
                px: 2,
                borderRadius: '50px',
                background: `linear-gradient(90deg, ${primaryColor}, #6C3483)`,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.75rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                '& .MuiChip-icon': {
                  color: 'white'
                }
              }}
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontWeight: 700,
                mb: 2,
                background: `linear-gradient(90deg, ${primaryColor} 0%, #333333 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Know Your Ideal Customer
            </Typography>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Typography
              variant="h6"
              color="textSecondary"
              sx={{ 
                maxWidth: 800, 
                mx: 'auto', 
                mb: 6,
                fontSize: '1.1rem',
                lineHeight: 1.6
              }}
            >
              Define your ideal customer profile to create more targeted and effective marketing campaigns. 
              Our ICP generator will help you identify the characteristics of your most valuable customers.
            </Typography>
          </motion.div>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: -3 }}>
          <Box sx={{ width: { xs: '100%', md: '50%' }, padding: 3 }}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  border: `1px solid ${alpha(primaryColor, 0.1)}`,
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Animated gradient background */}
                <Box
                  component={motion.div}
                  variants={pulseVariants}
                  animate="animate"
                  sx={{
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(primaryColor, 0.1)} 0%, rgba(255, 255, 255, 0) 70%)`,
                    filter: 'blur(40px)',
                    zIndex: 0,
                  }}
                />
                
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography variant="h5" component="h3" fontWeight={700} gutterBottom>
                    ICP Generator
                  </Typography>
                  <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                    Fill out the form below to generate your ideal customer profile. The more specific you are, the more targeted your marketing efforts can be.
                  </Typography>
                  
                  <Box component="form" onSubmit={handleSubmit}>
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel id="industry-label">Industry</InputLabel>
                      <Select
                        labelId="industry-label"
                        value={industry}
                        label="Industry"
                        onChange={handleIndustryChange}
                        required
                      >
                        <MenuItem value="technology">Technology</MenuItem>
                        <MenuItem value="healthcare">Healthcare</MenuItem>
                        <MenuItem value="finance">Finance</MenuItem>
                        <MenuItem value="education">Education</MenuItem>
                        <MenuItem value="retail">Retail</MenuItem>
                        <MenuItem value="manufacturing">Manufacturing</MenuItem>
                        <MenuItem value="hospitality">Hospitality</MenuItem>
                        <MenuItem value="real-estate">Real Estate</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Company Size (Employees)
                      </Typography>
                      <Slider
                        value={companySize}
                        onChange={handleCompanySizeChange}
                        valueLabelDisplay="auto"
                        min={1}
                        max={1000}
                        sx={{
                          color: primaryColor,
                          '& .MuiSlider-thumb': {
                            '&:hover, &.Mui-focusVisible': {
                              boxShadow: `0px 0px 0px 8px ${alpha(primaryColor, 0.16)}`,
                            },
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="textSecondary">
                          {companySize[0]} employees
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {companySize[1]} employees
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Monthly Marketing Budget ($)
                      </Typography>
                      <Slider
                        value={budget}
                        onChange={handleBudgetChange}
                        valueLabelDisplay="auto"
                        min={1000}
                        max={50000}
                        step={1000}
                        sx={{
                          color: primaryColor,
                          '& .MuiSlider-thumb': {
                            '&:hover, &.Mui-focusVisible': {
                              boxShadow: `0px 0px 0px 8px ${alpha(primaryColor, 0.16)}`,
                            },
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="textSecondary">
                          ${budget[0].toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ${budget[1].toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Key Challenges (Select all that apply)
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {challengeOptions.map((challenge) => (
                          <Chip
                            key={challenge}
                            label={challenge}
                            onClick={() => handleChallengeChange(challenge)}
                            sx={{
                              backgroundColor: challenges.includes(challenge) 
                                ? alpha(primaryColor, 0.1) 
                                : 'transparent',
                              color: challenges.includes(challenge) 
                                ? primaryColor 
                                : 'text.secondary',
                              border: `1px solid ${challenges.includes(challenge) 
                                ? primaryColor 
                                : alpha('#000', 0.1)}`,
                              fontWeight: challenges.includes(challenge) ? 600 : 400,
                              '&:hover': {
                                backgroundColor: alpha(primaryColor, 0.05),
                              },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                    
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        mt: 2,
                        backgroundColor: primaryColor,
                        py: 1.2,
                        px: 3,
                        borderRadius: '50px',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: alpha(primaryColor, 0.9),
                          transform: 'translateY(-3px)',
                          boxShadow: `0 8px 20px ${alpha(primaryColor, 0.3)}`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Generate ICP
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </motion.div>
          </Box>
          
          <Box sx={{ width: { xs: '100%', md: '50%' }, padding: 3 }}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  border: `1px solid ${alpha(primaryColor, 0.1)}`,
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: showResults ? 'flex-start' : 'center',
                }}
              >
                {isLoading ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Box
                      component={motion.div}
                      animate={{ 
                        rotate: [0, 360],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5,
                        ease: "linear"
                      }}
                      sx={{ mb: 3, display: 'inline-block' }}
                    >
                      <Box
                        sx={{
                          width: 50,
                          height: 50,
                          borderRadius: '50%',
                          border: `3px solid ${alpha(primaryColor, 0.1)}`,
                          borderTopColor: primaryColor,
                        }}
                      />
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Generating Your ICP...
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Our AI is analyzing your inputs to create a detailed customer profile.
                    </Typography>
                  </Box>
                ) : error ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="error" fontWeight={600} gutterBottom>
                      Error Generating ICP
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                      {error}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setError(null);
                        setShowResults(false);
                      }}
                      sx={{
                        color: primaryColor,
                        borderColor: primaryColor,
                        '&:hover': {
                          borderColor: primaryColor,
                          backgroundColor: alpha(primaryColor, 0.05),
                        },
                      }}
                    >
                      Try Again
                    </Button>
                  </Box>
                ) : !showResults ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      component={motion.div}
                      animate={{ 
                        y: [0, -10, 0],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 3,
                        ease: "easeInOut"
                      }}
                      sx={{ mb: 3 }}
                    >
                      <PersonIcon sx={{ fontSize: 80, color: alpha(primaryColor, 0.2) }} />
                    </Box>
                    <Typography variant="h5" component="h3" fontWeight={700} gutterBottom>
                      Your ICP Results Will Appear Here
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                      Fill out the form on the left and click "Generate ICP" to see your ideal customer profile.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h5" component="h3" fontWeight={700}>
                        Your Ideal Customer Profile
                      </Typography>
                      <Button
                        size="small"
                        onClick={resetForm}
                        sx={{
                          color: primaryColor,
                          '&:hover': {
                            backgroundColor: alpha(primaryColor, 0.05),
                          },
                        }}
                      >
                        Reset
                      </Button>
                    </Box>
                    
                    <Divider sx={{ mb: 3 }} />
                    
                    <Box sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <BusinessIcon sx={{ color: primaryColor, mr: 1.5 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Demographic Profile
                        </Typography>
                      </Box>
                      
                      <Box sx={{ pl: 4 }}>
                        {icpData && icpData.demographic && Object.entries(icpData.demographic).map(([key, value]) => (
                          <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="textSecondary">
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}:
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {value as string}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PeopleIcon sx={{ color: primaryColor, mr: 1.5 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Psychographic Profile
                        </Typography>
                      </Box>
                      
                      <Box sx={{ pl: 4 }}>
                        {icpData && icpData.psychographic && Object.entries(icpData.psychographic).map(([key, values]) => (
                          <Box key={key} sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {Array.isArray(values) && values.map((value, idx) => (
                                <Chip 
                                  key={idx} 
                                  label={value} 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: alpha(primaryColor, 0.1),
                                    color: primaryColor,
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <BarChartIcon sx={{ color: primaryColor, mr: 1.5 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Behavioral Profile
                        </Typography>
                      </Box>
                      
                      <Box sx={{ pl: 4 }}>
                        {icpData && icpData.behavioral && Object.entries(icpData.behavioral).map(([key, value]) => (
                          <Box key={key} sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}:
                            </Typography>
                            {Array.isArray(value) ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {value.map((item, idx) => (
                                  <Chip 
                                    key={idx} 
                                    label={item} 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: alpha(primaryColor, 0.1),
                                      color: primaryColor,
                                    }}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2">{value as string}</Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <AttachMoneyIcon sx={{ color: primaryColor, mr: 1.5 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Technographic Profile
                        </Typography>
                      </Box>
                      
                      <Box sx={{ pl: 4 }}>
                        {icpData && icpData.technographic && Object.entries(icpData.technographic).map(([key, value]) => (
                          <Box key={key} sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}:
                            </Typography>
                            {Array.isArray(value) ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {value.map((item, idx) => (
                                  <Chip 
                                    key={idx} 
                                    label={item} 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: alpha(primaryColor, 0.1),
                                      color: primaryColor,
                                    }}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2">{value as string}</Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                      <Button
                        variant="contained"
                        size="large"
                        component="a"
                        href="/contact"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          backgroundColor: primaryColor,
                          py: 1.2,
                          px: 3,
                          borderRadius: '50px',
                          fontWeight: 600,
                          '&:hover': {
                            backgroundColor: alpha(primaryColor, 0.9),
                            transform: 'translateY(-3px)',
                            boxShadow: `0 8px 20px ${alpha(primaryColor, 0.3)}`,
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Get a Custom Marketing Plan
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            </motion.div>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default ICPGenerator;
