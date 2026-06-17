"use strict";

/**
 * MarketIQ Universal Copilot — Tracking Audit Agent (data layer detection).
 *
 * Detects which marketing / analytics tags are currently installed on the
 * current page by inspecting:
 *   - window.* (gtag, dataLayer, fbq, _linkedin_data_partner_ids, clarity,
 *     hj, Intercom, Segment, rudderanalytics, etc.)
 *   - <script src> URLs in the live DOM
 *   - <img>/<noscript> pixel beacons
 *
 * Returns a normalized AuditReport that the panel renders as a Tracking
 * Health Score with per-script status + remediation suggestions.
 *
 * Surfaced via:
 *   window.TVC.TrackingAudit.audit()  → AuditReport
 *
 * Pure DOM/window inspection — no network, no permissions beyond
 * content-script access. Safe to run on any page.
 */
(() => {
  if (window.TVC && window.TVC.TrackingAudit) return;
  window.TVC = window.TVC || {};

  /** Each entry knows how to detect itself and what it's worth in the score. */
  const TAGS = [
    {
      id: "ga4",
      name: "Google Analytics 4",
      category: "analytics",
      weight: 14,
      detect: () => {
        const w = window;
        const hasGtag = typeof w.gtag === "function";
        const hasDL = Array.isArray(w.dataLayer);
        const ga4Script = matchScript(/googletagmanager\.com\/gtag\/js\?id=G-/i) ||
          matchScript(/googletagmanager\.com\/gtag\/js\?id=AW-/i);
        const dlGa4 = hasDL && (w.dataLayer.find?.((d) => /^G-/.test(d?.["config"] || d?.[1] || "")) ||
          w.dataLayer.some?.((d) => /G-/.test(JSON.stringify(d || "")) && /config/.test(JSON.stringify(d || ""))));
        const id = (ga4Script && (ga4Script.match(/id=(G-[A-Z0-9]+)/i) || [])[1]) || null;
        return { installed: !!(ga4Script || dlGa4 || (hasGtag && hasDL)), id };
      },
      help: "Add the gtag.js snippet from https://analytics.google.com → Admin → Data Streams.",
    },
    {
      id: "gtm",
      name: "Google Tag Manager",
      category: "tag-mgr",
      weight: 16,
      detect: () => {
        const w = window;
        const dl = Array.isArray(w.dataLayer) ? w.dataLayer : [];
        const scr = matchScript(/googletagmanager\.com\/gtm\.js\?id=GTM-/i);
        const nos = !!document.querySelector('noscript iframe[src*="googletagmanager.com/ns.html"]');
        const id = scr?.match(/id=(GTM-[A-Z0-9]+)/i)?.[1]
          || dl.map((d) => JSON.stringify(d || "")).join(" ").match(/(GTM-[A-Z0-9]+)/i)?.[1]
          || (document.querySelector('iframe[src*="ns.html?id=GTM-"]')?.src.match(/id=(GTM-[A-Z0-9]+)/i)?.[1])
          || null;
        return { installed: !!(scr || nos || id), id };
      },
      help: "Install the GTM container snippet from https://tagmanager.google.com — head + noscript both.",
    },
    {
      id: "meta-pixel",
      name: "Meta Pixel",
      category: "ads",
      weight: 12,
      detect: () => {
        const fbq = window.fbq;
        const pixel = matchScript(/connect\.facebook\.net\/[^/]+\/fbevents\.js/i);
        const noscriptPx = !!document.querySelector('noscript img[src*="facebook.com/tr?"]');
        let id = null;
        try {
          if (fbq && fbq.getState) {
            id = (fbq.getState().pixels?.[0]?.id) || null;
          }
        } catch (_) { /* sealed */ }
        return { installed: !!(typeof fbq === "function" || pixel || noscriptPx), id };
      },
      help: "Add the Meta Pixel from https://business.facebook.com/events_manager — head + the noscript img.",
    },
    {
      id: "linkedin-insight",
      name: "LinkedIn Insight Tag",
      category: "ads",
      weight: 10,
      detect: () => {
        const w = window;
        const partnerIds = Array.isArray(w._linkedin_data_partner_ids) ? w._linkedin_data_partner_ids : [];
        const scr = matchScript(/snap\.licdn\.com\/li\.lms-analytics\/insight\.min\.js/i);
        const noscriptPx = !!document.querySelector('noscript img[src*="px.ads.linkedin.com"]');
        return { installed: !!(scr || noscriptPx || partnerIds.length), id: partnerIds[0] || null };
      },
      help: "Add the LinkedIn Insight Tag from https://www.linkedin.com/campaignmanager → Account Assets → Insight Tag.",
    },
    {
      id: "google-ads",
      name: "Google Ads Conversion / Remarketing",
      category: "ads",
      weight: 10,
      detect: () => {
        const aw = matchScript(/googletagmanager\.com\/gtag\/js\?id=AW-/i);
        const dl = Array.isArray(window.dataLayer)
          ? window.dataLayer.map((d) => JSON.stringify(d || "")).join(" ")
          : "";
        const m = aw?.match(/id=(AW-[0-9]+)/i)?.[1] || dl.match(/(AW-[0-9]+)/i)?.[1] || null;
        return { installed: !!(aw || /AW-/.test(dl)), id: m };
      },
      help: "Add a Google Ads Conversion Linker via GTM, or paste the gtag(AW-…) snippet from Google Ads → Tools → Conversions.",
    },
    {
      id: "clarity",
      name: "Microsoft Clarity",
      category: "session",
      weight: 6,
      detect: () => {
        const scr = matchScript(/clarity\.ms\/tag\//i);
        return { installed: !!(typeof window.clarity === "function" || scr) };
      },
      help: "Install Microsoft Clarity from https://clarity.microsoft.com (free heatmaps & session recordings).",
    },
    {
      id: "hotjar",
      name: "Hotjar",
      category: "session",
      weight: 6,
      detect: () => {
        const scr = matchScript(/static\.hotjar\.com\/c\/hotjar-/i);
        return { installed: !!(typeof window.hj === "function" || scr) };
      },
      help: "Install Hotjar from https://hotjar.com → Insights site code (or add via GTM).",
    },
    {
      id: "segment",
      name: "Segment",
      category: "cdp",
      weight: 8,
      detect: () => {
        const a = window.analytics;
        const scr = matchScript(/cdn\.segment\.com\/analytics\.js/i);
        return { installed: !!(a && typeof a.track === "function" && Array.isArray(a.methods)) || !!scr };
      },
      help: "Install Segment from https://segment.com → Connections → Sources → JavaScript.",
    },
    {
      id: "rudderstack",
      name: "RudderStack",
      category: "cdp",
      weight: 6,
      detect: () => {
        const r = window.rudderanalytics;
        const scr = matchScript(/rudderlabs\.com\/v1\/(rudder|rudder-analytics)/i);
        return { installed: !!(r && (typeof r.track === "function" || Array.isArray(r))) || !!scr };
      },
      help: "Install RudderStack from https://app.rudderstack.com → Sources → JavaScript SDK.",
    },
    {
      id: "intercom",
      name: "Intercom",
      category: "support",
      weight: 4,
      detect: () => ({ installed: typeof window.Intercom === "function" }),
      help: "Install Intercom from https://app.intercom.com → Settings → Installation → Web.",
    },
    {
      id: "hubspot",
      name: "HubSpot Tracking",
      category: "crm",
      weight: 6,
      detect: () => ({ installed: typeof window._hsq !== "undefined" || !!matchScript(/js\.hs-scripts\.com\//i) }),
      help: "Add the HubSpot tracking code from https://app.hubspot.com → Settings → Tracking & Analytics → Tracking Code.",
    },
    {
      id: "tiktok-pixel",
      name: "TikTok Pixel",
      category: "ads",
      weight: 4,
      detect: () => ({ installed: typeof window.ttq !== "undefined" || !!matchScript(/analytics\.tiktok\.com\/i18n\/pixel/i) }),
      help: "Add the TikTok Pixel from https://ads.tiktok.com → Events Manager.",
    },
    {
      id: "pinterest-tag",
      name: "Pinterest Tag",
      category: "ads",
      weight: 4,
      detect: () => ({ installed: typeof window.pintrk === "function" || !!matchScript(/s\.pinimg\.com\/ct\/core\.js/i) }),
      help: "Install the Pinterest Tag from https://ads.pinterest.com → Conversions.",
    },
    {
      id: "mixpanel",
      name: "Mixpanel",
      category: "analytics",
      weight: 4,
      detect: () => ({ installed: typeof window.mixpanel?.track === "function" || !!matchScript(/cdn\.mxpnl\.com\/libs\/mixpanel-2\.\d+\.min\.js/i) }),
      help: "Install Mixpanel from https://mixpanel.com → Project Settings.",
    },
    {
      id: "amplitude",
      name: "Amplitude",
      category: "analytics",
      weight: 4,
      detect: () => ({ installed: typeof window.amplitude?.getInstance === "function" || !!matchScript(/cdn\.amplitude\.com/i) }),
      help: "Install Amplitude from https://amplitude.com → Data → Sources.",
    },
    {
      id: "plausible",
      name: "Plausible",
      category: "analytics",
      weight: 2,
      detect: () => ({ installed: typeof window.plausible === "function" || !!matchScript(/plausible\.io\/js\//i) }),
      help: "Add the Plausible snippet from https://plausible.io (privacy-friendly alt to GA4).",
    },
  ];

  /** Find the first <script> whose src matches. Returns the src string or null. */
  function matchScript(regex) {
    const scripts = document.querySelectorAll("script[src]");
    for (const s of scripts) {
      if (regex.test(s.src)) return s.src;
    }
    return null;
  }

  /** Detect duplicate copies of the same tag (a real-world quality bug). */
  function findDuplicates() {
    const counts = {};
    const dups = [];
    document.querySelectorAll("script[src]").forEach((s) => {
      // Strip query string so the same tag with different cache busters collapses.
      const key = (s.src || "").split("?")[0];
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    for (const [src, n] of Object.entries(counts)) {
      if (n > 1) dups.push({ src, count: n });
    }
    return dups;
  }

  /** Detect potentially missing/broken state — GTM but no GA4, dataLayer but no consumers, etc. */
  function findIssues(report) {
    const issues = [];
    const has = (id) => !!report.tags.find((t) => t.id === id && t.installed);

    if (has("gtm") && !has("ga4")) {
      issues.push({
        severity: "high",
        title: "GTM installed but no GA4 stream found",
        detail: "Your GTM container loaded, but we couldn't find a GA4 Configuration tag firing. Conversions are likely not being measured.",
      });
    }
    if (has("ga4") && !has("google-ads")) {
      issues.push({
        severity: "medium",
        title: "GA4 firing, no Google Ads tag",
        detail: "If you run Google Ads, the AW- conversion tracker should be linked alongside GA4 for full attribution.",
      });
    }
    if (has("meta-pixel") && !document.querySelector('noscript img[src*="facebook.com/tr?"]')) {
      issues.push({
        severity: "low",
        title: "Meta Pixel <noscript> beacon missing",
        detail: "The browser-blocked fallback <noscript><img></noscript> is missing — Meta tracking is incomplete for users with JS off.",
      });
    }
    if (!has("ga4") && !has("plausible") && !has("mixpanel") && !has("amplitude")) {
      issues.push({
        severity: "high",
        title: "No analytics platform detected",
        detail: "You have no way to measure traffic on this page. Install GA4 (or a privacy-friendly alternative like Plausible) before running campaigns.",
      });
    }
    return issues;
  }

  function audit() {
    const detected = TAGS.map((t) => {
      let r = { installed: false };
      try {
        r = t.detect() || r;
      } catch (_) {
        r = { installed: false };
      }
      return {
        id: t.id,
        name: t.name,
        category: t.category,
        weight: t.weight,
        installed: !!r.installed,
        instanceId: r.id || null,
        help: t.help,
      };
    });

    // Score: weighted % of installed coverage among the tags we expect a
    // serious marketing site to have. Ads-only and session tools are
    // "nice-to-have" rather than required — but they still add coverage.
    const totalWeight = TAGS.reduce((sum, t) => sum + t.weight, 0);
    const earned = detected.reduce((sum, t) => sum + (t.installed ? t.weight : 0), 0);
    // Floor score so we don't show "0/100" on a site that has nothing — penalise
    // but reflect that we did succeed at the audit itself.
    const rawScore = Math.round((earned / totalWeight) * 100);
    const score = Math.max(0, Math.min(100, rawScore));

    const duplicates = findDuplicates();
    const report = {
      url: location.href,
      hostname: location.hostname,
      title: document.title,
      score,
      grade: score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D",
      tags: detected,
      installed: detected.filter((t) => t.installed),
      missing: detected.filter((t) => !t.installed),
      duplicates,
      ts: Date.now(),
    };
    report.issues = findIssues(report);
    return report;
  }

  window.TVC.TrackingAudit = { audit, TAGS };
})();
