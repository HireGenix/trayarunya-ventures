/**
 * Server-only file-based user store (data/users.json).
 * Unlimited users, passwords hashed with Node's built-in crypto.scrypt (no extra deps).
 *
 * NOTE: On serverless platforms (e.g. Vercel) the filesystem is ephemeral and resets
 * on redeploy. For production durability move this to a database or blob store.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type Role = 'admin' | 'superadmin';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A user safe to send to the client (no password hash). */
export type PublicUser = Omit<StoredUser, 'passwordHash'>;

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64);
    const hashBuf = Buffer.from(hash, 'hex');
    if (hashBuf.length !== derived.length) return false;
    return crypto.timingSafeEqual(hashBuf, derived);
  } catch {
    return false;
  }
}

/**
 * In-memory fallback used when the filesystem is not writable
 * (e.g. Vercel serverless — the deployment dir is read-only, only /tmp is writable).
 * When set, it becomes the source of truth for the lifetime of the invocation so
 * the default admin accounts always exist and login works on any platform.
 */
let memUsers: StoredUser[] | null = null;

function readUsers(): StoredUser[] {
  if (memUsers) return memUsers;
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return memUsers ?? [];
  }
}

function writeUsers(users: StoredUser[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    memUsers = null; // filesystem is the source of truth
  } catch {
    // Read-only filesystem (serverless) — keep everything in memory instead.
    memUsers = users;
  }
}

function toPublic(u: StoredUser): PublicUser {
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return rest;
}

// Default admin credentials — overridable via env for secure production logins.
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@trayarunyaventures.com').toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DEFAULT_SUPERADMIN_EMAIL = (
  process.env.SUPERADMIN_EMAIL || 'superadmin@trayarunyaventures.com'
).toLowerCase();
const DEFAULT_SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin123';

/** Seed default admin + superadmin if the store is empty (FS or in-memory). */
function ensureSeeded(): void {
  if (memUsers && memUsers.length > 0) return;
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      const existing = JSON.parse(data);
      if (Array.isArray(existing) && existing.length > 0) return;
    }
  } catch {
    /* fall through to seed */
  }
  const now = new Date().toISOString();
  const seed: StoredUser[] = [
    {
      id: '1',
      email: DEFAULT_ADMIN_EMAIL,
      name: 'Admin User',
      role: 'admin',
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '2',
      email: DEFAULT_SUPERADMIN_EMAIL,
      name: 'Super Admin',
      role: 'superadmin',
      passwordHash: hashPassword(DEFAULT_SUPERADMIN_PASSWORD),
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  writeUsers(seed);
}

try {
  ensureSeeded();
} catch (err) {
  console.error('Error seeding user store:', err);
}

export const userStore = {
  list(): PublicUser[] {
    ensureSeeded();
    return readUsers().map(toPublic);
  },

  findByEmail(email: string): StoredUser | null {
    ensureSeeded();
    const e = email.trim().toLowerCase();
    return readUsers().find((u) => u.email.toLowerCase() === e) || null;
  },

  findById(id: string): StoredUser | null {
    ensureSeeded();
    return readUsers().find((u) => u.id === id) || null;
  },

  create(input: {
    email: string;
    name: string;
    password: string;
    role: Role;
  }): PublicUser {
    ensureSeeded();
    const users = readUsers();
    const email = input.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('A user with this email already exists');
    }
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email,
      name: input.name.trim(),
      role: input.role,
      passwordHash: hashPassword(input.password),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    writeUsers(users);
    return toPublic(user);
  },

  update(
    id: string,
    patch: { name?: string; role?: Role; password?: string; active?: boolean }
  ): PublicUser {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    const user = users[idx];
    if (patch.name !== undefined) user.name = patch.name.trim();
    if (patch.role !== undefined) user.role = patch.role;
    if (patch.active !== undefined) user.active = patch.active;
    if (patch.password) user.passwordHash = hashPassword(patch.password);
    user.updatedAt = new Date().toISOString();
    users[idx] = user;
    writeUsers(users);
    return toPublic(user);
  },

  delete(id: string): void {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    users.splice(idx, 1);
    writeUsers(users);
  },
};
