#!/usr/bin/env python3
"""Generate 4 full-page MarketiQ website revamp concepts (light, 3D, brand)."""
import html
from pathlib import Path

OUT = Path(__file__).parent

# ---- real copy (from lib/marketing.ts) -------------------------------------
NAV = ["How it works", "Why MarketiQ", "Features", "ROI", "Compare", "Pricing", "FAQ"]
HERO = {
    "badge": "The Autonomous Go-To-Market Operating System",
    "lead": "Your entire go-to-market motion,",
    "grad": "researching, strategising & shipping",
    "tail": "on autopilot.",
    "sub": "MarketiQ AI is an Autonomous Go-To-Market Operating System powered by 46 AI agents and 31 autonomous optimization loops that continuously research, strategize, create, publish, optimize and learn across your entire go-to-market.",
    "micro": ["No credit card", "Point it at your website", "Watch a real GTM strategy appear"],
}
PROOF = [("46", "AI agents under one AI CMO"), ("31", "autonomous optimization loops"),
         ("2", "GTM motions: B2B & B2C"), ("24/7", "always-on research & optimisation")]
LOOP = [
    ("01", "Deep Research", "var(--teal)", "Autonomous agents crawl your site and the live web, map real demand, size the market and read every competitor — so your GTM starts from evidence, not opinions."),
    ("02", "GTM Strategy", "var(--amber)", "An AI strategist turns evidence into positioning, ICP & segments, a full funnel, lead magnets and a date-aware calendar — tuned for B2B or B2C/D2C."),
    ("03", "Creation Studio", "var(--pink)", "On-brand posts, carousels, threads, blogs, lead magnets and decks — written in your voice and colours, QA-gated before anything ships."),
    ("04", "Publish & Advertise", "var(--blue)", "Schedule and push to LinkedIn, X, Instagram, Facebook & YouTube via native OAuth. Agentic ads create and optimise campaigns."),
    ("05", "Learn & Compound", "var(--violet)", "Every decision is measured and attributed to real outcomes. Winning plays become a learned policy that flows into every agent — it gets smarter each cycle."),
]
WHY_BEFORE = ["A folder of disconnected tools that don't share data",
              "Hours of manual copy-paste between research, docs and schedulers",
              "Generic AI output any competitor could have written",
              "No memory — every campaign starts from a blank page",
              "$2k+/mo in subscriptions before a freelancer retainer"]
WHY_AFTER = ["One Revenue Graph — every stage reads & writes the same truth",
             "46 agents run the work end-to-end under an AI CMO",
             "On-brand, evidence-first output grounded in your real data",
             "A learning loop that compounds — smarter every cycle",
             "Replaces the stack and the busywork for one predictable price"]
