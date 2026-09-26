import type { Metadata } from 'next';
import HowWeWorkPage from '@/components/HowWeWork/HowWeWorkPage';

export const metadata: Metadata = {
  title: 'How We Work — Strategists + MarketiQ AI | Trayarunya Ventures',
  description:
    'How our senior strategists and MarketiQ AI — our own agentic GTM platform — research, plan, execute and optimise full-funnel digital marketing.',
};

export default function Page() {
  return <HowWeWorkPage />;
}
