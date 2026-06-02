import type { Metadata } from 'next';
import ServicesOverview from '@/components/Services/ServicesOverview';

export const metadata: Metadata = {
  title: 'B2B Marketing Services | Trayarunya Ventures',
  description:
    'A complete B2B growth engine: LinkedIn lead generation, demand generation, personal branding, content, paid ads and fractional CMO leadership — all owned end-to-end.',
};

export default function ServicesPage() {
  return <ServicesOverview />;
}
