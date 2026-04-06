import { create } from 'zustand';

export const TUTORIAL_STORAGE_KEY = 'vectortol-tutorial-seen';

export const TOTAL_STEPS = 9;

interface TutorialState {
  active: boolean;
  step: number;         // 0-based
  /** Flag for interactive steps: true once the required action happened */
  interactionDone: boolean;

  start: () => void;
  next: () => void;
  prev: () => void;
  finish: () => void;
  markInteractionDone: () => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  active: false,
  step: 0,
  interactionDone: false,

  start: () => set({ active: true, step: 0, interactionDone: false }),

  next: () => {
    const { step } = get();
    const nextStep = step + 1;
    if (nextStep >= TOTAL_STEPS) {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      set({ active: false, step: 0, interactionDone: false });
    } else {
      set({ step: nextStep, interactionDone: false });
    }
  },

  prev: () => {
    const { step } = get();
    if (step > 0) set({ step: step - 1, interactionDone: false });
  },

  finish: () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    set({ active: false, step: 0, interactionDone: false });
  },

  markInteractionDone: () => set({ interactionDone: true }),
}));
