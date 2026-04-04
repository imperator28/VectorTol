# VectorTol

Portable, offline-native tolerance stack-up analysis tool for mechanical engineers. Built with Tauri v2, React 18, and TypeScript.

## Why

Mechanical engineers in high-precision consumer electronics rely on brittle Excel spreadsheets for critical tolerance stack-ups. These lack visual context (leading to vector sign errors) and are difficult to standardize. Cloud SaaS alternatives are rejected due to IP and data security policies. VectorTol solves this as a zero-install, fully offline desktop application.

## Features

### Phase 1 (Current) — Portable Calculator
- **High-density data grid** (AG Grid) with Excel-like keyboard navigation and bulk copy/paste
- **Precision arithmetic** via decimal.js — no floating-point rounding errors
- **Worst-Case (WC) analysis** — total tolerance, absolute min/max
- **Root Sum Square (RSS) analysis** — statistical tolerance, min/max
- **Design Intent validation** — Clearance, Interference, Flush, Proud, Recess targets with live Pass/Fail
- **% Contribution** highlighting — flags primary offenders (>25%) in red
- **Asymmetric tolerance support** — proper mean-shift calculations
- **.vtol project files** — single self-contained JSON files for easy sharing
- **CSV export**

### Planned
- **Phase 2:** Visual canvas with cross-section image import, vector drawing, bi-directional grid sync
- **Phase 3:** One-click PDF reports with annotated diagrams
- **Phase 4:** Smart tolerance suggestions (ISO 286), tolerance allocation, Monte Carlo simulation (Rust backend)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript (strict) |
| Data grid | AG Grid Community |
| State management | Zustand |
| Precision math | decimal.js |
| Canvas (Phase 2) | Konva.js |
| PDF export (Phase 3) | jsPDF + jspdf-autotable |
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
│   ├── components/         # UI components (grid, toolbar, targets, summary)
│   ├── engine/             # Math engine (calculations, worstCase, rss)
│   ├── store/              # Zustand stores (project, UI, settings)
│   ├── types/              # TypeScript interfaces
│   └── utils/              # File I/O, CSV export
├── src-tauri/              # Rust backend
│   ├── src/commands/       # Tauri IPC commands
│   └── tauri.conf.json     # App config, CSP, window settings
├── tests/                  # Vitest unit tests
└── docs/                   # Design spec and implementation plans
```

## File Format

Projects are saved as `.vtol` files — self-contained JSON with all grid data, canvas vectors, embedded images (Phase 2), and settings in a single shareable file.

## Security

- **Fully offline** — strict Content Security Policy blocks all external network requests
- **Zero telemetry** — no analytics, no server communication
- **Local-only execution** — all data stays on the engineer's machine
- **No installer required** — portable executable runs in user-space

## License

Proprietary. All rights reserved.
