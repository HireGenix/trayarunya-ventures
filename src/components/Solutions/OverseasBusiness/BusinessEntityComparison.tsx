'use client';

import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button,
  useTheme, 
  alpha,
  Chip,
  Divider
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Entity comparison data
const entityTypes = [
  {
    type: 'Limited Liability Company (LLC)',
    icon: <BusinessIcon fontSize="large" />,
    color: '#3f51b5',
    liability: 'High - Members are not personally liable for company debts',
    tax: 'Pass-through taxation in many jurisdictions; flexible tax options',
    complexity: 'Medium - Moderate formation costs and ongoing compliance',
    bestFor: 'Small to medium businesses seeking liability protection with tax flexibility',
    advantages: ['Limited liability protection', 'Tax flexibility', 'Less formalities than corporations']
  },
  {
    type: 'Corporation / Limited Company',
    icon: <AccountBalanceIcon fontSize="large" />,
    color: '#f44336',
    liability: 'High - Shareholders have limited liability',
    tax: 'Subject to corporate tax rates; potential for double taxation',
    complexity: 'High - More expensive to form and maintain; stricter compliance',
    bestFor: 'Larger businesses seeking to raise capital through stock issuance',
    advantages: ['Limited liability protection', 'Ability to raise capital through stock', 'Perpetual existence']
  },
  {
    type: 'Branch Office',
    icon: <StorefrontIcon fontSize="large" />,
    color: '#4caf50',
    liability: 'Low - Parent company bears full liability',
    tax: 'Taxed as part of the parent company; may face higher tax rates',
    complexity: 'Medium - Simpler than subsidiary but with reporting requirements',
    bestFor: 'Companies testing a market before full commitment',
    advantages: ['Easier to establish than a subsidiary', 'Direct operational control', 'Lower initial capital requirements']
  },
  {
    type: 'Representative Office',
    icon: <StorefrontIcon fontSize="large" />,
    color: '#ff9800',
    liability: 'Low - Parent company bears full liability',
    tax: 'Limited tax obligations as activities are restricted',
    complexity: 'Low - Easiest and least expensive to establish',
    bestFor: 'Market research, promotion, and networking without direct sales',
    advantages: ['Easiest to establish', 'Minimal compliance requirements', 'Limited tax obligations']
  },
  {
    type: 'Partnership',
    icon: <GroupsIcon fontSize="large" />,
    color: '#e91e63',
    liability: 'Varies - General partners have unlimited liability; limited partners have limited liability',
    tax: 'Pass-through taxation to partners',
    complexity: 'Medium - Requires clear partnership agreements',
    bestFor: 'Professional service firms and joint ventures between existing businesses',
    advantages: ['Pass-through taxation', 'Relatively easy to form', 'Shared management and resources']
  },
];

const BusinessEntityComparison = () => {
  const theme = useTheme();
  const primaryColor = '#0A66C2';
  const secondaryColor = '#FF5722';

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

  const tableVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { 
        delay: 0.1 * i,
        duration: 0.5,
        ease: "easeOut"
      }
    }),
    hover: {
      backgroundColor: alpha(primaryColor, 0.05),
      transition: { duration: 0.2 }
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
        background: `linear-gradient(180deg, rgba(255,255,255,1) 0%, ${alpha(primaryColor, 0.05)} 100%)`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(primaryColor, 0.05)} 0%, rgba(255,255,255,0) 70%)`,
          filter: 'blur(50px)',
          zIndex: 0,
        }}
      />
      <Container maxWidth="lg">
        <motion.div variants={containerVariants}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <motion.div variants={headerVariants}>
              <Typography
                variant="overline"
                sx={{
                  color: secondaryColor,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  mb: 1,
                  display: 'block'
                }}
              >
                MAKE THE RIGHT CHOICE
              </Typography>
              <Typography
                variant="h2"
                component="h2"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textAlign: 'center',
                }}
              >
                Business Entity Comparison
              </Typography>
            </motion.div>
            <motion.div variants={headerVariants}>
              <Typography
                variant="h6"
                color="textSecondary"
                sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}
              >
                Understanding the different types of business entities available for international expansion
              </Typography>
            </motion.div>
          </Box>

          <Box sx={{ overflowX: 'auto', mb: 6 }}>
            <motion.div variants={tableVariants}>
              <Box sx={{ minWidth: 900 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Table Header */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      background: `linear-gradient(90deg, ${primaryColor} 0%, ${alpha(secondaryColor, 0.8)} 100%)`,
                      color: 'white',
                      p: 2,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Background pattern */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0.1,
                        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                      }}
                    />
                    
                    <Typography variant="subtitle1" fontWeight={700} sx={{ p: 1, position: 'relative', zIndex: 1 }}>Entity Type</Typography>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ p: 1, position: 'relative', zIndex: 1 }}>Liability Protection</Typography>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ p: 1, position: 'relative', zIndex: 1 }}>Tax Considerations</Typography>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ p: 1, position: 'relative', zIndex: 1 }}>Complexity & Cost</Typography>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ p: 1, position: 'relative', zIndex: 1 }}>Best For</Typography>
                  </Box>

                  {/* Table Rows */}
                  {entityTypes.map((entity, index) => (
                    <motion.div
                      key={index}
                      custom={index}
                      variants={rowVariants}
                      whileHover="hover"
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          borderBottom: index === entityTypes.length - 1 ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
                          '&:nth-of-type(odd)': {
                            backgroundColor: alpha(primaryColor, 0.03),
                          },
                          '&:hover': {
                            backgroundColor: alpha(entity.color, 0.1),
                            transition: 'background-color 0.3s ease',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ color: entity.color }}>{entity.icon}</Box>
                          <Typography variant="body2" fontWeight={600}>{entity.type}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ p: 2 }}>{entity.liability}</Typography>
                        <Typography variant="body2" sx={{ p: 2 }}>{entity.tax}</Typography>
                        <Typography variant="body2" sx={{ p: 2 }}>{entity.complexity}</Typography>
                        <Typography variant="body2" sx={{ p: 2 }}>{entity.bestFor}</Typography>
                      </Box>
                    </motion.div>
                  ))}
                </Paper>
              </Box>
            </motion.div>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Typography variant="body1" color="textSecondary" sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
                The right business entity structure depends on your specific goals, target markets, and long-term strategy. Our experts will help you navigate these options and select the most advantageous structure for your international expansion.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    href="/contact"
                    sx={{
                      background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      color: 'white',
                      borderWidth: 0,
                      py: 1.5,
                      px: 3,
                      borderRadius: '50px',
                      fontWeight: 700,
                      boxShadow: `0 4px 15px ${alpha(primaryColor, 0.3)}`,
                      '&:hover': {
                        boxShadow: `0 8px 25px ${alpha(primaryColor, 0.4)}`,
                        transform: 'translateY(-3px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Schedule Entity Consultation
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    href="/solutions"
                    sx={{
                      borderColor: primaryColor,
                      color: primaryColor,
                      borderWidth: 2,
                      py: 1.5,
                      px: 3,
                      borderRadius: '50px',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: primaryColor,
                        backgroundColor: alpha(primaryColor, 0.05),
                        transform: 'translateY(-3px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Explore Other Solutions
                  </Button>
                </motion.div>
              </Box>
            </motion.div>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default BusinessEntityComparison;
