export function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const rounded = Math.round(value * 10) / 10;
  return `${Object.is(rounded, -0) ? 0 : rounded}%`;
}
