'use client';

import React, { useState } from 'react';
import { generateICP } from '@/services/azureOpenAI';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button,
  Chip,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  stepConnectorClasses,
  styled,
  Fade,
  CircularProgress,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  TextField,
  Avatar,
  Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TargetIcon from '@mui/icons-material/GpsFixed';
import InsightsIcon from '@mui/icons-material/Insights';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShareIcon from '@mui/icons-material/Share';
import GroupIcon from '@mui/icons-material/Group';
import WorkIcon from '@mui/icons-material/Work';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PublicIcon from '@mui/icons-material/Public';
import PsychologyIcon from '@mui/icons-material/Psychology';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import DiamondIcon from '@mui/icons-material/Diamond';

// Custom styled stepper connector
const CustomStepConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: `linear-gradient(90deg, #8E44AD, #6C3483)`,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: `linear-gradient(90deg, #8E44AD, #6C3483)`,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: alpha('#8E44AD', 0.2),
    borderRadius: 1,
  },
}));

// Custom step icon component
const CustomStepIcon = styled('div')<{ ownerState: { completed?: boolean; active?: boolean } }>(
  ({ theme, ownerState }) => ({
    backgroundColor: ownerState.completed || ownerState.active ? '#8E44AD' : alpha('#8E44AD', 0.2),
    zIndex: 1,
    color: '#fff',
    width: 50,
    height: 50,
    display: 'flex',
    borderRadius: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.2rem',
    fontWeight: 700,
    transition: 'all 0.3s ease',
    boxShadow: ownerState.completed || ownerState.active ? '0 4px 12px rgba(142, 68, 173, 0.3)' : 'none',
  }),
);

