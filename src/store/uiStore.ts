import { create } from 'zustand';
import type { RowId } from '../types/grid';
import type { CanvasTool } from '../types/canvas';

interface UiState {
  selectedRowId: RowId | null;
  canvasTool: CanvasTool;
  currentStrokeWidth: number;
  currentVectorColor: string;
  highlightColor: string;
  setSelectedRowId: (id: RowId | null) => void;
  setCanvasTool: (tool: CanvasTool) => void;
  setCurrentStrokeWidth: (w: number) => void;
  setCurrentVectorColor: (color: string) => void;
  setHighlightColor: (color: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedRowId: null,
  canvasTool: 'select',
  currentStrokeWidth: 2,
  currentVectorColor: '#007AFF',
  highlightColor: '#FF9500',
  setSelectedRowId: (id) => set({ selectedRowId: id }),
  setCanvasTool: (tool) => set({ canvasTool: tool }),
  setCurrentStrokeWidth: (w) => set({ currentStrokeWidth: w }),
  setCurrentVectorColor: (color) => set({ currentVectorColor: color }),
  setHighlightColor: (color) => set({ highlightColor: color }),
}));
