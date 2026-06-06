# Trayarunya Content Engine

A production-grade, multi-tenant **content + ads operating system**. It runs a closed
agentic loop — **research → strategize → create → publish → measure → learn** — for
individuals, freelancers, companies, and agencies.

- **Frontend:** Next.js 15 (App Router) · React 19 · MUI 7 · Framer Motion
- **Backend:** FastAPI · SQLAlchemy (async) · LangGraph · DSPy
- **AI:** Azure OpenAI GPT-5.5 (Responses API) + Azure Anthropic Claude Opus (Messages API)
- **Data:** PostgreSQL · Redis (job queue)
- **Web search / crawl:** DuckDuckGo (no API key) · crawl4ai (Playwright) with an
  httpx + BeautifulSoup fallback
- **Hosting:** Azure Container Apps

> This lives as a subdirectory of the Trayarunya Ventures marketing site and shares its
> brand theme and Azure AI resource. It is a separate, independently deployable product.

---

## 1. Repository structure

```
content-engine/
├── api/                     # FastAPI + agents (Python 3.12)
│   ├── app/
│   │   ├── main.py          # app factory, mounts routers under /api/v1
│   │   ├── config.py        # env-driven settings
│   │   ├── db.py            # async engine/session
│   │   ├── security.py      # bcrypt + JWT
│   │   ├── deps.py          # auth + workspace scoping + role guards
│   │   ├── models/          # ORM (tenant/brand/research/strategy/content/social/ads/billing)
│   │   ├── schemas/         # Pydantic
│   │   ├── services/        # auth, research_runner
│   │   ├── llm/             # Azure GPT-5.5 + Claude adapters, DSPy config
│   │   ├── tools/           # web_search (DDG), crawler (crawl4ai)
│   │   ├── agents/          # research_graph (LangGraph), strategist (DSPy)
│   │   ├── worker/          # Redis FIFO queue + worker
│   │   └── routers/         # auth, workspaces, research, strategy, health
│   ├── requirements.txt
│   ├── Dockerfile           # includes Playwright/Chromium for crawl4ai
│   └── .env.example
├── web/                     # Next.js 15 dashboard
│   ├── src/app/             # landing, login, signup, dashboard/*
│   ├── src/lib/             # api.ts (typed client), auth.tsx (context)
│   ├── src/theme/           # Trayarunya brand theme
│   ├── Dockerfile           # standalone output
│   └── .env.example
├── infra/azure/             # main.bicep (Container Apps + Postgres + Redis)
├── docker-compose.yml       # local full stack
└── README.md
```

### Multi-tenancy model

`User → Organization (individual | freelancer | company | agency) → Workspace`.
A `Membership` links a user to an organization with a `Role`
(`owner | admin | manager | editor | viewer`), optionally scoped to one workspace.
Almost every domain row is scoped by `workspace_id`. The API requires an
`X-Workspace-Id` header, validated against the caller's memberships (403/404 on mismatch).

---

## 2. Local development

### Option A — Docker (full stack)

```bash
cd content-engine
cp api/.env.example api/.env        # fill in Azure keys (optional for first run)
docker compose up --build
```

- Web: http://localhost:3100
- API: http://localhost:8099  (`/health`, `/ready`, docs at `/docs`)

### Option B — run pieces manually

**Backend** (Python 3.12 required — models use Postgres JSONB/UUID, so Postgres is required):

```bash
# infra
docker run -d --name ce_pg    -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=content_engine -p 5455:5432 postgres:16-alpine
docker run -d --name ce_redis -p 6390:6379 redis:7-alpine

cd content-engine/api
python3.12 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium   # optional; crawler falls back without it

export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5455/content_engine"
export REDIS_URL="redis://localhost:6390/0"
export ENVIRONMENT=development JWT_SECRET="dev-secret"
uvicorn app.main:app --port 8099 --reload

# in a second shell (background job worker)
python -m app.worker.run_worker
```

> In `development`, the API auto-creates tables on startup. For production use Alembic
> migrations (to be added in a later module).

**Frontend:**

```bash
cd content-engine/web
cp .env.example .env.local          # NEXT_PUBLIC_API_URL=http://localhost:8099
npm install
npm run dev                         # http://localhost:3100
```

### Smoke test (no Azure keys needed)

```bash
# signup → returns access_token
curl -s -X POST http://localhost:8099/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"Passw0rd9","full_name":"You","org_name":"Acme","org_type":"company"}'
```

Research jobs **queue** without LLM keys but finish in a `failed` state until Azure
GPT-5.5 or Claude credentials are configured. DDG search and the crawler fallback work
with no keys.

---

## 3. Deploy to Azure (Container Apps)

1. **Build & push images** to your container registry (ACR):

   ```bash
   az acr login -n <acr>
   docker build -t <acr>.azurecr.io/ce-api:latest ./content-engine/api
   docker build -t <acr>.azurecr.io/ce-web:latest \
     --build-arg NEXT_PUBLIC_API_URL=https://<your-api-fqdn> ./content-engine/web
   docker push <acr>.azurecr.io/ce-api:latest
   docker push <acr>.azurecr.io/ce-web:latest
   ```

