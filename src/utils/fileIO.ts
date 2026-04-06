import type { StackRow } from '../types/grid';
import type { VtolFile, VtolMetadata, TargetScenario } from '../types/project';
import type { CanvasData } from '../types/canvas';
import { DEFAULT_CANVAS_DATA } from '../types/canvas';

export function serializeProject(
  metadata: VtolMetadata,
  rows: StackRow[],
  target: TargetScenario,
  canvasData: CanvasData,
): string {
  const file: VtolFile = {
    version: 1,
    metadata: {
      ...metadata,
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: metadata.updatedAt || new Date().toISOString(),
      designIntent: target,
    },
    gridData: rows,
    canvasData,
    settings: {},
  };
  return JSON.stringify(file, null, 2);
}

export function deserializeProject(json: string): VtolFile {
  const file = JSON.parse(json) as VtolFile;
  if (file.version !== 1) {
    throw new Error(`Unsupported .vtol version: ${file.version}`);
  }
  // Backfill canvasData for files saved before Phase 2
  if (!file.canvasData || !Array.isArray(file.canvasData.vectors)) {
    file.canvasData = { ...DEFAULT_CANVAS_DATA };
  }
  return file;
}

const CSV_HEADERS = [
  'Component',
  'Dim ID',
  'Tolerance Source',
  'Direction',
  'Nominal',
  '+/- TOL',
  '+TOL',
  '-TOL',
  'Rounding',
  'Sigma',
];

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: StackRow[]): string {
  const lines: string[] = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const fields = [
      row.component,
      row.dimId,
      row.toleranceSource,
      row.direction === 1 ? '+' : '-',
      row.nominal,
      row.tolSymmetric ?? '',
      row.tolPlus ?? '',
      row.tolMinus ?? '',
      String(row.rounding),
      row.sigma,
    ];
    lines.push(fields.map(escapeCsvField).join(','));
  }
  return lines.join('\n');
}
