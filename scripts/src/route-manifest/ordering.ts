/**
 * Deterministic ordinal string comparison for canonical hashing.
 *
 * Uses JavaScript code-unit ordering (`<` / `>`), which is locale-independent
 * and does not consult ICU / process locale settings.
 */
export function compareOrdinal(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function byOrderThenOrdinalKey<T>(
  a: T,
  b: T,
  order: (row: T) => number,
  key: (row: T) => string,
): number {
  const orderDiff = order(a) - order(b);
  if (orderDiff !== 0) return orderDiff;
  return compareOrdinal(key(a), key(b));
}
