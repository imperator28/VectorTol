import { describe, it, expect } from 'vitest';
import {
  centeredNominal,
  centeredTolerance,
  percentContribution,
} from '../../src/engine/calculations';
import type { StackRow } from '../../src/types/grid';
import { createEmptyRow } from '../../src/types/grid';

function makeRow(overrides: Partial<StackRow>): StackRow {
  return { ...createEmptyRow('test-1'), ...overrides };
}

describe('centeredNominal', () => {
  it('returns nominal * direction for symmetric tolerance', () => {
    const row = makeRow({ nominal: '10', direction: 1, tolSymmetric: '0.05' });
    expect(centeredNominal(row).toNumber()).toBe(10);
  });

  it('returns negative nominal for direction = -1', () => {
    const row = makeRow({ nominal: '10', direction: -1, tolSymmetric: '0.05' });
    expect(centeredNominal(row).toNumber()).toBe(-10);
  });

  it('adjusts nominal for asymmetric tolerance', () => {
    const row = makeRow({
      nominal: '10',
      direction: 1,
      tolSymmetric: null,
      tolPlus: '0.03',
      tolMinus: '-0.01',
    });
    expect(centeredNominal(row).toNumber()).toBe(10.01);
  });

  it('adjusts nominal for asymmetric with negative direction', () => {
    const row = makeRow({
      nominal: '10',
      direction: -1,
      tolSymmetric: null,
      tolPlus: '0.03',
      tolMinus: '-0.01',
    });
    expect(centeredNominal(row).toNumber()).toBe(-10.01);
  });
});

describe('centeredTolerance', () => {
  it('returns tolSymmetric for symmetric case', () => {
    const row = makeRow({ tolSymmetric: '0.05' });
    expect(centeredTolerance(row).toNumber()).toBe(0.05);
  });

  it('returns half-range for asymmetric case', () => {
    const row = makeRow({
      tolSymmetric: null,
      tolPlus: '0.03',
      tolMinus: '-0.01',
    });
    expect(centeredTolerance(row).toNumber()).toBe(0.02);
  });

  it('returns 0 when no tolerance is set', () => {
    const row = makeRow({ tolSymmetric: null, tolPlus: null, tolMinus: null });
    expect(centeredTolerance(row).toNumber()).toBe(0);
  });
});

describe('percentContribution', () => {
  it('calculates contribution as percentage of total WC tolerance', () => {
    const row = makeRow({ tolSymmetric: '0.05' });
    expect(percentContribution(row, '0.20')).toBe(25);
  });

  it('returns 0 when total WC tolerance is 0', () => {
    const row = makeRow({ tolSymmetric: '0.05' });
    expect(percentContribution(row, '0')).toBe(0);
  });
});
