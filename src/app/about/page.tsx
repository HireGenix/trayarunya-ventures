import type { Metadata } from 'next';
import AboutView from '@/components/About/AboutView';

export const metadata: Metadata = {
  title: 'About — AI-Powered Digital Marketing Agency | Trayarunya Ventures',
  description:
    'Trayarunya Ventures is the most advanced AI-powered digital marketing agency, powered by MarketiQ AI — our own GTM agentic AI platform — and trusted by 50+ global clients across industries.',
};

export default function AboutPage() {
  return <AboutView />;
}
