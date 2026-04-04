export type RowId = string;

export type ToleranceSource =
  | 'machining'
  | 'mold'
  | 'material'
  | 'assembly'
  | 'stamping'
  | 'casting'
  | 'custom';

export const TOLERANCE_SOURCES: ToleranceSource[] = [
  'machining',
  'mold',
  'material',
  'assembly',
  'stamping',
  'casting',
  'custom',
];

export type Direction = 1 | -1;

export interface StackRow {
  id: RowId;
  component: string;
  dimId: string;
  toleranceSource: ToleranceSource;
  direction: Direction;
  nominal: string;
  tolSymmetric: string | null;
  tolPlus: string | null;
  tolMinus: string | null;
  rounding: number;
  sigma: string;
}

export function createEmptyRow(id: RowId): StackRow {
  return {
    id,
    component: '',
    dimId: '',
    toleranceSource: 'machining',
    direction: 1,
    nominal: '0',
    tolSymmetric: '0',
    tolPlus: null,
    tolMinus: null,
    rounding: 3,
    sigma: '3',
  };
}
