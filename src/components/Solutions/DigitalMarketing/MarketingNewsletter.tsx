'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  TextField,
  InputAdornment,
  IconButton,
  alpha,
  useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import SendIcon from '@mui/icons-material/Send';

export const MarketingNewsletter = () => {
  const primaryColor = '#8E44AD';
  const [email, setEmail] = useState('');

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handleSubscribe = () => {
    // Handle subscription logic here
    console.log('Subscribed with email:', email);
    setEmail('');
    // Show success message or notification
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ 
        y: -5,
        transition: { duration: 0.3 }
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          borderRadius: 4,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          border: `1px solid ${alpha(primaryColor, 0.1)}`,
          background: `linear-gradient(135deg, ${alpha(primaryColor, 0.05)} 0%, rgba(255,255,255,0.9) 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(primaryColor, 0.1)} 0%, rgba(255,255,255,0) 70%)`,
            filter: 'blur(40px)',
            zIndex: 0,
          }}
        />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography 
            variant="h4" 
            component="h3" 
            fontWeight={700} 
            gutterBottom
            sx={{
              background: `linear-gradient(90deg, ${primaryColor} 0%, #333333 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Stay Ahead of the Curve
          </Typography>
          
          <Typography variant="body1" color="textSecondary" sx={{ mb: 4, maxWidth: 700 }}>
            Subscribe to our newsletter for exclusive marketing insights, industry trends, and actionable tips delivered straight to your inbox. Join our community of marketing professionals and never miss an update.
          </Typography>
          
          <Box 
            component="form" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubscribe();
            }}
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 },
              maxWidth: 600,
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Enter your email address"
              value={email}
              onChange={handleEmailChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: { xs: 2, sm: '50px 0 0 50px' },
                  backgroundColor: 'white',
                  '& fieldset': {
                    borderColor: alpha(primaryColor, 0.2),
                  },
                  '&:hover fieldset': {
                    borderColor: alpha(primaryColor, 0.3),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                  },
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Box 
                      component={motion.div}
                      whileHover={{ rotate: 15 }}
                      sx={{ 
                        display: { xs: 'none', sm: 'block' },
                        color: alpha(primaryColor, 0.5),
                      }}
                    >
                      <SendIcon />
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              type="submit"
              sx={{
                backgroundColor: primaryColor,
                borderRadius: { xs: 2, sm: '0 50px 50px 0' },
                py: 1.5,
                px: 4,
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: alpha(primaryColor, 0.9),
                  transform: 'translateY(-3px)',
                  boxShadow: `0 8px 20px ${alpha(primaryColor, 0.3)}`,
                },
                transition: 'all 0.3s ease',
              }}
            >
              Subscribe
            </Button>
          </Box>
          
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
            By subscribing, you agree to our Privacy Policy and consent to receive marketing communications.
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );
};
