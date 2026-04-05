# VectorTol

Portable, offline-native tolerance stack-up analysis tool for mechanical engineers. Built with Tauri v2, React 18, and TypeScript.

## Why

Mechanical engineers in high-precision consumer electronics rely on brittle Excel spreadsheets for critical tolerance stack-ups. These lack visual context (leading to vector sign errors) and are difficult to standardize. Cloud SaaS alternatives are rejected due to IP and data security policies. VectorTol solves this as a zero-install, fully offline desktop application.

## Features

### Phase 1 — Portable Calculator ✅
- **High-density data grid** (AG Grid) with Excel-like keyboard navigation and bulk copy/paste
- **Row drag-to-reorder** — drag handle in the `#` column to reorganize the stack-up order
- **Precision arithmetic** via decimal.js — no floating-point rounding errors
- **Worst-Case (WC) analysis** — total tolerance, absolute min/max
- **Root Sum Square (RSS) analysis** — statistical tolerance, min/max, failure rate (ppm/%)
- **Design Intent validation** — Clearance, Interference, Flush, Proud, Recess, Custom targets with live Pass/Fail
- **% Contribution** highlighting — flags primary offenders (>25%) in red
- **Asymmetric tolerance support** — proper mean-shift calculations
- **.vtol project files** — self-contained JSON files for easy sharing
- **CSV export**

### Phase 2 — Visual Canvas ✅
- **Split-pane layout** — resizable canvas and grid workspace
- **Background image import** — drag-and-drop or button (PNG/JPG) with opacity overlay
- **Vector drawing tool** — click-drag to draw arrows directly on cross-section images
- **Auto-direction detection** — dominant axis determines +/- sign (Right/Up = +1, Left/Down = −1)
- **Bi-directional sync** — drawing a vector creates a grid row; deleting either removes both
- **Viewport-invariant sizing** — arrow thickness and labels stay constant regardless of zoom or image resolution
- **Color customization** — 15-color palette + custom color picker for arrow color and highlight color
- **Adjustable line width** — 1–5px per vector, changeable after drawing
- **Undo/redo** — 50-step history for all operations (Ctrl+Z / Ctrl+Y)
- **Pan & zoom** — scroll wheel zoom, left-drag pan, spacebar pan, middle mouse button pan (CAD-style)

### Phase 3 — Reporting Engine ✅
- **PDF export** — one-click landscape A4 report: title block, annotated canvas diagram, full data table with % contribution, WC and RSS results with color-coded PASS/FAIL
- **XLSX export** — Excel workbook with all grid columns plus WC/RSS results section
- **CSV export** — raw stack-up data
- **Direction lock** — constrain newly drawn vectors to horizontal or vertical only (L key)
- **Magnetic snap** — arrow endpoints auto-snap to nearest existing vector endpoint within 16px (S key)
- **Editable project metadata** — inline project name and author fields in the toolbar

