/**
 * Leads data access — backed by Azure Postgres via Prisma.
 * Preserves the original Prisma-like API the routes already depend on.
 */
import { Lead, LeadStatus } from '@/app/admin/leads/types';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

function toLead(row: unknown): Lead {
  return row as Lead;
}

export const db = {
  leads: {
    create: async (data: Omit<Lead, 'id'>): Promise<Lead> => {
      const created = await prisma.lead.create({
        data: {
          id: `lead_${Date.now()}`,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          position: data.position,
          message: data.message,
          source: data.source,
          status: data.status,
          date: data.date,
          lastContactedDate: data.lastContactedDate,
          notes: data.notes ?? [],
          tags: data.tags ?? [],
          assignedTo: data.assignedTo,
          priority: data.priority,
          formType: data.formType,
          formData: (data.formData ?? undefined) as Prisma.InputJsonValue | undefined,
          pageUrl: data.pageUrl,
        },
      });
      return toLead(created);
    },

    findMany: async (
      options: {
        take?: number;
        skip?: number;
        where?: { status?: LeadStatus; search?: string };
        orderBy?: { [key: string]: 'asc' | 'desc' };
      } = {}
    ): Promise<Lead[]> => {
      const where: Prisma.LeadWhereInput = {};
      if (options.where?.status) where.status = options.where.status;
      if (options.where?.search) {
        const q = options.where.search;
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { company: { contains: q, mode: 'insensitive' } },
          { message: { contains: q, mode: 'insensitive' } },
        ];
      }

      const orderBy = (options.orderBy
        ? options.orderBy
        : { date: 'desc' }) as Prisma.LeadOrderByWithRelationInput;

      const rows = await prisma.lead.findMany({
        where,
        orderBy,
        take: options.take,
        skip: options.skip,
      });
      return rows.map(toLead);
    },

    findUnique: async (options: { where: { id: string } }): Promise<Lead | null> => {
      const row = await prisma.lead.findUnique({ where: { id: options.where.id } });
      return row ? toLead(row) : null;
    },

    update: async (options: { where: { id: string }; data: Partial<Lead> }): Promise<Lead> => {
      const { id, ...rest } = options.data as Partial<Lead> & { id?: string };
      void id;
      const row = await prisma.lead.update({
        where: { id: options.where.id },
        data: {
          ...rest,
          notes: rest.notes ?? undefined,
          tags: rest.tags ?? undefined,
          formData: (rest.formData ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
      return toLead(row);
    },

    delete: async (options: { where: { id: string } }): Promise<Lead> => {
      const row = await prisma.lead.delete({ where: { id: options.where.id } });
      return toLead(row);
    },

    count: async (options: { where?: { status?: LeadStatus } } = {}): Promise<number> => {
      return prisma.lead.count({
        where: options.where?.status ? { status: options.where.status } : undefined,
      });
    },

    getStats: async (): Promise<{
      total: number;
      newLeads: number;
      qualifiedLeads: number;
      conversionRate: number;
      averageResponseTime: number;
      leadsBySource: { source: string; count: number }[];
      leadsByStatus: { status: string; count: number }[];
      leadTrend: { date: string; count: number }[];
    }> => {
      const leads = (await prisma.lead.findMany()).map(toLead);

      const newLeadsCount = leads.filter((l) => l.status === 'New').length;
      const qualifiedLeadsCount = leads.filter((l) => l.status === 'Qualified').length;
      const convertedLeadsCount = leads.filter((l) => l.status === 'Won').length;

      const conversionRate =
        leads.length > 0 ? Math.round((convertedLeadsCount / leads.length) * 100) : 0;
      const averageResponseTime = 4.5;

      const sourceMap = new Map<string, number>();
      leads.forEach((l) => sourceMap.set(l.source, (sourceMap.get(l.source) || 0) + 1));
      const leadsBySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }));

      const statusMap = new Map<string, number>();
      leads.forEach((l) => statusMap.set(l.status, (statusMap.get(l.status) || 0) + 1));
      const leadsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

      const dateMap = new Map<string, number>();
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dateMap.set(date.toISOString().split('T')[0], 0);
      }
      leads.forEach((l) => {
        const d = new Date(l.date).toISOString().split('T')[0];
        if (dateMap.has(d)) dateMap.set(d, (dateMap.get(d) || 0) + 1);
      });
      const leadTrend = Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));

      return {
        total: leads.length,
        newLeads: newLeadsCount,
        qualifiedLeads: qualifiedLeadsCount,
        conversionRate,
        averageResponseTime,
        leadsBySource,
        leadsByStatus,
        leadTrend,
      };
    },
  },
};
