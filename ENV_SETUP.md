# Environment Setup — Trayarunya Ventures

All secrets live in **`.env.local`** (gitignored — never committed). Copy the keys
below, fill in the blank values, then restart the dev server.

> ⚠️ The Azure key that used to be hardcoded in `src/services/azureOpenAI.ts` has
> been moved here. Treat it as compromised and rotate it in the Azure portal.

---

## AI Voice Marketer (Azure OpenAI Realtime — GA)

A natural-voice AI on the `/contact` page that talks about our services, researches
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
