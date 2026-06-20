import Script from 'next/script';

const GA_MEASUREMENT_ID = 'G-2EHX7DYWWG';

/**
 * Scopes the MarketiQ Google tag (gtag.js) to the /marketiq route only — a nested
 * layout applies to this segment and its children, so the tag never loads on the
 * rest of the Trayarunya Ventures site.
 */
export default function MarketiqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-marketiq" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
      {children}
    </>
  );
}
