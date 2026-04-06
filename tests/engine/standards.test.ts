import { describe, expect, it } from 'vitest';
import { DEFAULT_STANDARDS, runNominalAdvisor, runSmartAllocation } from '../../src/engine/standards';
import type { TargetScenario } from '../../src/types/project';

const clearanceAtBoundary: TargetScenario = {
  type: 'clearance',
  minGap: '0',
  maxGap: null,
};

describe('standards engine boundary handling', () => {
  it('treats exact clearance boundaries as pass for tolerance allocation and nominal advisor', () => {
    const allocationRows = [
      {
        id: 'r1',
        component: 'Part A',
        dimId: 'A',
        source: 'machining' as const,
        direction: 1 as const,
        nominal: '5.1',
        tolSymmetric: '0.05',
        tolPlus: '0.05',
        tolMinus: '-0.05',
        sigma: '3',
      },
      {
        id: 'r2',
        component: 'Part B',
        dimId: 'B',
        source: 'machining' as const,
        direction: -1 as const,
        nominal: '5',
        tolSymmetric: '0.05',
        tolPlus: '0.05',
        tolMinus: '-0.05',
        sigma: '3',
      },
    ];

    const allocation = runSmartAllocation(allocationRows, clearanceAtBoundary, DEFAULT_STANDARDS);
    const nominal = runNominalAdvisor(
      allocationRows.map((row) => ({
        id: row.id,
        component: row.component,
        dimId: row.dimId,
        source: row.source,
        direction: row.direction,
        nominal: Number(row.nominal),
        centeredTol: 0.05,
      })),
      clearanceAtBoundary,
      new Set(),
    );

    expect(allocation.nominalGap).toBeCloseTo(0.1, 12);
    expect(allocation.currentWcTol).toBeCloseTo(0.1, 12);
    expect(allocation.wcBudget).toBeCloseTo(0.1, 12);
    expect(allocation.wcCurrentlyPasses).toBe(true);
    expect(allocation.nominalGapViolation).toBe(false);

    expect(nominal.nominalGap).toBeCloseTo(0.1, 12);
    expect(nominal.currentWcTol).toBeCloseTo(0.1, 12);
    expect(nominal.wcCurrentlyPasses).toBe(true);
    expect(nominal.neededGapShift).toBe(0);
  });
});
