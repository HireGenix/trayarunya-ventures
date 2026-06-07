/**
 * Store for AI-generated decks & proposals — backed by Azure Postgres (Prisma).
 */
import type { Proposal, ProposalSummary, BrandTheme, DeckSpec, ProposalSpec } from '@/lib/proposalTypes';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

function toProposal(row: {
  id: string;
  type: string;
  title: string;
  client: string;
  spec: unknown;
  createdAt: string;
  createdBy: string;
  leadId: string | null;
}): Proposal {
  return {
    id: row.id,
    type: row.type as Proposal['type'],
    title: row.title,
    client: row.client,
    spec: row.spec as DeckSpec | ProposalSpec,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    leadId: row.leadId ?? undefined,
  };
}

function summary(p: Proposal): ProposalSummary {
  const brand = (p.spec as { brand?: BrandTheme } | undefined)?.brand;
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
    const rows = await prisma.proposal.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(toProposal).map(summary);
  },

  async get(id: string): Promise<Proposal | null> {
    const row = await prisma.proposal.findUnique({ where: { id } });
    return row ? toProposal(row) : null;
  },

  async save(input: Omit<Proposal, 'id' | 'createdAt'> & { id?: string }): Promise<Proposal> {
    const now = new Date().toISOString();
    const spec = input.spec as unknown as Prisma.InputJsonValue;

    if (input.id) {
      const existing = await prisma.proposal.findUnique({ where: { id: input.id } });
      if (existing) {
        const updated = await prisma.proposal.update({
          where: { id: input.id },
          data: {
            type: input.type,
            title: input.title,
            client: input.client,
            spec,
            createdBy: input.createdBy,
            leadId: input.leadId,
          },
        });
        return toProposal(updated);
      }
    }

    const created = await prisma.proposal.create({
      data: {
        id: input.id || `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: input.type,
        title: input.title,
        client: input.client,
        spec,
        createdAt: now,
        createdBy: input.createdBy,
        leadId: input.leadId,
      },
    });
    return toProposal(created);
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.proposal.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
