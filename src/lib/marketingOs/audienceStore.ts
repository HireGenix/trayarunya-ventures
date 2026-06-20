/**
 * Audience persistence — Azure Postgres via Prisma. Server-only.
 */
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type {
  Audience,
  AudienceInsights,
  SegmentDefinition,
  SegmentResult,
} from './types';

interface Row {
  id: string;
  name: string;
  description: string;
  definition: unknown;
  snapshot: unknown;
  insights: unknown;
  syncTargets: string[];
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function toAudience(row: Row): Audience {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    definition: row.definition as SegmentDefinition,
    snapshot: (row.snapshot as SegmentResult | null) ?? null,
    insights: (row.insights as AudienceInsights | null) ?? null,
    syncTargets: row.syncTargets ?? [],
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

export const audienceStore = {
  async list(): Promise<Audience[]> {
    const rows = (await prisma.audience.findMany({ orderBy: { updatedAt: 'desc' } })) as unknown as Row[];
    return rows.map(toAudience);
  },

  async get(id: string): Promise<Audience | null> {
    const row = (await prisma.audience.findUnique({ where: { id } })) as unknown as Row | null;
    return row ? toAudience(row) : null;
  },

  async create(input: {
    name: string;
    description?: string;
    definition: SegmentDefinition;
    snapshot?: SegmentResult | null;
    insights?: AudienceInsights | null;
    syncTargets?: string[];
    createdBy: string;
  }): Promise<Audience> {
    const now = new Date().toISOString();
    const row = (await prisma.audience.create({
      data: {
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: input.name,
        description: input.description ?? '',
        definition: json(input.definition),
        snapshot: input.snapshot ? json(input.snapshot) : undefined,
        insights: input.insights ? json(input.insights) : undefined,
        syncTargets: input.syncTargets ?? [],
        status: 'active',
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
      },
    })) as unknown as Row;
    return toAudience(row);
  },

  async update(
    id: string,
    patch: Partial<{
      name: string;
      description: string;
      definition: SegmentDefinition;
      snapshot: SegmentResult | null;
      insights: AudienceInsights | null;
      syncTargets: string[];
      status: string;
    }>,
  ): Promise<Audience> {
    const data: Prisma.AudienceUpdateInput = { updatedAt: new Date().toISOString() };
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.definition !== undefined) data.definition = json(patch.definition);
    if (patch.snapshot !== undefined) data.snapshot = patch.snapshot ? json(patch.snapshot) : Prisma.JsonNull;
    if (patch.insights !== undefined) data.insights = patch.insights ? json(patch.insights) : Prisma.JsonNull;
    if (patch.syncTargets !== undefined) data.syncTargets = patch.syncTargets;
    if (patch.status !== undefined) data.status = patch.status;
    const row = (await prisma.audience.update({ where: { id }, data })) as unknown as Row;
    return toAudience(row);
  },

  async remove(id: string): Promise<void> {
    await prisma.audience.delete({ where: { id } });
  },
};
