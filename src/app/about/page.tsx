import type { Metadata } from 'next';
import AboutView from '@/components/About/AboutView';

export const metadata: Metadata = {
  title: 'About — Your B2B Growth Partner | Trayarunya Ventures',
  description:
    'Trayarunya Ventures is a B2B growth partner that owns your marketing outcomes — built so founders get a partner, not a vendor. LinkedIn-led high-ticket pipeline.',
};

export default function AboutPage() {
  return <AboutView />;
}
