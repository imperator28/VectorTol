import { create } from 'zustand';
import type { ToleranceConfig } from '../types/standards';

interface SettingsState {
  config: ToleranceConfig;
  setConfig: (config: ToleranceConfig) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  config: { standards: [], customRules: [] },
  setConfig: (config) => set({ config }),
}));
