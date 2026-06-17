"use strict";

/**
 * MarketIQ Universal Copilot — Visual Event Detection Agent.
 *
 * Walks the live DOM and identifies the user-visible elements a marketing
 * team would want to instrument as GA4 / GTM events:
 *
 *   - Contact forms / demo / signup / newsletter / waitlist
 *   - Calendly embed widgets (book-a-call)
 *   - WhatsApp / phone (tel:) links
 *   - File downloads (PDF / case-studies)
 *   - Video players (YouTube / Vimeo / Wistia / <video>)
 *   - Outbound links
 *   - CTAs (buttons containing book/demo/get/start/buy/contact …)
 *
 * For each, returns a suggested GA4 event with:
 *   - event_name (snake_case)
 *   - parameters (GA4-compatible)
 *   - business_goal ("lead" / "sale" / "engagement")
 *   - conversion: true|false
 *   - confidence (0..1)
 *   - trigger (CSS selector + how it should fire)
 *
 * The "AI Event Generation Agent" calls window.TVC.EventDetector.scan() and
 * the panel renders the suggestions with one-click 'Generate GTM tag'
 * affordances (which then prompt the LLM with the suggestion as context).
 */
(() => {
  if (window.TVC && window.TVC.EventDetector) return;
  window.TVC = window.TVC || {};

  // ----------------------------------------------------------- vocabularies

  // Phrases that strongly indicate the purpose of a button / form / link.
  // Order matters — earliest match wins, so put high-intent verbs first.
  const PURPOSE = [
    { kw: ["book a demo", "book demo", "request demo", "schedule demo", "get a demo"], event: "book_demo", goal: "lead" },
    { kw: ["book a call", "book call", "schedule call", "talk to sales", "contact sales"], event: "book_call", goal: "lead" },
    { kw: ["start free trial", "free trial", "try free", "start trial", "try it free"], event: "start_trial", goal: "lead" },
    { kw: ["get started", "sign up free", "create account", "sign up", "create your account"], event: "signup_start", goal: "lead" },
    { kw: ["join waitlist", "early access", "request access", "get notified"], event: "waitlist_join", goal: "lead" },
    { kw: ["buy now", "add to cart", "buy", "purchase", "checkout"], event: "purchase_intent", goal: "sale" },
    { kw: ["request quote", "get quote", "pricing", "see pricing", "contact us", "get in touch"], event: "lead_contact", goal: "lead" },
    { kw: ["download", "get the guide", "get pdf", "case study", "whitepaper", "ebook"], event: "download_asset", goal: "lead" },
    { kw: ["subscribe", "newsletter"], event: "newsletter_subscribe", goal: "engagement" },
    { kw: ["watch video", "play video", "watch demo"], event: "video_play", goal: "engagement" },
    { kw: ["learn more", "read more", "see how", "explore"], event: "cta_engagement", goal: "engagement" },
  ];

  // ----------------------------------------------------------- helpers

  const clean = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  function visible(node) {
    if (!node || !node.getClientRects().length) return false;
    const cs = getComputedStyle(node);
    if (cs.visibility === "hidden" || cs.display === "none") return false;
    const r = node.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }

  function uniqueSelector(node) {
    if (!node) return null;
    if (node.id) return `#${cssEscape(node.id)}`;
    const dt = node.getAttribute("data-testid") || node.getAttribute("data-test") || node.getAttribute("data-cy");
    if (dt) return `[data-testid="${cssEscape(dt)}"]`;
    // Path of nth-of-type for stability
    const parts = [];
    let cur = node;
    let depth = 0;
    while (cur && cur.nodeType === 1 && depth < 6) {
      const tag = cur.tagName.toLowerCase();
      const par = cur.parentElement;
      if (!par) { parts.unshift(tag); break; }
      const sibs = Array.from(par.children).filter((c) => c.tagName === cur.tagName);
      const idx = sibs.indexOf(cur) + 1;
      parts.unshift(sibs.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
      if (par.id) { parts.unshift(`#${cssEscape(par.id)}`); break; }
      cur = par; depth++;
    }
    return parts.join(" > ");
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => "\\" + c);
  }

  function classifyByText(text) {
    if (!text) return null;
    const t = clean(text);
    for (const p of PURPOSE) {
      if (p.kw.some((k) => t.includes(k))) return p;
    }
    return null;
  }

  // ----------------------------------------------------------- detectors

  function detectForms() {
    const out = [];
    document.querySelectorAll("form").forEach((form) => {
      if (!visible(form)) return;
      const fields = form.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select").length;
      if (fields < 1) return;
      // Try to infer purpose from heading / submit button / surrounding text.
      const txt = clean(
        (form.querySelector("h1,h2,h3,h4")?.textContent || "") +
        " " +
        (form.querySelector("button, [type='submit']")?.textContent || "") +
        " " +
        (form.getAttribute("aria-label") || "") +
        " " +
        (form.getAttribute("name") || form.getAttribute("id") || "")
      );
      const cls = classifyByText(txt) ||
        (fields <= 2 ? { event: "newsletter_subscribe", goal: "engagement" } : { event: "lead_contact", goal: "lead" });
      out.push({
        kind: "form",
        event_name: cls.event,
        goal: cls.goal,
        conversion: cls.goal !== "engagement",
        confidence: txt ? 0.94 : 0.7,
        label: form.querySelector("h1,h2,h3,h4")?.textContent?.trim() || `Form with ${fields} fields`,
        selector: uniqueSelector(form),
        trigger: { type: "form_submit", selector: uniqueSelector(form) },
        params: { form_fields: fields, page_path: location.pathname },
      });
    });
    return out;
  }

  function detectButtons() {
    const out = [];
    const seen = new Set();
    document.querySelectorAll("button, a[role='button'], [role='button'], a.button, a.btn").forEach((btn) => {
      if (!visible(btn) || btn.closest("form")) return;
      const txt = clean(btn.textContent || btn.getAttribute("aria-label") || "");
      if (!txt || txt.length > 80) return;
      const cls = classifyByText(txt);
      if (!cls) return;
      const sig = `${cls.event}|${txt}`;
      if (seen.has(sig)) return;
      seen.add(sig);
      out.push({
        kind: "button",
        event_name: cls.event,
        goal: cls.goal,
        conversion: cls.goal !== "engagement",
        confidence: 0.92,
        label: btn.textContent?.trim().slice(0, 80) || cls.event,
        selector: uniqueSelector(btn),
        trigger: { type: "click", selector: uniqueSelector(btn) },
        params: { cta_text: txt, page_path: location.pathname },
      });
    });
    return out;
  }

  function detectCalendly() {
    const widgets = document.querySelectorAll('[data-url*="calendly"], iframe[src*="calendly"], a[href*="calendly.com"]');
    if (!widgets.length) return [];
    const first = widgets[0];
    return [{
      kind: "calendly",
      event_name: "book_demo",
      goal: "lead",
      conversion: true,
      confidence: 0.98,
      label: "Calendly booking widget",
      selector: uniqueSelector(first),
      trigger: { type: "calendly.event_scheduled", selector: uniqueSelector(first), note: "Listen for window.message of type 'calendly.event_scheduled' (Calendly's official postMessage event)." },
      params: { source: "calendly", page_path: location.pathname },
    }];
  }

  function detectWhatsapp() {
    const links = document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    if (!links.length) return [];
    return [{
      kind: "whatsapp",
      event_name: "whatsapp_click",
      goal: "lead",
      conversion: true,
      confidence: 0.95,
      label: `${links.length} WhatsApp link${links.length > 1 ? "s" : ""}`,
      selector: 'a[href*="wa.me"], a[href*="api.whatsapp.com"]',
      trigger: { type: "click", selector: 'a[href*="wa.me"], a[href*="api.whatsapp.com"]' },
      params: { destination: "whatsapp", page_path: location.pathname },
    }];
  }

  function detectPhone() {
    const links = document.querySelectorAll('a[href^="tel:"]');
    if (!links.length) return [];
    return [{
      kind: "phone",
      event_name: "phone_click",
      goal: "lead",
      conversion: true,
      confidence: 0.95,
      label: `${links.length} phone link${links.length > 1 ? "s" : ""}`,
      selector: 'a[href^="tel:"]',
      trigger: { type: "click", selector: 'a[href^="tel:"]' },
      params: { destination: "phone", page_path: location.pathname },
    }];
  }

  function detectDownloads() {
    const links = document.querySelectorAll('a[href]');
    const exts = /\.(pdf|csv|xlsx|docx|pptx|zip|mp3|mp4)(\?|#|$)/i;
    const matches = [];
    links.forEach((a) => {
      if (!visible(a)) return;
      if (a.hasAttribute("download") || exts.test(a.getAttribute("href") || "")) matches.push(a);
    });
    if (!matches.length) return [];
    return [{
      kind: "download",
      event_name: "download_asset",
      goal: "lead",
      conversion: true,
      confidence: 0.9,
      label: `${matches.length} downloadable file${matches.length > 1 ? "s" : ""}`,
      selector: 'a[download], a[href*=".pdf"], a[href*=".csv"], a[href*=".xlsx"]',
      trigger: { type: "click", selector: 'a[download], a[href*=".pdf"], a[href*=".csv"], a[href*=".xlsx"]' },
      params: { file_extension: "{href}", page_path: location.pathname },
    }];
  }

  function detectVideos() {
    const native = document.querySelectorAll("video");
    const embeds = document.querySelectorAll("iframe[src*='youtube'], iframe[src*='vimeo'], iframe[src*='wistia']");
    const n = native.length + embeds.length;
    if (!n) return [];
    return [{
      kind: "video",
      event_name: "video_play",
      goal: "engagement",
      conversion: false,
      confidence: 0.85,
      label: `${n} video player${n > 1 ? "s" : ""}`,
      selector: native[0] ? uniqueSelector(native[0]) : uniqueSelector(embeds[0]),
      trigger: {
        type: native.length ? "video.play" : "youtube.video_started",
        selector: native[0] ? uniqueSelector(native[0]) : "iframe[src*='youtube']",
        note: "Use GTM's built-in YouTube/Vimeo video triggers, or a <video> 'play' event listener.",
      },
      params: { video_provider: native.length ? "html5" : "embed", page_path: location.pathname },
    }];
  }

  function detectOutbound() {
    const here = location.hostname;
    const out = [];
    document.querySelectorAll("a[href^='http']").forEach((a) => {
      if (!visible(a)) return;
      try {
        const u = new URL(a.href);
        if (u.hostname && u.hostname !== here && !u.hostname.endsWith("." + here)) out.push(a);
      } catch (_) { /* invalid url */ }
    });
    if (out.length < 3) return [];   // suppress noise on tiny sites
    return [{
      kind: "outbound",
      event_name: "outbound_click",
      goal: "engagement",
      conversion: false,
      confidence: 0.7,
      label: `${out.length} outbound links`,
      selector: "a[href^='http']:not([href*='" + here + "'])",
      trigger: { type: "click", selector: "a[href^='http']:not([href*='" + here + "'])" },
      params: { outbound_domain: "{hostname}", page_path: location.pathname },
    }];
  }

  // ----------------------------------------------------------- public API

  function scan() {
    const all = [
      ...detectForms(),
      ...detectButtons(),
      ...detectCalendly(),
      ...detectWhatsapp(),
      ...detectPhone(),
      ...detectDownloads(),
      ...detectVideos(),
      ...detectOutbound(),
    ];
    // De-dupe by event_name + selector, keep highest-confidence.
    const dedup = new Map();
    all.forEach((s) => {
      const k = `${s.event_name}|${s.selector}`;
      const prev = dedup.get(k);
      if (!prev || prev.confidence < s.confidence) dedup.set(k, s);
    });
    const suggestions = Array.from(dedup.values()).sort((a, b) => b.confidence - a.confidence);
    return {
      url: location.href,
      title: document.title,
      suggestions,
      total: suggestions.length,
      conversionEvents: suggestions.filter((s) => s.conversion).length,
      ts: Date.now(),
    };
  }

  window.TVC.EventDetector = { scan, PURPOSE };
})();
