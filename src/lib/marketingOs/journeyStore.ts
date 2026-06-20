/**
 * Journey persistence — Azure Postgres via Prisma. Server-only.
 */
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { Journey, JourneyDefinition, JourneyMetrics } from './types';

interface Row {
  id: string;
  name: string;
  goal: string;
  status: string;
  audienceId: string | null;
  definition: unknown;
  metrics: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function toJourney(row: Row): Journey {
  const status = (['draft', 'active', 'paused'] as const).includes(row.status as 'draft')
    ? (row.status as Journey['status'])
    : 'draft';
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    status,
    audienceId: row.audienceId,
    definition: row.definition as JourneyDefinition,
    metrics: (row.metrics as JourneyMetrics | null) ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

export const journeyStore = {
  async list(): Promise<Journey[]> {
    const rows = (await prisma.journey.findMany({ orderBy: { updatedAt: 'desc' } })) as unknown as Row[];
    return rows.map(toJourney);
  },

  async get(id: string): Promise<Journey | null> {
    const row = (await prisma.journey.findUnique({ where: { id } })) as unknown as Row | null;
    return row ? toJourney(row) : null;
  },

  async create(input: {
    name: string;
    goal?: string;
    status?: Journey['status'];
    audienceId?: string | null;
    definition: JourneyDefinition;
    metrics?: JourneyMetrics | null;
    createdBy: string;
  }): Promise<Journey> {
    const now = new Date().toISOString();
    const row = (await prisma.journey.create({
      data: {
        id: `jny_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: input.name,
        goal: input.goal ?? '',
        status: input.status ?? 'draft',
        audienceId: input.audienceId ?? null,
        definition: json(input.definition),
        metrics: input.metrics ? json(input.metrics) : undefined,
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
      },
    })) as unknown as Row;
    return toJourney(row);
  },

  async update(
    id: string,
    patch: Partial<{
      name: string;
      goal: string;
      status: Journey['status'];
      audienceId: string | null;
      definition: JourneyDefinition;
      metrics: JourneyMetrics | null;
    }>,
  ): Promise<Journey> {
    const data: Prisma.JourneyUpdateInput = { updatedAt: new Date().toISOString() };
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.goal !== undefined) data.goal = patch.goal;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.audienceId !== undefined) data.audienceId = patch.audienceId;
    if (patch.definition !== undefined) data.definition = json(patch.definition);
    if (patch.metrics !== undefined) data.metrics = patch.metrics ? json(patch.metrics) : Prisma.JsonNull;
    const row = (await prisma.journey.update({ where: { id }, data })) as unknown as Row;
    return toJourney(row);
  },

  async remove(id: string): Promise<void> {
    await prisma.journey.delete({ where: { id } });
  },
};
