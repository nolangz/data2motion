---
name: data2motion-lite
description: Lightweight, script-driven variant of data2motion for turning data into a smooth, on-brand animated chart (one self-contained HTML) — built for a TEXT-ONLY model that cannot see its own output. You never write HTML/CSS/SVG/animation; you extract the data, pick a chart, fill a small JSON spec, and run one build script that owns 100% of the look and the motion, so the result cannot drift from the house template style or lose its smoothness. Use to turn a number/stat/table/CSV/paragraph into a quick animated chart, data reveal, or KPI when you want guaranteed template fidelity with minimal reasoning and no image feedback.
---

# data2motion-lite

Turn data into a **smooth, on-brand animated chart** in one self-contained HTML file.

This is the *lite* variant. It assumes **you are a text model that cannot see images**, so it puts **all** of the design and animation into a deterministic script. **You never write HTML, CSS, SVG, or animation code.** You do four things — get the data, pick a chart, write a spec, run the build — and the script makes the result look like the template every single time. Your output cannot drift from the house style or lose its smoothness, because you don't author the pixels: the script does.

## Use it in 4 steps

1. **Get the data.** From a table, CSV, a paragraph, or a single number — pull out the labels and values. Group them into rows (or series / points, depending on the chart you'll pick).
2. **Pick a chart — your call, no rules.** Choose whatever form shows the data best. The supported forms (and the data each needs) are in `references/spec.md`:
   **kpi · bar · column · diverging · line · multiline · area · stacked · scatter · lollipop · dumbbell**.
   If the form you imagined isn't on that list, pick the nearest one that is — **never hand-build a chart type.** The script colours every mark **uniformly** — no single mark is singled out: single-series charts draw all marks in one house colour, multi-series give each series a distinct colour from a categorical palette, and `diverging` colours by sign. (Optional per-row `role` for honest up/down semantic colour is in `references/spec.md`.)
3. **Write the spec.** A small JSON file. Copy the shape for your chosen chart from `references/spec.md` and fill in the real numbers, plus `title`, `takeaway`, `source`, and `unit`.
4. **Build it — this is the whole deliverable:**
   ```bash
   python3 scripts/build.py spec.json chart_motion.html
   ```
   You get one dependency-free HTML: dark-console surface, Barlow (loaded), the three-colour system, a smooth eased reveal, reduced-motion-safe, with a replay · speed · dark/light · colour-scheme control bar. The build prints `OK` (or an error telling you what to fix in the spec). It's done.

## The only rules

- **Never write the HTML / CSS / SVG / animation yourself.** Produce a spec and run `build.py` — nothing else. The script *is* the guarantee of the look and the smoothness; hand-writing is the single way to break either.
- If `build.py` errors, **fix the spec** (the message says what's wrong). Do not work around it by hand-authoring a file.
- Put the real **source and units** in the spec (honesty).
- **One spec → one chart.** Want another chart? Write another spec and build it.

That's the whole skill. There is deliberately **no chart-selection theory, no "one chart one story" rule, and no motion principles** — the script already encodes the house style and the smooth easing, so you don't have to reason about any of it. Just give it correct data and a chart name.

## Reference

- `references/spec.md` — the JSON spec format + the data shape each chart type needs. This is the only thing you *need* to read.
- `showcase/` — two house-template galleries showing the **target look** (open in a browser, not required): **Essential** (`showcase/chart-motion-atlas.html` — the chart × motion catalog, source of the engine your builds use) and the **FT Style Template** (`showcase/packages/ft.html` — the FT poster style your `"style":"ft"` builds reproduce, shown across the FT chart vocabulary). `build.py` already reproduces these styles automatically; the galleries are just so you (or the reader) can see what "on-brand" means. You still pick the chart freely — these are a reference, not a rulebook.
