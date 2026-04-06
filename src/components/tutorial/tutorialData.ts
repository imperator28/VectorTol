import type { StackRow } from '../../types/grid';
import type { TargetScenario } from '../../types/project';
import { DEMO_CANVAS_DATA } from './tutorialCanvasArt';

/** Which action must the user perform on an interactive step */
export type InteractionTrigger = 'vector-drawn' | 'row-added' | null;

export interface TutorialStep {
  title: string;
  body: string;
  /** CSS data-tour attribute to highlight, or null for a centered modal */
  target: string | null;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  interactive: boolean;
  interactionHint: string;
  trigger: InteractionTrigger;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to VectorTol',
    body: 'VectorTol is an offline tolerance stack-up tool for mechanical engineers. In a few steps you\'ll learn how to model an assembly, set design intent, and read analysis results. Demo data will be loaded so you can follow along.',
    target: null,
    placement: 'center',
    interactive: false,
    interactionHint: '',
    trigger: null,
  },
  {
    title: 'Stack-up Grid',
    body: 'Each row represents one dimension in your assembly — a part thickness, gap, or fastener length. Enter the Part name, dimension ID, nominal size, and tolerance (±). The Direction column (+/−) controls which way the dimension contributes to the gap.',
    target: 'grid',
    placement: 'left',
    interactive: false,
    interactionHint: '',
    trigger: null,
  },
  {
    title: 'Add a Row',
    body: 'Click the Row button with the plus icon in the top toolbar to add a new dimension to the stack-up. Try it now.',
    target: 'add-row-button',
    placement: 'bottom',
    interactive: true,
    interactionHint: 'Click the Row button in the toolbar to continue.',
    trigger: 'row-added',
  },
  {
    title: 'Design Intent',
    body: 'Tell VectorTol what the gap must satisfy. Choose a condition — Clearance (gap must be positive), Interference (parts must overlap), Flush (surface must align within a band), etc. Then set the target min/max bounds.',
    target: 'design-intent',
    placement: 'left',
    interactive: false,
    interactionHint: '',
    trigger: null,
  },
  {
    title: 'Analysis Results',
    body: 'Live WC (Worst-Case) and RSS (Root Sum Square) analysis runs instantly as you edit. WC is the worst possible outcome if every part is at its limit simultaneously. RSS is statistically more realistic — most parts won\'t be at their limits at the same time.',
    target: 'analysis-results',
    placement: 'left',
    interactive: false,
    interactionHint: '',
    trigger: null,
  },
  {
    title: 'Visual Canvas',
    body: 'The canvas lets you draw tolerance vectors directly on a cross-section image. A demo assembly image is already loaded so you can see what to trace. Each arrow you draw creates a row in the grid, so your diagram and your numbers stay in sync automatically.',
    target: 'canvas',
    placement: 'right',
    interactive: false,
    interactionHint: '',
    trigger: null,
  },
  {
    title: 'Draw a Vector',
    body: 'Select the Draw tool from the canvas toolbar (or press D), then click and drag on the demo image to draw an arrow representing a dimension.',
    target: 'canvas-draw-tool',
    placement: 'bottom',
    interactive: true,
    interactionHint: 'Choose Draw, then drag on the demo image to continue.',
    trigger: 'vector-drawn',
  },
  {
    title: 'Tolerance Allocation',
    body: 'When your design fails, the Tolerance Allocation panel suggests how to redistribute tolerances to meet the design intent. Choose from 5 strategies: Proportional, Top Contributors, Grade Step, Asymmetric Shift, or Relaxation. Apply changes one row at a time or all at once.',
    target: 'tolerance-allocation',
    placement: 'left',
    interactive: false,
    interactionHint: '',
    trigger: null,
  },
  {
    title: 'Nominal Advisor & Dimension Locks',
    body: 'If tolerances alone can\'t fix the gap (the nominal dimensions are off), the Nominal Advisor suggests which dimensions to change. Lock any dimension that can\'t move — tooling constraints, material stock — and the advisor works around them.',
    target: 'nominal-advisor',
    placement: 'left',
    interactive: false,
    interactionHint: '',
    trigger: null,
  },
];

// ── Demo data ────────────────────────────────────────────────────────────────

export const DEMO_ROWS: Omit<StackRow, 'id'>[] = [
  {
    component: 'Base Plate',
    dimId: 'D1',
    toleranceSource: 'machining',
    direction: 1,
    nominal: '50.000',
    tolSymmetric: '0.100',
    tolPlus: null,
    tolMinus: null,
    rounding: 3,
    sigma: '3',
  },
  {
    component: 'Spacer',
    dimId: 'D2',
    toleranceSource: 'machining',
    direction: 1,
    nominal: '10.000',
    tolSymmetric: '0.050',
    tolPlus: null,
    tolMinus: null,
    rounding: 3,
    sigma: '3',
  },
  {
    component: 'Cover Plate',
    dimId: 'D3',
    toleranceSource: 'machining',
    direction: -1,
    nominal: '55.000',
    tolSymmetric: '0.075',
    tolPlus: null,
    tolMinus: null,
    rounding: 3,
    sigma: '3',
  },
  {
    component: 'Fastener',
    dimId: 'D4',
    toleranceSource: 'assembly',
    direction: -1,
    nominal: '3.000',
    tolSymmetric: '0.025',
    tolPlus: null,
    tolMinus: null,
    rounding: 3,
    sigma: '3',
  },
];

export const DEMO_TARGET: TargetScenario = {
  type: 'clearance',
  minGap: '0.050',
  maxGap: null,
};

export const DEMO_METADATA = {
  projectName: 'Tutorial Demo — Bracket Assembly',
  author: 'VectorTol Tutorial',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  designIntent: DEMO_TARGET,
};

export { DEMO_CANVAS_DATA };
