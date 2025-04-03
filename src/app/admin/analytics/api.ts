// Analytics API Service
import {
  AnalyticsOverview,
  TrafficSource,
  PagePerformance,
  DeviceData,
  BrowserData,
  CountryData,
  TimeSeriesData,
  ConversionData,
  UserJourney,
  EventData
} from './types';

// Base API URL - replace with your actual API endpoint
const API_BASE_URL = '/api/analytics';

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

// Get analytics overview
export async function getAnalyticsOverview(timeframe: string): Promise<AnalyticsOverview> {
  return fetchAPI<AnalyticsOverview>(`/overview?timeframe=${timeframe}`);
}

// Get traffic sources
export async function getTrafficSources(timeframe: string): Promise<TrafficSource[]> {
  return fetchAPI<TrafficSource[]>(`/traffic-sources?timeframe=${timeframe}`);
}

// Get page performance data
export async function getPagePerformance(timeframe: string): Promise<PagePerformance[]> {
  return fetchAPI<PagePerformance[]>(`/pages?timeframe=${timeframe}`);
}

// Get device data
export async function getDeviceData(timeframe: string): Promise<DeviceData[]> {
  return fetchAPI<DeviceData[]>(`/devices?timeframe=${timeframe}`);
}

// Get browser data
export async function getBrowserData(timeframe: string): Promise<BrowserData[]> {
  return fetchAPI<BrowserData[]>(`/browsers?timeframe=${timeframe}`);
}

// Get country data
export async function getCountryData(timeframe: string): Promise<CountryData[]> {
  return fetchAPI<CountryData[]>(`/countries?timeframe=${timeframe}`);
}

// Get time series data
export async function getTimeSeriesData(timeframe: string): Promise<TimeSeriesData[]> {
  return fetchAPI<TimeSeriesData[]>(`/time-series?timeframe=${timeframe}`);
}

// Get conversion data
export async function getConversionData(timeframe: string): Promise<ConversionData[]> {
  return fetchAPI<ConversionData[]>(`/conversions?timeframe=${timeframe}`);
}

// Get user journey data
export async function getUserJourneys(timeframe: string): Promise<UserJourney[]> {
  return fetchAPI<UserJourney[]>(`/user-journeys?timeframe=${timeframe}`);
}

// Get event data
export async function getEventData(timeframe: string): Promise<EventData[]> {
  return fetchAPI<EventData[]>(`/events?timeframe=${timeframe}`);
}

// Export data to CSV
export async function exportAnalyticsData(type: string, timeframe: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/export?type=${type}&timeframe=${timeframe}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'An error occurred while exporting data');
  }

  return response.blob();
}

// Empty state data for when no analytics data is available
export const emptyState = {
  analyticsOverview: {
    totalVisitors: 0,
    uniqueVisitors: 0,
    pageViews: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    conversionRate: 0,
    timeframe: 'month' as 'today' | 'yesterday' | 'week' | 'month' | 'year'
  } as AnalyticsOverview,
  
  trafficSources: [] as TrafficSource[],
  pagePerformance: [] as PagePerformance[],
  deviceData: [] as DeviceData[],
  browserData: [] as BrowserData[],
  countryData: [] as CountryData[],
  timeSeriesData: [] as TimeSeriesData[],
  conversionData: [] as ConversionData[],
  userJourneys: [] as UserJourney[],
  eventData: [] as EventData[]
};

// Generate empty time series data for a given timeframe
export function generateEmptyTimeSeriesData(timeframe: string): TimeSeriesData[] {
  const data: TimeSeriesData[] = [];
  const now = new Date();
  let days = 30; // Default for month
  
  switch(timeframe) {
    case 'today':
      days = 1;
      break;
    case 'yesterday':
      days = 1;
      break;
    case 'week':
      days = 7;
      break;
    case 'month':
      days = 30;
      break;
    case 'year':
      days = 365;
      break;
  }
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      visitors: 0,
      pageViews: 0
    });
  }
  
  return data;
}
