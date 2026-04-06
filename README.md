# VectorTol

**Professional tolerance stack-up analysis for mechanical and product design engineers — fully offline, zero install.**

VectorTol replaces brittle Excel spreadsheets and expensive cloud tools with a fast, visual desktop application that keeps your IP on your machine.

---

## Why engineers choose VectorTol

| Pain point | VectorTol solution |
|---|---|
| Excel errors from wrong +/− signs | Visual arrow canvas enforces direction automatically |
| No statistical analysis in spreadsheets | Live RSS analysis + Monte Carlo simulation built in |
| Cloud tools rejected by IP security policy | Fully offline, zero telemetry, no server connection |
| Hard to share or standardize | Single `.vtol` file contains everything — canvas, data, settings |
| Tolerances pass on paper but fail in production | Yield % and failure rate (ppm) from RSS and Monte Carlo |

---

## Core workflow

```
1. Import a cross-section image (PNG/JPG) into the canvas
2. Draw arrows directly on the image — each arrow = one stack-up dimension
3. Fill in tolerances in the grid (or let ISO 286 auto-fill from your process)
4. Set your design intent (clearance, interference, flush, etc.) and bounds
5. Read live WC and RSS results — PASS / FAIL, yield %, failure rate
6. Run Monte Carlo for production-realistic simulation
7. If failing: use Tolerance Allocation to redistribute tolerances across parts
8. If nominal gap is wrong: use Nominal Advisor to find which dimensions to adjust
9. Export a one-click PDF report or Excel workbook for design review
```

---

## Feature overview

### Visual Stack-up Canvas
- Import a cross-section drawing or photo as background (PNG/JPG)
- **Draw tolerance vectors** (arrows) directly on the image with click-drag
- Each arrow auto-detects direction: Right/Up = +1, Left/Down = −1
- Bi-directional sync: drawing an arrow creates a grid row; deleting either removes both
- Pan and zoom (scroll wheel, spacebar, middle mouse — CAD-style controls)
- Color-code vectors by part; adjust line width per vector
- Undo/redo with 50-step history

### Precision Analysis Grid
- High-density data grid with Excel-like keyboard navigation and paste
- Drag-to-reorder rows to reorganize the stack-up
- Asymmetric tolerance support (e.g. +0.05/−0.02) with proper mean-shift
- **ISO 286 tolerance auto-fill** — select the manufacturing process (machining, grinding, milling, boring, lapping, etc.) and the IT-grade tolerance is auto-calculated from the nominal dimension
- % Contribution column — highlights the primary offenders (>25%) in red
- Live Worst-Case and RSS recalculation as you type

### Analysis Results
- **Worst-Case (WC)**: deterministic maximum/minimum gap assuming all parts at their tolerance limits simultaneously
- **RSS (Root Sum Square)**: statistical gap — assumes parts follow normal distributions; more realistic for production
- **Monte Carlo simulation**: 10K–1M iterations with configurable sample count; histogram with pass/fail coloring, σ-markers, yield %, and failure rate (ppm or %)
- Design intent validation: Clearance, Interference, Flush, Proud, Recess, Custom — live PASS/FAIL badge

### Smart Advisors
- **Tolerance Allocation** — when the design fails, suggests how to redistribute tolerances:
  - *Proportional*: scale all tolerances by the same factor
  - *Top Contributors*: tighten only the rows contributing >25% to the stack
  - *Grade Step*: step up/down one ISO IT grade per part
  - *Asymmetric Shift*: shift asymmetric tolerances toward nominal to recover gap
  - *Relaxation*: loosen over-toleranced parts while maintaining pass
- **Nominal Advisor** — when tolerances alone can't fix the gap, suggests which nominal dimensions to change:
  - Lock individual dimensions that can't move (tooling constraints, material stock)
  - Three strategies: Closing-link focus, Equal-split, Weighted by adjustability score
  - Per-row or apply-all

### Reporting & Export
- **PDF** — one-click landscape A4 report: title block, annotated canvas diagram, full data table with % contribution, WC and RSS results with color-coded PASS/FAIL
- **Excel (.xlsx)** — all grid columns plus analysis results section
- **CSV** — raw stack-up data for further processing

### Professional UI
- Three themes: Light, Dark, and Swiss International (high-contrast)
- Resizable panels — workspace (canvas + grid) left, all results and insights right
- Collapsible sections — hide panels you're not using to focus on what matters
- Rich tooltip descriptions on every button
- Interactive tutorial for new users (auto-starts on first launch, re-launchable via ? button)
- Full keyboard shortcut set for efficient operation

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `V` | Select / move vectors |
| `D` | Draw vector tool |
| `L` | Toggle direction lock (H/V only) |
| `S` | Toggle magnetic snap to endpoints |
| `Shift` (hold while drawing) | Lock stroke to H or V |
| `Space` (hold) | Temporary pan mode |
| Middle mouse (hold) | Pan — CAD-style |
| Scroll wheel | Zoom in / out |
| `Delete` / `Backspace` | Remove selected vector + row |
| `Escape` | Cancel draw / deselect |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `?` | Open keyboard shortcuts reference |

---

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) (stable toolchain)

### Run (desktop)
```bash
npm install
npm run tauri dev
```

### Run in browser (no Tauri, file I/O via browser download/picker)
```bash
npm run dev
```

### Build for production
```bash
npm run tauri build
```
Produces a portable `.exe` (Windows) or `.dmg` (macOS) in `src-tauri/target/release/bundle/`.

---

## Project file format

Projects save as `.vtol` files — self-contained JSON including:
- All stack-up rows with tolerances and metadata
- Canvas vectors (arrow positions, colors, widths)
- Background image (base64-embedded — no external dependencies)
- Design intent settings
- Project name and author

Files saved in any version of VectorTol load correctly in later versions.

---

## Security and privacy

- **Fully offline** — strict Content Security Policy blocks all external network requests
- **Zero telemetry** — no analytics, no crash reporting, no server communication ever
- **Local-only** — all data stays on the engineer's machine; safe for proprietary designs
- **No installer** — portable executable runs directly in user-space

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript (strict) |
| Data grid | AG Grid Community |
| Canvas | Konva.js (react-konva) |
| State | Zustand |
| Precision math | decimal.js |
| PDF | jsPDF + jspdf-autotable |
| Excel | SheetJS (xlsx) |
| Themes | CSS Custom Properties |

---

## License

Proprietary. All rights reserved.