2. **Provision infra** (Log Analytics, Postgres Flexible Server, Redis, Container Apps env,
   and the three apps):

   ```bash
   az group create -n rg-content-engine -l centralindia
   cd content-engine/infra/azure
   cp params.example.json params.json   # fill in secrets + image refs
   az deployment group create -g rg-content-engine -f main.bicep -p @params.json
   ```

   Outputs include `apiUrl`, `webUrl`, and `postgresHost`.

3. **Env/secrets** are wired by the bicep (DATABASE_URL, REDIS_URL, JWT_SECRET, and the
   Azure AI keys) as Container App secrets. Update them with `az containerapp secret set`.

The worker runs as its own Container App (no ingress) executing
`python -m app.worker.run_worker`.

---

## 4. Required environment variables

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | api, worker | asyncpg URL, e.g. `postgresql+asyncpg://...` |
| `REDIS_URL` | api, worker | `rediss://...` in Azure (TLS, port 6380) |
| `JWT_SECRET` | api | long random string |
| `CORS_ORIGINS` | api | comma-separated web origins |
| `AZURE_GPT5_ENDPOINT` / `AZURE_GPT5_KEY` | api, worker | GPT-5.5 (Responses API) |
| `AZURE_ANTHROPIC_ENDPOINT` / `AZURE_ANTHROPIC_KEY` | api, worker | Claude Opus (Messages API) |
| `AZURE_BLOB_CONNECTION_STRING` | api, worker | asset storage (later modules) |
| `PEXELS_API_KEY` | api | stock b-roll for AI video studio (free key) |
| `AZURE_TTS_*` / `AZURE_WHISPER_*` | api | AI video voiceover + captions (fall back to `AZURE_GPT5_*`) |
| `NEXT_PUBLIC_API_URL` | web | public API base URL (baked at build time) |

See `api/.env.example` and `web/.env.example`.

> **AI video generation** also requires the `ffmpeg` and `ffprobe` binaries on the
> API host (`brew install ffmpeg` locally, `apt-get install -y ffmpeg` in the
> container image). Without them, `/videos/generate` returns a clear 503 instead
> of crashing.

---

## 5. Social & Ads OAuth credentials checklist

Publishing uses **native OAuth** for every network (full control; you create the developer
apps). Collect these as you reach the publishing/ads modules (M3–M5). Each network needs a
developer app, a redirect/callback URL, and the scopes below.

> Redirect URL pattern: `https://<your-api-fqdn>/api/v1/social/<network>/callback`

### LinkedIn (M3 — first)
- [ ] LinkedIn Developer app (https://www.linkedin.com/developers/)
- [ ] Products: **Sign In with LinkedIn (OIDC)** + **Share on LinkedIn** (and **Community
      Management API** for company-page posting / analytics — requires review)
- [ ] Scopes: `openid`, `profile`, `email`, `w_member_social` (member posts);
      `r_organization_social`, `w_organization_social`, `rw_organization_admin` (pages)
- [ ] `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, redirect URL

### X / Twitter (M3 — first)
- [ ] X Developer account + Project/App (https://developer.x.com/)
- [ ] OAuth 2.0 with PKCE enabled; **Read and Write** permissions
- [ ] Scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
- [ ] `X_CLIENT_ID`, `X_CLIENT_SECRET`, redirect URL

### Meta — Facebook Pages & Instagram (M4)
- [ ] Meta app (https://developers.facebook.com/) — Business type
- [ ] Products: **Facebook Login**, **Instagram Graph API**
- [ ] An Instagram **Business/Creator** account linked to a Facebook Page
- [ ] Scopes: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`,
      `instagram_basic`, `instagram_content_publish`, `business_management`
- [ ] App Review for the above scopes; `META_APP_ID`, `META_APP_SECRET`, redirect URL

### YouTube / Google (M4)
- [ ] Google Cloud project + **YouTube Data API v3** enabled
- [ ] OAuth consent screen (External) + OAuth client (Web)
- [ ] Scopes: `https://www.googleapis.com/auth/youtube.upload`,
      `https://www.googleapis.com/auth/youtube.readonly`
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URL

### Google Ads (M5)
- [ ] Google Ads **Manager (MCC)** account
- [ ] **Developer token** (apply via API Center; basic access requires approval)
- [ ] OAuth client (reuse the Google project above) with scope
      `https://www.googleapis.com/auth/adwords`
- [ ] `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`,
      `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] For Google Ads **for Nonprofits / Ad Grants**, link the Ad Grants account under the MCC

Store every secret as a Container App secret (or Key Vault reference) — never in source.

---

## 6. Build order (modules)

- **M0 — Foundation** *(this module)*: monorepo, auth + multi-tenancy, research agent
  (LangGraph), strategist (DSPy), job worker, dashboard shell, infra. ✅
- **M1 — Brand Brain + Insights**: brand scraping/colors, AnswerThePublic-style insights.
- **M2 — Creation Studio**: posts, blogs, threads, lead magnets; templates + assets.
- **M3 — Publishing**: native OAuth LinkedIn + X; scheduling + publish.
- **M4 — Meta + YouTube**: Facebook/Instagram + YouTube connectors.
- **M5 — Google Ads**: agentic campaign creation/optimization (incl. Ad Grants).
- **M6 — Learning loop + billing**: measure → learn feedback; plans/usage.

See `files/content-engine-plan.md` (session artifact) for the full plan and resolved
decisions.
