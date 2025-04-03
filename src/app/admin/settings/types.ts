// Settings Types

export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  logoUrl: string;
  faviconUrl: string;
  contactEmail: string;
  contactPhone: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  footerText: string;
  copyrightText: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: string;
  createdAt: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  notifyOnNewUser: boolean;
  notifyOnFormSubmission: boolean;
  notifyOnComments: boolean;
  digestFrequency: 'never' | 'daily' | 'weekly' | 'monthly';
}

export interface ApiIntegration {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  apiKey?: string;
  secretKey?: string;
  endpoint?: string;
  lastSync?: string;
  createdAt: string;
}

export interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionPeriod: number;
  storageLocation: string;
}

export interface SecuritySettings {
  twoFactorAuth: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays: number;
  };
  sessionTimeout: number;
  allowedIPs: string[];
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
