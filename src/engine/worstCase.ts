import { D, Decimal } from './decimal';
import { centeredNominal, centeredTolerance } from './calculations';
import type { StackRow } from '../types/grid';

/** Gap = sum of centered nominals */
export function wcGap(rows: StackRow[]): Decimal {
  return rows.reduce((sum, row) => sum.plus(centeredNominal(row)), D(0));
}

/** WC Tolerance = sum of |centeredTol| */
export function wcTolerance(rows: StackRow[]): Decimal {
  return rows.reduce((sum, row) => sum.plus(centeredTolerance(row).abs()), D(0));
}

/** WC Min = gap - wcTolerance */
export function wcMin(rows: StackRow[]): Decimal {
  return wcGap(rows).minus(wcTolerance(rows));
}

/** WC Max = gap + wcTolerance */
export function wcMax(rows: StackRow[]): Decimal {
  return wcGap(rows).plus(wcTolerance(rows));
}
