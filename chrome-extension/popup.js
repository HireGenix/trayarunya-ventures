"use strict";

const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

function showMsg(text, ok) {
  const el = $("msg");
  el.textContent = text;
  el.className = `msg ${ok ? "ok" : "err"}`;
  setTimeout(() => el.classList.add("hidden"), 5000);
}

function normalizeUrl(raw) {
  let u = (raw || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    return new URL(u).toString();
  } catch (_) {
    return "";
  }
}

async function refresh() {
  const res = await send({ action: "tvc.getState" });
  const s = res.data || {};
  $("statusDot").classList.toggle("on", !!s.connected);
  $("apiUrl").value = s.apiUrl || "";
  $("webAppUrl").value = s.webAppUrl || "";

  if (s.connected) {
    $("connectedView").classList.remove("hidden");
    $("loginView").classList.add("hidden");
    const name = (s.user && s.user.name) || "Connected";
    $("accountName").textContent = name;
    $("accountEmail").textContent = (s.user && s.user.email) || "";
    $("avatar").textContent = (name.trim()[0] || "T").toUpperCase();

    const sel = $("workspaceSelect");
    sel.innerHTML = "";
    const workspaces = (s.user && s.user.workspaces) || [];
    for (const ws of workspaces) {
      const opt = document.createElement("option");
      opt.value = ws.id;
      opt.textContent = ws.name;
      if (ws.id === s.workspaceId) opt.selected = true;
      sel.appendChild(opt);
    }
    loadStats();
  } else {
    $("connectedView").classList.add("hidden");
    $("loginView").classList.remove("hidden");
  }
}

async function loadStats() {
  const [leads, tasks] = await Promise.all([
    send({ action: "tvc.api", path: "/linkedin/leads" }),
    send({ action: "tvc.api", path: "/linkedin/tasks?status=pending" }),
  ]);
  if (leads.ok || tasks.ok) {
    $("pipelineStats").classList.remove("hidden");
    $("statLeads").textContent = leads.ok && Array.isArray(leads.data) ? leads.data.length : "—";
    $("statTasks").textContent = tasks.ok && Array.isArray(tasks.data) ? tasks.data.length : "—";
  }
}

const RESEARCH_STALE_MS = 3 * 60 * 1000;

async function loadProfile() {
  const { tvcProfile, tvcResearch } = await chrome.storage.local.get(["tvcProfile", "tvcResearch"]);
  const p = tvcProfile || {};
  const r = tvcResearch || {};

  // Don't clobber URLs the user is mid-typing; only fill empty inputs.
  if (!$("pfProductUrl").value) $("pfProductUrl").value = p.productUrl || "";
  if (!$("pfCompanyUrl").value) $("pfCompanyUrl").value = p.companyUrl || "";
  if (p.researched) {
    $("pfResearched").value = p.researched;
    $("profilePreviewWrap").classList.remove("hidden");
  }

  const btn = $("researchProfile");
  const running = r.state === "running" && Date.now() - (r.startedAt || 0) < RESEARCH_STALE_MS;
  if (running) {
    btn.disabled = true;
    btn.textContent = "Researching…";
    setResearchStatus("Research running in the background (Claude Fable 5) — you can close this popup; it will finish and save on its own.");
  } else {
    btn.disabled = false;
    btn.textContent = "🔎 Research & build profile";
    if (r.state === "error") setResearchStatus(r.error || "Research failed — try again.", "err");
    else if (r.state === "done" && p.researched)
      setResearchStatus(`✓ Profile built${r.pagesCrawled != null ? ` (${r.pagesCrawled} pages crawled)` : ""} and saved — edit anything marked [CONFIRM].`, "ok");
    else if (r.state === "running") setResearchStatus("Previous research never finished — hit Research again.", "err");
  }
}

function setResearchStatus(text, kind) {
  const el = $("researchStatus");
  if (!text) {
    el.classList.add("hidden");
    return;
  }
  el.textContent = text;
  el.classList.remove("hidden");
  el.style.color = kind === "err" ? "var(--pink)" : kind === "ok" ? "var(--teal-deep)" : "";
}

