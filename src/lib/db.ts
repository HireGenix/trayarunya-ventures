import { Lead, LeadStatus } from '@/app/admin/leads/types';
import { readJson, writeJson } from '@/lib/blobStore';

const KEY = 'leads.json';

// Helper function to read leads (Vercel Blob in prod, local file in dev).
function readLeads(): Promise<Lead[]> {
  return readJson<Lead[]>(KEY, []);
}

// Helper function to persist leads.
function writeLeads(leads: Lead[]): Promise<void> {
  return writeJson(KEY, leads);
}

// Database interface
export const db = {
  leads: {
    // Create a new lead
    create: async (data: Omit<Lead, 'id'>): Promise<Lead> => {
      const leads = await readLeads();
      const newLead: Lead = {
        id: `lead_${Date.now()}`,
        ...data
      };
      leads.push(newLead);
      await writeLeads(leads);
      return newLead;
    },

    // Find many leads with filtering, pagination, and sorting
    findMany: async (options: {
      take?: number;
      skip?: number;
      where?: {
        status?: LeadStatus;
        search?: string;
      };
      orderBy?: {
        [key: string]: 'asc' | 'desc';
      };
    } = {}): Promise<Lead[]> => {
      let leads = await readLeads();

      // Apply filtering
      if (options.where) {
        if (options.where.status) {
          leads = leads.filter(lead => lead.status === options.where?.status);
        }
        if (options.where.search) {
          const search = options.where.search.toLowerCase();
          leads = leads.filter(lead => 
            lead.name.toLowerCase().includes(search) ||
            lead.email.toLowerCase().includes(search) ||
            (lead.company && lead.company.toLowerCase().includes(search)) ||
            (lead.message && lead.message.toLowerCase().includes(search))
          );
        }
      }

      // Apply sorting
      if (options.orderBy) {
        const [field, order] = Object.entries(options.orderBy)[0];
        leads.sort((a, b) => {
          const aValue = a[field as keyof Lead];
          const bValue = b[field as keyof Lead];
          
          if (aValue === undefined || bValue === undefined) {
            return 0;
          }
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return order === 'asc' 
              ? aValue.localeCompare(bValue) 
              : bValue.localeCompare(aValue);
          }
          
          if (aValue < bValue) return order === 'asc' ? -1 : 1;
          if (aValue > bValue) return order === 'asc' ? 1 : -1;
          return 0;
        });
      } else {
        // Default sort by date descending
        leads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      // Apply pagination
      if (options.skip !== undefined) {
        leads = leads.slice(options.skip);
      }
      if (options.take !== undefined) {
        leads = leads.slice(0, options.take);
      }

      return leads;
    },

    // Find a lead by ID
    findUnique: async (options: { where: { id: string } }): Promise<Lead | null> => {
      const leads = await readLeads();
      const lead = leads.find(lead => lead.id === options.where.id);
      return lead || null;
    },

    // Update a lead
    update: async (options: { where: { id: string }, data: Partial<Lead> }): Promise<Lead> => {
      const leads = await readLeads();
      const index = leads.findIndex(lead => lead.id === options.where.id);
      
      if (index === -1) {
        throw new Error(`Lead with ID ${options.where.id} not found`);
      }
      
      const updatedLead = { ...leads[index], ...options.data };
      leads[index] = updatedLead;
      await writeLeads(leads);
      
      return updatedLead;
    },

    // Delete a lead
    delete: async (options: { where: { id: string } }): Promise<Lead> => {
      const leads = await readLeads();
      const index = leads.findIndex(lead => lead.id === options.where.id);
      
      if (index === -1) {
        throw new Error(`Lead with ID ${options.where.id} not found`);
      }
      
      const deletedLead = leads[index];
      leads.splice(index, 1);
      await writeLeads(leads);
      
      return deletedLead;
    },

    // Count leads
    count: async (options: {
      where?: {
        status?: LeadStatus;
      };
    } = {}): Promise<number> => {
      let leads = await readLeads();
      
      if (options.where?.status) {
        leads = leads.filter(lead => lead.status === options.where?.status);
      }
      
      return leads.length;
    },

    // Get lead statistics
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
      const leads = await readLeads();
      
      // Count leads by status
      const newLeadsCount = leads.filter(lead => lead.status === 'New').length;
      const qualifiedLeadsCount = leads.filter(lead => lead.status === 'Qualified').length;
      const convertedLeadsCount = leads.filter(lead => lead.status === 'Won').length;
      
      // Calculate conversion rate
      const conversionRate = leads.length > 0 
        ? Math.round((convertedLeadsCount / leads.length) * 100) 
        : 0;
      
      // Calculate average response time (placeholder)
      const averageResponseTime = 4.5; // In hours
      
      // Count leads by source
      const sourceMap = new Map<string, number>();
      leads.forEach(lead => {
        const source = lead.source;
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      });
      
      const leadsBySource = Array.from(sourceMap.entries()).map(([source, count]) => ({
        source,
        count
      }));
      
      // Count leads by status
      const statusMap = new Map<string, number>();
      leads.forEach(lead => {
        const status = lead.status;
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      
      const leadsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count
      }));
      
      // Calculate lead trend (last 7 days)
      const dateMap = new Map<string, number>();
      const now = new Date();
      
      // Initialize the last 7 days with 0 counts
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateMap.set(dateStr, 0);
      }
      
      // Count leads by date
      leads.forEach(lead => {
        const leadDate = new Date(lead.date).toISOString().split('T')[0];
        if (dateMap.has(leadDate)) {
          dateMap.set(leadDate, (dateMap.get(leadDate) || 0) + 1);
        }
      });
      
      const leadTrend = Array.from(dateMap.entries()).map(([date, count]) => ({
        date,
        count
      }));
      
      return {
        total: leads.length,
        newLeads: newLeadsCount,
        qualifiedLeads: qualifiedLeadsCount,
        conversionRate,
        averageResponseTime,
        leadsBySource,
        leadsByStatus,
        leadTrend
      };
    }
  }
};
