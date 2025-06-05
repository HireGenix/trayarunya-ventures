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

  const handleSubscribe = async () => {
    if (!email) return;

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Newsletter Subscriber (Marketing)',
          email: email,
          subject: 'Newsletter Subscription from Marketing Page',
          message: 'User subscribed to the newsletter via the Marketing Newsletter section.',
          formType: 'Newsletter Marketing',
          pageUrl: window.location.pathname,
        }),
      });

      if (response.ok) {
        console.log('Marketing Newsletter subscription successful');
        // Optionally, show a success message to the user
      } else {
        console.error('Marketing Newsletter subscription failed');
        // Optionally, show an error message
      }
    } catch (error) {
      console.error('Error submitting Marketing newsletter subscription:', error);
    } finally {
      setEmail('');
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
            Get Smarter Marketing, Straight to Your Inbox
          </Typography>
          
          <Typography variant="body1" color="textSecondary" sx={{ mb: 4, maxWidth: 700, lineHeight: 1.7 }}>
            Want the latest digital marketing wisdom, practical tips, and industry news? Join our newsletter community and get valuable insights delivered directly to you. Let's grow together!
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
              position: 'relative',
              zIndex: 1,
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Your best email address"
              value={email}
              onChange={handleEmailChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: { xs: 2, sm: '50px 0 0 50px' },
                  backgroundColor: 'white',
                  height: '56px',
                  '& fieldset': {
                    borderColor: alpha(primaryColor, 0.2),
                    borderWidth: '2px',
                    borderRight: { xs: '2px solid', sm: 'none' },
                    borderRightColor: { xs: alpha(primaryColor, 0.2), sm: 'transparent' },
                  },
                  '&:hover fieldset': {
                    borderColor: alpha(primaryColor, 0.5),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: primaryColor,
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '16px 20px',
                  fontSize: '1rem',
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
                        mr: 1,
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
                height: '56px',
                py: 1.5,
                px: { xs: 3, sm: 4 },
                fontWeight: 600,
                fontSize: '1rem',
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
            We respect your privacy. Unsubscribe anytime.
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );
};
