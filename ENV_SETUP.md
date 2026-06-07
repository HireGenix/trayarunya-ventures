# Environment Setup — Trayarunya Ventures

All secrets live in **`.env`** (gitignored — never committed). Copy the keys
below, fill in the blank values, then restart the dev server.

> ⚠️ The Azure key that used to be hardcoded in `src/services/azureOpenAI.ts` and
> `vercel.json` has been removed. Treat it as compromised and **rotate it in the
> Azure portal**.

---

## Database (Azure PostgreSQL + Prisma) — REQUIRED

All application data — users, leads, proposals, blog posts, analytics, conversations,
settings, SEO snapshots — now lives in **Azure Database for PostgreSQL** accessed via
**Prisma**. The old `data/*.json` and Vercel Blob stores are no longer the source of truth.

| Variable | What it is | Where to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection string with `sslmode=require`. Format: `postgresql://USER:PASSWORD@HOST:5432/trayarunya?sslmode=require` | Azure Portal → `psql-trayarunya-prod` → Connection strings, or Key Vault secret `DATABASE-URL` |

**Local / first-time setup:**

```bash
npm install                 # runs `prisma generate` via postinstall
npm run db:push             # creates tables on the Azure DB (already done for prod)
npm run db:import           # one-time import of legacy data/*.json (idempotent)
```

> On **Vercel**, `prisma generate` runs automatically (postinstall + the `build` script),
> so the Prisma client is always in sync with the schema at deploy time. Set `DATABASE_URL`
> in the Vercel project env (Production + Preview).


## AI Sales Chat (Azure OpenAI GPT-5.5 — Responses API)

The text-based AI Sales Partner on `/contact`. It chats with the visitor, researches
their company live (Tavily + Crawl4AI) and builds an **Ideal Customer Profile (ICP)**
on screen in realtime, then emails the lead to the team.

| Variable | What it is | Where to get it |
|---|---|---|
| `AZURE_GPT5_ENDPOINT` | Resource base URL, e.g. `https://hiregenix-resource.cognitiveservices.azure.com` (everything before `/openai/responses`) | Azure Portal → resource → Overview |
| `AZURE_GPT5_KEY` | API key. Can reuse `AZURE_OPENAI_REALTIME_KEY`. | Azure Portal → resource → Keys and Endpoint |
| `AZURE_GPT5_DEPLOYMENT` | Deployment name — `gpt-5.5` | Azure AI Foundry → Deployments |
| `AZURE_GPT5_API_VERSION` | Responses API version — `2025-04-01-preview` | — |

## Web scraping for ICP enrichment

The agent reads a visitor's website to enrich the ICP. Scraping runs in this
priority order, so **no configuration is required** — it works out of the box:

1. **External Crawl4AI server** — only if `CRAWL4AI_API_URL` is set (optional).
2. **Native Next.js scraper** — built-in (fetch + cheerio, runs in-process on
   Vercel). Handles server-rendered marketing/company sites with zero setup.
3. **Tavily extract** — fallback if `TAVILY_API_KEY` is set.

| Variable | What it is | Where to get it |
|---|---|---|
| `CRAWL4AI_API_URL` | *(Optional)* Base URL of an external Crawl4AI REST server (e.g. `https://your-host`). The agent POSTs `/crawl`. Leave blank to use the built-in native scraper. | Your Crawl4AI deployment |
| `CRAWL4AI_API_TOKEN` | *(Optional)* Bearer token for the Crawl4AI server, if it requires one | Your Crawl4AI deployment |

## AI Voice Marketer (Azure OpenAI Realtime — GA) — legacy, not currently rendered

A natural-voice AI that talks about our services, researches
the visitor's company live (Tavily), and captures lead details on screen.

| Variable | What it is | Where to get it |
|---|---|---|
| `AZURE_OPENAI_REALTIME_RESOURCE` | Resource **name** only — the part before `.openai.azure.com` (e.g. `sumit-xxxx`). Not the full URL. | Azure Portal → your OpenAI resource → Overview |
| `AZURE_OPENAI_REALTIME_KEY` | API key for that resource | Azure Portal → resource → Keys and Endpoint |
| `AZURE_OPENAI_REALTIME_DEPLOYMENT` | Your realtime model deployment name | Azure AI Foundry → Deployments (deploy `gpt-realtime`) |
| `AZURE_OPENAI_REALTIME_VOICE` | Voice. `marin` (default) or `cedar` are the most natural for `gpt-realtime`. Others: alloy, ash, ballad, coral, echo, sage, shimmer, verse. | — |

