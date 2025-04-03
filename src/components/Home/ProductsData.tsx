'use client';

import React from 'react';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import InsightsIcon from '@mui/icons-material/Insights';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

export interface Product {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  link: string;
  features: string[];
  dashboard: {
    metrics: Array<{
      label: string;
      value: string;
      change: number;
      isPositive: boolean;
    }>;
    candidates?: Array<{
      name: string;
      position: string;
      matchScore: number;
      status: string;
      skills: string[];
    }>;
    trends?: Array<{
      name: string;
      growth: number;
      forecast: string;
    }>;
    procedures?: Array<{
      code: string;
      description: string;
      confidence: number;
    }>;
  };
}

export const products: Product[] = [
  {
    id: 'hiregenix',
    name: 'HireGenix',
    description: 'AI-powered recruitment platform that streamlines hiring processes and matches the right candidates to the right roles.',
    icon: <BusinessCenterIcon sx={{ fontSize: 40 }} />,
    color: '#ffaf06',
    link: '/products/hiregenix',
    features: ['AI Matching', 'Skills Assessment', 'Video Interviews', 'Analytics Dashboard'],
    dashboard: {
      metrics: [
        { label: 'Time-to-Hire', value: '18 days', change: -15, isPositive: true },
        { label: 'Quality-of-Hire', value: '92%', change: 8, isPositive: true },
        { label: 'Cost Savings', value: '32%', change: 5, isPositive: true },
      ],
      candidates: [
        {
          name: 'Emily Johnson',
          position: 'Senior Developer',
          matchScore: 92,
          status: 'Interview',
          skills: ['React', 'Node.js', 'TypeScript']
        },
        {
          name: 'Michael Chen',
          position: 'Product Manager',
          matchScore: 88,
          status: 'Assessment',
          skills: ['Strategy', 'Agile', 'UX']
        }
      ]
    }
  },
  {
    id: 'marketiq',
    name: 'MarketIQ',
    description: 'Market intelligence solution that provides real-time insights and analytics to help businesses make data-driven decisions.',
    icon: <InsightsIcon sx={{ fontSize: 40 }} />,
    color: '#14bb87',
    link: '/products/marketiq',
    features: ['Trend Analysis', 'Competitor Tracking', 'Market Forecasting', 'Custom Reports'],
    dashboard: {
      metrics: [
        { label: 'Market Insights', value: '1,240+', change: 12, isPositive: true },
        { label: 'Accuracy Rate', value: '96%', change: 3, isPositive: true },
        { label: 'Decision Speed', value: '3.2x', change: 15, isPositive: true },
      ],
      trends: [
        { name: 'Consumer Electronics', growth: 68, forecast: 'Growing' },
        { name: 'Renewable Energy', growth: 92, forecast: 'Booming' },
        { name: 'Traditional Retail', growth: 23, forecast: 'Declining' }
      ]
    }
  },
  {
    id: 'medcodex',
    name: 'MedCodeX',
    description: 'AI medical coding platform that automates and optimizes the medical coding process for healthcare providers.',
    icon: <MedicalServicesIcon sx={{ fontSize: 40 }} />,
    color: '#d92c4a',
    link: '/products/medcodex',
    features: ['Automated Coding', 'Compliance Checks', 'Audit Support', 'Integration APIs'],
    dashboard: {
      metrics: [
        { label: 'Coding Accuracy', value: '99.2%', change: 7, isPositive: true },
        { label: 'Processing Time', value: '-82%', change: 82, isPositive: true },
        { label: 'Claim Denials', value: '-65%', change: 65, isPositive: true },
      ],
      procedures: [
        { code: 'E11.9', description: 'Type 2 diabetes without complications', confidence: 98 },
        { code: 'I10', description: 'Essential (primary) hypertension', confidence: 99 },
        { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', confidence: 97 }
      ]
    }
  },
];
