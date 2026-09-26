import type { Metadata } from 'next';
import ServicesOverview from '@/components/Services/ServicesOverview';

export const metadata: Metadata = {
  title: 'AI-Powered Digital Marketing Services | Trayarunya Ventures',
  description:
    'Full-funnel digital marketing powered by MarketiQ AI: AI GTM strategy, performance marketing, SEO & AI search, social media & content, brand & web, automation and CRO.',
};

export default function ServicesPage() {
  return <ServicesOverview />;
}