REASONS = [
    ("◎", "Agentic, not assistive", "A 46-agent team that actually runs your go-to-market — each agent perceives live signals, calls 100+ real tools, and acts.", "var(--teal)"),
    ("⚙", "Tools + senses, not just text", "Every specialist sees a live snapshot of your channels and wields 100+ workspace-scoped tools — never blind.", "var(--amberDeep)"),
    ("⟳", "One closed loop", "Research → strategy → content → campaigns → revenue, connected through one Revenue Graph.", "var(--amber)"),
    ("↗", "It learns & compounds", "Every decision is attributed to real outcomes. Winning plays become a learned policy — including a win-probability model.", "var(--violet)"),
    ("✓", "Evidence-first, no fabrication", "Every number carries its source, timestamp and confidence. Honest gaps are reported, never back-filled.", "var(--blue)"),
    ("⛨", "You govern the AI", "Earned, risk-tiered autonomy under a kill-switch. Real spend & publishing only fire for proven agents.", "var(--pink)"),
]
MODULES = [
    ("Pipeline", "var(--teal)", [("Customer Profile", "ICP builder with firmographics & pains"), ("Research", "Autonomous web + competitor research"), ("Strategy", "Positioning, pillars, funnel & calendar"), ("Content Studio", "Posts, threads, blogs & lead magnets")]),
    ("Brand & Growth", "var(--amber)", [("Brand Brain", "Colours, tone & logo intelligence"), ("Ads", "Agentic campaign creation & optimisation"), ("Analytics", "Cross-channel performance"), ("Reports", "Client-ready, on-brand reporting")]),
    ("Intelligence", "var(--pink)", [("CRO Score", "Conversion-rate diagnostics"), ("Creative Intel", "What creative actually performs"), ("Experiments", "A/B tests & lift measurement"), ("Watchtower", "Competitor & market monitoring")]),
    ("Frontier GTM", "var(--tealDeep)", [("AI Visibility", "AEO/GEO citations in AI engines"), ("Retail Media", "Commerce-media for Amazon & Walmart"), ("Zero-Party Data", "Preference capture → lifecycle"), ("Synthetic UGC", "Disclosed AI creators, guardrailed")]),
    ("B2B Engine", "var(--blue)", [("ABM Accounts", "Target-account orchestration"), ("Campaign Builder", "Multi-touch campaign design"), ("Revenue Attribution", "Content & ads → pipeline")]),
    ("Automation", "var(--violet)", [("Workflows", "Trigger-based automations"), ("Tasks", "AI-assigned, tracked to done"), ("Integrations", "Native OAuth to every channel")]),
    ("Account", "var(--tealDeep)", [("Client Portal", "White-label approvals & reports"), ("Billing", "Plans, usage & invoices"), ("Team Chat", "Collaborate in the cockpit")]),
]
PLANS = [
    ("Starter", "For lean teams launching one go-to-market", "$299", False,
     ["250 AI credits / month", "50 images / month", "10,000 emails / month", "3 team members · 1 workspace", "All 46 AI agents & 31 loops", "Publishing, chat & PM"], "Start with Starter"),
    ("Growth", "For growing teams that ship every day", "$999", True,
     ["1,000 AI credits / month", "250 images / month", "50,000 emails / month", "15 team members · 1 workspace", "Everything in Starter", "Premium support"], "Choose Growth"),
    ("Agency", "For agencies running many client engines", "$2,999", False,
     ["3,000 AI credits / month", "1,000 images / month", "250,000 emails / month", "Unlimited members · 5 workspaces", "White-label client portals", "API access"], "Go Agency"),
]
FAQS = [
    ("What exactly is MarketiQ AI?", "An Autonomous Go-To-Market Operating System. It runs one closed loop — research, GTM strategy, creation, publishing and learning — across 30+ connected modules. One engine powers both Enterprise (B2B) and Consumer (B2C/D2C) motions."),
    ("How is this different from ChatGPT or a content tool?", "Single tools give you a chat box. MarketiQ gives you a 46-agent team under an AI CMO — each agent perceives your live channel signals and calls 100+ real tools to research, decide and act, all sharing one data layer."),
    ("Does it work for both B2B and B2C?", "Yes — MarketiQ detects your motion and tunes everything to it: account-based orchestration and revenue attribution for B2B; demand-at-scale, performance ads and trend-aware calendars for B2C/D2C."),
    ("Which channels can it publish to?", "LinkedIn, X, Instagram, Facebook and YouTube via native OAuth — you stay in full control of your own apps and tokens, with per-channel captions scheduled from one calendar."),
    ("Do I need my own AI keys?", "No. MarketiQ runs on our own managed, enterprise-grade AI — no setup or keys required. You just point it at your website and connect the channels you want."),
    ("Can agencies use it for multiple clients?", "Absolutely — it's multi-tenant by design. The Agency plan gives 5 workspaces (one per client), unlimited members, white-label portals and API access. Enterprise starts at $5,000/mo."),
]
MOD_MARQUEE = [("Content", "var(--amber)"), ("SEO", "var(--teal)"), ("Ads", "var(--blue)"), ("Email", "var(--violet)"),
               ("Social", "var(--pink)"), ("LinkedIn", "var(--teal)"), ("ABM", "var(--amber)"), ("CRO", "var(--blue)"),
               ("Analytics", "var(--teal)"), ("Attribution", "var(--violet)"), ("Revenue", "var(--pink)"), ("Brand", "var(--amber)"),
               ("Decks", "var(--blue)"), ("Calendar", "var(--violet)"), ("Research", "var(--teal)"), ("ICP", "var(--amber)")]

THEMES = [
    ("v1-aurora", "Aurora Light", "t-aurora"),
    ("v2-bento", "Bento 3D", "t-bento"),
    ("v3-editorial", "Editorial Bold", "t-editorial"),
    ("v4-spotlight", "Spotlight Gradient", "t-spotlight"),
]

E = html.escape
CHECK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 6"/></svg>'
XICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D92C4A" stroke-width="3"><path d="M6 6l12 12M18 6L6 18"/></svg>'


