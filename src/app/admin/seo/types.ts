// SEO Management Types

export interface PageMetric {
  id: number;
  url: string;
  title: string;
  description: string;
  keywords: string;
  status: 'Optimized' | 'Needs Improvement' | 'Critical';
  score: number;
  issues: number;
}

export interface KeywordRanking {
  keyword: string;
  position: number;
  change: number;
  volume: number;
}

export interface SEOIssue {
  id: number;
  page: string;
  issue: string;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Fixed';
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface SEOOverviewStats {
  overallScore: number;
  pagesIndexed: number;
  totalPages: number;
  activeIssues: {
    total: number;
    high: number;
    medium: number;
    low: number;
    recentlyFixed: number;
  };
  keywords: {
    total: number;
    improved: number;
    topTen: number;
  };
}
