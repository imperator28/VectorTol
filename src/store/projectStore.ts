import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { StackRow, RowId, Direction } from '../types/grid';
import { createEmptyRow } from '../types/grid';
import type { VtolMetadata, TargetScenario } from '../types/project';
import type { CanvasVector, CanvasData, ImageTransform } from '../types/canvas';
import { DEFAULT_CANVAS_DATA } from '../types/canvas';
import { wcGap, wcTolerance, wcMin, wcMax } from '../engine/worstCase';
import { rssTolerance, rssMin, rssMax, rssFailureRate } from '../engine/rss';
import { centeredNominal, centeredTolerance, percentContribution } from '../engine/calculations';
import { D, Decimal } from '../engine/decimal';

export interface DerivedRowData {
  centeredNominal: Decimal;
  centeredTolerance: Decimal;
  percentContribution: number;
}

export interface AnalysisResults {
  gap: Decimal;
  wcTolerance: Decimal;
  wcMin: Decimal;
  wcMax: Decimal;
  rssTolerance: Decimal;
  rssMin: Decimal;
  rssMax: Decimal;
  wcPass: boolean;
  rssPass: boolean;
  rssFailureRate: number;
  rssYieldPercent: number;
}

interface HistoryEntry {
  rows: StackRow[];
  canvasData: CanvasData;
  target: TargetScenario;
}

const MAX_HISTORY = 50;

function evaluatePass(min: Decimal, max: Decimal, target: TargetScenario): boolean {
  const lo = target.minGap !== null ? D(target.minGap) : null;
  const hi = target.maxGap !== null ? D(target.maxGap) : null;

  switch (target.type) {
    case 'clearance':
      return lo !== null ? min.gte(lo) : true;
    case 'interference':
      return (lo === null || max.lte(lo)) && (hi === null || min.gte(hi));
    case 'flush':
      // Flush with tolerance: gap must stay within [minGap, maxGap] (e.g. [-0.05, +0.05])
      return (lo === null || min.gte(lo)) && (hi === null || max.lte(hi));
    case 'proud':
      return lo !== null ? min.gte(lo) : min.gt(0);
    case 'recess':
      return hi !== null ? max.lte(hi) : max.lt(0);
    case 'custom':
      // Custom: gap must be within [minGap, maxGap]
      return (lo === null || min.gte(lo)) && (hi === null || max.lte(hi));
  }
}

function computeResults(rows: StackRow[], target: TargetScenario): AnalysisResults {
  const gap = wcGap(rows);
  const wcTol = wcTolerance(rows);
  const wcMinVal = wcMin(rows);
  const wcMaxVal = wcMax(rows);
  const rssTol = rssTolerance(rows);
  const rssMinVal = rssMin(rows);
  const rssMaxVal = rssMax(rows);

  const { failureRate, yieldPercent } = rssFailureRate(rows, target);

  return {
    gap,
    wcTolerance: wcTol,
    wcMin: wcMinVal,
    wcMax: wcMaxVal,
    rssTolerance: rssTol,
    rssMin: rssMinVal,
    rssMax: rssMaxVal,
    wcPass: evaluatePass(wcMinVal, wcMaxVal, target),
    rssPass: evaluatePass(rssMinVal, rssMaxVal, target),
    rssFailureRate: failureRate,
    rssYieldPercent: yieldPercent,
  };
}

function computeDerivedRow(row: StackRow, totalWcTol: string): DerivedRowData {
  return {
    centeredNominal: centeredNominal(row),
    centeredTolerance: centeredTolerance(row),
    percentContribution: percentContribution(row, totalWcTol),
  };
}

/** Determine direction from vector angle: Right/Up = +1, Left/Down = -1 */
function directionFromVector(startX: number, startY: number, endX: number, endY: number): Direction {
  const dx = endX - startX;
  const dy = endY - startY;
  // Use dominant axis
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 1 : -1;  // Right = +, Left = -
  }
  return dy <= 0 ? 1 : -1;    // Up = + (canvas Y is inverted), Down = -
}

