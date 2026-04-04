/**
 * Monte Carlo simulation engine for tolerance stack-up analysis.
 *
 * Generates N random samples per dimension using Box-Muller transform,
 * sums them per the stack-up model, then computes failure statistics
 * and a histogram of results.
 */

import type { StackRow } from '../types/grid';
import type { TargetScenario } from '../types/project';

// ── Types ───────────────────────────────────────────────────────────────────

export interface MonteCarloConfig {
  iterations: number;          // e.g. 10_000 to 1_000_000
  seed?: number;               // optional deterministic seed
}

export interface MonteCarloResult {
  iterations: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p001: number;                // 0.1th percentile
  p01: number;                 // 1st percentile
  p50: number;                 // median
  p99: number;                 // 99th percentile
  p999: number;                // 99.9th percentile
  failureCount: number;
  failureRate: number;         // 0–1
  yieldPercent: number;        // 0–100
  histogram: HistogramBin[];
  samples: Float64Array;       // raw results (for overlay on distribution plot)
}

export interface HistogramBin {
  lo: number;
  hi: number;
  count: number;
  density: number;             // count / (iterations * binWidth)
}

// ── Box-Muller normal random ────────────────────────────────────────────────

/** Simple seeded PRNG (xoshiro128**) for reproducibility. Falls back to Math.random. */
function createRng(seed?: number): () => number {
  if (seed === undefined) return Math.random;

  let s0 = seed >>> 0 || 1;
  let s1 = (seed * 1664525 + 1013904223) >>> 0 || 1;
  let s2 = (s1 * 1664525 + 1013904223) >>> 0 || 1;
  let s3 = (s2 * 1664525 + 1013904223) >>> 0 || 1;

  return () => {
    const result = Math.imul(s1 * 5, 7) >>> 0;
    const t = s1 << 9;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    return (result >>> 0) / 4294967296;
  };
}

/** Generate a normally distributed random number with given mean and stdDev using Box-Muller. */
function boxMuller(rng: () => number, mean: number, stdDev: number): number {
  let u: number, v: number, s: number;
  do {
    u = 2 * rng() - 1;
    v = 2 * rng() - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const mul = Math.sqrt(-2 * Math.log(s) / s);
  return mean + stdDev * u * mul;
}

// ── Dimension parameters ────────────────────────────────────────────────────

interface DimParams {
  mean: number;     // centeredNominal
  halfTol: number;  // centeredTolerance (= 3σ by default)
  sigma: number;    // halfTol / sigmaLevel
  direction: 1 | -1;
}

function getDimParams(row: StackRow): DimParams {
  const nom = parseFloat(row.nominal) || 0;
  const sigmaLevel = parseFloat(row.sigma) || 3;

  let mean: number;
  let halfTol: number;

  const isAsym = row.tolSymmetric === null && row.tolPlus !== null && row.tolMinus !== null;

  if (isAsym) {
    const tp = parseFloat(row.tolPlus!) || 0;
    const tm = parseFloat(row.tolMinus!) || 0;
    const meanShift = (tp + tm) / 2;
    mean = nom + meanShift;
    halfTol = (tp - tm) / 2;
  } else {
    mean = nom;
    halfTol = parseFloat(row.tolSymmetric ?? '0') || 0;
  }

  const sigma = sigmaLevel > 0 ? halfTol / sigmaLevel : 0;

  return { mean, halfTol, sigma, direction: row.direction };
}

// ── Pass/fail evaluation ────────────────────────────────────────────────────

function createFailCheck(target: TargetScenario): (gap: number) => boolean {
  const lo = target.minGap !== null ? parseFloat(target.minGap) : null;
  const hi = target.maxGap !== null ? parseFloat(target.maxGap) : null;

  switch (target.type) {
    case 'clearance':
      return (gap) => lo !== null && gap < lo;
    case 'interference':
      return (gap) => (lo !== null && gap > lo) || (hi !== null && gap < hi);
    case 'flush':
      return () => false; // no explicit failure for flush
    case 'proud':
      return (gap) => gap < (lo ?? 0);
    case 'recess':
      return (gap) => gap > (hi ?? 0);
    default:
      return () => false;
  }
}

// ── Histogram builder ───────────────────────────────────────────────────────

function buildHistogram(samples: Float64Array, numBins: number): HistogramBin[] {
  const n = samples.length;
  if (n === 0) return [];

  let min = samples[0]!;
  let max = samples[0]!;
  for (let i = 1; i < n; i++) {
    const v = samples[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // Avoid degenerate case
  if (max === min) {
    return [{ lo: min - 0.5, hi: max + 0.5, count: n, density: n }];
  }

  const binWidth = (max - min) / numBins;
  const bins: HistogramBin[] = [];
  const counts = new Uint32Array(numBins);

  for (let i = 0; i < n; i++) {
    let idx = Math.floor((samples[i]! - min) / binWidth);
    if (idx >= numBins) idx = numBins - 1;
    counts[idx]!++;
  }

  for (let i = 0; i < numBins; i++) {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    bins.push({
      lo,
      hi,
      count: counts[i]!,
      density: counts[i]! / (n * binWidth),
    });
  }

  return bins;
}

// ── Percentile helper ───────────────────────────────────────────────────────

function percentile(sorted: Float64Array, p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

// ── Main simulation ─────────────────────────────────────────────────────────

export function runMonteCarlo(
  rows: StackRow[],
  target: TargetScenario,
  config: MonteCarloConfig,
): MonteCarloResult {
  const { iterations } = config;
  const rng = createRng(config.seed);

  const dims = rows.map(getDimParams);
  const isFail = createFailCheck(target);

  const samples = new Float64Array(iterations);
  let failureCount = 0;

  for (let i = 0; i < iterations; i++) {
    let gap = 0;
    for (const dim of dims) {
      const value = dim.sigma > 0
        ? boxMuller(rng, dim.mean, dim.sigma)
        : dim.mean;
      gap += value * dim.direction;
    }
    samples[i] = gap;
    if (isFail(gap)) failureCount++;
  }

  // Sort for percentiles
  const sorted = new Float64Array(samples);
  sorted.sort();

  // Stats
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < iterations; i++) {
    sum += samples[i]!;
    sumSq += samples[i]! * samples[i]!;
  }
  const mean = sum / iterations;
  const variance = sumSq / iterations - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));

  const failureRate = failureCount / iterations;
  const numBins = Math.min(80, Math.max(30, Math.round(Math.sqrt(iterations))));

  return {
    iterations,
    mean,
    stdDev,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    p001: percentile(sorted, 0.1),
    p01: percentile(sorted, 1),
    p50: percentile(sorted, 50),
    p99: percentile(sorted, 99),
    p999: percentile(sorted, 99.9),
    failureCount,
    failureRate,
    yieldPercent: (1 - failureRate) * 100,
    histogram: buildHistogram(samples, numBins),
    samples: sorted,
  };
}