### Phase 4 — Smart Analysis & Professional UI ✅
- **ISO 286 Tolerance Standards** — Tolerance Source column auto-fills ±TOL from IT grades for machining, turning, grinding, milling, reaming, boring, lapping, honing
- **Tolerance Allocation (Goal Seek)** — 5 strategies: Proportional, Top Contributors, Grade Step, Asymmetric Shift, Relaxation. Apply per-row or all at once
- **Nominal Adjustment Advisor** — suggests which nominal dimensions to change when gap fails; 3 strategies with per-row lock/unlock; Closing-link, Equal-split, Weighted by adjustability
- **Monte Carlo Simulation** — 10K–1M iterations, histogram with pass/fail colouring, σ-labels, yield % and failure rate
- **Direction toggle** — single-click pill toggles +/− in the grid (no dropdown)
- **Multi-theme UI** — Light, Dark, and Swiss International themes, cycling via toolbar button; persists to localStorage
- **Flat icon system** — 25 Lucide-inspired SVG icons throughout the UI
- **Two-panel layout** — Workspace (canvas + grid) on the left; Design Intent + Analysis Results + Advisors on the right
- **Color picker portal** — picker renders above the canvas toolbar, escaping overflow clipping

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| D | Draw vector tool |
| L | Toggle direction lock (H/V only) |
| S | Toggle magnetic snap |
| Space (hold) | Temporary pan |
| Middle mouse (hold) | Pan — CAD-style |
| Scroll wheel | Zoom in/out |
| Delete / Backspace | Remove selected vector + row |
| Escape | Cancel draw / deselect |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar: New · Open · Save │ +Row -Row │ PDF XLSX CSV │ meta 🌙│
├──────────────────────────────────┬──────────────────────────────┤
│ CANVAS ▴                         │ DESIGN INTENT                │
│  ┌─ canvas toolbar ────────────┐ │  Type: Clearance ▾           │
│  │ Undo Redo │ Select Draw │…  │ │  Min Gap: 0.05               │
│  └─────────────────────────────┘ ├──────────────────────────────┤
│  ┌─ Konva canvas ──────────────┐ │ ANALYSIS RESULTS             │
│  │   (vectors + image)         │ │  Gap │ WC PASS │ RSS PASS     │
│  └─────────────────────────────┘ │  RSS Yield: 100.00%          │
├──────────────────────────────────│  [distribution plot]         │
│ STACK-UP                         │  [MC histogram]              │
│  ┌─ AG Grid ───────────────────┐ ├──────────────────────────────┤
│  │ # │ Part │ Tol │ +/- │ … │  │ TOLERANCE ALLOCATION         │
│  │ · │ …    │     │     │   │  │  ✓ Design intent met         │
│  └─────────────────────────────┘ │  [strategy cards]            │
│                                  ├──────────────────────────────┤
│                                  │ NOMINAL ADVISOR              │
│                                  │  [strategy cards]            │
└──────────────────────────────────┴──────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript (strict) |
| Data grid | AG Grid Community |
| Canvas | Konva.js (react-konva) |
| State management | Zustand |
| Precision math | decimal.js |
| PDF export | jsPDF + jspdf-autotable |
| XLSX export | SheetJS (xlsx) |
| Theming | CSS Custom Properties (3 themes) |

## Themes

| Theme | Trigger | Character |
|-------|---------|-----------|
| **Light** | 🌙 | Slate/indigo, soft shadows, rounded corners |
| **Dark** | ⬡ | Deep navy, lighter accents |
| **Swiss International** | ☀ | Black/white + Swiss Red #FF3000, zero radius, grid texture |

Click the icon button at the top-right of the toolbar to cycle themes. Preference persists across sessions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) (stable)

### Install & Run

```bash
npm install
npm run tauri dev
```

### Run in Browser (no Tauri)

```bash
npm run dev
```

File save/open falls back to browser download / file picker.

### Run Tests

```bash
npm run test
```

### Build for Production

```bash
npm run tauri build
```

Produces a portable `.exe` (Windows) or `.dmg` (macOS) in `src-tauri/target/release/bundle/`.

## Project Structure

```
├── src/                    # React frontend
│   ├── components/
│   │   ├── canvas/         # Konva canvas, vector tools, color picker (portal)
│   │   ├── grid/           # AG Grid wrapper, column defs, cell renderers
│   │   ├── summary/        # Analysis results, distribution plot, Monte Carlo
│   │   ├── targets/        # Design Intent, Goal Seek, Nominal Advisor panels
│   │   ├── toolbar/        # Top toolbar (file ops, export, theme)
│   │   └── ui/             # Icon component (25 SVG icons)
│   ├── engine/             # Math engine (WC, RSS, Monte Carlo, standards, decimal)
│   ├── store/              # Zustand stores (project, UI, settings, theme)
│   ├── themes.css          # CSS custom property tokens (light / dark / swiss)
│   ├── types/              # TypeScript interfaces (grid, canvas, project)
│   └── utils/              # File I/O, CSV/PDF/XLSX export, Konva stage ref
├── src-tauri/              # Rust backend
│   ├── src/commands/       # Tauri IPC commands (file read/write)
│   └── tauri.conf.json     # App config, CSP, window settings
├── tests/                  # Vitest unit tests
└── docs/                   # Design spec and implementation plans
```

## File Format

Projects are saved as `.vtol` files — self-contained JSON with grid data, canvas vectors, embedded background images (base64), image transforms, and settings. Files saved in earlier phases load correctly in later versions.

## Security

- **Fully offline** — strict Content Security Policy blocks all external network requests
- **Zero telemetry** — no analytics, no server communication
- **Local-only execution** — all data stays on the engineer's machine
- **No installer required** — portable executable runs in user-space

## License

Proprietary. All rights reserved.
