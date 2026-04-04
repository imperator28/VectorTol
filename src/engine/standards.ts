/**
 * ISO 286-1 Fundamental Tolerances (IT Grades) lookup engine.
 *
 * Values are symmetric half-tolerances in mm (converted from µm).
 * Reference: ISO 286-1:2010, Table 1.
 */

import type { ITGrade, ToleranceSuggestion, ToleranceStandard } from '../types/standards';
import type { ToleranceSource } from '../types/grid';

// ── ISO 286 IT Grade table ──────────────────────────────────────────────────
// Format: [minExclusive, maxInclusive, IT5..IT14] (values in µm)
// Ranges in mm, tolerances in µm

const ISO_TABLE: [number, number, number, number, number, number, number, number, number, number, number, number][] = [
  //  min   max   IT5  IT6  IT7  IT8  IT9  IT10 IT11 IT12 IT13  IT14
  [     0,    3,    4,   6,  10,  14,  25,  40,  60,  100,  140,  250],
  [     3,    6,    5,   8,  12,  18,  30,  48,  75,  120,  180,  300],
  [     6,   10,    6,   9,  15,  22,  36,  58,  90,  150,  220,  360],
  [    10,   18,    8,  11,  18,  27,  43,  70, 110,  180,  270,  430],
  [    18,   30,    9,  13,  21,  33,  52,  84, 130,  210,  330,  520],
  [    30,   50,   11,  16,  25,  39,  62, 100, 160,  250,  390,  620],
  [    50,   80,   13,  19,  30,  46,  74, 120, 190,  300,  460,  740],
  [    80,  120,   15,  22,  35,  54,  87, 140, 220,  350,  540,  870],
  [   120,  180,   18,  25,  40,  63, 100, 160, 250,  400,  630, 1000],
  [   180,  250,   20,  29,  46,  72, 115, 185, 290,  460,  720, 1150],
  [   250,  315,   23,  32,  52,  81, 130, 210, 320,  520,  810, 1300],
  [   315,  400,   25,  36,  57,  89, 140, 230, 360,  570,  890, 1400],
  [   400,  500,   27,  40,  63,  97, 155, 250, 400,  630,  970, 1550],
];

// Grade index within the row (IT5=0 through IT14=9)
const GRADE_INDEX: Record<ITGrade, number> = {
  IT1: -4, IT2: -3, IT3: -2, IT4: -1, // not in table (extrapolated below)
  IT5: 0, IT6: 1, IT7: 2, IT8: 3, IT9: 4,
  IT10: 5, IT11: 6, IT12: 7, IT13: 8, IT14: 9,
};

/**
 * Look up the ISO 286 IT grade tolerance for a given nominal size.
 * Returns symmetric half-tolerance in mm. Returns null if out of range.
 */
export function iso286Tolerance(nominal: number, grade: ITGrade): number | null {
  const absNom = Math.abs(nominal);
  const idx = GRADE_INDEX[grade];
  if (idx < 0) return null; // IT1–IT4 not in simplified table

  for (const row of ISO_TABLE) {
    const [lo, hi, ...values] = row;
    if (absNom > lo && absNom <= hi) {
      return (values[idx] ?? 0) / 1000 / 2; // µm → mm, full tol → half-range
    }
  }
  // Handle nominal = 0 exactly (use ≤3 row)
  if (absNom === 0) {
    const row = ISO_TABLE[0]!;
    const values = row.slice(2) as number[];
    return (values[idx] ?? 0) / 1000 / 2;
  }
  return null; // > 500mm not supported
}

// ── Default process standards ───────────────────────────────────────────────
export const DEFAULT_STANDARDS: ToleranceStandard[] = [
  {
    source: 'machining',
    label: 'CNC Machining',
    defaultITGrade: 'IT8',
    capabilityITGrade: 'IT6',
    defaultSigma: 3,
    description: 'General CNC turning/milling. Typical IT8; achievable IT6 with precision setups.',
  },
  {
    source: 'mold',
    label: 'Injection Molding',
    defaultITGrade: 'IT11',
    capabilityITGrade: 'IT9',
    defaultSigma: 3,
    description: 'Injection-molded plastic. Typical IT11; achievable IT9 for precision tooling.',
  },
  {
    source: 'casting',
    label: 'Die / Sand Casting',
    defaultITGrade: 'IT13',
    capabilityITGrade: 'IT11',
    defaultSigma: 3,
    description: 'Cast metal parts. Typical IT13; achievable IT11 for die casting.',
  },
  {
    source: 'stamping',
    label: 'Metal Stamping',
    defaultITGrade: 'IT11',
    capabilityITGrade: 'IT9',
    defaultSigma: 3,
    description: 'Progressive die stamping. Typical IT11; achievable IT9 for precision blanking.',
  },
  {
    source: 'assembly',
    label: 'Assembly / Fastening',
    defaultITGrade: 'IT10',
    capabilityITGrade: 'IT8',
    defaultSigma: 3,
    description: 'Assembly gaps and fastener positions. Typical IT10.',
  },
  {
    source: 'material',
    label: 'Raw Material / Stock',
    defaultITGrade: 'IT12',
    capabilityITGrade: 'IT11',
    defaultSigma: 3,
    description: 'Bar stock, sheet, extrusion dimensions. Typical IT12.',
  },
  {
    source: 'custom',
    label: 'Custom',
    defaultITGrade: 'IT9',
    capabilityITGrade: 'IT6',
    defaultSigma: 3,
    description: 'User-defined process. No automatic suggestion.',
  },
];

