"use strict";

/**
 * Trayarunya Copilot — in-page copilot (runs on every site).
 *
 * Injects a floating FAB + panel (Coach / Agent / Fill / Chat) that:
 *  - understands the current page in realtime (text + optional screenshot vision)
 *  - runs agentic missions with a step-by-step timeline (research, fill
 *    applications, investor outreach, program eligibility, store listings)
 *  - scans & autofills forms (YC, VC, Founders Hub, Partner Center…) with
 *    React-compatible setters — the human always reviews, nothing auto-submits
 *  - adds a ✦ Draft button to Gmail / LinkedIn / Outlook composers
 *
 * All AI calls run on the Content Engine (MarketiQ) backend via the
 * background worker — conversation API with vision + built-in web search.
 */
(() => {
  if (window.__TVC_LOADED__) return;
  window.__TVC_LOADED__ = true;

  // ------------------------------------------------------------- utilities

  const send = (msg) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          void chrome.runtime.lastError;
          resolve(res || { ok: false, error: "No response" });
        });
      } catch (_) {
        resolve({ ok: false, error: "Extension reloaded — refresh the page." });
      }
    });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function toast(message, ok = true) {
    document.querySelectorAll(".tvc-toast").forEach((t) => t.remove());
    const t = el("div", "tvc-toast" + (ok ? "" : " tvc-toast-err"), message);
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("tvc-toast-show"));
    setTimeout(() => {
      t.classList.remove("tvc-toast-show");
      setTimeout(() => t.remove(), 300);
    }, 3200);
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(
      () => toast("✦ Copied to clipboard"),
      () => toast("Copy failed", false)
    );
  }

  function copyBlock(label, text) {
    const wrap = el("div", "tvc-copyblock");
    const head = el("div", "tvc-copyblock-head");
    head.appendChild(el("span", "tvc-copyblock-label", label));
    const btn = el("button", "tvc-copy", "Copy");
    btn.addEventListener("click", () => copyText(text));
    head.appendChild(btn);
    wrap.appendChild(head);
    wrap.appendChild(el("div", "tvc-copyblock-text", text));
    return wrap;
  }

  // ------------------------------------------------------ markdown (safe)

  function escHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function mdInline(s) {
    let out = s;
    out = out.replace(/`([^`\n]+)`/g, (_, c) => `<code>${c}</code>`);
    out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1<em>$2</em>");
    out = out.replace(
      /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return out;
  }

  function renderMd(raw) {
    const lines = escHtml(raw || "").split("\n");
    const html = [];
    let i = 0;
    let list = null;
    const closeList = () => {
      if (list) {
        html.push(`</${list}>`);
        list = null;
      }
    };
    while (i < lines.length) {
      const line = lines[i];
      const fence = line.match(/^```(\S*)\s*$/);
      if (fence) {
        closeList();
        const buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
        i++;
        html.push(`<pre><code>${buf.join("\n")}</code></pre>`);
        continue;
      }
      if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
        closeList();
        const split = (r) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => mdInline(c.trim()));
        const head = split(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") rows.push(split(lines[i++]));
        html.push(
          "<table><thead><tr>" + head.map((h) => `<th>${h}</th>`).join("") + "</tr></thead><tbody>" +
            rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") + "</tbody></table>"
        );
        continue;
      }
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        closeList();
        html.push(`<h3>${mdInline(h[2])}</h3>`);
        i++;
        continue;
      }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
        closeList();
        html.push("<hr>");
        i++;
        continue;
      }
      if (/^\s*&gt;\s?/.test(line)) {
        closeList();
        const buf = [];
        while (i < lines.length && /^\s*&gt;\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*&gt;\s?/, ""));
        html.push(`<blockquote>${mdInline(buf.join("<br>"))}</blockquote>`);
        continue;
      }
      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ul || ol) {
        const want = ul ? "ul" : "ol";
        if (list !== want) {
          closeList();
          html.push(`<${want}>`);
          list = want;
        }
        html.push(`<li>${mdInline((ul || ol)[1])}</li>`);
        i++;
        continue;
      }
      if (line.trim() === "") {
        closeList();
        i++;
        continue;
      }
      closeList();
      const buf = [line];
      while (i + 1 < lines.length && lines[i + 1].trim() !== "" && !/^(#{1,4})\s|^```|^\s*[-*+]\s|^\s*\d+[.)]\s|^\s*&gt;|\|/.test(lines[i + 1])) {
        buf.push(lines[++i]);
      }
      html.push(`<p>${mdInline(buf.join("<br>"))}</p>`);
      i++;
    }
    closeList();
    return html.join("\n");
  }

  // ----------------------------------------------------------- page reading

  const NOISE = "script,style,noscript,svg,canvas,template,iframe,[aria-hidden='true']";

  function isVisible(n) {
    if (!n || !n.getClientRects().length) return false;
    const cs = getComputedStyle(n);
    if (cs.visibility === "hidden" || cs.display === "none") return false;
    const r = n.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }

  function extractPage(maxChars = 8000) {
    const root =
      document.querySelector("main") ||
      document.querySelector("[role='main']") ||
      document.querySelector("article") ||
      document.body;
    const cloned = root.cloneNode(true);
    cloned.querySelectorAll(NOISE).forEach((x) => x.remove());
    cloned.querySelectorAll(".tvc-panel,.tvc-fab,.tvc-pop,.tvc-toast").forEach((x) => x.remove());
    let text = clean(cloned.innerText || "");
    if (text.length > maxChars) text = text.slice(0, maxChars) + " …[truncated]";
    const desc =
      document.querySelector('meta[name="description"]')?.content ||
      document.querySelector('meta[property="og:description"]')?.content || "";
    const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
      .filter(isVisible).slice(0, 20)
      .map((x) => clean(x.textContent)).filter((t) => t.length > 3);
    return { title: document.title || "", url: location.href, description: clean(desc).slice(0, 300), headings, text };
  }

  // ------------------------------------------------------------- form scan

  const FIELD_ATTR = "data-tvc-id";
  let fieldSeq = 0;
  const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "file", "password", "search"]);

  function labelFor(node) {
    const aria = node.getAttribute("aria-label");
    if (aria) return clean(aria);
    const lb = node.getAttribute("aria-labelledby");
    if (lb) {
      const t = lb.split(/\s+/).map((id) => clean(document.getElementById(id)?.textContent)).filter(Boolean).join(" ");
      if (t) return t;
    }
    if (node.id) {
      try {
        const lab = document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
        if (lab) return clean(lab.textContent);
      } catch (_) {}
    }
    const wrap = node.closest("label");
    if (wrap) {
      const c = wrap.cloneNode(true);
      c.querySelectorAll("input,textarea,select").forEach((x) => x.remove());
      const t = clean(c.textContent);
      if (t) return t;
    }
    let p = node.parentElement;
    for (let d = 0; p && d < 4; d++) {
      const cands = p.querySelectorAll("legend,[class*='label'],[class*='question'],[class*='Question'],h1,h2,h3,h4,p");
      for (const cand of cands) {
        if (cand.contains(node)) continue;
        const t = clean(cand.textContent);
        if (t.length > 2 && t.length < 400) return t;
      }
      p = p.parentElement;
    }
    return clean(node.getAttribute("placeholder") || node.name || node.id || "");
  }

  function scanForm(maxFields = 60) {
    const fields = [];
    const seenRadio = new Set();
    const nodes = document.querySelectorAll("input, textarea, select, [contenteditable='true'], [role='textbox']");
    for (const node of nodes) {
      if (fields.length >= maxFields) break;
      if (!isVisible(node)) continue;
      if (node.closest(".tvc-panel,.tvc-pop")) continue;
      const tag = node.tagName ? node.tagName.toLowerCase() : "div";
      const type = (node.getAttribute("type") || (tag === "input" ? "text" : tag)).toLowerCase();
      if (tag === "input" && SKIP_TYPES.has(type)) continue;
      const editable = node.isContentEditable || node.getAttribute("role") === "textbox";

      let id = node.getAttribute(FIELD_ATTR);
      if (!id) {
        id = `f${++fieldSeq}`;
        node.setAttribute(FIELD_ATTR, id);
      }
      const f = {
        id,
        tag: editable && tag !== "textarea" && tag !== "input" ? "contenteditable" : tag,
        type,
        label: labelFor(node).slice(0, 300),
        placeholder: clean(node.getAttribute("placeholder")).slice(0, 150),
        required: node.required || node.getAttribute("aria-required") === "true" || false,
        maxLength: node.maxLength && node.maxLength > 0 && node.maxLength < 1e6 ? node.maxLength : undefined,
        value: "",
      };
      if (tag === "select") {
        f.options = Array.from(node.options).slice(0, 50).map((o) => clean(o.textContent || o.value)).filter(Boolean);
        f.value = clean(node.selectedOptions[0]?.textContent || node.value);
      } else if (type === "radio") {
        const group = node.name || f.label;
        if (seenRadio.has(group)) continue;
        seenRadio.add(group);
        let peers = [node];
        try {
          peers = node.name ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(node.name)}"]`)) : [node];
        } catch (_) {}
        f.tag = "radio-group";
        f.options = peers.map((r) => labelFor(r)).filter(Boolean).slice(0, 30);
        const checked = peers.find((r) => r.checked);
        f.value = checked ? labelFor(checked) : "";
      } else if (type === "checkbox") {
        f.value = node.checked ? "checked" : "unchecked";
      } else if (f.tag === "contenteditable") {
        f.value = clean(node.textContent).slice(0, 200);
      } else {
        f.value = clean(node.value).slice(0, 200);
      }
      if (!f.label && !f.placeholder && tag === "input") continue;
      fields.push(f);
    }
    return { url: location.href, title: document.title, fieldCount: fields.length, fields };
  }

  function setNativeValue(node, value) {
    const proto =
      node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype :
      node instanceof HTMLSelectElement ? HTMLSelectElement.prototype :
      HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(node, value);
    else node.value = value;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function highlight(node) {
    node.classList.add("tvc-filled");
    setTimeout(() => node.classList.remove("tvc-filled"), 2500);
  }

  function fillOne(node, value) {
    const tag = node.tagName.toLowerCase();
    const type = (node.getAttribute("type") || "").toLowerCase();
    try {
      node.scrollIntoView({ block: "center" });
    } catch (_) {}
    node.focus({ preventScroll: true });
    if (tag === "select") {
      const target = String(value).toLowerCase();
      const opt =
        Array.from(node.options).find((o) => clean(o.textContent).toLowerCase() === target || o.value.toLowerCase() === target) ||
        Array.from(node.options).find((o) => clean(o.textContent).toLowerCase().includes(target) || target.includes(clean(o.textContent).toLowerCase()));
      if (!opt) return false;
      setNativeValue(node, opt.value);
      highlight(node);
      return true;
    }
    if (type === "checkbox") {
      const want = /^(true|yes|checked|1)$/i.test(String(value).trim());
      if (node.checked !== want) node.click();
      highlight(node);
      return true;
    }
    if (type === "radio") {
      let peers = [node];
      try {
        peers = node.name ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(node.name)}"]`)) : [node];
      } catch (_) {}
      const target = String(value).toLowerCase();
      for (const r of peers) {
        const lab = labelFor(r).toLowerCase();
        if (lab === target || lab.includes(target) || target.includes(lab)) {
          r.click();
          highlight(r);
          return true;
        }
      }
      return false;
    }
    if (node.isContentEditable || node.getAttribute("role") === "textbox") {
      node.textContent = "";
      const ok = document.execCommand && document.execCommand("insertText", false, String(value));
      if (!ok) node.textContent = String(value);
      node.dispatchEvent(new InputEvent("input", { bubbles: true, data: String(value) }));
      highlight(node);
      return true;
    }
    setNativeValue(node, String(value));
    node.dispatchEvent(new Event("blur", { bubbles: true }));
    highlight(node);
    return true;
  }

  function applyFills(fills) {
    let okCount = 0;
    for (const f of fills) {
      let node = null;
      try {
        node = document.querySelector(`[${FIELD_ATTR}="${CSS.escape(String(f.id))}"]`);
      } catch (_) {}
      if (!node) continue;
      try {
        if (fillOne(node, f.value)) okCount++;
      } catch (_) {}
    }
    return okCount;
  }

  // ------------------------------------------------------------ AI streaming

  /**
   * Run one AI exchange through the background worker (Content Engine chat
   * API). Pass `conversationId` to continue a server-side conversation —
   * the server keeps history and workspace grounding. Founder context
   * (mode + profile + live page) is prefixed to the text. Returns an abort fn.
   */
  function aiStream({ system, prompt, webSearch, images, conversationId, title }, { onDelta, onTool, onDone, onError, onMeta }) {
    let port;
    try {
      port = chrome.runtime.connect({ name: "tvc-stream" });
    } catch (_) {
      onError && onError("Extension reloaded — refresh the page.");
      return () => {};
    }
    let finished = false;
    const finish = (fn, arg) => {
      if (finished) return;
      finished = true;
      fn && fn(arg);
    };
    port.onMessage.addListener((m) => {
      if (m.type === "delta") onDelta && onDelta(m.text || "");
      else if (m.type === "tool") onTool && onTool(m);
      else if (m.type === "meta") onMeta && onMeta(m.conversationId);
      else if (m.type === "done") finish(onDone);
      else if (m.type === "error") finish(onError, m.message || "AI error");
    });
    port.onDisconnect.addListener(() => finish(onDone));

    let text = String(prompt || "");
    if (system) text = `${system}\n\n=== USER REQUEST ===\n${text}`;
    const attachments = (images || [])
      .filter((im) => im && typeof im.dataUrl === "string" && im.dataUrl.startsWith("data:"))
      .map((im, i) => ({ name: `screenshot-${i + 1}.jpg`, kind: "image", data_url: im.dataUrl }));

    port.postMessage({ text, conversationId: conversationId || null, webSearch: !!webSearch, attachments, title });
    return () => {
      try {
        port.disconnect();
      } catch (_) {}
    };
  }

  /** Stream into a .tvc-md div and resolve with the full text. */
  function aiStreamInto(outDiv, opts) {
    return new Promise((resolve, reject) => {
      let full = "";
      let queued = false;
      const md = el("div", "tvc-md");
      md.innerHTML = '<span class="tvc-cursor"></span>';
      outDiv.appendChild(md);
      const paint = (done) => {
        if (queued && !done) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          md.innerHTML = renderMd(stripFillBlock(full)) + (done ? "" : '<span class="tvc-cursor"></span>');
        });
      };
      const abort = aiStream(opts, {
        onDelta: (t) => {
          full += t;
          paint(false);
        },
        onTool: (m) => {
          if (m.status === "running" && m.label && !full) {
            md.innerHTML = `<p>◌ ${escHtml(m.label)}</p>`;
          }
        },
        onMeta: (convoId) => {
          if (opts.onMeta) opts.onMeta(convoId);
        },
        onDone: () => {
          paint(true);
          setTimeout(() => {
            // A reply that was only a machine block renders empty — drop it.
            if (!stripFillBlock(full)) md.remove();
            resolve(full);
          }, 50);
        },
        onError: (msg) => {
          md.remove();
          reject(new Error(msg));
        },
      });
      outDiv._tvcAbort = abort;
    });
  }

  const FILL_FENCE_RE = /```[a-zA-Z:_-]*[^\S\n]*\n([\s\S]*?)```/g;

  function stripFillBlock(text) {
    // Hide machine-readable fill payloads (fenced JSON plans + [[marker]]
    // prefixes) from human-facing rendering/copy.
    return (text || "")
      .replace(FILL_FENCE_RE, (m0, fenceBody) => (/"fills"\s*:/.test(fenceBody) ? "" : m0))
      .replace(/^([ \t>*_-]*)\[\[\s*[A-Za-z0-9_-]{1,40}\s*\]\][ \t:.\u2014-]*/gm, "$1")
      .trim();
  }

  /** Fix the JSON mistakes models actually make: smart quotes, trailing commas. */
  function repairJson(s) {
    return s
      .replace(/[\u201C\u201D\u2033]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/,\s*([}\]])/g, "$1");
  }

  function coerceFills(list) {
    if (!Array.isArray(list)) return null;
    const out = list
      .filter((f) => f && f.id != null && f.value !== undefined && f.value !== null)
      .map((f) => ({ id: String(f.id), value: String(f.value) }));
    return out.length ? out : null;
  }

  /** Parse one JSON candidate into {fills, summary} — accepts several shapes. */
  function tryParseFills(raw) {
    for (const candidate of [raw, repairJson(raw)]) {
      try {
        const obj = JSON.parse(candidate);
        if (Array.isArray(obj)) {
          const fills = coerceFills(obj);
          if (fills) return { fills, summary: "" };
        } else if (obj && typeof obj === "object") {
          if (obj.fills) {
            const fills = coerceFills(obj.fills);
            if (fills) return { fills, summary: typeof obj.summary === "string" ? obj.summary : "" };
          }
          // Field-keyed shorthand models love: {"f1": "answer", "f2": "answer"}
          const keys = Object.keys(obj);
          if (keys.length && keys.every((k) => /^f\d+$/.test(k))) {
            const fills = coerceFills(keys.map((k) => ({ id: k, value: obj[k] })));
            if (fills) return { fills, summary: "" };
          }
        }
      } catch (_) {
        /* try next candidate */
      }
    }
    return null;
  }

  /** Return the balanced {…} or […] slice starting at `from` (string-aware). */
  function balancedSlice(text, from, open, close) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = from; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return text.slice(from, i + 1);
      }
    }
    return null;
  }

  // ---- format B: plain-text line markers  [[f1]] answer …

  const MARKER_LINE_RE = /^[ \t>*_-]*(?:\*\*|__|`)?\[\[\s*([A-Za-z0-9_-]{1,40})\s*\]\](?:\*\*|__|`)?[ \t:.\u2014-]*(.*)$/;

  function extractMarkerFills(text) {
    const lines = (text || "").split("\n");
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(MARKER_LINE_RE);
      if (m) hits.push({ line: i, id: m[1], inline: m[2] || "" });
    }
    if (!hits.length) return null;
    const fills = [];
    for (let h = 0; h < hits.length; h++) {
      const { line, id, inline } = hits[h];
      if (/^(done|end|fin)$/i.test(id)) continue;
      const stop = h + 1 < hits.length ? hits[h + 1].line : lines.length;
      const parts = [inline.trim()];
      for (let i = line + 1; i < stop; i++) parts.push(lines[i]);
      const value = parts.join("\n").trim();
      if (value) fills.push({ id: String(id), value });
    }
    return fills.length ? fills : null;
  }

  // ---- format C: salvage prose answers by matching scanned field labels

  function normLabel(s) {
    return clean(String(s || ""))
      .toLowerCase()
      .replace(/^[#>\s*\d.\)]+/, "")
      .replace(/[*_`:?]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractLabelFills(text, scan) {
    const fields = (scan && scan.fields) || [];
    if (!fields.length) return null;
    const lines = (text || "").split("\n");
    const boundaries = []; // {line, fieldId}
    const usedFields = new Set();
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      // Only heading-ish lines can be question boundaries.
      if (!/^[ \t]*(#{1,6}\s|\*\*|__|\d+[.)]\s|[A-Z])/.test(raw.trim()) && raw.trim() !== "") continue;
      const ln = normLabel(raw);
      if (ln.length < 4) continue;
      let best = null;
      for (const f of fields) {
        if (usedFields.has(f.id)) continue;
        const lab = normLabel(f.label);
        if (lab.length < 4) continue;
        if (ln === lab || ln.startsWith(lab) || lab.startsWith(ln) ||
            (lab.length >= 12 && ln.includes(lab.slice(0, Math.min(lab.length, 60))))) {
          best = f;
          break;
        }
      }
      if (best) {
        // Capture an answer that sits on the same line as the label, e.g.
        // "**Label:** answer" or "What do you make? We make X."
        let inline = "";
        const bold = raw.match(/\*\*(.+?)\*\*[ \t:.\u2014-]*(.*)$/);
        if (bold && bold[2]) inline = bold[2].trim();
        else {
          const q = raw.match(/^[^?]{4,}\?[ \t]+(.+)$/);
          if (q) inline = q[1].trim();
        }
        boundaries.push({ line: i, fieldId: String(best.id), inline });
        usedFields.add(best.id);
      }
    }
    // Require at least 2 matches (or 1 when the form has a single field) to
    // avoid false positives on unrelated prose.
    if (boundaries.length < Math.min(2, fields.length)) return null;
    const fills = [];
    for (let b = 0; b < boundaries.length; b++) {
      const { line, fieldId, inline } = boundaries[b];
      const stop = b + 1 < boundaries.length ? boundaries[b + 1].line : lines.length;
      const below = lines.slice(line + 1, stop).join("\n")
        .replace(/^[\s>*_-]+|[\s]+$/g, "")
        .trim();
      const value = [inline, below].filter(Boolean).join("\n").trim();
      if (value) fills.push({ id: fieldId, value });
    }
    return fills.length ? fills : null;
  }

  /**
   * Last-resort parser for formatter-pass replies: bare "f1: answer" /
   * "[f2] answer" / "(f3) — answer" lines (only ids present in the scan).
   */
  function extractLenientFills(text, scan) {
    const known = new Set(((scan && scan.fields) || []).map((f) => String(f.id)));
    const lines = (text || "").split("\n");
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^[ \t>*_-]*\(?\[{0,2}\s*(f\d{1,3})\s*\]{0,2}\)?[ \t:.\u2014-]+(.*)$/i);
      if (m && (!known.size || known.has(m[1]))) hits.push({ line: i, id: m[1], inline: m[2] || "" });
    }
    if (!hits.length) return null;
    const fills = [];
    for (let h = 0; h < hits.length; h++) {
      const stop = h + 1 < hits.length ? hits[h + 1].line : lines.length;
      const parts = [hits[h].inline.trim()];
      for (let i = hits[h].line + 1; i < stop; i++) parts.push(lines[i]);
      const value = parts.join("\n").trim();
      if (value) fills.push({ id: hits[h].id, value });
    }
    return fills.length ? { fills, summary: "" } : null;
  }

  /**
   * Extract the fill plan from an AI reply. The backend's own agent protocol
   * discourages bare-JSON final answers, so we accept (in order):
   *  A. JSON in any shape (fenced/unfenced/field-keyed/array, with repair)
   *  B. plain-text [[fieldId]] line markers (our primary protocol)
   *  C. prose answers matched against scanned field labels (salvage)
   * Returns {fills, summary} or null.
   */
  function extractFillPlan(text, scan) {
    // Normalize curly quotes upfront — they break both the search gates and
    // the string-aware brace balancing. (Trailing commas are repaired later.)
    const t = (text || "").replace(/[\u201C\u201D\u2033]/g, '"');
    // 1. any fenced code block that looks like a plan
    let m;
    FILL_FENCE_RE.lastIndex = 0;
    while ((m = FILL_FENCE_RE.exec(t))) {
      const fenceBody = m[1].trim();
      if (!/"fills"\s*:|^\s*[\[{]/.test(fenceBody)) continue;
      const plan = tryParseFills(fenceBody);
      if (plan) return plan;
    }
    // 2. bare {"fills": …} object
    const fillsIdx = t.indexOf('"fills"');
    if (fillsIdx !== -1) {
      const start = t.lastIndexOf("{", fillsIdx);
      if (start !== -1) {
        const slice = balancedSlice(t, start, "{", "}");
        const plan = slice && tryParseFills(slice);
        if (plan) return plan;
      }
    }
    // 3. bare [{"id": …}] array
    const arrIdx = t.search(/\[\s*\{\s*"id"/);
    if (arrIdx !== -1) {
      const slice = balancedSlice(t, arrIdx, "[", "]");
      const plan = slice && tryParseFills(slice);
      if (plan) return plan;
    }
    // 4. first JSON object anywhere mentioning our field ids
    const objIdx = t.indexOf("{");
    if (objIdx !== -1) {
      const slice = balancedSlice(t, objIdx, "{", "}");
      if (slice && /"f\d+"/.test(slice)) {
        const plan = tryParseFills(slice);
        if (plan) return plan;
      }
    }
    // 5. plain-text [[fieldId]] line markers (primary protocol)
    const markers = extractMarkerFills(text || "");
    if (markers) return { fills: markers, summary: "" };
    // 6. prose answers matched against scanned labels (salvage)
    if (scan) {
      const byLabel = extractLabelFills(text || "", scan);
      if (byLabel) return { fills: byLabel, summary: "" };
    }
    return null;
  }

  // ---------------------------------------------------------------- context

  async function getProfile() {
    try {
      const s = await chrome.storage.local.get("tvcProfile");
      return s.tvcProfile || {};
    } catch (_) {
      return {};
    }
  }

  function profileBlock(p) {
    // New shape: AI-researched profile from the founder's two website URLs
    // (popup → Research & build profile). Falls back to the legacy field map.
    if (p.researched && p.researched.trim()) {
      const urls = [
        p.productUrl && `Product website: ${p.productUrl}`,
        p.companyUrl && `Company website: ${p.companyUrl}`,
      ].filter(Boolean);
      return `=== STARTUP PROFILE (AI-researched) ===\n${urls.join("\n")}${urls.length ? "\n" : ""}${p.researched.trim()}`;
    }
    const lines = [
      p.name && `Company: ${p.name}`,
      p.oneLiner && `One-liner: ${p.oneLiner}`,
      p.website && `Website: ${p.website}`,
      p.stage && `Stage: ${p.stage}`,
      p.description && `What we do: ${p.description}`,
      p.traction && `Traction: ${p.traction}`,
      p.team && `Team: ${p.team}`,
      p.ask && `Current ask: ${p.ask}`,
      p.extras && `Notes: ${p.extras}`,
    ].filter(Boolean);
    return lines.length ? `=== STARTUP PROFILE ===\n${lines.join("\n")}` : "";
  }

  function pageBlock(pg) {
    if (!pg) return "";
    return (
      `=== CURRENT PAGE (live view) ===\nTitle: ${pg.title}\nURL: ${pg.url}\n` +
      (pg.description ? `Meta: ${pg.description}\n` : "") +
      (pg.headings && pg.headings.length ? `Headings: ${pg.headings.join(" · ")}\n` : "") +
      `Content:\n${pg.text}`
    );
  }

  function formBlock(scan) {
    if (!scan || !scan.fields.length) return "";
    const rows = scan.fields.map((f) => {
      const bits = [
        `id=${f.id}`,
        `type=${f.tag === "input" ? f.type : f.tag}`,
        f.label && `label="${f.label}"`,
        f.placeholder && `placeholder="${f.placeholder}"`,
        f.required && "required",
        f.maxLength && `maxLength=${f.maxLength}`,
        f.options && f.options.length && `options=[${f.options.join(" | ")}]`,
        f.value && `currentValue="${f.value}"`,
      ].filter(Boolean);
      return `- ${bits.join(", ")}`;
    });
    return `=== FORM SCAN (${scan.url}) ===\n${scan.fieldCount} fillable fields:\n${rows.join("\n")}`;
  }

  const RULES =
    "GROUND RULES: You work for the founder described in STARTUP PROFILE. Write as 'we'. Be specific — numbers over adjectives, zero buzzwords. " +
    "Treat CURRENT PAGE as what the founder sees right now. Cite web results inline like [1]. " +
    "Never invent facts (metrics, names, dates) missing from the profile — write [CONFIRM: …] instead.";

  const FILL_PROTOCOL =
    "AUTOFILL PROTOCOL (MANDATORY): Answer every relevant field from the FORM SCAN using the profile + page context. Respect maxLength; for select/radio fields the value must be one option text copied VERBATIM; checkboxes use \"checked\" or \"unchecked\". " +
    "FORMAT: write each answer in plain text starting on its own line with the field marker, like this:\n" +
    "[[f1]] We build AI agents for hospital billing teams.\n" +
    "[[f2]] checked\n" +
    "Every answer MUST start with [[fieldId]] on a new line using the exact ids from the FORM SCAN (f1, f2, …). Multi-line answers are fine — everything until the next [[marker]] belongs to that field. " +
    "Do not use headings, tables or numbered lists for the answers; only the [[marker]] lines. You may put a 1-2 line review note at the very top before the first marker.";

  /**
   * Replace the raw machine reply bubble (JSON or [[marker]] format) with a
   * clean review note — parsed answers are shown in the review card instead.
   */
  function tidyFillOutput(outDiv, summary, rawText) {
    const raw = rawText || "";
    const lines = raw.split("\n").filter((l) => l.trim());
    const markerLines = lines.filter((l) => /^[ \t>*_-]*\[\[/.test(l)).length;
    const jsonish = /^\s*[{[]/.test(raw);
    // Only collapse when the reply is mostly machine payload.
    if (!jsonish && markerLines < Math.max(1, Math.floor(lines.length * 0.3))) return;
    const bubbles = outDiv.querySelectorAll(".tvc-md");
    const last = bubbles[bubbles.length - 1];
    if (last) last.innerHTML = renderMd(summary || "✅ Answers drafted — review and apply below.");
  }

  /**
   * Run a fill-plan request with a two-stage strategy:
   *  1. Drafting call (mode prompt + profile + page + scan, marker protocol).
   *  2. If unparseable → deterministic FORMATTER pass in a FRESH conversation:
   *     a tiny mechanical "convert these answers to [[id]] lines" task that the
   *     backend's agent system prompt can't derail. Parsed with the standard
   *     extractors plus a lenient bare-"f1:" line parser.
   * The raw reply is stored (tvcLastFillReply) for debugging either way.
   * Returns {full (original draft), fills, summary}.
   */
  async function requestFills(outDiv, { system, prompt, title, scan, onRetry }) {
    const full = await aiStreamInto(outDiv, {
      system,
      prompt,
      title,
      webSearch: false,
    });
    let plan = extractFillPlan(full, scan);
    let machineText = full;

    if (!plan) {
      onRetry && onRetry();
      const fieldLines = ((scan && scan.fields) || [])
        .map((f) => {
          const bits = [`${f.id}: ${f.label || f.placeholder || f.type}`];
          if (f.options && f.options.length) bits.push(`options: [${f.options.join(" | ")}]`);
          if (f.maxLength) bits.push(`max ${f.maxLength} chars`);
          return `- ${bits.join(" · ")}`;
        })
        .join("\n");
      const fmtPrompt =
        "You are a strict text formatter. Below is a list of form fields and a drafted set of answers. " +
        "Reply with ONLY the answers reformatted as plain lines — each field's answer starts on a new line with its marker, like:\n" +
        "[[f1]] answer text here\n[[f2]] checked\n" +
        "Rules: use the exact field ids given; one [[marker]] per answered field; multi-line answers allowed under their marker; " +
        "for fields with options copy one option verbatim; do not add, remove or rewrite content; no headings, no commentary, no JSON. " +
        "Start your reply directly with the first [[marker]].\n\n" +
        `FIELDS:\n${fieldLines}\n\nDRAFTED ANSWERS:\n${stripFillBlock(full).slice(0, 20000)}`;
      const retry = await aiStreamInto(outDiv, {
        prompt: fmtPrompt,
        title: `${title || "Copilot"} — format`,
        webSearch: false,
      });
      plan = extractFillPlan(retry, scan) || extractLenientFills(retry, scan);
      if (plan) machineText = retry;
      else {
        try {
          chrome.storage.local.set({
            tvcLastFillReply: { draft: full.slice(0, 30000), format: retry.slice(0, 30000), at: Date.now() },
          });
        } catch (_) {}
      }
    }

    if (plan) tidyFillOutput(outDiv, plan.summary, machineText);
    return { full, fills: plan ? plan.fills : null, summary: plan ? plan.summary : "" };
  }

  /** Failure helper: copy buttons for the drafted prose + raw debug reply. */
  function renderFillFailure(out, full) {
    out.appendChild(
      el("div", "tvc-error", "Couldn't parse a fill plan — the drafted answers are above. Copy them, or hit AI-fill again.")
    );
    const row = el("div", "tvc-row");
    if (full && stripFillBlock(full)) {
      const cp = el("button", "tvc-mini", "📄 Copy drafted answers");
      cp.addEventListener("click", () => copyText(stripFillBlock(full)));
      row.appendChild(cp);
    }
    const dbg = el("button", "tvc-mini", "🔧 Copy raw AI reply (debug)");
    dbg.addEventListener("click", async () => {
      try {
        const { tvcLastFillReply } = await chrome.storage.local.get("tvcLastFillReply");
        copyText(JSON.stringify(tvcLastFillReply || { draft: full }, null, 2));
      } catch (_) {
        copyText(full || "");
      }
    });
    row.appendChild(dbg);
    out.appendChild(row);
  }

  const MODES = {
    coach: {
      label: "🧭 Page Copilot",
      system: "You are Trayarunya Copilot — an agentic browser sidekick for a startup founder. Analyse the live page, research, summarise, extract requirements, and produce concrete next actions. " + RULES,
    },
    vc: {
      label: "💼 VC Applications",
      system: "You are a fundraising specialist who has reviewed thousands of VC/accelerator applications. Sharp problem statements, bottom-up market math, traction with timeframes, why-this-team, clear round/ask. Keep answers within field limits (default 80-150 words). " + RULES + " " + FILL_PROTOCOL,
    },
    yc: {
      label: "🟠 YC Application",
      system: "You are a YC application expert. YC style: plain direct sentences, first sentence answers the question literally, concrete numbers, earned insight, honest competitor answers, no marketing language. 50-char descriptions = product + user, no slogans. " + RULES + " " + FILL_PROTOCOL,
    },
    outreach: {
      label: "✉️ Investor Outreach",
      system: "You are an expert at investor cold outreach. Emails 90-140 words: 1 personalised line proving research (from the page) → what we do in one sentence → 2-3 proof points → single ask. 2 subject options (4-7 words). Follow-ups: 3 touches, each shorter, each adds one proof point. LinkedIn notes <280 chars. Confident peer tone. " + RULES,
    },
    credits: {
      label: "🎁 Credits & Programs",
      system: "You are a startup-programs specialist (Microsoft for Startups Founders Hub, Microsoft ISV Success, Google for Startups, AWS Activate, NVIDIA Inception). Check eligibility criteria from the page (✅/⚠️/❌ with evidence), mirror the program's language, emphasise cloud usage. Verify current terms via web research when needed. " + RULES + " " + FILL_PROTOCOL,
    },
    publish: {
      label: "🚀 Store Publishing",
      system: "You are an app-store publishing expert (Microsoft commercial marketplace/Partner Center, Google Play, Apple App Store, Chrome Web Store). Produce listing copy within exact char limits (Play: title 30/short 80/full 4000; Apple: name 30/subtitle 30/keywords 100; Microsoft: summary 100/description 3000), keyword-conscious but human, plus pre-submission compliance checklists with top rejection reasons. " + RULES + " " + FILL_PROTOCOL,
    },
  };

  // -------------------------------------------------------------------- //
  // Universal AI Growth Assistant — graft every agent prompt from
  // lib/agents.js onto MODES so the existing buildSystem() pipeline can
  // address them by key.  These run alongside (not instead of) the
  // fundraising modes above — context detection chooses which surface.
  // -------------------------------------------------------------------- //
  try {
    const SYSP = window.TVC?.Agents?.SYSTEM_PROMPTS || {};
    const ICONS = {
      "tracking-audit": "🩺", "event-generator": "⚡", "gtm-copilot": "🏷️",
      "ga4-copilot": "📊", "ads-google": "🟦", "ads-meta": "🟪",
      "ads-linkedin": "🟦", "linkedin-growth": "💼", "seo-copilot": "🔍",
      "crm-copilot": "🗂️", "ecom-copilot": "🛍️", "cms-copilot": "🧱",
      "outreach-copilot": "✉️", "growth-audit": "🚀",
    };
    for (const [key, prompt] of Object.entries(SYSP)) {
      if (MODES[key]) continue;          // never overwrite existing fundraising mode
      const niceLabel = key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      MODES[key] = {
        label: `${ICONS[key] || "✨"} ${niceLabel}`,
        // Append the existing RULES so cite-the-page / no-fake-numbers stays enforced.
        system: prompt + " " + RULES,
      };
    }
  } catch (_) { /* lib/agents not loaded — extension still works in fundraising-only mode */ }

  async function buildSystem(modeId, { page, scan, extra } = {}) {
    const mode = MODES[modeId] || MODES.coach;
    const parts = [mode.system];
    const prof = profileBlock(await getProfile());
    if (prof) parts.push(prof);
    if (page) parts.push(pageBlock(page));
    if (scan) parts.push(formBlock(scan));
    if (extra) parts.push(extra);
    return parts.join("\n\n");
  }

  // ----------------------------------------------------------------- state

  const state = {
    open: false,
    tab: "coach",
    connected: false,
    webAppUrl: "https://mymarketiq.online",
    objective: "",
    agentRunning: false,
    agentAbort: false,
    chat: [], // [{role, content}]
    chatConvoId: null, // server-side Content Engine conversation id
    chatMode: "coach",
    chatStreaming: false,
  };

  function persistUi() {
    try {
      chrome.storage.local.set({ tvcUi: { open: state.open, tab: state.tab, chatMode: state.chatMode } });
    } catch (_) {}
  }

  // ----------------------------------------------------------------- panel

  function buildPanel() {
    const fab = el("button", "tvc-fab");
    fab.title = "MarketIQ Copilot (Alt+T)";
    const fabImg = document.createElement("img");
    fabImg.src = chrome.runtime.getURL("icons/icon48.png");
    fabImg.alt = "MarketIQ Copilot";
    fab.appendChild(fabImg);
    fab.addEventListener("click", () => {
      state.open = !state.open;
      panel.classList.toggle("tvc-open", state.open);
      persistUi();
      if (state.open) renderTab();
    });

    const panel = el("div", "tvc-panel");
    const head = el("div", "tvc-head");
    const logo = document.createElement("img");
    logo.src = chrome.runtime.getURL("icons/icon48.png");
    logo.alt = "";
    logo.className = "tvc-logo";
    head.appendChild(logo);
    const title = el("div", "tvc-title");
    title.innerHTML = 'MarketIQ <span class="tvc-grad">Copilot</span>';
    head.appendChild(title);

    // Context badge in the header — shows which mode the assistant is in.
    try {
      const ctx = window.TVC?.Context?.detect?.();
      if (ctx) {
        const badge = el("span", "tvc-head-ctx", ctx.badge);
        badge.title = `Auto-detected: ${ctx.app} (${ctx.kind}.${ctx.page})`;
        head.appendChild(badge);
      }
    } catch (_) { /* lib not loaded */ }

    const status = el("span", "tvc-status", "●");
    head.appendChild(status);
    const close = el("button", "tvc-close", "✕");
    close.addEventListener("click", () => {
      state.open = false;
      panel.classList.remove("tvc-open");
      persistUi();
    });
    head.appendChild(close);
    panel.appendChild(head);

    const tabs = el("div", "tvc-tabs");
    for (const [id, label] of [["coach", "Coach"], ["agent", "Agent"], ["fill", "Fill"], ["chat", "Chat"]]) {
      const t = el("button", "tvc-tab", label);
      t.dataset.tab = id;
      if (id === state.tab) t.classList.add("tvc-tab-on");
      t.addEventListener("click", () => {
        state.tab = id;
        tabs.querySelectorAll(".tvc-tab").forEach((x) => x.classList.toggle("tvc-tab-on", x.dataset.tab === id));
        persistUi();
        renderTab();
      });
      tabs.appendChild(t);
    }
    panel.appendChild(tabs);
    panel.appendChild(el("div", "tvc-body"));

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    send({ action: "tvc.getState" }).then((res) => {
      state.connected = !!(res.data && res.data.connected);
      if (res.data && res.data.webAppUrl) state.webAppUrl = res.data.webAppUrl;
      status.classList.toggle("tvc-status-on", state.connected);
      status.title = state.connected ? "Connected to MarketIQ" : "Not connected — open the extension popup";
    });

    return panel;
  }

  function body() {
    return document.querySelector(".tvc-panel .tvc-body");
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tvc-tab").forEach((x) => x.classList.toggle("tvc-tab-on", x.dataset.tab === tab));
    persistUi();
    renderTab();
  }

  function openPanel(tab) {
    state.open = true;
    document.querySelector(".tvc-panel")?.classList.add("tvc-open");
    if (tab) setTab(tab);
    else renderTab();
    persistUi();
  }

  function renderTab() {
    if (state.tab === "coach") renderCoach();
    else if (state.tab === "agent") renderAgent();
    else if (state.tab === "fill") renderFill();
    else renderChat();
  }

  function notConnectedCard(b) {
    if (state.connected) return false;
    const card = el("div", "tvc-card");
    card.appendChild(el("div", "tvc-card-title", "Not connected"));
    card.appendChild(el("div", "tvc-card-sub", "Open the extension popup (toolbar icon) and sign in with your MarketiQ account — or sync from an open web app tab."));
    b.appendChild(card);
    return true;
  }

  // ------------------------------------------------------------- coach tab

  function renderCoach() {
    const b = body();
    b.innerHTML = "";
    if (notConnectedCard(b)) return;

    const obj = el("input", "tvc-input");
    obj.placeholder = "Your objective (e.g. raise $500k pre-seed)";
    obj.value = state.objective;
    obj.addEventListener("change", () => {
      state.objective = obj.value.trim();
      try {
        chrome.storage.local.set({ tvcObjective: state.objective });
      } catch (_) {}
    });
    b.appendChild(obj);

    const out = el("div", "tvc-out");

    const run = async (prompt, { vision = false, webSearch = true } = {}) => {
      out.innerHTML = "";
      let images;
      if (vision) {
        const shot = await send({ action: "tvc.capture" });
        if (shot.ok && shot.data && shot.data.dataUrl) images = [{ dataUrl: shot.data.dataUrl }];
        else toast("Screenshot blocked on this page — using text only", false);
      }
      const system = await buildSystem("coach", {
        page: extractPage(),
        extra: state.objective ? `FOUNDER'S OBJECTIVE: ${state.objective}` : "",
      });
      try {
        await aiStreamInto(out, { system, prompt, webSearch, images, title: "Copilot — Page coach" });
      } catch (e) {
        out.appendChild(el("div", "tvc-error", e.message));
      }
    };

    const mainBtn = el("button", "tvc-btn tvc-btn-primary", "🧭 Coach this page");
    mainBtn.addEventListener("click", () =>
      run("Analyse this page for me: what it is, key facts, how it relates to my objective, and the 3 most concrete next actions I should take. Be brief and sharp.")
    );
    b.appendChild(mainBtn);

    const row = el("div", "tvc-row");
    const mk = (label, prompt, opts) => {
      const btn = el("button", "tvc-mini", label);
      btn.addEventListener("click", () => run(prompt, opts));
      return btn;
    };
    row.appendChild(mk("📸 With vision", "Look at the attached screenshot of this page plus the text. Analyse what I'm looking at and advise the next concrete actions for my objective.", { vision: true }));
    row.appendChild(mk("📋 Requirements", "Extract every requirement, eligibility criterion, deadline, char/word limit and required document on this page as a tight checklist."));
    row.appendChild(mk("⚡ Summarise", "Summarise this page into a crisp brief: what it is, who it's for, key facts, and what action we should take.", { webSearch: false }));
    b.appendChild(row);

    b.appendChild(out);
  }

  // ------------------------------------------------------------- agent tab

  function timelineStep(tl, label) {
    const step = el("div", "tvc-step");
    const ico = el("span", "tvc-step-ico");
    ico.innerHTML = '<span class="tvc-spin">◌</span>';
    const txt = el("span", "tvc-step-txt", label);
    step.appendChild(ico);
    step.appendChild(txt);
    tl.appendChild(step);
    tl.scrollTop = tl.scrollHeight;
    return {
      ok(msg) {
        ico.textContent = "✓";
        ico.classList.add("tvc-step-ok");
        if (msg) txt.textContent = msg;
      },
      fail(msg) {
        ico.textContent = "✕";
        ico.classList.add("tvc-step-fail");
        if (msg) txt.textContent = msg;
      },
      set(msg) {
        txt.textContent = msg;
      },
    };
  }

  function assertNotAborted() {
    if (state.agentAbort) throw new Error("Mission stopped.");
  }

  /**
   * Models sometimes echo labels instead of our field ids — remap any fill
   * whose id is unknown by matching it against scanned field labels.
   */
  function resolveFillIds(fills, scan) {
    const fields = (scan && scan.fields) || [];
    const known = new Set(fields.map((f) => String(f.id)));
    const norm = (s) => clean(String(s || "")).toLowerCase();
    return fills.map((f) => {
      if (known.has(String(f.id))) return f;
      const target = norm(f.id);
      if (target.length < 3) return f;
      const hit = fields.find((sf) => {
        const lab = norm(sf.label);
        return lab && (lab === target || lab.includes(target) || target.includes(lab));
      });
      return hit ? { ...f, id: String(hit.id) } : f;
    });
  }

  function renderFillReview(out, fills, scan) {
    fills = resolveFillIds(fills, scan);
    const byId = new Map((scan?.fields || []).map((f) => [String(f.id), f]));
    const card = el("div", "tvc-card");
    card.appendChild(el("div", "tvc-card-title", `📝 ${fills.length} answers ready`));
    const listWrap = el("div");
    for (const f of fills.slice(0, 40)) {
      const row = el("div", "tvc-fill-row");
      const meta = byId.get(String(f.id));
      row.appendChild(el("div", "tvc-fill-label", (meta && (meta.label || meta.placeholder)) || `Field ${f.id}`));
      const val = el("div", "tvc-fill-value");
      const v = String(f.value);
      if (v.includes("[CONFIRM")) {
        val.innerHTML = escHtml(v).replace(/\[CONFIRM[^\]]*\]/g, (m) => `<span class="tvc-fill-confirm">${m}</span>`);
      } else {
        val.textContent = v.length > 220 ? v.slice(0, 220) + "…" : v;
      }
      row.appendChild(val);
      listWrap.appendChild(row);
    }
    card.appendChild(listWrap);
    out.appendChild(card);

    const apply = el("button", "tvc-btn tvc-btn-primary", "⚡ Apply to form (review before submitting)");
    apply.addEventListener("click", () => {
      apply.disabled = true;
      const n = applyFills(fills);
      apply.textContent = n ? `✓ Filled ${n}/${fills.length} — review on page` : "✕ Fields not found — re-scan & retry";
      if (n) {
        toast(`✦ Filled ${n} fields — review before submitting`);
        send({ action: "tvc.badge", text: String(n) });
      } else {
        apply.disabled = false;
        toast("Could not match fields — re-scan the form", false);
      }
    });
    out.appendChild(apply);
    out.appendChild(el("div", "tvc-hint", "Nothing is submitted automatically. Red [CONFIRM] values need your real data."));
  }

  async function missionResearch(out) {
    const tl = el("div", "tvc-timeline");
    out.appendChild(tl);
    let st = timelineStep(tl, "Reading page…");
    const page = extractPage();
    st.ok(`Read "${(page.title || page.url).slice(0, 60)}"`);
    assertNotAborted();
    st = timelineStep(tl, "AI researching (live web)…");
    const system = await buildSystem("coach", { page, extra: state.objective ? `FOUNDER'S OBJECTIVE: ${state.objective}` : "" });
    const md = el("div", "tvc-out");
    out.appendChild(md);
    await aiStreamInto(md, {
      system,
      webSearch: true,
      title: "Copilot — Research",
      prompt:
        "Research this page in depth: who/what it is, stage & focus, key people, recent news, and exactly how we should approach or use it given our profile. Use web research to verify and enrich. End with a 3-step action plan.",
    });
    st.ok("Research brief ready");
    toast("✦ Research complete");
  }

  async function missionFill(out, opts) {
    const tl = el("div", "tvc-timeline");
    out.appendChild(tl);
    let st = timelineStep(tl, "Scanning form fields…");
    const scan = scanForm();
    if (!scan.fieldCount) {
      st.fail("No fillable fields found on this page");
      return;
    }
    st.ok(`Found ${scan.fieldCount} fields`);
    assertNotAborted();

    st = timelineStep(tl, "AI drafting answers from your startup profile…");
    const system = await buildSystem(opts.mode || "vc", { page: extractPage(4000), scan });
    const md = el("div", "tvc-out");
    out.appendChild(md);
    const { fills, full } = await requestFills(md, {
      system,
      scan,
      title: "Copilot — Application fill",
      prompt: "Fill this application end-to-end with our strongest truthful answers. Follow the AUTOFILL PROTOCOL exactly.",
      onRetry: () => st.set("Formatting answers into a fill plan…"),
    });
    if (!fills) {
      st.fail("Couldn't parse a fill plan — drafted answers are above");
      renderFillFailure(out, full);
      return;
    }
    st.ok(`Drafted ${fills.length} answers`);
    assertNotAborted();
    renderFillReview(out, fills, scan);
  }

  async function missionOutreach(out) {
    const tl = el("div", "tvc-timeline");
    out.appendChild(tl);
    let st = timelineStep(tl, "Reading page (investor/fund context)…");
    const page = extractPage();
    st.ok(`Read "${(page.title || page.url).slice(0, 60)}"`);
    assertNotAborted();
    st = timelineStep(tl, "Drafting personalised outreach…");
    const system = await buildSystem("outreach", { page });
    const md = el("div", "tvc-out");
    out.appendChild(md);
    const full = await aiStreamInto(md, {
      system,
      webSearch: false,
      title: "Copilot — Investor outreach",
      prompt:
        "Using this page, draft: (1) a personalised cold email from us with 2 subject-line options, (2) a 3-touch follow-up sequence, (3) a LinkedIn connection note <280 chars. Use ## headings for each part.",
    });
    st.ok("Outreach pack ready");
    const noteMatch = full.match(/## .*LinkedIn[\s\S]*?\n([\s\S]{20,400}?)(\n##|$)/i);
    if (noteMatch) out.appendChild(copyBlock("LinkedIn note", clean(noteMatch[1])));
    const copyAll = el("button", "tvc-btn", "📄 Copy full outreach pack");
    copyAll.addEventListener("click", () => copyText(stripFillBlock(full)));
    out.appendChild(copyAll);
    toast("✦ Outreach drafted — review & personalise");
  }

  async function missionEligibility(out) {
    const tl = el("div", "tvc-timeline");
    out.appendChild(tl);
    let st = timelineStep(tl, "Reading program page…");
    const page = extractPage();
    st.ok(`Read "${(page.title || page.url).slice(0, 60)}"`);
    assertNotAborted();
    st = timelineStep(tl, "Checking eligibility against your profile…");
    const system = await buildSystem("credits", { page });
    const md = el("div", "tvc-out");
    out.appendChild(md);
    await aiStreamInto(md, {
      system,
      webSearch: true,
      title: "Copilot — Program eligibility",
      prompt:
        "Produce an eligibility checklist for us for the program on this page: every criterion as ✅ / ⚠️ / ❌ with one-line evidence from our profile, then what to prepare before applying, then expected benefits. Verify current terms via web research if the page is thin.",
    });
    st.ok("Eligibility report ready");
    toast("✦ Eligibility check complete");
  }

  async function missionListing(out) {
    const tl = el("div", "tvc-timeline");
    out.appendChild(tl);
    let st = timelineStep(tl, "Reading store/console page…");
    const page = extractPage();
    st.ok(`Read "${(page.title || page.url).slice(0, 60)}"`);
    assertNotAborted();
    st = timelineStep(tl, "Drafting listing copy within char limits…");
    const system = await buildSystem("publish", { page });
    const md = el("div", "tvc-out");
    out.appendChild(md);
    const full = await aiStreamInto(md, {
      system,
      webSearch: false,
      title: "Copilot — Store listing",
      prompt:
        "Identify which store/console this page belongs to and draft the complete listing for our product within every character limit (title options, short/summary, full description with feature bullets, keywords), then a pre-submission compliance checklist with top rejection reasons. Use ## headings.",
    });
    st.ok("Listing pack ready");
    const copyAll = el("button", "tvc-btn", "📄 Copy full listing pack");
    copyAll.addEventListener("click", () => copyText(stripFillBlock(full)));
    out.appendChild(copyAll);
    toast("✦ Listing drafted");
  }

  function detectFillMode() {
    const host = location.hostname;
    const txt = (document.title + " " + host).toLowerCase();
    if (/ycombinator/.test(host)) return "yc";
    if (/microsoft|foundershub|partner\./.test(host)) return "credits";
    if (/play\.google|appstoreconnect|partner\.microsoft|chrome\.google|chromewebstore/.test(host)) return "publish";
    if (/grant|credit|program|startup/.test(txt)) return "credits";
    return "vc";
  }

  const MISSIONS = [
    {
      id: "research",
      icon: "🔎",
      title: "Research this page",
      desc: "Read page → live web research → actionable brief for your goal",
      when: () => true,
      run: missionResearch,
    },
    {
      id: "fill",
      icon: "📝",
      title: "Fill this application",
      desc: "Scan form → AI drafts answers from your profile → review → autofill",
      when: () => scanForm(8).fieldCount >= 2,
      run: (out) => missionFill(out, { mode: detectFillMode() }),
    },
    {
      id: "outreach",
      icon: "✉️",
      title: "Draft investor outreach",
      desc: "Personalised cold email + follow-ups + LinkedIn note from this page",
      when: () => true,
      run: missionOutreach,
    },
    {
      id: "eligibility",
      icon: "✅",
      title: "Check program eligibility",
      desc: "Founders Hub, ISV, AWS, Google… criteria vs your profile (✅/⚠️/❌)",
      when: () => true,
      run: missionEligibility,
    },
    {
      id: "listing",
      icon: "🚀",
      title: "Draft store listing",
      desc: "Play / App Store / Microsoft marketplace copy within char limits",
      when: () => true,
      run: missionListing,
    },
  ];

  // -------------------------------------------------------------------- //
  // Universal AI Growth Assistant — turn each declarative mission from
  // lib/agents.js into a runnable mission card. The runner attaches any
  // requested tools (tracking audit, event detector) as extra context to
  // the AI call, then streams the answer into the panel using the same
  // aiStreamInto pipeline the fundraising missions use.
  // -------------------------------------------------------------------- //
  function detectContext() {
    try {
      return window.TVC?.Context?.detect?.() || null;
    } catch (_) {
      return null;
    }
  }

  function describeTrackingAudit(rep) {
    if (!rep) return "";
    const inst = rep.installed.map((t) => `  ✓ ${t.name}${t.instanceId ? ` (${t.instanceId})` : ""}`).join("\n");
    const miss = rep.missing.map((t) => `  ✗ ${t.name}`).join("\n");
    const dup = (rep.duplicates || []).map((d) => `  ⚠ ${d.src} (×${d.count})`).join("\n");
    const iss = (rep.issues || []).map((i) => `  • [${i.severity}] ${i.title} — ${i.detail}`).join("\n");
    return `=== TRACKING AUDIT (${rep.hostname}) ===
Score: ${rep.score}/100 (grade ${rep.grade})
INSTALLED:
${inst || "  (none detected)"}
MISSING:
${miss || "  (none)"}
DUPLICATES:
${dup || "  (none)"}
ISSUES:
${iss || "  (none flagged)"}`;
  }

  function describeEventDetector(rep) {
    if (!rep) return "";
    const lines = rep.suggestions.slice(0, 30).map((s, i) =>
      `  ${i + 1}. ${s.event_name} (${s.kind}) — ${s.label}\n     conv=${s.conversion} goal=${s.goal} conf=${Math.round(s.confidence * 100)}%\n     selector: ${s.selector}\n     params: ${JSON.stringify(s.params)}`
    ).join("\n");
    return `=== SUGGESTED EVENTS (DOM scan, ${rep.total} total, ${rep.conversionEvents} conversions) ===
${lines || "  (no suggestions)"}`;
  }

  function describeContextBlock(ctx) {
    if (!ctx) return "";
    const s = ctx.signals || {};
    return `=== DETECTED CONTEXT ===
Platform: ${ctx.app} (${ctx.kind}.${ctx.page})
URL: ${ctx.url}
Signals: ${s.forms || 0} forms, ${s.inputs || 0} inputs, ${s.buttons || 0} buttons` +
      (s.calendly ? ", Calendly widget" : "") +
      (s.whatsapp ? ", WhatsApp link" : "") +
      (s.phone ? ", phone link" : "") +
      (s.video ? ", video player" : "");
  }

  async function missionUniversal(spec, out) {
    const tl = el("div", "tvc-timeline");
    out.appendChild(tl);

    let st = timelineStep(tl, "Reading page…");
    const page = extractPage();
    st.ok(`Read "${(page.title || page.url).slice(0, 60)}"`);
    assertNotAborted();

    const ctx = detectContext();
    const extras = [];
    if (ctx) extras.push(describeContextBlock(ctx));

    const tools = Array.isArray(spec.tools) ? spec.tools : [];
    if (tools.includes("tracking-audit") && window.TVC?.TrackingAudit) {
      st = timelineStep(tl, "Auditing installed tags…");
      const audit = window.TVC.TrackingAudit.audit();
      extras.push(describeTrackingAudit(audit));
      st.ok(`${audit.installed.length} tags installed · ${audit.missing.length} missing · ${audit.score}/100`);
      assertNotAborted();
    }
    if (tools.includes("event-detector") && window.TVC?.EventDetector) {
      st = timelineStep(tl, "Scanning DOM for trackable events…");
      const ev = window.TVC.EventDetector.scan();
      extras.push(describeEventDetector(ev));
      st.ok(`${ev.total} event candidate${ev.total === 1 ? "" : "s"} · ${ev.conversionEvents} conversion${ev.conversionEvents === 1 ? "" : "s"}`);
      assertNotAborted();
    }

    st = timelineStep(tl, `AI running ${spec.agent_label || "agent"}…`);
    const system = await buildSystem(spec.system || "coach", {
      page,
      extra: [
        extras.join("\n\n"),
        state.objective ? `OPERATOR'S OBJECTIVE: ${state.objective}` : "",
      ].filter(Boolean).join("\n\n"),
    });
    const md = el("div", "tvc-out");
    out.appendChild(md);
    let userPrompt = spec.prompt;
    if (spec._intentText) {
      userPrompt = `User intent: "${spec._intentText}"\n\n${spec.prompt}`;
    }
    await aiStreamInto(md, {
      system,
      webSearch: !!spec.web_search,
      title: `Copilot — ${spec.title}`,
      prompt: userPrompt,
    });
    st.ok(`${spec.agent_label || "Agent"} brief ready`);
    toast(`✦ ${spec.title} complete`);
  }

  function buildUniversalMissions(ctx) {
    if (!ctx || !window.TVC?.Agents?.allMissions) return [];
    const declarative = window.TVC.Agents.allMissions(ctx);
    return declarative.map((spec) => ({
      id: spec.id,
      icon: spec.icon || spec.agent_icon || "✨",
      title: spec.title,
      desc: spec.desc,
      agent_label: spec.agent_label,
      agent_color: spec.agent_color,
      when: () => true,
      run: (out) => missionUniversal(spec, out),
    }));
  }

  async function launchMission(m) {
    if (state.agentRunning) return;
    state.agentRunning = true;
    state.agentAbort = false;
    const b = body();
    b.innerHTML = "";
    const head = el("div", "tvc-card-titlerow");
    head.appendChild(el("div", "tvc-section", `Mission: ${m.title}`));
    const stop = el("button", "tvc-mini tvc-mini-danger", "■ Stop");
    stop.addEventListener("click", () => {
      state.agentAbort = true;
      const out = b.querySelector(".tvc-out");
      if (out && out._tvcAbort) out._tvcAbort();
      stop.textContent = "Stopping…";
    });
    head.appendChild(stop);
    b.appendChild(head);
    const out = el("div", "tvc-out");
    b.appendChild(out);
    try {
      await m.run(out);
    } catch (e) {
      out.appendChild(el("div", "tvc-error", e.message || "Mission failed"));
    } finally {
      state.agentRunning = false;
      stop.remove();
      const again = el("button", "tvc-btn", "↺ New mission");
      again.addEventListener("click", renderAgent);
      b.appendChild(again);
    }
  }

  function renderAgent() {
    const b = body();
    b.innerHTML = "";
    if (notConnectedCard(b)) return;
    if (state.agentRunning) {
      b.appendChild(el("div", "tvc-muted", "Mission in progress…"));
      return;
    }

    // ── Context badge: tells the user which agent set is active right now ──
    const ctx = detectContext();
    if (ctx) {
      const badge = el("div", "tvc-ctx");
      const dot = el("span", "tvc-ctx-dot");
      dot.style.background = ctx.kind === "linkedin" ? "#0A66C2"
        : ctx.kind === "ga4" ? "#E89200"
        : ctx.kind === "gtm" ? "#2563EB"
        : ctx.kind === "google-ads" ? "#1A73E8"
        : ctx.kind === "meta-ads" ? "#1877F2"
        : ctx.kind === "shopify" ? "#95BF47"
        : ctx.kind === "yc" ? "#FB651E"
        : "#0FA874";
      badge.appendChild(dot);
      const label = el("span", "tvc-ctx-text");
      label.innerHTML = `<b>${ctx.badge}</b> · agents auto-loaded for this page`;
      badge.appendChild(label);
      b.appendChild(badge);
    }

    // ── Universal Command Bar: free-text intent → routed mission ──
    const bar = el("div", "tvc-cmd");
    const input = el("input", "tvc-cmd-input");
    input.type = "text";
    input.placeholder = "Ask anything — e.g. \"audit this website\", \"find missing conversion events\", \"why did conversions drop?\"";
    bar.appendChild(input);
    const cmdGo = el("button", "tvc-cmd-go", "Run ▸");
    bar.appendChild(cmdGo);
    const launchFromBar = () => {
      const q = input.value.trim();
      if (!q) { input.focus(); return; }
      const spec = window.TVC?.Agents?.routeIntent?.(q, ctx);
      if (!spec || (!spec.id && !spec.agent_id)) {
        toast("Could not route that — try rephrasing", false);
        return;
      }
      // If routeIntent returned a full mission spec, launch it directly. Otherwise
      // fall back to the agent's first available mission (already injected below).
      let mission = null;
      if (spec.id) {
        mission = {
          id: spec.id,
          icon: spec.icon || spec.agent_icon || "✨",
          title: spec.title,
          desc: spec.desc,
          agent_label: spec.agent_label,
          when: () => true,
          run: (out) => missionUniversal(spec, out),
        };
      } else {
        const all = buildUniversalMissions(ctx);
        mission = all.find((m) => m.id?.startsWith?.(spec.agent_id) ) || all[0];
      }
      if (mission) launchMission(mission);
      else toast("No matching agent for this context", false);
    };
    cmdGo.addEventListener("click", launchFromBar);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); launchFromBar(); }
    });
    b.appendChild(bar);

    // ── Mission cards: context-specific first, then fundraising defaults ──
    b.appendChild(el("div", "tvc-hint", "Pick a mission. The agent plans & executes step-by-step — you stay in control, nothing is auto-submitted."));

    const universal = buildUniversalMissions(ctx);
    const seen = new Set();

    const renderCard = (m) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      const available = m.when();
      const card = el("div", "tvc-card tvc-mission" + (available ? "" : " tvc-mission-off"));
      const row = el("div", "tvc-card-titlerow");
      row.appendChild(el("div", "tvc-card-title", `${m.icon} ${m.title}`));
      const go = el("button", "tvc-mini tvc-mini-primary", "Run ▸");
      go.disabled = !available;
      row.appendChild(go);
      card.appendChild(row);
      const subParts = [available ? m.desc : `${m.desc} — open a page with a form to enable`];
      if (m.agent_label) subParts.push(`— ${m.agent_label}`);
      card.appendChild(el("div", "tvc-card-sub", subParts.join(" ")));
      go.addEventListener("click", () => launchMission(m));
      b.appendChild(card);
    };

    universal.forEach(renderCard);

    // Only show the fundraising defaults on contexts where they're useful —
    // YC, Microsoft Startups, app stores, or any "website" fallback (so they
    // remain available on a VC fund's site even without a specific agent).
    if (!ctx || ctx.kind === "yc" || ctx.kind === "ms-startup" ||
        ctx.kind === "appstore" || ctx.kind === "website") {
      MISSIONS.forEach(renderCard);
    }
  }

  // -------------------------------------------------------------- fill tab

  function renderFill() {
    const b = body();
    b.innerHTML = "";
    if (notConnectedCard(b)) return;

    getProfile().then((p) => {
      if (!(p.researched && p.researched.trim()) && !p.name) {
        const warn = el("div", "tvc-card");
        warn.appendChild(el("div", "tvc-card-title", "⚠️ No startup profile yet"));
        warn.appendChild(el("div", "tvc-card-sub", "Open the extension popup → Startup profile → enter your product & company websites → Research & build profile. Answers will be far stronger."));
        b.prepend(warn);
      }
    });

    const scan = scanForm();
    b.appendChild(el("div", "tvc-hint", `Page: ${location.hostname} — ${scan.fieldCount} fillable field${scan.fieldCount === 1 ? "" : "s"} detected`));

    if (!scan.fieldCount) {
      b.appendChild(el("div", "tvc-muted", "Open an application form (YC, a VC fund, Founders Hub, Partner Center, a store console…) and re-open this tab."));
      const re = el("button", "tvc-btn", "↺ Re-scan page");
      re.addEventListener("click", renderFill);
      b.appendChild(re);
      return;
    }

    const modeSel = el("select", "tvc-input");
    for (const [id, m] of Object.entries(MODES)) {
      if (id === "outreach") continue;
      const o = el("option", null, m.label);
      o.value = id;
      if (id === detectFillMode()) o.selected = true;
      modeSel.appendChild(o);
    }
    b.appendChild(modeSel);

    const out = el("div", "tvc-out");
    const go = el("button", "tvc-btn tvc-btn-primary", `📝 AI-fill ${scan.fieldCount} fields`);
    go.addEventListener("click", async () => {
      go.disabled = true;
      go.textContent = "Drafting…";
      out.innerHTML = "";
      try {
        const fresh = scanForm();
        const system = await buildSystem(modeSel.value, { page: extractPage(4000), scan: fresh });
        const { fills, full } = await requestFills(out, {
          system,
          scan: fresh,
          title: "Copilot — Application fill",
          prompt: "Fill this application end-to-end with our strongest truthful answers. Follow the AUTOFILL PROTOCOL exactly.",
          onRetry: () => {
            go.textContent = "Formatting answers…";
          },
        });
        if (fills) renderFillReview(out, fills, fresh);
        else renderFillFailure(out, full);
      } catch (e) {
        out.appendChild(el("div", "tvc-error", e.message));
      } finally {
        go.disabled = false;
        go.textContent = `📝 AI-fill ${scanForm(8).fieldCount} fields`;
      }
    });
    b.appendChild(go);

    const preview = el("details", "tvc-card");
    const sum = el("summary", "tvc-card-sub", "Preview detected fields");
    preview.appendChild(sum);
    for (const f of scan.fields.slice(0, 25)) {
      const row = el("div", "tvc-fill-row");
      row.appendChild(el("div", "tvc-fill-label", `${f.label || f.placeholder || f.id}${f.required ? " *" : ""}`));
      row.appendChild(el("div", "tvc-fill-value", `${f.tag === "input" ? f.type : f.tag}${f.maxLength ? ` · max ${f.maxLength}` : ""}${f.options ? ` · ${f.options.length} options` : ""}`));
      preview.appendChild(row);
    }
    b.appendChild(preview);
    b.appendChild(out);
  }

  // -------------------------------------------------------------- chat tab

  function renderChat() {
    const b = body();
    b.innerHTML = "";
    if (notConnectedCard(b)) return;

    const modeSel = el("select", "tvc-input");
    for (const [id, m] of Object.entries(MODES)) {
      const o = el("option", null, m.label);
      o.value = id;
      if (id === state.chatMode) o.selected = true;
      modeSel.appendChild(o);
    }
    modeSel.addEventListener("change", () => {
      state.chatMode = modeSel.value;
      persistUi();
    });
    b.appendChild(modeSel);

    const log = el("div", "tvc-chatlog");
    b.appendChild(log);
    for (const m of state.chat) {
      if (m.role === "user") log.appendChild(el("div", "tvc-bubble-user", m.content));
      else {
        const md = el("div", "tvc-md");
        md.innerHTML = renderMd(stripFillBlock(m.content));
        log.appendChild(md);
      }
    }

    const row = el("div", "tvc-row");
    const input = el("textarea", "tvc-input");
    input.rows = 2;
    input.placeholder = "Ask anything — research, draft, rewrite… (page context included)";
    const sendBtn = el("button", "tvc-mini tvc-mini-primary", "➤");
    row.appendChild(input);
    row.appendChild(sendBtn);

    const ask = async () => {
      const text = input.value.trim();
      if (!text || state.chatStreaming) return;
      input.value = "";
      state.chat.push({ role: "user", content: text });
      log.appendChild(el("div", "tvc-bubble-user", text));
      state.chatStreaming = true;
      sendBtn.disabled = true;
      const out = el("div", "tvc-out");
      log.appendChild(out);
      b.scrollTop = b.scrollHeight;
      try {
        // The server keeps conversation history; we resend mode + live page
        // context each turn (the page may have changed) and reuse the convo.
        const system = await buildSystem(state.chatMode, { page: extractPage(6000) });
        const opts = {
          system,
          webSearch: true,
          prompt: text,
          conversationId: state.chatConvoId,
          title: `Copilot — ${MODES[state.chatMode].label.replace(/^\S+\s/, "")}`,
          onMeta: (id) => {
            if (id) state.chatConvoId = id;
          },
        };
        let full;
        try {
          full = await aiStreamInto(out, opts);
        } catch (err) {
          if (/conversation_not_found/.test(err.message) && state.chatConvoId) {
            state.chatConvoId = null; // convo deleted in webapp — start fresh
            full = await aiStreamInto(out, { ...opts, conversationId: null });
          } else throw err;
        }
        state.chat.push({ role: "assistant", content: full });
        const chatScan = scanForm();
        const plan = extractFillPlan(full, chatScan);
        if (plan) {
          renderFillReview(out, plan.fills, chatScan);
          tidyFillOutput(out, plan.summary, full);
        }
        const acts = el("div", "tvc-row");
        const cp = el("button", "tvc-mini", "Copy");
        cp.addEventListener("click", () => copyText(stripFillBlock(full)));
        acts.appendChild(cp);
        out.appendChild(acts);
      } catch (e) {
        out.appendChild(el("div", "tvc-error", e.message));
      } finally {
        state.chatStreaming = false;
        sendBtn.disabled = false;
        b.scrollTop = b.scrollHeight;
      }
    };
    sendBtn.addEventListener("click", ask);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask();
      }
    });

    if (state.chat.length) {
      const clear = el("button", "tvc-mini", "🗑 New chat");
      clear.addEventListener("click", () => {
        state.chat = [];
        state.chatConvoId = null;
        renderChat();
      });
      b.appendChild(clear);
    }
    b.appendChild(row);
    b.scrollTop = b.scrollHeight;
  }

  // -------------------------------------------- ✦ Draft button on composers
  //
  // Adds an AI draft button to known email/DM composers. The human always
  // reviews and inserts; nothing is sent automatically.

  const COMPOSER_RULES = [
    { sel: 'div[aria-label="Message Body"][contenteditable="true"]', kind: "email" }, // Gmail
    { sel: 'div[role="textbox"][aria-label*="Message body"]', kind: "email" },        // Outlook web
    { sel: '.msg-form__contenteditable[contenteditable="true"]', kind: "dm" },        // LinkedIn DM
    { sel: "textarea#custom-message", kind: "connect_note" },                          // LinkedIn connect
  ];

  function composerText(node) {
    return clean(node.tagName === "TEXTAREA" ? node.value : node.innerText);
  }

  function insertIntoComposer(node, text) {
    node.focus();
    try {
      if (node.tagName === "TEXTAREA") {
        setNativeValue(node, text);
      } else {
        const sel = window.getSelection();
        sel.selectAllChildren(node);
        sel.collapseToEnd();
        const existing = composerText(node);
        document.execCommand("insertText", false, (existing ? "\n\n" : "") + text);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function closeDraftPop() {
    document.querySelector(".tvc-pop")?.remove();
  }

  async function openDraftPop(anchorBtn, node, kind) {
    closeDraftPop();
    const pop = el("div", "tvc-pop");
    const head = el("div", "tvc-pop-head");
    head.appendChild(el("span", "tvc-pop-title", "✦ Trayarunya drafts"));
    const x = el("button", "tvc-close", "✕");
    x.addEventListener("click", closeDraftPop);
    head.appendChild(x);
    pop.appendChild(head);
    const bodyEl = el("div", "tvc-pop-body");
    pop.appendChild(bodyEl);
    document.body.appendChild(pop);
    const r = anchorBtn.getBoundingClientRect();
    pop.style.left = `${Math.max(12, Math.min(window.innerWidth - 332, r.right - 320))}px`;
    pop.style.top = `${Math.max(12, r.top - 8 - 340)}px`;

    const existing = composerText(node);
    const prompt =
      kind === "connect_note"
        ? "Draft a LinkedIn connection note (<280 chars) to the person/page in context."
        : kind === "dm"
          ? "Draft a short, personalised LinkedIn message for this conversation/page. <120 words."
          : "Draft a personalised investor outreach email for the recipient implied by this page/compose window, with 2 subject options. Follow the email rules.";
    const system = await buildSystem("outreach", {
      page: extractPage(5000),
      extra: existing ? `DRAFT IN PROGRESS (improve or continue it):\n${existing.slice(0, 1500)}` : "",
    });
    const out = el("div", "tvc-out");
    bodyEl.appendChild(out);
    try {
      const full = await aiStreamInto(out, { system, webSearch: false, prompt, title: "Copilot — ✦ Draft" });
      const acts = el("div", "tvc-row");
      const ins = el("button", "tvc-mini tvc-mini-primary", "⤵ Insert");
      ins.addEventListener("click", () => {
        if (insertIntoComposer(node, stripFillBlock(full))) {
          toast("✦ Draft inserted — review before sending");
          closeDraftPop();
        } else toast("Could not insert — copy instead", false);
      });
      const cp = el("button", "tvc-mini", "Copy");
      cp.addEventListener("click", () => copyText(stripFillBlock(full)));
      acts.appendChild(ins);
      acts.appendChild(cp);
      bodyEl.appendChild(acts);
    } catch (e) {
      out.appendChild(el("div", "tvc-error", e.message));
    }
  }

  function ensureComposerButtons() {
    for (const rule of COMPOSER_RULES) {
      let nodes = [];
      try {
        nodes = document.querySelectorAll(rule.sel);
      } catch (_) {}
      for (const node of nodes) {
        if (!isVisible(node) || node.dataset.tvcAi) continue;
        node.dataset.tvcAi = "1";
        const holder = node.closest("form") || node.parentElement;
        if (!holder) continue;
        if (getComputedStyle(holder).position === "static") holder.style.position = "relative";
        const btn = el("button", "tvc-aibtn", "✦ Draft");
        btn.type = "button";
        btn.title = "Draft with Trayarunya Copilot";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openDraftPop(btn, node, rule.kind);
        });
        holder.appendChild(btn);
      }
    }
  }

  // ------------------------------------------------------------- bootstrap

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return undefined;
    if (msg.action === "tvc.command") {
      if (msg.command === "toggle-panel") {
        state.open = !state.open;
        document.querySelector(".tvc-panel")?.classList.toggle("tvc-open", state.open);
        persistUi();
        if (state.open) renderTab();
      } else if (msg.command === "agent-mode") {
        openPanel("agent");
      } else if (msg.command === "coach-page") {
        openPanel("coach");
        setTimeout(() => body()?.querySelector(".tvc-btn-primary")?.click(), 150);
      } else if (msg.command === "command-bar") {
        // Universal Command Bar — open Agent tab and focus the input.
        openPanel("agent");
        setTimeout(() => document.querySelector(".tvc-cmd-input")?.focus(), 150);
      }
      sendResponse({ ok: true });
    }
    return undefined;
  });

  // React to connect/disconnect while the page is open.
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes.tvcToken) return;
      state.connected = !!changes.tvcToken.newValue;
      const dot = document.querySelector(".tvc-status");
      if (dot) dot.classList.toggle("tvc-status-on", state.connected);
      if (state.open) renderTab();
    });
  } catch (_) {}

  async function init() {
    if (!document.body) {
      await sleep(300);
      if (!document.body) return;
    }
    try {
      const s = await chrome.storage.local.get(["tvcUi", "tvcObjective"]);
      if (s.tvcUi) {
        state.tab = ["coach", "agent", "fill", "chat"].includes(s.tvcUi.tab) ? s.tvcUi.tab : "coach";
        state.chatMode = MODES[s.tvcUi.chatMode] ? s.tvcUi.chatMode : "coach";
      }
      state.objective = s.tvcObjective || "";
    } catch (_) {}

    buildPanel();
    ensureComposerButtons();
    setInterval(ensureComposerButtons, 1800);
  }

  init();
})();
