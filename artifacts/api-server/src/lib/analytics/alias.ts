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

export function aliasesMatch(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) {
    return false;
  }
  return timingSafeEqual(leftBuf, rightBuf);
}
