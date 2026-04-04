import { create } from 'zustand';
import type { ToleranceConfig } from '../types/standards';
import { DEFAULT_STANDARDS } from '../engine/standards';

interface SettingsState {
  config: ToleranceConfig;
  setConfig: (config: ToleranceConfig) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  config: { standards: DEFAULT_STANDARDS, customRules: [] },
  setConfig: (config) => set({ config }),
}));