// Live-sync the popup with the background research lifecycle.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.tvcResearch || changes.tvcProfile) loadProfile();
});

document.addEventListener("DOMContentLoaded", () => {
  refresh();
  loadProfile();

  $("loginBtn").addEventListener("click", async () => {
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!email || !password) return showMsg("Enter email and password", false);
    $("loginBtn").textContent = "Signing in…";
    const res = await send({ action: "tvc.login", email, password });
    $("loginBtn").textContent = "Sign in";
    if (res.ok) {
      showMsg("Connected!", true);
      refresh();
    } else {
      showMsg(res.error || "Login failed", false);
    }
  });

  $("syncBtn").addEventListener("click", async () => {
    $("syncBtn").textContent = "Syncing…";
    const res = await send({ action: "tvc.syncFromWebApp" });
    $("syncBtn").textContent = "⚡ Sync from open web app tab";
    if (res.ok) {
      showMsg("Session synced from web app!", true);
      refresh();
    } else {
      showMsg(res.error || "Sync failed", false);
    }
  });

  $("logoutBtn").addEventListener("click", async () => {
    await send({ action: "tvc.logout" });
    refresh();
  });

  $("workspaceSelect").addEventListener("change", async (e) => {
    await send({ action: "tvc.setState", patch: { workspaceId: e.target.value } });
    loadStats();
  });

  document.querySelectorAll(".action[data-url]").forEach((btn) => {
    btn.addEventListener("click", () => send({ action: "tvc.openTab", url: btn.dataset.url }));
  });

  $("openDashboard").addEventListener("click", async () => {
    const res = await send({ action: "tvc.getState" });
    const base = (res.data && res.data.webAppUrl) || "https://mymarketiq.online";
    send({ action: "tvc.openTab", url: `${base}/dashboard` });
  });

  $("researchProfile").addEventListener("click", async () => {
    const productUrl = normalizeUrl($("pfProductUrl").value);
    const companyUrl = normalizeUrl($("pfCompanyUrl").value);
    if (!productUrl && !companyUrl) return showMsg("Enter at least one website URL", false);

    // NOTE: no chrome.permissions.request() here — the permission dialog
    // force-closes the popup and killed the whole flow. The <all_urls>
    // content script grant already gives the background fetch host access,
    // and the crawl is best-effort anyway (web search covers the gaps).
    const btn = $("researchProfile");
    btn.disabled = true;
    btn.textContent = "Researching…";
    setResearchStatus("Crawling your sites + live web research (Claude Fable 5), ~30-60s. Popup close ho jaye to bhi background mein complete hoga.");

    const res = await send({ action: "tvc.research", productUrl, companyUrl });
    // Success/result UI arrives via storage.onChanged → loadProfile.
    if (res && !res.ok) {
      setResearchStatus(res.error || "Research failed — try again.", "err");
      btn.disabled = false;
      btn.textContent = "🔎 Research & build profile";
    }
  });

  $("saveProfile").addEventListener("click", async () => {
    const productUrl = normalizeUrl($("pfProductUrl").value);
    const companyUrl = normalizeUrl($("pfCompanyUrl").value);
    await chrome.storage.local.set({
      tvcProfile: {
        productUrl,
        companyUrl,
        researched: $("pfResearched").value.trim(),
        researchedAt: Date.now(),
      },
    });
    showMsg("Startup profile saved", true);
  });

  $("saveSettings").addEventListener("click", async () => {
    const apiUrl = $("apiUrl").value.trim().replace(/\/+$/, "");
    const webAppUrl = $("webAppUrl").value.trim().replace(/\/+$/, "");
    await send({ action: "tvc.setState", patch: { apiUrl, webAppUrl } });
    showMsg("Settings saved", true);
  });

  // Pressing Enter in password submits.
  $("password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("loginBtn").click();
  });
});
