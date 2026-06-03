/**
 * Durable store for AI-generated decks & proposals.
 * Backed by Vercel Blob in production (shared across all serverless instances)
 * and a local data/ file in dev — see blobStore.ts.
 */
import type { Proposal, ProposalSummary } from '@/lib/proposalTypes';
import { readJson, writeJson } from '@/lib/blobStore';

const KEY = 'proposals.json';

function readAll(): Promise<Proposal[]> {
  return readJson<Proposal[]>(KEY, []);
}

function writeAll(items: Proposal[]): Promise<void> {
  return writeJson(KEY, items);
}

function summary(p: Proposal): ProposalSummary {
  const brand = (p.spec as { brand?: import('@/lib/proposalTypes').BrandTheme } | undefined)?.brand;
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    client: p.client,
    createdAt: p.createdAt,
    createdBy: p.createdBy,
    leadId: p.leadId,
    ...(brand && brand.primary ? { brand } : {}),
  };
}

export const proposalStore = {
  async list(): Promise<ProposalSummary[]> {
    const items = await readAll();
    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(summary);
  },

  async get(id: string): Promise<Proposal | null> {
    const items = await readAll();
    return items.find((p) => p.id === id) || null;
  },

  async save(input: Omit<Proposal, 'id' | 'createdAt'> & { id?: string }): Promise<Proposal> {
    const items = await readAll();
    const now = new Date().toISOString();
    if (input.id) {
      const idx = items.findIndex((p) => p.id === input.id);
      if (idx !== -1) {
        const updated: Proposal = { ...items[idx], ...input, id: input.id, createdAt: items[idx].createdAt };
        items[idx] = updated;
        await writeAll(items);
        return updated;
      }
    }
    const created: Proposal = {
      ...input,
      id: input.id || `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
    };
    items.push(created);
    await writeAll(items);
    return created;
  },

  async delete(id: string): Promise<boolean> {
    const items = await readAll();
    const next = items.filter((p) => p.id !== id);
    if (next.length === items.length) return false;
    await writeAll(next);
    return true;
  },
};
