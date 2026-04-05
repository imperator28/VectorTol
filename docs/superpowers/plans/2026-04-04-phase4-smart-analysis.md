# Phase 4 — Smart Analysis, UI Redesign & Theme System

**Date:** 2026-04-04
**Status:** ✅ Complete

---

## Objective

Elevate VectorTol from a functional calculator to a professional engineering tool with intelligent analysis advisors, industry-standard tolerance data, and a polished multi-theme UI suited for daily professional use.

---

## Features Delivered

### 4.1 ISO 286 Tolerance Standards & Tolerance Source Integration
- **IT grade table** — machining, turning, grinding, milling, reaming, boring, lapping, honing grades (IT6–IT14 per size range)
- **Tolerance Source column** in the grid — select from standard processes; auto-populates `±TOL` from ISO 286 IT grade for the nominal dimension
- **Custom rules support** — user-configurable overrides via `settingsStore`

### 4.2 Tolerance Allocation / Goal Seek
Five allocation strategies surfaced in the **Tolerance Allocation** panel in the right insights column:

| Strategy | Description |
|---|---|
| Proportional | Scale all tolerances by the same factor to meet budget |
| Top Contributors | Tighten only the rows contributing >25% to the stack |
| Grade Step | Step up/down one ISO IT grade per part |
| Asymmetric Shift | Shift asymmetric tolerances toward nominal to recover gap |
| Relaxation | Loosen over-toleranced parts while maintaining pass |

Each strategy shows WC tolerance, pass/fail badge, and a per-row change table with tighten/loosen colour coding. Apply individual rows or apply all at once.

### 4.3 Nominal Adjustment Advisor
When nominal dimensions cause a gap failure (even with tight tolerances), the **Nominal Advisor** suggests which dimensions to change:

- **Lock/unlock** individual rows from adjustment
- **Three strategies**: Closing-link focus, Equal-split, Weighted by adjustability score (star rating per part)
- Shows Δ% per part with colour-coded positive/negative changes
- Apply individual or apply all

### 4.4 Monte Carlo Simulation
Full in-browser Monte Carlo simulation (10K–1M iterations):

- **Histogram plot** — bins coloured green (pass) / red (fail) based on design intent bounds
- **σ labels** — μ, ±1σ, ±2σ, ±3σ reference lines
- **Key stats** — mean, std dev, yield %, failure rate (ppm or %)
- **Configurable iterations** — 10K / 50K / 100K / 500K / 1M
- Elapsed time display

### 4.5 Direction Toggle
Replaced the +/− direction dropdown with a **single-click pill toggle** in the grid. Click to flip between + and −. Uses `onCellClicked` with `valueFormatter` + `cellStyle` for full AG Grid React compatibility.

### 4.6 Multi-Theme UI System

Three themes, cycleable via the toolbar icon button (light → dark → Swiss → light):

