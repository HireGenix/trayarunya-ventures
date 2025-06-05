import React from 'react';
import { Box, Typography, Paper, alpha, useTheme, Button, Link } from '@mui/material';
import { motion } from 'framer-motion';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const contactInfo = [
  {
    icon: <LocationOnIcon fontSize="large" />,
    title: 'USA Office',
    details: '1050 North 3rd Street Ste B, Laramie, WY 82072, USA',
    link: 'https://maps.google.com/?q=1050+North+3rd+Street+Ste+B,+Laramie,+WY+82072,+USA',
    linkText: 'View on Google Maps'
  },
  {
    icon: <LocationOnIcon fontSize="large" />,
    title: 'India Office',
    details: '2/1201 Behind S.A.M Inter College, Ramnagar, Saharanpur (U.P)-247001, India',
    link: 'https://maps.google.com/?q=Ramnagar,+Saharanpur+(U.P)-247001,+India',
    linkText: 'View on Google Maps'
  },
  {
    icon: <PhoneIcon fontSize="large" />,
    title: 'Phone',
    details: [
      '+1 (971) 512-1701 (US)',
      '+91-8954333390 (India)',
    ],
    link: 'tel:+19715121701',
    linkText: 'Call Us'
  },
  {
    icon: <EmailIcon fontSize="large" />,
    title: 'Email',
    details: 'info@trayarunyaventures.com',
    link: 'mailto:info@trayarunyaventures.com',
    linkText: 'Email Us'
  },
  {
    icon: <WhatsAppIcon fontSize="large" />,
    title: 'WhatsApp',
    details: 'Connect with us on WhatsApp for quick responses',
    link: 'https://wa.me/19715121701',
    linkText: 'Message Us'
  },
];

const businessHours = [
  { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM (EST)' },
  { day: 'Saturday', hours: '10:00 AM - 2:00 PM (EST)' },
  { day: 'Sunday', hours: 'Closed' },
];

const ContactInfo: React.FC = () => {
  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Typography
        variant="h3"
        component="h2"
        sx={{
          fontWeight: 700,
          mb: 4,
          color: theme.palette.text.primary,
        }}
      >
        Contact Information
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {contactInfo.map((info, index) => (
          <Paper
            key={index}
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
              },
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '5px',
                height: '100%',
                background: `linear-gradient(to bottom, ${theme.palette.primary.main}, ${theme.palette.secondary ? theme.palette.secondary.main : theme.palette.primary.dark})`,
                opacity: 0.7,
              },
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                flexShrink: 0,
              }}
            >
              {info.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                gutterBottom
                sx={{ color: theme.palette.text.primary }}
              >
                {info.title}
              </Typography>
              {Array.isArray(info.details) ? (
                info.details.map((detail, i) => (
                  <Typography
                    key={i}
                    variant="body1"
                    sx={{ color: theme.palette.text.secondary, mb: i < info.details.length - 1 ? 1 : 0 }}
                  >
                    {detail}
                  </Typography>
                ))
              ) : (
                <Typography
                  variant="body1"
                  sx={{ color: theme.palette.text.secondary, mb: 2 }}
                >
                  {info.details}
                </Typography>
              )}
              {info.link && (
                <Button
                  component={Link}
                  href={info.link}
                  target={info.link.startsWith('http') ? '_blank' : undefined}
                  rel={info.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                  variant="outlined"
                  size="small"
                  sx={{
                    mt: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  {info.linkText}
                </Button>
              )}
            </Box>
          </Paper>
        ))}

        {/* Business Hours */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 3,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
            },
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '5px',
              height: '100%',
              background: `linear-gradient(to bottom, ${theme.palette.primary.main}, ${theme.palette.secondary ? theme.palette.secondary.main : theme.palette.primary.dark})`,
              opacity: 0.7,
            },
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              flexShrink: 0,
            }}
          >
            <AccessTimeIcon fontSize="large" />
          </Box>
          <Box>
            <Typography
              variant="h6"
              fontWeight={700}
              gutterBottom
              sx={{ color: theme.palette.text.primary }}
            >
              Business Hours
            </Typography>
            {businessHours.map((item, i) => (
              <Box key={i} sx={{ mb: i < businessHours.length - 1 ? 1 : 0, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Typography
                  variant="body1"
                  sx={{ 
                    color: theme.palette.text.secondary,
                    fontWeight: 500,
                    mr: 2
                  }}
                >
                  {item.day}:
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ 
                    color: item.hours === 'Closed' ? theme.palette.error.main : theme.palette.text.secondary
                  }}
                >
                  {item.hours}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    </motion.div>
  );
};

export default ContactInfo;
