import type { NextFunction, Request, Response } from "express";
import { getSupabaseVerifier } from "../lib/supabase-verifier";
import { logger } from "../lib/logger";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unauthorized(res: Response): void {
  res.status(401).json({ error: "Unauthorized" });
}

/**
 * Require exactly one verified Bearer token.
 *
 * Sets `req.userId` from verified `claims.sub` and preserves `req.accessToken`
 * for request-scoped Data API clients. Never trusts an unverified decode and
 * never returns token or claim details in the response.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (typeof header !== "string" || header.length === 0) {
      unauthorized(res);
      return;
    }

    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    if (!match) {
      unauthorized(res);
      return;
    }

    const token = match[1];
    if (!token) {
      unauthorized(res);
      return;
    }

    const { data, error } = await getSupabaseVerifier().auth.getClaims(token);
    if (error || !data?.claims) {
      logger.info(
        { reason: "claims_verification_failed" },
        "Auth rejected",
      );
      unauthorized(res);
      return;
    }

    const sub = data.claims.sub;
    if (typeof sub !== "string" || !UUID_RE.test(sub)) {
      logger.info({ reason: "invalid_sub_claim" }, "Auth rejected");
      unauthorized(res);
      return;
    }

    req.userId = sub;
    req.accessToken = token;
    next();
  } catch (err) {
    logger.info(
      {
        reason: "auth_middleware_error",
        errName: err instanceof Error ? err.name : "unknown",
      },
      "Auth rejected",
    );
    unauthorized(res);
  }
}
