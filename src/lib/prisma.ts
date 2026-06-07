/**
 * Singleton PrismaClient — avoids exhausting Postgres connections on serverless
 * (Next.js dev/HMR and Vercel lambdas reuse the same instance per warm process).
 * NEVER import into a client component.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
