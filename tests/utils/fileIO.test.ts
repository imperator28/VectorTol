import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject, rowsToCsv } from '../../src/utils/fileIO';
import type { StackRow } from '../../src/types/grid';
import { createEmptyRow } from '../../src/types/grid';
import type { VtolMetadata, TargetScenario } from '../../src/types/project';

const testTarget: TargetScenario = { type: 'clearance', minGap: '0.05', maxGap: null };

const testMetadata: VtolMetadata = {
  projectName: 'Test Project',
  author: 'Engineer',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  designIntent: testTarget,
};

const testRows: StackRow[] = [
  {
    ...createEmptyRow('row-1'),
    component: 'Housing',
    dimId: 'D1',
    nominal: '10.5',
    tolSymmetric: '0.05',
    direction: 1,
  },
  {
    ...createEmptyRow('row-2'),
    component: 'PCB',
    dimId: 'D2',
    nominal: '1.6',
    tolSymmetric: null,
    tolPlus: '0.03',
    tolMinus: '-0.01',
    direction: -1,
  },
];

describe('serializeProject / deserializeProject', () => {
  it('round-trips project data', () => {
    const json = serializeProject(testMetadata, testRows, testTarget);
    const parsed = deserializeProject(json);

    expect(parsed.metadata.projectName).toBe('Test Project');
    expect(parsed.gridData).toHaveLength(2);
    expect(parsed.gridData[0]!.component).toBe('Housing');
    expect(parsed.gridData[1]!.tolPlus).toBe('0.03');
    expect(parsed.metadata.designIntent.type).toBe('clearance');
    expect(parsed.version).toBe(1);
  });

  it('includes canvas stub data', () => {
    const json = serializeProject(testMetadata, testRows, testTarget);
    const parsed = deserializeProject(json);
    expect(parsed.canvasData.vectors).toEqual([]);
    expect(parsed.canvasData.image).toBeNull();
  });
});

describe('rowsToCsv', () => {
  it('generates CSV with headers and row data', () => {
    const csv = rowsToCsv(testRows);
    const lines = csv.split('\n');

    expect(lines[0]).toContain('Component');
    expect(lines[0]).toContain('Dim ID');
    expect(lines[0]).toContain('Nominal');
    expect(lines[1]).toContain('Housing');
    expect(lines[1]).toContain('10.5');
    expect(lines[2]).toContain('PCB');
  });

  it('handles empty rows', () => {
    const csv = rowsToCsv([]);
    const lines = csv.split('\n').filter((l) => l.trim() !== '');
    expect(lines).toHaveLength(1);
  });
});
