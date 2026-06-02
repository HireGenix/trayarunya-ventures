/**
 * Settings store — persists site/admin settings to data/settings.json.
 * Users are NOT stored here (they come from the real userStore); this holds
 * general site config, notifications, integrations, backup, security, roles.
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

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

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface SettingsData {
  general: GeneralSettings;
  notifications: NotificationSettings;
  integrations: ApiIntegration[];
  backup: BackupSettings;
  security: SecuritySettings;
  roles: UserRole[];
}

const DEFAULTS: SettingsData = {
  general: {
    siteName: 'Trayarunya Ventures',
    siteDescription: 'Your B2B growth partner — LinkedIn lead generation for high-ticket sales',
    siteUrl: 'https://trayarunyaventures.com',
    logoUrl: '/Trayarunya-ventures-logo-Transparent.png',
    faviconUrl: '/favicon.ico',
    contactEmail: 'info@trayarunyaventures.com',
    contactPhone: '+1 (971) 512-1701',
    socialLinks: {
      linkedin: 'https://linkedin.com/company/trayarunya-ventures',
      instagram: 'https://instagram.com/trayarunyaventures',
      twitter: 'https://twitter.com/trayarunyaventures',
      facebook: '',
      youtube: '',
    },
    footerText:
      "Trayarunya Ventures isn't your agency — we're your marketing partner. We own your pain points and turn LinkedIn into high-ticket pipeline.",
    copyrightText: `© ${new Date().getFullYear()} Trayarunya Ventures. All rights reserved.`,
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: false,
    notifyOnNewUser: true,
    notifyOnFormSubmission: true,
    notifyOnComments: false,
    digestFrequency: 'daily',
  },
  integrations: [],
  backup: {
    autoBackup: false,
    backupFrequency: 'weekly',
    backupTime: '02:00',
    retentionPeriod: 30,
    storageLocation: 'local',
  },
  security: {
    twoFactorAuth: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      expiryDays: 90,
    },
    sessionTimeout: 30,
    allowedIPs: ['*'],
  },
  roles: [
    { id: 'superadmin', name: 'Super Admin', description: 'Full access to all features and settings', permissions: ['admin', 'edit', 'view', 'delete'] },
    { id: 'admin', name: 'Administrator', description: 'Manage content and leads', permissions: ['edit', 'view', 'delete'] },
  ],
};

function ensure() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(SETTINGS_FILE)) fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULTS, null, 2));
  } catch (err) {
    console.error('[settingsStore] ensure error', err);
  }
}

function read(): SettingsData {
  ensure();
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    return { ...DEFAULTS, ...data };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(data: SettingsData) {
  ensure();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

export const settingsStore = {
  getGeneral: () => read().general,
  updateGeneral(patch: Partial<GeneralSettings>): GeneralSettings {
    const d = read();
    d.general = { ...d.general, ...patch };
    write(d);
    return d.general;
  },

  getNotifications: () => read().notifications,
  updateNotifications(patch: Partial<NotificationSettings>): NotificationSettings {
    const d = read();
    d.notifications = { ...d.notifications, ...patch };
    write(d);
    return d.notifications;
  },

  getIntegrations: () => read().integrations,
  createIntegration(input: Omit<ApiIntegration, 'id' | 'createdAt'>): ApiIntegration {
    const d = read();
    const item: ApiIntegration = {
      ...input,
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    d.integrations.push(item);
    write(d);
    return item;
  },
  updateIntegration(id: string, patch: Partial<ApiIntegration>): ApiIntegration | null {
    const d = read();
    const idx = d.integrations.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    d.integrations[idx] = { ...d.integrations[idx], ...patch, id };
    write(d);
    return d.integrations[idx];
  },
  deleteIntegration(id: string): boolean {
    const d = read();
    const next = d.integrations.filter((i) => i.id !== id);
    if (next.length === d.integrations.length) return false;
    d.integrations = next;
    write(d);
    return true;
  },

  getBackup: () => read().backup,
  updateBackup(patch: Partial<BackupSettings>): BackupSettings {
    const d = read();
    d.backup = { ...d.backup, ...patch };
    write(d);
    return d.backup;
  },

  getSecurity: () => read().security,
  updateSecurity(patch: Partial<SecuritySettings>): SecuritySettings {
    const d = read();
    d.security = { ...d.security, ...patch };
    write(d);
    return d.security;
  },

  getRoles: () => read().roles,
};
