import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to your MarketiQ AI workspace.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
