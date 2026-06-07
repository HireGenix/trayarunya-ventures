/**
 * Store for internal AI assistant conversations — Azure Postgres (Prisma).
 * Messages are kept inline as a JSON array on the conversation row.
 */
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { Provider } from '@/lib/aiProviders';

export interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

export interface Conversation {
  id: string;
  title: string;
  provider: Provider;
  messages: ConvMessage[];
  createdAt: string;
  updatedAt: string;
}

/** Lightweight summary for the sidebar list. */
export type ConversationSummary = Pick<
  Conversation,
  'id' | 'title' | 'provider' | 'createdAt' | 'updatedAt'
>;

interface Row {
  id: string;
  userId: string;
  title: string;
  provider: string;
  messages: unknown;
  createdAt: string;
  updatedAt: string;
}

function toConv(row: Row): Conversation {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider as Provider,
    messages: (row.messages as ConvMessage[]) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function summary(c: Conversation): ConversationSummary {
  return {
    id: c.id,
    title: c.title,
    provider: c.provider,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export const conversationStore = {
  async list(userId: string): Promise<ConversationSummary[]> {
    const rows = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toConv).map(summary);
  },

  async get(userId: string, id: string): Promise<Conversation | null> {
    const row = await prisma.conversation.findUnique({ where: { id } });
    if (!row || row.userId !== userId) return null;
    return toConv(row);
  },

  /** Create or replace a conversation (upsert by id). */
  async save(
    userId: string,
    conv: { id?: string; title?: string; provider: Provider; messages: ConvMessage[] }
  ): Promise<Conversation> {
    const now = new Date().toISOString();
    const firstUser = conv.messages.find((m) => m.role === 'user');
    const derivedTitle =
      conv.title?.trim() ||
      (firstUser ? firstUser.content.slice(0, 60).trim() : 'New chat') ||
      'New chat';
    const messages = conv.messages as unknown as Prisma.InputJsonValue;

    if (conv.id) {
      const existing = await prisma.conversation.findUnique({ where: { id: conv.id } });
      if (existing && existing.userId === userId) {
        const updated = await prisma.conversation.update({
          where: { id: conv.id },
          data: { title: derivedTitle, provider: conv.provider, messages, updatedAt: now },
        });
        return toConv(updated);
      }
    }

    const created = await prisma.conversation.create({
      data: {
        id: conv.id || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        title: derivedTitle,
        provider: conv.provider,
        messages,
        createdAt: now,
        updatedAt: now,
      },
    });
    return toConv(created);
  },

  async delete(userId: string, id: string): Promise<void> {
    const existing = await prisma.conversation.findUnique({ where: { id } });
    if (existing && existing.userId === userId) {
      await prisma.conversation.delete({ where: { id } });
    }
  },

  /** Total number of conversations across all users (for admin dashboard stats). */
  async countAll(): Promise<number> {
    try {
      return await prisma.conversation.count();
    } catch {
      return 0;
    }
  },
};
