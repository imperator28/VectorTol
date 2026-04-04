import Decimal from 'decimal.js';

Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

/** Factory: parse string to Decimal. Returns Decimal(0) for empty/invalid input. */
export function D(value: string | number | Decimal): Decimal {
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

export { Decimal };
