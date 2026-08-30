import { createHmac, timingSafeEqual } from "node:crypto";

const ALIAS_PREFIX = "lockdin_ph_";

export function createAnalyticsAlias(
  userId: string,
  secret: string,
): string | null {
  if (!userId || !secret || secret.length < 16) {
    return null;
  }
  const digest = createHmac("sha256", secret).update(userId, "utf8").digest("hex");
  return `${ALIAS_PREFIX}${digest}`;
}

/**
 * Deterministic RFC-4122 UUID from alias + event name (not the raw user UUID).
 * PostHog Node capture accepts `uuid` for eventual storage deduplication.
 * Immediate ingest dedup is not guaranteed.
 */
export function createAnalyticsEventUuid(
  userId: string,
  eventName: string,
  secret: string,
): string | null {
  const alias = createAnalyticsAlias(userId, secret);
  if (!alias) {
    return null;
  }
  const digest = createHmac("sha256", secret)
    .update(`event-uuid:${alias}:${eventName}`, "utf8")
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function aliasesMatch(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) {
    return false;
  }
  return timingSafeEqual(leftBuf, rightBuf);
}
