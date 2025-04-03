// Settings API Service
import {
  GeneralSettings,
  UserRole,
  User,
  NotificationSettings,
  ApiIntegration,
  BackupSettings,
  SecuritySettings
} from './types';

// Base API URL - replace with your actual API endpoint
const API_BASE_URL = '/api/settings';

// Helper function for API requests
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'An error occurred while fetching data');
  }

  return response.json();
}

// Get general settings
export async function getGeneralSettings(): Promise<GeneralSettings> {
  return fetchAPI<GeneralSettings>('/general');
}

// Update general settings
export async function updateGeneralSettings(settings: GeneralSettings): Promise<GeneralSettings> {
  return fetchAPI<GeneralSettings>('/general', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// Get user roles
export async function getUserRoles(): Promise<UserRole[]> {
  return fetchAPI<UserRole[]>('/roles');
}

// Create user role
export async function createUserRole(role: Omit<UserRole, 'id'>): Promise<UserRole> {
  return fetchAPI<UserRole>('/roles', {
    method: 'POST',
    body: JSON.stringify(role),
  });
}

// Update user role
export async function updateUserRole(id: string, role: Partial<UserRole>): Promise<UserRole> {
  return fetchAPI<UserRole>(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(role),
  });
}

// Delete user role
export async function deleteUserRole(id: string): Promise<void> {
  return fetchAPI<void>(`/roles/${id}`, {
    method: 'DELETE',
  });
}

// Get users
export async function getUsers(): Promise<User[]> {
  return fetchAPI<User[]>('/users');
}

// Create user
export async function createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  return fetchAPI<User>('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

// Update user
export async function updateUser(id: string, user: Partial<User>): Promise<User> {
  return fetchAPI<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  });
}

// Delete user
export async function deleteUser(id: string): Promise<void> {
  return fetchAPI<void>(`/users/${id}`, {
    method: 'DELETE',
  });
}

// Get notification settings
export async function getNotificationSettings(): Promise<NotificationSettings> {
  return fetchAPI<NotificationSettings>('/notifications');
}

