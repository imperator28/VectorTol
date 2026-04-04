import { D, Decimal } from './decimal';
import { centeredTolerance } from './calculations';
import { wcGap } from './worstCase';
import type { StackRow } from '../types/grid';

/** RSS Tolerance = sqrt(sum of centeredTol^2) */
export function rssTolerance(rows: StackRow[]): Decimal {
  const sumOfSquares = rows.reduce(
    (sum, row) => {
      const ct = centeredTolerance(row);
      return sum.plus(ct.times(ct));
    },
    D(0),
  );
  return sumOfSquares.sqrt();
}

/** RSS Min = gap - rssTolerance */
export function rssMin(rows: StackRow[]): Decimal {
  return wcGap(rows).minus(rssTolerance(rows));
}

/** RSS Max = gap + rssTolerance */
export function rssMax(rows: StackRow[]): Decimal {
  return wcGap(rows).plus(rssTolerance(rows));
}
