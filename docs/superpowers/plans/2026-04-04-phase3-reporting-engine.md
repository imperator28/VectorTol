# Phase 3: Reporting Engine Implementation Plan

> **Status: COMPLETE** — All tasks implemented and verified.

**Goal:** Add one-click PDF and XLSX export, direction-lock and magnetic-snap canvas tools, inline project metadata editing, and a browser-compatible save/open fallback.

**Architecture:** Export utilities (`pdfExport.ts`, `xlsxExport.ts`) are pure functions called from `Toolbar`. A module-level singleton (`stageRef.ts`) gives the Toolbar access to the Konva stage for canvas-to-image capture without prop drilling. Direction lock and magnetic snap are boolean flags in `uiStore` toggled via the existing `CanvasToolbar` and keyboard shortcuts; the snap logic lives entirely inside `VisualCanvas`. Tauri-specific file I/O is guarded by a `isTauri` check so the app degrades gracefully to browser download/upload in dev mode.

**Tech Stack:** jsPDF, jspdf-autotable, SheetJS (xlsx), existing Zustand stores, react-konva

---

## File Structure

```
src/
├── utils/
│   ├── stageRef.ts          # Module-level Konva stage singleton for PDF capture
│   ├── pdfExport.ts         # jsPDF landscape report: title block, canvas image, data table, results
│   └── xlsxExport.ts        # SheetJS workbook: stack-up rows + WC/RSS results section
├── store/
│   └── uiStore.ts           # Extended: directionLock, snapEnabled, toggleDirectionLock, toggleSnap
├── components/
│   ├── canvas/
│   │   ├── VisualCanvas.tsx # Extended: magnetic snap (findSnap), direction lock (applyDirectionLock), middle-mouse pan
│   │   └── CanvasToolbar.tsx # Extended: ⊥ Lock and 🧲 Snap toggle buttons
│   └── toolbar/
│       └── Toolbar.tsx      # Extended: PDF/XLSX buttons, editable name/author inputs, browser save fallback
└── App.css                  # Extended: toolbar-meta inputs, toolbar-dirty indicator styles
```

---

## Tasks Completed

### Task 1: Install Phase 3 dependencies

- [x] Install jsPDF, jspdf-autotable, SheetJS
  ```bash
  npm install jspdf jspdf-autotable xlsx
  ```

---

### Task 2: `stageRef.ts` — Konva stage singleton

**File:** `src/utils/stageRef.ts` (new)

- [x] Implement module-level stage ref

```typescript
import type Konva from 'konva';

let _stage: Konva.Stage | null = null;

export function setStageRef(stage: Konva.Stage | null): void {
  _stage = stage;
}

export function getStageDataUrl(): string | null {
  return _stage ? _stage.toDataURL({ pixelRatio: 2 }) : null;
}
```

- [x] Register in `VisualCanvas.tsx` on mount:
  ```typescript
  useEffect(() => {
    setStageRef(stageRef.current);
    return () => setStageRef(null);
  }, []);
  ```

---

### Task 3: `pdfExport.ts` — PDF report

**File:** `src/utils/pdfExport.ts` (new)

- [x] Async function (awaits image load for correct aspect ratio)
- [x] jsPDF landscape A4
- [x] Title block: project name, author, date, design intent
- [x] Canvas image: async Image load → correct naturalWidth/naturalHeight → scaled to fit (max 60 mm tall)
- [x] Data table (jspdf-autotable): 12 columns — #, Component, Dim ID, Tol Source, +/−, Nominal, ±TOL, +TOL, −TOL, Ctr Nom, Ctr TOL, % Contrib; % Contrib > 25% flagged red+bold
- [x] Results summary table: Worst Case and RSS rows with PASS/FAIL color-coded cells
- [x] RSS failure rate / yield line below results table
- [x] Page footer: "VectorTol | ProjectName | Page N of M"
- [x] `doc.save(projectName + '_report.pdf')`

---

### Task 4: `xlsxExport.ts` — Excel workbook

**File:** `src/utils/xlsxExport.ts` (new)

- [x] Single "Stack-Up" sheet
- [x] Stack-up rows: 14 columns — #, Component, Dim ID, Tol Source, Direction, Nominal, ± TOL, +TOL, −TOL, Round, σ, Ctr Nominal, Ctr TOL, % Contrib
- [x] Blank separator row after stack-up data
- [x] Results section: Worst Case, RSS (tolerance, min, max, pass/fail), Gap (nominal), RSS Failure Rate, RSS Yield
- [x] Column widths via `ws['!cols']`
- [x] `XLSX.writeFile(wb, projectName + '.xlsx')`

