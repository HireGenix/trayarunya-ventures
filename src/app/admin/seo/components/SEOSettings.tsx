import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Switch, 
  FormControlLabel, 
  Divider, 
  Alert, 
  Snackbar,
  CircularProgress
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

interface SEOSettingsProps {
  loading: boolean;
}

export default function SEOSettings({ loading }: SEOSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [settings, setSettings] = useState({
    sitemapUrl: 'https://trayarunyaventures.com/sitemap.xml',
    robotsTxtUrl: 'https://trayarunyaventures.com/robots.txt',
    googleAnalyticsId: 'UA-123456789-1',
    googleSearchConsoleVerification: 'google-site-verification=abcdefghijklmnopqrstuvwxyz',
    enableAutomaticMetaTags: true,
    enableSocialMediaMetaTags: true,
    enableStructuredData: true,
    enableCanonicalUrls: true,
    enableHreflangTags: false,
    crawlFrequency: 'weekly'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveSettings = () => {
    setSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSnackbarOpen(true);
    }, 1500);
  };

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
        SEO Settings
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 4,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
              mb: 4,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Search Engine Configuration
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Box>
                  <TextField
                    label="Sitemap URL"
                    name="sitemapUrl"
                    value={settings.sitemapUrl}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    helperText="URL to your XML sitemap"
                  />
                </Box>
                <Box>
                  <TextField
                    label="Robots.txt URL"
                    name="robotsTxtUrl"
                    value={settings.robotsTxtUrl}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    helperText="URL to your robots.txt file"
                  />
                </Box>
                <Box>
                  <TextField
                    label="Google Analytics ID"
                    name="googleAnalyticsId"
                    value={settings.googleAnalyticsId}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    helperText="Your Google Analytics tracking ID"
                  />
                </Box>
                <Box>
                  <TextField
                    label="Google Search Console Verification"
                    name="googleSearchConsoleVerification"
                    value={settings.googleSearchConsoleVerification}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    helperText="Google Search Console verification meta tag"
                  />
                </Box>
                <Box sx={{ gridColumn: { xs: '1', md: '1 / span 2' } }}>
                  <TextField
                    label="Crawl Frequency"
                    name="crawlFrequency"
                    select
                    SelectProps={{ native: true }}
                    value={settings.crawlFrequency}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    helperText="How often search engines should crawl your site"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </TextField>
                </Box>
              </Box>
            </CardContent>
          </Card>
          
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: 4,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
              mb: 4,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                SEO Features
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableAutomaticMetaTags}
                      onChange={handleChange}
                      name="enableAutomaticMetaTags"
                      color="primary"
                    />
                  }
                  label="Enable Automatic Meta Tags"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                  Automatically generate meta descriptions and titles for pages without them
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableSocialMediaMetaTags}
                      onChange={handleChange}
                      name="enableSocialMediaMetaTags"
                      color="primary"
                    />
                  }
                  label="Enable Social Media Meta Tags"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                  Add Open Graph and Twitter Card meta tags for better social media sharing
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableStructuredData}
                      onChange={handleChange}
                      name="enableStructuredData"
                      color="primary"
                    />
                  }
                  label="Enable Structured Data"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                  Add JSON-LD structured data for rich search results
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableCanonicalUrls}
                      onChange={handleChange}
                      name="enableCanonicalUrls"
                      color="primary"
                    />
                  }
                  label="Enable Canonical URLs"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                  Add canonical URL tags to prevent duplicate content issues
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableHreflangTags}
                      onChange={handleChange}
                      name="enableHreflangTags"
                      color="primary"
                    />
                  }
                  label="Enable Hreflang Tags"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                  Add hreflang tags for multilingual content (if applicable)
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveSettings}
              disabled={saving}
              sx={{ 
                px: 4, 
                py: 1,
                borderRadius: 2,
                fontWeight: 600
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
          
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
              SEO settings saved successfully!
            </Alert>
          </Snackbar>
        </>
      )}
    </Box>
  );
}
