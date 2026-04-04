import { D, Decimal } from './decimal';
import { centeredTolerance } from './calculations';
import { wcGap } from './worstCase';
import type { StackRow } from '../types/grid';
import type { TargetScenario } from '../types/project';

/** RSS Tolerance = sqrt(sum of centeredTol^2) */
export function rssTolerance(rows: StackRow[]): Decimal {
  const sumOfSquares = rows.reduce(
    (sum, row) => {
      const ct = centeredTolerance(row);
      return sum.plus(ct.times(ct));
    },
    D(0),
  );
  return sumOfSquares.sqrt();
}

/** RSS Min = gap - rssTolerance */
export function rssMin(rows: StackRow[]): Decimal {
  return wcGap(rows).minus(rssTolerance(rows));
}

/** RSS Max = gap + rssTolerance */
export function rssMax(rows: StackRow[]): Decimal {
  return wcGap(rows).plus(rssTolerance(rows));
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun, formula 7.1.26).
 * Accurate to ~1.5e-7.
 */
function normalCdf(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * erf);
}

/**
 * RSS Failure Rate: probability that the stack-up result falls outside the target bounds.
 * Uses the gap (mean) and rssTolerance (3σ spread) to compute Z-scores against target.
 * Returns { failureRate: 0-1, yieldPercent: 0-100 }
 */
export function rssFailureRate(
  rows: StackRow[],
  target: TargetScenario,
): { failureRate: number; yieldPercent: number } {
  if (rows.length === 0) return { failureRate: 0, yieldPercent: 100 };

  const gap = wcGap(rows).toNumber();
  const rssTol = rssTolerance(rows).toNumber();

  // σ = rssTol / 3 (RSS tolerance represents the 3σ spread by convention)
  const sigma = rssTol / 3;
  if (sigma === 0) return { failureRate: 0, yieldPercent: 100 };

  const lo = target.minGap !== null ? parseFloat(target.minGap) : null;
  const hi = target.maxGap !== null ? parseFloat(target.maxGap) : null;

  let failureRate = 0;

  switch (target.type) {
    case 'clearance':
      // Fail if gap < minGap
      if (lo !== null) {
        const zLo = (lo - gap) / sigma;
        failureRate = normalCdf(zLo);
      }
      break;
    case 'interference':
      // Fail if gap > minGap (upper bound) OR gap < maxGap (lower bound)
      if (lo !== null) {
        const zHi = (lo - gap) / sigma;
        failureRate += 1 - normalCdf(zHi);
      }
      if (hi !== null) {
        const zLo = (hi - gap) / sigma;
        failureRate += normalCdf(zLo);
      }
      break;
    case 'flush':
      // Flush with tolerance: fail if gap < minGap OR gap > maxGap
      // e.g. minGap = -0.05, maxGap = +0.05
      if (lo !== null) {
        const zLo = (lo - gap) / sigma;
        failureRate += normalCdf(zLo);
      }
      if (hi !== null) {
        const zHi = (hi - gap) / sigma;
        failureRate += 1 - normalCdf(zHi);
      }
      break;
    case 'proud':
      // Fail if gap < minGap (or < 0 if no minGap)
      {
        const bound = lo ?? 0;
        const z = (bound - gap) / sigma;
        failureRate = normalCdf(z);
      }
      break;
    case 'recess':
      // Fail if gap > maxGap (or > 0 if no maxGap)
      {
        const bound = hi ?? 0;
        const z = (bound - gap) / sigma;
        failureRate = 1 - normalCdf(z);
      }
      break;
    case 'custom':
      // Custom: fail if gap < minGap OR gap > maxGap
      if (lo !== null) {
        const zLo = (lo - gap) / sigma;
        failureRate += normalCdf(zLo);
      }
      if (hi !== null) {
        const zHi = (hi - gap) / sigma;
        failureRate += 1 - normalCdf(zHi);
      }
      break;
  }

  failureRate = Math.max(0, Math.min(1, failureRate));
  return {
    failureRate,
    yieldPercent: (1 - failureRate) * 100,
  };
}