const industries = [
  { value: 'technology', label: 'Technology', icon: '💻', color: '#2196F3' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥', color: '#4CAF50' },
  { value: 'finance', label: 'Finance', icon: '🏦', color: '#FF9800' },
  { value: 'education', label: 'Education', icon: '🎓', color: '#9C27B0' },
  { value: 'retail', label: 'Retail', icon: '🛍️', color: '#F44336' },
  { value: 'manufacturing', label: 'Manufacturing', icon: '🏭', color: '#607D8B' },
  { value: 'hospitality', label: 'Hospitality', icon: '🏨', color: '#FF5722' },
  { value: 'real-estate', label: 'Real Estate', icon: '🏠', color: '#795548' },
];

const companySizeRanges = [
  { label: 'Startup (1-10)', value: [1, 10], color: '#4CAF50' },
  { label: 'Small (11-50)', value: [11, 50], color: '#2196F3' },
  { label: 'Medium (51-200)', value: [51, 200], color: '#FF9800' },
  { label: 'Large (201-1000)', value: [201, 1000], color: '#9C27B0' },
  { label: 'Enterprise (1000+)', value: [1000, 5000], color: '#F44336' },
];

const budgetRanges = [
  { label: 'Starter ($1K-5K)', value: [1000, 5000], color: '#4CAF50' },
  { label: 'Growth ($5K-15K)', value: [5000, 15000], color: '#2196F3' },
  { label: 'Scale ($15K-50K)', value: [15000, 50000], color: '#FF9800' },
  { label: 'Enterprise ($50K+)', value: [50000, 100000], color: '#9C27B0' },
];

const ICPGenerator = () => {
  const primaryColor = '#8E44AD';
  const [activeStep, setActiveStep] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [productServiceDetails, setProductServiceDetails] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState<number[]>([50, 500]);
  const [budget, setBudget] = useState<number[]>([5000, 20000]);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [geography, setGeography] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [icpData, setIcpData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { label: 'Your Business', icon: <BusinessIcon /> },
    { label: 'Industry & Scale', icon: <WorkIcon /> },
    { label: 'Budget & Goals', icon: <AttachMoneyIcon /> },
    { label: 'Ideal Customer', icon: <TargetIcon /> },
    { label: 'Your ICP Insights', icon: <InsightsIcon /> },
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleIndustrySelect = (selectedIndustry: string) => {
    setIndustry(selectedIndustry);
  };

  const handleCompanySizeSelect = (size: number[]) => {
    setCompanySize(size);
  };

  const handleBudgetSelect = (budgetRange: number[]) => {
    setBudget(budgetRange);
  };

  const handleChallengeChange = (challenge: string) => {
    setChallenges(prev => 
      prev.includes(challenge) 
        ? prev.filter(c => c !== challenge) 
        : [...prev, challenge]
    );
  };

  const handlePainPointChange = (painPoint: string) => {
    setPainPoints(prev => 
      prev.includes(painPoint) 
        ? prev.filter(p => p !== painPoint) 
        : [...prev, painPoint]
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = {
        businessName: businessName || 'Not specified',
        businessDescription: businessDescription || 'Not specified',
        productServiceDetails: productServiceDetails || 'Digital Marketing Services',
        industry: industry,
        companySize: `${companySize[0]}-${companySize[1]} employees`,
        targetMarket: geography || 'Global',
        productType: 'Digital Marketing Services',
        businessGoals: challenges.join(', '),
        competitorInfo: `Budget range: $${budget[0]}-$${budget[1]} per month`,
        targetRole: targetRole,
        businessModel: businessModel,
        painPoints: painPoints.join(', ')
      };
      
      const result = await generateICP(params);
      setIcpData(result);
      setActiveStep(4); // Move to results step
    } catch (err) {
      console.error('Error generating ICP:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setActiveStep(0);
    setBusinessName('');
    setBusinessDescription('');
    setProductServiceDetails('');
    setIndustry('');
    setCompanySize([50, 500]);
    setBudget([5000, 20000]);
    setChallenges([]);
    setGeography('');
    setBusinessModel('');
    setTargetRole('');
    setPainPoints([]);
    setIcpData(null);
    setError(null);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return true; // Business info is optional
      case 1:
        return industry !== '';
      case 2:
        return challenges.length > 0;
      case 3:
        return targetRole !== '' && businessModel !== '';
      default:
        return true;
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Fade in timeout={500}>
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: primaryColor }}>
                Let's Start with Your Business Basics
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                Sharing a bit about your business helps our AI craft a more relevant Ideal Customer Profile for you.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <TextField
                    fullWidth
                    label="Business Name (Optional)"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Innovatech Solutions"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: primaryColor,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                          color: primaryColor,
                        },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="What does your business do? (Optional)"
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder="Briefly, what's your mission and what unique value do you offer?"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: primaryColor,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                          color: primaryColor,
                        },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Tell us about your products/services (Optional)"
                    value={productServiceDetails}
                    onChange={(e) => setProductServiceDetails(e.target.value)}
                    placeholder="What are your main offerings? Any key features or pricing info?"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: primaryColor,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                          color: primaryColor,
                        },
                      },
                    }}
                  />
                </Box>
              </Box>

              <Box sx={{ mt: 4, p: 3, backgroundColor: alpha(primaryColor, 0.05), borderRadius: 2 }}>
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
                  💡 <strong>Friendly Tip:</strong> The more context you give us, the sharper your ICP will be. 
                  These details are optional, but they really help!
                </Typography>
              </Box>
            </Box>
          </Fade>
        );

      case 1:
        return (
          <Fade in timeout={500}>
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: primaryColor }}>
                Your Industry & Company Scale
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                Understanding your industry and size helps us tailor the ICP to your specific market.
              </Typography>

              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Which industry best describes your business?
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                  gap: 2,
                  mt: 1 
                }}>
                  {industries.map((ind) => (
                    <Card
                      key={ind.value}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: industry === ind.value ? `2px solid ${ind.color}` : '1px solid rgba(0,0,0,0.1)',
                        backgroundColor: industry === ind.value ? alpha(ind.color, 0.05) : 'white',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 12px ${alpha(ind.color, 0.2)}`,
                        }
                      }}
                      onClick={() => handleIndustrySelect(ind.value)}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" sx={{ mb: 1 }}>{ind.icon}</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ color: ind.color }}>
                          {ind.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  How large is your company?
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 2,
                  mt: 1 
                }}>
                  {companySizeRanges.map((size, index) => (
                    <Card
                      key={index}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: companySize[0] === size.value[0] && companySize[1] === size.value[1] 
                          ? `2px solid ${size.color}` : '1px solid rgba(0,0,0,0.1)',
                        backgroundColor: companySize[0] === size.value[0] && companySize[1] === size.value[1] 
                          ? alpha(size.color, 0.05) : 'white',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 12px ${alpha(size.color, 0.2)}`,
                        }
                      }}
                      onClick={() => handleCompanySizeSelect(size.value)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <GroupIcon sx={{ color: size.color, mr: 2 }} />
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {size.label}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {size.value[0]}-{size.value[1] === 5000 ? '1000+' : size.value[1]} employees
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            </Box>
          </Fade>
        );

      case 2:
        return (
          <Fade in timeout={500}>
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: primaryColor }}>
                Your Budget & Marketing Aspirations
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                Let's talk about your typical marketing spend and what you're aiming to achieve.
              </Typography>

              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  What's your typical monthly marketing budget?
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 2,
                  mt: 1 
                }}>
                  {budgetRanges.map((budgetRange, index) => (
                    <Card
                      key={index}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: budget[0] === budgetRange.value[0] && budget[1] === budgetRange.value[1] 
                          ? `2px solid ${budgetRange.color}` : '1px solid rgba(0,0,0,0.1)',
                        backgroundColor: budget[0] === budgetRange.value[0] && budget[1] === budgetRange.value[1] 
                          ? alpha(budgetRange.color, 0.05) : 'white',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 12px ${alpha(budgetRange.color, 0.2)}`,
                        }
                      }}
                      onClick={() => handleBudgetSelect(budgetRange.value)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AttachMoneyIcon sx={{ color: budgetRange.color, mr: 2 }} />
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {budgetRange.label}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ${budgetRange.value[0].toLocaleString()}-${budgetRange.value[1].toLocaleString()} per month
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  What are your key marketing goals or challenges right now? (Select a few)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
                  {[
                    'Boost website traffic',
                    'Get more quality leads',
                    'Increase conversion rates',
                    'Build stronger brand awareness',
                    'Lower cost per new customer',
                    'Enter new markets',
                    'Improve customer loyalty',
                    'Better understand marketing ROI',
                    'Grow social media presence',
                    'Create impactful content',
                    'Improve email campaigns',
                    'Optimize paid ads'
                  ].map((challenge) => (
                    <Chip
                      key={challenge}
                      label={challenge}
                      onClick={() => handleChallengeChange(challenge)}
                      sx={{
                        py: 2,
                        px: 1,
                        backgroundColor: challenges.includes(challenge) 
                          ? alpha(primaryColor, 0.15) 
                          : 'transparent',
                        color: challenges.includes(challenge) 
                          ? primaryColor 
                          : 'text.secondary',
                        border: `1px solid ${challenges.includes(challenge) 
                          ? primaryColor 
                          : alpha('#000', 0.2)}`,
                        fontWeight: challenges.includes(challenge) ? 600 : 400,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: alpha(primaryColor, 0.1),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 2px 8px ${alpha(primaryColor, 0.2)}`,
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Fade>
        );

      case 3:
        return (
          <Fade in timeout={500}>
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: primaryColor }}>
                Who Are You Trying to Reach?
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                Let's paint a picture of your ideal customer.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 3 
                }}>
                  <FormControl fullWidth>
                    <InputLabel>Their Role or Title (e.g., Marketing Manager)</InputLabel>
                    <Select
                      value={targetRole}
                      label="Their Role or Title (e.g., Marketing Manager)"
                      onChange={(e) => setTargetRole(e.target.value)}
                      sx={{
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: primaryColor,
                        },
                      }}
                    >
                      <MenuItem value="ceo">CEO/Founder</MenuItem>
                      <MenuItem value="cmo">CMO/Marketing Director</MenuItem>
                      <MenuItem value="marketing-manager">Marketing Manager</MenuItem>
                      <MenuItem value="digital-marketing-manager">Digital Marketing Manager</MenuItem>
                      <MenuItem value="business-owner">Business Owner</MenuItem>
                      <MenuItem value="marketing-coordinator">Marketing Coordinator</MenuItem>
                      <MenuItem value="growth-manager">Growth Manager</MenuItem>
                      <MenuItem value="other-decision-maker">Other Decision Maker</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Your Business Model (e.g., B2B, B2C)</InputLabel>
                    <Select
                      value={businessModel}
                      label="Your Business Model (e.g., B2B, B2C)"
                      onChange={(e) => setBusinessModel(e.target.value)}
                      sx={{
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: primaryColor,
                        },
                      }}
                    >
                      <MenuItem value="b2b">B2B (Business to Business)</MenuItem>
                      <MenuItem value="b2c">B2C (Business to Consumer)</MenuItem>
                      <MenuItem value="b2b2c">B2B2C (Business to Business to Consumer)</MenuItem>
                      <MenuItem value="marketplace">Marketplace</MenuItem>
                      <MenuItem value="saas">SaaS (Software as a Service)</MenuItem>
                      <MenuItem value="ecommerce">E-commerce</MenuItem>
                      <MenuItem value="subscription">Subscription-based</MenuItem>
                      <MenuItem value="service-based">Service-based</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Primary Geographic Focus</InputLabel>
                    <Select
                      value={geography}
                      label="Primary Geographic Focus"
                      onChange={(e) => setGeography(e.target.value)}
                      sx={{
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: primaryColor,
                        },
                      }}
                    >
                      <MenuItem value="local">Local (City/Region)</MenuItem>
                      <MenuItem value="national">National</MenuItem>
                      <MenuItem value="international">International</MenuItem>
                      <MenuItem value="global">Global</MenuItem>
                      <MenuItem value="north-america">North America</MenuItem>
                      <MenuItem value="europe">Europe</MenuItem>
                      <MenuItem value="asia-pacific">Asia Pacific</MenuItem>
                      <MenuItem value="india">India</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    What keeps them up at night? (Their main pain points - select a few)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
                    {[
                      'Struggling with outdated systems',
                      'Not enough qualified leads',
                      'Wasting money on ineffective ads',
                      'Can\'t measure marketing impact',
                      'Falling behind competitors',
                      'Not enough time for marketing',
                      'Difficulty finding reliable partners',
                      'Overwhelmed by digital options',
                      'Brand isn\'t well-known',
                      'Losing customers to rivals'
                    ].map((painPoint) => (
                      <Chip
                        key={painPoint}
                        label={painPoint}
                        onClick={() => handlePainPointChange(painPoint)}
                        sx={{
                          py: 2,
                          px: 1,
                          backgroundColor: painPoints.includes(painPoint) 
                            ? alpha(primaryColor, 0.15) 
                            : 'transparent',
                          color: painPoints.includes(painPoint) 
                            ? primaryColor 
                            : 'text.secondary',
                          border: `1px solid ${painPoints.includes(painPoint) 
                            ? primaryColor 
                            : alpha('#000', 0.2)}`,
                          fontWeight: painPoints.includes(painPoint) ? 600 : 400,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: alpha(primaryColor, 0.1),
                            transform: 'translateY(-1px)',
                            boxShadow: `0 2px 8px ${alpha(primaryColor, 0.2)}`,
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Fade>
        );

      case 4:
        return (
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <CircularProgress 
                    size={60} 
                    sx={{ 
                      color: primaryColor,
                      mb: 3
                    }} 
                  />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Crafting Your ICP Insights...
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Our AI is putting together a detailed profile based on your valuable input. Just a moment!
                  </Typography>
                </Box>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Alert severity="error" sx={{ mb: 3 }}>
                  <AlertTitle>Oops! Something Went Wrong</AlertTitle>
                  We encountered an issue while generating your ICP: {error}. Please try again.
                </Alert>
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setError(null); 
                      setActiveStep(3); // Go back to the previous step to allow re-submission
                    }}
                    startIcon={<RefreshIcon />}
                    sx={{
                      color: primaryColor,
                      borderColor: primaryColor,
                      '&:hover': {
                        borderColor: primaryColor,
                        backgroundColor: alpha(primaryColor, 0.05),
                      },
                    }}
                  >
                    Try Generating Again
                  </Button>
                </Box>
              </motion.div>
            ) : icpData ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <CheckCircleIcon sx={{ fontSize: 60, color: '#4CAF50', mb: 2 }} />
                  <Typography variant="h5" fontWeight={700} gutterBottom>
                    Here's Your Ideal Customer Profile!
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    This AI-generated profile offers a starting point for understanding your ideal customer.
                  </Typography>
                </Box>

                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                  gap: 3 
                }}>
                  <Card sx={{ p: 3, textAlign: 'center', border: `1px solid ${alpha(primaryColor, 0.2)}`, boxShadow: `0 4px 12px ${alpha(primaryColor, 0.1)}` }}>
                    <WorkIcon sx={{ fontSize: 40, color: primaryColor, mb: 2 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Industry & Size
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {industry.charAt(0).toUpperCase() + industry.slice(1)}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {companySize[0]}-{companySize[1] === 5000 ? '1000+' : companySize[1]} employees
                    </Typography>
                  </Card>

                  <Card sx={{ p: 3, textAlign: 'center', border: `1px solid ${alpha('#2196F3', 0.2)}`, boxShadow: `0 4px 12px ${alpha('#2196F3', 0.1)}` }}>
                    <AttachMoneyIcon sx={{ fontSize: 40, color: '#2196F3', mb: 2 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Budget Focus
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Monthly Marketing
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      ${budget[0].toLocaleString()} - ${budget[1].toLocaleString()}
                    </Typography>
                  </Card>

                  <Card sx={{ p: 3, textAlign: 'center', border: `1px solid ${alpha('#FF9800', 0.2)}`, boxShadow: `0 4px 12px ${alpha('#FF9800', 0.1)}` }}>
                    <TargetIcon sx={{ fontSize: 40, color: '#FF9800', mb: 2 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Key Contact
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Likely Decision Maker
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {targetRole.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Typography>
                  </Card>
                </Box>

                {icpData && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
                      Deeper Insights into Your ICP
                    </Typography>
                    
                    {Object.entries(icpData).map(([category, data]) => (
                      <Card key={category} sx={{ mb: 3, p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: primaryColor, borderBottom: `2px solid ${primaryColor}`, pb: 1, mb: 2 }}>
                          {category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Typography>
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                          gap: 2.5 
                        }}>
                          {typeof data === 'object' && data !== null && Object.entries(data).map(([key, value]) => (
                            <Box key={key} sx={{ borderLeft: `3px solid ${alpha(primaryColor, 0.3)}`, pl: 2 }}>
                              <Typography variant="body2" fontWeight={600} gutterBottom>
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                              </Typography>
                              {Array.isArray(value) ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  {value.map((item, idx) => (
                                    <Chip 
                                      key={idx} 
                                      label={item} 
                                      size="small"
                                      sx={{ 
                                        backgroundColor: alpha(primaryColor, 0.08),
                                        color: primaryColor,
                                        fontWeight: 500,
                                      }}
                                    />
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="textSecondary">
                                  {String(value)}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Card>
                    ))}
                  </Box>
                )}

                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Typography variant="body2" color="textSecondary" sx={{mb:2}}>
                    This AI-generated profile is a great starting point. For a more in-depth strategy session, let's talk!
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      sx={{
                        color: primaryColor,
                        borderColor: primaryColor,
                        '&:hover': {
                          borderColor: primaryColor,
                          backgroundColor: alpha(primaryColor, 0.05),
                        },
                      }}
                    >
                      Download as PDF
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ShareIcon />}
                      sx={{
                        color: primaryColor,
                        borderColor: primaryColor,
                        '&:hover': {
                          borderColor: primaryColor,
                          backgroundColor: alpha(primaryColor, 0.05),
                        },
                      }}
                    >
                      Share Your ICP
                    </Button>
                    <Button
                      variant="contained"
                      component="a"
                      href="/contact"
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        backgroundColor: primaryColor,
                        '&:hover': {
                          backgroundColor: alpha(primaryColor, 0.9),
                        },
                      }}
                    >
                      Discuss Custom Strategy
                    </Button>
                  </Box>
                </Box>
              </motion.div>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Ready to generate your ICP?
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!isStepValid(2)} // Corrected to check step 2 before allowing submission to step 3 logic
                  sx={{
                    backgroundColor: primaryColor,
                    '&:hover': {
                      backgroundColor: alpha(primaryColor, 0.9),
                    },
                  }}
                >
                  Generate My ICP
                </Button>
              </Box>
            )}
          </AnimatePresence>
        );

      default:
        return 'Unknown step';
    }
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
              Discover Your Ideal Customer
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
                lineHeight: 1.7 // Increased for readability
              }}
            >
              Unlock powerful marketing insights by clearly defining your Ideal Customer Profile (ICP). 
              Our AI-driven tool helps you pinpoint who to target for maximum impact. Let's build your ICP together in a few simple steps.
            </Typography>
          </motion.div>
        </Box>

        {/* Stepper */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 6 }}>
            <Stepper 
              activeStep={activeStep} 
              connector={<CustomStepConnector />}
              sx={{ mb: 4 }}
            >
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    StepIconComponent={() => (
                      <CustomStepIcon
                        ownerState={{
                          completed: index < activeStep,
                          active: index === activeStep
                        }}
                      >
                        {React.cloneElement(step.icon, { fontSize: 'small' })}
                      </CustomStepIcon>
                    )}
                  >
                    <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                      {step.label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        </motion.div>

        {/* Main Content */}
        <motion.div variants={itemVariants}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 6 },
              borderRadius: 4,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              border: `1px solid ${alpha(primaryColor, 0.1)}`,
              position: 'relative',
              overflow: 'hidden',
              minHeight: 600,
            }}
          >
            {/* Animated background */}
            <Box
              component={motion.div}
              variants={pulseVariants}
              animate="animate"
              sx={{
                position: 'absolute',
                top: -100,
                right: -100,
                width: 400,
                height: 400,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(primaryColor, 0.05)} 0%, rgba(255, 255, 255, 0) 70%)`,
                filter: 'blur(40px)',
                zIndex: 0,
              }}
            />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              {getStepContent(activeStep)}

              {/* Navigation Buttons */}
              {activeStep < 4 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6 }}>
                  <Button
                    onClick={handleBack}
                    disabled={activeStep === 0}
                    startIcon={<ArrowBackIcon />}
                    sx={{
                      color: activeStep === 0 ? 'text.disabled' : primaryColor,
                      '&:hover': {
                        backgroundColor: activeStep === 0 ? 'transparent' : alpha(primaryColor, 0.05),
                      },
                    }}
                  >
                    Back
                  </Button>

                  <Button
                    onClick={activeStep === 3 ? handleSubmit : handleNext}
                    disabled={!isStepValid(activeStep)}
                    variant="contained"
                    endIcon={activeStep === 3 ? <InsightsIcon /> : <ArrowForwardIcon />}
                    sx={{
                      backgroundColor: primaryColor,
                      px: 4,
                      py: 1.5,
                      borderRadius: '50px',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: alpha(primaryColor, 0.9),
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 20px ${alpha(primaryColor, 0.3)}`,
                      },
                      '&:disabled': {
                        backgroundColor: alpha(primaryColor, 0.3),
                        transform: 'none',
                        boxShadow: 'none',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {activeStep === 3 ? 'Generate My ICP' : 'Next Step'}
                  </Button>
                </Box>
              )}

              {/* Reset Button for Results */}
              {activeStep === 4 && icpData && (
                <Box sx={{ textAlign: 'center', mt: 6 }}>
                  <Button
                    onClick={resetForm}
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    sx={{
                      color: primaryColor,
                      borderColor: primaryColor,
                      '&:hover': {
                        borderColor: primaryColor,
                        backgroundColor: alpha(primaryColor, 0.05),
                      },
                    }}
                  >
                    Start a New ICP
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              Step {activeStep + 1} of {steps.length}
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', mt: 1 }}>
              <Box
                sx={{
                  height: 4,
                  backgroundColor: alpha(primaryColor, 0.2),
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${((activeStep + 1) / steps.length) * 100}%`,
                    background: `linear-gradient(90deg, ${primaryColor}, #6C3483)`,
                    borderRadius: 2,
                    transition: 'width 0.5s ease',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ICPGenerator;
