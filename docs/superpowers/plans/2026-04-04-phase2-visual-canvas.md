# Phase 2: Visual Canvas Implementation Plan

> **Status: COMPLETE** — All tasks implemented and verified.

**Goal:** Add an interactive visual canvas above the data grid, allowing engineers to annotate cross-section images with direction vectors that stay bi-directionally synced with the tolerance stack-up table.

**Architecture:** Split-pane layout (resizable). Konva.js (react-konva@18) renders a two-layer Stage: background image + vector arrows. Canvas state (vectors, image, imageTransform) lives in Zustand projectStore alongside grid data — single source of truth, no direct component-to-component communication. All vector/style measurements are viewport-invariant (divided by stageScale) so arrow thickness and label size appear constant regardless of zoom or image resolution.

**Tech Stack:** react-konva@18, konva, Zustand (extended), TypeScript strict

**Spec:** `docs/superpowers/specs/2026-04-03-vectortol-design.md` §3 Visual Canvas

---

## File Structure

```
src/
├── types/
│   └── canvas.ts               # CanvasVector, ImageTransform, CanvasData, CanvasTool
├── store/
│   ├── projectStore.ts         # Extended: canvasData, past/future history, addVector/updateVector/removeVector, undo/redo
│   └── uiStore.ts              # Extended: canvasTool, currentStrokeWidth, currentVectorColor, highlightColor
├── components/
│   └── canvas/
│       ├── CanvasToolbar.tsx   # Tool buttons, width picker, color pickers, undo/redo
│       ├── VisualCanvas.tsx    # Konva Stage, draw/select/pan logic, keyboard shortcuts
│       ├── VectorArrow.tsx     # Konva Arrow + Text, viewport-invariant sizing
│       └── ColorPickerPopover.tsx  # macOS palette + custom color input
├── utils/
│   └── fileIO.ts               # Updated: canvasData serialized in .vtol files
└── App.tsx                     # Resizable split-pane layout (canvas + grid)
```

---

## Completed Tasks

### Task 1: Canvas Types + Store Extension
- `src/types/canvas.ts` — CanvasVector (id, startX, startY, endX, endY, color, strokeWidth), ImageTransform, CanvasData, CanvasTool
- `src/store/projectStore.ts` — Added canvasData state, addVector/updateVector/removeVector/setCanvasImage/setImageTransform actions, undo/redo with 50-entry history stack
- `src/store/uiStore.ts` — Added canvasTool, currentStrokeWidth, currentVectorColor, highlightColor

### Task 2: Split-Pane Layout
- `src/App.tsx` — Resizable split-pane: canvas pane (height %) + draggable divider + grid pane
- Drag divider adjusts canvas height from 15% to 85%
- `src/App.css` — `.canvas-pane`, `.pane-divider` (turns blue on hover), `.grid-pane`

### Task 3: Canvas + Vector Rendering
- `src/components/canvas/VisualCanvas.tsx`
  - Konva Stage with two layers: background image + vectors
  - ResizeObserver keeps Stage sized to container
  - All pixel measurements divided by stageScale (viewport-invariant)
- `src/components/canvas/VectorArrow.tsx`
  - Arrow with glow ring when selected
  - Label text at midpoint, both size and offset viewport-invariant
  - `scale` prop: all pixel values = desired_screen_px / scale

### Task 4: Drawing Tool
- Draw tool (D key): click-drag creates arrow; min 10px distance threshold
- Auto-direction: dominant axis determines sign (Right/Up = +1, Left/Down = -1)
- New vector auto-selects and creates a paired grid row
- Drawing preview line uses currentVectorColor, also viewport-invariant

### Task 5: Image Import
- Button in CanvasToolbar opens file picker (PNG/JPG)
- Drag-and-drop onto canvas area also imports image
- Image rendered at 60% opacity on Layer 0

### Task 6: Selection + Interactions
- Click vector → selects it (highlights cyan/configurable orange) and syncs grid selection
- Click empty canvas → deselects
- Delete/Backspace → removes selected vector + its grid row
- Escape → cancels draw or deselects

### Task 7: Pan + Zoom
- **Mouse wheel** → zoom centered on cursor (0.1×–10× clamped)
- **Left-drag in Select mode** → pan (Konva draggable Stage)
- **Spacebar (hold)** → temporary pan override from any tool; cursor changes to `grab`
- **Middle mouse button (hold + drag)** → pan, matching CAD software convention; cursor changes to `grabbing`; `preventDefault` suppresses browser auto-scroll

### Task 8: Undo / Redo
- History stored as `past: HistoryEntry[]` and `future: HistoryEntry[]` in projectStore (max 50 entries)
- `HistoryEntry = { rows, canvasData, target }` — full snapshot before each mutation
- Mutations that push history: addRow, removeRow, updateRow, setTarget, addVector, updateVector, removeVector
- `undo()` / `redo()` swap current ↔ history stacks and recompute derived state
- Keyboard: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo)
- Buttons in CanvasToolbar, disabled when stack empty

### Task 9: Color Customization
- `src/components/canvas/ColorPickerPopover.tsx`
  - 15 macOS system colors palette (Red, Orange, Yellow, Green, Mint, Teal, Cyan, Blue, Indigo, Purple, Pink, Brown, Gray, Black, White)
  - Active swatch shown with ring indicator
  - Custom color via native `<input type="color">` with hex display
  - Closes on outside click
- **Arrow Color** — default for new vectors; changes selected vector's color live
- **Highlight Color** — color used for selected arrow + glow ring; global setting
- Defaults: macOS Blue (#007AFF) for arrows, macOS Orange (#FF9500) for highlight

### Task 10: Line Width
- Width picker: 1–5px in CanvasToolbar
- `currentStrokeWidth` in uiStore applies to new vectors
- Selecting a vector shows its own width; changing width updates that vector live
- All widths are viewport-invariant (divided by stageScale)

### Task 11: Label Scaling
- Label font size scales with strokeWidth: `fontSize = (9 + strokeWidth × 2) / scale`
- Label offset also scales: `offsetX = (4 + strokeWidth) / scale`
- Result: thicker arrows always have proportionally larger captions

### Task 12: File I/O Update
- `src/utils/fileIO.ts` — `serializeProject` now accepts and stores `canvasData`
- `deserializeProject` backfills `DEFAULT_CANVAS_DATA` for pre-Phase-2 .vtol files
- `src/types/project.ts` — `VtolFile.canvasData` typed as `CanvasData` (previously `unknown[]`)

---

## Keyboard Shortcuts Summary

| Key | Action |
|-----|--------|
| V | Select tool |
| D | Draw tool |
| Space (hold) | Temporary pan |
| Middle mouse (hold) | Pan (CAD-style) |
| Scroll wheel | Zoom in/out |
| Delete / Backspace | Remove selected vector + row |
| Escape | Cancel draw / deselect |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
