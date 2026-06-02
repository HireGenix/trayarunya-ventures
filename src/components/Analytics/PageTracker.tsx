'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * First-party pageview tracker. Sends a lightweight beacon to /api/track on
 * every route change (admin routes are excluded). No cookies, no third parties.
 */
function getId(key: string, store: Storage): string {
  try {
    let id = store.getItem(key);
    if (!id) {
      id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      store.setItem(key, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export default function PageTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const visitorId = getId('tv_visitor', localStorage);
    const sessionId = getId('tv_session', sessionStorage);

    const payload = {
      type: 'pageview' as const,
      path: pathname,
      title: typeof document !== 'undefined' ? document.title : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      sessionId,
      visitorId,
    };

    const url = '/api/track';
    try {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* ignore tracking failures */
    }
  }, [pathname]);

  return null;
}
