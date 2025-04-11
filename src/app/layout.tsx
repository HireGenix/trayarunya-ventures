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
  title: 'Trayarunya Ventures - AI-Powered SaaS Applications',
  description: 'Trayarunya Ventures builds AI-powered SaaS applications to streamline and enhance business operations. Our innovative solutions help organizations work smarter and achieve more.',
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