def nav():
    links = "".join(f'<a href="#">{E(n)}</a>' for n in NAV)
    return f'''<nav class="nav"><div class="nav-inner">
  <a class="brand"><img src="assets/logo.png" alt="MarketiQ AI"/></a>
  <div class="nav-links">{links}</div>
  <div class="nav-cta"><a class="login">Log in</a><button class="btn">Start free</button></div>
</div></nav>'''


def hero():
    trust = "".join(f'<span>{CHECK}{E(t)}</span>' for t in HERO["micro"])
    return f'''<header class="hero wrap">
  <span class="badge"><span class="dot"></span>{E(HERO["badge"])}</span>
  <h1 class="title">{E(HERO["lead"])}<br/><span class="grad">{E(HERO["grad"])}</span> {E(HERO["tail"])}</h1>
  <p class="sub">{E(HERO["sub"])}</p>
  <div class="scanbox"><form class="scanform" onsubmit="return false">
    <input type="text" placeholder="yourcompany.com — point us at your site"/>
    <button class="btn" type="submit">Build my GTM →</button>
  </form></div>
  <div class="ctas"><button class="btn">Start free →</button><button class="btn ghost">See how it works</button></div>
  <div class="trust">{trust}</div>

  <div class="stage">
    <div class="glowback"></div>
    <div class="chip c1"><i style="background:var(--teal)"></i>+38% pipeline</div>
    <div class="chip c2"><i style="background:var(--amber)"></i>Blog published</div>
    <div class="chip c3"><i style="background:var(--blue)"></i>Budget → Meta</div>
    <div class="chip c4"><i style="background:var(--pink)"></i>Lead scored</div>
    <div class="laptop"><div class="screen"><div class="notch"></div><img class="shot" src="assets/shot.png" alt="MarketiQ dashboard"/></div></div>
    <div class="base"></div>
  </div>

  <div class="proof">''' + "".join(
        f'<div class="pf"><b class="grad">{E(v)}</b><span>{E(l)}</span></div>' for v, l in PROOF
    ) + '''</div>
</header>'''


def marquee():
    row = "".join(f'<span class="mq"><i style="background:{c}"></i>{E(n)}</span>' for n, c in MOD_MARQUEE)
    return f'''<div class="marquee-wrap"><div class="marquee-label">One cockpit · 30+ connected modules</div>
  <div class="marquee"><div class="marquee-track">{row}{row}</div></div></div>'''


def loop():
    cards = "".join(
        f'''<div class="loop-card"><div class="bar" style="background:{c}"></div>
        <div class="n">{E(n)}</div><h3>{E(t)}</h3><p>{E(d)}</p></div>'''
        for n, t, c, d in LOOP)
    return f'''<section class="sec" id="how"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">One closed GTM loop</span>
    <h2>Five agentic stages. One compounding go-to-market system.</h2>
    <p>Every stage feeds the next, and real performance data feeds back to the start — so each cycle is sharper than the last.</p></div>
  <div class="loop-grid">{cards}</div>
</div></section>'''


def why():
    before = "".join(f'<li>{XICON}{E(x)}</li>' for x in WHY_BEFORE)
    after = "".join(f'<li><span style="color:var(--teal)">{CHECK}</span>{E(x)}</li>' for x in WHY_AFTER)
    reasons = "".join(
        f'''<div class="reason"><div class="ic" style="background:{c}">{ic}</div>
        <h3>{E(k)}</h3><p>{E(v)}</p></div>'''
        for ic, k, v, c in REASONS)
    return f'''<section class="sec" id="why" style="background:var(--bg2)"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">Why MarketiQ</span>
    <h2>The old GTM stack is broken. One engine fixes it.</h2>
    <p>Teams duct-tape a dozen disconnected tools and still do the work by hand. MarketiQ replaces the stack with one autonomous engine.</p></div>
  <div class="cmp">
    <div class="cmp-card before"><h4>The 12-tool GTM stack</h4><ul>{before}</ul></div>
    <div class="cmp-card after"><h4>MarketiQ — one autonomous engine</h4><ul>{after}</ul></div>
  </div>
  <div class="reasons">{reasons}</div>
</div></section>'''


def modules():
    mods = ""
    for name, color, items in MODULES:
        rows = "".join(f'<div class="item"><b>{E(a)}</b><span>{E(b)}</span></div>' for a, b in items)
        mods += f'''<div class="mod"><div class="h"><span class="dot" style="background:{color}"></span><b>{E(name)}</b></div>{rows}</div>'''
    return f'''<section class="sec modules" id="features"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">Everything in one cockpit</span>
    <h2>30+ connected modules, not a folder of disconnected tools.</h2>
    <p>Each module shares the same research, brand and data layer — so insight in one place sharpens every other.</p></div>
  <div class="mods">{mods}</div>
</div></section>'''