interface ProjectState {
  metadata: VtolMetadata;
  rows: StackRow[];
  target: TargetScenario;
  isDirty: boolean;
  currentFilePath: string | null;
  results: AnalysisResults;
  derivedRows: Map<RowId, DerivedRowData>;

  // Canvas state
  canvasData: CanvasData;

  // History
  past: HistoryEntry[];
  future: HistoryEntry[];

  // Row actions
  addRow: () => void;
  removeRow: (id: RowId) => void;
  updateRow: (id: RowId, updates: Partial<StackRow>) => void;
  reorderRows: (newRows: StackRow[]) => void;
  setTarget: (target: TargetScenario) => void;
  setMetadata: (metadata: Partial<VtolMetadata>) => void;
  loadProject: (metadata: VtolMetadata, rows: StackRow[], target: TargetScenario, filePath: string | null, canvasData?: CanvasData) => void;
  newProject: () => void;
  setFilePath: (path: string | null) => void;
  markClean: () => void;

  // Canvas actions
  addVector: (startX: number, startY: number, endX: number, endY: number, strokeWidth?: number, color?: string) => RowId;
  updateVector: (id: RowId, updates: Partial<CanvasVector>) => void;
  removeVector: (id: RowId) => void;
  setCanvasImage: (image: string | null) => void;
  setImageTransform: (transform: ImageTransform) => void;

  // History actions
  undo: () => void;
  redo: () => void;
}

const defaultTarget: TargetScenario = { type: 'clearance', minGap: '0', maxGap: null };

const defaultMetadata: VtolMetadata = {
  projectName: 'Untitled',
  author: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  designIntent: defaultTarget,
};

