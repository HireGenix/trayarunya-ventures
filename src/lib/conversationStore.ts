/**
 * Server-only file-based store for internal AI assistant conversations.
 * Stored per-user at data/conversations/<userId>.json.
 *
 * NOTE: serverless filesystems (e.g. Vercel) are ephemeral — resets on redeploy.
 */
import fs from 'fs';
import path from 'path';
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

const DATA_DIR = path.join(process.cwd(), 'data', 'conversations');

function userFile(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

// In-memory fallback for read-only filesystems (e.g. Vercel serverless).
const memConvos = new Map<string, Conversation[]>();

function readAll(userId: string): Conversation[] {
  if (memConvos.has(userId)) return memConvos.get(userId)!;
  try {
    return JSON.parse(fs.readFileSync(userFile(userId), 'utf8'));
  } catch {
    return [];
  }
}

function writeAll(userId: string, conversations: Conversation[]): void {
  memConvos.set(userId, conversations);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(userFile(userId), JSON.stringify(conversations, null, 2));
    memConvos.delete(userId);
  } catch {
    /* read-only fs (serverless) — keep in memory */
  }
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
  list(userId: string): ConversationSummary[] {
    return readAll(userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map(summary);
  },

  get(userId: string, id: string): Conversation | null {
    return readAll(userId).find((c) => c.id === id) || null;
  },

  /** Create or replace a conversation (upsert by id). */
  save(
    userId: string,
    conv: {
      id?: string;
      title?: string;
      provider: Provider;
      messages: ConvMessage[];
    }
  ): Conversation {
    const all = readAll(userId);
    const now = new Date().toISOString();
    const firstUser = conv.messages.find((m) => m.role === 'user');
    const derivedTitle =
      conv.title?.trim() ||
      (firstUser ? firstUser.content.slice(0, 60).trim() : 'New chat') ||
      'New chat';

    if (conv.id) {
      const idx = all.findIndex((c) => c.id === conv.id);
      if (idx !== -1) {
        all[idx] = {
          ...all[idx],
          title: derivedTitle,
          provider: conv.provider,
          messages: conv.messages,
          updatedAt: now,
        };
        writeAll(userId, all);
        return all[idx];
      }
    }

    const created: Conversation = {
      id: conv.id || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: derivedTitle,
      provider: conv.provider,
      messages: conv.messages,
      createdAt: now,
      updatedAt: now,
    };
    all.push(created);
    writeAll(userId, all);
    return created;
  },

  delete(userId: string, id: string): void {
    const all = readAll(userId);
    const next = all.filter((c) => c.id !== id);
    writeAll(userId, next);
  },

  /** Total number of conversations across all users (for admin dashboard stats). */
  countAll(): number {
    try {
      if (!fs.existsSync(DATA_DIR)) return 0;
      return fs
        .readdirSync(DATA_DIR)
        .filter((f) => f.endsWith('.json'))
        .reduce((sum, file) => {
          try {
            const arr = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
            return sum + (Array.isArray(arr) ? arr.length : 0);
          } catch {
            return sum;
          }
        }, 0);
    } catch {
      return 0;
    }
  },
};
