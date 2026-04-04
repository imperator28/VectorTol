import { describe, it, expect } from 'vitest';
import { wcTolerance, wcMin, wcMax, wcGap } from '../../src/engine/worstCase';
import type { StackRow } from '../../src/types/grid';
import { createEmptyRow } from '../../src/types/grid';

function makeRow(overrides: Partial<StackRow>): StackRow {
  return { ...createEmptyRow('test'), ...overrides };
}

describe('worst-case analysis', () => {
  const rows: StackRow[] = [
    makeRow({ id: 'r1', nominal: '10', direction: 1, tolSymmetric: '0.05' }),
    makeRow({ id: 'r2', nominal: '5', direction: -1, tolSymmetric: '0.03' }),
    makeRow({ id: 'r3', nominal: '3', direction: 1, tolSymmetric: '0.02' }),
  ];

  it('computes gap as sum of centered nominals', () => {
    expect(wcGap(rows).toNumber()).toBe(8);
  });

  it('computes WC tolerance as sum of absolute centered tolerances', () => {
    expect(wcTolerance(rows).toNumber()).toBe(0.1);
  });

  it('computes WC min = gap - wcTol', () => {
    expect(wcMin(rows).toNumber()).toBe(7.9);
  });

  it('computes WC max = gap + wcTol', () => {
    expect(wcMax(rows).toNumber()).toBe(8.1);
  });

  it('handles empty rows', () => {
    expect(wcGap([]).toNumber()).toBe(0);
    expect(wcTolerance([]).toNumber()).toBe(0);
    expect(wcMin([]).toNumber()).toBe(0);
    expect(wcMax([]).toNumber()).toBe(0);
  });

  it('handles asymmetric tolerances', () => {
    const asymRows: StackRow[] = [
      makeRow({
        id: 'a1',
        nominal: '10',
        direction: 1,
        tolSymmetric: null,
        tolPlus: '0.03',
        tolMinus: '-0.01',
      }),
    ];
    expect(wcGap(asymRows).toNumber()).toBe(10.01);
    expect(wcTolerance(asymRows).toNumber()).toBe(0.02);
    expect(wcMin(asymRows).toNumber()).toBe(9.99);
    expect(wcMax(asymRows).toNumber()).toBe(10.03);
  });
});
