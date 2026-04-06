/**
 * ISO 286-1 Fundamental Tolerances (IT Grades) lookup engine.
 *
 * Values are symmetric half-tolerances in mm (converted from µm).
 * Reference: ISO 286-1:2010, Table 1.
 */

import type { ITGrade, ToleranceSuggestion, ToleranceStandard } from '../types/standards';
import type { ToleranceSource } from '../types/grid';
import type { TargetScenario } from '../types/project';

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

// All grades available in the table, finest to coarsest
const ALL_IT_GRADES: ITGrade[] = ['IT5', 'IT6', 'IT7', 'IT8', 'IT9', 'IT10', 'IT11', 'IT12', 'IT13', 'IT14'];

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

/**
 * Infer the nearest ISO 286 IT grade for a given nominal dimension and
 * measured half-tolerance. Useful for understanding a part's current quality level.
 */
export function inferITGrade(nominal: number, tol: number): ITGrade | null {
  const absNom = Math.abs(nominal);
  const absTol = Math.abs(tol);
  let best: ITGrade | null = null;
  let bestDelta = Infinity;
  for (const grade of ALL_IT_GRADES) {
    const t = iso286Tolerance(absNom, grade);
    if (t === null) continue;
    const delta = Math.abs(t - absTol);
    if (delta < bestDelta) { bestDelta = delta; best = grade; }
  }
  return best;
}

/** Move one IT grade tighter; returns null if already at IT5 */
function nextTighter(grade: ITGrade): ITGrade | null {
  const idx = ALL_IT_GRADES.indexOf(grade);
  return idx > 0 ? ALL_IT_GRADES[idx - 1]! : null;
}

