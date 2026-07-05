#!/usr/bin/env python3
"""Generate 12 full-page hero replicas of the MarketiQ marketing site.

Each version reuses the EXACT real structure + copy + brand colors (replica),
and differs in visual treatment (3D laptop, brand corner-glow, 3D cards, mode).
"""
import html
import pathlib

OUT = pathlib.Path(__file__).parent

# --- Real site content (verbatim) -------------------------------------------
BADGE = "The Autonomous Go-To-Market Operating System"
TITLE_LEAD = "Your entire go-to-market motion,"
TITLE_GRAD = "researching, strategising &amp; shipping"
TITLE_TAIL = "on autopilot."
SUBTITLE = ("MarketiQ AI is an Autonomous Go-To-Market Operating System powered by 46 AI agents "
            "and 31 autonomous optimization loops that continuously research, strategize, create, "
            "publish, optimize, and learn across your entire go-to-market.")
NAV = ["How it works", "Why MarketiQ", "Features", "ROI", "Compare", "Pricing", "FAQ"]
TRUST = ["No credit card", "Point at your website", "Live in minutes"]
PROOF = [("46", "AI agents"), ("31", "autonomous loops"), ("14", "GTM stages, one loop"), ("24/7", "always-on")]
MODULES = ["Research", "ICP", "Strategy", "Content", "SEO", "Ads", "Email", "Social", "LinkedIn",
           "ABM", "CRO", "Analytics", "Attribution", "Revenue", "Brand", "PMM", "Launch", "Calendar"]
CARDS = [
    ("Autonomous strategy", "The AI CMO senses, decides and directs 46 agents daily — no manual planning."),
    ("Create &amp; publish", "Content, creatives, video and blogs ship with 100% on-page SEO, on autopilot."),
    ("Compounding learning", "Every outcome feeds back — the system gets sharper with each cycle."),
]

# --- 12 themes: (id, name, mode, tokens dict, body_class) --------------------
THEMES = [
    ("v01-aurora-light", "Aurora Light", "light", {}, "t-aurora"),
    ("v02-neon-dark", "Neon Dark", "dark", {}, "t-neon"),
    ("v03-floating-3d", "Floating 3D", "light", {}, "t-floating"),
    ("v04-premium-spotlight", "Premium Spotlight", "light", {}, "t-spotlight"),
    ("v05-glassmorphism", "Glassmorphism", "light", {}, "t-glass"),
    ("v06-bento", "Bento Grid", "light", {}, "t-bento"),
    ("v07-mesh-gradient", "Mesh Gradient", "dark", {}, "t-mesh"),
    ("v08-editorial-minimal", "Editorial Minimal", "light", {}, "t-editorial"),
    ("v09-agent-orbit", "Agent Orbit", "dark", {}, "t-orbit"),
    ("v10-command-center", "Command Center", "dark", {}, "t-command"),
    ("v11-iso-stack", "Isometric Stack", "light", {}, "t-iso"),
    ("v12-brand-beam", "Brand Beam", "light", {}, "t-beam"),
]


def page(theme):
    tid, name, mode, _tok, body_class = theme
    dark = mode == "dark"
    nav_links = "".join(f'<a href="#">{html.escape(n)}</a>' for n in NAV)
    trust = "".join(
        f'<span class="trust"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 6"/></svg>{t}</span>'
        for t in TRUST)
    proof = "".join(f'<div class="pf"><b>{v}</b><span>{l}</span></div>' for v, l in PROOF)
    marquee = "".join(f'<span class="mq"><i></i>{m}</span>' for m in MODULES)
    marquee = marquee + marquee  # seamless loop
    cards = "".join(
        f'<div class="card"><div class="spot"></div><div class="ic">{ICONS[i]}</div><h3>{t}</h3><p>{d}</p></div>'
        for i, (t, d) in enumerate(CARDS))

    return TEMPLATE.format(
        tid=tid, name=html.escape(name), body_class=body_class,
        mode_class="dark" if dark else "light",
        nav_links=nav_links, badge=html.escape(BADGE),
        title_lead=TITLE_LEAD, title_grad=TITLE_GRAD, title_tail=TITLE_TAIL,
        subtitle=html.escape(SUBTITLE), trust=trust, proof=proof,
        marquee=marquee, cards=cards,
    )


ICONS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>',
]

TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>MarketiQ — {name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="base.css">
</head>
<body class="{mode_class} {body_class}">
  <div class="vtag">{name}</div>

  <!-- NAV (floating pill) -->
  <header class="nav">
    <div class="nav-inner">
      <a class="brand" href="#"><img src="assets/mark.svg" width="26" height="26" alt=""/> <b>MarketiQ <span>Ai</span></b></a>
      <nav class="nav-links">{nav_links}</nav>
      <div class="nav-cta">
        <a class="login" href="#">Login</a>
        <a class="btn" href="#">Start free</a>
      </div>
    </div>
  </header>

  <!-- HERO -->
  <section class="hero">
    <div class="fx" aria-hidden="true"></div>
    <div class="wrap hero-copy">
      <span class="badge"><i class="dot"></i> {badge}</span>
      <h1>{title_lead} <span class="g">{title_grad}</span> {title_tail}</h1>
      <p class="lede">{subtitle}</p>
      <form class="url" onsubmit="return false">
        <input placeholder="yourcompany.com" aria-label="website"/>
        <button class="btn">Build my GTM →</button>
      </form>
      <div class="cta-row">
        <a class="btn" href="#">Start free →</a>
        <a class="btn ghost" href="#">See how it works</a>
      </div>
      <div class="trust-row">{trust}</div>
    </div>

    <!-- 3D LAPTOP MOCKUP -->
    <div class="wrap stage">
      <div class="glowback"></div>
      <div class="rig" id="rig">
        <div class="chip c1"><i style="background:#0EA47A"></i> +38% pipeline</div>
        <div class="chip c2"><i style="background:#FF9D00"></i> Blog published</div>
        <div class="chip c3"><i style="background:#2E7CF6"></i> Budget → Meta</div>
        <div class="chip c4"><i style="background:#F43F5E"></i> Lead scored</div>
        <div class="laptop">
          <div class="screen"><div class="notch"></div><img class="shot" src="assets/shot.png" alt="MarketiQ dashboard"/></div>
        </div>
        <div class="base"></div>
      </div>
    </div>

    <!-- PROOF STRIP -->
    <div class="wrap"><div class="proof">{proof}</div></div>
  </section>

  <!-- MARQUEE -->
  <div class="marquee-wrap">
    <div class="marquee-label">One cockpit · 30+ connected modules</div>
    <div class="marquee"><div class="marquee-track">{marquee}</div></div>
  </div>

  <!-- 3D FEATURE CARDS -->
  <div class="wrap"><div class="cards">{cards}</div></div>

  <div class="foot">MarketiQ · {name} — full-site replica preview</div>

  <script>
    // spotlight cards
    document.querySelectorAll('.card').forEach(function(c){{
      c.addEventListener('mousemove',function(e){{var r=c.getBoundingClientRect();
        c.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
        c.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');}});
    }});
  </script>
</body>
</html>
"""

for theme in THEMES:
    (OUT / f"{theme[0]}.html").write_text(page(theme), encoding="utf-8")

# Index
links = "".join(
    f'<a class="card-link {t[4]}" href="{t[0]}.html"><b>{i+1:02d}</b> {html.escape(t[1])}'
    f'<span>{ "dark" if t[2]=="dark" else "light" } · 3D laptop · corner glow · 3D cards</span></a>'
    for i, t in enumerate(THEMES))
(OUT / "index.html").write_text(f"""<!doctype html><html><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>MarketiQ — 12 site versions</title>
<style>
body{{margin:0;background:#0C1424;color:#EAF0FF;font-family:-apple-system,Inter,"Segoe UI",sans-serif;padding:56px 20px;text-align:center}}
h1{{font-size:38px;margin:0 0 6px;letter-spacing:-.02em}} p{{color:#9AA3B2;margin:0 0 36px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;max-width:1040px;margin:0 auto}}
.card-link{{display:block;padding:24px;border-radius:18px;text-decoration:none;color:#fff;font-weight:800;font-size:19px;
  background:linear-gradient(135deg,#FFB52E,#0EA47A);box-shadow:0 16px 40px rgba(255,157,0,.22);transition:transform .2s;text-align:left}}
.card-link:hover{{transform:translateY(-4px)}}
.card-link b{{opacity:.7;margin-right:8px}}
.card-link span{{display:block;font-size:12px;font-weight:600;opacity:.9;margin-top:8px}}
.t-neon,.t-mesh,.t-orbit,.t-command{{background:linear-gradient(135deg,#5B8DEF,#1ED7A0)}}
.t-floating,.t-iso{{background:linear-gradient(135deg,#2E7CF6,#8B5CF6)}}
.t-spotlight,.t-beam,.t-glass{{background:linear-gradient(135deg,#F43F5E,#FF9D00)}}
.t-bento,.t-editorial{{background:linear-gradient(135deg,#0EA47A,#2E7CF6)}}
</style></head><body>
<h1>MarketiQ — 12 full-site versions</h1>
<p>Real structure + copy + brand colors, replicated. Each version: 3D laptop, brand corner-glow, 3D cards. Pick the best.</p>
<div class=grid>{links}</div></body></html>""", encoding="utf-8")

print(f"Generated {len(THEMES)} versions + index.html")