**Region note:** `gpt-realtime` is available in **East US 2** and **Sweden Central**.

## Tavily (live company research)

| Variable | What it is | Where to get it |
|---|---|---|
| `TAVILY_API_KEY` | Search API key the AI uses to research a prospect's company | https://app.tavily.com → API Keys |

## Existing Azure OpenAI (chat) — moved out of code

| Variable | Notes |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | Full endpoint URL |
| `AZURE_OPENAI_API_KEY` | **Rotate this** — it was previously committed in source |
| `AZURE_OPENAI_API_VERSION` | Defaults to `2025-01-01-preview` |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Defaults to `gpt-4.1` |

---

## How it stays safe

- The Azure realtime **key never reaches the browser**. The server mints a short-lived
  **ephemeral token** (`/api/ai-marketer/session`); the browser uses only that to open
  the WebRTC voice connection.
- If realtime keys are missing, the session endpoint returns **503** and the contact
  page **gracefully falls back** to the normal typed form — nothing breaks.
- Token + research endpoints are rate-limited; voice sessions have a time cap.

## Run

```bash
npm install
npm run dev   # http://localhost:3000/contact
```

---

## Admin platform — Users + internal AI Assistant

### Internal AI Assistant (Claude Opus via Azure Anthropic)

| Variable | Notes |
|---|---|
| `AZURE_ANTHROPIC_ENDPOINT` | Full Messages URL, e.g. `https://<resource>.services.ai.azure.com/anthropic/v1/messages` |
| `AZURE_ANTHROPIC_KEY` | Anthropic key. Falls back to `AZURE_GPT5_KEY` / realtime key if unset |
| `AZURE_ANTHROPIC_MODEL` | Defaults to `claude-opus-4-7` |

The admin AI Assistant (`/admin/assistant`) lets staff switch between **GPT-5.5** (Azure
Responses API, reuses `AZURE_GPT5_*`) and **Claude Opus** (above) per conversation.

### Admin auth

| Variable | Notes |
|---|---|
| `JWT_SECRET` | Secret used to sign admin JWTs. **Required in production** — signing/verifying throws if unset. A dev-only fallback is used when `NODE_ENV !== 'production'`. Source of truth: Key Vault secret `JWT-SECRET`. |
| `ADMIN_EMAIL` | Optional. Overrides the default admin email (`admin@trayarunyaventures.com`) |
| `ADMIN_PASSWORD` | Optional. Overrides the default admin password (`admin123`). **Set this in production / on Vercel for a secure login.** |
| `SUPERADMIN_EMAIL` | Optional. Overrides the default super-admin email |
| `SUPERADMIN_PASSWORD` | Optional. Overrides the default super-admin password (`superadmin123`). **Set this in production.** |

> 🔐 **Live login on Vercel:** the user store seeds the two default admin accounts into
> Postgres on first run if the `users` table is empty. Set `ADMIN_PASSWORD` /
> `SUPERADMIN_PASSWORD` (and `JWT_SECRET`) in the Vercel project env to secure the live
> login. Users created at `/admin/users` now **persist in Postgres** across redeploys.

### Storage (Azure PostgreSQL via Prisma)

All durable data is stored in Postgres — see the **Database** section at the top.

| Data | Prisma model / table |
|---|---|
| Admin users (scrypt-hashed passwords) | `User` / `users` |
| Contact leads + ICP data | `Lead` / `leads` |
| AI-generated proposals/decks | `Proposal` / `proposals` |
| Blog posts | `BlogPost` / `blog_posts` |
| Visitor analytics events | `AnalyticsEvent` / `analytics_events` |
| Admin assistant conversations | `Conversation` / `conversations` |
| Site settings | `Setting` / `settings` |
| SEO snapshot | `SeoSnapshot` / `seo_snapshots` |

> ✅ Because everything is in a shared database, leads and proposals are consistent across
> all serverless instances and survive redeploys — no more vanishing data from the old
> ephemeral `data/*.json` files.

### (Optional) Vercel Blob

| Variable | Notes |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Optional. Only needed if you store large binary artifacts (e.g. exported PDF/PPTX files) in Vercel Blob. Core app data no longer depends on it. |