// Update notification settings
export async function updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  return fetchAPI<NotificationSettings>('/notifications', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// Get API integrations
export async function getApiIntegrations(): Promise<ApiIntegration[]> {
  return fetchAPI<ApiIntegration[]>('/integrations');
}

// Create API integration
export async function createApiIntegration(integration: Omit<ApiIntegration, 'id' | 'createdAt'>): Promise<ApiIntegration> {
  return fetchAPI<ApiIntegration>('/integrations', {
    method: 'POST',
    body: JSON.stringify(integration),
  });
}

// Update API integration
export async function updateApiIntegration(id: string, integration: Partial<ApiIntegration>): Promise<ApiIntegration> {
  return fetchAPI<ApiIntegration>(`/integrations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(integration),
  });
}

// Delete API integration
export async function deleteApiIntegration(id: string): Promise<void> {
  return fetchAPI<void>(`/integrations/${id}`, {
    method: 'DELETE',
  });
}

// Get backup settings
export async function getBackupSettings(): Promise<BackupSettings> {
  return fetchAPI<BackupSettings>('/backup');
}

// Update backup settings
export async function updateBackupSettings(settings: BackupSettings): Promise<BackupSettings> {
  return fetchAPI<BackupSettings>('/backup', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// Get security settings
export async function getSecuritySettings(): Promise<SecuritySettings> {
  return fetchAPI<SecuritySettings>('/security');
}

// Update security settings
export async function updateSecuritySettings(settings: SecuritySettings): Promise<SecuritySettings> {
  return fetchAPI<SecuritySettings>('/security', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// For development/testing - fallback data when API is not available
export const fallbackData = {
  async getGeneralSettings(): Promise<GeneralSettings> {
    console.warn('Using fallback data for general settings');
    return {
      siteName: 'Trayarunya Ventures',
      siteDescription: 'AI-powered SaaS applications to streamline and enhance business operations',
      siteUrl: 'https://trayarunyaventures.com',
      logoUrl: '/Trayarunya-ventures-logo-Transparent.png',
      faviconUrl: '/favicon.ico',
      contactEmail: 'info@trayarunyaventures.com',
      contactPhone: '+1 (971) 512-1701',
      socialLinks: {
        facebook: 'https://facebook.com/trayarunyaventures',
        twitter: 'https://twitter.com/trayarunyaventures',
        linkedin: 'https://linkedin.com/company/trayarunya-ventures',
        instagram: 'https://instagram.com/trayarunyaventures',
        youtube: 'https://youtube.com/trayarunyaventures'
      },
      footerText: 'Trayarunya Ventures builds AI-powered SaaS applications to streamline and enhance business operations. Our innovative solutions help organizations work smarter and achieve more.',
      copyrightText: '© 2025 Trayarunya Ventures. All rights reserved.'
    };
  },

  async getUserRoles(): Promise<UserRole[]> {
    console.warn('Using fallback data for user roles');
    return [
      {
        id: '1',
        name: 'Administrator',
        description: 'Full access to all features and settings',
        permissions: ['admin', 'edit', 'view', 'delete']
      },
      {
        id: '2',
        name: 'Editor',
        description: 'Can edit content but cannot modify settings',
        permissions: ['edit', 'view']
      },
      {
        id: '3',
        name: 'Viewer',
        description: 'Read-only access to content',
        permissions: ['view']
      }
    ];
  },

  async getUsers(): Promise<User[]> {
    console.warn('Using fallback data for users');
    return [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@trayarunyaventures.com',
        avatar: 'https://i.pravatar.cc/150?img=1',
        role: 'Administrator',
        status: 'active',
        lastLogin: '2025-03-04T12:00:00Z',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        name: 'Editor User',
        email: 'editor@trayarunyaventures.com',
        avatar: 'https://i.pravatar.cc/150?img=2',
        role: 'Editor',
        status: 'active',
        lastLogin: '2025-03-03T10:30:00Z',
        createdAt: '2024-02-15T00:00:00Z'
      },
      {
        id: '3',
        name: 'Viewer User',
        email: 'viewer@trayarunyaventures.com',
        avatar: 'https://i.pravatar.cc/150?img=3',
        role: 'Viewer',
        status: 'inactive',
        lastLogin: '2025-02-20T09:15:00Z',
        createdAt: '2024-03-01T00:00:00Z'
      },
      {
        id: '4',
        name: 'Pending User',
        email: 'pending@trayarunyaventures.com',
        role: 'Viewer',
        status: 'pending',
        createdAt: '2025-03-01T00:00:00Z'
      }
    ];
  },

  async getNotificationSettings(): Promise<NotificationSettings> {
    console.warn('Using fallback data for notification settings');
    return {
      emailNotifications: true,
      pushNotifications: false,
      notifyOnNewUser: true,
      notifyOnFormSubmission: true,
      notifyOnComments: false,
      digestFrequency: 'daily'
    };
  },

  async getApiIntegrations(): Promise<ApiIntegration[]> {
    console.warn('Using fallback data for API integrations');
    return [
      {
        id: '1',
        name: 'Google Analytics',
        type: 'analytics',
        status: 'active',
        apiKey: 'GA-12345678',
        lastSync: '2025-03-04T08:00:00Z',
        createdAt: '2024-01-15T00:00:00Z'
      },
      {
        id: '2',
        name: 'Mailchimp',
        type: 'email',
        status: 'active',
        apiKey: 'mc-api-key-xxxxx',
        secretKey: 'mc-secret-key-xxxxx',
        endpoint: 'https://api.mailchimp.com/3.0',
        lastSync: '2025-03-04T07:30:00Z',
        createdAt: '2024-02-01T00:00:00Z'
      },
      {
        id: '3',
        name: 'Stripe',
        type: 'payment',
        status: 'inactive',
        apiKey: 'sk_test_xxxxx',
        createdAt: '2024-03-01T00:00:00Z'
      }
    ];
  },

  async getBackupSettings(): Promise<BackupSettings> {
    console.warn('Using fallback data for backup settings');
    return {
      autoBackup: true,
      backupFrequency: 'daily',
      backupTime: '02:00',
      retentionPeriod: 30,
      storageLocation: 'cloud'
    };
  },

  async getSecuritySettings(): Promise<SecuritySettings> {
    console.warn('Using fallback data for security settings');
    return {
      twoFactorAuth: true,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expiryDays: 90
      },
      sessionTimeout: 30,
      allowedIPs: ['*']
    };
  }
};
