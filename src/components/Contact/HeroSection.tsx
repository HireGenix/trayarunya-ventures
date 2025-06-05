import React from 'react';
import { Box, Container, Typography, Chip, alpha, useTheme, IconButton, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';

const socialLinks = [
  { icon: <FacebookIcon />, name: 'Facebook', url: 'https://facebook.com/' },
  { icon: <TwitterIcon />, name: 'Twitter', url: 'https://twitter.com/' },
  { icon: <LinkedInIcon />, name: 'LinkedIn', url: 'https://linkedin.com/' },
  { icon: <InstagramIcon />, name: 'Instagram', url: 'https://instagram.com/' },
];

const HeroSection: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: { xs: 10, md: 14 },
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary ? theme.palette.secondary.main : '#000', 0.08)} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          zIndex: 0,
        }}
      />
      
      {/* Animated gradient orbs */}
      <Box
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.05 }}
        transition={{ duration: 1.5 }}
        sx={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.palette.primary.light} 0%, rgba(255, 255, 255, 0) 70%)`,
          filter: 'blur(80px)',
          zIndex: 0,
          animation: 'heroPulse 10s ease-in-out infinite',
          '@keyframes heroPulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.05 },
            '50%': { transform: 'scale(1.1)', opacity: 0.08 },
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Chip
              label="CONTACT US"
              sx={{
                mb: 3,
                py: 1.5,
                px: 2,
                borderRadius: '50px',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.75rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              }}
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontWeight: 800,
                mb: 2,
                fontSize: { xs: '2.5rem', md: '4rem' },
                color: theme.palette.text.primary,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary ? theme.palette.secondary.main : theme.palette.primary.dark})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Get In Touch With Us
            </Typography>
            <Typography
              variant="h5"
              component="p"
              sx={{ 
                mb: 4, 
                maxWidth: 800, 
                mx: 'auto', 
                fontWeight: 400, 
                color: theme.palette.text.secondary,
                lineHeight: 1.6,
              }}
            >
              Have questions or want to learn more about our AI-powered solutions? We'd love to hear from you. Reach out to us using the form below, schedule a meeting, or contact us directly through any of our channels.
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              {socialLinks.map((social, index) => (
                <Tooltip key={index} title={social.name}>
                  <IconButton
                    component="a"
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    sx={{
                      color: theme.palette.primary.main,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main,
                        color: '#fff',
                        transform: 'translateY(-3px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {social.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Box>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default HeroSection;
