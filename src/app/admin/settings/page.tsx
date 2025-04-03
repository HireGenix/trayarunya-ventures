'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Tabs, 
  Tab, 
  useTheme, 
  alpha,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import Link from 'next/link';

// Import components
import TabPanel, { a11yProps } from './components/TabPanel';
import GeneralSettingsForm from './components/GeneralSettingsForm';
import UsersTable from './components/UsersTable';

// Import API functions
import { 
  getGeneralSettings, 
  updateGeneralSettings,
  getUserRoles,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getNotificationSettings,
  updateNotificationSettings,
  getApiIntegrations,
  createApiIntegration,
  updateApiIntegration,
  deleteApiIntegration,
  getBackupSettings,
  updateBackupSettings,
  getSecuritySettings,
  updateSecuritySettings,
  fallbackData
} from './api';

import { 
  GeneralSettings, 
  UserRole, 
  User, 
  NotificationSettings, 
  ApiIntegration, 
  BackupSettings, 
  SecuritySettings 
} from './types';

export default function SettingsPage() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // State for data
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [apiIntegrations, setApiIntegrations] = useState<ApiIntegration[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // In a production environment, these would be real API calls
      // For now, we're using the fallback data for demonstration
      const general = await fallbackData.getGeneralSettings();
      const roles = await fallbackData.getUserRoles();
      const usersList = await fallbackData.getUsers();
      const notifications = await fallbackData.getNotificationSettings();
      const integrations = await fallbackData.getApiIntegrations();
      const backup = await fallbackData.getBackupSettings();
      const security = await fallbackData.getSecuritySettings();
      
      setGeneralSettings(general);
      setUserRoles(roles);
      setUsers(usersList);
      setNotificationSettings(notifications);
      setApiIntegrations(integrations);
      setBackupSettings(backup);
      setSecuritySettings(security);
    } catch (error) {
      console.error('Error loading settings data:', error);
      setSnackbarMessage('Failed to load settings data. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveGeneralSettings = async (settings: GeneralSettings) => {
    try {
      // In a real app, this would call the API to save the settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setGeneralSettings(settings);
      
      setSnackbarMessage('General settings saved successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error saving general settings:', error);
      setSnackbarMessage('Failed to save general settings. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      throw error; // Re-throw to be caught by the form component
    }
  };

  const handleAddUser = async (user: Omit<User, 'id' | 'createdAt'>) => {
    try {
      // In a real app, this would call the API to add the user
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Create a new user with a fake ID and creation date
      const newUser: User = {
        ...user,
        id: `user-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      setUsers([...users, newUser]);
      
      setSnackbarMessage('User added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error adding user:', error);
      setSnackbarMessage('Failed to add user. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      throw error;
    }
  };

  const handleUpdateUser = async (id: string, userData: Partial<User>) => {
    try {
      // In a real app, this would call the API to update the user
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Update the user in the local state
      const updatedUsers = users.map(user => 
        user.id === id ? { ...user, ...userData } : user
      );
      
      setUsers(updatedUsers);
      
      setSnackbarMessage('User updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating user:', error);
      setSnackbarMessage('Failed to update user. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      throw error;
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      // In a real app, this would call the API to delete the user
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Remove the user from the local state
      const updatedUsers = users.filter(user => user.id !== id);
      
      setUsers(updatedUsers);
      
      setSnackbarMessage('User deleted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbarMessage('Failed to delete user. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      throw error;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            component={Link}
            href="/admin"
            startIcon={<ArrowBackIcon />}
            sx={{ fontWeight: 500 }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Settings
          </Typography>
        </Box>
      </Box>

      {/* Tabs for different settings sections */}
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
          mb: 4,
          overflow: 'visible'
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              px: 2,
              '& .MuiTab-root': {
                py: 3,
                px: 2,
                fontWeight: 600,
              }
            }}
          >
            <Tab label="General" {...a11yProps(0)} />
            <Tab label="Users" {...a11yProps(1)} />
            <Tab label="Notifications" {...a11yProps(2)} />
            <Tab label="Integrations" {...a11yProps(3)} />
            <Tab label="Backup" {...a11yProps(4)} />
            <Tab label="Security" {...a11yProps(5)} />
          </Tabs>

          {/* General Settings Tab */}
          <TabPanel value={tabValue} index={0}>
            {generalSettings && (
              <GeneralSettingsForm 
                settings={generalSettings} 
                loading={loading} 
                onSave={handleSaveGeneralSettings} 
              />
            )}
          </TabPanel>

          {/* Users Tab */}
          <TabPanel value={tabValue} index={1}>
            <UsersTable 
              users={users} 
              roles={userRoles} 
              loading={loading} 
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={tabValue} index={2}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Notification Settings
                </Typography>
                <Box sx={{ py: 10, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Notification settings will be implemented here.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Integrations Tab */}
          <TabPanel value={tabValue} index={3}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  API Integrations
                </Typography>
                <Box sx={{ py: 10, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    API integrations will be implemented here.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Backup Tab */}
          <TabPanel value={tabValue} index={4}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Backup Settings
                </Typography>
                <Box sx={{ py: 10, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Backup settings will be implemented here.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={tabValue} index={5}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Security Settings
                </Typography>
                <Box sx={{ py: 10, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Security settings will be implemented here.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Snackbar for notifications */}
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
