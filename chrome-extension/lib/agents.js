"use strict";

/**
 * MarketIQ Universal Copilot — Agent Registry & Orchestrator.
 *
 * Single source of truth for every specialised agent the extension can run,
 * plus the rules that decide which agents to surface for the currently
 * detected context.
 *
 * Each AGENT entry is { id, label, icon, color, contexts, summary, missions }
 * where missions[] describes the buttons the user sees inside that agent.
 *
 * The orchestrator exports:
 *   window.TVC.Agents.forContext(ctx) → array of agents to show, primary first
 *   window.TVC.Agents.allMissions(ctx) → flat list of missions for the
 *     panel's mission grid, with the per-mission system prompt + suggested
 *     command-bar phrase.
 *   window.TVC.Agents.routeIntent(text, ctx) → best-guess mission spec for
 *     the Universal Command Bar (keyword router; AI does the heavy lift).
 *
 * Missions returned by these helpers are pure data — they don't run AI
 * themselves. The content script's launcher reads `prompt`, `system_mode`,
 * `web_search`, `tools` and invokes the existing aiStreamInto pipeline.
 */
(() => {
  if (window.TVC && window.TVC.Agents) return;
  window.TVC = window.TVC || {};

  // -----------------------------------------------------------------------
  // System-prompt presets — keyed by agent. The content script appends the
  // page extraction + DOM signals automatically.
  // -----------------------------------------------------------------------
  const SYSTEM_PROMPTS = {
    "tracking-audit":
      "You are an analytics engineer and tracking auditor. The user has shared a tracking audit of the current page (which tags are installed and which are missing) plus DOM signals. Diagnose the gaps, prioritise by business impact, and write a step-by-step remediation plan. Be specific: name the exact tag, the exact GTM trigger/variable, and the GA4 event names with parameters. Never invent installed tags — go off the audit data only.",
    "event-generator":
      "You are a GA4 event-architecture specialist. The user has shared a list of suggested events derived from this page's DOM. Refine each suggestion: confirm event_name (snake_case, GA4-compliant), choose conversion: true/false, list required parameters, and group by business goal. Return a STRICT JSON block with `events: [{event_name, parameters, conversion, business_goal, trigger, gtm_setup}]` followed by a short explanation.",
    "gtm-copilot":
      "You are a Google Tag Manager expert. The user is inside GTM (tagmanager.google.com). For audits: walk through Tags / Triggers / Variables and call out unused, broken, duplicate or misconfigured items with concrete fixes. For natural-language requests like 'track demo bookings from Calendly': output the exact GTM setup — Tag type + name, Trigger type + condition, Variables needed, and a brief test plan in Preview mode.",
    "ga4-copilot":
      "You are a GA4 analytics expert. The user is in Google Analytics 4. Answer their question with: 1) the report path to get the data themselves (Reports → ... → ...), 2) likely causes ranked by probability, 3) a 3-step diagnosis playbook, 4) related explorations to run. Never invent numbers — if you can't see the data, say so and tell them exactly which report to open.",
    "ads-google":
      "You are a Google Ads strategist. The user is inside the Google Ads console. Audit campaign structure, budget allocation, conversion tracking quality (was the AW- tag detected? are conversions counted correctly?), ROAS, CPA and CTR. Recommend concrete optimisations: keywords to add/pause, bid strategies to test, asset improvements, audience layering. Be evidence-first — never invent metrics, ask for the data instead.",
    "ads-meta":
      "You are a Meta Ads strategist. The user is inside Meta Business Manager / Ads Manager. Audit campaign structure (CBO vs ABO), audience overlap, creative variety, conversion event setup (was the Pixel detected? are events deduped?), Aggregated Event Measurement priority, and ROAS / CPA / CTR. Recommend concrete optimisations and a creative-testing matrix. Never invent metrics.",
    "ads-linkedin":
      "You are a LinkedIn Ads strategist. The user is inside LinkedIn Campaign Manager. Audit audience targeting (job titles vs. job functions vs. skills), creative formats (single, carousel, doc, video), bid type, conversion tracking quality (was the Insight Tag detected?), and CPL. Recommend ABM layering, lookalike Matched Audiences, and a 3-week testing plan. Never invent metrics.",
    "linkedin-growth":
      "You are a LinkedIn growth & sales specialist. The user is on LinkedIn. Based on the profile / company / feed they're viewing: assess ICP fit and lead score, draft a personalised <280 char connection note, write a 3-touch follow-up sequence, surface buying signals (recent job change, funding, hiring, post engagement), and recommend the next action (connect / message / track / save to ABM list). Truthful and human — no fake social proof.",
    "seo-copilot":
      "You are an SEO + AI Visibility (AEO) consultant. The user is in Google Search Console or on a public page. Analyse: indexability, on-page SEO (title, meta, headings, schema), Core Web Vitals if visible, internal linking, and AEO readiness (entity coverage, citation-worthy content). Recommend specific edits with before/after examples.",
    "crm-copilot":
      "You are a RevOps consultant. The user is inside their CRM (HubSpot / Salesforce). Audit pipeline hygiene, deal stages, missing required fields, stale opportunities, and routing rules. Recommend hygiene fixes, automation candidates, and reporting gaps.",
    "ecom-copilot":
      "You are a Shopify / ecommerce growth consultant. The user is in Shopify admin or a public store. Audit conversion paths, checkout friction, product page completeness, schema markup, SEO + Core Web Vitals, and tracking setup (GA4 + Meta Pixel + Google Ads + TikTok Pixel). Recommend specific lifts.",
    "cms-copilot":
      "You are a CMS (WordPress / Webflow) consultant. The user is editing or viewing a CMS-powered site. Audit content structure, SEO foundations, performance, schema, and tracking. Recommend the smallest set of edits with highest impact.",
    "outreach-copilot":
      "You are a sales-copy specialist. The user is in Gmail / a messaging surface. Draft a personalised email or message based on the page context — short, specific, and grounded in the recipient's real signals. Output: 2 subject-line options, 1 body (<150 words), 1 follow-up two days later (<80 words).",
    "growth-audit":
      "You are a holistic growth auditor. The user is on a public website. Score Growth (overall), SEO, Conversion, and Tracking (each /100). For each axis: top 3 wins with effort/impact. Open with the 60-second TL;DR an exec can act on; close with a 30-day plan.",
    "fundraising":
      "You are a Y Combinator / VC / startup-credits coach. The user is on an application form or program page. Use the operator's startup profile (if provided) and the live page to draft strongest-truthful answers, eligibility checks, or outreach drafts as required. Nothing is auto-submitted — the human reviews every answer.",
  };

  // -----------------------------------------------------------------------
  // Agent registry. `contexts` is the set of ctx.kind values this agent
  // activates for. The first agent that matches becomes the "primary".
  // -----------------------------------------------------------------------
  const AGENTS = [
    {
      id: "linkedin-growth",
      label: "LinkedIn Growth",
      icon: "💼",
      color: "#0A66C2",
      contexts: ["linkedin"],
      summary: "Profile intel, ICP match, lead scoring, personalised outreach, buying signals, ABM workflows.",
      missions: [
        {
          id: "linkedin.profile-intel",
          icon: "🎯",
          title: "Profile intelligence + ICP match",
          desc: "Read the profile/company, score ICP fit, surface buying signals, recommend next action.",
          system: "linkedin-growth",
          web_search: true,
          prompt:
            "Analyse the LinkedIn page in view. Output: (1) ICP fit score 0-100 with reasoning grounded in the operator's profile, (2) buying signals (recent job change, funding, hiring, growth, technology), (3) top 3 conversation hooks, (4) recommended next action with priority.",
          when: (ctx) => ctx.kind === "linkedin",
        },
        {
          id: "linkedin.connect-note",
          icon: "✉️",
          title: "Personalised connection note",
          desc: "Draft a <280 char connection request, plus a 3-touch follow-up sequence.",
          system: "linkedin-growth",
          web_search: false,
          prompt:
            "Draft (a) a personalised LinkedIn connection note under 280 chars referencing something concrete from this person/company, (b) a 3-touch follow-up sequence (post-accept → +2 days → +5 days). Truthful and human — no fake compliments.",
          when: (ctx) => ctx.kind === "linkedin",
        },
        {
          id: "linkedin.abm",
          icon: "🧭",
          title: "Add to ABM playbook",
          desc: "Decide if this account belongs in our ABM list; draft an account brief if yes.",
          system: "linkedin-growth",
          web_search: true,
          prompt:
            "Decide if this account should be added to our ABM list. If YES, output a one-page account brief (org snapshot, ICP fit reason, buyer map of likely champions / decision makers / blockers, recent triggers, recommended 30-day touch plan). If NO, explain why in 2 lines.",
          when: (ctx) => ctx.kind === "linkedin" &&
            (ctx.page === "linkedin.profile" || ctx.page === "linkedin.company"),
        },
      ],
    },

    {
      id: "tracking-audit",
      label: "Tracking Audit",
      icon: "🩺",
      color: "#0FA874",
      contexts: ["website", "shopify", "wordpress", "webflow", "calendly"],
      summary: "Detects GA4, GTM, Meta Pixel, LinkedIn Insight, Hotjar, Clarity, Segment & more. Health score + fixes.",
      missions: [
        {
          id: "tracking.audit",
          icon: "🔎",
          title: "Audit tracking health",
          desc: "Scan installed tags, score this page out of 100, prioritise the fixes.",
          system: "tracking-audit",
          web_search: false,
          tools: ["tracking-audit"],   // signals the runner to pre-attach an audit report
          prompt:
            "Diagnose the tracking gaps from the audit. Open with the headline (score + grade). List INSTALLED, then MISSING (with priority by business impact), then DUPLICATES, then ISSUES. Close with a numbered 'Fix this week' action plan, each with the exact tag/event/trigger to set up.",
          when: (ctx) => ctx.isMarketingSurface,
        },
        {
          id: "tracking.fix-missing",
          icon: "🛠️",
          title: "Fix a missing tag",
          desc: "Walk through installing the highest-priority missing tag (gtag / GTM / Meta Pixel / Insight).",
          system: "tracking-audit",
          web_search: false,
          tools: ["tracking-audit"],
          prompt:
            "Pick the single missing tag with the highest business impact for this site (e.g. GA4 → Google Ads → Meta Pixel → LinkedIn Insight, weighted by what's already installed). Walk me through installing it: where to grab the snippet, where to paste it (head vs body vs GTM), how to verify with the official extension/Debug View, and a smoke-test checklist.",
          when: (ctx) => ctx.isMarketingSurface,
        },
      ],
    },

    {
      id: "event-generator",
      label: "Event Generator",
      icon: "⚡",
      color: "#7C3AED",
      contexts: ["website", "shopify", "wordpress", "webflow"],
      summary: "Scans this page for forms, CTAs, Calendly, downloads, phone & WhatsApp links. Suggests GA4 events.",
      missions: [
        {
          id: "events.suggest",
          icon: "⚡",
          title: "Detect & generate events",
          desc: "DOM scan → suggested GA4 events with parameters + conversion category.",
          system: "event-generator",
          web_search: false,
          tools: ["event-detector"],
          prompt:
            "Refine the suggested events from the DOM scan. For each: confirm event_name (snake_case, GA4 reserved-name safe), set conversion: true/false, list parameters with example values, and write the matching GTM trigger spec. Return a JSON block first, then a human-readable summary table.",
          when: (ctx) => ctx.isMarketingSurface,
        },
        {
          id: "events.deploy",
          icon: "🚀",
          title: "Generate GTM container",
          desc: "Turn the suggestions into a copy-pasteable GTM container JSON.",
          system: "event-generator",
          web_search: false,
          tools: ["event-detector"],
          prompt:
            "Generate a GTM container JSON for the suggested events. Include: Tags (one per event using GA4 Event tag type), Triggers (matching the suggested CSS selectors), Variables (Auto-Event variables for click text + URL). Output the JSON in a single fenced code block followed by step-by-step import instructions.",
          when: (ctx) => ctx.isMarketingSurface,
        },
      ],
    },

    {
      id: "gtm-copilot",
      label: "GTM Copilot",
      icon: "🏷️",
      color: "#2563EB",
      contexts: ["gtm"],
      summary: "Container audit, natural-language tag builder, conversion-tracking guidance.",
      missions: [
        {
          id: "gtm.audit",
          icon: "🩺",
          title: "Audit this GTM container",
          desc: "Find unused tags, broken triggers, missing conversions, redundant tags.",
          system: "gtm-copilot",
          web_search: false,
          prompt:
            "Walk through the GTM container I'm looking at. Identify: unused tags, broken/never-firing triggers, missing GA4 conversions, redundant tags, and variables that should be containerised. For each finding, give the exact 'go here, do this' fix.",
          when: (ctx) => ctx.kind === "gtm",
        },
        {
          id: "gtm.build",
          icon: "🛠️",
          title: "Build a tag from natural language",
          desc: "“Track demo bookings from Calendly” → tag + trigger + variables spec.",
          system: "gtm-copilot",
          web_search: false,
          prompt:
            "I'll describe what I want to track in plain English (e.g. 'track demo bookings from Calendly'). Output the exact GTM setup: tag name, tag type, configuration, trigger type, trigger condition, variables needed, and a Preview-mode test plan. If the request needs a Data Layer push, include the dataLayer.push snippet for the dev team.",
          when: (ctx) => ctx.kind === "gtm",
        },
      ],
    },

    {
      id: "ga4-copilot",
      label: "GA4 Copilot",
      icon: "📊",
      color: "#E89200",
      contexts: ["ga4"],
      summary: "Event, funnel, attribution & revenue analysis with report-path guidance.",
      missions: [
        {
          id: "ga4.why-drop",
          icon: "📉",
          title: "Why did conversions drop?",
          desc: "Diagnose conversion / traffic / channel drops with a playbook.",
          system: "ga4-copilot",
          web_search: false,
          prompt:
            "I'll describe a metric drop. Give me: the GA4 report path to investigate, the 5 most likely root causes ranked by probability, the 3-step diagnosis to confirm each, and a remediation plan with priority.",
          when: (ctx) => ctx.kind === "ga4",
        },
        {
          id: "ga4.funnel",
          icon: "🪜",
          title: "Build / fix a conversion funnel",
          desc: "Explore → Funnel exploration → step config + drop-off interpretation.",
          system: "ga4-copilot",
          web_search: false,
          prompt:
            "Walk me through building a funnel exploration for the conversion I'm describing. Output: the 4-6 funnel steps with exact event names + filters, the elapsed-time settings, and what each drop-off pattern means.",
          when: (ctx) => ctx.kind === "ga4",
        },
        {
          id: "ga4.attribution",
          icon: "🧮",
          title: "Attribution & channel quality",
          desc: "Which channels are bringing real revenue / quality leads.",
          system: "ga4-copilot",
          web_search: false,
          prompt:
            "Help me read this account's channel quality. Walk me through the Attribution → Model Comparison and Conversion Paths reports, what to compare, and how to act on the findings. Add specific things to investigate in the operator's setup.",
          when: (ctx) => ctx.kind === "ga4",
        },
      ],
    },

    {
      id: "ads-google",
      label: "Google Ads",
      icon: "🟦",
      color: "#1A73E8",
      contexts: ["google-ads"],
      summary: "Campaign structure, budget, bidding, conversion tracking & creative audit.",
      missions: [
        {
          id: "google-ads.audit",
          icon: "🩺",
          title: "Audit this Google Ads account",
          desc: "Structure + budget + conversion tracking + ROAS + creative review.",
          system: "ads-google",
          web_search: false,
          prompt:
            "Audit the account I'm viewing. Cover: campaign structure (Search vs PMax vs Demand Gen), budget allocation, conversion tracking quality, bid strategies, keyword hygiene, asset variety. End with a prioritised optimisation plan.",
          when: (ctx) => ctx.kind === "google-ads",
        },
        {
          id: "google-ads.troubleshoot",
          icon: "🔧",
          title: "Troubleshoot conversions",
          desc: "Conversions not counting / under-counting / double-counting.",
          system: "ads-google",
          web_search: false,
          prompt:
            "I'll describe a conversion-tracking issue. Diagnose using: Tag Assistant, the conversion action's status, GA4 imports, attribution model, and audience layering. Output a step-by-step verification checklist.",
          when: (ctx) => ctx.kind === "google-ads",
        },
      ],
    },

    {
      id: "ads-meta",
      label: "Meta Ads",
      icon: "🟪",
      color: "#1877F2",
      contexts: ["meta-ads"],
      summary: "Pixel & Conversions API health, audience overlap, creative testing matrix.",
      missions: [
        {
          id: "meta-ads.audit",
          icon: "🩺",
          title: "Audit this Meta Ads account",
          desc: "Structure + Pixel + CAPI + audience overlap + creative variety.",
          system: "ads-meta",
          web_search: false,
          prompt:
            "Audit the Meta account. Cover: CBO vs ABO, audience overlap risks, creative variety, Pixel + Conversions API setup, AEM event priority, and creative-testing rigor. Prioritised plan at the end.",
          when: (ctx) => ctx.kind === "meta-ads",
        },
      ],
    },

    {
      id: "ads-linkedin",
      label: "LinkedIn Ads",
      icon: "🟦",
      color: "#0A66C2",
      contexts: ["linkedin-ads"],
      summary: "ABM targeting, creative variety, Insight Tag setup, CPL optimisation.",
      missions: [
        {
          id: "linkedin-ads.audit",
          icon: "🩺",
          title: "Audit this LinkedIn Ads account",
          desc: "Audience hygiene + creative + Insight Tag + ABM layering.",
          system: "ads-linkedin",
          web_search: false,
          prompt:
            "Audit this LinkedIn Ads account. Cover: audience hygiene (job titles vs functions vs skills), creative formats, Insight Tag + conversion setup, ABM layering with Matched Audiences, and a 3-week testing plan.",
          when: (ctx) => ctx.kind === "linkedin-ads",
        },
      ],
    },

    {
      id: "seo-copilot",
      label: "SEO + AEO",
      icon: "🔍",
      color: "#16A34A",
      contexts: ["search-console", "website", "wordpress", "webflow", "shopify"],
      summary: "On-page SEO, structured data, AI Visibility (AEO) readiness.",
      missions: [
        {
          id: "seo.audit",
          icon: "🔍",
          title: "Audit this page for SEO",
          desc: "Title, meta, headings, schema, internal links, performance.",
          system: "seo-copilot",
          web_search: false,
          prompt:
            "Audit this page for SEO. Cover: title tag, meta description, H1, headings hierarchy, schema markup, internal linking, image alts, and likely Core Web Vitals. Recommend the smallest set of edits with the highest expected impact.",
          when: () => true,
        },
        {
          id: "seo.aeo",
          icon: "🤖",
          title: "AI Visibility (AEO) readiness",
          desc: "How likely AI search engines are to cite this page — and how to fix it.",
          system: "seo-copilot",
          web_search: false,
          prompt:
            "Score this page's AI Visibility (AEO): entity coverage, citation-worthy facts, schema, author trust, and freshness. Output the score, top 3 wins, and rewrite suggestions for the most cite-able sections.",
          when: () => true,
        },
      ],
    },

    {
      id: "crm-copilot",
      label: "CRM Copilot",
      icon: "🗂️",
      color: "#FF7A59",
      contexts: ["hubspot", "salesforce"],
      summary: "Pipeline hygiene, automation candidates, reporting gaps.",
      missions: [
        {
          id: "crm.hygiene",
          icon: "🧽",
          title: "Pipeline hygiene check",
          desc: "Stale deals, missing required fields, owner routing, stage misuse.",
          system: "crm-copilot",
          web_search: false,
          prompt:
            "Walk me through a CRM hygiene check. Identify the 5 most common issues for this CRM, the exact reports to build to find them in this account, and a clean-up plan I can run this week.",
          when: () => true,
        },
      ],
    },

    {
      id: "ecom-copilot",
      label: "Ecommerce Copilot",
      icon: "🛍️",
      color: "#95BF47",
      contexts: ["shopify"],
      summary: "Conversion paths, checkout friction, product-page completeness, tracking.",
      missions: [
        {
          id: "ecom.audit",
          icon: "🩺",
          title: "Audit conversion paths",
          desc: "PDP completeness, checkout friction, schema, tracking, SEO.",
          system: "ecom-copilot",
          web_search: false,
          prompt:
            "Audit conversion paths on this storefront. Cover: PDP completeness, cart-to-checkout friction, schema markup, GA4 + Meta Pixel + Google Ads + TikTok tracking parity, and the highest-leverage lifts.",
          when: () => true,
        },
      ],
    },

    {
      id: "cms-copilot",
      label: "CMS Copilot",
      icon: "🧱",
      color: "#21759B",
      contexts: ["wordpress", "webflow"],
      summary: "Content structure, SEO foundations, performance, schema.",
      missions: [
        {
          id: "cms.audit",
          icon: "🧱",
          title: "Audit content + SEO foundations",
          desc: "Information architecture, on-page SEO, schema, performance.",
          system: "cms-copilot",
          web_search: false,
          prompt:
            "Audit this CMS-powered site. Cover: information architecture, on-page SEO foundations, schema, performance, and tracking. Output the 5 smallest edits with the highest expected impact.",
          when: () => true,
        },
      ],
    },

    {
      id: "growth-audit",
      label: "Growth Audit",
      icon: "🚀",
      color: "#DC2626",
      contexts: ["website", "shopify", "wordpress", "webflow"],
      summary: "Holistic growth scoring (Growth / SEO / Conversion / Tracking).",
      missions: [
        {
          id: "growth.score",
          icon: "📈",
          title: "Score this website (Growth / SEO / CRO / Tracking)",
          desc: "Four scores out of 100, top wins per axis, 30-day plan.",
          system: "growth-audit",
          web_search: false,
          tools: ["tracking-audit", "event-detector"],
          prompt:
            "Score this website on four axes (Growth, SEO, Conversion, Tracking — each /100) and produce a TL;DR an exec can act on. For each axis, top 3 wins with effort/impact. Close with a numbered 30-day plan and KPI to track each week.",
          when: (ctx) => ctx.isMarketingSurface,
        },
      ],
    },

    {
      id: "outreach-copilot",
      label: "Outreach Copilot",
      icon: "✉️",
      color: "#7C3AED",
      contexts: ["gmail", "linkedin"],
      summary: "Personalised sales-copy: cold email, follow-up, LinkedIn message.",
      missions: [
        {
          id: "outreach.draft",
          icon: "✦",
          title: "Draft a personalised message",
          desc: "Subject A/B + body + follow-up grounded in the page context.",
          system: "outreach-copilot",
          web_search: false,
          prompt:
            "Draft (a) 2 subject lines, (b) a personalised email body under 150 words referencing something concrete from this page, (c) a 2-day follow-up under 80 words.",
          when: () => true,
        },
      ],
    },

    {
      id: "fundraising",
      label: "Fundraising",
      icon: "💸",
      color: "#E89200",
      contexts: ["yc", "ms-startup", "appstore", "website"],
      summary: "VC / YC application drafting, program eligibility, app-store listings.",
      missions: [
        // The existing 5 missions (research/fill/outreach/eligibility/listing) are
        // registered by content/copilot.js itself — we leave them where they live
        // so the existing autofill flow stays intact. The orchestrator simply
        // exposes the agent so the badge + summary render correctly.
      ],
    },
  ];

  // -----------------------------------------------------------------------
  // Orchestrator
  // -----------------------------------------------------------------------
  function forContext(ctx) {
    if (!ctx) return [];
    const matches = AGENTS.filter((a) => a.contexts.includes(ctx.kind));
    // Primary agent first (the one PRIMARY_AGENT named for this context).
    matches.sort((a, b) => {
      if (a.id === ctx.primaryAgent) return -1;
      if (b.id === ctx.primaryAgent) return 1;
      return 0;
    });
    return matches;
  }

  function allMissions(ctx) {
    const list = [];
    for (const agent of forContext(ctx)) {
      for (const m of agent.missions || []) {
        const ok = typeof m.when === "function" ? safeWhen(m.when, ctx) : true;
        if (!ok) continue;
        list.push({
          ...m,
          agent_id: agent.id,
          agent_label: agent.label,
          agent_icon: agent.icon,
          agent_color: agent.color,
        });
      }
    }
    return list;
  }

  function safeWhen(fn, ctx) {
    try { return !!fn(ctx); } catch (_) { return true; }
  }

  // -----------------------------------------------------------------------
  // Universal Command Bar — naive keyword routing. The LLM still does the
  // heavy lifting; this just picks the agent/mission to launch.
  // -----------------------------------------------------------------------
  const INTENT_PATTERNS = [
    { rx: /(audit|review|score)\s+(this\s+)?(site|website|page)/i, mission: "growth.score", agent: "growth-audit" },
    { rx: /(track(ing)?|tags?|pixel)/i, mission: "tracking.audit", agent: "tracking-audit" },
    { rx: /(missing|fix).+(event|conversion)/i, mission: "events.suggest", agent: "event-generator" },
    { rx: /(seo|search|google)\s+(audit|optimis)/i, mission: "seo.audit", agent: "seo-copilot" },
    { rx: /(aeo|ai\s+visibility)/i, mission: "seo.aeo", agent: "seo-copilot" },
    { rx: /(optimi[sz]e|audit|review)\s+(this\s+)?linkedin/i, mission: "linkedin.profile-intel", agent: "linkedin-growth" },
    { rx: /(connect|connection|note|message)\s+(on\s+)?linkedin/i, mission: "linkedin.connect-note", agent: "linkedin-growth" },
    { rx: /(abm|account\s+plan)/i, mission: "linkedin.abm", agent: "linkedin-growth" },
    { rx: /(why|what).+(conversion|traffic).+(drop|fall|decline)/i, mission: "ga4.why-drop", agent: "ga4-copilot" },
    { rx: /(funnel)/i, mission: "ga4.funnel", agent: "ga4-copilot" },
    { rx: /(attribut|channel)/i, mission: "ga4.attribution", agent: "ga4-copilot" },
    { rx: /(google\s+ads|gads).+(audit|review)/i, mission: "google-ads.audit", agent: "ads-google" },
    { rx: /(meta|facebook).+(ads|audit)/i, mission: "meta-ads.audit", agent: "ads-meta" },
    { rx: /(linkedin).+(ads|audit)/i, mission: "linkedin-ads.audit", agent: "ads-linkedin" },
    { rx: /(generate|build|create).+(gtm|tag|trigger|tracking)/i, mission: "gtm.build", agent: "gtm-copilot" },
    { rx: /(crm|hubspot|salesforce).+(hygiene|audit|clean)/i, mission: "crm.hygiene", agent: "crm-copilot" },
    { rx: /(email|outreach|cold\s+email|message)/i, mission: "outreach.draft", agent: "outreach-copilot" },
    { rx: /(eligibilit|program|credit)/i, mission: "eligibility", agent: "fundraising" },
    { rx: /(fill|apply|application|vc|yc)/i, mission: "fill", agent: "fundraising" },
  ];

  function routeIntent(text, ctx) {
    const q = (text || "").trim();
    if (!q) return null;
    for (const p of INTENT_PATTERNS) {
      if (p.rx.test(q)) {
        const missions = allMissions(ctx);
        const m = missions.find((x) => x.id === p.mission) || missions.find((x) => x.agent_id === p.agent);
        if (m) return { ...m, _intentText: q };
        // Fallback: hint at the agent but no specific mission injected.
        return { agent_id: p.agent, _intentText: q };
      }
    }
    // No match — return the primary agent's first mission as a sensible default.
    const missions = allMissions(ctx);
    return missions[0] ? { ...missions[0], _intentText: q } : null;
  }

  window.TVC.Agents = {
    AGENTS,
    SYSTEM_PROMPTS,
    forContext,
    allMissions,
    routeIntent,
  };
})();
