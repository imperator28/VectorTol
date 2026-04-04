# VectorTol Design Specification

## Context

Mechanical engineers rely on brittle Excel spreadsheets for tolerance stack-ups. These lack visual context (causing vector sign errors) and are hard to standardize across teams. Cloud SaaS alternatives are rejected due to IP/data security policies for unreleased hardware.

VectorTol is a portable, offline-native desktop tolerance analysis tool that pairs a high-density data grid with an interactive visual canvas and intelligent decision-support features.

## Decisions

- **Approach:** Phase-sequential (Phase 1 -> 2 -> 3 -> 4), each phase shippable
- **Framework:** Tauri v2 (Rust backend + React frontend) from day one
- **Data Grid:** AG Grid Community Edition
- **Canvas:** Konva.js via react-konva
- **State Management:** Zustand
- **Precision Arithmetic:** decimal.js
- **Monte Carlo:** Rust backend (not Web Workers)
- **Tolerance Standards:** Configurable from the start (ISO 286 + custom)

## 1. Project Structure

```
vectortol/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Tauri entry, IPC command registration
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── file_io.rs       # .vtol save/load via native file dialogs
│   │   │   └── monte_carlo.rs   # Simulation engine (Phase 4)
│   │   └── engine/
│   │       ├── mod.rs
│   │       └── simulation.rs    # Monte Carlo math (Phase 4)
│   ├── Cargo.toml
│   └── tauri.conf.json          # CSP: connect-src 'none'
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── grid/                # AG Grid wrapper, column defs, cell renderers
│   │   ├── canvas/              # Konva canvas, vector tools, image layer
│   │   ├── summary/             # Live results footer (WC, RSS, Pass/Fail)
│   │   ├── targets/             # Design Intent target definition UI
│   │   ├── toolbar/             # Top toolbar (file ops, export, settings)
│   │   └── report/              # PDF report generation (Phase 3)
│   ├── engine/
│   │   ├── calculations.ts      # Centered nominal, centered TOL, contributions
│   │   ├── worstCase.ts         # Worst-case analysis
│   │   ├── rss.ts               # RSS analysis
│   │   └── decimal.ts           # decimal.js wrapper
│   ├── store/
│   │   ├── projectStore.ts      # Grid data, canvas data, metadata
│   │   ├── uiStore.ts           # Selection state, view preferences
│   │   └── settingsStore.ts     # Company standards, tolerance configs
│   ├── types/
│   │   ├── grid.ts
│   │   ├── canvas.ts
│   │   ├── project.ts           # .vtol file schema
│   │   └── standards.ts         # Tolerance configs, IT grades
│   └── utils/
│       ├── fileIO.ts            # .vtol serialize/deserialize, CSV/XLSX export
│       └── pdfExport.ts         # jsPDF report generation (Phase 3)
├── package.json
├── tsconfig.json (strict mode)
├── vite.config.ts
└── index.html
```

## 2. Data Model

### StackRow (central row model)

```typescript
interface StackRow {
  id: string;                        // UUID
  component: string;                 // Part name
  dimId: string;                     // Reference ID linking to 2D drawing
  toleranceSource: ToleranceSource;  // Dropdown category
  direction: 1 | -1;                // +/- vector direction
  nominal: Decimal;                  // Base dimension
  tolSymmetric: Decimal | null;      // +/- TOL (if symmetric)
  tolPlus: Decimal | null;           // +TOL (asymmetric override)
  tolMinus: Decimal | null;          // -TOL (asymmetric override)
  rounding: number;                  // Decimal precision (0-6)
  sigma: Decimal;                    // Standard deviation input (default 3)
}

type ToleranceSource =
  | 'machining' | 'mold' | 'material' | 'assembly'
  | 'stamping' | 'casting' | 'custom';
```

### Derived calculations (not stored, computed on-the-fly)

**Symmetric case** (tolSymmetric is set, tolPlus/tolMinus are null):
- **Centered Nominal** = `nominal * direction`
- **Centered Tolerance** = `tolSymmetric`

