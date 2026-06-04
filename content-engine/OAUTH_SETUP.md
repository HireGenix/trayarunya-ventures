# One-click social sign-in (OAuth) setup

The Content Engine already supports **direct "Sign in with LinkedIn / X / Instagram / YouTube"**
on the Publishing page — no copying of access tokens. The popup OAuth flow, callback handler,
token storage and refresh are all implemented.

So why does it sometimes ask you to **paste an access token**?

Because each social network legally requires *you* (the app owner) to register a **developer app**
to obtain a `client_id` + `client_secret` and to be granted **posting** permissions. Until those
credentials are present in the API `.env`, the server reports the network as "not configured", the
**Sign in with…** button shows **(setup)** and is disabled, and the only fallback left is the
manual *Advanced: paste token* dialog. Every publishing tool (Buffer, Hootsuite, Later, Publer…)
does exactly this — there is no way to bypass per-app registration.

Once you register the apps and fill in the keys, the publishing page turns into pure one-click
sign-in and you never touch a token again.

## 1. Set the public callback base

In `content-engine/api/.env`:

```
OAUTH_REDIRECT_BASE=http://localhost:8099     # local dev
# OAUTH_REDIRECT_BASE=https://api.yourdomain.com   # production
```

The exact **redirect / callback URL** you must register in each provider is:

```
<OAUTH_REDIRECT_BASE>/api/v1/social/<network>/callback
```

| Network   | Redirect URL to register                                  |
|-----------|-----------------------------------------------------------|
| LinkedIn  | `http://localhost:8099/api/v1/social/linkedin/callback`   |
| X (Twitter) | `http://localhost:8099/api/v1/social/x/callback`        |
| Facebook/Instagram | `http://localhost:8099/api/v1/social/facebook/callback` |
| YouTube/Google | `http://localhost:8099/api/v1/social/youtube/callback` |

## 2. Register one developer app per network

| Network   | Where to create the app | Permission/scope you must request |
|-----------|-------------------------|-----------------------------------|
| **LinkedIn** | https://www.linkedin.com/developers/apps | "Share on LinkedIn" → `w_member_social` (plus `openid profile email`) |
| **X / Twitter** | https://developer.twitter.com (OAuth 2.0, PKCE) | `tweet.read tweet.write users.read offline.access` |
| **Meta (FB + Instagram)** | https://developers.facebook.com/apps | `pages_manage_posts`, `instagram_content_publish`, `pages_show_list`, `business_management` |
| **Google / YouTube** | https://console.cloud.google.com/apis/credentials (OAuth client ID) | `youtube.upload`, `youtube.readonly` |

> Meta & X require **App Review** before they grant publishing scopes on live (non-test) accounts.
> During development you can publish to your own/test accounts immediately.

## 3. Paste the credentials into `.env`

```
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
X_CLIENT_ID=...
X_CLIENT_SECRET=...
META_APP_ID=...
META_APP_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Restart the API. `GET /api/v1/social/providers` will now report `true` for each configured
network, and the Publishing page shows **"Sign in with …"** buttons.

## 4. How a user connects (after setup)

1. Publishing page → click **Sign in with LinkedIn** (etc.).
2. A popup opens the real provider login/consent screen (`/social/<net>/connect` builds the URL,
   with PKCE for X).
3. After consent the provider redirects to `/social/<net>/callback`, the API exchanges the code for
   tokens (`exchange_code`) and stores them on a `SocialAccount` (with refresh token + expiry).
4. The popup closes and the account appears under **Connected accounts** — ready for one-click
   publish. No tokens are ever shown to the user.

## Security notes

- `client_secret` values live only in the server `.env` — never shipped to the browser.
- OAuth `state` is single-use (CSRF protection); back it with Redis when running more than one API
  instance (`app/services/oauth.py` `_STATE` is in-memory for single-instance/local dev).
- Store `SocialAccount.access_token` / `refresh_token` encrypted at rest in production.

---

# Integrations hub OAuth (CRM / Analytics / Ecommerce)

Beyond social publishing, the **Integrations** page connects business systems —
HubSpot, Google Analytics 4, Google Search Console and Shopify — so the platform can
read live data (contacts, sessions, search performance, orders) for attribution and
reporting. Exactly like the social flow: **manual API-token connect always works**, and
**one-click OAuth** turns on once you register a developer app and add its credentials.

The redirect / callback URL to register for each provider is:

```
<OAUTH_REDIRECT_BASE>/api/v1/integrations/<provider>/oauth/callback
```

| Provider | `<provider>` | Callback URL (local dev) |
|---|---|---|
| HubSpot | `hubspot` | `http://localhost:8099/api/v1/integrations/hubspot/oauth/callback` |
| Google Analytics 4 | `ga4` | `http://localhost:8099/api/v1/integrations/ga4/oauth/callback` |
| Google Search Console | `search_console` | `http://localhost:8099/api/v1/integrations/search_console/oauth/callback` |
| Shopify | `shopify` | `http://localhost:8099/api/v1/integrations/shopify/oauth/callback` |

## Register the apps & scopes

| Provider | Where to create the app | Scopes requested |
|---|---|---|
| **HubSpot** | https://developers.hubspot.com → Apps → Auth | `oauth`, `crm.objects.contacts.read` |
| **Google (GA4 + Search Console)** | https://console.cloud.google.com/apis/credentials (OAuth client ID) | `analytics.readonly`, `webmasters.readonly` |
| **Shopify** | https://partners.shopify.com → Apps (or a custom app) | `read_products`, `read_orders` |

> GA4 and Search Console **share** the single Google OAuth client (`GOOGLE_CLIENT_ID` /
> `GOOGLE_CLIENT_SECRET`). Add both redirect URLs and both scopes to that one client.
> Google requires `access_type=offline` (already sent) to issue a refresh token.

## Paste the credentials into `.env`

```
OAUTH_REDIRECT_BASE=http://localhost:8099
HUBSPOT_CLIENT_ID=...
HUBSPOT_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
```

Restart the API. `GET /api/v1/integrations/catalog` now reports `configured: true` for those
providers and the Integrations dialog shows a **"Connect with … (OAuth)"** button.

## How a user connects (after setup)

1. Integrations page → click a provider → **Connect with … (OAuth)**. (For Shopify, enter the
   store domain first, e.g. `my-store.myshopify.com`.)
2. A popup opens the real provider consent screen (`POST /integrations/connect` returns the
   authorization URL).
3. After consent the provider redirects to `/integrations/<provider>/oauth/callback`; the API
   exchanges the code for tokens (`exchange_code`), stores them **encrypted** on an `Integration`
   row (with refresh token + expiry), and the popup self-closes.
4. **Sync** reads live data; if a Google access token has expired, the API automatically uses the
   stored refresh token to mint a new one and retries — no reconnect needed.

## Security notes

- `client_secret` values live only in the server `.env` — never shipped to the browser.
- OAuth `state` is single-use with a 10-minute TTL (CSRF protection); back it with Redis when
  running more than one API instance (`app/services/integrations_oauth.py` `_store` is in-memory
  for single-instance/local dev).
- Access and refresh tokens are encrypted at rest via the `ENCRYPTION_KEY` Fernet key.