def pricing():
    plans = ""
    for name, tl, price, pop, feats, cta in PLANS:
        tag = '<div class="tag">MOST POPULAR</div>' if pop else ''
        lis = "".join(f'<li><span style="color:var(--teal)">{CHECK}</span>{E(f)}</li>' for f in feats)
        plans += f'''<div class="plan{' pop' if pop else ''}">{tag}<h3>{E(name)}</h3>
        <div class="tl">{E(tl)}</div><div class="price">{E(price)}<span>/mo</span></div>
        <ul>{lis}</ul><button class="btn{'' if pop else ' ghost'}">{E(cta)}</button></div>'''
    return f'''<section class="sec" id="pricing" style="background:var(--bg2)"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">Pricing</span>
    <h2>Plans that scale with your go-to-market.</h2>
    <p>Simple monthly credits that reset every month. Start free, upgrade as your GTM engine earns it.</p></div>
  <div class="plans">{plans}</div>
  <p style="text-align:center;margin-top:24px;color:var(--faint);font-size:13px">Or start free — no card needed · Enterprise from $5,000/mo</p>
</div></section>'''


def faq():
    items = "".join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in FAQS)
    return f'''<section class="sec" id="faq"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">FAQ</span><h2>Questions, answered.</h2></div>
  <div class="faq">{items}</div>
</div></section>'''


def final_cta():
    return '''<section class="sec"><div class="wrap"><div class="final">
  <h2>Own your go-to-market.</h2>
  <p>Spin up a workspace, point it at your website, and watch a real go-to-market strategy appear in minutes — for B2B or B2C.</p>
  <div class="ctas" style="margin-top:26px"><button class="btn lg">Start free →</button><button class="btn ghost lg" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">Book a demo</button></div>
</div></div></section>'''


def footer():
    return '''<footer class="foot"><div class="wrap">MarketiQ AI · Trayarunya Ventures · Autonomous Go-To-Market Operating System</div></footer>'''


def page(theme):
    tid, name, cls = theme
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MarketiQ — {E(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="base.css"/>
</head><body class="{cls}">
<div class="vtag">{E(name)}</div>
<div class="ribbon">🚀 Launching on Product Hunt — June 30, 2026 · <a href="#">follow &amp; support →</a></div>
{nav()}
{hero()}
{marquee()}
{loop()}
{why()}
{modules()}
{pricing()}
{faq()}
{final_cta()}
{footer()}
</body></html>'''


def index():
    cards = "".join(
        f'''<a class="card" href="{tid}.html">
        <div class="frame"><iframe src="{tid}.html" scrolling="no"></iframe></div>
        <div class="meta"><b>{i+1}. {E(name)}</b></div></a>'''
        for i, (tid, name, _c) in enumerate(THEMES))
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MarketiQ — Website revamp concepts</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
body{{margin:0;font-family:"Space Grotesk",sans-serif;background:#0E1116;color:#fff;padding:40px 24px}}
h1{{font-size:28px;margin:0 0 6px}}.muted{{color:rgba(255,255,255,.6);margin:0 0 28px}}
.grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;max-width:1200px;margin:0 auto}}
@media(max-width:820px){{.grid{{grid-template-columns:1fr}}}}
.card{{display:block;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden;background:#151a22;transition:transform .2s,border-color .2s}}
.card:hover{{transform:translateY(-4px);border-color:rgba(20,187,135,.6)}}
.frame{{height:420px;overflow:hidden;background:#fff}}
.frame iframe{{width:1400px;height:1500px;border:0;transform:scale(.62);transform-origin:top left;pointer-events:none}}
.meta{{padding:14px 18px;font-size:15px}}
</style></head><body>
<div style="max-width:1200px;margin:0 auto"><h1>MarketiQ — website revamp concepts</h1>
<p class="muted">4 full-page directions · light theme · 3D · brand-coloured. Click any to open full screen.</p></div>
<div class="grid">{cards}</div>
</body></html>'''


for t in THEMES:
    (OUT / f"{t[0]}.html").write_text(page(t), encoding="utf-8")
(OUT / "index.html").write_text(index(), encoding="utf-8")
print(f"Generated {len(THEMES)} full-page concepts + index.html")
