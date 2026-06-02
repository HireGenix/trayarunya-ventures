/**
 * Server-only file-based store for AI-generated decks & proposals.
 * Stored at data/proposals.json. Follows the Vercel read-only-FS resilience
 * pattern: in-memory fallback + guarded writes (never throws on EROFS).
 */
import fs from 'fs';
import path from 'path';
import type { Proposal, ProposalSummary } from '@/lib/proposalTypes';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'proposals.json');

// In-memory fallback for read-only filesystems (e.g. Vercel serverless).
let mem: Proposal[] | null = null;

function ensure() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');
  } catch {
    /* read-only fs — fall back to memory */
  }
}

function readAll(): Proposal[] {
  if (mem) return mem;
  ensure();
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as Proposal[];
  } catch {
    return mem ?? [];
  }
}

function writeAll(items: Proposal[]) {
  mem = items;
  try {
    ensure();
    fs.writeFileSync(FILE, JSON.stringify(items, null, 2));
    mem = null;
  } catch {
    /* serverless read-only fs — keep in memory */
  }
}

function summary(p: Proposal): ProposalSummary {
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    client: p.client,
    createdAt: p.createdAt,
    createdBy: p.createdBy,
    leadId: p.leadId,
  };
}

export const proposalStore = {
  list(): ProposalSummary[] {
    return readAll()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(summary);
  },

  get(id: string): Proposal | null {
    return readAll().find((p) => p.id === id) || null;
  },

  save(input: Omit<Proposal, 'id' | 'createdAt'> & { id?: string }): Proposal {
    const items = readAll();
    const now = new Date().toISOString();
    if (input.id) {
      const idx = items.findIndex((p) => p.id === input.id);
      if (idx !== -1) {
        const updated: Proposal = { ...items[idx], ...input, id: input.id, createdAt: items[idx].createdAt };
        items[idx] = updated;
        writeAll(items);
        return updated;
      }
    }
    const created: Proposal = {
      ...input,
      id: input.id || `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
    };
    items.push(created);
    writeAll(items);
    return created;
  },

  delete(id: string): boolean {
    const items = readAll();
    const next = items.filter((p) => p.id !== id);
    if (next.length === items.length) return false;
    writeAll(next);
    return true;
  },
};
