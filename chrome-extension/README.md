# Trayarunya Copilot — Chrome Extension

Agentic AI copilot for founders, synced to the **Content Engine (MarketiQ) webapp**. Same product pattern as the MarketiQ LinkedIn copilot: a small **popup** for account/quick actions and an **on-page floating panel** (FAB, bottom-right) that works on every site.

## What it does

**Panel tabs** (open with the FAB or **Alt+T**):

| Tab | Purpose |
|---|---|
| **Coach** | Realtime page understanding — analyse the page for your objective, extract requirements/deadlines/limits, summarise, optional 📸 screenshot vision |
| **Agent** | Missions with a live step timeline: 🔎 Research this page (live web) · 📝 Fill this application · ✉️ Draft investor outreach · ✅ Check program eligibility (Founders Hub / ISV / AWS / Google) · 🚀 Draft store listing |
| **Fill** | Scan any form (YC, VC funds, Microsoft Founders Hub, Partner Center, Play/App Store consoles) → AI drafts every answer from your startup profile → review → **⚡ Apply** autofill (React-safe, nothing auto-submitted) |
| **Chat** | Free chat grounded in the live page, with 6 specialist modes (Page Copilot / VC / YC / Outreach / Credits & Programs / Store Publishing) |

**Composer ✦ Draft** — a draft button appears on Gmail, Outlook web and LinkedIn composers: personalised investor emails/notes drafted from the page, inserted only when you click.

**Popup** (toolbar icon): account card, workspace picker, quick links (YC, Founders Hub, Partner Center, Dashboard), pipeline stats, **startup profile** — enter just your **product & company website URLs** and the AI crawls them + web-researches to build the full founder profile that grounds every answer — and settings (API + web app URLs).

**AI model**: every extension request is pinned to the GitHub Copilot subscription model **Claude Fable 5** (`model_key: copilot:claude-fable-5`) via the Content Engine model registry (`COPILOT_LLM_ENABLED=true` required on the backend).

## How it connects to the webapp

No AI keys in the extension — it uses the Content Engine API (`https://api.mymarketiq.online`):

| Endpoint | Used for |
|---|---|
| `POST /api/v1/auth/login` | Email/password sign-in → bearer token |
| `GET /api/v1/auth/me` | User + workspaces (workspace picker in popup) |
| `POST /api/v1/chat/conversations` | AI conversations — workspace-grounded, vision attachments, built-in web search |
| `POST /api/v1/chat/conversations/{id}/messages` | Follow-up turns (Chat tab keeps one server-side conversation) |
| `GET /api/v1/linkedin/leads` · `/linkedin/tasks` | Popup stats |

All calls carry `Authorization: Bearer` + `X-Workspace-Id`, proxied by the background worker.

**Auto-connect:** if you're signed in to the MarketiQ webapp in another tab, the bridge content script syncs the session (`ce_token`/`ce_workspace`) automatically — or press *⚡ Sync from open web app tab* in the popup.

## Install (development)

```bash
cd chrome-extension
node scripts/make-icons.mjs        # generate brand icons (zero deps)
```

1. `chrome://extensions` → **Developer mode** → **Load unpacked** → select `chrome-extension/`.
2. Click the toolbar icon → sign in (or sync from an open webapp tab). For local dev set API URL to `http://localhost:8099` and Web App URL to `http://localhost:3000` in popup Settings.
3. In the popup, open **Startup profile**, enter your product + company website URLs and hit **🔎 Research & build profile** (one-time, ~30-60s).
4. Open any page → **Alt+T**.

Keyboard: **Alt+T** toggle panel · **Alt+Shift+A** Agent missions · **Alt+Shift+C** coach this page.

## Publish to the Chrome Web Store

```bash
./scripts/package.sh               # → trayarunya-copilot-vX.Y.Z.zip
```

Upload at the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole). Prepare:
- **Privacy policy URL** on mymarketiq.online — page content is sent to your own backend for AI processing; credentials stored locally; no data sold.
- **Permission justifications**: content script on `<all_urls>` (founders fill applications on many domains — page reading & form autofill), `activeTab` (screenshot vision), `storage` (JWT + profile), `scripting`, `tabs` (session sync + quick links).
- **Single purpose**: AI assistant that helps founders research pages and complete fundraising/program/publishing applications.

## File map

```
chrome-extension/
├── manifest.json              MV3 — popup, commands, content scripts
├── background.js              Auth state + API proxy + SSE stream ports + badge
├── popup.html / css / js      Account, model, quick actions, stats, profile, settings
├── content/
│   ├── copilot.js             FAB + panel (Coach/Agent/Fill/Chat), missions, autofill, ✦ Draft
│   ├── overlay.css            tvc- prefixed brand styles (amber → teal)
│   └── webapp-bridge.js       Session sync from mymarketiq.online localStorage (ce_token)
└── scripts/
    ├── make-icons.mjs         Zero-dep PNG icon generator
    └── package.sh             Store-ready zip
```

## Troubleshooting

- **Red dot / "Not connected"** — open the popup and sign in, or open the webapp `/admin` (signed in) and hit *Sync*.
- **Panel missing on a tab** — pages opened before install need a refresh; `chrome://` pages are blocked by Chrome.
- **Autofill misses fields** — multi-step forms re-render; re-open the **Fill** tab (re-scans) and apply again.
- **[CONFIRM: …] in answers** — the AI refuses to invent facts; replace with real data before submitting.
