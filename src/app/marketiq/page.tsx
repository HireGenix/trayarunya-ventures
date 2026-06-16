'use client';

import { Box } from '@mui/material';

import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { DAY } from '@/components/marketing/primitives';
import Hero from '@/components/marketing/sections/Hero';
import Pipeline from '@/components/marketing/sections/Pipeline';
import WhyMarketiq from '@/components/marketing/sections/WhyMarketiq';
import DeepDives from '@/components/marketing/sections/DeepDives';
import Modules from '@/components/marketing/sections/Modules';
import RoiCalculator from '@/components/marketing/sections/RoiCalculator';
import Decks from '@/components/marketing/sections/Decks';
import Apps from '@/components/marketing/sections/Apps';
import { Faq, FinalCta, Pricing, Segments, StatsBand } from '@/components/marketing/sections/Conversion';
import Security from '@/components/marketing/sections/Security';

/**
 * MarketiQ AI ads landing page (hosted on the Trayarunya Ventures site) — an
 * exact copy of the MarketiQ marketing site, with every CTA routed to
 * https://mymarketiq.online.
 */
export default function MarketiqLanding() {
  return (
    <Box sx={{ bgcolor: DAY.bg, color: DAY.text, overflowX: 'hidden' }}>
      <MarketingNav />
      <Hero />
      <Pipeline />
      <WhyMarketiq />
      <DeepDives />
      <Modules />
      <RoiCalculator />
      <Decks />
      <Apps />
      <Segments />
      <StatsBand />
      <Security />
      <Pricing />
      <Faq />
      <FinalCta />
      <MarketingFooter />
    </Box>
  );
}
