/**
 * Settings store — single-row settings document in Azure Postgres (Prisma).
 * Holds general site config, notifications, integrations, backup, security, roles.
 * Users are NOT stored here (they come from the real userStore).
 */
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

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

const SETTINGS_ID = 'main';

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

async function read(): Promise<SettingsData> {
  try {
    const row = await prisma.setting.findUnique({ where: { id: SETTINGS_ID } });
    if (!row) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(row.data as Partial<SettingsData>) };
  } catch {
    return { ...DEFAULTS };
  }
}

async function write(data: SettingsData): Promise<void> {
  const payload = data as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, data: payload },
    update: { data: payload },
  });
}

export const settingsStore = {
  async getGeneral() {
    return (await read()).general;
  },
  async updateGeneral(patch: Partial<GeneralSettings>): Promise<GeneralSettings> {
    const d = await read();
    d.general = { ...d.general, ...patch };
    await write(d);
    return d.general;
  },

  async getNotifications() {
    return (await read()).notifications;
  },
  async updateNotifications(patch: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const d = await read();
    d.notifications = { ...d.notifications, ...patch };
    await write(d);
    return d.notifications;
  },

  async getIntegrations() {
    return (await read()).integrations;
  },
  async createIntegration(input: Omit<ApiIntegration, 'id' | 'createdAt'>): Promise<ApiIntegration> {
    const d = await read();
    const item: ApiIntegration = {
      ...input,
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    d.integrations.push(item);
    await write(d);
    return item;
  },
  async updateIntegration(id: string, patch: Partial<ApiIntegration>): Promise<ApiIntegration | null> {
    const d = await read();
    const idx = d.integrations.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    d.integrations[idx] = { ...d.integrations[idx], ...patch, id };
    await write(d);
    return d.integrations[idx];
  },
  async deleteIntegration(id: string): Promise<boolean> {
    const d = await read();
    const next = d.integrations.filter((i) => i.id !== id);
    if (next.length === d.integrations.length) return false;
    d.integrations = next;
    await write(d);
    return true;
  },

  async getBackup() {
    return (await read()).backup;
  },
  async updateBackup(patch: Partial<BackupSettings>): Promise<BackupSettings> {
    const d = await read();
    d.backup = { ...d.backup, ...patch };
    await write(d);
    return d.backup;
  },

  async getSecurity() {
    return (await read()).security;
  },
  async updateSecurity(patch: Partial<SecuritySettings>): Promise<SecuritySettings> {
    const d = await read();
    d.security = { ...d.security, ...patch };
    await write(d);
    return d.security;
  },

  async getRoles() {
    return (await read()).roles;
  },
};
