#!/usr/bin/env python3
"""
build_pkg.py — assemble a standalone single-file HTML package from the shared
core (CSS + engine + boot) plus a per-package config.json and cards.js.

Guarantees every package uses the IDENTICAL house engine (the Chart x Motion
Atlas core), so the family stays visually consistent.

Usage:
  python3 build_pkg.py <id>            # reads <id>.config.json + <id>.cards.js -> <id>.html
  python3 build_pkg.py <id> --out path.html
"""
import argparse, json, os, sys, html

HERE = os.path.dirname(os.path.abspath(__file__))

def read(p):
    with open(os.path.join(HERE, p), encoding="utf-8") as f:
        return f.read()

PAGE = """<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont/style.css">
{theme_fonts}
<style>
{css}
</style>
{theme_style}
{theme_light_style}
</head>
<body>

<header class="topbar">
  <div class="brand"><span class="dot"></span><b>{brand_b}</b><span class="sep">/</span>{brand_rest}</div>
  <div class="right">
    {mode_toggle}
    <button class="btn langToggle" id="langToggle" title="中文 / English"><span class="l-cn">中</span><span class="l-sep">/</span><span class="l-en">EN</span></button>
    <button class="btn" id="replayAll">↻ replay all</button>
  </div>
</header>

<main class="wrap">
  <section class="hero">
    <div class="eyebrow t-cn">{eyebrow}</div>
    <h1>{h1_html}</h1>
    <p class="lede"><span class="t-en">{lede}</span><span class="t-cn">{lede_cn}</span></p>
    <div class="keys">{keys}</div>
  </section>
{sections}
</main>

<footer><div class="wrap"><span>{footer_left}</span><span>{footer_right}</span></div></footer>

<script>
{theme_js}
{theme_light_js}
{core}

window.PKG = {pkg_json};

{cards}

{boot}
</script>
</body>
</html>
"""

SECTION = """
  <section class="section" id="{id}">
    <div class="sec-head"><span class="sec-no">{no}</span><h2><span class="t-en">{title}</span><span class="t-cn">{cn}</span></h2></div>
    <p class="sec-desc t-en">{desc}</p>
    <div id="{id}-body" data-wide="{wide}"></div>
  </section>"""

def build_sections(cfg):
    out = []
    for s in cfg["sections"]:
        out.append(SECTION.format(
            id=s["id"], no=html.escape(s.get("no", "")),
            title=html.escape(s["title"]), cn=html.escape(s.get("cn", "")),
            desc=s.get("desc", ""), wide="1" if s.get("wide") else "0"))
    return "\n".join(out)

def build_keys(cfg):
    keys = cfg.get("keys", ["#c0171f", "#46b8a5", "#d9933d"])
    return "".join(
        f'<span class="key"><span class="sw" style="background:{k}"></span>{k}</span>' for k in keys)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("id")
    ap.add_argument("--out")
    a = ap.parse_args()
    cfg = json.loads(read(a.id + ".config.json"))
    pkg_json = json.dumps({"sections": [{"id": s["id"]} for s in cfg["sections"]],
                           "cats": cfg.get("cats", {}),
                           "catColors": cfg.get("catColors", {}),
                           "catTints": cfg.get("catTints", {}),
                           "catNames": cfg.get("catNames", {}),
                           "stageTint": cfg.get("stageTint", False)}, ensure_ascii=False)

    # ---- per-package theme (fonts + CSS var overrides + JS palette) ----
    theme = cfg.get("theme", {})
    theme_fonts = (f'<link href="{theme["fonts"]}" rel="stylesheet">'
                   if theme.get("fonts") else "")
    css_vars = theme.get("css", {})
    theme_style = ""
    if css_vars or theme.get("css_extra"):
        vars_str = " ".join(f"{k}:{v};" for k, v in css_vars.items())
        theme_style = (f"<style>:root{{{vars_str}}}\n{theme.get('css_extra','')}</style>")
    th_obj = {}
    if theme.get("C"):   th_obj["C"] = theme["C"]
    if theme.get("PAL"): th_obj["PAL"] = theme["PAL"]
    theme_js = (f"window.__THEME={json.dumps(th_obj, ensure_ascii=False)};"
                if th_obj else "")

    # ---- theme controls ----
    theme_light_style = ""; theme_light_js = ""; mode_toggle = ""
    if cfg.get("schemes"):
        # 3 colour schemes × night/light via the shared-core switcher (window.__SCHEMES_ON)
        theme_light_js = "window.__SCHEMES_ON=true;"
        mode_toggle = ('<span class="schemePick">'
                       '<button class="btn schemeBtn" aria-label="scheme 1"></button>'
                       '<button class="btn schemeBtn" aria-label="scheme 2"></button>'
                       '<button class="btn schemeBtn" aria-label="scheme 3"></button>'
                       '</span>'
                       '<button class="btn modeToggle" id="modeToggle" title="夜间 / 白天 · night / light">☾</button>')
    else:
        # optional night/light only: themeLight -> body.light overrides + __THEME_LIGHT + a mode toggle
        tl = cfg.get("themeLight", {})
        if tl:
            lvars = " ".join(f"{k}:{v};" for k, v in tl.get("css", {}).items())
            theme_light_style = f"<style>body.light{{{lvars}}}\n{tl.get('css_extra','')}</style>"
            lobj = {}
            if tl.get("C"):   lobj["C"] = tl["C"]
            if tl.get("PAL"): lobj["PAL"] = tl["PAL"]
            theme_light_js = f"window.__THEME_LIGHT={json.dumps(lobj, ensure_ascii=False)};"
            mode_toggle = '<button class="btn modeToggle" id="modeToggle" title="夜间 / 白天 · night / light">☾</button>'

    page = PAGE.format(
        theme_fonts=theme_fonts, theme_style=theme_style, theme_js=theme_js,
        theme_light_style=theme_light_style, theme_light_js=theme_light_js, mode_toggle=mode_toggle,
        lang=cfg.get("lang", "zh"),
        title=html.escape(cfg["title"]),
        css=read("_core.css"),
        brand_b=html.escape(cfg.get("brand_b", "")),
        brand_rest=html.escape(cfg.get("brand_rest", "")),
        eyebrow=html.escape(cfg.get("eyebrow", "")),
        h1_html=cfg.get("h1_html", cfg.get("title", "")),
        lede=cfg.get("lede", ""),
        lede_cn=cfg.get("lede_cn", ""),
        keys=build_keys(cfg),
        sections=build_sections(cfg),
        footer_left=html.escape(cfg.get("footer_left", "")),
        footer_right=html.escape(cfg.get("footer_right", "")),
        core=read("_core.js"),
        pkg_json=pkg_json,
        cards=read(a.id + ".cards.js"),
        boot=read("_boot.js"),
    )
    out = a.out or os.path.join(HERE, a.id + ".html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    n_sec = len(cfg["sections"])
    print(f"wrote {out}  ({len(page)} bytes, {n_sec} section(s))")

if __name__ == "__main__":
    main()
