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
