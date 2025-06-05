import React from 'react';
import { 
  Box, Container, Typography, Paper, useTheme, 
  Button, Divider, alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';

const meetingTypes = [
  {
    icon: <VideocamIcon fontSize="large" />,
    title: 'Video Call',
    description: 'Meet face-to-face virtually to discuss your needs in detail.',
    duration: '30 min',
  },
  {
    icon: <PhoneIcon fontSize="large" />,
    title: 'Phone Call',
    description: 'Have a quick conversation about your requirements.',
    duration: '15 min',
  },
  {
    icon: <PersonIcon fontSize="large" />,
    title: 'In-Person',
    description: 'Visit our office for a detailed discussion and demo.',
    duration: '60 min',
  },
];

interface ScheduleMeetingProps {
  onScheduleClick?: () => void;
}

const ScheduleMeeting: React.FC<ScheduleMeetingProps> = ({ onScheduleClick }) => {
  const theme = useTheme();

  const handleScheduleClick = () => {
    if (onScheduleClick) {
      onScheduleClick();
    } else {
      // If no callback is provided, open the calendar booking modal from the common component
      // This is just a placeholder - in a real implementation, you would use a context or state management
      // to open the modal from the Common/CalendarBooking component
      console.log('Open calendar booking modal');
    }
  };

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: theme.palette.text.primary,
            }}
          >
            Schedule a Meeting
          </Typography>
          <Typography
            variant="body1"
            sx={{ 
              mb: 4, 
              maxWidth: 700, 
              mx: 'auto', 
              color: theme.palette.text.secondary, 
              fontSize: '1.1rem', 
              lineHeight: 1.7 
            }}
          >
            Book a time to speak with our team about your needs and how we can help you achieve your goals.
          </Typography>
        </Box>
        
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)', 
                md: 'repeat(3, 1fr)' 
              },
              gap: 4
            }}
          >
            {meetingTypes.map((type, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: 4,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                  },
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    mb: 3,
                    mx: 'auto',
                  }}
                >
                  {type.icon}
                </Box>
                
                <Typography
                  variant="h5"
                  component="h3"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    textAlign: 'center',
                    color: theme.palette.text.primary,
                  }}
                >
                  {type.title}
                </Typography>
                
                <Typography
                  variant="body1"
                  sx={{
                    mb: 3,
                    textAlign: 'center',
                    color: theme.palette.text.secondary,
                    flexGrow: 1,
                  }}
                >
                  {type.description}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                  <AccessTimeIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
                  <Typography variant="body2" color="textSecondary">
                    Duration: {type.duration}
                  </Typography>
                </Box>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CalendarMonthIcon />}
                  onClick={handleScheduleClick}
                  sx={{
                    py: 1,
                    borderRadius: '50px',
                    fontWeight: 600,
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 15px rgba(0, 0, 0, 0.15)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Schedule {type.title}
                </Button>
              </Paper>
            ))}
          </Box>
          
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Typography variant="body2" color="textSecondary">
              Can't find a suitable time? Email us at{' '}
              <Box
                component="a"
                href="mailto:info@trayarunyaventures.com"
                sx={{
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                info@trayarunyaventures.com
              </Box>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default ScheduleMeeting;
