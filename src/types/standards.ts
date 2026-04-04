import type { ToleranceSource } from './grid';

// ── Dimension range (mm) ────────────────────────────────────────────────────
export interface DimensionRange {
  min: number;   // exclusive lower bound (0 for the first range)
  max: number;   // inclusive upper bound
}

// ── ISO 286 IT Grade ────────────────────────────────────────────────────────
export type ITGrade =
  | 'IT1' | 'IT2' | 'IT3' | 'IT4' | 'IT5' | 'IT6'
  | 'IT7' | 'IT8' | 'IT9' | 'IT10' | 'IT11' | 'IT12'
  | 'IT13' | 'IT14';

// ── Per-source standard definition ─────────────────────────────────────────
export interface ToleranceStandard {
  source: ToleranceSource;
  label: string;
  /** Typical IT grade recommended for this process */
  defaultITGrade: ITGrade;
  /** Tightest achievable IT grade (anything tighter triggers a warning) */
  capabilityITGrade: ITGrade;
  /** Default sigma level for RSS analysis */
  defaultSigma: number;
  description: string;
}

// ── Custom rule ─────────────────────────────────────────────────────────────
export interface CustomRule {
  id: string;
  name: string;
  source: ToleranceSource;
  dimensionRange: DimensionRange;
  /** Symmetric half-tolerance in mm */
  tolerance: number;
  description?: string;
}

// ── Full config ─────────────────────────────────────────────────────────────
export interface ToleranceConfig {
  standards: ToleranceStandard[];
  customRules: CustomRule[];
}

// ── Suggestion result ───────────────────────────────────────────────────────
export interface ToleranceSuggestion {
  /** Suggested symmetric half-tolerance in mm */
  suggestedTol: number;
  itGrade: ITGrade;
  label: string;
  /** true if the currently entered tol is tighter than process capability */
  isTooTight: boolean;
  /** Tightest achievable tolerance for this source + nominal */
  capabilityLimit: number;
}
