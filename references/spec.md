# Spec format — the JSON you write, the only thing the script needs

Write one JSON file. The script (`scripts/build.py`) turns it into the animated HTML. Every chart shares the **common fields**; each chart type adds its own **data field**. Pick a chart, copy its block below, fill in real values.

## Common fields (every spec)

```jsonc
{
  "chart": "kpi",                  // one of: kpi bar column diverging line multiline area stacked scatter lollipop dumbbell
  "title": "Apple share",          // short headline above the chart
  "takeaway": "Apple hit 21% global share, edging Samsung to #1.",  // one-line subtitle
  "source": "Counterpoint Research — Q1 2026",   // publisher + period (required: honesty)
  "source_url": "https://…",       // optional
  "unit": "%",                     // optional, appended/shown with values
  "value_format": "0",             // optional: "0" int · "+0" show sign · "0.0" 1 dp · "0%" percent
  "duration": 1400,                // optional ms; default 1400 (a quick, smooth reveal)
  "style": "essential",            // optional: "essential" (default, dark console) or "ft" (light FT poster)
  "accent": "#1198ab",             // optional, FT style only: the single house accent hue (an FT colour). default FT teal
  "log": true                      // optional: log10 value axis for bar/column/lollipop (for 4–5 orders of magnitude)
}
```

You never set colours, fonts, sizes, easing, or layout — the script owns all of that.

### Colour — uniform, no single mark singled out

The script no longer singles out one mark. Colour is applied honestly and evenly:

- **Single-series charts** (bar, column, lollipop, scatter, area, kpi) — **every mark shares one house colour** (the accent: amber in essential, the `accent` hue under FT). No greyed "context", no one-mark highlight.
- **Multi-series charts** (multiline, stacked, and any grouped form) — **each series/segment gets a distinct colour from a small categorical house palette** (amber, teal, red, blue, purple, …), assigned by index. All equal — none highlighted, none greyed — so the series stay distinguishable.
- **`diverging`** — coloured **by sign** (value < 0 vs > 0 → two house colours, e.g. red/teal). This is structural to a diverging chart, not emphasis.
- Optionally, a row/series may take an honest **`"role"`** for semantic colour: `"up"`/`"good"` → teal-green, `"down"`/`"bad"` → red (e.g. a loss vs a gain). With no role, it takes the uniform house colour (never grey).

### Style & scale (optional)

- **`"style"`** — `"essential"` (default): dark console, Barlow, three-colour, full control bar (replay · speed · dark/light · scheme · code · freeze). `"ft"`: white FT poster, Source Serif headline + Inter body, one FT-hue accent + warm-grey context, slim editorial bar (replay · speed · freeze).
- **`"accent"`** (FT only) — a hex hue for the single house accent (single-series marks and the first multi-series colour); FT category colours work well: gold `#cda32b`, teal `#1198ab`, orange `#de5a2a`, blue `#0f5499`, purple `#9c4a92`, green `#479e4f`. Default `#1198ab`.
- **`"log": true`** — log10 scale on the value axis of `bar`/`column`/`lollipop`, with power-of-ten gridlines; value labels still show the real numbers. Use it whenever values span several orders of magnitude (e.g. 450 vs 2). All values must be > 0.

## Data field by chart type

**Rows charts** — `bar` (horizontal), `column` (vertical), `diverging` (values straddle 0), `lollipop`:
```jsonc
"rows": [
  {"label": "Apple",   "value": 21},
  {"label": "Samsung", "value": 20},
  {"label": "Xiaomi",  "value": 13}
]
```
Every bar shares the one house colour. Optional per-row `"role"` for honest semantic colour: `"up"`/`"good"` (teal) · `"down"`/`"bad"` (red); with no role a bar takes the uniform house colour. For `diverging`, the sign of `value` drives left/right + the red/teal colour.

**`kpi`** — one big number that counts up:
```jsonc
"value": 21,
"kpi_label": "global smartphone share",
"sparkline": [12, 14, 15, 18, 21]    // optional tiny trend under the number
```

**`line` / `area`** — one series over an ordered x (time):
```jsonc
"x_label": "Year", "y_label": "Tt",
"series": [ {"label": "Human-made mass", "points": [[1900,0.03],[1940,0.1],[2020,1.1]]} ]
```
Points are `[x, y]`. The line draws on smoothly; the end gets a direct value label.

**`multiline`** — 2–4 series, direct end-labels (never a legend):
```jsonc
"x_label": "Year", "y_label": "Tt",
"series": [
  {"label": "Human-made", "points": [[1900,0.03],[2020,1.1]]},
  {"label": "Living biomass", "points": [[1900,1.1],[2020,1.0]]}
]
// each series gets its own distinct house colour (by index) — none singled out
```

**`scatter`** — relationship between two quantities (optional 3rd = bubble size):
```jsonc
"x_label": "GDP/capita", "y_label": "CO2/capita",
"points": [ {"label": "US", "x": 65000, "y": 15, "size": 330},
            {"label": "China", "x": 12000, "y": 7, "size": 1400} ]
```

**`stacked`** — parts of a whole across categories (the pie replacement):
```jsonc
"categories": ["2010", "2015", "2020"],
"series": [ {"label": "Self-serve", "values": [20, 38, 52]},
            {"label": "Sales-led",  "values": [80, 62, 48]} ]
// each series is a distinct house colour (by index) — none singled out
```

**`dumbbell`** — before → after for each row (time runs left→right):
```jsonc
"start_label": "1850", "end_label": "Today",
"rows": [ {"label": "Wild mammals", "start": 80000, "end": 30000},
          {"label": "Livestock",    "start": 20000, "end": 63000} ]
```

## That's it

- Numbers only — no formatting, no `$`/`%` inside values (use `unit` / `value_format`).
- If a value is missing or a label is empty, the script will tell you; fix the data.
- Unsure which chart? Pick the closest fit and build it — the script makes any of them look right. Do **not** hand-author a chart type that isn't listed; pick the nearest listed one.