**Asymmetric case** (tolPlus and tolMinus are set):
- **Mean shift** = `(tolPlus + tolMinus) / 2`  (tolMinus is negative, e.g. +0.03/-0.01 -> meanShift = 0.01)
- **Centered Nominal** = `(nominal + meanShift) * direction`
- **Centered Tolerance** = `(tolPlus - tolMinus) / 2`  (always positive half-range)

**Common:**
- **% Contribution** = `(|centeredTol| / totalWcTol) * 100` — flag red if > 25%

### TargetScenario

```typescript
interface TargetScenario {
  type: 'clearance' | 'interference' | 'flush' | 'proud' | 'recess';
  minGap: Decimal | null;
  maxGap: Decimal | null;
}
```

### Results Engine

- **Gap** = sum of all centered nominals
- **WC Tolerance** = sum of |centeredTol|
- **WC Min** = Gap - WC Tolerance
- **WC Max** = Gap + WC Tolerance
- **RSS Tolerance** = sqrt(sum of centeredTol^2)
- **RSS Min** = Gap - RSS Tolerance
- **RSS Max** = Gap + RSS Tolerance
- **Pass/Fail** = evaluated against TargetScenario bounds

## 3. Visual Canvas

### Layer architecture

```
Konva Stage
├── Layer 0: Background Image (cross-section PNG/JPG)
├── Layer 1: Vector Arrows (linked to grid rows by StackRow.id)
└── Layer 2: Interaction Overlay (drawing tool, selection highlights)
```

### Vector drawing workflow

1. Activate Line Tool from toolbar
2. Click start -> drag -> click end on cross-section
3. Arrowhead rendered indicating direction
4. Auto-direction: dominant axis determines sign (Right/Up = +1, Left/Down = -1)
5. New row auto-appended to AG Grid, linked by shared `id`

### Bi-directional sync (via Zustand projectStore)

- **Canvas -> Grid:** Draw vector = create row. Delete vector = remove row.
- **Grid -> Canvas:** Select row = highlight vector cyan. Edit direction = flip arrowhead.
- **Single source of truth:** projectStore. Neither component mutates the other directly.

### Canvas interactions

- Pan & zoom (mouse wheel + drag)
- Click-select vectors (highlights + selects grid row)
- Drag vector endpoints to reposition
- Delete key removes selected vector + its grid row
- Background image transform (scale, position) stored in canvasData

## 4. Reporting & Export

### PDF Report (jsPDF + jspdf-autotable)

Layout:
1. Title block (project, revision, author, date)
2. Design Intent (target scenario type and bounds)
3. Annotated cross-section (canvas exported via `stage.toDataURL()`)
4. Full data table (jspdf-autotable)
5. Results summary (WC + RSS with color-coded Pass/Fail)

### CSV Export

Row-by-row dump of grid data including computed columns.

### XLSX Export

SheetJS workbook with formatted columns and headers.

## 5. Smart Tolerance Suggestions

### Configurable standards system

```typescript
interface ToleranceConfig {
  standards: ToleranceStandard[];
  customRules: CustomRule[];
}

interface ToleranceStandard {
  source: ToleranceSource;
  itGrade: string;                         // e.g., 'IT7'
  lookupTable: Map<DimensionRange, Decimal>; // ISO 286 lookup
  warningThreshold: Decimal;
}

interface CustomRule {
  name: string;
  source: ToleranceSource;
  dimensionRange: DimensionRange;
  tolerance: Decimal;
}

type DimensionRange = { min: number; max: number };
```

### Behavior

- On tolerance source + nominal entry: tooltip suggests baseline tolerance from configured standard
- Warning if entered tolerance is tighter than process capability threshold
- Tolerance Allocation (Goal Seek): identifies highest % contribution rows and suggests tightening based on source capability limits

## 6. Monte Carlo Simulation (Rust Backend)

### IPC interface

