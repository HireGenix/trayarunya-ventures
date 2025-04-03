// Lead management types
import { ReactNode } from 'react';

export interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  message?: string;
  source: LeadSource;
  status: LeadStatus;
  date: string;
  lastContactedDate?: string;
  notes?: string[];
  tags?: string[];
  assignedTo?: string;
  priority: LeadPriority;
  formType?: string; // Type of form the lead came from (e.g., "Contact Form", "Newsletter", "Demo Request")
  formData?: Record<string, any>; // Additional data captured from the form
  pageUrl?: string; // URL of the page where the form was submitted
}

export type LeadSource = 
  | 'Website Contact Form'
  | 'Newsletter Signup'
  | 'Demo Request'
  | 'Webinar Registration'
  | 'Event'
  | 'Referral'
  | 'Social Media'
  | 'Email Campaign'
  | 'Other';

export type LeadStatus = 
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Won'
  | 'Lost'
  | 'On Hold';

export type LeadPriority = 
  | 'Low'
  | 'Medium'
  | 'High';

export interface LeadNote {
  id: string;
  leadId: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface LeadFilter {
  status?: LeadStatus[];
  source?: LeadSource[];
  priority?: LeadPriority[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface LeadStats {
  total: number;
  newLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  averageResponseTime: number;
  leadsBySource: {
    source: LeadSource;
    count: number;
    percentage: number;
  }[];
  leadsByStatus: {
    status: LeadStatus;
    count: number;
    percentage: number;
  }[];
  leadTrend: {
    date: string;
    count: number;
  }[];
}
