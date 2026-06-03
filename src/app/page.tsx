'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import {
  HeroSection,
  ManifestoSection,
  ProblemSection,
  SegmentsSection,
  HowWeWorkSection,
  GrowthEngineSection,
  ContentEngineSection,
  ServicesSection,
  LinkedInFunnelSection,
  WhyUsSection,
  ProofSection,
  CTASection,
} from '@/components/Home';

export default function HomePage() {
  return (
    <Layout>
      <HeroSection />
      <ManifestoSection />
      <ProblemSection />
      <SegmentsSection />
      <HowWeWorkSection />
      <GrowthEngineSection />
      <ContentEngineSection />
      <ServicesSection />
      <LinkedInFunnelSection />
      <WhyUsSection />
      <ProofSection />
      <CTASection />
    </Layout>
  );
}
