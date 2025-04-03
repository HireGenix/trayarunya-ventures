import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  Divider, 
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { GeneralSettings } from '../types';
import Image from 'next/image';

interface GeneralSettingsFormProps {
  settings: GeneralSettings;
  loading: boolean;
  onSave: (settings: GeneralSettings) => Promise<void>;
}

export default function GeneralSettingsForm({ settings, loading, onSave }: GeneralSettingsFormProps) {
  const theme = useTheme();
  const [formData, setFormData] = useState<GeneralSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('socialLinks.')) {
      const socialKey = name.split('.')[1] as keyof typeof formData.socialLinks;
      setFormData({
        ...formData,
        socialLinks: {
          ...formData.socialLinks,
          [socialKey]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await onSave(formData);
      setSnackbarMessage('Settings saved successfully!');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbarMessage('Failed to save settings. Please try again.');
      setSnackbarSeverity('error');
    } finally {
      setSaving(false);
      setSnackbarOpen(true);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
          mb: 4
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Site Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <TextField
                label="Site Name"
                name="siteName"
                value={formData.siteName}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              
              <TextField
                label="Site URL"
                name="siteUrl"
                value={formData.siteUrl}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              
              <TextField
                label="Contact Email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
                type="email"
              />
              
              <TextField
                label="Contact Phone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
            </Box>
            
            <Box>
              <TextField
                label="Site Description"
                name="siteDescription"
                value={formData.siteDescription}
                onChange={handleChange}
                fullWidth
                margin="normal"
                multiline
                rows={4}
              />
              
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <TextField
                  label="Logo URL"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                />
                
                <TextField
                  label="Favicon URL"
                  name="faviconUrl"
                  value={formData.faviconUrl}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                />
              </Box>
            </Box>
          </Box>
          
          {formData.logoUrl && (
            <Box sx={{ mt: 2, p: 2, border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`, borderRadius: 2, display: 'inline-block' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Current Logo:
              </Typography>
              <Box sx={{ position: 'relative', height: 50, width: 180 }}>
                <Image
                  src={formData.logoUrl}
                  alt="Site Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
      
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
          mb: 4
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Social Media Links
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <TextField
              label="Facebook URL"
              name="socialLinks.facebook"
              value={formData.socialLinks.facebook || ''}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
            
            <TextField
              label="Twitter URL"
              name="socialLinks.twitter"
              value={formData.socialLinks.twitter || ''}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
            
            <TextField
              label="LinkedIn URL"
              name="socialLinks.linkedin"
              value={formData.socialLinks.linkedin || ''}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
            
            <TextField
              label="Instagram URL"
              name="socialLinks.instagram"
              value={formData.socialLinks.instagram || ''}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
            
            <TextField
              label="YouTube URL"
              name="socialLinks.youtube"
              value={formData.socialLinks.youtube || ''}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
          </Box>
        </CardContent>
      </Card>
      
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
          mb: 4
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Footer Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <TextField
            label="Footer Text"
            name="footerText"
            value={formData.footerText}
            onChange={handleChange}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
          
          <TextField
            label="Copyright Text"
            name="copyrightText"
            value={formData.copyrightText}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
        </CardContent>
      </Card>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          disabled={saving}
          sx={{ 
            px: 4, 
            py: 1,
            borderRadius: 2,
            fontWeight: 600,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
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
          severity={snackbarSeverity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
