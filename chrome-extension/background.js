"use strict";

/**
 * Trayarunya Copilot — background service worker.
 *
 * Owns auth state (token / workspace / API base URL) in chrome.storage.local
 * and proxies all Content Engine (MarketiQ) API calls so content scripts never
 * deal with CORS or credentials directly. The in-page copilot panel talks AI
 * through long-lived ports backed by the Content Engine chat API
 * (/api/v1/chat/conversations) with vision attachments + built-in web search.
 */

const DEFAULTS = {
  apiUrl: "https://api.mymarketiq.online",
  webAppUrl: "https://mymarketiq.online",
};

// All extension AI calls are pinned to the GitHub Copilot subscription model
// claude-fable-5 (registry key "copilot:<id>"); the alias resolver also
// accepts the bare id if the registry entry is namespaced differently.
const MODEL_KEY = "copilot:claude-fable-5";

async function getState() {
  const s = await chrome.storage.local.get([
    "tvcToken",
    "tvcWorkspaceId",
    "tvcApiUrl",
    "tvcWebAppUrl",
    "tvcUser",
  ]);
  return {
    token: s.tvcToken || null,
    workspaceId: s.tvcWorkspaceId || null,
    apiUrl: (s.tvcApiUrl || DEFAULTS.apiUrl).replace(/\/+$/, ""),
    webAppUrl: (s.tvcWebAppUrl || DEFAULTS.webAppUrl).replace(/\/+$/, ""),
    user: s.tvcUser || null,
  };
}

async function setState(patch) {
  const out = {};
  if ("token" in patch) out.tvcToken = patch.token;
  if ("workspaceId" in patch) out.tvcWorkspaceId = patch.workspaceId;
  if ("apiUrl" in patch) out.tvcApiUrl = patch.apiUrl;
  if ("webAppUrl" in patch) out.tvcWebAppUrl = patch.webAppUrl;
  if ("user" in patch) out.tvcUser = patch.user;
  await chrome.storage.local.set(out);
}

