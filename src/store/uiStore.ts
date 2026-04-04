import { create } from 'zustand';
import type { RowId } from '../types/grid';

interface UiState {
  selectedRowId: RowId | null;
  setSelectedRowId: (id: RowId | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedRowId: null,
  setSelectedRowId: (id) => set({ selectedRowId: id }),
}));
