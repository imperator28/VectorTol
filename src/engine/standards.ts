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

/** Replicate the projectStore pass check against wcMin/wcMax */
function checkPass(nomGap: number, tol: number, target: TargetScenario): boolean {
  const lo = target.minGap !== null ? parseFloat(target.minGap) : null;
  const hi = target.maxGap !== null ? parseFloat(target.maxGap) : null;
  const minVal = nomGap - tol;
  const maxVal = nomGap + tol;
  switch (target.type) {
    case 'clearance': return lo !== null ? minVal >= lo : true;
    case 'proud':     return lo !== null ? minVal >= lo : minVal > 0;
    case 'recess':    return hi !== null ? maxVal <= hi : maxVal < 0;
    case 'interference': return (lo === null || maxVal <= lo) && (hi === null || minVal >= hi);
    case 'flush':
    case 'custom':    return (lo === null || minVal >= lo) && (hi === null || maxVal <= hi);
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
  const nominalGapViolation = wcBudget !== null && wcBudget < 0;

  const strategies: AllocationStrategy[] = [];
  const EPS = 1e-9;

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
        rowChanges: buildChanges(proposedTols, notes, nominalShifts, false),
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
