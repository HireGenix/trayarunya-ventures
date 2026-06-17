"use strict";

/**
 * MarketIQ Universal Copilot — Context Detection Engine.
 *
 * Runs at content-script time on every page. Inspects domain + URL + DOM to
 * decide which "mode" the user is in, so the panel can automatically show the
 * right missions, the right command bar suggestions, and the right system
 * prompt — no manual mode switching required.
 *
 * Exports its result on the shared TVC namespace:
 *   window.TVC.Context.detect()  → { kind, platform, app, page, badge, signals }
 *
 * Mode taxonomy:
 *   linkedin            — any linkedin.com page (profile, company, feed, sales nav, campaign mgr)
 *   ga4                 — analytics.google.com (Google Analytics 4)
 *   gtm                 — tagmanager.google.com (Google Tag Manager)
 *   google-ads          — ads.google.com
 *   meta-ads            — business.facebook.com (Meta Business / Ads)
 *   linkedin-ads        — linkedin.com/campaignmanager
 *   search-console      — search.google.com/search-console
 *   meta-pixel-helper   — facebook.com/business/help (rare; supportive)
 *   hubspot             — app.hubspot.com
 *   salesforce          — *.salesforce.com / lightning.force.com
 *   shopify             — *.myshopify.com / admin.shopify.com
 *   wordpress           — *.wordpress.com / wp-admin paths
 *   webflow             — webflow.com / *.webflow.io
 *   gmail               — mail.google.com
 *   calendly            — calendly.com
 *   yc                  — apply.ycombinator.com / news.ycombinator.com
 *   ms-startup          — foundershub.startups.microsoft.com / partner.microsoft.com
 *   appstore            — appstoreconnect.apple.com / play.google.com/console
 *   website             — fallback: any public website (marketing/landing/ecom/blog)
 *
 * The detector also reports:
 *   signals: small "what's-on-this-page" hints (forms count, CTAs, has Calendly,
 *            has WhatsApp link, has video, etc.) so agents can pre-fill missions
 *            without re-scanning the DOM.
 */
