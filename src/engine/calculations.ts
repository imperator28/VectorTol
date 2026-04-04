import { D, Decimal } from './decimal';
import type { StackRow } from '../types/grid';

function isAsymmetric(row: StackRow): boolean {
  return row.tolSymmetric === null && row.tolPlus !== null && row.tolMinus !== null;
}

/**
 * Centered Nominal:
 * - Symmetric: nominal * direction
 * - Asymmetric: (nominal + meanShift) * direction
 *   where meanShift = (tolPlus + tolMinus) / 2
 */
export function centeredNominal(row: StackRow): Decimal {
  const nom = D(row.nominal);
  if (isAsymmetric(row)) {
    const meanShift = D(row.tolPlus!).plus(D(row.tolMinus!)).dividedBy(2);
    return nom.plus(meanShift).times(row.direction);
  }
  return nom.times(row.direction);
}

/**
 * Centered Tolerance (always positive half-range):
 * - Symmetric: tolSymmetric
 * - Asymmetric: (tolPlus - tolMinus) / 2
 */
export function centeredTolerance(row: StackRow): Decimal {
  if (isAsymmetric(row)) {
    return D(row.tolPlus!).minus(D(row.tolMinus!)).dividedBy(2);
  }
  if (row.tolSymmetric !== null) {
    return D(row.tolSymmetric);
  }
  return D(0);
}

/**
 * % Contribution = (|centeredTol| / totalWcTol) * 100
 */
export function percentContribution(row: StackRow, totalWcTol: string): number {
  const total = D(totalWcTol);
  if (total.isZero()) return 0;
  const ct = centeredTolerance(row).abs();
  return ct.dividedBy(total).times(100).toDecimalPlaces(2).toNumber();
}
