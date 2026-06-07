/**
 * Admin user store — backed by Azure Postgres (Prisma).
 * Passwords hashed with Node's built-in crypto.scrypt (no extra deps).
 */
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

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

function toStored(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}): StoredUser {
  return { ...row, role: row.role === 'superadmin' ? 'superadmin' : 'admin' };
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

let seeded = false;

/** Seed default admin + superadmin once if the table is empty. */
async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      const now = new Date().toISOString();
      await prisma.user.createMany({
        data: [
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
        ],
        skipDuplicates: true,
      });
    }
    seeded = true;
  } catch (err) {
    console.error('Error seeding user store:', err);
  }
}

export const userStore = {
  async list(): Promise<PublicUser[]> {
    await ensureSeeded();
    const rows = await prisma.user.findMany();
    return rows.map(toStored).map(toPublic);
  },

  async findByEmail(email: string): Promise<StoredUser | null> {
    await ensureSeeded();
    const e = email.trim().toLowerCase();
    const row = await prisma.user.findUnique({ where: { email: e } });
    return row ? toStored(row) : null;
  },

  async findById(id: string): Promise<StoredUser | null> {
    await ensureSeeded();
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toStored(row) : null;
  },

  async create(input: { email: string; name: string; password: string; role: Role }): Promise<PublicUser> {
    await ensureSeeded();
    const email = input.email.trim().toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new Error('A user with this email already exists');
    const now = new Date().toISOString();
    const row = await prisma.user.create({
      data: {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        email,
        name: input.name.trim(),
        role: input.role,
        passwordHash: hashPassword(input.password),
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    return toPublic(toStored(row));
  },

  async update(
    id: string,
    patch: { name?: string; role?: Role; password?: string; active?: boolean }
  ): Promise<PublicUser> {
    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (patch.name !== undefined) data.name = patch.name.trim();
    if (patch.role !== undefined) data.role = patch.role;
    if (patch.active !== undefined) data.active = patch.active;
    if (patch.password) data.passwordHash = hashPassword(patch.password);
    try {
      const row = await prisma.user.update({ where: { id }, data });
      return toPublic(toStored(row));
    } catch {
      throw new Error('User not found');
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await prisma.user.delete({ where: { id } });
    } catch {
      throw new Error('User not found');
    }
  },
};
