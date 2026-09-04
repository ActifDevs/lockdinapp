import { RouteManifestError } from "./errors.js";

/** Fixed publication scale for qualification weightings. */
export const WEIGHT_SCALE = 4;
export const WEIGHT_DENOMINATOR = 10_000n; // 10^4
export const WEIGHT_TOTAL = 1_000_000n; // 100.0000 * 10^4

const WEIGHT_RE = /^(0|[1-9]\d*)(\.\d{1,4})?$/;

/**
 * Parse exact qualification-weighting text into a scaled BigInt (× 10^4).
 *
 * Accepts: "20", "20.0", "20.00", "20.0000", "15.5"
 * Rejects: zero, negative, >100, >4 fractional digits, commas, exponents, NaN.
 */
export function parseWeightText(raw: string, path = "weight"): bigint {
  if (typeof raw !== "string") {
    throw new RouteManifestError(
      "invalid_weight",
      "qualificationWeightingPercent must be exact decimal text",
      path,
    );
  }
  const text = raw.trim();
  if (text.length === 0) {
    throw new RouteManifestError(
      "invalid_weight",
      "qualificationWeightingPercent must be non-empty text",
      path,
    );
  }
  if (/[eE,]/.test(text) || text.includes("+") || text.startsWith("-")) {
    throw new RouteManifestError(
      "invalid_weight",
      "qualificationWeightingPercent rejects signs, exponents, and locale commas",
      path,
    );
  }
  if (!WEIGHT_RE.test(text)) {
    throw new RouteManifestError(
      "invalid_weight",
      "qualificationWeightingPercent must be a non-negative decimal with at most 4 fractional digits",
      path,
    );
  }

  const [wholePart, fracPart = ""] = text.split(".");
  const scaled = BigInt(wholePart!) * WEIGHT_DENOMINATOR + BigInt(fracPart.padEnd(WEIGHT_SCALE, "0"));

  if (scaled <= 0n) {
    throw new RouteManifestError(
      "invalid_weight",
      "qualificationWeightingPercent must be > 0.0000",
      path,
    );
  }
  if (scaled > WEIGHT_TOTAL) {
    throw new RouteManifestError(
      "invalid_weight",
      "qualificationWeightingPercent must be <= 100.0000",
      path,
    );
  }
  return scaled;
}

/** Format scaled BigInt as exactly four fractional digits. */
export function formatWeightScaled(scaled: bigint): string {
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const whole = abs / WEIGHT_DENOMINATOR;
  const frac = abs % WEIGHT_DENOMINATOR;
  const body = `${whole.toString()}.${frac.toString().padStart(WEIGHT_SCALE, "0")}`;
  return negative ? `-${body}` : body;
}

/** Normalize weight text to canonical four-fractional-digit form. */
export function canonicalizeWeightText(raw: string, path?: string): string {
  return formatWeightScaled(parseWeightText(raw, path));
}

/** Sum scaled weights; publication requires exact equality to 100.0000. */
export function sumWeightsScaled(weights: readonly bigint[]): bigint {
  return weights.reduce((acc, value) => acc + value, 0n);
}

export function assertExactRouteTotal(
  weights: readonly bigint[],
  path: string,
): void {
  const total = sumWeightsScaled(weights);
  if (total !== WEIGHT_TOTAL) {
    throw new RouteManifestError(
      "invalid_route_total",
      `route component weightings must sum exactly to 100.0000 (got ${formatWeightScaled(total)})`,
      path,
    );
  }
}
