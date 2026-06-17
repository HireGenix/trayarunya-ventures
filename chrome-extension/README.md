# MarketIQ Universal AI Growth Assistant — Chrome Extension

**v2.0** — A single intelligent browser extension that behaves like an autonomous AI marketing engineer, analytics engineer, growth strategist, GTM consultant, attribution expert, and LinkedIn sales assistant — by **automatically detecting context and activating the right specialised AI agents** without requiring manual mode switching.

Synced to the **Content Engine (MarketiQ) webapp** — same AI you run inside `mymarketiq.online`, now available on every tab.

## How it works

The extension runs four engines on every page:

1. **Context Detection Engine** (`lib/context.js`) — inspects URL, domain, DOM signals → returns `{ kind, page, app, primaryAgent, signals }`. Recognises LinkedIn, GA4, GTM, Google Ads, Meta Ads, LinkedIn Ads, Search Console, HubSpot, Salesforce, Shopify, WordPress, Webflow, Gmail, Calendly, YC, Microsoft Startups, App Store, and any public website (with sub-types: pricing / blog / product / contact / ecommerce / home).
2. **Tracking Audit Agent** (`lib/tracking.js`) — detects GA4, GTM, Meta Pixel, LinkedIn Insight Tag, Google Ads Conversion, Clarity, Hotjar, Segment, RudderStack, Intercom, HubSpot tracking, TikTok Pixel, Pinterest Tag, Mixpanel, Amplitude, Plausible — plus duplicates and quality issues. Generates a Tracking Health Score /100.
3. **Visual Event Detection Agent** (`lib/events.js`) — walks the live DOM to find forms, CTAs, Calendly widgets, WhatsApp + phone links, downloads, video players, outbound links. Recommends GA4 event names, parameters, conversion category, and CSS selectors with confidence scores.
4. **Agent Orchestrator** (`lib/agents.js`) — declarative registry of 14 specialist agents. For each context it returns only the relevant missions, each with the right system prompt, web-search flag, and tools to pre-attach. A **Universal Command Bar** routes free-text intent to the correct agent.

Every AI call still goes through the **Content Engine** backend (`https://api.mymarketiq.online`) and is pinned to the GitHub Copilot subscription model **Claude Fable 5** (`model_key: copilot:claude-fable-5`).

## Specialised agents

| Agent | Activates on | What it does |
|---|---|---|
| **LinkedIn Growth** | `linkedin.com` | Profile intel + ICP match · personalised connection note + 3-touch follow-up · ABM playbook |
| **Tracking Audit** | any website | Detects all marketing tags, scores tracking health, prioritises fixes |
| **Event Generator** | any website | DOM scan → suggested GA4 events with parameters → copy-pasteable GTM container JSON |
| **GTM Copilot** | `tagmanager.google.com` | Container audit · natural-language tag builder ("track demo bookings from Calendly") |
| **GA4 Copilot** | `analytics.google.com` | Why did conversions drop · funnel builder · attribution & channel quality |
| **Google Ads** | `ads.google.com` | Account audit · conversion-tracking troubleshooting |
| **Meta Ads** | `business.facebook.com` | Account audit · Pixel + CAPI health · creative-testing matrix |
| **LinkedIn Ads** | `linkedin.com/campaignmanager` | Audience hygiene · creative · Insight Tag health · ABM layering |
| **SEO + AEO** | `search.google.com/search-console`, any website | On-page SEO audit · AI Visibility (AEO) readiness scoring |
| **CRM Copilot** | `hubspot.com`, `*.salesforce.com` | Pipeline hygiene · automation candidates · reporting gaps |
| **Ecommerce Copilot** | `*.myshopify.com` | Conversion paths · checkout friction · tracking parity |
| **CMS Copilot** | WordPress / Webflow | Content + SEO + performance + schema audit |
| **Growth Audit** | any website | Holistic scorecard (Growth / SEO / CRO / Tracking) /100 + 30-day plan |
| **Outreach Copilot** | Gmail, LinkedIn | Personalised subject A/B + body + follow-up grounded in page context |
| **Fundraising** | YC, Microsoft Startups, app stores, VC funds | Application drafting · eligibility checks · investor outreach · store listings · autofill |

## Universal Command Bar

In the **Agent** tab, type free-text intent and the orchestrator routes to the right agent:

- *"Audit this website."* → Growth Audit
- *"Find missing conversion events."* → Event Generator
- *"Why did conversions drop?"* → GA4 Copilot
- *"Optimize this LinkedIn profile."* → LinkedIn Growth
- *"Generate GTM setup for Calendly."* → GTM Copilot
- *"Check tracking health."* → Tracking Audit

