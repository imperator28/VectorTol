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
- **Design Intent validation** — Clearance, Interference, Flush, Proud, Recess targets with live Pass/Fail
- **% Contribution** highlighting — flags primary offenders (>25%) in red
- **Asymmetric tolerance support** — proper mean-shift calculations
- **.vtol project files** — self-contained JSON files for easy sharing
- **CSV export**

### Phase 2 — Visual Canvas ✅
- **Split-pane layout** — resizable divider between canvas and grid
- **Background image import** — drag-and-drop or button (PNG/JPG) with opacity overlay
- **Vector drawing tool** — click-drag to draw arrows directly on cross-section images
- **Auto-direction detection** — dominant axis determines +/- sign (Right/Up = +1, Left/Down = −1)
- **Bi-directional sync** — drawing a vector creates a grid row; deleting either removes both
- **Viewport-invariant sizing** — arrow thickness and labels stay constant regardless of zoom or image resolution
- **Label scaling** — text caption scales proportionally with stroke width
- **Color customization** — macOS system color palette (15 colors) + custom color picker for arrow color and highlight color
- **Adjustable line width** — 1–5px per vector, changeable after drawing
- **Undo/redo** — 50-step history for all operations (Ctrl+Z / Ctrl+Y)
- **Pan & zoom** — scroll wheel zoom, left-drag pan, spacebar pan, middle mouse button pan (CAD-style)

### Phase 3 — Reporting Engine ✅
- **PDF export** — one-click landscape A4 report: title block (project, author, date), annotated canvas diagram, full data table with % contribution flagged in red (>25%), WC and RSS results with color-coded PASS/FAIL, failure rate and yield
- **XLSX export** — Excel workbook with all grid columns (including Ctr Nominal, Ctr TOL, % Contrib) plus WC/RSS results section on the same sheet
- **CSV export** — raw stack-up data
- **Direction lock** — constrain newly drawn vectors to horizontal or vertical only (L key / ⊥ Lock button)
- **Magnetic snap** — arrow endpoints auto-snap to nearest existing vector endpoint within 16px (S key / 🧲 Snap button); snap takes priority over direction lock
- **Editable project metadata** — inline project name and author fields in the toolbar
- **Browser-compatible save/open** — falls back to browser download / file picker when running outside Tauri

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

### Planned
- **Phase 4:** Smart tolerance suggestions (ISO 286 IT grades), tolerance allocation / goal seek, Monte Carlo simulation (Rust backend)

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
| Monte Carlo (Phase 4) | Rust backend via Tauri IPC |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) (stable)

### Install & Run

```bash
npm install
npm run tauri dev
```

### Run Tests

```bash
npm run test
```

### Build for Production

```bash
npm run tauri build
```

This produces a portable `.exe` (Windows) or `.dmg` (macOS) in `src-tauri/target/release/bundle/`.

## Project Structure

```
├── src/                    # React frontend
│   ├── components/
│   │   ├── canvas/         # Konva canvas, vector tools, color picker
│   │   ├── grid/           # AG Grid wrapper, column defs, cell renderers
│   │   ├── summary/        # Live results footer (WC, RSS, Pass/Fail)
│   │   ├── targets/        # Design Intent panel
│   │   └── toolbar/        # Top toolbar (file ops, export)
│   ├── engine/             # Math engine (calculations, worstCase, rss, decimal)
│   ├── store/              # Zustand stores (project + undo/redo, UI, settings)
│   ├── types/              # TypeScript interfaces (grid, canvas, project)
│   └── utils/              # File I/O, CSV/PDF/XLSX export, Konva stage ref
├── src-tauri/              # Rust backend
│   ├── src/commands/       # Tauri IPC commands (file read/write)
│   └── tauri.conf.json     # App config, CSP, window settings
├── tests/                  # Vitest unit tests
└── docs/                   # Design spec and implementation plans
```

## File Format

Projects are saved as `.vtol` files — self-contained JSON with grid data, canvas vectors, embedded background images (base64), image transforms, and settings in a single shareable file. Files saved before Phase 2 load correctly with an empty canvas.

## Security

- **Fully offline** — strict Content Security Policy blocks all external network requests
- **Zero telemetry** — no analytics, no server communication
- **Local-only execution** — all data stays on the engineer's machine
- **No installer required** — portable executable runs in user-space

## License

Proprietary. All rights reserved.
