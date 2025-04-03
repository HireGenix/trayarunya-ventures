// SEO API Service
import { PageMetric, KeywordRanking, SEOIssue, SEOOverviewStats } from './types';

// Base API URL - replace with your actual API endpoint
const API_BASE_URL = '/api/seo';

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
    const token = localStorage.getItem('auth_token');
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

// Get SEO overview statistics
export async function getSEOOverviewStats(): Promise<SEOOverviewStats> {
  return fetchAPI<SEOOverviewStats>('/overview');
}

// Get page metrics
export async function getPageMetrics(): Promise<PageMetric[]> {
  return fetchAPI<PageMetric[]>('/pages');
}

// Get keyword rankings
export async function getKeywordRankings(): Promise<KeywordRanking[]> {
  return fetchAPI<KeywordRanking[]>('/keywords');
}

// Get SEO issues
export async function getSEOIssues(): Promise<SEOIssue[]> {
  return fetchAPI<SEOIssue[]>('/issues');
}

// Update page SEO metadata
export async function updatePageSEO(pageId: number, data: Partial<PageMetric>): Promise<PageMetric> {
  return fetchAPI<PageMetric>(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Fix SEO issue
export async function fixSEOIssue(issueId: number): Promise<SEOIssue> {
  return fetchAPI<SEOIssue>(`/issues/${issueId}/fix`, {
    method: 'POST',
  });
}

// Refresh SEO analysis
export async function refreshSEOAnalysis(): Promise<{ success: boolean; message: string }> {
  return fetchAPI<{ success: boolean; message: string }>('/refresh', {
    method: 'POST',
  });
}

// Empty state data for when no SEO data is available
export const emptyState = {
  seoOverviewStats: {
    overallScore: 0,
    pagesIndexed: 0,
    totalPages: 0,
    activeIssues: {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      recentlyFixed: 0,
    },
    keywords: {
      total: 0,
      improved: 0,
      topTen: 0,
    },
  } as SEOOverviewStats,
  
  pageMetrics: [] as PageMetric[],
  keywordRankings: [] as KeywordRanking[],
  seoIssues: [] as SEOIssue[]
};

// Export SEO data to CSV
export async function exportSEODataToCsv(dataType: 'pages' | 'keywords' | 'issues'): Promise<string> {
  try {
    return fetchAPI<string>(`/export/${dataType}`, {}, 30000); // Longer timeout for export
  } catch (error) {
    console.error(`Error exporting SEO ${dataType} to CSV:`, error);
    throw error;
  }
}

// Run SEO audit
export async function runSEOAudit(): Promise<{ success: boolean; message: string }> {
  try {
    return fetchAPI<{ success: boolean; message: string }>('/audit', {
      method: 'POST',
    }, 60000); // Longer timeout for audit
  } catch (error) {
    console.error('Error running SEO audit:', error);
    throw error;
  }
}
