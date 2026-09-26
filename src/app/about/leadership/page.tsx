import type { Metadata } from 'next';
import LeadershipView from '@/components/About/LeadershipView';

export const metadata: Metadata = {
  title: 'Leadership | Trayarunya Ventures',
  description:
    'Meet the senior growth strategists and operators who lead AI-powered digital marketing and MarketiQ AI at Trayarunya Ventures.',
};

export default function LeadershipPage() {
  return <LeadershipView />;
}