/** Generic Content Engine API call. Returns {ok, status, data|error}. */
async function apiCall({ path, method = "GET", body, workspace = true, auth = true }) {
  const state = await getState();
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    if (!state.token)
      return { ok: false, status: 401, error: "Not connected. Open the extension popup and sign in." };
    headers["Authorization"] = `Bearer ${state.token}`;
  }
  if (workspace && state.workspaceId) headers["X-Workspace-Id"] = state.workspaceId;
  try {
    const res = await fetch(`${state.apiUrl}/api/v1${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
      data = res.status === 204 ? null : await res.json();
    } catch (_) {
      /* non-JSON body */
    }
    if (!res.ok) {
      const detail = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
      if (res.status === 401) await setState({ token: null, user: null });
      return { ok: false, status: res.status, error: typeof detail === "string" ? detail : JSON.stringify(detail) };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: `Cannot reach API at ${state.apiUrl} — ${e.message}` };
  }
}

/** Login with email/password, fetch profile + workspaces. */
async function login({ email, password }) {
  const res = await apiCall({
    path: "/auth/login",
    method: "POST",
    body: { email, password },
    workspace: false,
    auth: false,
  });
  if (!res.ok) return res;
  const token = res.data && (res.data.access_token || res.data.token);
  if (!token) return { ok: false, status: 500, error: "No token in login response" };
  await setState({ token });
  const me = await apiCall({ path: "/auth/me", workspace: false });
  if (me.ok && me.data) {
    const workspaces = me.data.workspaces || [];
    await setState({
      user: { email: me.data.user?.email, name: me.data.user?.full_name, workspaces },
      workspaceId: workspaces.length ? workspaces[0].id : null,
    });
  }
  return { ok: true, status: 200, data: { token } };
}

/** Pull token+workspace from an open Content Engine web-app tab. */
async function syncFromWebApp() {
  const state = await getState();
  const tabs = await chrome.tabs.query({});
  const appTabs = tabs.filter((t) => t.url && t.url.startsWith(state.webAppUrl));
  for (const tab of appTabs) {
    if (!tab.id) continue;
    try {
      const resp = await chrome.tabs.sendMessage(tab.id, { action: "tvc.getToken" });
      if (resp && resp.token) {
        await setState({ token: resp.token, workspaceId: resp.workspaceId || null });
        const me = await apiCall({ path: "/auth/me", workspace: false });
        if (me.ok && me.data) {
          const workspaces = me.data.workspaces || [];
          await setState({
            user: { email: me.data.user?.email, name: me.data.user?.full_name, workspaces },
            workspaceId: (resp.workspaceId || (workspaces[0] && workspaces[0].id)) ?? null,
          });
        }
        return { ok: true, status: 200, data: { synced: true } };
      }
    } catch (_) {
      /* tab without bridge — ignore */
    }
  }
  return {
    ok: false,
    status: 404,
    error: `No signed-in MarketiQ tab found at ${state.webAppUrl}. Open the web app, sign in, then retry.`,
  };
}

// ------------------------------------------------------------- profile research
//
// The founder gives just two URLs (product + company site). We crawl a few
// key pages of each, then have claude-fable-5 + live web search compose a
// structured startup profile that grounds every other copilot answer.

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function crawlPage(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct && !/text\/html|application\/xhtml/.test(ct)) return null;
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
    const desc =
      (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1] ||
      (html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [])[1] || "";
    return {
      url,
      title: htmlToText(title).slice(0, 200),
      description: htmlToText(desc).slice(0, 300),
      text: htmlToText(html).slice(0, 6000),
    };
  } catch (_) {
    return null;
  }
}

async function crawlSite(baseUrl) {
  let origin;
  try {
    origin = new URL(baseUrl).origin;
  } catch (_) {
    return [];
  }
  const targets = [baseUrl];
  for (const p of ["/about", "/pricing", "/product"]) {
    const u = origin + p;
    if (u !== baseUrl) targets.push(u);
  }
  const pages = await Promise.all(targets.map(crawlPage));
  return pages.filter(Boolean);
}

const PROFILE_RESEARCH_PROMPT = `You are building the canonical STARTUP PROFILE for a founder. Research the company thoroughly: use the crawled website text below AND run a web search for anything the sites don't say (founders, funding, traction, news, competitors).

Write the profile as plain text lines, exactly these fields (write "[CONFIRM: not found]" where you genuinely cannot find a fact — never invent):
Company: <name>
One-liner: <max 15 words, product + customer>
Product: <what it does, who uses it, how it works — 2-3 sentences>
Customers / ICP: <who pays, segment B2B/B2C/D2C>
Stage: <idea / launched / revenue / funded — with evidence>
Traction: <users, revenue, growth, marquee customers — numbers only if found>
Team: <founders, backgrounds>
Business model: <how it makes money, pricing if visible>
Market: <category + rough size if known>
Competitors: <2-4 names>
Tech: <stack/platform hints (e.g. built on Azure) if visible>
Notable: <funding, awards, press, partnerships>

No markdown, no commentary before or after — just the profile lines.`;

/**
 * Background-owned research lifecycle: status + result are persisted to
 * chrome.storage.local so the flow survives the popup closing mid-way
 * (Chrome closes the popup on any focus change). UI re-hydrates from
 * tvcResearch / tvcProfile and live-updates via storage.onChanged.
 */
async function researchProfile({ productUrl, companyUrl }) {
  const fail = async (error) => {
    await chrome.storage.local.set({ tvcResearch: { state: "error", error, at: Date.now() } });
    return { ok: false, error };
  };

  const state = await getState();
  if (!state.token) return fail("Not connected. Sign in first.");
  if (!state.workspaceId) return fail("No workspace selected.");

  const urls = [...new Set([productUrl, companyUrl].filter(Boolean))];
  if (!urls.length) return fail("Enter at least one website URL.");

  // Persist the URLs + running state immediately — popup may die any moment.
  const { tvcProfile: existing } = await chrome.storage.local.get("tvcProfile");
  await chrome.storage.local.set({
    tvcProfile: { ...(existing || {}), productUrl, companyUrl },
    tvcResearch: { state: "running", startedAt: Date.now() },
  });

  const crawled = (await Promise.all(urls.map(crawlSite))).flat();
  const crawlBlock = crawled.length
    ? crawled
        .map((p) => `--- PAGE ${p.url} ---\nTitle: ${p.title}\n${p.description ? `Meta: ${p.description}\n` : ""}${p.text}`)
        .join("\n\n")
    : "(Could not crawl the sites directly — rely on web search.)";

  const message =
    `${PROFILE_RESEARCH_PROMPT}\n\nProduct website: ${productUrl || "—"}\nCompany website: ${companyUrl || "—"}\n\n=== CRAWLED WEBSITE TEXT ===\n${crawlBlock}`.slice(0, 55000);

  try {
    const res = await fetch(`${state.apiUrl}/api/v1/chat/conversations`, {
      method: "POST",
      signal: AbortSignal.timeout(120000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
        "X-Workspace-Id": state.workspaceId,
      },
      body: JSON.stringify({
        title: "Copilot — Startup profile research",
        message,
        model_key: MODEL_KEY,
        web_search: true,
        attachments: [],
      }),
    });
    if (res.status === 401) {
      await setState({ token: null, user: null });
      return fail("Session expired — sign in again.");
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = (data && (data.detail || data.message)) || `Research failed (${res.status})`;
      return fail(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    const msgs = (data && data.messages) || [];
    const assistant = [...msgs].reverse().find((m) => m.role === "assistant");
    const profile = ((assistant && assistant.content) || "").trim();
    if (!profile) return fail("Empty research result — try again.");

    // Background owns the save — works even if the popup is long gone.
    await chrome.storage.local.set({
      tvcProfile: { productUrl, companyUrl, researched: profile, researchedAt: Date.now() },
      tvcResearch: { state: "done", at: Date.now(), pagesCrawled: crawled.length },
    });
    return { ok: true, data: { profile, pagesCrawled: crawled.length } };
  } catch (e) {
    return fail(e.name === "TimeoutError" ? "Research timed out — try again." : `Research failed — ${e.message}`);
  }
}

// ------------------------------------------------------------- AI chat
//
// The in-page panel opens a long-lived "tvc-stream" port per AI request.
// Content Engine chat is conversation-based and non-streaming, so we create
// (or reuse) a conversation, post the message, and forward the assistant
// reply over the port as a single delta + done. Port disconnect = abort.

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "tvc-stream") return;
  const control = new AbortController();
  let started = false;

  port.onDisconnect.addListener(() => control.abort());

  const post = (msg) => {
    try {
      port.postMessage(msg);
    } catch (_) {
      /* port gone */
    }
  };
  const finish = (msg) => {
    if (msg) post(msg);
    try {
      port.disconnect();
    } catch (_) {}
  };

  port.onMessage.addListener(async (req) => {
    if (started) return; // one exchange per port
    started = true;

    const state = await getState();
    if (!state.token) {
      finish({ type: "error", message: "Not connected. Open the extension popup and sign in." });
      return;
    }
    if (!state.workspaceId) {
      finish({ type: "error", message: "No workspace selected — open the extension popup and pick one." });
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
      "X-Workspace-Id": state.workspaceId,
    };
    const base = `${state.apiUrl}/api/v1`;
    const text = String(req.text || "").slice(0, 60000);
    const attachments = Array.isArray(req.attachments) ? req.attachments.slice(0, 4) : [];
    const webSearch = !!req.webSearch;

    const readJson = async (res) => {
      try {
        return res.status === 204 ? null : await res.json();
      } catch (_) {
        return null;
      }
    };

    try {
      let convoId = req.conversationId || null;
      let assistant = null;

      post({ type: "tool", status: "running", label: webSearch ? "Researching & thinking…" : "Thinking…" });

      if (!convoId) {
        // Create a conversation seeded with the first message — one round trip.
        const res = await fetch(`${base}/chat/conversations`, {
          method: "POST",
          headers,
          signal: control.signal,
          body: JSON.stringify({
            title: String(req.title || text).slice(0, 290) || "Copilot",
            message: text,
            model_key: MODEL_KEY,
            web_search: webSearch,
            attachments,
          }),
        });
        if (res.status === 401) {
          await setState({ token: null, user: null });
          finish({ type: "error", message: "Session expired — sign in again from the extension popup." });
          return;
        }
        const data = await readJson(res);
        if (!res.ok) {
          const detail = (data && (data.detail || data.message)) || `AI request failed (${res.status})`;
          finish({ type: "error", message: typeof detail === "string" ? detail : JSON.stringify(detail) });
          return;
        }
        convoId = data && data.id;
        const msgs = (data && data.messages) || [];
        assistant = [...msgs].reverse().find((m) => m.role === "assistant") || null;
      } else {
        const res = await fetch(`${base}/chat/conversations/${convoId}/messages`, {
          method: "POST",
          headers,
          signal: control.signal,
          body: JSON.stringify({ text, model_key: MODEL_KEY, web_search: webSearch, attachments }),
        });
        if (res.status === 401) {
          await setState({ token: null, user: null });
          finish({ type: "error", message: "Session expired — sign in again from the extension popup." });
          return;
        }
        const data = await readJson(res);
        if (res.status === 404) {
          finish({ type: "error", message: "conversation_not_found" });
          return;
        }
        if (!res.ok) {
          const detail = (data && (data.detail || data.message)) || `AI request failed (${res.status})`;
          finish({ type: "error", message: typeof detail === "string" ? detail : JSON.stringify(detail) });
          return;
        }
        assistant = data && data.message;
      }

      const content = (assistant && assistant.content) || "";
      if (!content) {
        finish({ type: "error", message: "Empty AI response — please retry." });
        return;
      }
      post({ type: "meta", conversationId: convoId });
      post({ type: "delta", text: content });
      finish({ type: "done" });
    } catch (e) {
      if (e.name !== "AbortError") {
        finish({ type: "error", message: "AI request interrupted — please retry." });
      }
    }
  });
});

// Keyboard shortcuts → forward to the copilot content script.
chrome.commands?.onCommand.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null && /^https?:/.test(tab.url || "")) {
      chrome.tabs.sendMessage(tab.id, { action: "tvc.command", command }).catch(() => {});
    }
  } catch (_) {
    /* no active tab */
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    switch (request.action) {
      case "tvc.api":
        sendResponse(await apiCall(request));
        break;
      case "tvc.getState": {
        const s = await getState();
        sendResponse({ ok: true, data: { connected: !!s.token, ...s, token: undefined } });
        break;
      }
      case "tvc.setState":
        await setState(request.patch || {});
        sendResponse({ ok: true });
        break;
      case "tvc.login":
        sendResponse(await login(request));
        break;
      case "tvc.logout":
        await setState({ token: null, user: null });
        sendResponse({ ok: true });
        break;
      case "tvc.syncFromWebApp":
        sendResponse(await syncFromWebApp());
        break;
      case "tvc.research":
        sendResponse(await researchProfile(request));
        break;
      case "tvc.bridgeToken": {
        // Pushed proactively by the web-app bridge content script.
        if (request.token) {
          await setState({ token: request.token, workspaceId: request.workspaceId || null });
          const me = await apiCall({ path: "/auth/me", workspace: false });
          if (me.ok && me.data) {
            const workspaces = me.data.workspaces || [];
            await setState({
              user: { email: me.data.user?.email, name: me.data.user?.full_name, workspaces },
              workspaceId: (request.workspaceId || (workspaces[0] && workspaces[0].id)) ?? null,
            });
          }
        }
        sendResponse({ ok: true });
        break;
      }
      case "tvc.openTab":
        await chrome.tabs.create({ url: request.url });
        sendResponse({ ok: true });
        break;
      case "tvc.capture": {
        // Screenshot of the sender's visible tab — feeds AI vision.
        try {
          const windowId = sender.tab ? sender.tab.windowId : undefined;
          const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 80 });
          sendResponse({ ok: true, data: { dataUrl } });
        } catch (e) {
          sendResponse({ ok: false, error: e.message || "Capture failed" });
        }
        break;
      }
      case "tvc.badge": {
        const tabId = sender.tab && sender.tab.id;
        if (tabId != null) {
          await chrome.action.setBadgeText({ text: String(request.text || ""), tabId });
          await chrome.action.setBadgeBackgroundColor({ color: "#14BB87", tabId });
        }
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ ok: false, error: `Unknown action: ${request.action}` });
    }
  })();
  return true; // async response
});
