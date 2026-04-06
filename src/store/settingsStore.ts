import { create } from 'zustand';
import type { ToleranceConfig } from '../types/standards';
import { DEFAULT_STANDARDS } from '../engine/standards';

const AUTOSAVE_ENABLED_KEY = 'vectortol-autosave-enabled';
const AUTOSAVE_INTERVAL_KEY = 'vectortol-autosave-interval-minutes';

interface SettingsState {
  config: ToleranceConfig;
  autosaveEnabled: boolean;
  autosaveIntervalMinutes: number;
  setConfig: (config: ToleranceConfig) => void;
  setAutosaveEnabled: (enabled: boolean) => void;
  setAutosaveIntervalMinutes: (minutes: number) => void;
}

function getInitialAutosaveEnabled(): boolean {
  try {
    return localStorage.getItem(AUTOSAVE_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function getInitialAutosaveInterval(): number {
  try {
    const raw = Number(localStorage.getItem(AUTOSAVE_INTERVAL_KEY));
    if (Number.isFinite(raw) && raw >= 1 && raw <= 60) return raw;
  } catch {
    // noop
  }
  return 5;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  config: { standards: DEFAULT_STANDARDS, customRules: [] },
  autosaveEnabled: getInitialAutosaveEnabled(),
  autosaveIntervalMinutes: getInitialAutosaveInterval(),
  setConfig: (config) => set({ config }),
  setAutosaveEnabled: (enabled) => {
    localStorage.setItem(AUTOSAVE_ENABLED_KEY, String(enabled));
    set({ autosaveEnabled: enabled });
  },
  setAutosaveIntervalMinutes: (minutes) => {
    const next = Math.max(1, Math.min(60, Math.round(minutes)));
    localStorage.setItem(AUTOSAVE_INTERVAL_KEY, String(next));
    set({ autosaveIntervalMinutes: next });
  },
}));
