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
  title: 'Trayarunya Ventures — The Most Advanced AI Digital Marketing Agency | Powered by MarketiQ AI',
  description:
    'Trayarunya Ventures is the most advanced AI-powered digital marketing agency, with its own GTM agentic AI platform — MarketiQ AI. Trusted by 50+ global clients across industries for SEO, performance marketing, social, content and GTM strategy.',
  keywords: [
    'AI digital marketing agency',
    'digital marketing agency',
    'MarketiQ AI',
    'agentic AI marketing',
    'GTM platform',
    'performance marketing',
    'SEO and AI search optimisation',
    'social media marketing',
  ],
  openGraph: {
    title: 'Trayarunya Ventures — The Most Advanced AI Digital Marketing Agency',
    description:
      'Powered by MarketiQ AI, our own GTM agentic AI platform. Trusted by 50+ global clients across industries.',
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
