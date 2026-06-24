# Data2Motion - AI Data Animation Skill

Data -> chart -> motion -> standalone HTML.

[README preview](showcase/index.html) · [Chart motion atlas](showcase/chart-motion-atlas.html) · [Spec format](references/spec.md) · [Skill instructions](SKILL.md) · Reference sibling: [Pixel2Motion](https://github.com/nolangz/pixel2motion)

This repository ships the Lite engine for Data2Motion: a script-driven Codex and Claude skill for turning small datasets into polished animated chart pages. It takes one JSON spec, chooses from a fixed chart vocabulary, and exports a dependency-free HTML file with the Data2Motion house style, replay controls, reduced-motion support, and deterministic QA hooks.

中文：Data2Motion 的 Lite 版本是一个把数据变成动态图表 HTML 的 AI skill。你只需要给出数据和图表类型，脚本负责版式、颜色、动效、控制条和可复现渲染，适合快速把一个数字、趋势、排名、对比或占比做成可上线的 data story。

Recommended review order: the README preview page, the chart motion atlas, the example outputs, and then the spec format.

## Data-to-Motion Gallery

Open the local preview page at `showcase/index.html` to browse the launch-style README page, built examples, and visual templates.

| Motion output | What it demonstrates |
|---|---|
| [`examples/kpi_arr.html`](examples/kpi_arr.html) | One big KPI number with a small supporting trend. |
| [`examples/multiline_biomass.html`](examples/multiline_biomass.html) | Multi-line comparison with direct labels and smooth draw-on motion. |
| [`showcase/chart-motion-atlas.html`](showcase/chart-motion-atlas.html) | Essential dark-console chart and motion vocabulary. |
| [`showcase/packages/ft.html`](showcase/packages/ft.html) | Light editorial FT-style template for poster-like data stories. |

## Why Lite

A text-only model cannot reliably inspect its own visual output. Data2Motion Lite moves the look and motion into `scripts/build.py`, so the agent writes only a small JSON spec and the script owns the rendering.

The result is intentionally constrained:

- One JSON file in, one standalone HTML file out.
- No hand-authored HTML, CSS, SVG, or animation per chart.
- A fixed chart vocabulary: `kpi`, `bar`, `column`, `diverging`, `line`, `multiline`, `area`, `stacked`, `scatter`, `lollipop`, `dumbbell`.
- Two launch-ready styles: `essential` dark console and `ft` light editorial.
- Built-in replay, speed, freeze, `?static=1`, and `?t=<ms>` hooks.

## Deliverables

- `chart_motion.html`: standalone animated chart page generated from a JSON spec.
- `spec.json`: the data, chart type, title, takeaway, source, unit, duration, style, and optional scale settings.
- `showcase/index.html`: README-style launch page for presenting the project.
- `showcase/chart-motion-atlas.html`: Essential house-style reference.
- `showcase/packages/ft.html`: FT-style reference template.
- `references/spec.md`: the contract every input spec follows.

## Workflow

1. Read `references/spec.md` and pick the closest chart type.
2. Write a compact JSON spec with real numbers and a source.
3. Build the output:

```bash
python3 scripts/build.py examples/kpi_arr.json chart_motion.html
```

4. Open `chart_motion.html` in a browser.
5. Use `?static=1` for the final frame or `?t=<ms>` for deterministic frame checks.

## Example Spec

```json
{
  "chart": "kpi",
  "title": "ARR reached $12.4M",
  "takeaway": "ARR climbed 42% year over year after the enterprise launch.",
  "source": "Company dashboard - FY2026",
  "unit": "M",
  "value_format": "0.0",
  "value": 12.4,
  "kpi_label": "annual recurring revenue",
  "sparkline": [7.1, 8.3, 9.6, 10.8, 12.4],
  "duration": 1400,
  "style": "essential"
}
```

## How It Differs From Full Data2Motion

| | Data2Motion full | Data2Motion Lite |
|---|---|---|
| Target model | Strong multimodal agent | Any text-only agent |
| Chart selection | Guided by editorial and perceptual rules | User or agent picks from a fixed list |
| Motion design | Brief-led choreography and visual QA | Encoded in the generator |
| Output | Full data-motion package with evidence | One spec and one HTML output |
| Best use | High-stakes custom data story | Fast, repeatable animated chart |

## Requirements

- Python 3.10+
- A modern browser for viewing generated HTML
- Optional: Chrome or Playwright if you want deterministic screenshots from `?static=1` and `?t=<ms>`

No runtime JavaScript dependencies are required in the generated chart HTML.

## Repository Layout

- `SKILL.md`: Codex-facing instructions for using this skill.
- `scripts/build.py`: deterministic chart-to-HTML generator.
- `references/spec.md`: accepted JSON schema and chart examples.
- `examples/`: ready-to-run input specs and generated outputs.
- `showcase/`: README preview, chart-motion atlas, FT-style template, and publishable assets.

## Publishing Checklist

- Confirm `README.md`, `SKILL.md`, `references/`, `scripts/`, `examples/`, and `showcase/` are committed.
- Keep caches, local virtual environments, generated temp frames, and dependency directories out of git.
- Enable GitHub Pages from the repository root or move `showcase/` to `docs/` before publishing from `/docs`.
- After creating the GitHub repository, add the remote and push:

```bash
git remote add origin git@github.com:<owner>/data2motion-lite.git
git branch -M main
git push -u origin main
```

## More From Nolanlai

[nolanlai.com](https://www.nolanlai.com)

<img src="showcase/assets/wechat-qr.jpg" width="360" alt="vibe-creators group QR code">

扫码进群交流 vibe-creators群  
Scan the QR code to join the vibe-creators group.

Built with Codex.