/** Move one IT grade looser; returns null if already at IT14 */
function nextLooser(grade: ITGrade): ITGrade | null {
  const idx = ALL_IT_GRADES.indexOf(grade);
  return idx >= 0 && idx < ALL_IT_GRADES.length - 1 ? ALL_IT_GRADES[idx + 1]! : null;
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

// ── Smart Tolerance Allocation ──────────────────────────────────────────────

/** Input row for the smart allocation engine */
export interface AllocationInputRow {
  id: string;
  component: string;
  dimId: string;
  source: ToleranceSource;
  direction: 1 | -1;
  nominal: string;
  tolSymmetric: string | null;
  tolPlus: string | null;
  tolMinus: string | null;
  sigma: string;
}

/** Per-row summary in the allocation result */
export interface SmartAllocationRow {
  id: string;
  component: string;
  dimId: string;
  source: ToleranceSource;
  nominal: number;
  direction: 1 | -1;
  centeredTol: number;          // effective half-tolerance used in the stack
  centeredNom: number;          // direction × nominal (signed contribution to gap)
  contrib: number;              // % share of WC total
  inferredITGrade: ITGrade | null;  // nearest IT grade for current tol + nominal
  capabilityTol: number | null;     // tightest achievable half-tolerance
  capabilityITGrade: ITGrade | null;
  sigma: number;
}

/** A proposed change to one row within a strategy */
export interface RowChange {
  rowId: string;
  component: string;
  dimId: string;
  fromTol: number;
  fromITGrade: ITGrade | null;
  toTol: number;
  toITGrade: ITGrade | null;
  isLoosen: boolean;
  /** One-directional shift: nominal mid-point moves by this amount */
  nominalShift: number;
  note: string;
  /**
   * For asymmetric-shift rows only: the exact +/− tolerance values to apply.
   * When present, apply as asymmetric (tolSymmetric → null, tolPlus/tolMinus set explicitly).
   * When absent, apply as symmetric (tolSymmetric = toTol).
   */
  applyTolPlus?: number;
  applyTolMinus?: number;
}

/** One proposed allocation strategy */
export interface AllocationStrategy {
  id: 'proportional' | 'top-contributors' | 'grade-step' | 'asymmetric-shift' | 'relaxation';
  label: string;
  description: string;
  recommended: boolean;
  feasible: boolean;
  infeasibleReason?: string;
  newWcTol: number;
  newRssTol: number;
  newNomGap: number;      // may differ from original when shifts are applied
  wcPassAfter: boolean;
  rssPassAfter: boolean;
  rowChanges: RowChange[];
}

/** Full result from runSmartAllocation */
export interface SmartAllocationResult {
  nominalGap: number;
  currentWcTol: number;
  currentRssTol: number;
  /** Maximum WC tolerance permissible to satisfy design intent (null = unconstrained) */
  wcBudget: number | null;
  wcCurrentlyPasses: boolean;
  rssCurrentlyPasses: boolean;
  /** true if nominalGap itself violates intent regardless of tolerance */
  nominalGapViolation: boolean;
  rows: SmartAllocationRow[];
  strategies: AllocationStrategy[];
}

// ── Internal helpers ────────────────────────────────────────────────────────

/** Parse effective half-tolerance from the three tolerance fields */
function parseCenteredTol(
  tolSymmetric: string | null,
  tolPlus: string | null,
  tolMinus: string | null,
): number {
  if (tolSymmetric !== null && tolSymmetric !== '') {
    return Math.abs(parseFloat(tolSymmetric) || 0);
  }
  if (tolPlus !== null && tolMinus !== null) {
    const tp = Math.abs(parseFloat(tolPlus) || 0);
    const tm = Math.abs(parseFloat(tolMinus) || 0);
    return (tp + tm) / 2;
  }
  return 0;
}

/**
 * Maximum WC tolerance allowable to satisfy design intent.
 * Derived by inverting the pass condition for each target type.
 * A negative return value means the nominal gap itself is on the wrong side.
 */
function wcTolBudget(nomGap: number, target: TargetScenario): number | null {
  const lo = target.minGap !== null ? parseFloat(target.minGap) : null;
  const hi = target.maxGap !== null ? parseFloat(target.maxGap) : null;

  switch (target.type) {
    case 'clearance':
    case 'proud':
      // wcMin = nomGap - wcTol >= lo  →  wcTol <= nomGap - lo
      return lo !== null ? nomGap - lo : null;

    case 'recess':
      // wcMax = nomGap + wcTol <= hi  →  wcTol <= hi - nomGap
      return hi !== null ? hi - nomGap : null;

    case 'interference':
      // evaluatePass: wcMax <= lo (minGap) AND wcMin >= hi (maxGap)
      // wcTol <= lo - nomGap  AND  wcTol <= nomGap - hi
      if (lo !== null && hi !== null) return Math.min(lo - nomGap, nomGap - hi);
      if (lo !== null) return lo - nomGap;
      if (hi !== null) return nomGap - hi;
      return null;

    case 'flush':
    case 'custom':
      // wcMin >= lo AND wcMax <= hi
      // wcTol <= nomGap - lo  AND  wcTol <= hi - nomGap
      if (lo !== null && hi !== null) return Math.min(nomGap - lo, hi - nomGap);
      if (lo !== null) return nomGap - lo;
      if (hi !== null) return hi - nomGap;
      return null;
  }
}

/** RSS tolerance = sqrt(sum(centeredTol_i^2)) — matches rss.ts formula */
function computeRss(tols: number[]): number {
  return Math.sqrt(tols.reduce((s, t) => s + t * t, 0));
}

const COMPARISON_EPS = 1e-9;

function normalizeNearZero(value: number): number {
  return Math.abs(value) <= COMPARISON_EPS ? 0 : value;
}

/** Replicate the projectStore pass check against wcMin/wcMax */
function checkPass(nomGap: number, tol: number, target: TargetScenario): boolean {
  const lo = target.minGap !== null ? parseFloat(target.minGap) : null;
  const hi = target.maxGap !== null ? parseFloat(target.maxGap) : null;
  const minVal = normalizeNearZero(nomGap - tol);
  const maxVal = normalizeNearZero(nomGap + tol);
  switch (target.type) {
    case 'clearance': return lo !== null ? minVal >= lo - COMPARISON_EPS : true;
    case 'proud':     return lo !== null ? minVal >= lo - COMPARISON_EPS : minVal > -COMPARISON_EPS;
    case 'recess':    return hi !== null ? maxVal <= hi + COMPARISON_EPS : maxVal < COMPARISON_EPS;
    case 'interference':
      return (lo === null || maxVal <= lo + COMPARISON_EPS) && (hi === null || minVal >= hi - COMPARISON_EPS);
    case 'flush':
    case 'custom':
      return (lo === null || minVal >= lo - COMPARISON_EPS) && (hi === null || maxVal <= hi + COMPARISON_EPS);
  }
}

// ── Main function ───────────────────────────────────────────────────────────

/**
 * Smart tolerance allocation.
 *
 * Analyses the current stack against the design intent and proposes up to five
 * engineering-grade strategies:
 *
 *  1. Proportional – scale every row by the same factor to hit the budget exactly.
 *     Preserves the relative "difficulty" of each dimension; no single part is
 *     singled out. Respects ISO 286 capability floors.
 *
 *  2. Top-Contributors – tighten only the largest contributors, one grade at a
 *     time, until the budget is met. Minimises disruption to already-tight parts.
 *
 *  3. IT Grade Step – move every dimension one IT grade finer. The most practical
 *     conversation with a supplier: "please hold one grade tighter." Works even
 *     when exact numeric budgets are unclear.
 *
 *  4. Asymmetric Shift (one-directional tolerance) – for single-bound targets
 *     (clearance / proud / recess) only. Instead of tightening, convert the top
 *     contributing symmetric tolerances to one-sided tolerances. The tolerance
 *     WIDTH stays the same; the midpoint shifts toward the safe side. No extra
 *     manufacturing difficulty; gains are purely from re-centring the distribution.
 *     Shown when WC fails but the nominal gap is on the correct side of the limit.
 *
 *  5. Relaxation – shown when design intent is already met. Identifies dimensions
 *     that can be loosened one IT grade without violating the budget, saving cost.
 */
export function runSmartAllocation(
  inputRows: AllocationInputRow[],
  target: TargetScenario,
  standards: ToleranceStandard[],
): SmartAllocationResult {
  // ── 1. Parse ──────────────────────────────────────────────────────────────
  const parsed: SmartAllocationRow[] = inputRows.map((r) => {
    const nom = parseFloat(r.nominal) || 0;
    const sigma = parseFloat(r.sigma) || 3;
    const centeredTol = parseCenteredTol(r.tolSymmetric, r.tolPlus, r.tolMinus);
    // Centered nominal = direction × nominal (asymmetric offset ignored here — small)
    const centeredNom = r.direction * nom;

    const inferredITGrade = inferITGrade(Math.abs(nom), centeredTol);

    const std = standards.find((s) => s.source === r.source) ??
      DEFAULT_STANDARDS.find((s) => s.source === r.source);
    const capabilityTol = std ? iso286Tolerance(Math.abs(nom), std.capabilityITGrade) : null;
    const capabilityITGrade = std?.capabilityITGrade ?? null;

    return {
      id: r.id,
      component: r.component,
      dimId: r.dimId,
      source: r.source,
      nominal: nom,
      direction: r.direction,
      centeredTol,
      centeredNom,
      contrib: 0,
      inferredITGrade,
      capabilityTol,
      capabilityITGrade,
      sigma,
    };
  });

  // ── 2. Stack totals ───────────────────────────────────────────────────────
  const wcTol  = parsed.reduce((s, r) => s + r.centeredTol, 0);
  const rssTol = computeRss(parsed.map((r) => r.centeredTol));
  const nomGap = parsed.reduce((s, r) => s + r.centeredNom, 0);

  for (const r of parsed) {
    r.contrib = wcTol > 0 ? (r.centeredTol / wcTol) * 100 : 0;
  }

  // ── 3. Budget & pass checks ───────────────────────────────────────────────
  const wcBudget = wcTolBudget(nomGap, target);
  const wcCurrentlyPasses  = checkPass(nomGap, wcTol,  target);
  const rssCurrentlyPasses = checkPass(nomGap, rssTol, target);

  // Does the nominal gap itself already violate the intent? (tolerance can't save it)
  const nominalGapViolation = wcBudget !== null && wcBudget < -COMPARISON_EPS;

  const strategies: AllocationStrategy[] = [];
  const EPS = COMPARISON_EPS;

  // ── Helper: build RowChange list for a proposed tolerance array ───────────
  function buildChanges(
    proposedTols: number[],
    notes: string[],
    nominalShifts: number[],
    isLoosen: boolean,
  ): RowChange[] {
    return parsed
      .map((r, i) => ({
        rowId: r.id,
        component: r.component,
        dimId: r.dimId,
        fromTol: r.centeredTol,
        fromITGrade: r.inferredITGrade,
        toTol: proposedTols[i]!,
        toITGrade: inferITGrade(Math.abs(r.nominal), proposedTols[i]!),
        isLoosen,
        nominalShift: nominalShifts[i]!,
        note: notes[i]!,
      }))
      .filter((c) => Math.abs(c.toTol - c.fromTol) > 0.0001 || Math.abs(c.nominalShift) > 0.0001);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FAILING strategies (only generated when not currently passing WC)
  // ══════════════════════════════════════════════════════════════════════════
  if (!wcCurrentlyPasses && !nominalGapViolation && wcBudget !== null) {
    const scaleFactor = Math.min(1, wcBudget / wcTol); // capped at 1 (we don't loosen here)

    // ── Strategy A: Proportional ──────────────────────────────────────────
    {
      const proposedTols = parsed.map((r) => {
        const raw = r.centeredTol * scaleFactor;
        // ISO 286 size-corrected floor: can't go below process capability
        const floor = r.capabilityTol ?? 0;
        return Math.max(raw, floor);
      });
      const newWc  = proposedTols.reduce((s, t) => s + t, 0);
      const newRss = computeRss(proposedTols);
      const feasible = newWc <= wcBudget + EPS;
      const pct = (scaleFactor * 100).toFixed(0);

      const notes = parsed.map((r, i) => {
        const fromGrade = r.inferredITGrade ?? '?';
        const toGrade   = inferITGrade(Math.abs(r.nominal), proposedTols[i]!) ?? '?';
        return `×${pct}% → ${fromGrade}→${toGrade}`;
      });

      strategies.push({
        id: 'proportional',
        label: 'Proportional Scaling',
        description:
          `Scale all tolerances uniformly to ${pct}% of current values. ` +
          'Preserves each part\'s relative share of the budget. ISO 286 capability floors apply.',
        recommended: false,
        feasible,
        infeasibleReason: feasible ? undefined
          : 'Even at process capability limits, the sum of tolerances exceeds the budget. Consider revising nominal dimensions.',
        newWcTol: newWc,
        newRssTol: newRss,
        newNomGap: nomGap,
        wcPassAfter: checkPass(nomGap, newWc, target),
        rssPassAfter: checkPass(nomGap, newRss, target),
        rowChanges: buildChanges(proposedTols, notes, parsed.map(() => 0), false),
      });
    }

    // ── Strategy B: Top Contributors ──────────────────────────────────────
    {
      // Sort indices by centeredTol descending (biggest contributors first)
      const sortedIdx = parsed.map((_, i) => i).sort((a, b) => parsed[b]!.centeredTol - parsed[a]!.centeredTol);
      const proposedTols = parsed.map((r) => r.centeredTol);
      let remaining = wcTol - wcBudget; // how much we still need to cut

      for (const idx of sortedIdx) {
        if (remaining <= EPS) break;
        const r = parsed[idx]!;
        const floor = r.capabilityTol ?? 0;
        if (floor < r.centeredTol) {
          const saving = Math.min(r.centeredTol - floor, remaining);
          proposedTols[idx] = r.centeredTol - saving;
          remaining -= saving;
        }
      }

      const newWc  = proposedTols.reduce((s, t) => s + t, 0);
      const newRss = computeRss(proposedTols);
      const feasible = newWc <= wcBudget + EPS;

      const notes = parsed.map((r, i) => {
        if (Math.abs(proposedTols[i]! - r.centeredTol) < 0.0001) return 'Unchanged';
        const capGrade = r.capabilityITGrade ?? '?';
        return `Tightened to capability (${capGrade})`;
      });

      strategies.push({
        id: 'top-contributors',
        label: 'Top-Contributor Tightening',
        description:
          'Tighten only the largest contributors, in order of impact, until the budget is met. ' +
          'Leaves already-tight parts untouched. Requires tighter specs on fewer drawings.',
        recommended: false,
        feasible,
        infeasibleReason: feasible ? undefined
          : 'Even tightening top contributors to their process capability limits is not enough. ' +
            'Consider also revising nominal dimensions or the design intent limits.',
        newWcTol: newWc,
        newRssTol: newRss,
        newNomGap: nomGap,
        wcPassAfter: checkPass(nomGap, newWc, target),
        rssPassAfter: checkPass(nomGap, newRss, target),
        rowChanges: buildChanges(proposedTols, notes, parsed.map(() => 0), false),
      });
    }

    // ── Strategy C: IT Grade Step ─────────────────────────────────────────
    {
      const proposedTols = parsed.map((r) => {
        if (r.inferredITGrade === null) return r.centeredTol;
        const nextGrade = nextTighter(r.inferredITGrade);
        if (nextGrade === null) return r.centeredTol;
        const nextTol = iso286Tolerance(Math.abs(r.nominal), nextGrade);
        if (nextTol === null || nextTol >= r.centeredTol) return r.centeredTol;
        // Respect capability floor
        const floor = r.capabilityTol ?? 0;
        return Math.max(nextTol, floor);
      });

      const newWc  = proposedTols.reduce((s, t) => s + t, 0);
      const newRss = computeRss(proposedTols);
      const feasible = newWc <= wcBudget + EPS;

      const notes = parsed.map((r, i) => {
        const fromGrade = r.inferredITGrade;
        const toGrade   = inferITGrade(Math.abs(r.nominal), proposedTols[i]!);
        if (!fromGrade) return 'No IT grade inferred (nominal = 0 or out of range)';
        if (proposedTols[i]! >= r.centeredTol) return `Already at capability limit (${r.capabilityITGrade ?? fromGrade})`;
        return `${fromGrade} → ${toGrade ?? '?'}`;
      });

      strategies.push({
        id: 'grade-step',
        label: 'One IT Grade Tighter (All Dimensions)',
        description:
          'Specify each dimension one ISO 286 grade finer. Most practical supplier conversation: ' +
          '"please hold one grade tighter." Size-scaled — a Ø100 part tightens proportionally more ' +
          'than a Ø10 part, matching the ISO fundamental-deviation scaling law.',
        recommended: false,
        feasible,
        infeasibleReason: feasible ? undefined
          : 'One IT grade step reduces the WC total but is not sufficient to meet design intent. ' +
            'Consider combining with the Top-Contributor approach, or stepping two grades on the biggest contributors.',
        newWcTol: newWc,
        newRssTol: newRss,
        newNomGap: nomGap,
        wcPassAfter: checkPass(nomGap, newWc, target),
        rssPassAfter: checkPass(nomGap, newRss, target),
        rowChanges: buildChanges(proposedTols, notes, parsed.map(() => 0), false),
      });
    }

    // ── Strategy D: Asymmetric (one-directional) shift ────────────────────
    // Applicable for single-bound targets where the nominal gap is on the
    // correct side. Converting symmetric ±t to one-sided shifts the distribution
    // midpoint toward the safe side by t without changing the tolerance width.
    // The manufacturing process holds the same total band; only the datum shifts.
    const singleBoundTargets = ['clearance', 'proud', 'recess'];
    const canShift = singleBoundTargets.includes(target.type) && !nominalGapViolation;

    if (canShift) {
      // Direction of shift: +1 means we want to increase the gap value
      const wantHigherGap = target.type === 'clearance' || target.type === 'proud';

      // Gap increase per row when its tolerance is flipped one-sided:
      // Shifting from ±t to one-sided adds t to the signed nominal contribution.
      // For direction=+1 rows: flip to +2t/–0 → centeredNom increases by t
      // For direction=–1 rows: flip to +0/–2t → centeredNom (= –nom) also increases by t
      // Net effect: the gap increases by t for ANY direction, as long as we flip
      // the correct side. So effective gap gain per row = centeredTol.
      //
      // When we want LOWER gap (recess), flip the opposite side → gain = centeredTol in –dir.
      // Treat effective gain = centeredTol for both cases.

      const sortedIdx = parsed.map((_, i) => i).sort((a, b) => parsed[b]!.centeredTol - parsed[a]!.centeredTol);
      const shiftedIdx = new Set<number>();
      let gapGain = 0;

      // Gap deficit = how much the gap needs to move to pass
      // For clearance/proud: need wcMin >= lo → nomGap - wcTol >= lo → gap deficit = lo - (nomGap - wcTol) > 0
      const lo = target.minGap !== null ? parseFloat(target.minGap) : null;
      const hi = target.maxGap !== null ? parseFloat(target.maxGap) : null;

      let gapDeficit: number;
      if (wantHigherGap && lo !== null) {
        gapDeficit = lo - (nomGap - wcTol);
      } else if (!wantHigherGap && hi !== null) {
        gapDeficit = nomGap + wcTol - hi;
      } else {
        gapDeficit = 0;
      }

      for (const idx of sortedIdx) {
        if (gapGain >= gapDeficit - EPS) break;
        shiftedIdx.add(idx);
        gapGain += parsed[idx]!.centeredTol;
      }

      const feasible = gapGain >= gapDeficit - EPS;

      // Build proposed state: same tolerances, but shifted nominal
      const proposedTols = parsed.map((r) => r.centeredTol);
      const nominalShifts = parsed.map((r, i) =>
        shiftedIdx.has(i) ? (wantHigherGap ? r.centeredTol : -r.centeredTol) : 0,
      );
      const newNomGap = nomGap + nominalShifts.reduce((s, v) => s + v, 0);
      const newWc  = proposedTols.reduce((s, t) => s + t, 0); // unchanged
      const newRss = computeRss(proposedTols); // unchanged

      const notes = parsed.map((r, i) => {
        if (!shiftedIdx.has(i)) return 'Unchanged — keep symmetric';
        const dir = r.direction;
        if (wantHigherGap) {
          // dir=+1: change ±t → +2t/–0; dir=–1: change ±t → +0/–2t
          return dir === 1
            ? `±${r.centeredTol.toFixed(4)} → +${(r.centeredTol * 2).toFixed(4)}/–0 (one-directional)`
            : `±${r.centeredTol.toFixed(4)} → +0/–${(r.centeredTol * 2).toFixed(4)} (one-directional)`;
        } else {
          return dir === 1
            ? `±${r.centeredTol.toFixed(4)} → +0/–${(r.centeredTol * 2).toFixed(4)} (one-directional)`
            : `±${r.centeredTol.toFixed(4)} → +${(r.centeredTol * 2).toFixed(4)}/–0 (one-directional)`;
        }
      });

      // Enrich asymmetric rows with the explicit tolPlus / tolMinus to apply
      const rawAsymChanges = buildChanges(proposedTols, notes, nominalShifts, false);
      const asymRowChanges = rawAsymChanges.map((c) => {
        if (Math.abs(c.nominalShift) < 0.0001) return c; // unchanged row
        const r = parsed.find((p) => p.id === c.rowId)!;
        const t = r.centeredTol;
        const dir = r.direction;
        let applyTolPlus: number;
        let applyTolMinus: number;
        if (wantHigherGap) {
          applyTolPlus  = dir === 1 ? 2 * t : 0;
          applyTolMinus = dir === 1 ? 0      : -2 * t;
        } else {
          applyTolPlus  = dir === 1 ? 0      : 2 * t;
          applyTolMinus = dir === 1 ? -2 * t : 0;
        }
        return { ...c, applyTolPlus, applyTolMinus };
      });

      strategies.push({
        id: 'asymmetric-shift',
        label: 'One-Directional Tolerance (Nominal Shift)',
        description:
          'Convert the largest symmetric tolerances to one-sided (e.g. ±0.05 → +0.10/–0.00). ' +
          'The tolerance BAND stays the same — no tighter manufacturing — but the midpoint shifts ' +
          'toward the safe side of the design intent. Specify on the drawing with a datum shift. ' +
          'Effective only for single-bound targets (clearance / proud / recess).',
        recommended: false,
        feasible,
        infeasibleReason: feasible ? undefined
          : 'Even flipping all tolerances one-directional cannot fully close the gap deficit. ' +
            'Combine with tightening or revise nominal dimensions.',
        newWcTol: newWc,
        newRssTol: newRss,
        newNomGap,
        wcPassAfter: checkPass(newNomGap, newWc, target),
        rssPassAfter: checkPass(newNomGap, newRss, target),
        rowChanges: asymRowChanges,
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RELAXATION strategy (when already passing)
  // ══════════════════════════════════════════════════════════════════════════
  if (wcCurrentlyPasses && wcBudget !== null) {
    // Attempt to loosen each dimension one IT grade, greedy (biggest margin first)
    const finalTols  = parsed.map((r) => r.centeredTol);
    const finalNotes = parsed.map(() => 'Cannot relax further');
    const margin = wcBudget - wcTol;   // how much headroom we have

    // Greedily loosen all; if total still passes, done. Otherwise loosen one by one.
    const allLoosenTols = parsed.map((r) => {
      if (r.inferredITGrade === null) return r.centeredTol;
      const looserGrade = nextLooser(r.inferredITGrade);
      if (looserGrade === null) return r.centeredTol;
      return iso286Tolerance(Math.abs(r.nominal), looserGrade) ?? r.centeredTol;
    });
    const allLoosenWc = allLoosenTols.reduce((s, t) => s + t, 0);

    if (allLoosenWc <= wcBudget + EPS) {
      // All rows can be loosened simultaneously
      for (let i = 0; i < parsed.length; i++) {
        finalTols[i] = allLoosenTols[i]!;
        const r = parsed[i]!;
        const toGrade = inferITGrade(Math.abs(r.nominal), allLoosenTols[i]!);
        finalNotes[i] = r.inferredITGrade
          ? `${r.inferredITGrade} → ${toGrade ?? '?'} (cost saving)`
          : 'Loosened';
      }
    } else {
      // Loosen in ascending order of cost: rows with smallest absolute savings
      // (to preserve the most margin for rows that benefit most from being loosened)
      const savings = parsed.map((r, i) => ({
        i,
        saving: allLoosenTols[i]! - r.centeredTol,   // positive = loosening
      })).sort((a, b) => b.saving - a.saving);

      let usedMargin = 0;
      for (const { i, saving } of savings) {
        if (usedMargin + saving > margin + EPS) continue; // would overshoot
        finalTols[i] = allLoosenTols[i]!;
        usedMargin += saving;
        const r = parsed[i]!;
        const toGrade = inferITGrade(Math.abs(r.nominal), allLoosenTols[i]!);
        finalNotes[i] = r.inferredITGrade
          ? `${r.inferredITGrade} → ${toGrade ?? '?'} (cost saving)`
          : 'Loosened';
      }
    }

    const relaxedChanges = parsed
      .map((r, i) => ({
        rowId: r.id,
        component: r.component,
        dimId: r.dimId,
        fromTol: r.centeredTol,
        fromITGrade: r.inferredITGrade,
        toTol: finalTols[i]!,
        toITGrade: inferITGrade(Math.abs(r.nominal), finalTols[i]!),
        isLoosen: true,
        nominalShift: 0,
        note: finalNotes[i]!,
      }))
      .filter((c) => Math.abs(c.toTol - c.fromTol) > 0.0001);

    if (relaxedChanges.length > 0) {
      const newWc  = finalTols.reduce((s, t) => s + t, 0);
      const newRss = computeRss(finalTols);
      strategies.push({
        id: 'relaxation',
        label: 'Loosen for Cost Reduction',
        description:
          `Design intent is met with ${margin.toFixed(4)} mm to spare. ` +
          'These dimensions can be loosened one IT grade without violating design intent — ' +
          'reducing machining, inspection, and tooling cost.',
        recommended: true,
        feasible: true,
        newWcTol: newWc,
        newRssTol: newRss,
        newNomGap: nomGap,
        wcPassAfter: true,
        rssPassAfter: checkPass(nomGap, newRss, target),
        rowChanges: relaxedChanges,
      });
    }
  }

  // ── Mark the single best recommended tightening strategy ─────────────────
  if (!wcCurrentlyPasses) {
    // Prefer Top-Contributors if feasible, else Proportional if feasible, else Grade-Step
    const priority: AllocationStrategy['id'][] = ['top-contributors', 'proportional', 'grade-step', 'asymmetric-shift'];
    const rec = priority
      .map((id) => strategies.find((s) => s.id === id))
      .find((s) => s?.feasible);
    if (rec) rec.recommended = true;
  }

  return {
    nominalGap: nomGap,
    currentWcTol: wcTol,
    currentRssTol: rssTol,
    wcBudget,
    wcCurrentlyPasses,
    rssCurrentlyPasses,
    nominalGapViolation,
    rows: parsed,
    strategies,
  };
}

// ── Nominal Adjustment Advisor ──────────────────────────────────────────────

/**
 * Manufacturing adjustability score per process.
 * Reflects the real cost and difficulty of changing a nominal dimension:
 *   1.0 = drawing-only change, zero tooling cost
 *   0.1 = requires expensive retooling or is constrained by standard stock
 */
const SOURCE_ADJUSTABILITY: Record<ToleranceSource, { score: number; note: string }> = {
  assembly:  { score: 1.0, note: 'Assembly gap / designed clearance — ideal; consider a dedicated shim or spacer.' },
  machining: { score: 0.8, note: 'CNC-machined — nominal change is a drawing revision only, no tooling cost.' },
  stamping:  { score: 0.5, note: 'Stamped part — nominal change requires progressive-die tool modification.' },
  mold:      { score: 0.3, note: 'Injection-molded — requires mold modification or insert; expensive.' },
  casting:   { score: 0.2, note: 'Cast part — pattern or die modification needed; high cost and lead time.' },
  material:  { score: 0.1, note: 'Stock material — constrained by standard mill sizes; very limited flexibility.' },
  custom:    { score: 0.5, note: 'Adjustability unknown — verify feasibility with supplier.' },
};

/** Render a 0-3 star rating for the adjustability score */
export function adjustabilityStars(score: number): string {
  if (score >= 0.8) return '★★★';
  if (score >= 0.5) return '★★☆';
  if (score >= 0.2) return '★☆☆';
  return '☆☆☆';
}

// ── Nominal advisor types ────────────────────────────────────────────────────

export interface NominalAdjInputRow {
  id: string;
  component: string;
  dimId: string;
  source: ToleranceSource;
  direction: 1 | -1;
  nominal: number;      // parsed number
  centeredTol: number;  // effective half-tolerance
}

export interface NominalRowInfo {
  id: string;
  component: string;
  dimId: string;
  source: ToleranceSource;
  nominal: number;
  direction: 1 | -1;
  centeredTol: number;
  centeredNom: number;
  adjustabilityScore: number;
  adjustabilityNote: string;
}

export interface NominalChange {
  rowId: string;
  component: string;
  dimId: string;
  /** Change to the raw nominal field on the row (positive = increase the dimension) */
  fromNominal: number;
  toNominal: number;
  delta: number;
  /** |delta| as % of fromNominal — gives a sense of design impact */
  deltaPercent: number;
  note: string;
}

export interface NominalStrategy {
  id: 'closing-link' | 'equal-split' | 'weighted-adjustability';
  label: string;
  description: string;
  recommended: boolean;
  feasible: boolean;
  infeasibleReason?: string;
  newNominalGap: number;
  /** Tolerances unchanged — WC band same width, just shifted */
  currentWcTol: number;
  wcPassAfter: boolean;
  rssPassAfter: boolean;
  changes: NominalChange[];
}

export interface NominalAdvisorResult {
  nominalGap: number;
  currentWcTol: number;
  currentRssTol: number;
  /** How far the mean gap must shift to satisfy design intent (0 = already OK) */
  neededGapShift: number;
  wcCurrentlyPasses: boolean;
  rows: NominalRowInfo[];
  strategies: NominalStrategy[];
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Calculate how far the nominal gap must shift to satisfy WC design intent.
 * Positive = gap must increase, negative = gap must decrease.
 * Returns 0 when already passing.
 */
function computeNeededGapShift(
  nomGap: number,
  wcTol: number,
  target: TargetScenario,
): number {
  if (checkPass(nomGap, wcTol, target)) return 0;

  const lo = target.minGap !== null ? parseFloat(target.minGap) : null;
  const hi = target.maxGap !== null ? parseFloat(target.maxGap) : null;

  switch (target.type) {
    case 'clearance':
    case 'proud':
      // Need wcMin = (nomGap + shift) − wcTol ≥ lo
      return normalizeNearZero(lo !== null ? lo + wcTol - nomGap : 0);

    case 'recess':
      // Need wcMax = (nomGap + shift) + wcTol ≤ hi
      return normalizeNearZero(hi !== null ? hi - wcTol - nomGap : 0);

    case 'interference':
      // Need wcMax ≤ lo AND wcMin ≥ hi
      // Feasible gap: [hi + wcTol, lo − wcTol]; centre = (lo + hi) / 2
      if (lo !== null && hi !== null) return normalizeNearZero((lo + hi) / 2 - nomGap);
      if (lo !== null) return normalizeNearZero(lo - wcTol - nomGap);
      if (hi !== null) return normalizeNearZero(hi + wcTol - nomGap);
      return 0;

    case 'flush':
    case 'custom':
      // Need wcMin ≥ lo AND wcMax ≤ hi; centre at (lo + hi) / 2
      if (lo !== null && hi !== null) return normalizeNearZero((lo + hi) / 2 - nomGap);
      if (lo !== null) return normalizeNearZero(lo + wcTol - nomGap);
      if (hi !== null) return normalizeNearZero(hi - wcTol - nomGap);
      return 0;
  }
}

/**
 * Build a NominalChange for a row, given the gap shift it must deliver.
 * gapShareNeeded = the share of total gap shift this row must provide.
 */
function buildNominalChange(
  row: NominalRowInfo,
  gapShareNeeded: number,
  note: string,
): NominalChange {
  // direction × Δnominal = gapShareNeeded → Δnominal = gapShareNeeded / direction
  const delta = gapShareNeeded / row.direction;
  const toNominal = row.nominal + delta;
  const pct = row.nominal !== 0
    ? (Math.abs(delta) / Math.abs(row.nominal)) * 100
    : 0;
  return {
    rowId: row.id,
    component: row.component,
    dimId: row.dimId,
    fromNominal: row.nominal,
    toNominal,
    delta,
    deltaPercent: pct,
    note,
  };
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Nominal Adjustment Advisor.
 *
 * Answers: "Instead of tightening tolerances, which nominal dimensions
 * should change, and by how much, to satisfy design intent?"
 *
 * Three strategies:
 *
 *  1. Closing Link — assign 100% of the required gap shift to the single
 *     most adjustable (highest-score) unlocked dimension. Classic GD&T
 *     compensating link. One drawing change; all tolerances unchanged.
 *
 *  2. Equal Distribution — split the shift equally across all unlocked
 *     dimensions. Minimises the per-part change at the cost of more
 *     drawing revisions.
 *
 *  3. Flexibility-Weighted — weight each dimension's share by its
 *     manufacturing adjustability score. Assembly gaps / machined features
 *     absorb more; cast or moulded parts absorb less. Most realistic for
 *     a production redesign.
 *
 * lockedIds: set of row IDs the user has marked as non-adjustable (standard
 * parts, purchased components, customer-defined dimensions).
 */
export function runNominalAdvisor(
  inputRows: NominalAdjInputRow[],
  target: TargetScenario,
  lockedIds: Set<string>,
): NominalAdvisorResult {
  // ── Parse ─────────────────────────────────────────────────────────────────
  const rows: NominalRowInfo[] = inputRows.map((r) => ({
    id: r.id,
    component: r.component,
    dimId: r.dimId,
    source: r.source,
    nominal: r.nominal,
    direction: r.direction,
    centeredTol: r.centeredTol,
    centeredNom: r.direction * r.nominal,
    adjustabilityScore: SOURCE_ADJUSTABILITY[r.source]?.score ?? 0.5,
    adjustabilityNote: SOURCE_ADJUSTABILITY[r.source]?.note ?? '',
  }));

  // ── Stack totals ──────────────────────────────────────────────────────────
  const nomGap = rows.reduce((s, r) => s + r.centeredNom, 0);
  const wcTol  = rows.reduce((s, r) => s + r.centeredTol, 0);
  const rssTol = computeRss(rows.map((r) => r.centeredTol));

  const wcCurrentlyPasses = checkPass(nomGap, wcTol, target);

  // ── Needed shift ──────────────────────────────────────────────────────────
  const neededGapShift = computeNeededGapShift(nomGap, wcTol, target);

  // ── Adjustable rows (unlocked, score > 0.05) ─────────────────────────────
  const adjustable = rows.filter(
    (r) => !lockedIds.has(r.id) && (SOURCE_ADJUSTABILITY[r.source]?.score ?? 0) > 0.05,
  );

  const strategies: NominalStrategy[] = [];
  const EPS2 = COMPARISON_EPS;

  if (Math.abs(neededGapShift) > EPS2 && adjustable.length > 0) {

    // ── Strategy 1: Closing Link ───────────────────────────────────────────
    {
      // Sort: highest adjustability score first; break ties by larger nominal
      // (a larger part can absorb the same absolute delta at a smaller %)
      const sorted = [...adjustable].sort((a, b) => {
        const ds = b.adjustabilityScore - a.adjustabilityScore;
        if (Math.abs(ds) > 0.01) return ds;
        return Math.abs(b.nominal) - Math.abs(a.nominal);
      });
      const link = sorted[0]!;

      const change = buildNominalChange(
        link,
        neededGapShift,
        `Closing link — ${link.adjustabilityNote}`,
      );

      const newNomGap = nomGap + neededGapShift;
      strategies.push({
        id: 'closing-link',
        label: 'Closing Link (Single Dimension)',
        description:
          'Assign the entire gap correction to the most adjustable dimension — the "closing link" ' +
          'of the tolerance chain. One drawing change; all tolerances stay identical. ' +
          'This is the preferred GD&T approach when a dedicated adjusting feature exists.',
        recommended: false,
        feasible: true,
        newNominalGap: newNomGap,
        currentWcTol: wcTol,
        wcPassAfter: checkPass(newNomGap, wcTol, target),
        rssPassAfter: checkPass(newNomGap, rssTol, target),
        changes: [change],
      });
    }

    // ── Strategy 2: Equal Distribution ────────────────────────────────────
    if (adjustable.length >= 1) {
      const sharePerRow = neededGapShift / adjustable.length;
      const changes = adjustable.map((r) =>
        buildNominalChange(
          r,
          sharePerRow,
          `Equal share — ${adjustable.length} dimensions × ${sharePerRow.toFixed(4)} mm gap shift`,
        ),
      );
      const newNomGap = nomGap + neededGapShift;
      strategies.push({
        id: 'equal-split',
        label: 'Equal Distribution',
        description:
          `Split the required gap shift equally across all ${adjustable.length} adjustable ` +
          `dimensions. Each part changes by the same absolute gap contribution. Minimises ` +
          `the largest single-part change; requires ${adjustable.length} drawing revision${adjustable.length > 1 ? 's' : ''}.`,
        recommended: false,
        feasible: true,
        newNominalGap: newNomGap,
        currentWcTol: wcTol,
        wcPassAfter: checkPass(newNomGap, wcTol, target),
        rssPassAfter: checkPass(newNomGap, rssTol, target),
        changes,
      });
    }

    // ── Strategy 3: Flexibility-Weighted ──────────────────────────────────
    if (adjustable.length > 1) {
      const totalScore = adjustable.reduce((s, r) => s + r.adjustabilityScore, 0);
      const changes = adjustable.map((r) => {
        const share = (r.adjustabilityScore / totalScore) * neededGapShift;
        return buildNominalChange(
          r,
          share,
          `${adjustabilityStars(r.adjustabilityScore)} ${(r.adjustabilityScore * 100).toFixed(0)}% adjustability weight`,
        );
      });
      const newNomGap = nomGap + neededGapShift;
      strategies.push({
        id: 'weighted-adjustability',
        label: 'Flexibility-Weighted',
        description:
          'Distribute the gap shift proportionally to each dimension\'s manufacturing adjustability. ' +
          'Assembly gaps and CNC features absorb more of the correction; cast or moulded ' +
          'parts are asked to change less. Minimises total cost of redesign.',
        recommended: false,
        feasible: true,
        newNominalGap: newNomGap,
        currentWcTol: wcTol,
        wcPassAfter: checkPass(newNomGap, wcTol, target),
        rssPassAfter: checkPass(newNomGap, rssTol, target),
        changes,
      });
    }
  }

  // ── Recommend the closing-link when failing (least disruption) ────────────
  if (!wcCurrentlyPasses) {
    const rec = strategies.find((s) => s.id === 'closing-link' && s.feasible);
    if (rec) rec.recommended = true;
  }

  return {
    nominalGap: nomGap,
    currentWcTol: wcTol,
    currentRssTol: rssTol,
    neededGapShift,
    wcCurrentlyPasses,
    rows,
    strategies,
  };
}