## Panel tabs (open with the FAB or **Alt+T**)

| Tab | Purpose |
|---|---|
| **Coach** | Realtime page understanding for your objective (works on every site) |
| **Agent** | Context-aware missions + Universal Command Bar + context badge |
| **Fill** | Form scanner + AI drafts (YC, VC funds, Founders Hub, Partner Center, store consoles) → review → **⚡ Apply** autofill (React-safe, nothing auto-submitted) |
| **Chat** | Free chat grounded in the live page, with specialist modes (Page / VC / YC / Outreach / Credits / Store + every new universal agent) |

**Composer ✦ Draft** — draft button on Gmail, Outlook web and LinkedIn composers.

**Popup** — account, workspace picker, quick links, pipeline stats, and the **startup profile** that grounds every fundraising answer.

## How it connects to the webapp

No AI keys in the extension — it uses the Content Engine API:

| Endpoint | Used for |
|---|---|
| `POST /api/v1/auth/login` | Email/password sign-in → bearer token |
| `GET /api/v1/auth/me` | User + workspaces |
| `POST /api/v1/chat/conversations` | Every AI conversation — workspace-grounded, vision attachments, built-in web search |
| `POST /api/v1/chat/conversations/{id}/messages` | Follow-up turns |
| `GET /api/v1/linkedin/leads` · `/linkedin/tasks` | Popup stats |

**Auto-connect:** if you're signed in to the MarketiQ webapp in another tab, the bridge content script syncs the session automatically — or press *⚡ Sync from open web app tab* in the popup.

## Install (development)

```bash
cd chrome-extension
node scripts/make-icons.mjs        # generate brand icons (zero deps)
```

1. `chrome://extensions` → **Developer mode** → **Load unpacked** → select `chrome-extension/`.
2. Click the toolbar icon → sign in (or sync from an open webapp tab). For local dev set API URL to `http://localhost:8099` and Web App URL to `http://localhost:3000` in popup Settings.
3. In the popup, open **Startup profile**, enter your product + company website URLs and hit **🔎 Research & build profile** (one-time, ~30-60s).
4. Open any page → **Alt+T**. The header badge tells you which agent is active (e.g. *"GA4"*, *"LinkedIn"*, *"Website"*).

**Keyboard shortcuts**
- **Alt+T** — toggle panel
- **Alt+Shift+A** — Agent missions
- **Alt+Shift+C** — coach this page
- **Alt+Shift+K** — Universal Command Bar (Agent tab focused)

## Publish to the Chrome Web Store

```bash
./scripts/package.sh               # → marketiq-universal-vX.Y.Z.zip
```

Upload at the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole). Prepare:
- **Privacy policy URL** on mymarketiq.online — page content sent to your own backend for AI; credentials stored locally; no data sold.
- **Permission justifications**: content script on `<all_urls>` (the universal context detector needs to identify which agent set to activate); `activeTab` (screenshot vision); `storage` (JWT + profile + per-site memory); `scripting`, `tabs` (session sync + quick links).
- **Single purpose**: AI assistant that detects the current website/application context and activates the right specialised marketing/analytics/growth agent.

## File map

```
chrome-extension/
├── manifest.json              MV3 — popup, commands, content scripts
├── background.js              Auth state + API proxy + AI ports + badge
├── popup.html / css / js      Account, model, quick actions, stats, profile, settings
├── lib/
│   ├── context.js             Context Detection Engine (URL/domain/DOM → mode)
│   ├── tracking.js            Tracking Audit Agent (16 analytics/ads tags)
│   ├── events.js              Visual Event Detection Agent (forms/CTAs/Calendly/etc.)
│   └── agents.js              Agent Registry + Orchestrator + Universal Command Bar
├── content/
│   ├── copilot.js             FAB + panel (Coach/Agent/Fill/Chat) + autofill + Draft
│   ├── overlay.css            tvc- prefixed brand styles
│   └── webapp-bridge.js       Session sync from mymarketiq.online
└── scripts/
    ├── make-icons.mjs         Zero-dep PNG icon generator
    └── package.sh             Store-ready zip
```

## Troubleshooting

- **Red dot / "Not connected"** — open the popup and sign in, or open the webapp `/admin` (signed in) and hit *Sync*.
- **No context badge in header** — refresh the page; `chrome://` pages are blocked by Chrome (no content scripts can run there).
- **Wrong agent activated** — `lib/context.js` falls back to *Website* mode for unknown domains. Use the Universal Command Bar to force a specific intent.
- **Autofill misses fields** — multi-step forms re-render; re-open the **Fill** tab (re-scans) and apply again.
- **[CONFIRM: …] in answers** — the AI refuses to invent facts; replace with real data before submitting.
