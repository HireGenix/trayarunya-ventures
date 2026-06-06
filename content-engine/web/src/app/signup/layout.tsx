import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start free — Sign up',
  description:
    'Create your MarketiQ AI workspace. Start free with no card, or unlock the full agentic engine with 50% off your first year.',
  alternates: { canonical: '/signup' },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