// ── Suggestion function ─────────────────────────────────────────────────────

/**
 * Given a tolerance source, nominal dimension, currently entered tolerance,
 * and the configured standards, return a suggestion object.
 */
export function getSuggestion(
  source: ToleranceSource,
  nominal: number,
  currentTol: number | null,
  standards: ToleranceStandard[],
): ToleranceSuggestion | null {
  if (source === 'custom') return null;

  const std = standards.find((s) => s.source === source) ??
    DEFAULT_STANDARDS.find((s) => s.source === source);
  if (!std) return null;

  const suggestedTol = iso286Tolerance(nominal, std.defaultITGrade);
  const capabilityTol = iso286Tolerance(nominal, std.capabilityITGrade);
  if (suggestedTol === null || capabilityTol === null) return null;

  const isTooTight =
    currentTol !== null && currentTol < capabilityTol && currentTol > 0;

  return {
    suggestedTol,
    itGrade: std.defaultITGrade,
    label: std.label,
    isTooTight,
    capabilityLimit: capabilityTol,
  };
}

// ── Goal Seek / Tolerance Allocation ───────────────────────────────────────

export interface GoalSeekRow {
  id: string;
  component: string;
  dimId: string;
  source: ToleranceSource;
  nominal: number;
  currentTol: number;
  currentContrib: number;       // % contribution
  suggestedTol: number | null;  // null if no tighter option available
  newContrib: number | null;
  capabilityLimit: number | null;
}

export interface GoalSeekResult {
  rows: GoalSeekRow[];
  currentWcTol: number;
  newWcTol: number;
  reduction: number;            // mm reduction in WC tolerance
  reductionPct: number;         // % reduction
}

/**
 * Compute tolerance allocation suggestions.
 * Identifies the top contributors and suggests tightening them to their
 * process capability limit, then computes the new total WC tolerance.
 */
export function runGoalSeek(
  rows: { id: string; component: string; dimId: string; source: ToleranceSource; nominal: string; tolSymmetric: string | null; tolPlus: string | null; tolMinus: string | null }[],
  standards: ToleranceStandard[],
): GoalSeekResult {
  // Compute current centered tolerances
  const parsed = rows.map((r) => {
    const nom = Math.abs(parseFloat(r.nominal) || 0);
    let tol: number;
    if (r.tolSymmetric !== null && r.tolSymmetric !== '') {
      tol = Math.abs(parseFloat(r.tolSymmetric) || 0);
    } else if (r.tolPlus !== null && r.tolMinus !== null) {
      const tp = parseFloat(r.tolPlus) || 0;
      const tm = parseFloat(r.tolMinus) || 0;
      tol = (tp - tm) / 2;
    } else {
      tol = 0;
    }
    return { ...r, nom, tol };
  });

  const currentWcTol = parsed.reduce((sum, r) => sum + r.tol, 0);

  const result: GoalSeekRow[] = parsed.map((r) => {
    const std = standards.find((s) => s.source === r.source) ??
      DEFAULT_STANDARDS.find((s) => s.source === r.source);
    const currentContrib = currentWcTol > 0 ? (r.tol / currentWcTol) * 100 : 0;

    const capTol = std ? iso286Tolerance(r.nom, std.capabilityITGrade) : null;
    const suggestedTol =
      capTol !== null && capTol < r.tol ? capTol : null;

    return {
      id: r.id,
      component: r.component,
      dimId: r.dimId,
      source: r.source,
      nominal: r.nom,
      currentTol: r.tol,
      currentContrib,
      suggestedTol,
      newContrib: null,   // filled below
      capabilityLimit: capTol,
    };
  });

  // Compute new WC total with suggested tolerances applied
  const newWcTol = result.reduce((sum, r) => {
    return sum + (r.suggestedTol ?? r.currentTol);
  }, 0);

  // Fill newContrib
  for (const r of result) {
    const effectiveTol = r.suggestedTol ?? r.currentTol;
    r.newContrib = newWcTol > 0 ? (effectiveTol / newWcTol) * 100 : 0;
  }

  const reduction = currentWcTol - newWcTol;
  const reductionPct = currentWcTol > 0 ? (reduction / currentWcTol) * 100 : 0;

  return { rows: result, currentWcTol, newWcTol, reduction, reductionPct };
}
