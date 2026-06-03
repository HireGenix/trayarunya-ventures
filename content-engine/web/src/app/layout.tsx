import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Trayarunya Content Engine',
  description:
    'The agentic content & ads operating system — research, strategy, creation, publishing and learning in one closed loop.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
