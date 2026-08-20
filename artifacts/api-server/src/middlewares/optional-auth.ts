import type { NextFunction, Request, Response } from "express";
import { getSupabaseVerifier } from "../lib/supabase-verifier";
import { logger } from "../lib/logger";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Optional Bearer auth for shared catalogue reads that merge caller-owned data.
 * - No Authorization header: continue unauthenticated.
 * - Present but invalid: 401.
 * - Valid: set req.userId / req.accessToken.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Avoid a second claims verification when the global optional-auth policy
    // has already established this request's caller identity.
    if (req.userId && req.accessToken) {
      next();
      return;
    }

    const header = req.headers.authorization;
    if (typeof header !== "string" || header.length === 0) {
      next();
      return;
    }

    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    if (!match?.[1]) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = match[1];
    const { data, error } = await getSupabaseVerifier().auth.getClaims(token);
    if (error || !data?.claims) {
      logger.info(
        { reason: "claims_verification_failed" },
        "Optional auth rejected",
      );
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const sub = data.claims.sub;
    if (typeof sub !== "string" || !UUID_RE.test(sub)) {
      logger.info({ reason: "invalid_sub_claim" }, "Optional auth rejected");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.userId = sub;
    req.accessToken = token;
    next();
  } catch (err) {
    logger.info(
      {
        reason: "optional_auth_middleware_error",
        errName: err instanceof Error ? err.name : "unknown",
      },
      "Optional auth rejected",
    );
    res.status(401).json({ error: "Unauthorized" });
  }
}