---

### Task 5: Direction lock in `uiStore` and `VisualCanvas`

**Files:** `src/store/uiStore.ts`, `src/components/canvas/VisualCanvas.tsx`

- [x] Add `directionLock: boolean` (default `false`) and `toggleDirectionLock()` to `uiStore`
- [x] `applyDirectionLock(pos, origin)`: if `directionLock`, compare `|dx|` vs `|dy|` from drawStart; constrain to dominant axis
- [x] In `handleMouseMove`: apply direction lock when no snap point fires
- [x] Keyboard shortcut: `L` toggles direction lock
- [x] Button `⊥ Lock` in `CanvasToolbar` with active highlight when on

---

### Task 6: Magnetic snap in `uiStore` and `VisualCanvas`

**Files:** `src/store/uiStore.ts`, `src/components/canvas/VisualCanvas.tsx`

- [x] Add `snapEnabled: boolean` (default `true`) and `toggleSnap()` to `uiStore`
- [x] `SNAP_RADIUS_PX = 16` screen pixels
- [x] `findSnap(pos)`: iterate all `canvasData.vectors` endpoints; return nearest within `SNAP_RADIUS_PX / stageScale` canvas units
- [x] Snap start point in `handleMouseDown`
- [x] Snap end point in `handleMouseMove`; snap takes priority over direction lock
- [x] Visual indicator: `Circle` ring at snap target (highlight color, 25% opacity) during draw
- [x] Start point dot during drawing
- [x] Keyboard shortcut: `S` toggles snap
- [x] Button `🧲 Snap` in `CanvasToolbar` with active highlight when on

---

### Task 7: Middle-mouse button pan

**File:** `src/components/canvas/VisualCanvas.tsx`

- [x] `middlePanRef = useRef<{ lastX, lastY } | null>(null)` — avoids re-renders on every mouse move
- [x] `handleMouseDown`: `e.evt.button === 1` → store initial position
- [x] `handleMouseMove`: if `middlePanRef.current`, compute delta, update `stagePos`
- [x] `handleMouseUp`: clear `middlePanRef`
- [x] Cursor: `grabbing` while middle-panning, `grab` while space held

---

### Task 8: Toolbar — PDF/XLSX buttons + metadata editing + browser fallback

**File:** `src/components/toolbar/Toolbar.tsx`

- [x] `isTauri` check: `'__TAURI_INTERNALS__' in window`
- [x] `browserDownload(content, filename, mimeType)`: Blob → `URL.createObjectURL` → `<a download>` click
- [x] `handleSave`: Tauri → native save dialog; browser → `browserDownload(.vtol)`
- [x] `handleOpen`: Tauri → native open dialog; browser → `<input type="file">` picker
- [x] `handleExportCsv`: Tauri → native save dialog; browser → `browserDownload(.csv)`
- [x] `handleExportPdf`: `await exportPdf(...)` (async for image load)
- [x] `handleExportXlsx`: `exportXlsx(rows, derivedRows, results, projectName)`
- [x] PDF and XLSX buttons added to toolbar export group
- [x] Inline `<input>` for project name and author (calls `setMetadata`)
- [x] "unsaved" indicator in `toolbar-meta`

---

### Task 9: CSS for toolbar metadata inputs

**File:** `src/App.css`

- [x] `.toolbar-meta`: flex row, `margin-left: auto`
- [x] `.toolbar-meta-input`: styled text input, `border-color: #007AFF` on focus
- [x] `.toolbar-meta-author`: narrower, grey text
- [x] `.toolbar-dirty`: italic orange "unsaved" label

---

## Bug Fixes Applied

| Issue | Root Cause | Fix |
|---|---|---|
| PDF image squeezed wrong ratio | `img.naturalWidth/Height` = 0 (not yet loaded) | Made `exportPdf` async; await `img.onload` before calling `addImage` |
| XLSX missing WC/RSS results | Results not passed to `exportXlsx` | Added `results: AnalysisResults` param; appended results section below data rows |
| Save button silent no-op in browser | Tauri dialog API not available outside native app | Added `isTauri` guard + browser download fallback |

---

## Verification

- [x] `npx tsc --noEmit` — no errors
- [x] Browser preview: PDF, XLSX, CSV buttons visible in toolbar
- [x] Browser preview: project name and author inputs render and accept input
- [x] PDF export: correct image aspect ratio, data table, PASS/FAIL results
- [x] XLSX export: stack-up rows + results section on same sheet
- [x] Save: browser downloads `.vtol` file; Tauri shows native save dialog
