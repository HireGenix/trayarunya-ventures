// Analytics Types

export interface AnalyticsOverview {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
  timeframe: 'today' | 'yesterday' | 'week' | 'month' | 'year';
}

export interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
  change: number;
}

export interface PagePerformance {
  path: string;
  title: string;
  views: number;
  uniqueViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
}

export interface DeviceData {
  device: 'desktop' | 'mobile' | 'tablet';
  sessions: number;
  percentage: number;
}

export interface BrowserData {
  browser: string;
  sessions: number;
  percentage: number;
}

export interface CountryData {
  country: string;
  code: string;
  sessions: number;
  percentage: number;
}

export interface TimeSeriesData {
  date: string;
  visitors: number;
  pageViews: number;
}

export interface ConversionData {
  goal: string;
  completions: number;
  conversionRate: number;
  value: number;
}

export interface UserJourney {
  path: string[];
  frequency: number;
  conversionRate: number;
}

export interface EventData {
  name: string;
  count: number;
  uniqueUsers: number;
  category: string;
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface TimeframeOption {
  label: string;
  value: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
}