export const useProjectStore = create<ProjectState>((set, get) => {
  function recomputeState(rows: StackRow[], target: TargetScenario) {
    const results = computeResults(rows, target);
    const totalWcTol = results.wcTolerance.toString();
    const derivedRows = new Map<RowId, DerivedRowData>();
    for (const row of rows) {
      derivedRows.set(row.id, computeDerivedRow(row, totalWcTol));
    }
    return { results, derivedRows };
  }

  function snapshot(): HistoryEntry {
    const s = get();
    return { rows: s.rows, canvasData: s.canvasData, target: s.target };
  }

  function pushHistory(entry: HistoryEntry) {
    const past = [entry, ...get().past].slice(0, MAX_HISTORY);
    set({ past, future: [] });
  }

  const initialRows: StackRow[] = [];
  const { results, derivedRows } = recomputeState(initialRows, defaultTarget);

  return {
    metadata: defaultMetadata,
    rows: initialRows,
    target: defaultTarget,
    isDirty: false,
    currentFilePath: null,
    results,
    derivedRows,
    canvasData: { ...DEFAULT_CANVAS_DATA },
    past: [],
    future: [],

    addRow: () => {
      pushHistory(snapshot());
      const state = get();
      const newRow = createEmptyRow(uuidv4());
      const rows = [...state.rows, newRow];
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, ...computed });
    },

    removeRow: (id: RowId) => {
      pushHistory(snapshot());
      const state = get();
      const rows = state.rows.filter((r) => r.id !== id);
      const vectors = state.canvasData.vectors.filter((v) => v.id !== id);
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, canvasData: { ...state.canvasData, vectors }, ...computed });
    },

    updateRow: (id: RowId, updates: Partial<StackRow>) => {
      pushHistory(snapshot());
      const state = get();
      const rows = state.rows.map((r) => (r.id === id ? { ...r, ...updates } : r));
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, ...computed });
    },

    reorderRows: (newRows: StackRow[]) => {
      pushHistory(snapshot());
      const state = get();
      const computed = recomputeState(newRows, state.target);
      set({ rows: newRows, isDirty: true, ...computed });
    },

    setTarget: (target: TargetScenario) => {
      pushHistory(snapshot());
      const state = get();
      const computed = recomputeState(state.rows, target);
      set({ target, isDirty: true, ...computed });
    },

    setMetadata: (updates: Partial<VtolMetadata>) => {
      const state = get();
      set({ metadata: { ...state.metadata, ...updates }, isDirty: true });
    },

    loadProject: (metadata, rows, target, filePath, canvasData) => {
      const computed = recomputeState(rows, target);
      set({
        metadata, rows, target, currentFilePath: filePath, isDirty: false,
        canvasData: canvasData ?? { ...DEFAULT_CANVAS_DATA },
        past: [], future: [],
        ...computed,
      });
    },

    newProject: () => {
      const computed = recomputeState([], defaultTarget);
      set({
        metadata: { ...defaultMetadata, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        rows: [],
        target: defaultTarget,
        currentFilePath: null,
        isDirty: false,
        canvasData: { ...DEFAULT_CANVAS_DATA },
        past: [], future: [],
        ...computed,
      });
    },

    setFilePath: (path) => set({ currentFilePath: path }),
    markClean: () => set({ isDirty: false }),

    // Canvas actions
    addVector: (startX, startY, endX, endY, strokeWidth = 2, color = '#007AFF') => {
      pushHistory(snapshot());
      const state = get();
      const id = uuidv4();
      const direction = directionFromVector(startX, startY, endX, endY);
      const newRow = { ...createEmptyRow(id), direction };
      const rows = [...state.rows, newRow];
      const vector: CanvasVector = { id, startX, startY, endX, endY, color, strokeWidth };
      const vectors = [...state.canvasData.vectors, vector];
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, canvasData: { ...state.canvasData, vectors }, ...computed });
      return id;
    },

    updateVector: (id, updates) => {
      pushHistory(snapshot());
      const state = get();
      const vectors = state.canvasData.vectors.map((v) => (v.id === id ? { ...v, ...updates } : v));

      // If endpoints changed, update direction on the row
      const updatedVector = vectors.find((v) => v.id === id);
      let rows = state.rows;
      if (updatedVector && (updates.startX !== undefined || updates.startY !== undefined || updates.endX !== undefined || updates.endY !== undefined)) {
        const newDir = directionFromVector(updatedVector.startX, updatedVector.startY, updatedVector.endX, updatedVector.endY);
        rows = rows.map((r) => (r.id === id ? { ...r, direction: newDir } : r));
      }

      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, canvasData: { ...state.canvasData, vectors }, ...computed });
    },

    removeVector: (id) => {
      pushHistory(snapshot());
      const state = get();
      const rows = state.rows.filter((r) => r.id !== id);
      const vectors = state.canvasData.vectors.filter((v) => v.id !== id);
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, canvasData: { ...state.canvasData, vectors }, ...computed });
    },

    setCanvasImage: (image) => {
      const state = get();
      set({ isDirty: true, canvasData: { ...state.canvasData, image } });
    },

    setImageTransform: (transform) => {
      const state = get();
      set({ isDirty: true, canvasData: { ...state.canvasData, imageTransform: transform } });
    },

    undo: () => {
      const state = get();
      const [entry, ...remaining] = state.past;
      if (!entry) return;
      const current: HistoryEntry = { rows: state.rows, canvasData: state.canvasData, target: state.target };
      const computed = recomputeState(entry.rows, entry.target);
      set({
        rows: entry.rows,
        canvasData: entry.canvasData,
        target: entry.target,
        past: remaining,
        future: [current, ...state.future].slice(0, MAX_HISTORY),
        isDirty: true,
        ...computed,
      });
    },

    redo: () => {
      const state = get();
      const [entry, ...remaining] = state.future;
      if (!entry) return;
      const current: HistoryEntry = { rows: state.rows, canvasData: state.canvasData, target: state.target };
      const computed = recomputeState(entry.rows, entry.target);
      set({
        rows: entry.rows,
        canvasData: entry.canvasData,
        target: entry.target,
        future: remaining,
        past: [current, ...state.past].slice(0, MAX_HISTORY),
        isDirty: true,
        ...computed,
      });
    },
  };
});
