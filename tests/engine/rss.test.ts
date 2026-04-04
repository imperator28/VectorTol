import { describe, it, expect } from 'vitest';
import { rssTolerance, rssMin, rssMax } from '../../src/engine/rss';
import type { StackRow } from '../../src/types/grid';
import { createEmptyRow } from '../../src/types/grid';

function makeRow(overrides: Partial<StackRow>): StackRow {
  return { ...createEmptyRow('test'), ...overrides };
}

describe('RSS analysis', () => {
  const rows: StackRow[] = [
    makeRow({ id: 'r1', nominal: '10', direction: 1, tolSymmetric: '0.05' }),
    makeRow({ id: 'r2', nominal: '5', direction: -1, tolSymmetric: '0.03' }),
    makeRow({ id: 'r3', nominal: '3', direction: 1, tolSymmetric: '0.02' }),
  ];

  it('computes RSS tolerance = sqrt(sum of centeredTol^2)', () => {
    const result = rssTolerance(rows).toDecimalPlaces(5).toNumber();
    expect(result).toBeCloseTo(0.06164, 4);
  });

  it('computes RSS min = gap - rssTol', () => {
    const result = rssMin(rows).toDecimalPlaces(5).toNumber();
    expect(result).toBeCloseTo(7.93836, 4);
  });

  it('computes RSS max = gap + rssTol', () => {
    const result = rssMax(rows).toDecimalPlaces(5).toNumber();
    expect(result).toBeCloseTo(8.06164, 4);
  });

  it('handles empty rows', () => {
    expect(rssTolerance([]).toNumber()).toBe(0);
    expect(rssMin([]).toNumber()).toBe(0);
    expect(rssMax([]).toNumber()).toBe(0);
  });

  it('handles single row', () => {
    const single = [makeRow({ nominal: '10', direction: 1, tolSymmetric: '0.05' })];
    expect(rssTolerance(single).toNumber()).toBe(0.05);
  });
});
