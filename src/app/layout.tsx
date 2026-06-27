import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';
import PageTracker from '@/components/Analytics/PageTracker';

const GOOGLE_ADS_ID = 'AW-590658811';

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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-ads-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ADS_ID}');
          `}
        </Script>
        <Providers>
          {children}
        </Providers>
        <PageTracker />
      </body>
    </html>
  );
}