Frontend sends via Tauri command:
```typescript
interface MonteCarloRequest {
  rows: { centeredNominal: number; centeredTol: number; sigma: number }[];
  iterations: number;         // Default 100,000
  distribution: 'normal' | 'uniform';
  target: { minGap: number | null; maxGap: number | null };
}
```

Rust returns:
```typescript
interface MonteCarloResult {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  histogram: number[];        // Binned counts for chart
  failureRate: number;        // Fraction outside target bounds
  yieldPercent: number;       // 1 - failureRate
}
```

Rust uses `rand` + `statrs` crates for statistical sampling. f64 with proper rounding provides sufficient precision for Monte Carlo (vs decimal.js for deterministic calculations).

## 7. .vtol File Format

```typescript
interface VtolFile {
  version: 1;
  metadata: {
    projectName: string;
    author: string;
    createdAt: string;          // ISO 8601
    updatedAt: string;
    designIntent: TargetScenario;
  };
  gridData: StackRow[];          // Serialized with string decimals
  canvasData: {
    vectors: CanvasVector[];
    image: string | null;        // Base64-encoded, compressed
    imageTransform: { x: number; y: number; scale: number; rotation: number };
  };
  settings: ToleranceConfig;
}

interface CanvasVector {
  id: string;                    // Matches StackRow.id
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}
```

File I/O uses Tauri's native file dialog (`@tauri-apps/plugin-dialog`) for save/open.

## 8. Security & Portability

- **CSP:** `connect-src 'none'` in tauri.conf.json — no outbound network requests
- **Windows:** Portable .exe (no installer, runs in user-space)
- **macOS:** Standard .dmg with drag-to-Applications workflow
- **No telemetry, no analytics, no server communication**

## 9. Key Dependencies

| Package | Purpose |
|---------|---------|
| `@tauri-apps/api` v2 | Tauri frontend bindings |
| `@tauri-apps/plugin-dialog` | Native file dialogs |
| `ag-grid-react` + `ag-grid-community` | Data grid |
| `react-konva` + `konva` | 2D canvas engine |
| `decimal.js` | Precision arithmetic |
| `zustand` | State management |
| `jspdf` + `jspdf-autotable` | PDF export |
| `xlsx` (SheetJS) | Excel export |
| `uuid` | Row ID generation |
| **Rust crates** | |
| `tauri` v2 | App framework |
| `serde` + `serde_json` | Serialization |
| `rand` + `statrs` | Monte Carlo simulation |

## 10. Phase Breakdown

### Phase 1: Portable Calculator (MVP)
- Tauri + React + TypeScript project scaffold
- AG Grid with all column types (component, dimId, toleranceSource, direction, nominal, tolerances, rounding, sigma)
- Keyboard navigation (Tab, Enter, Arrows) and bulk Copy/Paste
- Math engine (centered nominal, centered TOL, % contribution) using decimal.js
- Design Intent target definition (clearance, interference, flush, proud, recess)
- Live Results footer (Gap, WC min/max, RSS min/max, Pass/Fail)
- .vtol file save/load via native file dialogs
- CSV export
- Zustand stores (project, UI, settings)

### Phase 2: Visual Integration
- Canvas pane with Konva.js (split-pane layout with grid)
- Background image import (drag-and-drop PNG/JPG)
- Vector drawing tool with arrowheads
- Auto-direction detection from arrow orientation
- Bi-directional sync (canvas <-> grid via Zustand)
- Vector selection, repositioning, deletion
- Pan/zoom on canvas

### Phase 3: Reporting Engine
- One-click PDF generation (jsPDF + jspdf-autotable)
- Canvas-to-image export for PDF embedding
- XLSX export (SheetJS)
- Report layout: title block, design intent, annotated image, data table, results summary

### Phase 4: Intelligent ME Support
- Configurable tolerance standards system (ISO 286 IT grades + custom rules)
- Smart tooltip suggestions on tolerance source + nominal entry
- Tight tolerance warnings
- Tolerance Allocation / Goal Seek
- Monte Carlo simulation via Rust backend (Tauri IPC)
- Histogram visualization of Monte Carlo results
- Failure rate / yield percentage display
