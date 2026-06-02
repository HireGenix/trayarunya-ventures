import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Trayarunya Ventures — Your B2B Growth Partner | LinkedIn Lead Gen for High-Ticket Sales',
  description:
    "Trayarunya Ventures isn't your agency — we're your marketing partner. We own your pain points, strategize like the business is ours, and execute a B2B growth engine that turns LinkedIn into high-ticket pipeline.",
  keywords: [
    'B2B marketing partner',
    'LinkedIn lead generation',
    'high-ticket sales',
    'B2B demand generation',
    'LinkedIn marketing agency',
    'personal branding',
    'fractional CMO',
  ],
  openGraph: {
    title: 'Trayarunya Ventures — Your B2B Growth Partner',
    description:
      'We don\'t take clients. We take partners. A B2B growth engine that turns LinkedIn into high-ticket pipeline.',
    type: 'website',
  },
  icons: {
    icon: '/1731405605898.jpg',
    apple: '/1731405605898.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/1731405605898.jpg" />
      </head>
      <body className={poppins.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
