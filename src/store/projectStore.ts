import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { StackRow, RowId } from '../types/grid';
import { createEmptyRow } from '../types/grid';
import type { VtolMetadata, TargetScenario } from '../types/project';
import { wcGap, wcTolerance, wcMin, wcMax } from '../engine/worstCase';
import { rssTolerance, rssMin, rssMax } from '../engine/rss';
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
}

function evaluatePass(min: Decimal, max: Decimal, target: TargetScenario): boolean {
  const lo = target.minGap !== null ? D(target.minGap) : null;
  const hi = target.maxGap !== null ? D(target.maxGap) : null;

  switch (target.type) {
    case 'clearance':
      return lo !== null ? min.gte(lo) : true;
    case 'interference':
      return (lo === null || max.lte(lo)) && (hi === null || min.gte(hi));
    case 'flush':
      return min.lte(0) && max.gte(0);
    case 'proud':
      return lo !== null ? min.gte(lo) : min.gt(0);
    case 'recess':
      return hi !== null ? max.lte(hi) : max.lt(0);
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
  };
}

function computeDerivedRow(row: StackRow, totalWcTol: string): DerivedRowData {
  return {
    centeredNominal: centeredNominal(row),
    centeredTolerance: centeredTolerance(row),
    percentContribution: percentContribution(row, totalWcTol),
  };
}

interface ProjectState {
  metadata: VtolMetadata;
  rows: StackRow[];
  target: TargetScenario;
  isDirty: boolean;
  currentFilePath: string | null;
  results: AnalysisResults;
  derivedRows: Map<RowId, DerivedRowData>;

  addRow: () => void;
  removeRow: (id: RowId) => void;
  updateRow: (id: RowId, updates: Partial<StackRow>) => void;
  setTarget: (target: TargetScenario) => void;
  setMetadata: (metadata: Partial<VtolMetadata>) => void;
  loadProject: (metadata: VtolMetadata, rows: StackRow[], target: TargetScenario, filePath: string | null) => void;
  newProject: () => void;
  setFilePath: (path: string | null) => void;
  markClean: () => void;
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

    addRow: () => {
      const state = get();
      const newRow = createEmptyRow(uuidv4());
      const rows = [...state.rows, newRow];
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, ...computed });
    },

    removeRow: (id: RowId) => {
      const state = get();
      const rows = state.rows.filter((r) => r.id !== id);
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, ...computed });
    },

    updateRow: (id: RowId, updates: Partial<StackRow>) => {
      const state = get();
      const rows = state.rows.map((r) => (r.id === id ? { ...r, ...updates } : r));
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, ...computed });
    },

    setTarget: (target: TargetScenario) => {
      const state = get();
      const computed = recomputeState(state.rows, target);
      set({ target, isDirty: true, ...computed });
    },

    setMetadata: (updates: Partial<VtolMetadata>) => {
      const state = get();
      set({ metadata: { ...state.metadata, ...updates }, isDirty: true });
    },

    loadProject: (metadata, rows, target, filePath) => {
      const computed = recomputeState(rows, target);
      set({ metadata, rows, target, currentFilePath: filePath, isDirty: false, ...computed });
    },

    newProject: () => {
      const computed = recomputeState([], defaultTarget);
      set({
        metadata: { ...defaultMetadata, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        rows: [],
        target: defaultTarget,
        currentFilePath: null,
        isDirty: false,
        ...computed,
      });
    },

    setFilePath: (path) => set({ currentFilePath: path }),
    markClean: () => set({ isDirty: false }),
  };
});
