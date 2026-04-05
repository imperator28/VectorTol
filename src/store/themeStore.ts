import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'swiss';

const CYCLE: ThemeMode[] = ['light', 'dark', 'swiss'];

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem('vectortol-theme');
    if (stored === 'dark' || stored === 'light' || stored === 'swiss') return stored;
  } catch { /* noop */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: getInitialMode(),
  setMode: (mode) => {
    localStorage.setItem('vectortol-theme', mode);
    set({ mode });
  },
  toggle: () =>
    set((s) => {
      const idx = CYCLE.indexOf(s.mode);
      const next = CYCLE[(idx + 1) % CYCLE.length]!;
      localStorage.setItem('vectortol-theme', next);
      return { mode: next };
    }),
}));
