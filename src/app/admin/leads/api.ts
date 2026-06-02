// Leads API Service
import {
  Lead,
  LeadNote,
  LeadFilter,
  LeadStats,
  LeadStatus,
  LeadSource,
  LeadPriority
} from './types';

// Base API URL - replace with your actual API endpoint
const API_BASE_URL = '/api/leads';

// Default timeout for API requests (10 seconds)
const DEFAULT_TIMEOUT = 10000;

// API error class for better error handling
class APIError extends Error {
  status: number;
  data: any;
  
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Helper function for API requests with timeout and error handling
async function fetchAPI<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  timeout: number = DEFAULT_TIMEOUT
): Promise<T> {
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Add authorization token if available
    let token;
    try {
      token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    } catch (e) {
      console.warn('Could not access localStorage:', e);
      token = null;
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    
    // Make the request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: 'same-origin', // Include cookies for same-origin requests
    });
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Parse response
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();
    
    // Handle error responses
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Authentication required. Please log in to access this resource.');
      }
      
      throw new APIError(
        data.message || `API error: ${response.status} ${response.statusText}`,
        response.status,
        data
      );
    }
    
    return data as T;
  } catch (error) {
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Handle different error types
    if (error instanceof APIError) {
      throw error;
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw new APIError('Request timeout', 408);
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new APIError('Network error. Please check your connection.', 0);
    } else {
      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  }
}

// Get all leads with optional filtering
export async function getLeads(filter?: LeadFilter): Promise<Lead[]> {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (filter) {
      // Handle array parameters
      if (filter.status) {
        filter.status.forEach(status => queryParams.append('status', status));
      }
      if (filter.source) {
        filter.source.forEach(source => queryParams.append('source', source));
      }
      if (filter.priority) {
        filter.priority.forEach(priority => queryParams.append('priority', priority));
      }
      
      // Handle date range
      if (filter.dateRange) {
        queryParams.set('startDate', filter.dateRange.start);
        queryParams.set('endDate', filter.dateRange.end);
      }
      
      // Handle search
      if (filter.search) {
        queryParams.set('search', filter.search);
      }
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    // The API returns { leads: Lead[] } so we need to extract the leads property
    const response = await fetchAPI<{ leads: Lead[] }>(`${queryString}`);
    return response.leads || [];
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
}

// Get a single lead by ID
export async function getLead(id: string): Promise<Lead> {
  try {
    if (!id) {
      throw new APIError('Lead ID is required', 400);
    }
    
    return fetchAPI<Lead>(`/${encodeURIComponent(id)}`);
  } catch (error) {
    console.error(`Error fetching lead ${id}:`, error);
    throw error;
  }
}

// Create a new lead
export async function createLead(lead: Omit<Lead, 'id' | 'date'>): Promise<Lead> {
  try {
    // Validate required fields
    if (!lead.name || !lead.email || !lead.source || !lead.status || !lead.priority) {
      throw new APIError('Missing required lead fields', 400);
    }
    
    return fetchAPI<Lead>('', {
      method: 'POST',
      body: JSON.stringify(lead),
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    throw error;
  }
}

// Update an existing lead
export async function updateLead(id: string, lead: Partial<Lead>): Promise<Lead> {
  try {
    if (!id) {
      throw new APIError('Lead ID is required', 400);
    }
    
    return fetchAPI<Lead>(`/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(lead),
    });
  } catch (error) {
    console.error(`Error updating lead ${id}:`, error);
    throw error;
  }
}

// Delete a lead
export async function deleteLead(id: string): Promise<void> {
  try {
    if (!id) {
      throw new APIError('Lead ID is required', 400);
    }

    return fetchAPI<void>(`/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error(`Error deleting lead ${id}:`, error);
    throw error;
  }
}

// Get lead notes
export async function getLeadNotes(leadId: string): Promise<LeadNote[]> {
  try {
    if (!leadId) {
      throw new APIError('Lead ID is required', 400);
    }
    
    return fetchAPI<LeadNote[]>(`/${encodeURIComponent(leadId)}/notes`);
  } catch (error) {
    console.error(`Error fetching notes for lead ${leadId}:`, error);
    throw error;
  }
}

// Add a note to a lead
export async function addLeadNote(leadId: string, note: Omit<LeadNote, 'id' | 'leadId' | 'createdAt'>): Promise<LeadNote> {
  try {
    if (!leadId) {
      throw new APIError('Lead ID is required', 400);
    }
    
    if (!note.content || !note.createdBy) {
      throw new APIError('Note content and creator are required', 400);
    }
    
    return fetchAPI<LeadNote>(`/${encodeURIComponent(leadId)}/notes`, {
      method: 'POST',
      body: JSON.stringify(note),
    });
  } catch (error) {
    console.error(`Error adding note to lead ${leadId}:`, error);
    throw error;
  }
}

// Get lead statistics
export async function getLeadStats(): Promise<LeadStats> {
  try {
    // Since the /stats endpoint might not exist yet, we'll use a fallback
    try {
      return fetchAPI<LeadStats>('/stats');
    } catch (error) {
      // If the endpoint returns 404, return empty stats instead of throwing
      if (error instanceof APIError && error.status === 404) {
        console.warn('Lead stats endpoint not found, using empty stats');
        return emptyState.leadStats;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching lead statistics:', error);
    throw error;
  }
}

// Export leads to CSV
export async function exportLeadsToCsv(filter?: LeadFilter): Promise<string> {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (filter) {
      // Handle array parameters
      if (filter.status) {
        filter.status.forEach(status => queryParams.append('status', status));
      }
      if (filter.source) {
        filter.source.forEach(source => queryParams.append('source', source));
      }
      if (filter.priority) {
        filter.priority.forEach(priority => queryParams.append('priority', priority));
      }
      
      // Handle date range
      if (filter.dateRange) {
        queryParams.set('startDate', filter.dateRange.start);
        queryParams.set('endDate', filter.dateRange.end);
      }
      
      // Handle search
      if (filter.search) {
        queryParams.set('search', filter.search);
      }
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return fetchAPI<string>(`/export/csv${queryString}`, {}, 30000); // Longer timeout for export
  } catch (error) {
    console.error('Error exporting leads to CSV:', error);
    throw error;
  }
}

// Empty state data for when no leads are available
export const emptyState = {
  leads: [] as Lead[],
  leadStats: {
    total: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    averageResponseTime: 0,
    leadsBySource: [],
    leadsByStatus: [],
    leadTrend: []
  } as LeadStats
};
