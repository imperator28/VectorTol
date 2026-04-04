import type { StackRow } from '../types/grid';
import type { VtolFile, VtolMetadata, TargetScenario } from '../types/project';

export function serializeProject(
  metadata: VtolMetadata,
  rows: StackRow[],
  target: TargetScenario,
): string {
  const file: VtolFile = {
    version: 1,
    metadata: {
      ...metadata,
      updatedAt: new Date().toISOString(),
      designIntent: target,
    },
    gridData: rows,
    canvasData: {
      vectors: [],
      image: null,
      imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
    },
    settings: {},
  };
  return JSON.stringify(file, null, 2);
}

export function deserializeProject(json: string): VtolFile {
  const file = JSON.parse(json) as VtolFile;
  if (file.version !== 1) {
    throw new Error(`Unsupported .vtol version: ${file.version}`);
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