(() => {
  if (window.TVC && window.TVC.Context) return;
  window.TVC = window.TVC || {};

  const HOST_RULES = [
    { test: /(^|\.)linkedin\.com$/i, when: (u) =>
      /\/campaignmanager(\/|$)/i.test(u.pathname) ? "linkedin-ads" : "linkedin" },
    { test: /^analytics\.google\.com$/i, kind: "ga4" },
    { test: /^tagmanager\.google\.com$/i, kind: "gtm" },
    { test: /^ads\.google\.com$/i, kind: "google-ads" },
    { test: /^business\.facebook\.com$/i, kind: "meta-ads" },
    { test: /^(adsmanager|ads)\.facebook\.com$/i, kind: "meta-ads" },
    { test: /^search\.google\.com$/i, when: (u) =>
      /\/search-console/i.test(u.pathname) ? "search-console" : "website" },
    { test: /^app\.hubspot\.com$/i, kind: "hubspot" },
    { test: /\.salesforce\.com$|\.force\.com$/i, kind: "salesforce" },
    { test: /\.myshopify\.com$|^admin\.shopify\.com$/i, kind: "shopify" },
    { test: /^wordpress\.com$|\.wordpress\.com$/i, kind: "wordpress" },
    { test: /^webflow\.com$|\.webflow\.io$/i, kind: "webflow" },
    { test: /^mail\.google\.com$/i, kind: "gmail" },
    { test: /^calendly\.com$/i, kind: "calendly" },
    { test: /^(apply\.|news\.)?ycombinator\.com$/i, kind: "yc" },
    { test: /(^|\.)foundershub\.startups\.microsoft\.com$|^partner\.microsoft\.com$/i, kind: "ms-startup" },
    { test: /^appstoreconnect\.apple\.com$|^play\.google\.com$|^chromewebstore\.google\.com$/i, kind: "appstore" },
  ];

  function detectHost(u) {
    for (const rule of HOST_RULES) {
      if (rule.test.test(u.hostname)) {
        const kind = typeof rule.when === "function" ? rule.when(u) : rule.kind;
        if (kind) return kind;
      }
    }
    // WordPress installs on any domain — check the admin path.
    if (/\/wp-admin(\/|$)/i.test(u.pathname)) return "wordpress";
    return "website";
  }

  function pageType(kind, u) {
    const path = u.pathname.replace(/\/+$/, "");
    if (kind === "linkedin") {
      if (/^\/in\//.test(path)) return "linkedin.profile";
      if (/^\/company\//.test(path)) return "linkedin.company";
      if (/^\/feed/.test(path)) return "linkedin.feed";
      if (/^\/sales\//.test(path)) return "linkedin.sales-nav";
      if (/^\/jobs/.test(path)) return "linkedin.jobs";
      if (/^\/messaging/.test(path)) return "linkedin.messaging";
      return "linkedin.other";
    }
    if (kind === "ga4") {
      if (/reports?/i.test(path)) return "ga4.report";
      if (/admin/i.test(path)) return "ga4.admin";
      if (/explore/i.test(path)) return "ga4.explore";
      return "ga4.home";
    }
    if (kind === "gtm") {
      if (/tags/i.test(path)) return "gtm.tags";
      if (/triggers/i.test(path)) return "gtm.triggers";
      if (/variables/i.test(path)) return "gtm.variables";
      return "gtm.home";
    }
    if (kind === "google-ads") return "google-ads.console";
    if (kind === "meta-ads") return "meta-ads.console";
    if (kind === "linkedin-ads") return "linkedin-ads.console";
    if (kind === "search-console") return "search-console.console";
    if (kind === "website") {
      // Best-effort surface-level taxonomy for a public site.
      const txt = (document.title + " " + path).toLowerCase();
      if (/\/pricing|pricing/.test(txt)) return "website.pricing";
      if (/\/blog|\/news|\/articles/.test(txt)) return "website.blog";
      if (/\/product|features|solutions/.test(txt)) return "website.product";
      if (/\/contact|demo|book/.test(txt)) return "website.contact";
      if (/\/cart|checkout|product\//.test(txt)) return "website.ecommerce";
      if (path === "" || path === "/") return "website.home";
      return "website.page";
    }
    return `${kind}.page`;
  }

  /** Cheap DOM signals every agent might want without a full re-scan. */
  function quickSignals() {
    try {
      const forms = document.querySelectorAll("form").length;
      const buttons = document.querySelectorAll("button, [role='button']").length;
      const calendly = !!document.querySelector('[data-url*="calendly"], iframe[src*="calendly"], a[href*="calendly.com"]');
      const whatsapp = !!document.querySelector('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
      const phone = !!document.querySelector('a[href^="tel:"]');
      const video = !!document.querySelector("video, iframe[src*='youtube'], iframe[src*='vimeo'], iframe[src*='wistia']");
      const inputs = document.querySelectorAll("input:not([type='hidden']), textarea, select").length;
      return { forms, buttons, calendly, whatsapp, phone, video, inputs };
    } catch (_) {
      return { forms: 0, buttons: 0, calendly: false, whatsapp: false, phone: false, video: false, inputs: 0 };
    }
  }

  // Human-friendly badge text shown next to the FAB / panel header.
  const BADGE_LABEL = {
    linkedin: "LinkedIn",
    "linkedin-ads": "LinkedIn Ads",
    ga4: "GA4",
    gtm: "GTM",
    "google-ads": "Google Ads",
    "meta-ads": "Meta Ads",
    "search-console": "Search Console",
    hubspot: "HubSpot",
    salesforce: "Salesforce",
    shopify: "Shopify",
    wordpress: "WordPress",
    webflow: "Webflow",
    gmail: "Gmail",
    calendly: "Calendly",
    yc: "Y Combinator",
    "ms-startup": "Microsoft Startups",
    appstore: "App Store",
    website: "Website",
  };

  // The agent that runs by default for each kind. (Agents are looked up at
  // mission-injection time so this stays a stringly-typed reference.)
  const PRIMARY_AGENT = {
    linkedin: "linkedin-growth",
    "linkedin-ads": "ads-linkedin",
    ga4: "ga4-copilot",
    gtm: "gtm-copilot",
    "google-ads": "ads-google",
    "meta-ads": "ads-meta",
    "search-console": "seo-copilot",
    hubspot: "crm-copilot",
    salesforce: "crm-copilot",
    shopify: "ecom-copilot",
    wordpress: "cms-copilot",
    webflow: "cms-copilot",
    gmail: "outreach-copilot",
    calendly: "tracking-audit",
    yc: "fundraising",
    "ms-startup": "fundraising",
    appstore: "fundraising",
    website: "tracking-audit",
  };

  function detect() {
    let u;
    try {
      u = new URL(location.href);
    } catch (_) {
      u = { hostname: "", pathname: "/" };
    }
    const kind = detectHost(u);
    const page = pageType(kind, u);
    return {
      kind,                                  // e.g. "ga4"
      platform: kind,                        // alias for callers thinking in "platform"
      page,                                  // e.g. "ga4.report"
      app: kind === "website" ? "Website" : (BADGE_LABEL[kind] || kind),
      hostname: u.hostname || "",
      pathname: u.pathname || "/",
      url: location.href,
      title: document.title || "",
      badge: BADGE_LABEL[kind] || "Auto",
      primaryAgent: PRIMARY_AGENT[kind] || "tracking-audit",
      signals: quickSignals(),
      // True for any kind that's a marketing/analytics surface we have
      // specialized intelligence for (drives whether to surface the
      // "growth audit" affordances).
      isMarketingSurface: kind !== "yc" && kind !== "ms-startup" && kind !== "appstore",
    };
  }

  window.TVC.Context = { detect, BADGE_LABEL, PRIMARY_AGENT };
})();
