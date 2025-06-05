import React from 'react';
import { Box, Container, Typography, Paper, useTheme, alpha, Tab, Tabs } from '@mui/material';
import { motion } from 'framer-motion';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`location-tabpanel-${index}`}
      aria-labelledby={`location-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `location-tab-${index}`,
    'aria-controls': `location-tabpanel-${index}`,
  };
}

const MapSection: React.FC = () => {
  const theme = useTheme();
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
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
            Our Locations
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
            With offices in the USA and India, we serve clients globally. Visit us at any of our locations or reach out online.
          </Typography>
        </Box>
        
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              height: 500,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={value} 
                onChange={handleChange} 
                aria-label="location tabs"
                variant="fullWidth"
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    py: 2,
                  },
                  '& .Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: theme.palette.primary.main,
                    height: 3,
                  }
                }}
              >
                <Tab label="USA Office" {...a11yProps(0)} />
                <Tab label="India Office" {...a11yProps(1)} />
              </Tabs>
            </Box>
            
            <TabPanel value={value} index={0}>
              <Box sx={{ height: '100%', width: '100%' }}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2972.2398458554!2d-105.59462492346546!3d41.31443997130884!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876318c09e294c11%3A0x2e488b05a5a4b44a!2s1050%20N%203rd%20St%2C%20Laramie%2C%20WY%2082072%2C%20USA!5e0!3m2!1sen!2sin!4v1717624012345!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="USA Office Location"
                />
              </Box>
            </TabPanel>
            
            <TabPanel value={value} index={1}>
              <Box sx={{ height: '100%', width: '100%' }}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3456.789012345678!2d77.54321098765432!3d29.98765432109876!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390eea7b9987654%3A0x1234567890abcdef!2sRamnagar%2C%20Saharanpur%2C%20Uttar%20Pradesh%20247001!5e0!3m2!1sen!2sin!4v1717624098765!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="India Office Location"
                />
              </Box>
            </TabPanel>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default MapSection;