| Theme | Character |
|---|---|
| **Light** | Slate/indigo, soft shadows, rounded corners, modern SaaS |
| **Dark** | Deep navy, lighter indigo accents, dark-mode optimised |
| **Swiss International** | Pure black/white, Swiss Red (#FF3000) accent only, zero radius, thick borders, grid texture, uppercase typography, no shadows |

Architecture:
- CSS custom properties in `themes.css` (`:root`, `[data-theme="dark"]`, `[data-theme="swiss"]`)
- `themeStore` (Zustand) — persists to `localStorage`, detects system preference, 3-way cycle
- `data-theme` attribute applied to `document.documentElement`
- All SVG plot colours read from `getComputedStyle()` at render time for full theme reactivity

### 4.7 Flat Icon System
New `Icon` component (`src/components/ui/Icon.tsx`) — ~25 Lucide-inspired stroke-based SVG icons:
- File operations, row operations, export, canvas tools (cursor, pen, lock, snap, flip, image), theme (sun, moon, Swiss cross), UI (chevrons, check, ×)
- Replaces all emoji/unicode in toolbar and canvas toolbar

### 4.8 Major Layout Redesign

**New two-panel layout** replacing the old sidebar + bottom-results approach:

```
Toolbar (full width)
├── Workspace Panel (left, flex:1)          — all user inputs / visual work
│   ├── CANVAS label bar (collapsible)
│   ├── Canvas pane (Konva, resizable height)
│   ├── drag divider
│   ├── STACK-UP label bar
│   └── Grid pane (AG Grid, fills remaining)
│
├── col-resize divider
│
└── Insights Panel (right, ~420px default, resizable)  — all results & insights
    ├── DESIGN INTENT section
    │   └── TargetPanel (type selector + gap fields)
    ├── separator
    ├── ANALYSIS RESULTS section
    │   └── ResultsFooter (cards + plots, stacked for narrow column)
    ├── separator
    ├── TOLERANCE ALLOCATION
    │   └── GoalSeekPanel (strategies + apply)
    ├── separator
    └── NOMINAL ADVISOR
        └── NominalAdvisorPanel (lock rows, strategies + apply)
```

**Rationale:** Engineers work left→right. The canvas and grid are where they _enter data_. The right panel is where they _read conclusions_. This flow matches the engineering workflow: sketch → measure → validate → optimise.

### 4.9 Consistent Pane Collapse/Expand
Replaced the previous inconsistent canvas collapse (button in pane-header) and results collapse (button in divider) with a unified `pane-label-bar` pattern:
- Always-visible label bar with uppercase pane name
- Chevron icon button toggles collapse
- Click anywhere on the collapsed label bar to re-expand
- Identical pattern for Canvas pane

### 4.10 Results Readability Improvements
- **Verdict-first layout**: PASS/FAIL badge moved to card header, visible immediately
- **Gap card**: shows design intent type and target range as subtitle for context
- **RSS Yield card**: yield % is the dominant large value; failure rate is secondary
- **CSS Grid cards**: `repeat(2, 1fr)` for the narrow right column
- **Vertical plots**: distribution and MC histogram stack vertically in the insights panel
- **Tabular numbers**: `font-variant-numeric: tabular-nums` for decimal alignment

### 4.11 Color Picker Fix (Portal)
The color picker popover was being clipped by `overflow-y: hidden` on the canvas toolbar. Fixed by rendering the picker via `createPortal` at `document.body` level, positioned using `getBoundingClientRect()` on the anchor button.

---

## Files Changed / Added

| File | Change |
|---|---|
| `src/store/themeStore.ts` | Extended `ThemeMode` to 3-way, cycle toggle |
| `src/themes.css` | Added `[data-theme="swiss"]` block (~80 lines) |
| `src/App.css` | Complete rewrite to CSS custom properties + Swiss overrides |
| `src/App.tsx` | New two-panel layout, removed old sidebar/results structure |
| `src/components/ui/Icon.tsx` | New component, ~25 icons |
| `src/components/toolbar/Toolbar.tsx` | Icons, theme cycle button |
| `src/components/canvas/CanvasToolbar.tsx` | Icons, portal-ready swatch refs |
| `src/components/canvas/ColorPickerPopover.tsx` | Portal-based, `anchorEl` prop |
| `src/components/grid/StackGrid.tsx` | `ag-theme-quartz` class, direction toggle |
| `src/components/grid/columnDefs.ts` | Direction toggle cell style (CSS vars) |
| `src/components/grid/cellRenderers.ts` | `updateRow` in context |
| `src/components/summary/ResultsFooter.tsx` | Verdict-first cards, gap subtitle, yield prominence |
| `src/components/summary/DistributionPlot.tsx` | Theme-aware SVG colours |
| `src/components/summary/MonteCarloPanel.tsx` | Theme-aware SVG colours |
| `src/components/targets/TargetPanel.tsx` | Removed h3 (handled by insight-section-label) |
| `src/components/targets/GoalSeekPanel.tsx` | New (Phase 4 feature) |
| `src/components/targets/NominalAdvisorPanel.tsx` | New (Phase 4 feature) |
| `src/engine/standards.ts` | IT grade table, tolerance source logic, `runNominalAdvisor` |
| `src/engine/monteCarlo.ts` | Monte Carlo engine |

---

## Verification Tests

- [x] TypeScript strict — `npx tsc --noEmit` passes clean
- [x] Vite build — `npm run build` succeeds
- [x] Light theme renders correctly
- [x] Dark theme renders correctly
- [x] Swiss theme renders correctly (red accents, no radius, grid texture)
- [x] Theme cycles light→dark→swiss→light via toolbar button
- [x] Theme persists across page reload (localStorage)
- [x] Color picker opens above canvas (portal escapes overflow clipping)
- [x] Canvas collapse/expand via label bar chevron
- [x] Right panel resizes via col-divider drag
- [x] Monte Carlo runs and histogram renders with theme colours
- [x] Distribution plot renders with theme colours
- [x] Goal Seek strategies expand and apply correctly
- [x] Nominal Advisor strategies expand and apply correctly
- [x] All existing Phase 1/2/3 features preserved
