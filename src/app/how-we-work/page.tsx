import type { Metadata } from 'next';
import HowWeWorkPage from '@/components/HowWeWork/HowWeWorkPage';

export const metadata: Metadata = {
  title: 'How We Work — The Partnership Model | Trayarunya Ventures',
  description:
    'Inside our partner-not-vendor model: how we absorb your pain, build the strategy as our own, and execute a LinkedIn-led growth engine end-to-end.',
};

export default function Page() {
  return <HowWeWorkPage />;
}
